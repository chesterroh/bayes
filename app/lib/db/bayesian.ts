import { getSession } from '@/lib/neo4j';
import { HypothesisService } from './hypothesis';

export class BayesianService {
  // Core Bayesian update calculation
  static calculatePosterior(
    prior: number,
    likelihood: number,
    altLikelihood: number
  ): number {
    const signal = likelihood * prior;
    const noise = altLikelihood * (1 - prior);
    
    if (signal + noise === 0) {
      return prior; // No update if no signal or noise
    }
    
    return signal / (signal + noise);
  }
  
  // Perform Bayesian update on a hypothesis based on evidence
  static async updateHypothesis(
    hypothesisId: string,
    evidenceId: string
  ): Promise<{ oldConfidence: number; newConfidence: number } | null> {
    const session = getSession();
    
    try {
      // Get hypothesis and evidence relationship
      const result = await session.run(
        `MATCH (e:Evidence {id: $eId})-[r:AFFECTS]->(h:Hypothesis {id: $hId})
         WHERE h.verified IS NULL
         RETURN h.confidence as confidence, r.p_e_given_h as peh, r.p_e_given_not_h as penh`,
        { hId: hypothesisId, eId: evidenceId }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const record = result.records[0];
      const prior = record.get('confidence');
      const likelihood = record.get('peh');
      const altLikelihood = record.get('penh');
      
      // Calculate posterior
      const posterior = this.calculatePosterior(prior, likelihood, altLikelihood);
      
      // Update hypothesis confidence
      await HypothesisService.updateConfidence(hypothesisId, posterior);
      
      return {
        oldConfidence: prior,
        newConfidence: posterior
      };
    } finally {
      await session.close();
    }
  }
  
  // Propagate belief updates through dependencies
  static async propagateUpdate(
    hypothesisId: string,
    confidenceChange: number,
    dampeningFactor: number = 0.8
  ): Promise<Array<{ id: string; impact: number }>> {
    const session = getSession();
    const impacts: Array<{ id: string; impact: number }> = [];
    
    try {
      // Find all dependent hypotheses
      const result = await session.run(
        `MATCH (h1:Hypothesis {id: $hId})-[r:RELATES_TO {type: 'depends_on'}]->(h2:Hypothesis)
         WHERE h2.verified IS NULL
         RETURN h2.id as dependentId, h2.confidence as confidence, r.strength as strength`,
        { hId: hypothesisId }
      );
      
      // Update each dependent hypothesis
      for (const record of result.records) {
        const dependentId = record.get('dependentId');
        const currentConfidence = record.get('confidence');
        const dependencyStrength = record.get('strength');
        
        // Calculate propagated impact
        const impact = confidenceChange * dependencyStrength * dampeningFactor;
        const newConfidence = Math.max(0, Math.min(1, currentConfidence + impact));
        
        // Update dependent hypothesis
        await HypothesisService.updateConfidence(dependentId, newConfidence);
        
        impacts.push({ id: dependentId, impact });
        
        // Recursively propagate (with reduced dampening)
        if (Math.abs(impact) > 0.01) {
          const subImpacts = await this.propagateUpdate(
            dependentId,
            impact,
            dampeningFactor * 0.8
          );
          impacts.push(...subImpacts);
        }
      }
      
      return impacts;
    } finally {
      await session.close();
    }
  }
  
  // Find contradicting hypotheses with high confidence
  static async findContradictions(minConfidence: number = 0.7): Promise<Array<{
    hypothesis1: { id: string; statement: string; confidence: number };
    hypothesis2: { id: string; statement: string; confidence: number };
  }>> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `MATCH (h1:Hypothesis)-[r:RELATES_TO {type: 'contradicts'}]->(h2:Hypothesis)
         WHERE h1.confidence > $minConf AND h2.confidence > $minConf
         RETURN h1, h2`,
        { minConf: minConfidence }
      );
      
      return result.records.map(record => {
        const h1 = record.get('h1');
        const h2 = record.get('h2');
        
        return {
          hypothesis1: {
            id: h1.properties.id,
            statement: h1.properties.statement,
            confidence: h1.properties.confidence
          },
          hypothesis2: {
            id: h2.properties.id,
            statement: h2.properties.statement,
            confidence: h2.properties.confidence
          }
        };
      });
    } finally {
      await session.close();
    }
  }
  
  // Calculate signal-to-noise ratio for a given evidence-hypothesis pair
  static calculateSignalNoiseRatio(
    prior: number,
    p_e_given_h: number,
    p_e_given_not_h: number
  ): { signal: number; noise: number; ratio: number } {
    const signal = p_e_given_h * prior;
    const noise = p_e_given_not_h * (1 - prior);
    const ratio = noise === 0 ? Infinity : signal / noise;
    return { signal, noise, ratio };
  }
}
