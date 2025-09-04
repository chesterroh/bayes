#!/usr/bin/env node

/**
 * Setup unique constraints in Neo4j to prevent duplicate IDs
 * Usage: node scripts/setup-constraints.js (from app directory)
 */

const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jneo4j';

async function setupConstraints() {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  
  try {
    const session = driver.session();
    
    console.log('🔧 Setting up database constraints...\n');
    
    // Create unique constraint for Hypothesis ID
    try {
      await session.run(`
        CREATE CONSTRAINT hypothesis_id_unique IF NOT EXISTS
        FOR (h:Hypothesis)
        REQUIRE h.id IS UNIQUE
      `);
      console.log('✅ Created unique constraint for Hypothesis.id');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Unique constraint for Hypothesis.id already exists');
      } else {
        console.error('⚠️  Error creating Hypothesis constraint:', error.message);
      }
    }
    
    // Create unique constraint for Evidence ID
    try {
      await session.run(`
        CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS
        FOR (e:Evidence)
        REQUIRE e.id IS UNIQUE
      `);
      console.log('✅ Created unique constraint for Evidence.id');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Unique constraint for Evidence.id already exists');
      } else {
        console.error('⚠️  Error creating Evidence constraint:', error.message);
      }
    }
    
    // Show all constraints
    console.log('\n📋 Current constraints:');
    const result = await session.run('SHOW CONSTRAINTS');
    result.records.forEach(record => {
      const name = record.get('name');
      const type = record.get('type');
      if (name && (name.includes('hypothesis') || name.includes('evidence'))) {
        console.log(`   - ${name} (${type})`);
      }
    });
    
    await session.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await driver.close();
  }
}

// Run the script
console.log('=' .repeat(50));
console.log('Neo4j Constraints Setup');
console.log('=' .repeat(50) + '\n');

setupConstraints().catch(console.error);