// Server-rendered HTML for shared post links, so find-mee.com/p/:type/:id
// (proxied here by a Cloudflare Worker — GitHub Pages can't render this
// dynamically) produces a real Open Graph preview in iMessage/WhatsApp/etc,
// and falls through to store badges for anyone without the app.
//
// Privacy: uses the service role client (bypasses RLS) so it can read
// events/group_posts that the app itself already treats as open/public
// content, but content gated to a smaller audience within the app (club
// posts require approved membership; stories are personal, ephemeral
// content) is deliberately reduced to a generic teaser here rather than
// exposed to anonymous web visitors — RLS enforces that boundary inside
// the app, but this function bypasses RLS entirely, so the boundary has
// to be re-applied by hand for each type below.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const APP_STORE_URL = 'https://apps.apple.com/app/id6790799218';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ttleisureland.findmee';
const DEFAULT_IMAGE = 'https://find-mee.com/app-icon.png';
const SITE_NAME = 'Find-Mee';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const loadContent = async (type: string, id: string) => {
  if (type === 'event') {
    const { data } = await supabase
      .from('events')
      .select('name, description, venue, photo_url, active')
      .eq('id', id)
      .maybeSingle();
    if (!data || !data.active) return null;
    return {
      title: data.name,
      description: [data.venue, data.description].filter(Boolean).join(' — ').slice(0, 200) || 'See this event on Find-Mee.',
      image: data.photo_url || DEFAULT_IMAGE,
    };
  }
  if (type === 'group_post') {
    const { data } = await supabase
      .from('group_posts')
      .select('text, photo_url, open_groups(name)')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const groupName = (data.open_groups as { name?: string } | null)?.name ?? 'Open Groups';
    return {
      title: `${groupName} on Find-Mee`,
      description: (data.text ?? '').slice(0, 200) || 'See this post on Find-Mee.',
      image: data.photo_url || DEFAULT_IMAGE,
    };
  }
  if (type === 'story') {
    const { data } = await supabase
      .from('stories')
      .select('profiles(full_name)')
      .eq('id', id)
      .maybeSingle();
    if (!data) return null;
    const name = (data.profiles as { full_name?: string } | null)?.full_name ?? 'Someone';
    // Deliberately generic — stories are personal, ephemeral content, not
    // meant to be visible to anonymous web visitors.
    return {
      title: `${name} shared a story on Find-Mee`,
      description: 'Open Find-Mee to see it.',
      image: DEFAULT_IMAGE,
    };
  }
  if (type === 'club_post') {
    const { data } = await supabase.from('club_posts').select('id').eq('id', id).maybeSingle();
    if (!data) return null;
    // Club posts require approved membership in-app — never reveal club
    // name or content to an anonymous visitor.
    return {
      title: 'Find-Mee',
      description: 'Someone shared a post in a private club. Open the app to see it.',
      image: DEFAULT_IMAGE,
    };
  }
  return null;
};

const renderPage = (type: string, id: string, content: { title: string; description: string; image: string } | null) => {
  const pageUrl = `https://find-mee.com/p/${type}/${id}`;
  const deepLink = `outandaround://post/${type}/${id}`;
  const title = content?.title ?? SITE_NAME;
  const description = content?.description ?? 'Open this in the Find-Mee app.';
  const image = content?.image ?? DEFAULT_IMAGE;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta property="og:type" content="website">
<meta property="og:site_name" content="${SITE_NAME}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<style>
  :root { --bg:#090D18; --surface:#0F1525; --gold:#C8800A; --gold-lit:#E8A020; --text:#E8DCC8; --muted:#7A7060; --border:rgba(200,128,10,0.2); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Inter', sans-serif; background: var(--bg); color: var(--text);
    min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .card { max-width: 420px; width: 100%; text-align: center; }
  .card img { width: 96px; height: 96px; border-radius: 22px; margin-bottom: 20px; object-fit: cover; }
  h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
  p { color: var(--muted); font-size: 15px; margin-bottom: 28px; line-height: 1.5; }
  .btn {
    display: block; width: 100%; padding: 14px; border-radius: 12px; margin-bottom: 10px;
    background: var(--gold); color: #090D18; font-weight: 800; text-decoration: none; font-size: 15px;
  }
  .btn.secondary { background: transparent; border: 1px solid var(--border); color: var(--text); }
  #fallback { display: none; }
</style>
</head>
<body>
  <div class="card">
    <img src="${esc(image)}" alt="">
    <h1>${esc(title)}</h1>
    <p>${esc(description)}</p>
    <div id="fallback">
      <a class="btn" id="open-app-btn" href="${esc(deepLink)}">Open in Find-Mee</a>
      <a class="btn secondary" href="${APP_STORE_URL}">Get it on the App Store</a>
      <a class="btn secondary" href="${PLAY_STORE_URL}">Get it on Google Play</a>
    </div>
  </div>
  <script>
    // Crawlers (iMessage/WhatsApp/etc link previews) only read the head
    // above and never execute this — this redirect only affects real
    // visitors tapping the link in a browser.
    window.location.href = ${JSON.stringify(deepLink)};
    setTimeout(function () { document.getElementById('fallback').style.display = 'block'; }, 1200);
  </script>
</body>
</html>`;
};

serve(async (req) => {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? '';
  const id = url.searchParams.get('id') ?? '';

  let content = null;
  try {
    if (type && id) content = await loadContent(type, id);
  } catch (err) {
    console.error('share-post: failed to load content', err);
  }

  return new Response(renderPage(type, id, content), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});
