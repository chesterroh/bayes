import { NextRequest, NextResponse } from 'next/server';

type ReviewRequest = {
  statement: string;
};

type ReviewResponse = {
  valid_bayesian: boolean;
  atomicity_score: number; // 0..1
  issues: string[];
  falsifiable: boolean;
  measurable: boolean;
  time_bound: boolean;
  suggested_rewrite: string;
  operationalization?: {
    measurable_event?: string;
    threshold?: string;
    timeframe?: string;
    scope?: string;
  };
  evidence_ideas?: string[];
  suggested_tags?: string[];
  note?: string;
  model?: string;
};

function clamp01(n: any, fallback = 0): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return fallback;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function truncate(s: any, max = 200): string {
  const t = String(s || '').trim();
  return t.length > max ? t.slice(0, max) : t;
}

const ALLOWED_ISSUES = new Set([
  'compound',
  'vague_terms',
  'unbounded_timeframe',
  'non_falsifiable',
  'ambiguous_subject',
  'overly_broad_scope',
  'unclear_metric',
  'tautology',
]);

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server' },
      { status: 500 }
    );
  }

  let body: ReviewRequest;
  try {
    body = (await req.json()) as ReviewRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const statement = String(body?.statement || '').trim();
  if (!statement) {
    return NextResponse.json({ error: 'Missing statement' }, { status: 400 });
  }

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  const endpointFor = (modelName: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

  const system = [
    'You are BKMS assistant evaluating if a single hypothesis is suitable for Bayesian tracking.',
    'Criteria: atomic (single claim), falsifiable, measurable, time-bound, and framed to be upheld or refuted by concrete evidence.',
    'Return ONLY strict JSON with the exact keys as specified. No prose or extra text.',
  ].join('\n');

  const schema = `{
    "valid_bayesian": boolean,
    "atomicity_score": number (0..1),
    "issues": array of strings from [compound, vague_terms, unbounded_timeframe, non_falsifiable, ambiguous_subject, overly_broad_scope, unclear_metric, tautology],
    "falsifiable": boolean,
    "measurable": boolean,
    "time_bound": boolean,
    "suggested_rewrite": string (<= 160 chars, atomic and testable),
    "operationalization": {
      "measurable_event": string (<= 120 chars),
      "threshold": string (<= 80 chars),
      "timeframe": string (<= 80 chars),
      "scope": string (<= 80 chars)
    },
    "evidence_ideas": array of 3 to 6 short strings (<= 80 chars each),
    "suggested_tags": array of up to 6 short strings,
    "note": string (<= 120 words)
  }`;

  const userPrompt = [
    'Evaluate the following hypothesis for Bayesian suitability and return the JSON object only.',
    `Hypothesis: ${statement}`,
    'Output schema:',
    schema,
  ].join('\n');

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] },
    ],
    generationConfig: { temperature: 0.2 },
  } as any;

  try {
    const usedModel = preferredModel;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    let data: any = null;
    try {
      const res = await fetch(`${endpointFor(usedModel)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: 'Gemini request failed', status: res.status, detail: await res.text().catch(() => '') },
          { status: 502 }
        );
      }
      data = await res.json();
    } finally {
      clearTimeout(timeout);
    }

    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    }

    const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Soft failure: return minimal hints
      const fallback: ReviewResponse = {
        valid_bayesian: false,
        atomicity_score: 0.5,
        issues: ['vague_terms'],
        falsifiable: false,
        measurable: false,
        time_bound: false,
        suggested_rewrite: statement.slice(0, 140),
        evidence_ideas: [],
        suggested_tags: [],
        note: 'Model response could not be parsed as JSON.'
      };
      return NextResponse.json(fallback, { status: 200 });
    }

    // Coerce/validate fields
    const issuesInput: any[] = Array.isArray(parsed?.issues) ? parsed.issues : [];
    const issues = issuesInput
      .map((x) => String(x || '').trim())
      .filter((s) => ALLOWED_ISSUES.has(s as any));

    const evidenceIdeas = (Array.isArray(parsed?.evidence_ideas) ? parsed.evidence_ideas : [])
      .map((s: any) => truncate(s, 80))
      .filter((s: string) => !!s);

    const suggestedTags = (Array.isArray(parsed?.suggested_tags) ? parsed.suggested_tags : [])
      .map((s: any) => truncate(s, 30))
      .slice(0, 6);

    const operationalization = parsed?.operationalization || {};

    const response: ReviewResponse = {
      valid_bayesian: Boolean(parsed?.valid_bayesian),
      atomicity_score: clamp01(parsed?.atomicity_score, 0.5),
      issues,
      falsifiable: Boolean(parsed?.falsifiable),
      measurable: Boolean(parsed?.measurable),
      time_bound: Boolean(parsed?.time_bound),
      suggested_rewrite: truncate(parsed?.suggested_rewrite, 160),
      operationalization: {
        measurable_event: truncate(operationalization?.measurable_event, 120),
        threshold: truncate(operationalization?.threshold, 80),
        timeframe: truncate(operationalization?.timeframe, 80),
        scope: truncate(operationalization?.scope, 80),
      },
      evidence_ideas: evidenceIdeas.slice(0, 6),
      suggested_tags: suggestedTags,
      note: truncate(parsed?.note, 1000),
      model: usedModel,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Gemini request timed out' : 'Unexpected error' }, { status: 500 });
  }
}
