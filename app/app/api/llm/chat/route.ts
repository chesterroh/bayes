import { NextRequest, NextResponse } from 'next/server';

type ChatMessage = { role: 'user' | 'assistant'; content: string };
type ChatRequest = {
  hypothesis: { id: string; statement: string; prior: number };
  evidence: { content: string };
  messages: ChatMessage[]; // chronological
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not configured on the server' },
      { status: 500 }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.hypothesis?.statement || typeof body?.hypothesis?.prior !== 'number' || !Array.isArray(body?.messages)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
  const endpointFor = (modelName: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`;

  const system = [
    'You are BKMS assistant. Be concise and focused on Bayesian reasoning.',
    'Context is provided with hypothesis (and prior) and the current evidence. Avoid hallucinations.',
    'If asked to suggest likelihoods, explain briefly. Otherwise address the user question directly.',
  ].join('\n');

  const context = [
    `Hypothesis ${body.hypothesis.id} (prior ${Math.round(body.hypothesis.prior * 100)}%): ${body.hypothesis.statement}`,
    body.evidence?.content ? `Evidence: ${body.evidence.content}` : undefined,
  ]
    .filter(Boolean)
    .join('\n');

  // Build contents from history messages; prepend a context primer
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  contents.push({ role: 'user', parts: [{ text: `Context for this conversation:\n${context}` }] });

  for (const m of body.messages) {
    const role = m.role === 'assistant' ? 'model' : 'user';
    contents.push({ role, parts: [{ text: m.content }] });
  }

  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.5 },
  } as any;

  try {
    const modelsToTry = [preferredModel, 'gemini-1.5-pro'];
    let data: any = null;
    let usedModel = preferredModel;
    for (const modelName of modelsToTry) {
      usedModel = modelName;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
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
    }
    if (!data) {
      return NextResponse.json({ error: 'Gemini request failed for all models tried' }, { status: 502 });
    }
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    }
    return NextResponse.json({ reply: text, model: usedModel });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Gemini request timed out' : 'Unexpected error' }, { status: 500 });
  }
}
