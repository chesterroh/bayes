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
- **Dark Mode Support**: Full dark mode compatibility
- **Visual Feedback**: Color-coded confidence levels and verification status
- **Inline Editing**: Edit hypotheses and evidence directly in the interface
- **Real-time Validation**: Instant feedback on duplicate IDs and data conflicts
- **Status Indicators**: 
  - ⏳ Pending - Hypothesis under evaluation
  - ✓ Confirmed - Hypothesis proven true
  - ✗ Refuted - Hypothesis proven false

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
./clear-db-force.sh                 # Clear database (no confirmation)
cd app && node scripts/check-database.js  # Check database status

# Development
cd app && npm run dev               # Start development server
cd app && npm run build             # Build for production
cd app && npm start                 # Run production build

# Testing
node test-api.js                    # Run API tests (server must be running)
```

## 🎮 Using the Application

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

### Managing Evidence
- **Edit**: Click ✏️ to modify content or source
- **Delete**: Click 🗑️ to remove (requires confirmation)
- **Link**: Connect to hypotheses during creation

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
- `DELETE /api/evidence/[id]` - Delete evidence
- `POST /api/evidence/[id]/link` - Link to hypothesis with P(E|H), P(E|~H)

### Bayesian Operations
- `POST /api/update` - Perform Bayesian update
- `POST /api/verify` - Verify/refute hypothesis

### Utility Endpoints
- `GET /api/next-id?type=hypothesis|evidence` - Get next available ID
- `GET /api/check-id?type=hypothesis|evidence&id=XXX` - Check if ID exists

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

## 🔧 Maintenance Notes (September 2025)

- Consistent datetime serialization: API responses return ISO 8601 strings for `updated`, `verified`, and evidence `timestamp` fields.
- Internal quality fixes only: Corrected Next.js route param typing and improved delete semantics; no feature changes.
- Cypher examples use `null` (not `NULL`) for unverified fields to match Neo4j literal.
- Evidence model updated: AFFECTS now uses explicit probabilities `P(E|H)` and `P(E|~H)` instead of `direction` + `strength`.

*Version 2.0.1 | Last Updated: September 2025*
