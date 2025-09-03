#!/usr/bin/env python3
"""Test Neo4j connection and setup initial schema"""

from neo4j import GraphDatabase
import sys

# Connection details
URI = "bolt://localhost:7687"
AUTH = ("neo4j", "neo4jneo4j")

def test_connection():
    """Test basic connection to Neo4j"""
    try:
        driver = GraphDatabase.driver(URI, auth=AUTH)
        
        # Test connection
        with driver.session() as session:
            result = session.run("RETURN 'Connection successful!' as message")
            message = result.single()["message"]
            print(f"✓ {message}")
            
            # Get database info
            result = session.run("CALL dbms.components() YIELD name, versions RETURN name, versions[0] as version")
            for record in result:
                print(f"✓ Database: {record['name']} v{record['version']}")
            
            # Check if any nodes exist
            result = session.run("MATCH (n) RETURN count(n) as count")
            count = result.single()["count"]
            print(f"✓ Current nodes in database: {count}")
            
        driver.close()
        return True
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False

def create_test_data():
    """Create sample hypothesis and evidence nodes"""
    try:
        driver = GraphDatabase.driver(URI, auth=AUTH)
        
        with driver.session() as session:
            # Clear existing data (optional for testing)
            session.run("MATCH (n) DETACH DELETE n")
            print("✓ Cleared existing data")
            
            # Create a test hypothesis
            result = session.run("""
                CREATE (h:Hypothesis {
                    id: 'H_TEST_001',
                    statement: 'Neo4j is properly configured for BKMS',
                    confidence: 1.0,
                    updated: datetime(),
                    verified: NULL
                })
                RETURN h.id as id, h.statement as statement
            """)
            record = result.single()
            print(f"✓ Created hypothesis: {record['statement']}")
            
            # Create test evidence
            result = session.run("""
                CREATE (e:Evidence {
                    id: 'E_TEST_001',
                    content: 'Successfully connected to Neo4j database',
                    source_url: 'system-test',
                    timestamp: datetime()
                })
                RETURN e.id as id, e.content as content
            """)
            record = result.single()
            print(f"✓ Created evidence: {record['content']}")
            
            # Link evidence to hypothesis
            session.run("""
                MATCH (h:Hypothesis {id: 'H_TEST_001'}), 
                      (e:Evidence {id: 'E_TEST_001'})
                CREATE (e)-[:AFFECTS {strength: 1.0, direction: 'supports'}]->(h)
            """)
            print("✓ Created AFFECTS relationship")
            
            # Verify the graph structure
            result = session.run("""
                MATCH (e:Evidence)-[r:AFFECTS]->(h:Hypothesis)
                RETURN e.content as evidence, r.direction as direction, h.statement as hypothesis
            """)
            for record in result:
                print(f"✓ Graph: Evidence '{record['evidence'][:30]}...' {record['direction']} hypothesis")
            
        driver.close()
        return True
        
    except Exception as e:
        print(f"✗ Failed to create test data: {e}")
        return False

def create_indexes():
    """Create database indexes for better performance"""
    try:
        driver = GraphDatabase.driver(URI, auth=AUTH)
        
        with driver.session() as session:
            # Create indexes
            session.run("CREATE INDEX hypothesis_id IF NOT EXISTS FOR (h:Hypothesis) ON (h.id)")
            session.run("CREATE INDEX evidence_id IF NOT EXISTS FOR (e:Evidence) ON (e.id)")
            print("✓ Created indexes for Hypothesis and Evidence nodes")
            
            # Show all indexes
            result = session.run("SHOW INDEXES")
            print("\n✓ Current indexes:")
            for record in result:
                if record['name'].startswith('hypothesis') or record['name'].startswith('evidence'):
                    print(f"  - {record['name']}: {record['state']}")
            
        driver.close()
        return True
        
    except Exception as e:
        print(f"✗ Failed to create indexes: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Testing Neo4j Connection for BKMS")
    print("=" * 50)
    
    if test_connection():
        print("\n" + "=" * 50)
        print("Creating Test Data")
        print("=" * 50)
        
        if create_test_data():
            print("\n" + "=" * 50)
            print("Creating Indexes")
            print("=" * 50)
            
            create_indexes()
            
            print("\n" + "=" * 50)
            print("✓ Neo4j is ready for BKMS!")
            print("=" * 50)
            print("\nYou can now:")
            print("1. Open Neo4j Browser at http://localhost:7474")
            print("2. Login with username: neo4j, password: neo4jneo4j")
            print("3. Run: MATCH (n) RETURN n")
            print("   to see the test nodes we created")
        else:
            sys.exit(1)
    else:
        print("\nPlease ensure Neo4j Desktop is running and the database is started.")
        sys.exit(1)