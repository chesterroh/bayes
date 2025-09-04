import { NextRequest, NextResponse } from 'next/server';

// Helper: basic HTML entity decode for common entities
function decodeHtmlEntities(input: string): string {
  return input
    .replaceAll(/&amp;/g, '&')
    .replaceAll(/&lt;/g, '<')
    .replaceAll(/&gt;/g, '>')
    .replaceAll(/&quot;/g, '"')
    .replaceAll(/&#39;/g, "'")
    .replaceAll(/&#x27;/g, "'")
    .replaceAll(/&nbsp;/g, ' ');
}

// Helper: strip tags but preserve anchor inner text and <br> as newlines
function extractTextFromOEmbedHtml(html: string): string {
  // Convert <br> variants to newlines
  let text = html.replace(/<br\s*\/?>(\r?\n)?/gi, '\n');
  // Replace anchor tags with their inner text
  text = text.replace(/<a [^>]*>(.*?)<\/a>/gi, '$1');
  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode basic entities
  text = decodeHtmlEntities(text);
  // Collapse excessive whitespace
  text = text.replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return text;
}

function normalizeXUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    if (!hostname.endsWith('x.com') && !hostname.endsWith('twitter.com')) {
      return null;
    }
    // Ensure it's a status URL (contains /status/)
    if (!/\/status\//.test(u.pathname)) {
      return null;
    }
    // Convert to twitter.com for oEmbed compatibility
    u.hostname = 'twitter.com';
    return u.toString();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    const normalized = normalizeXUrl(rawUrl);
    if (!normalized) {
      return NextResponse.json({ error: 'Not a valid X/Twitter status URL' }, { status: 400 });
    }

    // Use Twitter oEmbed to retrieve embeddable HTML containing the text (no media/thread hiding)
    const oembedUrl = new URL('https://publish.twitter.com/oembed');
    oembedUrl.searchParams.set('url', normalized);
    oembedUrl.searchParams.set('omit_script', '1');
    // Deliberately do NOT set hide_thread/hide_media to improve text coverage

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let oembedRes: Response;
    try {
      oembedRes = await fetch(oembedUrl.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        // Next.js edge/runtime may require cache settings; keep default here
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!oembedRes.ok) {
      return NextResponse.json({ error: `Failed to fetch oEmbed (${oembedRes.status})` }, { status: 502 });
    }

    const data = await oembedRes.json();
    const html: string | undefined = data?.html;
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'oEmbed response missing html' }, { status: 502 });
    }

    let text = extractTextFromOEmbedHtml(html);
    if (!text) {
      return NextResponse.json({ error: 'Failed to extract text from oEmbed html' }, { status: 502 });
    }

    // Fallback: try syndication endpoint for fuller text if available
    const idMatch = normalized.match(/\/status\/(\d+)/);
    if (idMatch) {
      const tweetId = idMatch[1];
      try {
        const synController = new AbortController();
        const synTimeout = setTimeout(() => synController.abort(), 6000);
        // First try with id parameter
        let synRes = await fetch(`https://cdn.syndication.twitter.com/widgets/tweet?id=${tweetId}`, {
          headers: { Accept: 'application/json' },
          signal: synController.signal,
        });
        if (!synRes.ok) {
          // Try url-based fallback used by some deployments
          synRes = await fetch(`https://cdn.syndication.twitter.com/widgets/tweet?url=${encodeURIComponent(normalized)}`, {
            headers: { Accept: 'application/json' },
            signal: synController.signal,
          });
        }
        clearTimeout(synTimeout);
        if (synRes.ok) {
          const synData = await synRes.json().catch(() => null as any);
          const synText: string | undefined = synData?.text || synData?.full_text || synData?.payload?.text;
          if (synText && synText.trim().length > text.length) {
            text = synText.trim();
          }
        }
      } catch {
        // ignore fallback errors, keep oEmbed text
      }
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    const aborted = err?.name === 'AbortError';
    return NextResponse.json({ error: aborted ? 'Upstream request timed out' : 'Unexpected error' }, { status: 500 });
  }
}
