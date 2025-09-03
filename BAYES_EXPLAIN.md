# 🧮 Bayesian Logic in BKMS - Complete Explanation

## Table of Contents
1. [Core Philosophy](#core-philosophy)
2. [The Mathematics](#the-mathematics)
3. [Implementation in Code](#implementation-in-code)
4. [User Interface Mapping](#user-interface-mapping)
5. [Real-World Examples](#real-world-examples)
6. [Verification vs Updates](#verification-vs-updates)
7. [Edge Cases and Limitations](#edge-cases-and-limitations)
8. [FAQs](#faqs)

---

## Core Philosophy

### The Fundamental Principle
> "Today's posterior becomes tomorrow's prior"

This system implements **Bayesian epistemology** - the idea that beliefs should be updated rationally based on evidence. Each piece of evidence shifts our confidence, and that new confidence becomes the starting point for the next update.

### Why Bayesian?
- **Rational**: Mathematically optimal way to update beliefs
- **Cumulative**: Evidence accumulates properly over time
- **Reversible**: Can handle both supporting and contradicting evidence
- **Calibrated**: Tracks prediction accuracy over time

---

## The Mathematics

### 1. Classic Bayes' Theorem

The original Bayes' Theorem states:

```
P(H|E) = P(E|H) × P(H) / P(E)
```

Where:
- `P(H|E)` = Probability of hypothesis given evidence (posterior)
- `P(E|H)` = Probability of evidence given hypothesis (likelihood)
- `P(H)` = Prior probability of hypothesis
- `P(E)` = Total probability of evidence

### 2. Our Simplified Form

We reformulate this as:

```
Posterior = Signal / (Signal + Noise)
```

Where:
- `Signal = P(E|H) × P(H)` = Evidence supporting the hypothesis
- `Noise = P(E|~H) × P(~H)` = Evidence that could exist anyway

This is mathematically equivalent but more intuitive!

### 3. Mathematical Derivation

```
P(H|E) = P(E|H) × P(H) / P(E)

P(E) = P(E|H) × P(H) + P(E|~H) × P(~H)  [Total probability]

Therefore:
P(H|E) = P(E|H) × P(H) / [P(E|H) × P(H) + P(E|~H) × P(~H)]

Let Signal = P(E|H) × P(H)
Let Noise = P(E|~H) × P(~H)

P(H|E) = Signal / (Signal + Noise)
```

---

## Implementation in Code

### 1. Core Calculation Function

```typescript
// From app/lib/db/bayesian.ts
static calculatePosterior(
  prior: number,           // Current belief (0.0 to 1.0)
  likelihood: number,      // P(E|H) - how likely evidence if true
  altLikelihood: number    // P(E|~H) - how likely evidence if false
): number {
  const signal = likelihood * prior;
  const noise = altLikelihood * (1 - prior);
  
  if (signal + noise === 0) {
    return prior; // No update if no information
  }
  
  return signal / (signal + noise);
}
```

### 2. Direction and Strength Translation

When users input evidence, they provide:
- **Strength**: 0-100% (how diagnostic is this evidence?)
- **Direction**: "supports" or "contradicts"

This translates to likelihoods:

```typescript
if (direction === 'supports') {
  likelihood = strength;           // P(E|H)
  altLikelihood = 1 - strength;   // P(E|~H)
} else { // contradicts
  likelihood = 1 - strength;       // P(E|H)
  altLikelihood = strength;       // P(E|~H)
}
```

### 3. Complete Update Process

```typescript
static async updateHypothesis(
  hypothesisId: string,
  evidenceId: string
): Promise<{ oldConfidence: number; newConfidence: number }> {
  // 1. Get current confidence (prior)
  const prior = hypothesis.confidence;
  
  // 2. Get evidence relationship
  const strength = relationship.strength;
  const direction = relationship.direction;
  
  // 3. Calculate likelihoods
  const [likelihood, altLikelihood] = 
    direction === 'supports' 
      ? [strength, 1 - strength]
      : [1 - strength, strength];
  
  // 4. Apply Bayes' theorem
  const posterior = calculatePosterior(prior, likelihood, altLikelihood);
  
  // 5. Update database
  await updateConfidence(hypothesisId, posterior);
  
  return { oldConfidence: prior, newConfidence: posterior };
}
```

---

## User Interface Mapping

### What Users See vs What Happens

| User Input | Internal Meaning | Mathematical Impact |
|------------|------------------|-------------------|
| **Strength: 80%** | Evidence is 80% diagnostic | Strong update |
| **Strength: 50%** | Evidence is non-informative | No update |
| **Strength: 20%** | Evidence is weakly diagnostic | Small update |
| **Direction: Supports** | Evidence more likely if H true | Increases confidence |
| **Direction: Contradicts** | Evidence more likely if H false | Decreases confidence |

### Interpreting Strength Values

The **strength** parameter answers the question:
> "How much more likely is this evidence if my hypothesis is TRUE vs FALSE?"

#### For Supporting Evidence:
- **90% strength** = "I'd see this evidence 90% of the time if TRUE, only 10% if FALSE"
- **70% strength** = "I'd see this evidence 70% of the time if TRUE, 30% if FALSE"
- **50% strength** = "This evidence tells me nothing" (equally likely either way)

#### For Contradicting Evidence:
- **90% strength** = "I'd see this evidence only 10% of the time if TRUE, 90% if FALSE"
- **70% strength** = "I'd see this evidence 30% of the time if TRUE, 70% if FALSE"
- **50% strength** = "This evidence tells me nothing" (equally likely either way)

---

## Real-World Examples

### Example 1: Supporting Evidence

**Scenario**: 
- Hypothesis: "AI will transform software development by 2025"
- Current confidence: 60%
- Evidence: "GitHub Copilot reaches 1 million users"
- User inputs: Strength = 80%, Direction = Supports

**Calculation**:
```
Prior = 0.60

Since direction = "supports" and strength = 0.80:
  likelihood = 0.80      (P(E|H) - 80% chance if hypothesis true)
  altLikelihood = 0.20   (P(E|~H) - 20% chance if hypothesis false)

Signal = 0.80 × 0.60 = 0.48
Noise = 0.20 × 0.40 = 0.08

Posterior = 0.48 / (0.48 + 0.08) = 0.857

Result: Confidence increases to 85.7%
```

**Interpretation**: The evidence is 4x more likely if the hypothesis is true (80% vs 20%), so it substantially increases our confidence.

### Example 2: Contradicting Evidence

**Scenario**:
- Hypothesis: "Tesla will achieve full self-driving by 2024"
- Current confidence: 45%
- Evidence: "NHTSA opens investigation into Tesla Autopilot crashes"
- User inputs: Strength = 70%, Direction = Contradicts

**Calculation**:
```
Prior = 0.45

Since direction = "contradicts" and strength = 0.70:
  likelihood = 0.30      (P(E|H) - 30% chance if hypothesis true)
  altLikelihood = 0.70   (P(E|~H) - 70% chance if hypothesis false)

Signal = 0.30 × 0.45 = 0.135
Noise = 0.70 × 0.55 = 0.385

Posterior = 0.135 / (0.135 + 0.385) = 0.26

Result: Confidence decreases to 26%
```

**Interpretation**: The evidence is 2.3x more likely if the hypothesis is false (70% vs 30%), so it significantly decreases our confidence.

### Example 3: Weak Evidence

**Scenario**:
- Hypothesis: "Quantum computing will break encryption by 2030"
- Current confidence: 35%
- Evidence: "IBM announces 433-qubit processor"
- User inputs: Strength = 55%, Direction = Supports

**Calculation**:
```
Prior = 0.35

Since direction = "supports" and strength = 0.55:
  likelihood = 0.55
  altLikelihood = 0.45

Signal = 0.55 × 0.35 = 0.1925
Noise = 0.45 × 0.65 = 0.2925

Posterior = 0.1925 / (0.1925 + 0.2925) = 0.397

Result: Confidence increases slightly to 39.7%
```

**Interpretation**: The evidence is only slightly more likely if true (55% vs 45%), so it provides a small update.

---

## Verification vs Updates

### Two Different Epistemological Operations

#### 1. Bayesian Updates (Probabilistic)
- **Purpose**: Adjust confidence based on evidence
- **Range**: Never quite reaches 0% or 100%
- **Reversible**: New evidence can change confidence again
- **Use case**: Ongoing beliefs, predictions, theories

```typescript
// Creates AFFECTS relationship
Evidence --[AFFECTS {strength: 0.8, direction: 'supports'}]--> Hypothesis
// Confidence: 60% → 85.7%
```

#### 2. Verification (Definitive)
- **Purpose**: Declare final truth value
- **Result**: Exactly 0% (refuted) or 100% (confirmed)
- **Irreversible**: No future updates possible
- **Use case**: Past predictions, proven facts

```typescript
// Creates VERIFIED_BY relationship
Evidence --[VERIFIED_BY {type: 'confirmed'}]--> Hypothesis
// Confidence: → 100% (locked)
```

### Why Can't Bayesian Updates Reach 100%?

Mathematically, to reach 100% confidence through Bayesian updates:

```
For posterior = 1.0:
Signal / (Signal + Noise) = 1.0
Signal = Signal + Noise
Noise = 0
P(E|~H) × P(~H) = 0
```

This requires either:
- `P(E|~H) = 0` (impossible evidence if false), OR
- `P(~H) = 0` (already 100% confident)

This reflects the philosophical principle: **empirical evidence cannot provide logical certainty**.

---

## Edge Cases and Limitations

### 1. Starting at Extremes

If confidence is already 0% or 100%, Bayesian updates have no effect:

```
Prior = 1.0
Signal = likelihood × 1.0 = likelihood
Noise = altLikelihood × 0.0 = 0
Posterior = likelihood / likelihood = 1.0 (unchanged)
```

**Solution**: Don't start with absolute certainty unless verified.

### 2. Equal Likelihoods

If strength = 50%, no update occurs:

```
likelihood = 0.5
altLikelihood = 0.5
Signal = 0.5 × prior
Noise = 0.5 × (1 - prior)
Posterior = prior (unchanged)
```

**Interpretation**: The evidence is equally likely regardless of truth.

### 3. Multiple Updates

Evidence should only be counted once:

```
Wrong: Same evidence applied twice
H: 60% → E1 → 85% → E1 → 96% (double counting!)

Right: Each evidence applied once
H: 60% → E1 → 85% → E2 → 92%
```

**Implementation**: The system tracks Evidence-Hypothesis links to prevent duplicates.

### 4. Correlated Evidence

The system assumes evidence is independent:

```
E1: "Tech blog says X"
E2: "Another blog quotes the first blog saying X"
```

These aren't independent! The second provides minimal additional information.

**Best Practice**: Only add genuinely independent evidence sources.

---

## FAQs

### Q1: Why not just use percentages directly?

**A**: Simply averaging or adding percentages violates probability theory. If two pieces of 60% evidence were added, you'd get 120% - impossible! Bayes' theorem ensures updates remain valid probabilities.

### Q2: What if I don't know the exact strength?

**A**: Use these guidelines:
- **90-100%**: Smoking gun evidence
- **70-80%**: Strong indication
- **60-70%**: Moderate indication
- **50-60%**: Weak indication
- **50%**: No information

### Q3: Can I undo an update?

**A**: For Bayesian updates, you can delete the evidence link. For verification, it's permanent - this reflects reality where proven facts can't be "unproven."

### Q4: Why use Signal/Noise instead of standard notation?

**A**: The Signal/Noise formulation is more intuitive:
- **Signal**: Information supporting your hypothesis
- **Noise**: Information that exists anyway
- The ratio determines your belief

### Q5: How do I handle time-sensitive predictions?

**A**: 
1. Use Bayesian updates while gathering evidence
2. When deadline arrives, use verification
3. Example: "X will happen by 2025" → verify on Dec 31, 2025

### Q6: What about degrees of confidence in evidence?

**A**: The strength parameter captures this. Uncertain evidence should have strength closer to 50% (less diagnostic).

---

## Summary

The BKMS Bayesian system provides a **mathematically rigorous** yet **intuitive** way to track belief evolution:

1. **Evidence strength** = How diagnostic is this evidence?
2. **Direction** = Does it support or contradict?
3. **Bayesian update** = Rational confidence adjustment
4. **Verification** = Final truth when available

This creates a complete epistemological system for rational belief management.

---

*For implementation details, see [CLAUDE.md](CLAUDE.md)*  
*For usage instructions, see [README.md](README.md)*

*Last Updated: January 2025*