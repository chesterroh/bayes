import { NextRequest, NextResponse } from 'next/server';
import { EvidenceService } from '@/lib/db/evidence';
import { getSession } from '@/lib/neo4j';
import { BayesianService } from '@/lib/db/bayesian';

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
    // Find affected hypotheses before deletion
    const session = getSession();
    let affected: string[] = [];
    try {
      const result = await session.run(
        `MATCH (e:Evidence {id: $id})-[:AFFECTS]->(h:Hypothesis)
         RETURN DISTINCT h.id as id`,
        { id }
      );
      affected = result.records.map(r => r.get('id'));
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
    // Recompute each affected hypothesis from base prior
    const results: Array<{ id: string; updated?: number | null }> = [];
    for (const hId of affected) {
      try {
        const r = await BayesianService.recomputeFromBase(hId);
        results.push({ id: hId, updated: r?.updatedConfidence ?? null });
      } catch (e) {
        console.error('Failed to recompute hypothesis', hId, e);
        results.push({ id: hId, updated: null });
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
