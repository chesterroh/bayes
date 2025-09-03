#!/bin/bash

# Clear Neo4j Database Script
# This script completely clears all nodes and relationships from the Neo4j database
# Including: Hypotheses, Evidence, AFFECTS, VERIFIED_BY, and RELATES_TO relationships

echo "================================================"
echo "🗑️  Neo4j Database Complete Cleanup"
echo "================================================"
echo ""

# Check database status before clearing
echo "Checking current database status..."
cd app && node scripts/check-database.js

echo ""
echo "⚠️  WARNING: This will delete ALL data in the database!"
echo "   - All Hypotheses"
echo "   - All Evidence" 
echo "   - All Relationships"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    # Run the clear database script
    node scripts/clear-database.js
    
    echo ""
    echo "✅ Database cleanup complete!"
    echo ""
    echo "You can now:"
    echo "  1. Run ./test-api.sh to test the API"
    echo "  2. Start fresh with npm run dev"
    echo ""
else
    echo ""
    echo "❌ Database cleanup cancelled."
    echo ""
fi