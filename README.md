# Bayesian Knowledge Management System (BKMS)

A personal belief tracking system using Bayesian probability and Neo4j graph database.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Neo4j 4.4+ (Desktop or Docker)
- Node.js 16+ (for web UI, optional)

### Installation

1. **Install Neo4j Desktop** (Recommended for beginners)
   - Download from: https://neo4j.com/download/
   - Create a new project and database
   - Set password (remember it!)
   - Start the database

2. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bkms.git
   cd bkms
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure database connection**
   ```bash
   cp .env.example .env
   # Edit .env with your Neo4j credentials
   ```

---

## 📖 User Guide

### Basic Concepts

**Hypothesis**: A belief you hold
- Example: "Tesla will achieve Level 5 autonomy by 2026"
- Has a confidence level (0-100%)

**Evidence**: Information that affects your beliefs  
- Example: "Waymo expands to 10 new cities"
- Can support or contradict hypotheses

**Relationships**: How beliefs and evidence connect
- Evidence AFFECTS Hypothesis
- Hypothesis RELATES_TO Hypothesis

### Core Operations

#### 1. Adding a Hypothesis

```python
from bkms import BeliefGraph

bg = BeliefGraph()

# Add a new hypothesis
bg.add_hypothesis(
    id="H001",
    statement="AI will significantly impact software development by 2025",
    confidence=0.75  # 75% confident
)
```

#### 2. Adding Evidence

```python
# Add evidence
bg.add_evidence(
    id="E001",
    content="GitHub Copilot adoption reaches 1 million developers",
    source_url="https://github.blog/copilot-stats"
)

# Link evidence to hypothesis
bg.link_evidence_to_hypothesis(
    evidence_id="E001",
    hypothesis_id="H001",
    strength=0.8,  # Strong evidence
    direction="supports"  # or "contradicts"
)
```

#### 3. Updating Beliefs

```python
# Manual update
bg.update_confidence("H001", new_confidence=0.82)

# Automatic Bayesian update
bg.bayesian_update("H001", "E001")
```

#### 4. Querying Your Beliefs

```python
# Get current belief state
belief = bg.get_hypothesis("H001")
print(f"Belief: {belief.statement}")
print(f"Confidence: {belief.confidence:.1%}")

# Find contradictions
contradictions = bg.find_contradictions(min_confidence=0.7)

# Track belief evolution
history = bg.get_belief_history("H001")
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

## 🎯 Usage Examples

### Example 1: Investment Thesis

```python
# Create investment hypothesis
bg.add_hypothesis("H001", "Tesla stock will reach $400 by 2026", 0.60)
bg.add_hypothesis("H002", "FSD will achieve Level 5 by 2025", 0.40)
bg.add_hypothesis("H003", "EV market will grow 50% annually", 0.70)

# Create dependencies
bg.add_dependency("H001", depends_on="H002", strength=0.8)
bg.add_dependency("H001", depends_on="H003", strength=0.6)

# Add evidence
bg.add_evidence("E001", "Tesla FSD v12 shows major improvements", "twitter.com/tesla")
bg.link_evidence_to_hypothesis("E001", "H002", strength=0.7, direction="supports")

# Propagate updates
bg.propagate_updates("H002")
```

### Example 2: Technology Predictions

```python
# Create tech hypotheses
bg.add_hypothesis("H004", "AGI will arrive before 2030", 0.35)
bg.add_hypothesis("H005", "Quantum computing will break RSA by 2028", 0.25)

# Track contradicting beliefs
bg.add_contradiction("H004", contradicts="H005", 
                    reason="Resource allocation conflict")
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
```

---

## 🔧 Troubleshooting

### Common Issues

**Neo4j won't start**
- Check if port 7687 is already in use
- Verify Java is installed
- Check Neo4j logs in Neo4j Desktop

**Connection refused**
- Ensure Neo4j is running
- Check credentials in .env
- Verify firewall settings

**Slow queries**
- Create indexes:
  ```cypher
  CREATE INDEX ON :Hypothesis(id);
  CREATE INDEX ON :Evidence(id);
  ```

**Memory issues**
- Increase Neo4j heap size in neo4j.conf
- Limit query results with LIMIT clause

---

## 📚 Advanced Topics

### Custom Bayesian Calculations

```python
from bkms.bayesian import CustomCalculator

class MyCalculator(CustomCalculator):
    def calculate_posterior(self, prior, evidence):
        # Your custom logic here
        pass

bg.set_calculator(MyCalculator())
```

### Bulk Import

```python
# Import from CSV
bg.import_hypotheses("hypotheses.csv")
bg.import_evidence("evidence.csv")

# Import from JSON
bg.import_graph("beliefs.json")
```

### Export & Reporting

```python
# Export to various formats
bg.export_graph("beliefs.json", format="json")
bg.export_graph("beliefs.gexf", format="gexf")  # For Gephi

# Generate reports
report = bg.generate_report(
    hypotheses=["H001", "H002"],
    period="last_30_days",
    include_evidence=True
)
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

*Version 1.0 | Last Updated: 2025-01-02*