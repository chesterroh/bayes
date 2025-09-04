import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';
import { getSession } from '@/lib/neo4j';
import { BayesianService } from '@/lib/db/bayesian';
import { HypothesisService } from '@/lib/db/hypothesis';

// GET /api/evidence/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const evidence = await EvidenceService.get(id);
    if (!evidence) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Failed to get evidence:', error);
    return NextResponse.json(
      { error: 'Failed to get evidence' },
      { status: 500 }
    );
  }
}

// PUT /api/evidence/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { content, source_url } = body;

    if (!content || !source_url) {
      return NextResponse.json(
        { error: 'Content and source URL are required' },
        { status: 400 }
      );
    }

    const updated = await EvidenceService.update(id, {
      content,
      source_url
    });

    if (!updated) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update evidence:', error);
    return NextResponse.json(
      { error: 'Failed to update evidence' },
      { status: 500 }
    );
  }
}

// DELETE /api/evidence/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Find affected hypotheses and snapshot their confidence and current links before deletion
    const session = getSession();
    type Snapshot = { id: string; confidence: number; rels: Array<{ peh: number; penh: number }> };
    const snaps: Snapshot[] = [];
    try {
      const result = await session.run(
        `MATCH (e:Evidence {id: $id})-[:AFFECTS]->(h:Hypothesis)
         OPTIONAL MATCH (e2:Evidence)-[r:AFFECTS]->(h)
         RETURN DISTINCT h.id as id, h.confidence as conf, collect({peh:r.p_e_given_h, penh:r.p_e_given_not_h}) as rels`,
        { id }
      );
      for (const rec of result.records) {
        snaps.push({
          id: rec.get('id'),
          confidence: rec.get('conf'),
          rels: (rec.get('rels') || []).map((x: any) => ({ peh: Number(x.peh), penh: Number(x.penh) })),
        });
      }
    } finally {
      await session.close();
    }

    const success = await EvidenceService.delete(id);
    if (!success) {
      return NextResponse.json(
        { error: 'Evidence not found' },
        { status: 404 }
      );
    }
    // If base_confidence is missing, infer it from snapshot before deletion: baseOdds = postOdds / Π LR(all)
    const EPS = 1e-6;
    const results: Array<{ id: string; updated?: number | null }> = [];
    for (const snap of snaps) {
      // Best-effort backfill base_confidence if missing
      const hyp = await HypothesisService.getById(snap.id);
      if (hyp && !hyp.verified && (hyp.base_confidence == null)) {
        const post = Math.min(1 - EPS, Math.max(EPS, snap.confidence));
        let postOdds = post / (1 - post);
        let denom = 1.0;
        for (const r of snap.rels || []) {
          if (!Number.isFinite(r.peh) || !Number.isFinite(r.penh)) continue;
          const lr = Math.max(EPS, r.peh / Math.max(EPS, r.penh));
          denom *= lr;
        }
        const baseOdds = Math.max(EPS, postOdds / Math.max(EPS, denom));
        const base = baseOdds / (1 + baseOdds);
        await HypothesisService.setBaseConfidence(snap.id, base);
      }

      // Recompute each affected hypothesis from base prior
      try {
        const r = await BayesianService.recomputeFromBase(snap.id);
        results.push({ id: snap.id, updated: r?.updatedConfidence ?? null });
      } catch (e) {
        console.error('Failed to recompute hypothesis', snap.id, e);
        results.push({ id: snap.id, updated: null });
      }
    }
    return NextResponse.json({ success: true, recomputed: results });
  } catch (error) {
    console.error('Failed to delete evidence:', error);
    return NextResponse.json(
      { error: 'Failed to delete evidence' },
      { status: 500 }
    );
  }
}
