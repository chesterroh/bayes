import { NextRequest, NextResponse } from 'next/server';

type SuggestRequest = {
  hypothesis: {
    id: string;
    statement: string;
    prior: number; // 0..1
  };
  evidence: {
    content: string;
  };
};

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server' },
      { status: 500 }
    );
  }

  let body: SuggestRequest;
  try {
    body = (await req.json()) as SuggestRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.hypothesis?.statement || typeof body?.hypothesis?.prior !== 'number' || !body?.evidence?.content) {
    return NextResponse.json(
      { error: 'Missing hypothesis.statement, hypothesis.prior, or evidence.content' },
      { status: 400 }
    );
  }

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  const endpointFor = (modelName: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

  const system = [
    'You are an assistant helping with Bayesian likelihood assessment.',
    'Given a hypothesis and a piece of evidence, suggest values for:',
    '- P(E|H): probability of observing the evidence if the hypothesis is true',
    '- P(E|~H): probability of observing the evidence if the hypothesis is false',
    'Return ONLY a strict JSON object with keys: p_e_given_h, p_e_given_not_h, rationale.',
    'The probabilities MUST be numbers in [0,1]. Keep rationale concise (<= 80 words).',
  ].join('\n');

  const userPrompt = [
    `Hypothesis (prior ${Math.round(body.hypothesis.prior * 100)}%): ${body.hypothesis.statement}`,
    `Evidence: ${body.evidence.content}`,
    '',
    'Output format:',
    '{"p_e_given_h": 0.80, "p_e_given_not_h": 0.20, "rationale": "..."}',
  ].join('\n');

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
    },
  } as any;

  try {
    // Try preferred model first, then fall back to a stable one
    const modelsToTry = [preferredModel, 'gemini-1.5-pro'];
    let data: any = null;
    let usedModel = preferredModel;
    for (const modelName of modelsToTry) {
      usedModel = modelName;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${endpointFor(modelName)}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        data = await res.json();
        break;
      }
      // If model not found or other error, continue to next
    }
    if (!data) {
      return NextResponse.json({ error: 'Gemini request failed for all models tried' }, { status: 502 });
    }
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    }

    // Try parse JSON directly; if wrapped in code fences, strip them
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Fallback: best-effort regex to extract numbers
      const peh = Number((/p_e_given_h\"?\s*[:=]\s*([0-9.]+)/i.exec(cleaned)?.[1] ?? ''));
      const penh = Number((/p_e_given_not_h\"?\s*[:=]\s*([0-9.]+)/i.exec(cleaned)?.[1] ?? ''));
      parsed = { p_e_given_h: peh, p_e_given_not_h: penh, rationale: cleaned.slice(0, 200) };
    }

    const p_e_given_h = clamp01(Number(parsed?.p_e_given_h));
    const p_e_given_not_h = clamp01(Number(parsed?.p_e_given_not_h));
    const rationale = String(parsed?.rationale || '').slice(0, 800);

    return NextResponse.json({
      model: usedModel,
      p_e_given_h,
      p_e_given_not_h,
      rationale,
    });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Gemini request timed out' : 'Unexpected error' }, { status: 500 });
  }
}
