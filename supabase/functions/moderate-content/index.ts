import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a content moderation assistant for a social going-out app.
Analyse the text and determine if it violates community standards.

Flag content that contains:
- Hate speech or discrimination (race, gender, religion, sexuality, etc.)
- Harassment, threats, or bullying
- Explicit sexual content
- Graphic violence
- Spam or scam content
- Illegal activity promotion

Respond ONLY with valid JSON in this exact shape:
{
  "flagged": boolean,
  "reason": string | null,
  "score": number
}

"reason" should be a short phrase (e.g. "hate speech", "harassment") or null if not flagged.
"score" is your confidence 0.0–1.0 that the content violates guidelines.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ flagged: false, reason: null, score: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY secret not set');
      return new Response(
        JSON.stringify({ flagged: false, reason: null, score: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic error', res.status, await res.text());
      return new Response(
        JSON.stringify({ flagged: false, reason: null, score: 0 }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const json = await res.json();
    const raw = json.content?.[0]?.text ?? '{}';

    let result = { flagged: false, reason: null, score: 0 };
    try {
      result = JSON.parse(raw);
    } catch {
      console.error('Failed to parse Claude response:', raw);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('moderate-content error:', err);
    // Fail open — don't block users on server errors
    return new Response(
      JSON.stringify({ flagged: false, reason: null, score: 0 }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
