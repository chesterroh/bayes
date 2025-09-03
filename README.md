# Bayesian Knowledge Management System (BKMS)

A personal belief tracking system using Bayesian probability and Neo4j graph database.

🎆 **Current Status**: Backend API completed, Frontend UI in development

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for Next.js application)
- Neo4j 4.4+ (Desktop or Docker)
- npm or yarn package manager

### Installation

1. **Install Neo4j Desktop** (Recommended for beginners)
   - Download from: https://neo4j.com/download/
   - Create a new project and database
   - Set password (remember it!)
   - Start the database

2. **Clone the repository**
   ```bash
   git clone https://github.com/chesterroh/bayes.git
   cd bayes
   ```

3. **Install Next.js dependencies**
   ```bash
   cd app
   npm install
   ```

4. **Configure database connection**
   ```bash
   # Already configured in app/.env.local
   # Default: neo4j://localhost:7687
   # Username: neo4j
   # Password: neo4jneo4j
   ```

5. **Start the development server**
   ```bash
   npm run dev
   # Application runs on http://localhost:3000
   ```

---

## 📖 User Guide

### Basic Concepts

**Hypothesis**: A belief you hold
- Example: "Tesla will achieve Level 5 autonomy by 2026"
- Has a confidence level (0-100%)
- Can be verified when definitive proof arrives
- Once verified, becomes immutable (no further updates)

**Evidence**: Information that affects your beliefs  
- Example: "Waymo expands to 10 new cities"
- Can support or contradict hypotheses probabilistically
- Can definitively verify or refute hypotheses

**Relationships**: How beliefs and evidence connect
- **AFFECTS**: Evidence updates hypothesis confidence (Bayesian)
- **VERIFIED_BY**: Evidence definitively proves/disproves hypothesis
- **RELATES_TO**: Hypothesis depends on or contradicts another

### Core Operations

#### 1. Adding a Hypothesis (via API)

```bash
# Create a new hypothesis
curl -X POST http://localhost:3000/api/hypotheses \
  -H "Content-Type: application/json" \
  -d '{
    "id": "H001",
    "statement": "AI will significantly impact software development by 2025",
    "confidence": 0.75
  }'

# Get all hypotheses
curl http://localhost:3000/api/hypotheses

# Get specific hypothesis
curl http://localhost:3000/api/hypotheses/H001
```

#### 2. Adding Evidence

```bash
# Create evidence
curl -X POST http://localhost:3000/api/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "id": "E001",
    "content": "GitHub Copilot adoption reaches 1 million developers",
    "source_url": "https://github.blog/copilot-stats"
  }'

# Link evidence to hypothesis
curl -X POST http://localhost:3000/api/evidence/E001/link \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H001",
    "strength": 0.8,
    "direction": "supports"
  }'
```

#### 3. Updating Beliefs

```bash
# Manual confidence update
curl -X PUT http://localhost:3000/api/hypotheses/H001 \
  -H "Content-Type: application/json" \
  -d '{"confidence": 0.82}'

# Automatic Bayesian update
curl -X POST http://localhost:3000/api/update \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H001",
    "evidenceId": "E001",
    "propagate": true
  }'

# Verify hypothesis (definitive proof)
curl -X POST http://localhost:3000/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "hypothesisId": "H002",
    "evidenceId": "E002",
    "verificationType": "confirmed"
  }'
```

#### 4. TypeScript/JavaScript Client Example

```typescript
// In a Next.js component or page
import { useEffect, useState } from 'react';

interface Hypothesis {
  id: string;
  statement: string;
  confidence: number;
  verified: Date | null;
}

function BeliefTracker() {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  
  useEffect(() => {
    fetch('/api/hypotheses')
      .then(res => res.json())
      .then(data => setHypotheses(data));
  }, []);
  
  const addHypothesis = async (hypothesis: Hypothesis) => {
    const response = await fetch('/api/hypotheses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hypothesis)
    });
    return response.json();
  };
  
  // ... render hypotheses
}
```

---

## 🗄️ Neo4j Database Management

### Accessing Neo4j Browser

1. Open Neo4j Desktop
2. Click on your database
3. Click "Open Neo4j Browser"
4. Default URL: http://localhost:7474

### Essential Cypher Queries

#### View all hypotheses
```cypher
MATCH (h:Hypothesis)
RETURN h
```

#### View belief network
```cypher
MATCH (h1:Hypothesis)-[r]-(h2:Hypothesis)
RETURN h1, r, h2
```

#### Find evidence for a hypothesis
```cypher
MATCH (e:Evidence)-[:AFFECTS]->(h:Hypothesis {id: 'H001'})
RETURN e, h
```

#### Find verified hypotheses
```cypher
MATCH (h:Hypothesis)
WHERE h.verified IS NOT NULL
RETURN h.statement, h.confidence,
       CASE WHEN h.confidence = 1.0 THEN 'Confirmed' ELSE 'Refuted' END as outcome
```

#### Find verification evidence
```cypher
MATCH (e:Evidence)-[v:VERIFIED_BY]->(h:Hypothesis)
RETURN h.statement, e.content, v.verification_type, v.verified_date
ORDER BY v.verified_date DESC
```

#### Delete everything (careful!)
```cypher
MATCH (n)
DETACH DELETE n
```

### Backup & Restore

#### Backup database
```bash
neo4j-admin dump --database=neo4j --to=backup.dump
```

#### Restore database
```bash
neo4j-admin load --from=backup.dump --database=neo4j --force
```

---

## 🎯 API Endpoints

### Hypothesis Endpoints
- `GET /api/hypotheses` - Get all hypotheses
- `POST /api/hypotheses` - Create new hypothesis
- `GET /api/hypotheses/[id]` - Get specific hypothesis
- `PUT /api/hypotheses/[id]` - Update hypothesis confidence
- `DELETE /api/hypotheses/[id]` - Delete hypothesis

### Evidence Endpoints
- `GET /api/evidence` - Get all evidence
- `POST /api/evidence` - Create new evidence
- `POST /api/evidence/[id]/link` - Link evidence to hypothesis

### Bayesian Operations
- `POST /api/update` - Perform Bayesian update
- `POST /api/verify` - Verify or refute hypothesis

## 📋 Project Structure

```
bayes/
├── app/                        # Next.js application
│   ├── app/                    # App router pages
│   │   ├── api/                # API routes
│   │   │   ├── hypotheses/     # Hypothesis endpoints
│   │   │   ├── evidence/       # Evidence endpoints
│   │   │   ├── update/         # Bayesian update
│   │   │   └── verify/         # Verification endpoint
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── lib/                    # Library code
│   │   ├── neo4j.ts            # Neo4j connection
│   │   └── db/                 # Database services
│   │       ├── hypothesis.ts   # Hypothesis service
│   │       ├── evidence.ts     # Evidence service
│   │       └── bayesian.ts     # Bayesian calculations
│   ├── public/                 # Static files
│   ├── package.json            # Dependencies
│   └── .env.local              # Environment variables
├── CLAUDE.md                   # Technical documentation
├── README.md                   # User guide (this file)
└── test_neo4j_connection.py    # Neo4j test script
```

---

## 🛠️ Configuration

### Environment Variables (.env)

```bash
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# LLM Configuration (optional)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Application Settings
DEBUG=false
LOG_LEVEL=INFO
```

### Config File (config.yaml)

```yaml
bayesian:
  dampening_factor: 0.8  # For belief propagation
  min_evidence_strength: 0.1  # Ignore weak evidence
  
evidence:
  auto_categorize: true
  llm_analysis: false
  
ui:
  theme: dark
  graph_layout: force-directed
```

---

## 📔 Verification vs Bayesian Updates

### Understanding the Difference

**Bayesian Updates (AFFECTS relationship)**:
- Gradual confidence changes based on evidence
- Probabilistic reasoning
- Confidence moves between 0% and 100%
- Multiple pieces of evidence accumulate
- Example: News about Tesla's progress affects FSD prediction

**Verification (VERIFIED_BY relationship)**:
- Definitive proof or disproof
- Binary outcome: confirmed (100%) or refuted (0%)
- Hypothesis becomes immutable after verification
- Single piece of conclusive evidence
- Example: December 31st proves/disproves a 2024 prediction

### Verification Workflow

```python
# 1. Create prediction
hypothesis = bg.add_hypothesis(
    id="H007",
    statement="Apple will release AR glasses in 2025",
    confidence=0.60
)

# 2. Update confidence as evidence arrives (2024-2025)
# ... multiple Bayesian updates ...

# 3. Verification moment arrives (e.g., end of 2025)
if apple_released_ar_glasses:
    bg.verify_hypothesis("H007", evidence_id, "confirmed")
    # Confidence → 1.0, verified → timestamp
else:
    bg.verify_hypothesis("H007", evidence_id, "refuted")
    # Confidence → 0.0, verified → timestamp

# 4. Analyze prediction accuracy
print(f"Your confidence before verification: {pre_verification_confidence}")
print(f"Actual outcome: {outcome}")
```

---

## 📊 Visualization

### Web UI (Coming Soon)

```bash
cd web-ui
npm install
npm start
# Open http://localhost:3000
```

### CLI Visualization

```bash
# Show belief graph in terminal
python -m bkms.cli graph

# Show belief evolution
python -m bkms.cli history H001

# Generate report
python -m bkms.cli report --format=markdown

# Show verified predictions
python -m bkms.cli verified

# Analyze prediction accuracy
python -m bkms.cli accuracy --year=2024
```

---

## 🔧 Troubleshooting

### Common Issues

**Neo4j won't start**
- Check if port 7687 is already in use
- Verify Neo4j Desktop is running
- Check database is started in Neo4j Desktop

**API Connection refused**
- Ensure Neo4j is running
- Check credentials in `app/.env.local`
- Verify Next.js server is running: `npm run dev`

**TypeScript errors**
- Run `npm install` in the app directory
- Check Node.js version (18+ required)

**Database already has data**
- Clear database in Neo4j Browser:
  ```cypher
  MATCH (n) DETACH DELETE n
  ```

**Slow queries**
- Indexes are automatically created
- Check Neo4j Browser for query performance

---

## 📚 Development Guide

### Running Tests

```bash
# Test Neo4j connection
python3 test_neo4j_connection.py

# Run Next.js tests (when added)
cd app
npm test
```

### Adding New API Endpoints

Create a new route in `app/app/api/`:

```typescript
// app/app/api/custom/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

export async function GET(request: NextRequest) {
  const session = getSession();
  try {
    // Your Cypher query here
    const result = await session.run('MATCH (n) RETURN n');
    return NextResponse.json(result.records);
  } finally {
    await session.close();
  }
}
```

### Extending the Data Model

Add new node types or relationships in `lib/neo4j.ts`:

```typescript
export interface CustomNode {
  id: string;
  // Add your fields
}

export interface CustomRelationship {
  // Define relationship properties
}
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

Based on conversations about Bayesian reasoning and inspired by the principle:
> "Today's posterior becomes tomorrow's prior"

---

## 📞 Support

- GitHub Issues: [github.com/yourusername/bkms/issues](https://github.com/yourusername/bkms/issues)
- Documentation: [docs.bkms.io](https://docs.bkms.io)
- Email: support@bkms.io

---

*Version 1.2 | Last Updated: 2025-01-03*

## 🚀 Current Implementation Status

- ✅ **Backend**: Fully functional TypeScript/Node.js API
- ✅ **Database**: Neo4j configured with all node types and relationships
- ✅ **Bayesian Engine**: Complete with propagation and verification
- 🏗️ **Frontend UI**: In development (React components pending)
- 🔄 **Next Phase**: Building interactive UI components