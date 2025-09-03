import { getSession } from '@/lib/neo4j';
import type { HypothesisNode } from '@/lib/neo4j';

export class HypothesisService {
  // Create a new hypothesis
  static async create(data: {
    id: string;
    statement: string;
    confidence: number;
  }): Promise<HypothesisNode> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `CREATE (h:Hypothesis {
          id: $id,
          statement: $statement,
          confidence: $confidence,
          updated: datetime(),
          verified: NULL
        })
        RETURN h`,
        data
      );
      
      const record = result.records[0];
      const node = record.get('h');
      
      return {
        id: node.properties.id,
        statement: node.properties.statement,
        confidence: node.properties.confidence,
        updated: node.properties.updated,
        verified: node.properties.verified
      };
    } finally {
      await session.close();
    }
  }
  
  // Get a hypothesis by ID
  static async getById(id: string): Promise<HypothesisNode | null> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (h:Hypothesis {id: $id}) RETURN h',
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0].get('h');
      
      return {
        id: node.properties.id,
        statement: node.properties.statement,
        confidence: node.properties.confidence,
        updated: node.properties.updated,
        verified: node.properties.verified
      };
    } finally {
      await session.close();
    }
  }
  
  // Get all hypotheses
  static async getAll(): Promise<HypothesisNode[]> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (h:Hypothesis) RETURN h ORDER BY h.updated DESC'
      );
      
      return result.records.map(record => {
        const node = record.get('h');
        return {
          id: node.properties.id,
          statement: node.properties.statement,
          confidence: node.properties.confidence,
          updated: node.properties.updated,
          verified: node.properties.verified
        };
      });
    } finally {
      await session.close();
    }
  }
  
  // Update confidence (Bayesian update)
  static async updateConfidence(id: string, newConfidence: number): Promise<HypothesisNode | null> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `MATCH (h:Hypothesis {id: $id})
         WHERE h.verified IS NULL
         SET h.confidence = $confidence,
             h.updated = datetime()
         RETURN h`,
        { id, confidence: newConfidence }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0].get('h');
      
      return {
        id: node.properties.id,
        statement: node.properties.statement,
        confidence: node.properties.confidence,
        updated: node.properties.updated,
        verified: node.properties.verified
      };
    } finally {
      await session.close();
    }
  }
  
  // Verify a hypothesis
  static async verify(
    hypothesisId: string,
    evidenceId: string,
    verificationType: 'confirmed' | 'refuted'
  ): Promise<HypothesisNode | null> {
    const session = getSession();
    
    try {
      const newConfidence = verificationType === 'confirmed' ? 1.0 : 0.0;
      
      const result = await session.run(
        `MATCH (h:Hypothesis {id: $hId}), (e:Evidence {id: $eId})
         CREATE (e)-[:VERIFIED_BY {
           verified_date: datetime(),
           verification_type: $vType
         }]->(h)
         SET h.verified = datetime(),
             h.confidence = $confidence,
             h.updated = datetime()
         RETURN h`,
        {
          hId: hypothesisId,
          eId: evidenceId,
          vType: verificationType,
          confidence: newConfidence
        }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0].get('h');
      
      return {
        id: node.properties.id,
        statement: node.properties.statement,
        confidence: node.properties.confidence,
        updated: node.properties.updated,
        verified: node.properties.verified
      };
    } finally {
      await session.close();
    }
  }
  
  // Delete a hypothesis
  static async delete(id: string): Promise<boolean> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (h:Hypothesis {id: $id}) DETACH DELETE h RETURN count(h) as deleted',
        { id }
      );
      
      const deleted = result.records[0].get('deleted');
      return deleted > 0;
    } finally {
      await session.close();
    }
  }
}