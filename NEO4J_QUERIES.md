# Neo4j Browser Queries for BKMS

## Viewing Relationships in Neo4j Browser

If you're not seeing relationships in the visualization, try these queries:

### 1. Show Everything (Nodes and Relationships)
```cypher
MATCH (n) 
OPTIONAL MATCH (n)-[r]->(m) 
RETURN n, r, m
```

### 2. Show Only Connected Nodes
```cypher
MATCH (e:Evidence)-[r:AFFECTS]->(h:Hypothesis)
RETURN e, r, h
```

### 3. Show All Relationships with Details
```cypher
MATCH ()-[r]->()
RETURN r
```

### 4. Show Specific Hypothesis with Its Evidence
```cypher
MATCH (h:Hypothesis {id: 'H001'})
OPTIONAL MATCH (e:Evidence)-[r:AFFECTS]->(h)
RETURN h, e, r
```

### 5. Show Graph Statistics
```cypher
MATCH (h:Hypothesis) 
WITH count(h) as hypotheses
MATCH (e:Evidence) 
WITH hypotheses, count(e) as evidence
MATCH ()-[r:AFFECTS]->() 
WITH hypotheses, evidence, count(r) as affects_rels
MATCH ()-[r:VERIFIED_BY]->() 
RETURN 
  hypotheses as `Total Hypotheses`,
  evidence as `Total Evidence`, 
  affects_rels as `AFFECTS Relationships`,
  count(r) as `VERIFIED_BY Relationships`
```

### 6. Show Full Network Graph
```cypher
MATCH path = (e:Evidence)-[r]->(h:Hypothesis)
RETURN path
```

## Troubleshooting Visualization Issues

### If relationships aren't visible:

1. **Check Neo4j Browser Settings**:
   - Click the settings icon (⚙️) in the lower left
   - Ensure "Connect result nodes" is ON
   - Set "Initial Node Display" to a higher number (e.g., 300)

2. **Use the Graph Result View**:
   - After running a query, click the "Graph" icon (not Table or Text)
   - This shows the visual representation

3. **Expand Nodes**:
   - Double-click on any node to expand its relationships
   - Or click a node and press the expand icon

4. **Check Relationship Direction**:
   - Our relationships go: Evidence → Hypothesis
   - Not the other way around

5. **Force Visualization**:
   ```cypher
   MATCH (e:Evidence)-[r:AFFECTS]->(h:Hypothesis)
   RETURN *
   ```
   The `RETURN *` forces all elements to be shown

## Current Database State

Based on your database, you should have:
- 3 Hypothesis nodes (H001, H002, H003)
- 3 Evidence nodes (E001, E002, E003)
- 3 AFFECTS relationships connecting them

## Creating New Relationships Manually

If you want to create relationships directly in Neo4j:

### Create AFFECTS relationship:
```cypher
MATCH (e:Evidence {id: 'E001'}), (h:Hypothesis {id: 'H001'})
CREATE (e)-[:AFFECTS {
  p_e_given_h: 0.8,
  p_e_given_not_h: 0.2
}]->(h)
RETURN e, h
```

### Create VERIFIED_BY relationship:
```cypher
MATCH (e:Evidence {id: 'E001'}), (h:Hypothesis {id: 'H001'})
CREATE (e)-[:VERIFIED_BY {
  verified_date: datetime(),
  verification_type: 'confirmed'
}]->(h)
RETURN e, h
```

## Checking Relationship Creation from UI

When you add evidence and link it to a hypothesis in the UI, it should:

1. Create the Evidence node
2. Create an AFFECTS relationship to the selected hypothesis
3. Optionally trigger a Bayesian update

To verify this is working:
1. Note the current relationship count
2. Add new evidence via UI and link to a hypothesis  
3. Check the count again:

```cypher
MATCH ()-[r:AFFECTS]->()
RETURN count(r) as total_affects_relationships
```

The count should increase by 1.
