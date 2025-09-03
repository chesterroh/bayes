# BKMS Testing Guide

## Prerequisites
1. Neo4j Desktop is running with 'bkms' database active
2. You're in the `app` directory
3. Development server is running: `npm run dev`

## Quick Test

### Option 1: Automated Test Script
```bash
# From project root
./test-api.sh
```

This will automatically test all API endpoints.

### Option 2: Manual Testing

#### 1. Start the server
```bash
cd app
npm run dev
```
Server runs on http://localhost:3000

#### 2. Create a Hypothesis
```bash
curl -X POST http://localhost:3000/api/hypotheses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "H001",
    "statement": "AI will transform software development by 2025",
    "confidence": 0.75
  }'
```

Expected response:
```json
{
  "id": "H001",
  "statement": "AI will transform software development by 2025",
  "confidence": 0.75,
  "updated": "2025-01-03T...",
  "verified": null
}
```

#### 3. Get All Hypotheses
```bash
curl http://localhost:3000/api/hypotheses
```

#### 4. Create Evidence
```bash
curl -X POST http://localhost:3000/api/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "id": "E001",
    "content": "GitHub Copilot reaches 1 million users",
    "source_url": "https://github.blog/copilot"
  }'
```

#### 5. Link Evidence to Hypothesis
```bash
curl -X POST http://localhost:3000/api/evidence/E001/link \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H001",
    "strength": 0.8,
    "direction": "supports"
  }'
```

#### 6. Perform Bayesian Update
```bash
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H001",
    "evidenceId": "E001"
  }'
```

Expected: Confidence should increase from 0.75 to ~0.857

#### 7. Verify a Hypothesis
```bash
# First create a hypothesis to verify
curl -X POST http://localhost:3000/api/hypotheses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "H002",
    "statement": "Test prediction for 2024",
    "confidence": 0.5
  }'

# Create verification evidence
curl -X POST http://localhost:3000/api/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "id": "E002",
    "content": "Prediction confirmed true",
    "source_url": "proof"
  }'

# Verify the hypothesis
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H002",
    "evidenceId": "E002",
    "verificationType": "confirmed"
  }'
```

Expected: H002 confidence becomes 1.0 and verified timestamp is set

## Viewing in Neo4j Browser

1. Open Neo4j Desktop
2. Click "Open Neo4j Browser"
3. Login (username: neo4j, password: neo4jneo4j)
4. Run queries:

```cypher
// See all nodes and relationships
MATCH (n) RETURN n

// See hypothesis-evidence relationships
MATCH (e:Evidence)-[r]->(h:Hypothesis)
RETURN e, r, h

// See only verified hypotheses
MATCH (h:Hypothesis)
WHERE h.verified IS NOT NULL
RETURN h
```

## Troubleshooting

### Server won't start
- Check if port 3000 is in use
- Run `npm install` in app directory

### Database connection error
- Ensure Neo4j Desktop is running
- Check database is started
- Verify credentials in `app/.env.local`

### No data returned
- Clear database and restart:
```cypher
MATCH (n) DETACH DELETE n
```

## Expected Bayesian Update Behavior

Given:
- Prior confidence: 0.75
- Evidence strength: 0.8 (supporting)

Calculation:
- Likelihood P(E|H) = 0.8
- Alt-likelihood P(E|~H) = 0.2
- Signal = 0.8 × 0.75 = 0.6
- Noise = 0.2 × 0.25 = 0.05
- Posterior = 0.6 / (0.6 + 0.05) = 0.923

The confidence should increase from 75% to ~92.3%