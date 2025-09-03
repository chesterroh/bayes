import { getSession } from '@/lib/neo4j';
import type { EvidenceNode, AffectsRelationship } from '@/lib/neo4j';

export class EvidenceService {
  // Create new evidence
  static async create(data: {
    id: string;
    content: string;
    source_url: string;
  }): Promise<EvidenceNode> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `CREATE (e:Evidence {
          id: $id,
          content: $content,
          source_url: $source_url,
          timestamp: datetime()
        })
        RETURN e`,
        data
      );
      
      const record = result.records[0];
      const node = record.get('e');
      
      return {
        id: node.properties.id,
        content: node.properties.content,
        source_url: node.properties.source_url,
        timestamp: node.properties.timestamp
      };
    } finally {
      await session.close();
    }
  }
  
  // Get evidence by ID
  static async getById(id: string): Promise<EvidenceNode | null> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (e:Evidence {id: $id}) RETURN e',
        { id }
      );
      
      if (result.records.length === 0) {
        return null;
      }
      
      const node = result.records[0].get('e');
      
      return {
        id: node.properties.id,
        content: node.properties.content,
        source_url: node.properties.source_url,
        timestamp: node.properties.timestamp
      };
    } finally {
      await session.close();
    }
  }
  
  // Get all evidence
  static async getAll(): Promise<EvidenceNode[]> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (e:Evidence) RETURN e ORDER BY e.timestamp DESC'
      );
      
      return result.records.map(record => {
        const node = record.get('e');
        return {
          id: node.properties.id,
          content: node.properties.content,
          source_url: node.properties.source_url,
          timestamp: node.properties.timestamp
        };
      });
    } finally {
      await session.close();
    }
  }
  
  // Link evidence to hypothesis with AFFECTS relationship
  static async linkToHypothesis(
    evidenceId: string,
    hypothesisId: string,
    relationship: AffectsRelationship
  ): Promise<boolean> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `MATCH (e:Evidence {id: $eId}), (h:Hypothesis {id: $hId})
         CREATE (e)-[:AFFECTS {
           strength: $strength,
           direction: $direction
         }]->(h)
         RETURN e, h`,
        {
          eId: evidenceId,
          hId: hypothesisId,
          strength: relationship.strength,
          direction: relationship.direction
        }
      );
      
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  }
  
  // Get evidence affecting a hypothesis
  static async getByHypothesis(hypothesisId: string): Promise<Array<{
    evidence: EvidenceNode;
    relationship: AffectsRelationship;
  }>> {
    const session = getSession();
    
    try {
      const result = await session.run(
        `MATCH (e:Evidence)-[r:AFFECTS]->(h:Hypothesis {id: $id})
         RETURN e, r
         ORDER BY e.timestamp DESC`,
        { id: hypothesisId }
      );
      
      return result.records.map(record => {
        const node = record.get('e');
        const rel = record.get('r');
        
        return {
          evidence: {
            id: node.properties.id,
            content: node.properties.content,
            source_url: node.properties.source_url,
            timestamp: node.properties.timestamp
          },
          relationship: {
            strength: rel.properties.strength,
            direction: rel.properties.direction
          }
        };
      });
    } finally {
      await session.close();
    }
  }
  
  // Delete evidence
  static async delete(id: string): Promise<boolean> {
    const session = getSession();
    
    try {
      const result = await session.run(
        'MATCH (e:Evidence {id: $id}) DETACH DELETE e RETURN count(e) as deleted',
        { id }
      );
      
      const deleted = result.records[0].get('deleted');
      return deleted > 0;
    } finally {
      await session.close();
    }
  }
}