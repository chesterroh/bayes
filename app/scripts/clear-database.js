#!/usr/bin/env node

/**
 * Clear ALL nodes and relationships from Neo4j database
 * This includes Hypotheses, Evidence, and all their relationships
 * Usage: node scripts/clear-database.js (from app directory)
 */

const neo4j = require('neo4j-driver');

// Connection details
const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jneo4j';

async function clearDatabase() {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  
  try {
    const session = driver.session();
    
    // Count nodes and relationships before clearing
    console.log('📊 Database status before clearing:');
    
    const nodeCountResult = await session.run('MATCH (n) RETURN count(n) as count');
    const nodeCount = nodeCountResult.records[0].get('count').toNumber();
    
    const relCountResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const relCount = relCountResult.records[0].get('count').toNumber();
    
    // Get detailed counts
    const hypCountResult = await session.run('MATCH (h:Hypothesis) RETURN count(h) as count');
    const hypCount = hypCountResult.records[0].get('count').toNumber();
    
    const evCountResult = await session.run('MATCH (e:Evidence) RETURN count(e) as count');
    const evCount = evCountResult.records[0].get('count').toNumber();
    
    console.log(`  → Total nodes: ${nodeCount}`);
    console.log(`    - Hypotheses: ${hypCount}`);
    console.log(`    - Evidence: ${evCount}`);
    console.log(`  → Total relationships: ${relCount}`);
    
    if (nodeCount === 0 && relCount === 0) {
      console.log('\n✅ Database is already empty!');
      await session.close();
      return;
    }
    
    // Clear everything using DETACH DELETE
    console.log('\n🧹 Clearing database...');
    
    // This command deletes all nodes and their relationships
    await session.run('MATCH (n) DETACH DELETE n');
    console.log('  → Deleted all nodes and relationships');
    
    // Verify everything is cleared
    console.log('\n📊 Database status after clearing:');
    
    const afterNodeResult = await session.run('MATCH (n) RETURN count(n) as count');
    const afterNodeCount = afterNodeResult.records[0].get('count').toNumber();
    
    const afterRelResult = await session.run('MATCH ()-[r]->() RETURN count(r) as count');
    const afterRelCount = afterRelResult.records[0].get('count').toNumber();
    
    console.log(`  → Total nodes: ${afterNodeCount}`);
    console.log(`  → Total relationships: ${afterRelCount}`);
    
    if (afterNodeCount === 0 && afterRelCount === 0) {
      console.log('\n✅ Database successfully cleared!');
      console.log('   All hypotheses, evidence, and relationships have been removed.');
    } else {
      console.log('\n⚠️  Warning: Some data may remain in the database');
      
      // Try alternative clearing method
      console.log('   Attempting alternative clearing method...');
      
      // Delete specific node types
      await session.run('MATCH (h:Hypothesis) DETACH DELETE h');
      await session.run('MATCH (e:Evidence) DETACH DELETE e');
      
      // Delete any remaining nodes
      await session.run('MATCH (n) DETACH DELETE n');
      
      console.log('   ✅ Alternative clearing completed');
    }
    
    await session.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Make sure Neo4j is running and credentials are correct.');
  } finally {
    await driver.close();
  }
}

// Run the script
console.log('=' .repeat(50));
console.log('🗑️  Neo4j Database Complete Cleanup');
console.log('=' .repeat(50));
console.log('');

clearDatabase().catch(console.error);