#!/bin/bash

# Force Clear Neo4j Database Script (No confirmation)
# Use this for development/testing when you want to quickly clear the database

echo "================================================"
echo "🗑️  Neo4j Database Force Clear (No Confirmation)"
echo "================================================"
echo ""

# Run the clear database script directly
cd app && node scripts/clear-database.js

echo ""
echo "Database cleared. Ready for fresh data!"
echo ""