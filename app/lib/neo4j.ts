import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const user = process.env.NEO4J_USER || 'neo4j';
    const password = process.env.NEO4J_PASSWORD || 'neo4jneo4j';
    
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  
  return driver;
}

export function getSession(): Session {
  return getDriver().session();
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// Type definitions for our nodes
export interface HypothesisNode {
  id: string;
  statement: string;
  confidence: number;
  updated: Date;
  verified: Date | null;
}

export interface EvidenceNode {
  id: string;
  content: string;
  source_url: string;
  timestamp: Date;
}

export interface AffectsRelationship {
  strength: number;
  direction: 'supports' | 'contradicts';
}

export interface VerifiedByRelationship {
  verified_date: Date;
  verification_type: 'confirmed' | 'refuted';
}

export interface RelatesToRelationship {
  type: 'depends_on' | 'contradicts';
  strength: number;
}