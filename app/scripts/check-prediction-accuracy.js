#!/usr/bin/env node

/**
 * Check prediction accuracy for all verified hypotheses
 * Shows how well your confidence levels matched actual outcomes
 */

const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const USER = process.env.NEO4J_USER || 'neo4j';
const PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jneo4j';

async function checkPredictionAccuracy() {
  const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));
  
  try {
    const session = driver.session();
    
    console.log('📊 Prediction Accuracy Report\n');
    console.log('=' .repeat(50));
    console.log('');
    
    // Get all verified hypotheses with pre-verification confidence
    const result = await session.run(`
      MATCH (h:Hypothesis)
      WHERE h.verified IS NOT NULL 
        AND h.pre_verification_confidence IS NOT NULL
      RETURN h.id as id,
             h.statement as statement,
             h.verification_type as outcome,
             h.pre_verification_confidence as prediction,
             h.verified as verified_date
      ORDER BY h.verified DESC
    `);
    
    if (result.records.length === 0) {
      console.log('No verified predictions with tracking data found.');
      console.log('\nNote: Pre-verification confidence tracking was added recently.');
      console.log('Only new verifications will have this data.');
      await session.close();
      return;
    }
    
    const predictions = [];
    let totalAccuracy = 0;
    let excellentCount = 0;
    let goodCount = 0;
    let moderateCount = 0;
    let poorCount = 0;
    
    console.log('Individual Predictions:\n');
    
    for (const record of result.records) {
      const id = record.get('id');
      const statement = record.get('statement');
      const outcome = record.get('outcome');
      const prediction = record.get('prediction');
      const verifiedDate = record.get('verified_date');
      
      // Calculate accuracy
      const predictionPercent = prediction * 100;
      const accuracy = outcome === 'confirmed' 
        ? predictionPercent 
        : (100 - predictionPercent);
      
      // Categorize
      let category;
      if (accuracy >= 80) {
        category = '🎯 Excellent';
        excellentCount++;
      } else if (accuracy >= 60) {
        category = '👍 Good';
        goodCount++;
      } else if (accuracy >= 40) {
        category = '😐 Moderate';
        moderateCount++;
      } else {
        category = '❌ Poor';
        poorCount++;
      }
      
      predictions.push({
        id,
        statement,
        outcome,
        prediction: predictionPercent,
        accuracy,
        category
      });
      
      totalAccuracy += accuracy;
      
      // Display individual result
      console.log(`${id}: "${statement.substring(0, 50)}${statement.length > 50 ? '...' : ''}"`);
      console.log(`  Prediction: ${predictionPercent.toFixed(1)}%`);
      console.log(`  Outcome: ${outcome === 'confirmed' ? '✓ TRUE' : '✗ FALSE'}`);
      console.log(`  Accuracy: ${accuracy.toFixed(1)}% ${category}`);
      console.log('');
    }
    
    // Calculate statistics
    const avgAccuracy = totalAccuracy / predictions.length;
    
    console.log('=' .repeat(50));
    console.log('\n📈 Overall Statistics:\n');
    console.log(`Total Predictions: ${predictions.length}`);
    console.log(`Average Accuracy: ${avgAccuracy.toFixed(1)}%`);
    console.log('');
    console.log('Distribution:');
    console.log(`  🎯 Excellent (80-100%): ${excellentCount} predictions`);
    console.log(`  👍 Good (60-79%): ${goodCount} predictions`);
    console.log(`  😐 Moderate (40-59%): ${moderateCount} predictions`);
    console.log(`  ❌ Poor (0-39%): ${poorCount} predictions`);
    
    // Calibration check
    console.log('\n🎯 Calibration Analysis:\n');
    
    // Group predictions by confidence ranges
    const ranges = [
      { min: 0, max: 20, predictions: [] },
      { min: 20, max: 40, predictions: [] },
      { min: 40, max: 60, predictions: [] },
      { min: 60, max: 80, predictions: [] },
      { min: 80, max: 100, predictions: [] }
    ];
    
    predictions.forEach(p => {
      const range = ranges.find(r => p.prediction >= r.min && p.prediction < r.max + 0.01);
      if (range) range.predictions.push(p);
    });
    
    console.log('Confidence Range | Predicted | Actual | Calibration');
    console.log('-'.repeat(52));
    
    ranges.forEach(range => {
      if (range.predictions.length > 0) {
        const avgPredicted = range.predictions.reduce((sum, p) => sum + p.prediction, 0) / range.predictions.length;
        const actualPercent = range.predictions.filter(p => p.outcome === 'confirmed').length / range.predictions.length * 100;
        const calibrationDiff = Math.abs(avgPredicted - actualPercent);
        
        let calibrationStatus;
        if (calibrationDiff <= 10) calibrationStatus = '✓ Well calibrated';
        else if (calibrationDiff <= 20) calibrationStatus = '~ Moderate';
        else calibrationStatus = '✗ Poor calibration';
        
        console.log(`${range.min}-${range.max}%`.padEnd(17) + 
                   `| ${avgPredicted.toFixed(0)}%`.padEnd(10) + 
                   `| ${actualPercent.toFixed(0)}%`.padEnd(7) + 
                   `| ${calibrationStatus}`);
      }
    });
    
    console.log('\n💡 Interpretation:');
    if (avgAccuracy >= 75) {
      console.log('Your predictions are very accurate! Keep up the good work.');
    } else if (avgAccuracy >= 60) {
      console.log('Your predictions are reasonably accurate. Some room for improvement.');
    } else {
      console.log('Your predictions need calibration. Consider adjusting confidence levels.');
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
console.log('Bayesian Knowledge Management System');
console.log('Prediction Accuracy Report');
console.log('=' .repeat(50) + '\n');

checkPredictionAccuracy().catch(console.error);