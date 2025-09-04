#!/usr/bin/env node

/**
 * Check the current state of the Neo4j database
 * Shows counts of all nodes and relationships
 * Usage: node scripts/check-database.js (from app directory)
 */

const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jneo4j';

async function checkDatabase() {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  
  try {
    const session = driver.session();
    
    console.log('📊 Database Status\n');
    
    // Count nodes
    const nodeResult = await session.run('MATCH (n) RETURN count(n) as count');
    const totalNodes = nodeResult.records[0].get('count').toNumber();
    
    // Count relationships
    const relResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const totalRels = relResult.records[0].get('count').toNumber();
    
    // Detailed counts
    const hypResult = await session.run('MATCH (h:Hypothesis) RETURN count(h) as count');
    const hypCount = hypResult.records[0].get('count').toNumber();
    
    const evResult = await session.run('MATCH (e:Evidence) RETURN count(e) as count');
    const evCount = evResult.records[0].get('count').toNumber();
    
    // Count relationship types
    const affectsResult = await session.run('MATCH ()-[r:AFFECTS]->() RETURN count(r) as count');
    const affectsCount = affectsResult.records[0].get('count').toNumber();
    
    const verifiedResult = await session.run('MATCH ()-[r:VERIFIED_BY]->() RETURN count(r) as count');
    const verifiedCount = verifiedResult.records[0].get('count').toNumber();
    
    const relatesResult = await session.run('MATCH ()-[r:RELATES_TO]->() RETURN count(r) as count');
    const relatesCount = relatesResult.records[0].get('count').toNumber();
    
    // Display results
    console.log('Nodes:');
    console.log(`  📦 Total: ${totalNodes}`);
    if (totalNodes > 0) {
      console.log(`  🎯 Hypotheses: ${hypCount}`);
      console.log(`  📄 Evidence: ${evCount}`);
      
      const otherNodes = totalNodes - hypCount - evCount;
      if (otherNodes > 0) {
        console.log(`  ❓ Other: ${otherNodes}`);
      }
    }
    
    console.log('\nRelationships:');
    console.log(`  🔗 Total: ${totalRels}`);
    if (totalRels > 0) {
      console.log(`  ↔️  AFFECTS: ${affectsCount}`);
      console.log(`  ✅ VERIFIED_BY: ${verifiedCount}`);
      console.log(`  🔄 RELATES_TO: ${relatesCount}`);
      
      const otherRels = totalRels - affectsCount - verifiedCount - relatesCount;
      if (otherRels > 0) {
        console.log(`  ❓ Other: ${otherRels}`);
      }
    }
    
    // Check for verified hypotheses
    if (hypCount > 0) {
      const verifiedHypResult = await session.run(
        'MATCH (h:Hypothesis) WHERE h.verified IS NOT NULL RETURN count(h) as count'
      );
      const verifiedHypCount = verifiedHypResult.records[0].get('count').toNumber();
      
      if (verifiedHypCount > 0) {
        console.log(`\n📌 Verified Hypotheses: ${verifiedHypCount}`);
      }
    }
    
    // Summary
    console.log('\n' + '─'.repeat(50));
    if (totalNodes === 0 && totalRels === 0) {
      console.log('✨ Database is empty and ready for use!');
    } else {
      console.log('📈 Database contains data');
    }
    
    await session.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await driver.close();
  }
}

// Run the script
console.log('=' .repeat(50));
console.log('Neo4j Database Status Check');
console.log('=' .repeat(50) + '\n');

checkDatabase().catch(console.error);