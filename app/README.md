This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Bayesian Knowledge Management System (BKMS)

A personal knowledge management system based on Bayesian probability theory for tracking how beliefs evolve with new evidence.

## Features

- **Hypothesis Management**: Create and track hypotheses with confidence levels
- **Evidence Processing**: Add evidence and link it to hypotheses
- **Bayesian Updates**: Automatic confidence recalculation using Bayesian inference
- **Hypothesis Verification**: Mark hypotheses as confirmed or refuted with definitive evidence
- **Prediction Tracking**: Compare your confidence predictions against actual outcomes
- **Graph Visualization**: View belief networks in Neo4j Browser
- **Auto-ID Generation**: Automatic ID suggestion for new hypotheses and evidence

## Prerequisites

- Node.js 18+ and npm
- Neo4j Desktop or Neo4j Community Edition
- A Neo4j database (default name: 'bkms')

## Setup

### 1. Install Neo4j

```bash
# macOS
brew install --cask neo4j

# Or download from https://neo4j.com/download/
```

### 2. Configure Neo4j

1. Open Neo4j Desktop
2. Create a new database named 'bkms'
3. Set credentials (default: neo4j/neo4jneo4j)
4. Start the database

### 3. Configure Environment

Create a `.env.local` file:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jneo4j
```

### 4. Install Dependencies

```bash
npm install
```

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the BKMS interface.

## Usage

### Creating Hypotheses

1. Click "Add Hypothesis"
2. Enter a statement (e.g., "AI will achieve AGI by 2030")
3. Set initial confidence (0-100%)
4. The system auto-generates a unique ID

### Adding Evidence

1. Click "Add Evidence"
2. Enter evidence content
3. Provide source URL
4. Link to relevant hypotheses (optional)
5. Specify likelihoods: P(E|H) and P(E|~H) (0–100%)

### Verifying Hypotheses

1. Click the menu (⋮) on a hypothesis card
2. Choose "Verify ✓" or "Refute ✗"
3. Provide evidence ID for verification
4. Hypothesis becomes locked at 100% (confirmed) or 0% (refuted)

### Tracking Prediction Accuracy

After verification, the system shows:
- Your original confidence prediction
- Actual outcome (TRUE/FALSE)
- Accuracy score with assessment

Run the accuracy report:
```bash
node scripts/check-prediction-accuracy.js
```

## API Endpoints

### Hypotheses
- `GET /api/hypotheses` - List all hypotheses
- `POST /api/hypotheses` - Create new hypothesis
- `GET /api/hypotheses/[id]` - Get specific hypothesis
- `PUT /api/hypotheses/[id]` - Update hypothesis
- `DELETE /api/hypotheses/[id]` - Delete hypothesis

### Evidence
- `GET /api/evidence` - List all evidence
- `POST /api/evidence` - Add new evidence
- `POST /api/evidence/[id]/link` - Link evidence to hypothesis

### Bayesian Operations
- `POST /api/update` - Perform Bayesian update
- `POST /api/verify` - Verify/refute hypothesis

## Scripts

### Database Management
```bash
# Setup constraints (first time)
node scripts/setup-constraints.js

# Check database connectivity and stats
node scripts/check-database.js

# Clear all data
node scripts/clear-database.js

# Check prediction accuracy report
node scripts/check-prediction-accuracy.js
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Complete technical documentation
- [BAYES_EXPLAIN.md](./BAYES_EXPLAIN.md) - Bayesian calculation logic explained
- [NEO4J_QUERIES.md](./NEO4J_QUERIES.md) - Useful Neo4j queries for visualization

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (TypeScript)
- **Database**: Neo4j graph database
- **Runtime**: Node.js

## Key Concepts

### Bayesian Updates vs Verification

- **Bayesian Updates**: Gradual confidence adjustments based on probabilistic evidence
- **Verification**: Definitive proof that locks hypothesis at 100% or 0%

### Signal vs Noise

```
Posterior = Signal / (Signal + Noise)
Signal = P(E|H) × P(H)
Noise = P(E|~H) × P(~H)
```

## Development Guidelines

⚠️ **No Python Policy**: This project uses TypeScript/Node.js exclusively. Do not create or use Python scripts.

## Contributing

Contributions are welcome! Please ensure:
- All code is TypeScript
- Scripts use Node.js or shell only
- Tests pass before submitting PR

## License

MIT
