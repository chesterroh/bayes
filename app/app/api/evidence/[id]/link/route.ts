import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';
import { HypothesisService } from '@/lib/db/hypothesis';
import { BayesianService } from '@/lib/db/bayesian';
import { getSession } from '@/lib/neo4j';

// POST /api/evidence/[id]/link - Link evidence to hypothesis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params;
    const body = await request.json();
    
    // Validate required fields
    if (!body.hypothesisId || body.p_e_given_h === undefined || body.p_e_given_not_h === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, p_e_given_h, p_e_given_not_h' },
        { status: 400 }
      );
    }
    
    // Validate probability ranges
    const peh = Number(body.p_e_given_h);
    const penh = Number(body.p_e_given_not_h);
    if (
      Number.isNaN(peh) || Number.isNaN(penh) ||
      peh < 0 || peh > 1 || penh < 0 || penh > 1
    ) {
      return NextResponse.json(
        { error: 'p_e_given_h and p_e_given_not_h must be numbers between 0 and 1' },
        { status: 400 }
      );
    }
    
    // Verified hypotheses are locked
    const hyp = await HypothesisService.getById(body.hypothesisId);
    if (!hyp) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }
    if (hyp.verified) {
      return NextResponse.json(
        { error: 'Hypothesis is verified and cannot be modified' },
        { status: 409 }
      );
    }

    // Prevent duplicate link
    const exists = await EvidenceService.linkExists(evidenceId, body.hypothesisId);
    if (exists) {
      return NextResponse.json(
        { error: 'AFFECTS link already exists for this evidence and hypothesis' },
        { status: 409 }
      );
    }

    // Backfill base_confidence if missing using current state before creating link
    try {
      const session = getSession();
      const EPS = 1e-6;
      try {
        const snap = await session.run(
          `MATCH (h:Hypothesis {id: $hId})
           OPTIONAL MATCH (e2:Evidence)-[r:AFFECTS]->(h)
           RETURN h.confidence as conf, collect({peh:r.p_e_given_h, penh:r.p_e_given_not_h}) as rels` ,
          { hId: body.hypothesisId }
        );
        if (snap.records.length > 0 && (hyp.base_confidence == null)) {
          const conf = snap.records[0].get('conf');
          const rels = (snap.records[0].get('rels') || []).map((x: any) => ({ peh: Number(x.peh), penh: Number(x.penh) }));
          const post = Math.min(1 - EPS, Math.max(EPS, Number(conf)));
          let postOdds = post / (1 - post);
          let denom = 1.0;
          for (const r of rels) {
            if (!Number.isFinite(r.peh) || !Number.isFinite(r.penh)) continue;
            denom *= Math.max(EPS, r.peh / Math.max(EPS, r.penh));
          }
          const baseOdds = Math.max(EPS, postOdds / Math.max(EPS, denom));
          const base = baseOdds / (1 + baseOdds);
          await HypothesisService.setBaseConfidence(body.hypothesisId, base);
        }
      } finally {
        await session.close();
      }
    } catch (e) {
      console.warn('Failed to backfill base_confidence before link POST:', e);
    }

    const linked = await EvidenceService.linkToHypothesis(
      evidenceId,
      body.hypothesisId,
      {
        p_e_given_h: peh,
        p_e_given_not_h: penh
      }
    );
    
    if (!linked) {
      return NextResponse.json(
        { error: 'Failed to link evidence to hypothesis' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Evidence linked to hypothesis successfully',
      evidenceId,
      hypothesisId: body.hypothesisId,
      relationship: {
        p_e_given_h: peh,
        p_e_given_not_h: penh
      }
    });
  } catch (error) {
    console.error('Error linking evidence:', error);
    return NextResponse.json(
      { error: 'Failed to link evidence to hypothesis' },
      { status: 500 }
    );
  }
}

// PUT /api/evidence/[id]/link - Edit likelihoods for an existing link
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params;
    const body = await request.json();
    if (!body.hypothesisId || body.p_e_given_h === undefined || body.p_e_given_not_h === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: hypothesisId, p_e_given_h, p_e_given_not_h' },
        { status: 400 }
      );
    }
    const peh = Number(body.p_e_given_h);
    const penh = Number(body.p_e_given_not_h);
    if (
      Number.isNaN(peh) || Number.isNaN(penh) ||
      peh < 0 || peh > 1 || penh < 0 || penh > 1
    ) {
      return NextResponse.json(
        { error: 'p_e_given_h and p_e_given_not_h must be numbers between 0 and 1' },
        { status: 422 }
      );
    }

    // Verified hypotheses are locked
    const hyp = await HypothesisService.getById(body.hypothesisId);
    if (!hyp) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }
    if (hyp.verified) {
      return NextResponse.json(
        { error: 'Hypothesis is verified and cannot be updated' },
        { status: 409 }
      );
    }

    const exists = await EvidenceService.linkExists(evidenceId, body.hypothesisId);
    if (!exists) {
      return NextResponse.json(
        { error: 'Link not found for given evidence and hypothesis' },
        { status: 404 }
      );
    }

    // If base_confidence missing, infer it from current state before modifying link
    try {
      const session = getSession();
      const EPS = 1e-6;
      try {
        const snap = await session.run(
          `MATCH (h:Hypothesis {id: $hId})
           OPTIONAL MATCH (e2:Evidence)-[r:AFFECTS]->(h)
           RETURN h.confidence as conf, collect({peh:r.p_e_given_h, penh:r.p_e_given_not_h}) as rels` ,
          { hId: body.hypothesisId }
        );
        if (snap.records.length > 0 && (hyp.base_confidence == null)) {
          const conf = snap.records[0].get('conf');
          const rels = (snap.records[0].get('rels') || []).map((x: any) => ({ peh: Number(x.peh), penh: Number(x.penh) }));
          const post = Math.min(1 - EPS, Math.max(EPS, Number(conf)));
          let postOdds = post / (1 - post);
          let denom = 1.0;
          for (const r of rels) {
            if (!Number.isFinite(r.peh) || !Number.isFinite(r.penh)) continue;
            denom *= Math.max(EPS, r.peh / Math.max(EPS, r.penh));
          }
          const baseOdds = Math.max(EPS, postOdds / Math.max(EPS, denom));
          const base = baseOdds / (1 + baseOdds);
          await HypothesisService.setBaseConfidence(body.hypothesisId, base);
        }
      } finally {
        await session.close();
      }
    } catch (e) {
      console.warn('Failed to backfill base_confidence before link PUT:', e);
    }

    const ok = await EvidenceService.updateLink(evidenceId, body.hypothesisId, { p_e_given_h: peh, p_e_given_not_h: penh });
    if (!ok) {
      return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
    }

    // Recompute hypothesis from base prior
    const recomputed = await BayesianService.recomputeFromBase(body.hypothesisId);
    return NextResponse.json({
      message: 'Link updated',
      evidenceId,
      hypothesisId: body.hypothesisId,
      relationship: { p_e_given_h: peh, p_e_given_not_h: penh },
      recomputed: { id: body.hypothesisId, updated: recomputed?.updatedConfidence ?? null }
    });
  } catch (error) {
    console.error('Error updating evidence link:', error);
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 });
  }
}

// DELETE /api/evidence/[id]/link - Remove link between evidence and a hypothesis
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: evidenceId } = await params;
    const body = await request.json().catch(() => ({} as any));
    const hypothesisId = body?.hypothesisId || new URL(request.url).searchParams.get('hypothesisId');
    if (!hypothesisId) {
      return NextResponse.json({ error: 'Missing hypothesisId' }, { status: 400 });
    }

    const hyp = await HypothesisService.getById(String(hypothesisId));
    if (!hyp) {
      return NextResponse.json({ error: 'Hypothesis not found' }, { status: 404 });
    }
    if (hyp.verified) {
      return NextResponse.json(
        { error: 'Hypothesis is verified and cannot be modified' },
        { status: 409 }
      );
    }

    const exists = await EvidenceService.linkExists(evidenceId, String(hypothesisId));
    if (!exists) {
      return NextResponse.json(
        { error: 'Link not found for given evidence and hypothesis' },
        { status: 404 }
      );
    }

    // If base_confidence missing, infer it from current state before removing link
    try {
      const session = getSession();
      const EPS = 1e-6;
      try {
        const snap = await session.run(
          `MATCH (h:Hypothesis {id: $hId})
           OPTIONAL MATCH (e2:Evidence)-[r:AFFECTS]->(h)
           RETURN h.confidence as conf, collect({peh:r.p_e_given_h, penh:r.p_e_given_not_h}) as rels` ,
          { hId: String(hypothesisId) }
        );
        if (snap.records.length > 0 && (hyp.base_confidence == null)) {
          const conf = snap.records[0].get('conf');
          const rels = (snap.records[0].get('rels') || []).map((x: any) => ({ peh: Number(x.peh), penh: Number(x.penh) }));
          const post = Math.min(1 - EPS, Math.max(EPS, Number(conf)));
          let postOdds = post / (1 - post);
          let denom = 1.0;
          for (const r of rels) {
            if (!Number.isFinite(r.peh) || !Number.isFinite(r.penh)) continue;
            denom *= Math.max(EPS, r.peh / Math.max(EPS, r.penh));
          }
          const baseOdds = Math.max(EPS, postOdds / Math.max(EPS, denom));
          const base = baseOdds / (1 + baseOdds);
          await HypothesisService.setBaseConfidence(String(hypothesisId), base);
        }
      } finally {
        await session.close();
      }
    } catch (e) {
      console.warn('Failed to backfill base_confidence before link DELETE:', e);
    }

    const deleted = await EvidenceService.deleteLink(evidenceId, String(hypothesisId));
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
    }

    const recomputed = await BayesianService.recomputeFromBase(String(hypothesisId));
    return NextResponse.json({
      message: 'Link deleted',
      evidenceId,
      hypothesisId: String(hypothesisId),
      recomputed: { id: String(hypothesisId), updated: recomputed?.updatedConfidence ?? null }
    });
  } catch (error) {
    console.error('Error deleting evidence link:', error);
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 });
  }
}
