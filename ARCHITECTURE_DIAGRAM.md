# BKMS Architecture Diagrams

This document summarizes the runtime flow and the key entry points of the BKMS Next.js application.

## Overview

```
[ UI (React) ]
   | fetch()
   v
[ Next.js API Routes ]
   | call service
   v
[ Services (TypeScript) ]
   | Cypher via driver
   v
[ Neo4j Graph DB ]

[ LLM (Gemini 2.5 Pro) ]  <-- API (server) calls only
```

Key ideas
- Client calls API routes; API routes call service layer; services execute Cypher via the Neo4j driver.
- LLM requests are server-only (never from the client) and use Gemini 2.5 Pro.

## Flow 1: Add Hypothesis + AI Review

```
AddHypothesisForm
  |--(GET)  /api/next-id?type=hypothesis
  |--(POST) /api/llm/hypothesis/review   (manual trigger)
  |       -> Gemini 2.5 Pro
  |       <- { valid_bayesian, issues, suggested_rewrite, evidence_ideas, ... }
  |--(POST) /api/hypotheses
          -> HypothesisService.create
          -> Neo4j: (:Hypothesis { id, statement, confidence, base_confidence, ... })
```

Files
- UI: `app/components/AddHypothesisForm.tsx`
- API: `app/app/api/llm/hypothesis/review/route.ts`, `app/app/api/hypotheses/route.ts`
- Services: `app/lib/db/hypothesis.ts`

## Flow 2: Add Evidence → Link → Update → (Delete → Recompute)

```
AddEvidenceForm
  |--(POST) /api/evidence
  |      -> EvidenceService.create
  |      -> Neo4j: (:Evidence { id, content, ... })
  |--(POST) /api/evidence/{id}/link
  |      -> EvidenceService.linkToHypothesis
  |      -> Neo4j: (e)-[:AFFECTS { p_e_given_h, p_e_given_not_h }]->(h)
  |--(POST optional) /api/update
         -> BayesianService.updateHypothesis
         -> HypothesisService.updateConfidence
         -> Neo4j: set h.confidence

Delete evidence:
  (DELETE) /api/evidence/{id}
    -> snapshot links + backfill base if missing
    -> DETACH DELETE evidence
    -> BayesianService.recomputeFromBase(h) for affected h
    -> Neo4j: updated h.confidence; return { recomputed: [...] }
```

Files
- UI: `app/components/AddEvidenceForm.tsx`
- API: `app/app/api/evidence/*`, `app/app/api/update/route.ts`
- Services: `app/lib/db/evidence.ts`, `app/lib/db/bayesian.ts`, `app/lib/db/hypothesis.ts`

## Flow 3: Verify / Refute Hypothesis

```
UI (⋮ Verify/Refute)
  |--(POST) /api/verify
        -> HypothesisService.verify
        -> Neo4j: (e)-[:VERIFIED_BY {type, verified_date, pre_verification_confidence}]->(h)
                 h.verified set, h.verification_type set, h.confidence locked
```

Files
- API: `app/app/api/verify/route.ts`
- Services: `app/lib/db/hypothesis.ts`

## Flow 4: Accuracy Analytics

```
/analytics/accuracy page
  |--(GET) /api/analytics/accuracy
        -> Neo4j: verified hypotheses + VERIFIED_BY
        <- { summary, bins, items }  // Brier mean, bin calibration, table rows
```

Files
- UI: `app/app/analytics/accuracy/page.tsx`
- API: `app/app/api/analytics/accuracy/route.ts`

---

Maintenance
- If the architecture or key flows change, update this file alongside the corresponding sections in `CLAUDE.md`.

