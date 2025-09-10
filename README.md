# Bayesian Knowledge Management System (BKMS)

A personal knowledge management system based on Bayesian probability theory, designed to track how beliefs evolve when encountering new evidence.

## 🎯 Overview

BKMS helps you:
- Track hypotheses and quantify your confidence in them
- Process evidence through Bayesian probability calculations
- Detect contradictions in your belief system  
- Update beliefs rationally when encountering new information
- Verify or refute hypotheses with definitive evidence

**Core Philosophy**: "Today's posterior becomes tomorrow's prior"

## ✨ Features

### Core Functionality
- **Hypothesis Management**: Create, update, and delete hypotheses with confidence levels (0-100%)
- **Evidence Tracking**: Add evidence from various sources and link to hypotheses
- **Bayesian Updates**: Automatic probability calculations when new evidence affects hypotheses
- **Verification System**: Mark hypotheses as confirmed or refuted with definitive proof
- **Auto-ID Generation**: Automatic ID generation with real-time collision detection
- **Full CRUD Operations**: Complete create, read, update, delete for all entities

### User Interface
- **Modern Web UI**: Clean, responsive interface built with Next.js and React
- **Permanent URLs**: Direct links to individual hypotheses (`/hypotheses/{id}`) and evidence (`/evidences/{id}`)
- **Clickable Cards**: Dashboard hypothesis and evidence cards navigate to their permanent pages
- **Dark Mode Support**: Full dark mode compatibility
- **Visual Feedback**: Color-coded confidence levels and verification status
- **Inline Editing**: Edit hypotheses and evidence directly in the interface
- **Real-time Validation**: Instant feedback on duplicate IDs and data conflicts
- **Status Indicators**: 
  - ⏳ Pending - Hypothesis under evaluation
  - ✓ Confirmed - Hypothesis proven true
  - ✗ Refuted - Hypothesis proven false
- **Likelihood Display**: Evidence pages show P(E|H) and P(E|¬H) for linked hypotheses with visual progress bars
- **Link Management**: Edit or unlink Evidence↔Hypothesis relationships from both hypothesis and evidence detail pages
- **AI Suggestions & Chat (optional)**: When a hypothesis is selected and evidence text is present, Gemini suggests P(E|H) and P(E|~H) with rationale, and you can chat to refine reasoning. Suggestions never overwrite your sliders unless you click Apply.
- **X.com Auto-fill**: Paste an X/Twitter status URL into Source URL and the evidence text auto-fills (best-effort, no API keys).

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, TypeScript, React, Tailwind CSS
- **Backend**: Next.js API Routes (TypeScript/Node.js)
- **Database**: Neo4j Graph Database
- **Runtime**: Node.js 18+
- **Package Manager**: npm

**Important**: This project uses TypeScript/Node.js exclusively. No Python scripts are used or required.

## 📋 Prerequisites

- Node.js 18 or higher
- Neo4j 5.x (Community or Enterprise Edition)
- npm package manager

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/bkms.git
cd bkms
```

### 2. Install Neo4j

**macOS with Homebrew**:
```bash
brew install --cask neo4j
```

**Other platforms**: Download from [neo4j.com/download](https://neo4j.com/download/)

### 3. Configure Neo4j
1. Open Neo4j Desktop
2. Create a new project and database
3. Set credentials:
   - Username: `neo4j`
   - Password: `neo4jneo4j`
4. Start the database

### 4. Install Dependencies
```bash
cd app
npm install
```

### 5. Setup Database Constraints (First Time Only)
```bash
node scripts/setup-constraints.js
```

### 6. Configure Environment (Optional)
Create `.env.local` in the `app` directory:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jneo4j

# Optional: enable Gemini AI suggestions & chat
GEMINI_API_KEY=your_gemini_api_key
# Optional: pick a model (default: gemini-2.5-pro). No fallback to other models.
GEMINI_MODEL=gemini-2.5-pro
```

### 7. Start the Application
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Quick Start Guide

### Available Commands

Run `./help.sh` to see all available commands, or:

```bash
# Database Management
./clear-db.sh                      # Clear database (with confirmation)
cd app && node scripts/check-database.js  # Check database status

# Development
cd app && npm run dev               # Start development server
cd app && npm run build             # Build for production
cd app && npm start                 # Run production build

# Testing
See TEST_GUIDE.md for curl-based API tests
```

## 🎮 Using the Application

### Navigation & URLs
- **Main Dashboard**: `http://localhost:3000` - Interactive workspace for creating and managing items
- **All Hypotheses**: `http://localhost:3000/hypotheses` - Browse all hypotheses in grid view
- **Individual Hypothesis**: `http://localhost:3000/hypotheses/{id}` - Permanent link to specific hypothesis
- **All Evidence**: `http://localhost:3000/evidences` - Browse all evidence items
- **Individual Evidence**: `http://localhost:3000/evidences/{id}` - Permanent link to specific evidence with likelihood display
Tip: On the dashboard, click any hypothesis or evidence card to jump to its permanent page.

### Creating a Hypothesis
1. Click "Create New Hypothesis"
2. ID is auto-generated (e.g., H001, H002)
3. Enter your hypothesis statement
4. Set initial confidence (0-100%)
5. Click "Create Hypothesis"

### Adding Evidence  
1. Navigate to the Evidence tab
2. Click "Add New Evidence"
3. ID is auto-generated (e.g., E001, E002)
4. Enter evidence content and source URL
5. Optionally link to a hypothesis:
   - Select target hypothesis
   - Provide P(E|H) and P(E|~H) (0–100%)
   - Enable Bayesian update
6. Click "Create Evidence"

### Managing Hypotheses
- **Access Actions**: Click the **⋮** (three dots) button in the top-right corner of any hypothesis card
- **Update Confidence**: From the ⋮ menu → Click "Update Confidence" → Enter new value (0-100)
- **Verify as True**: From the ⋮ menu → Click "Verify ✓" → Enter evidence ID that proves it
- **Refute as False**: From the ⋮ menu → Click "Refute ✗" → Enter evidence ID that disproves it
- **Delete**: From the ⋮ menu → Click "Delete" (requires confirmation)
- **View Status**: Check the badge next to ID (⏳ Pending / ✓ Confirmed / ✗ Refuted)
- **View Permanent Link**: Navigate to `/hypotheses/{id}` for shareable URL
- **Linked Evidence**: On the hypothesis page, view all linked evidence with likelihood bars; edit P(E|H)/P(E|¬H) or unlink as needed (verified hypotheses are locked)

### Managing Evidence
- **Edit**: Click ✏️ to modify content or source
- **Delete**: Click 🗑️ to remove (requires confirmation)
- **Link**: Connect to hypotheses during creation
- **View Linked Hypotheses**: Evidence pages display all linked hypotheses with their P(E|H) and P(E|¬H) values
- **X.com Auto-fill**: If Source URL is an X/Twitter status link, the Content box auto-fills with tweet text (best-effort; no official X API).
- **AI Suggestions**: After selecting a hypothesis and writing Content, an AI panel suggests P(E|H) and P(E|~H) with a rationale. Click Apply to copy suggestions to the sliders, or adjust manually. Use the built‑in chat to ask follow-up questions. Pressing Enter in chat sends a message (does not submit the form).
- **Linked Hypotheses**: On the evidence page, view all linked hypotheses with likelihood bars; edit likelihoods or unlink directly

## 🗄️ Database Schema

### Nodes

**Hypothesis**
```typescript
{
  id: string                    // e.g., "H001"
  statement: string              // The belief text
  confidence: number             // 0.0 to 1.0
  updated: Date                  // Last modification
  verified: Date | null          // When verified (null if pending)
  verification_type: 'confirmed' | 'refuted' | null
}
```

**Evidence**
```typescript
{
  id: string                    // e.g., "E001"
  content: string               // Evidence text
  source_url: string            // Source URL
  timestamp: Date               // When added
}
```

### Relationships

- **AFFECTS**: Evidence → Hypothesis (probabilistic update)
  - `p_e_given_h`: P(E|H) in [0.0, 1.0]
  - `p_e_given_not_h`: P(E|~H) in [0.0, 1.0]

- **VERIFIED_BY**: Evidence → Hypothesis (definitive proof)
  - `verified_date`: When verified
  - `verification_type`: 'confirmed' | 'refuted'

- **RELATES_TO**: Hypothesis → Hypothesis
  - `type`: 'depends_on' | 'contradicts'
  - `strength`: 0.0 to 1.0

## 🧮 Bayesian Calculations

The system uses Bayes' Theorem for belief updates:

```
Posterior = Signal / (Signal + Noise)

Where:
- Signal = P(E|H) × P(H)
- Noise = P(E|~H) × P(~H)
```

### Example Update
1. Initial belief: "AI will transform software by 2025" (60% confidence)
2. Evidence: "GitHub Copilot reaches 1M users" with P(E|H)=0.8, P(E|~H)=0.2
3. Calculation:
   - Signal = 0.8 × 0.6 = 0.48
   - Noise = 0.2 × 0.4 = 0.08
   - Posterior = 0.48 / (0.48 + 0.08) = 85.7%
4. Updated confidence: 85.7%

### Evidence Deletion & Recompute

When you delete an evidence item (or remove a link to a hypothesis), the hypothesis confidence is recomputed from its immutable base prior using all remaining evidence:

- Base prior is stored as `base_confidence` on the hypothesis when it is created.
- Recompute uses odds form and multiplies likelihood ratios LR = P(E|H)/P(E|~H) for each remaining AFFECTS link (order‑independent under conditional independence).
- Verified hypotheses are locked and not recomputed.
- The DELETE evidence API returns which hypotheses were recomputed.

## 🎯 API Reference

### Hypothesis Endpoints
- `GET /api/hypotheses` - List all hypotheses
- `POST /api/hypotheses` - Create hypothesis
- `GET /api/hypotheses/[id]` - Get specific hypothesis
- `PUT /api/hypotheses/[id]` - Update confidence
- `DELETE /api/hypotheses/[id]` - Delete hypothesis

### Evidence Endpoints
- `GET /api/evidence` - List all evidence
- `POST /api/evidence` - Create evidence
- `GET /api/evidence/[id]` - Get specific evidence
- `PUT /api/evidence/[id]` - Update evidence
- `DELETE /api/evidence/[id]` - Delete evidence and recompute linked hypotheses from base prior; returns `{ success, recomputed: [{ id, updated }] }`
- `GET /api/evidence/[id]/links` - Get all hypotheses linked to this evidence with their P(E|H) and P(E|¬H) values
- `POST /api/evidence/[id]/link` - Create AFFECTS link to hypothesis with P(E|H), P(E|~H)
  - Create-only: returns 409 if link already exists
  - Blocks if hypothesis is verified (locked)
- `PUT /api/evidence/[id]/link` - Edit AFFECTS link likelihoods
  - Validates [0..1]
  - Blocks if hypothesis is verified
  - Recomputes the hypothesis from base prior and returns `{ recomputed: { id, updated } }`
- `DELETE /api/evidence/[id]/link` - Remove AFFECTS link for `{ hypothesisId }`
  - Blocks if hypothesis is verified
  - Recomputes the hypothesis from base prior and returns `{ recomputed: { id, updated } }`

### Bayesian Operations
- `POST /api/update` - Perform Bayesian update
- `POST /api/verify` - Verify/refute hypothesis

### Utility Endpoints
- `GET /api/next-id?type=hypothesis|evidence` - Get next available ID
- `GET /api/check-id?type=hypothesis|evidence&id=XXX` - Check if ID exists

### Analytics Endpoints
- `GET /api/analytics/accuracy` - Summary and itemized accuracy for verified hypotheses
  - Returns `{ summary: { total, confirmed, refuted, withPreCount, avgPre, brierMean }, bins: [{ bin, count, avgPred, accuracy }], items: [...] }`

### AI & Extraction Endpoints
- `GET /api/extract/x?url=<x_status_url>` - Best-effort text extraction for X/Twitter links (oEmbed + syndication fallback)
- `POST /api/llm/suggest` - Given hypothesis (id, statement, prior) and evidence text, returns `{ p_e_given_h, p_e_given_not_h, rationale }` using Gemini
- `POST /api/llm/chat` - Synchronous chat with Gemini using current hypothesis/evidence as context; returns `{ reply }`
- `POST /api/llm/hypothesis/review` - Evaluate a hypothesis for Bayesian suitability; returns flags (valid, atomicity, falsifiable, measurable, time‑bound), issues, suggested rewrite, operationalization tips, and evidence ideas.

## 🔁 AFFECTS Link Management

- Create (POST): Create-only. If an AFFECTS link already exists for (evidence, hypothesis), the server returns 409. Verified hypotheses are locked and reject modifications.
- Edit (PUT): Update `p_e_given_h` and `p_e_given_not_h`. The server recomputes the hypothesis from its immutable `base_confidence` using all current links and returns the updated value.
- Unlink (DELETE): Remove the AFFECTS relationship. The server recomputes from base and returns the updated value.
- Delete Evidence (DELETE /api/evidence/[id]): Removes the node and all links, recomputes each previously linked hypothesis from base.
- Base prior backfill: For legacy data without `base_confidence`, the server infers it from the current posterior and existing links before any mutation, then persists it.

UI behavior:
- After evidence deletion, the client refreshes the affected hypotheses using the recompute results returned by the API so you see updated confidences immediately.

## 📊 Neo4j Queries

Access Neo4j Browser at [http://localhost:7474](http://localhost:7474)

### Useful Cypher Queries

```cypher
-- View all hypotheses
MATCH (h:Hypothesis) RETURN h

-- Find verified hypotheses
MATCH (h:Hypothesis)
WHERE h.verified IS NOT NULL
RETURN h.statement, h.verification_type, h.verified

-- View belief network
MATCH (h:Hypothesis)-[r]-(e:Evidence)
RETURN h, r, e

-- Find evidence for hypothesis
MATCH (e:Evidence)-[:AFFECTS]->(h:Hypothesis {id: 'H001'})
RETURN e, h

-- Clear database
MATCH (n) DETACH DELETE n
```

## 🐛 Troubleshooting

### Neo4j Connection Issues
- Verify Neo4j is running in Neo4j Desktop
- Check credentials match `.env.local`
- Ensure bolt://localhost:7687 is accessible
- Run `cd app && node scripts/check-database.js` to test connection

### ID Generation Failures  
- IDs auto-generate on form open
- Falls back to H001/E001 if generation fails
- Manual override possible but validates for duplicates
- Check Neo4j connection if persistent failures

### Form Loading Issues
- Forms have 5-second timeout protection
- Check browser console for errors
- Restart dev server if unresponsive
- Clear browser cache if needed

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript/Node.js conventions
4. Test thoroughly
5. Submit a pull request

**Note**: All scripts must be in JavaScript/TypeScript or shell. No Python scripts.

## 📝 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Next.js, React, and Neo4j
- Inspired by Bayesian probability theory
- Based on the principle: "Today's posterior becomes tomorrow's prior"

---

For detailed technical documentation and architecture, see [CLAUDE.md](CLAUDE.md)

## 🧪 Research (PyMC) — Isolated Module

An experimental PyMC workflow has been added in `research/pymc/`. This is fully separate from the Next.js app and does not change the "No Python in app" policy. Use it only for offline research and modeling.

What's inside
- `requirements.txt` — PyMC/ArviZ/NumPy/pandas deps
- `simulate.py` — create a toy dataset
- `train.py` — fit a hierarchical logistic model with a global time random walk; saves `posterior.nc` and `encodings.json`
- `predict.py` — load the saved posterior and score new rows
- `bkms_pymc/` — small helper library (I/O, standardization, model build)

Quickstart
```bash
cd research/pymc
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 1) Simulate data
python simulate.py --out data/observations.csv --n-hypotheses 20 --n-time 40 --features 3

# 2) Train
python train.py --data data/observations.csv --features feat_1 feat_2 feat_3 --out outputs

# 3) Predict
python predict.py \
  --model outputs/posterior.nc \
  --encodings outputs/encodings.json \
  --data data/observations.csv \
  --features feat_1 feat_2 feat_3 \
  --out outputs/predictions.csv
```

Notes
- The app remains TypeScript-only; Python exists only under `research/pymc/`.
- Predictions require `hypothesis_id` and `time_index` seen during training. Retrain to expand coordinates.
- See `research/pymc/README.md` for details.

## 🔧 Maintenance Notes (September 2025)

- Consistent datetime serialization: API responses return ISO 8601 strings for `updated`, `verified`, and evidence `timestamp` fields.
- Internal quality fixes only: Corrected Next.js route param typing and improved delete semantics; no feature changes.
- Cypher examples use `null` (not `NULL`) for unverified fields to match Neo4j literal.
- Evidence model updated: AFFECTS now uses explicit probabilities `P(E|H)` and `P(E|~H)` instead of `direction` + `strength`.
- Evidence delete semantics: Deleting evidence triggers recomputation of linked hypotheses from `base_confidence` using LR products. Verified hypotheses are locked.
- Hypothesis base prior: New hypotheses store `base_confidence` at creation. Existing nodes recompute with `confidence` as fallback base if missing.

### Latest Updates (December 2025)
- **Permanent URLs**: Added dedicated pages for hypotheses (`/hypotheses`, `/hypotheses/{id}`) and evidence (`/evidences`, `/evidences/{id}`)
- **Likelihood Display**: Evidence detail pages now display P(E|H) and P(E|¬H) values for all linked hypotheses with visual progress bars
- **Navigation Links**: Added quick navigation between dashboard and permanent pages
- **Link Indicators**: Evidence list shows count of linked hypotheses
- **API Enhancement**: New `/api/evidence/[id]/links` endpoint to retrieve hypothesis links with likelihood values
### UI Enhancements (September 2025)
- **Clickable Cards**: Dashboard cards now navigate to permanent pages
- **Link Management UI**: Hypothesis and Evidence pages support editing and unlinking Evidence↔Hypothesis relationships in place
- **API Enhancement**: New `/api/hypotheses/[id]/links` endpoint to retrieve evidence links for a hypothesis
### AI Hypothesis Review (January 2026)
- **Manual AI Review**: In the Add Hypothesis form, click “Get AI Review” to evaluate if the statement is atomic, falsifiable, measurable, and time‑bound.
- **Suggestion Only**: Returns a suggested rewrite and evidence ideas; nothing is auto‑applied unless you click Replace or copy.

How to use (UI):
- Open “+ Add New Hypothesis”, enter your statement, then click “Get AI Review”.
- Review shows: validity flag, atomicity score, issues, suggested rewrite, operationalization tips, and evidence ideas.
- Click “Replace Statement” to apply, or copy and edit manually. No data is stored.

API usage:
- Endpoint: `POST /api/llm/hypothesis/review`
- Request:
```json
{ "statement": "AI will transform software development by 2027" }
```
- Response fields:
  - `valid_bayesian` (boolean), `atomicity_score` (0..1)
  - `issues[]` from: compound, vague_terms, unbounded_timeframe, non_falsifiable, ambiguous_subject, overly_broad_scope, unclear_metric, tautology
  - `falsifiable`, `measurable`, `time_bound` (booleans)
  - `suggested_rewrite` (<=160 chars)
  - `operationalization` { `measurable_event`, `threshold`, `timeframe`, `scope` }
  - `evidence_ideas[]` (3–6 short items), optional `suggested_tags[]`

### Analytics (January 2026)
- **Accuracy Dashboard**: Visit `/analytics/accuracy` for Brier mean, bin calibration, and verified items table.
- **API**: `GET /api/analytics/accuracy` (see Analytics Endpoints for schema).
### AI Suggestions/Chat Issues
- Ensure `GEMINI_API_KEY` is present in `app/.env.local` or environment
- Model: `gemini-2.5-pro` by default (or set `GEMINI_MODEL`). There is no automatic fallback to other models.
- Chat is synchronous (non‑streaming); a full reply appears after a short delay

### X/Twitter Extraction Limitations
- Without the official X API, extraction relies on public oEmbed and an undocumented syndication endpoint
- Some long posts or threads may still be truncated; we take the longer of the two sources when possible
### Link Discovery
- `GET /api/hypotheses/[id]/links` - Get all evidence linked to this hypothesis with their likelihood values
- AI support: Optional Gemini-powered suggestions (`/api/llm/suggest`) and chat (`/api/llm/chat`); suggestions never auto-overwrite sliders.
- X.com helper: Best-effort text extractor at `/api/extract/x` used by the Add Evidence form.

*Version 2.0.1 | Last Updated: September 2025*
