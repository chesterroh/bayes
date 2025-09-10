import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j';

// GET /api/analytics/accuracy
// Returns summary metrics and itemized verified hypotheses with pre-verification confidence
export async function GET() {
  const session = getSession();
  try {
    // Fetch verified hypotheses and latest VERIFIED_BY relationship per hypothesis
    const result = await session.run(
      `MATCH (h:Hypothesis)
       WHERE h.verified IS NOT NULL
       OPTIONAL MATCH (h)<-[v:VERIFIED_BY]-(:Evidence)
       WITH h, v
       ORDER BY v.verified_date DESC
       WITH h, collect(v)[0] as v
       RETURN h, v
       ORDER BY h.verified DESC`
    );

    type Item = {
      id: string;
      statement: string;
      pre_confidence: number | null;
      verification_type: 'confirmed' | 'refuted' | null;
      verified: string | null;
      outcome: 0 | 1 | null;
      brier: number | null;
    };

    const items: Item[] = result.records.map((record) => {
      const h = record.get('h');
      const v = record.get('v');
      const verificationType: 'confirmed' | 'refuted' | null = h.properties.verification_type || null;
      const verified = h.properties.verified ? h.properties.verified.toString() : null;
      const preFromNode = h.properties.pre_verification_confidence;
      const preFromRel = v ? v.properties?.pre_verification_confidence : null;
      const pre = typeof preFromNode === 'number' ? preFromNode : (typeof preFromRel === 'number' ? preFromRel : null);
      const outcome: 0 | 1 | null = verificationType === 'confirmed' ? 1 : verificationType === 'refuted' ? 0 : null;
      const brier = pre != null && outcome != null ? Math.pow(pre - outcome, 2) : null;
      return {
        id: h.properties.id,
        statement: h.properties.statement,
        pre_confidence: pre ?? null,
        verification_type: verificationType,
        verified,
        outcome,
        brier,
      };
    });

    // Compute summary metrics
    const total = items.length;
    const confirmed = items.filter((i) => i.verification_type === 'confirmed').length;
    const refuted = items.filter((i) => i.verification_type === 'refuted').length;
    const withPre = items.filter((i) => i.pre_confidence != null && i.outcome != null);
    const avgPre = withPre.length
      ? withPre.reduce((acc, i) => acc + (i.pre_confidence as number), 0) / withPre.length
      : null;
    const brierMean = withPre.length
      ? withPre.reduce((acc, i) => acc + (i.brier as number), 0) / withPre.length
      : null;

    // Simple 10-bin calibration (0-0.1, ..., 0.9-1.0)
    const bins = Array.from({ length: 10 }, (_, k) => ({
      bin: `${k * 10}-${(k + 1) * 10}%`,
      count: 0,
      avgPred: null as number | null,
      accuracy: null as number | null,
    }));
    const byBin: Record<number, { preds: number[]; outcomes: number[] }> = {};
    for (const i of withPre) {
      const p = i.pre_confidence as number;
      let idx = Math.floor(p * 10);
      if (idx < 0) idx = 0;
      if (idx > 9) idx = 9;
      if (!byBin[idx]) byBin[idx] = { preds: [], outcomes: [] };
      byBin[idx].preds.push(p);
      byBin[idx].outcomes.push(i.outcome as number);
    }
    Object.entries(byBin).forEach(([k, v]) => {
      const idx = Number(k);
      const count = v.preds.length;
      const avgPred = v.preds.reduce((a, b) => a + b, 0) / count;
      const accuracy = v.outcomes.reduce((a, b) => a + b, 0) / count;
      bins[idx].count = count;
      bins[idx].avgPred = avgPred;
      bins[idx].accuracy = accuracy;
    });

    return NextResponse.json({
      summary: {
        total,
        confirmed,
        refuted,
        withPreCount: withPre.length,
        avgPre,
        brierMean,
      },
      bins,
      items,
    });
  } catch (error) {
    console.error('Error computing accuracy analytics:', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  } finally {
    await session.close();
  }
}

