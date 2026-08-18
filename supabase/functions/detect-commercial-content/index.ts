import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are a content classification assistant for a social going-out app.
Regular members post about personal social plans — a separate paid "venue
owner" account exists for businesses to promote themselves. Analyse the
text and determine if it is a COMMERCIAL post: advertising or promoting a
business, product, or service, or soliciting customers/clients, rather
than a personal social post.

Flag as commercial if the text:
- Promotes a business, brand, product, or service for sale
- Advertises prices, discounts, or promotions
- Asks people to DM/contact for business purposes (bookings, sales, inquiries)
- Promotes an event/venue the poster professionally represents, not just attending as a guest

Do NOT flag:
- Casual mentions of a venue or place as part of a personal social plan
- Personal recommendations without commercial intent
- Ordinary social event invites (e.g. "anyone going to X tonight?")

Respond ONLY with valid JSON in this exact shape:
{
  "commercial": boolean,
  "reason": string | null
}

"reason" should be a short phrase (e.g. "advertises product for sale") or null if not commercial.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ commercial: false, reason: null }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) {
      console.error('ANTHROPIC_API_KEY secret not set');
      return new Response(
        JSON.stringify({ commercial: false, reason: null }),
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
        JSON.stringify({ commercial: false, reason: null }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const json = await res.json();
    const raw = json.content?.[0]?.text ?? '{}';

    let result = { commercial: false, reason: null };
    try {
      result = JSON.parse(raw);
    } catch {
      console.error('Failed to parse Claude response:', raw);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('detect-commercial-content error:', err);
    // Fail open — don't block users on server errors
    return new Response(
      JSON.stringify({ commercial: false, reason: null }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
