const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getMeta(html: string, ...props: string[]): string | null {
  for (const prop of props) {
    for (const pattern of [
      new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${prop}["']`, 'i'),
    ]) {
      const m = html.match(pattern);
      if (m?.[1]) return m[1];
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = new URL(url);
    const domain = parsed.hostname.replace(/^www\./, '');

    // YouTube — oEmbed, no API key needed
    if (['youtube.com', 'youtu.be', 'm.youtube.com'].includes(domain)) {
      const r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { headers: { 'User-Agent': 'OutAndAroundBot/1.0' } }
      );
      if (r.ok) {
        const d = await r.json();
        return new Response(JSON.stringify({
          title: d.title ?? null,
          image: d.thumbnail_url ?? null,
          domain: 'youtube.com',
          description: d.author_name ? `by ${d.author_name}` : null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Spotify — oEmbed
    if (domain === 'open.spotify.com' || domain === 'spotify.com') {
      const r = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { headers: { 'User-Agent': 'OutAndAroundBot/1.0' } }
      );
      if (r.ok) {
        const d = await r.json();
        return new Response(JSON.stringify({
          title: d.title ?? null,
          image: d.thumbnail_url ?? null,
          domain: 'spotify.com',
          description: null,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // General — OG / Twitter Card scraping
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OutAndAroundBot/1.0)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);

    const html = await r.text();
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    return new Response(JSON.stringify({
      title: getMeta(html, 'og:title', 'twitter:title') ?? titleTag?.[1]?.trim() ?? domain,
      image: getMeta(html, 'og:image', 'twitter:image') ?? null,
      domain,
      description: getMeta(html, 'og:description', 'twitter:description') ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
