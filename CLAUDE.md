# Bayesian Knowledge Management System (BKMS)
## Architecture, Design & Technical Documentation

### Executive Summary

A personal knowledge management system based on Bayesian probability theory, designed to track how beliefs evolve when encountering new evidence. The system decomposes complex hypotheses into atomic units, processes evidence through Bayesian updates, and maintains belief networks in Neo4j graph database.

### Core Philosophy

**"Today's posterior becomes tomorrow's prior"**

The system implements the fundamental Bayesian insight: 
```
Posterior = Signal / (Signal + Noise)
```
Where:
- Signal = P(E|H) × P(H) - Evidence supporting the hypothesis
- Noise = P(E|~H) × P(~H) - Evidence that could exist regardless

---

## Important Development Guidelines

### 🚫 No Python Policy
**This project uses TypeScript/Node.js exclusively.** 
- DO NOT create or use Python scripts
- All scripts must be in JavaScript/TypeScript or shell scripts
- All backend code runs on Node.js
- Database interactions use the neo4j-driver npm package

### Technology Consistency
- Frontend: Next.js with TypeScript
- Backend: Next.js API routes (TypeScript)
- Scripts: Node.js or shell scripts only
- Database: Neo4j with Node.js driver
- LLM (optional): Gemini via Google Generative Language API

---

## 1. Product Requirements Document (PRD)

### 1.1 Problem Statement

In an era of information overload, especially in rapidly evolving fields like AI, individuals struggle to:
- Track how their beliefs change over time
- Quantify confidence in their hypotheses
- Detect contradictions in their belief system
- Update beliefs rationally when encountering new evidence

### 1.2 Solution

A graph-based belief tracking system that:
1. Decomposes complex beliefs into atomic hypotheses
2. Processes evidence through Bayesian calculations
3. Propagates updates through belief dependencies
4. Visualizes belief evolution over time

### 1.3 Key Features

#### Phase 1: Core Functionality (MVP)
- Create and manage atomic hypotheses
- Input evidence from multiple sources
- Link evidence to hypotheses
- Manual confidence updates
- Basic Neo4j graph structure

#### Phase 2: Bayesian Engine
- Automatic Bayesian calculations
- Signal/noise decomposition
- Belief propagation through dependencies
- Contradiction detection

#### Phase 3: Intelligence Layer
- LLM integration for evidence analysis
- Automatic hypothesis matching
- Evidence strength assessment
- Source credibility weighting

#### Phase 4: Advanced Features
- Complex query composition
- Predictive modeling
- Belief network visualization
- Export/reporting capabilities

### 1.4 Success Metrics
- Belief update accuracy: User agreement with calculated updates >80%
- System usage: Daily evidence input
- Prediction accuracy: Tracked predictions outperform baseline by 20%
- Coherence: Contradiction detection and resolution

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────┐
│           User Interface Layer          │
│         (Web UI / CLI / API)            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Application Layer               │
│   - Evidence Processing                 │
│   - Bayesian Calculations               │
│   - Belief Propagation                  │
│   - LLM Integration (optional)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Data Layer                     │
│      Neo4j Graph Database               │
│   - Hypotheses Nodes                    │
│   - Evidence Nodes                      │
│   - Relationships                       │
└─────────────────────────────────────────┘
```

### 2.2 Data Model

#### Node Types

**Hypothesis Node**
```cypher
(:Hypothesis {
  id: STRING,           // Unique identifier (e.g., 'H001')
  statement: STRING,    // The belief statement
  confidence: FLOAT,    // Current confidence (0.0 - 1.0)
  base_confidence: FLOAT, // Immutable base prior used for recompute
  updated: DATETIME,    // Last update timestamp
  verified: DATETIME    // When hypothesis was verified (null if unverified)
})
```

**Evidence Node**
```cypher
(:Evidence {
  id: STRING,           // Unique identifier (e.g., 'E001')
  content: STRING,      // The evidence text
  source_url: STRING,   // Source of evidence
  timestamp: DATETIME   // When evidence was collected
})
```

#### Relationship Types

**Evidence → Hypothesis (Probabilistic Update)**
```cypher
(:Evidence)-[:AFFECTS {
  p_e_given_h: FLOAT,        // P(E|H)
  p_e_given_not_h: FLOAT     // P(E|~H)
}]->(:Hypothesis)
```

**Evidence → Hypothesis (Definitive Verification)**
```cypher
(:Evidence)-[:VERIFIED_BY {
  verified_date: DATETIME,  // When verification occurred
  verification_type: STRING // 'confirmed' or 'refuted'
}]->(:Hypothesis)
```

**Hypothesis → Hypothesis**
```cypher
(:Hypothesis)-[:RELATES_TO {
  type: STRING,         // 'depends_on' or 'contradicts'
  strength: FLOAT       // Relationship strength (0.0 - 1.0)
}]->(:Hypothesis)
```

### 2.3 Bayesian Update Process

```python
def bayesian_update(hypothesis, evidence, relationship):
    """
    Core Bayesian update calculation
    
    Args:
        hypothesis: Current hypothesis node with confidence P(H)
        evidence: New evidence node
        relationship: AFFECTS relationship with P(E|H) and P(E|~H)
    
    Returns:
        Updated confidence P(H|E)
    """
    
    # Skip update if hypothesis is already verified
    if hypothesis.verified is not None:
        return hypothesis.confidence  # No updates after verification
    
    # Current belief
    prior = hypothesis.confidence  # P(H)
    
    # Evidence impact (direct likelihoods)
    likelihood = relationship.p_e_given_h       # P(E|H)
    alt_likelihood = relationship.p_e_given_not_h  # P(E|~H)
    
    # Calculate signal and noise
    signal = likelihood * prior  # P(E|H) × P(H)
    noise = alt_likelihood * (1 - prior)  # P(E|~H) × P(~H)
    
    # Posterior calculation
    posterior = signal / (signal + noise)  # P(H|E)
    
    return posterior
```

### 2.3.1 Recompute From Base Prior (Evidence Deletion)

```typescript
// Order‑independent recompute using likelihood ratios (assumes conditional independence)
function recomputeFromBase(base: number, links: Array<{ p_e_given_h: number; p_e_given_not_h: number }>): number {
  const EPS = 1e-6;
  const MAX_ODDS = 1e12;
  const b = Math.min(1 - EPS, Math.max(EPS, base));
  let odds = b / (1 - b);
  for (const r of links) {
    const denom = Math.max(EPS, r.p_e_given_not_h);
    const lr = Math.max(EPS, r.p_e_given_h / denom);
    odds = Math.min(MAX_ODDS, odds * lr);
  }
  return odds / (1 + odds);
}
```

On evidence delete (or link delete/edit), recompute the hypothesis confidence from `base_confidence` and the remaining AFFECTS links. Verified hypotheses are skipped (locked).

### 2.4 Hypothesis Verification Process

```python
def verify_hypothesis(hypothesis, evidence, verification_type, neo4j_session):
    """
    Mark a hypothesis as definitively verified or refuted
    
    Args:
        hypothesis: Hypothesis to verify
        evidence: Evidence that provides definitive proof
        verification_type: 'confirmed' or 'refuted'
        neo4j_session: Neo4j database session
    """
    
    # Create VERIFIED_BY relationship
    query = """
    MATCH (h:Hypothesis {id: $h_id}), (e:Evidence {id: $e_id})
    CREATE (e)-[:VERIFIED_BY {
        verified_date: datetime(),
        verification_type: $v_type
    }]->(h)
    SET h.verified = datetime(),
        h.confidence = CASE 
            WHEN $v_type = 'confirmed' THEN 1.0 
            ELSE 0.0 
        END,
        h.updated = datetime()
    """
    
    neo4j_session.run(query, 
                      h_id=hypothesis.id,
                      e_id=evidence.id,
                      v_type=verification_type)
    
    # Propagate verification impact to dependent hypotheses
    if verification_type == 'refuted':
        # If a hypothesis is refuted, dependent hypotheses need adjustment
        propagate_verification_impact(hypothesis, neo4j_session)
```

### 2.5 Belief Propagation Algorithm

```python
def propagate_belief_update(updated_hypothesis, neo4j_session):
    """
    Propagate belief updates through the dependency graph
    
    Args:
        updated_hypothesis: Hypothesis that was just updated
        neo4j_session: Neo4j database session
    """
    
    # Find all dependent hypotheses
    query = """
    MATCH (h1:Hypothesis {id: $h_id})-[r:RELATES_TO]->(h2:Hypothesis)
    WHERE r.type = 'depends_on'
    RETURN h2.id as dependent_id, r.strength as dependency_strength
    """
    
    dependents = neo4j_session.run(query, h_id=updated_hypothesis.id)
    
    for dependent in dependents:
        # Calculate propagated impact
        impact = updated_hypothesis.confidence_change * dependent['dependency_strength']
        
        # Update dependent hypothesis
        update_query = """
        MATCH (h:Hypothesis {id: $h_id})
        SET h.confidence = h.confidence + $impact,
            h.updated = datetime()
        """
        neo4j_session.run(update_query, 
                         h_id=dependent['dependent_id'], 
                         impact=impact)
```

---

## 3. Technical Design

### 3.1 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Database | Neo4j | Native graph operations, Cypher query language |
| Backend | Next.js API Routes | Full-stack TypeScript, unified codebase |
| Runtime | Node.js + TypeScript | Type safety throughout the stack |
| Neo4j Driver | neo4j-driver (Node.js) | Official driver with TypeScript support |
| Frontend | Next.js + React | Server-side rendering, optimal performance |
| Styling | Tailwind CSS | Utility-first CSS framework |
| Visualization | D3.js/Cytoscape.js | Graph visualization capabilities |
| API | REST (Next.js Routes) | Simple, efficient for CRUD operations |

### 3.2 API Design

#### Core Endpoints

```python
# Hypothesis Management
POST   /api/hypotheses          # Create new hypothesis
GET    /api/hypotheses/{id}     # Get hypothesis details
PUT    /api/hypotheses/{id}     # Update hypothesis
DELETE /api/hypotheses/{id}     # Delete hypothesis
GET    /api/hypotheses          # List all hypotheses

# Evidence Management
POST   /api/evidence            # Add new evidence
GET    /api/evidence/{id}       # Get evidence details
GET    /api/evidence/{id}/links # Get linked hypotheses with P(E|H) and P(E|~H)
POST   /api/evidence/{id}/link  # Link evidence to hypothesis
PUT    /api/evidence/{id}/link  # Edit AFFECTS likelihoods
DELETE /api/evidence/{id}/link  # Unlink evidence from hypothesis
DELETE /api/evidence/{id}       # Delete evidence; recompute linked hypotheses from base prior

# Bayesian Operations
POST   /api/update              # Trigger Bayesian update
GET    /api/calculate           # Calculate signal/noise for given inputs

# Verification Operations
POST   /api/verify              # Verify or refute a hypothesis
GET    /api/verified            # Get all verified hypotheses
GET    /api/pending-verification # Get hypotheses awaiting verification

# Graph Operations
GET    /api/graph/dependencies  # Get dependency graph
GET    /api/graph/contradictions # Find contradicting hypotheses
GET    /api/graph/path          # Find path between hypotheses

# AI & Extraction
GET    /api/extract/x           # Best-effort X/Twitter text extraction (no official API)
POST   /api/llm/suggest         # Suggest P(E|H), P(E|~H) + rationale (Gemini)
POST   /api/llm/chat            # Synchronous chat with Gemini using current hypothesis/evidence as context
POST   /api/llm/hypothesis/review # Evaluate a hypothesis for Bayesian suitability (server-only LLM)

## Analytics
GET    /api/analytics/accuracy  # Brier mean, simple calibration bins, verified items

# Link Discovery
GET    /api/hypotheses/{id}/links # Get linked evidence with P(E|H) and P(E|~H)
```

### 3.3 Database Queries

#### Essential Cypher Queries

```cypher
// 1. Create hypothesis with dependencies
CREATE (h:Hypothesis {
  id: 'H001',
  statement: 'Tesla will achieve FSD Level 5 by 2026',
  confidence: 0.65,
  updated: datetime(),
  verified: null  // Not yet verified
})

// 2. Add evidence and link to hypothesis
MATCH (h:Hypothesis {id: 'H001'})
CREATE (e:Evidence {
  id: 'E001',
  content: 'Tesla FSD Beta v12 shows major improvements',
  source_url: 'https://twitter.com/tesla/...',
  timestamp: datetime()
})
CREATE (e)-[:AFFECTS {p_e_given_h: 0.7, p_e_given_not_h: 0.3}]->(h)

// 3. Find all hypotheses affected by evidence
MATCH (e:Evidence {id: 'E001'})-[:AFFECTS]->(h:Hypothesis)
RETURN h

// 4. Find belief contradictions
MATCH (h1:Hypothesis)-[r:RELATES_TO {type: 'contradicts'}]->(h2:Hypothesis)
WHERE h1.confidence > 0.7 AND h2.confidence > 0.7
RETURN h1, h2, r

// 5. Trace belief dependencies
MATCH path = (h1:Hypothesis)-[:RELATES_TO*]->(h2:Hypothesis)
WHERE h1.id = 'H001'
RETURN path

// 6. Create verification for a hypothesis
MATCH (h:Hypothesis {id: 'H001'})
CREATE (e:Evidence {
  id: 'E_VERIFY_001',
  content: 'Tesla officially announces Level 5 FSD certification',
  source_url: 'https://tesla.com/fsd-level-5',
  timestamp: datetime('2026-01-15')
})
CREATE (e)-[:VERIFIED_BY {
  verified_date: datetime('2026-01-15'),
  verification_type: 'confirmed'
}]->(h)
SET h.verified = datetime('2026-01-15'),
    h.confidence = 1.0

// 7. Find all verified hypotheses
MATCH (h:Hypothesis)
WHERE h.verified IS NOT NULL
RETURN h.statement, h.confidence, h.verified,
       CASE 
         WHEN EXISTS((e)-[:VERIFIED_BY {verification_type: 'confirmed'}]->(h))
         THEN 'Confirmed' 
         ELSE 'Refuted' 
       END as outcome

// 8. Analyze prediction accuracy
MATCH (h:Hypothesis)<-[v:VERIFIED_BY]-(e:Evidence)
WHERE h.verified IS NOT NULL
RETURN h.statement,
       h.confidence as final_confidence,
       v.verification_type,
       e.content as verification_evidence,
       h.verified as verification_date
ORDER BY h.verified DESC

// 9. Find hypotheses awaiting verification
MATCH (h:Hypothesis)
WHERE h.verified IS NULL 
  AND h.statement CONTAINS '2024' 
  AND date() > date('2024-12-31')
RETURN h.statement as overdue_prediction, h.confidence
```

---

## 4. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [x] Design data model
- [x] Add verification mechanism to data model
- [x] Setup Neo4j database
- [x] Implement basic CRUD operations
- [x] Create API endpoints for hypothesis/evidence
- [x] Manual confidence updates
- [x] Implement verification functionality

### Phase 2: Bayesian Engine (Week 3-4)
- [x] Implement Bayesian calculation module
- [x] Add signal/noise decomposition
- [x] Create belief propagation algorithm
- [x] Add contradiction detection
- [x] Automated confidence updates via API

### Phase 3: Intelligence (Week 5-6)
- [x] Integrate LLM for evidence analysis (suggestions + chat)
- [ ] Automatic evidence categorization
- [ ] Evidence-to-hypothesis matching
- [ ] Source credibility scoring
- [ ] Evidence strength assessment

### Phase 4: Interface (Week 7-8)
- [ ] Web UI development
- [ ] Graph visualization
- [ ] Dashboard with metrics
- [ ] Report generation
- [ ] Export capabilities

### Phase 5: Advanced Features (Week 9-10)
- [ ] Complex hypothesis queries
- [ ] Prediction tracking
- [ ] Time-series analysis
- [ ] Multi-user support
- [ ] API for external integrations

---

## 5. Algorithms & Calculations

### 5.1 Core Bayesian Update

```python
class BayesianCalculator:
    @staticmethod
    def calculate_posterior(prior, likelihood, evidence_prior):
        """
        Bayes' Theorem: P(H|E) = P(E|H) * P(H) / P(E)
        """
        signal = likelihood * prior
        noise = evidence_prior * (1 - prior)
        return signal / (signal + noise)
    
    @staticmethod
    def calculate_signal_noise_ratio(signal, noise):
        """
        SNR determines the strength of belief update
        """
        if noise == 0:
            return float('inf')
        return signal / noise
```

### 5.2 Verification Handling

```python
class VerificationHandler:
    @staticmethod
    def verify_hypothesis(hypothesis_id, evidence_id, verification_type, session):
        """
        Handle hypothesis verification
        
        Args:
            hypothesis_id: ID of hypothesis to verify
            evidence_id: ID of evidence providing verification
            verification_type: 'confirmed' or 'refuted'
            session: Database session
        """
        # Set confidence based on verification
        new_confidence = 1.0 if verification_type == 'confirmed' else 0.0
        
        # Update hypothesis
        query = """
        MATCH (h:Hypothesis {id: $h_id}), (e:Evidence {id: $e_id})
        CREATE (e)-[:VERIFIED_BY {
            verified_date: datetime(),
            verification_type: $v_type
        }]->(h)
        SET h.verified = datetime(),
            h.confidence = $conf,
            h.updated = datetime()
        RETURN h
        """
        
        result = session.run(query, 
                            h_id=hypothesis_id,
                            e_id=evidence_id,
                            v_type=verification_type,
                            conf=new_confidence)
        
        return result.single()['h']
    
    @staticmethod
    def check_verification_status(hypothesis_id, session):
        """
        Check if a hypothesis has been verified
        
        Returns:
            None if not verified, or dict with verification details
        """
        query = """
        MATCH (h:Hypothesis {id: $h_id})
        OPTIONAL MATCH (h)<-[v:VERIFIED_BY]-(e:Evidence)
        RETURN h.verified as verified_date,
               v.verification_type as type,
               e.content as evidence
        """
        
        result = session.run(query, h_id=hypothesis_id).single()
        
        if result['verified_date']:
            return {
                'date': result['verified_date'],
                'type': result['type'],
                'evidence': result['evidence']
            }
        return None
```

### 5.3 Dependency Propagation

```python
def propagate_with_dampening(graph, updated_node, dampening_factor=0.8):
    """
    Propagate updates through graph with dampening to handle cycles
    """
    visited = set()
    queue = [(updated_node, 1.0)]  # (node, impact_strength)
    
    while queue:
        current, strength = queue.pop(0)
        
        if current in visited or strength < 0.01:  # Stop if visited or impact too small
            continue
            
        visited.add(current)
        
        # Get all dependent nodes
        for neighbor, edge_strength in graph.get_dependents(current):
            propagated_strength = strength * edge_strength * dampening_factor
            neighbor.confidence += (current.confidence_change * propagated_strength)
            queue.append((neighbor, propagated_strength))
```

### 5.3 Reverse Update via Recompute

We do not store every intermediate posterior. Instead, we keep an immutable `base_confidence` for each hypothesis and recompute from base using the remaining evidence whenever evidence is removed or edited.

Key points:
- Conditional independence → order‑independent likelihood ratio product.
- Odds form improves numerical stability; clamp denominators and odds.
- Verified hypotheses remain locked (no recompute).

Pseudo (TypeScript):
```typescript
const EPS = 1e-6;
const base = Math.min(1 - EPS, Math.max(EPS, h.base_confidence ?? h.confidence));
let odds = base / (1 - base);
for (const r of affects) {
  const lr = Math.max(EPS, r.p_e_given_h / Math.max(EPS, r.p_e_given_not_h));
  odds = Math.min(1e12, odds * lr);
}
const posterior = odds / (1 + odds);
```

### 5.4 X/Twitter Extraction

Best‑effort only (no official X API):
- Primary: `publish.twitter.com/oembed` with `omit_script=1` and no hiding
- Fallback: `cdn.syndication.twitter.com/widgets/tweet?id=...` (undocumented)
- Choose the longer of the two texts when both available; expect occasional truncation.

### 5.5 Gemini Integration

- Env vars: `GEMINI_API_KEY` (required), `GEMINI_MODEL` optional (default `gemini-2.5-pro`). No fallback to other models.
- Endpoints: `/api/llm/suggest` (returns `{ p_e_given_h, p_e_given_not_h, rationale }`), `/api/llm/chat` (returns `{ reply }`).
- Frontend: After you select a hypothesis and enter evidence content, a one‑shot suggestion is requested. Sliders remain user‑controlled; Apply copies suggestions. Chat is synchronous; Enter in chat never submits the form.

### 5.6 Hypothesis Review (AI)

Endpoint
- `POST /api/llm/hypothesis/review` → evaluates a proposed hypothesis for Bayesian suitability.

Request
```json
{ "statement": "AI will transform software development by 2027" }
```

Response (server clamps lengths and values)
```ts
type ReviewResponse = {
  valid_bayesian: boolean;
  atomicity_score: number; // 0..1
  issues: (
    'compound' | 'vague_terms' | 'unbounded_timeframe' | 'non_falsifiable' |
    'ambiguous_subject' | 'overly_broad_scope' | 'unclear_metric' | 'tautology'
  )[];
  falsifiable: boolean;
  measurable: boolean;
  time_bound: boolean;
  suggested_rewrite: string; // <= 160 chars
  operationalization?: {
    measurable_event?: string; // <= 120
    threshold?: string;        // <= 80
    timeframe?: string;        // <= 80
    scope?: string;            // <= 80
  };
  evidence_ideas?: string[];   // up to 6, each <= 80
  suggested_tags?: string[];   // up to 6, each <= 30
  note?: string;               // <= ~1000 chars
  model?: string;              // resolved model name
};
```

Implementation details
- File: `app/app/api/llm/hypothesis/review/route.ts`
- Prompt: instructs the model to assess atomicity, falsifiability, measurability, and time‑boundedness and to return strict JSON only.
- Parsing: strips code fences; JSON.parse; on parse failure, returns a soft fallback JSON instead of 500.
- Validation: clamps numeric fields to [0..1], whitelists `issues`, truncates long strings.
- Timeout: 20s per request via `AbortController`.
- Model selection: uses `process.env.GEMINI_MODEL || 'gemini-2.5-pro'`. No fallbacks to other models.
- Errors: non‑OK responses return `{ error, status, detail }` with 502.

UI integration
- Manual trigger button “Get AI Review” in `AddHypothesisForm`.
- Renders status chips, issue tags, suggested rewrite (Replace/Copy), operationalization tips, and evidence ideas.
- Ephemeral: no DB writes or logging; values are not persisted.

---

## 6. Developer Notes

### 6.1 Where Things Live (Entry Points)

- Evidence delete (snapshot + backfill + recompute):
  - `app/app/api/evidence/[id]/route.ts` → `DELETE`
- AFFECTS link lifecycle (backfill before mutate, recompute on edit/unlink):
  - `app/app/api/evidence/[id]/link/route.ts` → `POST` (create-only), `PUT` (edit), `DELETE` (unlink)
- Recompute engine (odds × LR product):
  - `app/lib/db/bayesian.ts` → `BayesianService.recomputeFromBase`
- Base prior persistence:
  - `app/lib/db/hypothesis.ts` → `HypothesisService.setBaseConfidence`
- Link helpers (existence/update/delete):
  - `app/lib/db/evidence.ts` → `linkExists`, `updateLink`, `deleteLink`

### 6.2 Mutation Flows

- Evidence DELETE `/api/evidence/[id]`:
  1) Snapshot all linked hypotheses: collect current `h.confidence` and all current `AFFECTS` (peh, penh) before deletion.
  2) If any affected hypothesis has no `base_confidence`, infer it: `postOdds = P/(1−P)`, `LR_prod = Π(peh/max(EPS, penh))`, `baseOdds = postOdds / max(EPS, LR_prod)`, `base = baseOdds/(1+baseOdds)`. Persist base once.
  3) Delete evidence (`DETACH DELETE`) — removes its AFFECTS.
  4) Recompute each affected hypothesis from base via `recomputeFromBase`.
  5) Return `{ success, recomputed: [{ id, updated }] }`.

- Link POST `/api/evidence/[id]/link` (create-only):
  - Verified guard (reject if `h.verified`), duplicate guard (`linkExists` → 409).
  - Backfill base if missing from current posterior and all current links (as above).
  - Create AFFECTS, no auto-recompute (keeps create semantics consistent).

- Link PUT `/api/evidence/[id]/link` (edit):
  - Verified guard; validate [0..1]; backfill base if missing; update AFFECTS properties; recompute from base; return updated.

- Link DELETE `/api/evidence/[id]/link` (unlink):
  - Verified guard; backfill base if missing; delete AFFECTS; recompute from base; return updated.

### 6.3 Algorithm, Constants, Invariants

- Recompute odds form (order‑independent under conditional independence):
  - `b = clamp(base, EPS, 1−EPS)`; `odds = b/(1−b)`; for each link: `lr = max(EPS, peh/max(EPS, penh))`; `odds = min(MAX_ODDS, odds × lr)`; `posterior = odds/(1+odds)`.
- Constants: `EPS = 1e-6`, `MAX_ODDS = 1e12`.
- Verified lock: If `h.verified` is set, skip recompute and block link mutations.
- Base prior immutability: Never mutate `base_confidence` after it is set; only backfill when null.

### 6.4 UI Sync Hooks

- After evidence DELETE, the API returns affected hypothesis IDs; the client fetches fresh hypotheses and merges them into local state so the confidence bar updates immediately.
- Link PUT/DELETE return `{ recomputed: { id, updated } }`; hypothesis and evidence detail pages refresh links and hypothesis data after edits/unlinks.
- Dashboard cards are clickable and navigate to permanent item pages; action buttons prevent navigation via event propagation guards.

### 6.5 Testing Checklist

- Single link remove: add one evidence/link → delete evidence → posterior returns to base.
- Multiple links: add two links → delete one → posterior matches recompute with remaining link.
- Legacy base: create hypotheses without `base_confidence` → add evidence → delete → ensure backfill computes correct base and recompute works.
- Verified: set verified → ensure POST/PUT/DELETE link all return 409 and recompute is skipped.
- Edge: `p_e_given_not_h ≈ 0` clamps, no NaN/Inf; duplicates cause 409 on POST.

### 6.6 Extending Safely

- If adding new link types that affect confidence, reuse the backfill‑before‑mutate and recompute‑after pattern.
- Consider a lightweight event log only if you need true time‑travel (state “just before evidence X”), which is distinct from recompute.
- Add GET endpoints for listing links if richer editing UI is needed.

### 6.7 Documentation Maintenance

- When you change the application architecture, API entry points, or major flows, update `ARCHITECTURE_DIAGRAM.md` to keep the high‑level diagrams accurate.
- Keep `README.md` and this `CLAUDE.md` consistent with any new endpoints or behaviors.

---

## 6. Future Enhancements

### 6.1 Advanced Features
- **Temporal Reasoning**: Track how beliefs change over time
- **Counterfactual Analysis**: "What if this evidence was false?"
- **Belief Clustering**: Group related hypotheses automatically
- **Prediction Markets**: Integration with prediction platforms
- **Collaborative Beliefs**: Share and compare belief networks

### 6.2 Technical Improvements
- **Distributed Graph**: Scale beyond single Neo4j instance
- **Real-time Updates**: WebSocket for live belief updates
- **Mobile App**: React Native for on-the-go updates
- **Voice Input**: "Add evidence that Tesla announced..."
- **AR Visualization**: 3D belief network visualization

### 6.3 AI Enhancements
- **Auto-hypothesis Generation**: LLM suggests new hypotheses
- **Evidence Summarization**: Condense long articles
- **Contradiction Resolution**: AI suggests how to resolve conflicts
- **Belief Coaching**: AI suggests what evidence to seek
- **Trend Detection**: Identify emerging patterns in beliefs

---

## Appendix A: Example Scenarios

### Scenario 1: Bayesian Update (Probabilistic)

### Initial Setup
```
H1: "Physical AI will mature by 2027" (confidence: 60%)
H2: "Tesla Optimus will dominate robot market" (confidence: 50%)
H2 DEPENDS_ON H1 (strength: 0.8)
```

### Evidence Arrives
```
E1: "Boston Dynamics delays product 2 years"
E1 AFFECTS H1 (P(E|H)=0.30, P(E|~H)=0.70)
```

### Bayesian Update
```
Prior P(H1) = 0.60
Likelihood P(E1|H1) = 0.30
Alt-likelihood P(E1|~H1) = 0.70

Signal = 0.30 × 0.60 = 0.18
Noise = 0.70 × 0.40 = 0.28
Posterior P(H1|E1) = 0.18 / (0.18 + 0.28) = 0.39

H1 confidence: 60% → 39%
```

### Propagation
```
H2 depends on H1 with strength 0.8
H1 decreased by 21 percentage points
H2 impact = -21% × 0.8 = -16.8%
H2 confidence: 50% → 33.2%
```

### Scenario 2: Hypothesis Verification (Definitive)

#### Initial Setup
```
H3: "GPT-5 will be released in 2024" (confidence: 45%)
H4: "AI will surpass human performance on all benchmarks by 2025" (confidence: 30%)
H4 DEPENDS_ON H3 (strength: 0.6)
```

#### Throughout 2024
```
E2: "OpenAI hints at major announcement" 
E2 AFFECTS H3 (P(E|H)=0.50, P(E|~H)=0.50)
H3 confidence: 45% → 52% (Bayesian update)

E3: "Sam Altman tweets about 'something big coming'"
E3 AFFECTS H3 (P(E|H)=0.60, P(E|~H)=0.40)
H3 confidence: 52% → 57% (Bayesian update)
```

#### December 31, 2024 - Definitive Evidence
```
E4: "Year 2024 ends without GPT-5 release"
E4 VERIFIED_BY H3 (refuted)

H3 verified: 2024-12-31
H3 confidence: 57% → 0% (Refuted)
H3 no longer accepts Bayesian updates

Propagation to H4:
H4 confidence drops significantly due to dependency
```

#### Verification Impact
```
Pre-verification tracking:
- H3 had 57% confidence before verification
- Prediction was WRONG (refuted)
- System can analyze: Was 57% confidence appropriate?

Post-verification:
- H3 is locked at 0% confidence
- No future evidence can change H3
- Historical record preserved for accuracy analysis
```

---

## Appendix B: Key Insights from Conversations

1. **Signal vs Noise Framework**: The posterior probability is essentially the ratio of signal to total observation (signal + noise)

2. **Dynamic Evolution**: Beliefs are not static - today's posterior becomes tomorrow's prior

3. **Decomposition Principle**: Complex beliefs should be broken into atomic units for precise tracking

4. **Evidence Quality**: Not all evidence is equal - source credibility and evidence strength matter

5. **Contradiction Awareness**: Strong belief in contradicting hypotheses indicates cognitive dissonance

6. **Verification Distinction**: Probabilistic updates (AFFECTS) vs definitive proof (VERIFIED_BY) serve different epistemological purposes

7. **Prediction Tracking**: Verified hypotheses provide ground truth for calibrating confidence estimates

---

*Last Updated: 2025-09-03*
*Version: 1.3.1*

---

## 📝 Recent Changes (January 2025 Session)

### Session 1: Core UI Implementation
1. **Complete UI Implementation**: Built full React frontend with hypothesis and evidence management
2. **Auto-ID Generation**: Automatic ID generation with collision detection for both hypotheses (H001, H002...) and evidence (E001, E002...)
3. **Full CRUD Operations**: Added update and delete functionality for evidence (previously only had create/read)
4. **Verification Status Fix**: Fixed bug where NULL verified status was showing as "refuted" - now properly shows "Pending"
5. **No Python Policy**: Removed all Python scripts, converted everything to TypeScript/Node.js
6. **Form Validation**: Real-time ID collision detection with visual feedback
7. **Timeout Protection**: Added 5-second timeouts to prevent hanging on API calls
8. **Database Scripts**: Created comprehensive database management scripts (check, clear, setup constraints)

### Session 2: Verification & Prediction Tracking
1. **Verification UI Fix**: Fixed missing verify/refute buttons in hypothesis menu (was checking wrong field)
2. **Prediction Accuracy Tracking**: Added `pre_verification_confidence` field to track confidence before verification
3. **Accuracy Display**: Shows prediction accuracy score after verification with visual feedback
4. **Accuracy Report Script**: Created `check-prediction-accuracy.js` for analyzing prediction calibration
5. **Bayesian Logic Documentation**: Created comprehensive BAYES_EXPLAIN.md explaining the mathematical logic
6. **Neo4j Queries Guide**: Added NEO4J_QUERIES.md with helpful queries for viewing relationships

### Technical Improvements
- Fixed hypothesis verification UI (changed from checking `verified` to `verification_type`)
- Added prediction accuracy calculation and display in UI
- Store pre-verification confidence for accuracy analysis
- Created comprehensive documentation for Bayesian calculations
- Added troubleshooting guide for Neo4j relationship visualization

### Maintenance Update (September 2025)
- Use `null` (not `NULL`) in Cypher examples for unverified fields to match Neo4j literal and implementation
- Ensure API returns ISO 8601 strings for datetime fields (`updated`, `verified`, evidence `timestamp`) consistently across endpoints
- Corrected Next.js dynamic route parameter typing (internal refactor, no API change)
- Updated app metadata (title/description) to BKMS
- Evidence model update: Replaced `AFFECTS {strength, direction}` with explicit `AFFECTS {p_e_given_h, p_e_given_not_h}` and updated docs/examples accordingly

### Session 3: Permanent URLs & Likelihood Display (December 2025)
1. **Permanent URL System**: Created dedicated pages for browsing and viewing individual items
   - `/hypotheses` - Grid view of all hypotheses
   - `/hypotheses/{id}` - Individual hypothesis detail page
   - `/evidences` - Grid view of all evidence
   - `/evidences/{id}` - Individual evidence detail page with likelihood display
2. **Likelihood Display**: Evidence pages now show P(E|H) and P(E|¬H) for linked hypotheses
   - Visual progress bars for both likelihood values
   - Links to related hypothesis pages
   - Count indicators on evidence list
3. **API Enhancement**: Added `/api/evidence/[id]/links` endpoint to fetch linked hypotheses with AFFECTS relationship values
4. **Navigation Improvements**: Added navigation links between dashboard and permanent pages
5. **UI Polish**: Breadcrumb navigation, copy-to-clipboard for permanent links

### Documentation Created
- **BAYES_EXPLAIN.md**: Complete explanation of Bayesian logic and calculations
- **NEO4J_QUERIES.md**: Guide for viewing and debugging relationships in Neo4j Browser
- Updated README.md with clearer usage instructions
- Enhanced CLAUDE.md with implementation details

---

## Implementation Status (Updated: January 2025)

### ✅ Completed Components

#### Database Layer (TypeScript/Node.js)
- ✅ Neo4j connection management (`app/lib/neo4j.ts`)
- ✅ Hypothesis service with full CRUD operations (`app/lib/db/hypothesis.ts`)
- ✅ Evidence service with full CRUD operations (`app/lib/db/evidence.ts`)
- ✅ Bayesian calculations and propagation (`app/lib/db/bayesian.ts`)
- ✅ Type definitions for all nodes and relationships
- ✅ Verification type tracking (confirmed/refuted/pending)

#### API Layer (Next.js API Routes)
- ✅ `/api/hypotheses` - GET all, POST new
- ✅ `/api/hypotheses/[id]` - GET, PUT, DELETE specific
- ✅ `/api/evidence` - GET all, POST new
- ✅ `/api/evidence/[id]` - GET, PUT, DELETE specific
- ✅ `/api/evidence/[id]/link` - Link evidence to hypothesis
- ✅ `/api/update` - Bayesian update with optional propagation
- ✅ `/api/verify` - Verify/refute hypothesis
- ✅ `/api/next-id` - Auto-generate next available ID
- ✅ `/api/check-id` - Check for ID collisions

#### User Interface (React/Next.js)
- ✅ Main dashboard with tabbed interface
- ✅ Hypothesis list with cards showing confidence and status
- ✅ Evidence list with inline editing
- ✅ Add hypothesis form with auto-ID generation
- ✅ Add evidence form with hypothesis linking
- ✅ Edit/delete functionality for both entities
- ✅ Real-time ID collision detection
- ✅ Visual status indicators (Pending/Confirmed/Refuted)
- ✅ Dark mode support
- ✅ Responsive design with Tailwind CSS
- ✅ Permanent URL pages for hypotheses and evidence
- ✅ Likelihood display on evidence pages showing P(E|H) and P(E|¬H)

#### Infrastructure & Tools
- ✅ Next.js 14 application with TypeScript
- ✅ Neo4j database configured and running
- ✅ Environment configuration (.env.local)
- ✅ Database management scripts (Node.js only)
- ✅ API test suite (Node.js)
- ✅ Database constraints and indexes
- ✅ Help documentation system

### Current Architecture

```
┌─────────────────────────────────────────┐
│         Next.js Application             │
│  ┌────────────────────────────────┐     │
│  │     Frontend (React/TSX)       │     │
│  │   - Components (pending)       │     │
│  │   - Tailwind CSS styling       │     │
│  └────────────────────────────────┘     │
│  ┌────────────────────────────────┐     │
│  │    API Routes (TypeScript)     │     │
│  │   - REST endpoints             │     │
│  │   - Request validation         │     │
│  └────────────────────────────────┘     │
│  ┌────────────────────────────────┐     │
│  │   Database Services (TS)       │     │
│  │   - HypothesisService          │     │
│  │   - EvidenceService            │     │
│  │   - BayesianService            │     │
│  └────────────────────────────────┘     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Neo4j Graph Database            │
│   - Hypothesis nodes                    │
│   - Evidence nodes                       │
│   - AFFECTS relationships               │
│   - VERIFIED_BY relationships           │
│   - RELATES_TO relationships            │
└─────────────────────────────────────────┘
```

### 🚀 Next Steps for Enhancement

#### Phase 1: Visualization & Analytics
- [ ] Graph visualization with D3.js or Cytoscape.js
- [ ] Time-series charts for belief evolution
- [ ] Prediction accuracy dashboard
- [ ] Export capabilities (CSV, JSON)
- [ ] Advanced search and filtering

#### Phase 2: Intelligence Layer
- [ ] LLM integration for evidence analysis
- [ ] Automatic hypothesis-evidence matching
- [ ] Evidence strength assessment
- [ ] Source credibility scoring
- [ ] Natural language hypothesis input

#### Phase 3: Advanced Features
- [ ] Batch import from various sources
- [ ] WebSocket for real-time collaboration
- [ ] Mobile app with React Native
- [ ] Browser extension for evidence capture
- [ ] API webhooks for external integrations

#### Phase 4: Enterprise Features
- [ ] Multi-user support with authentication
- [ ] Team collaboration features
- [ ] Audit logging and versioning
- [ ] Advanced permissions system
- [ ] Cloud deployment options
### 3.4 AFFECTS Link Management Semantics

- Create (`POST /api/evidence/{id}/link`):
  - Create-only; returns 409 if link already exists for the (Evidence, Hypothesis) pair.
  - Blocks if hypothesis is verified (locked).
  - Does not auto-recompute (keeps create flow consistent; UI may opt-in to update).

- Edit (`PUT /api/evidence/{id}/link`):
  - Validates `p_e_given_h`, `p_e_given_not_h` in [0..1].
  - Blocks if hypothesis is verified.
  - Recomputes the hypothesis from `base_confidence` using odds × LR product and returns `{ recomputed: { id, updated } }`.

- Unlink (`DELETE /api/evidence/{id}/link`):
  - Removes the AFFECTS relationship.
  - Blocks if hypothesis is verified.
  - Recomputes from base and returns `{ recomputed: { id, updated } }`.

- Evidence Delete (`DELETE /api/evidence/{id}`):
  - Snapshots each linked hypothesis’s current posterior and link set, infers `base_confidence` if missing, deletes the evidence, then recomputes each affected hypothesis from base using remaining links.
  - Returns `{ success, recomputed: [{ id, updated }] }`.

- Base prior backfill (legacy nodes):
  - If `base_confidence` is missing, infer it from current posterior P and existing links E via:
    - `postOdds = P/(1−P)`; `LR_prod = Π (P(E|H)/P(E|~H))`; `baseOdds = postOdds / LR_prod`; `base = baseOdds/(1+baseOdds)`.
  - Persist the inferred base once; future recomputes use the stored base.

#### Discovery Endpoints
- `GET /api/evidence/{id}/links`: returns all hypotheses linked to the given evidence with their likelihoods.
- `GET /api/hypotheses/{id}/links`: returns all evidence linked to the given hypothesis with their likelihoods.

#### UI Controls
- Hypothesis detail page: lists all linked evidence with P(E|H) and P(E|¬H); supports inline edit/unlink; verified hypotheses are locked.
- Evidence detail page: lists all linked hypotheses with P(E|H) and P(E|¬H); supports inline edit/unlink.
