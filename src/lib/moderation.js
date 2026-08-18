import { supabase } from './supabase';

// Change this one line to switch moderation provider:
//   'openai'  — free, no cost, good for obvious violations
//   'claude'  — Claude Haiku via Supabase Edge Function, more nuanced
const PROVIDER = 'claude';

// Consistent return shape for every provider:
// { flagged: boolean, reason: string | null, score: number | null }

const providers = {
  openai: async (text) => {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) throw new Error(`OpenAI moderation ${res.status}`);
    const json = await res.json();
    const result = json.results?.[0];
    if (!result) return { flagged: false, reason: null, score: null };

    const reason = result.flagged
      ? Object.entries(result.categories)
          .filter(([, v]) => v)
          .map(([k]) => k.replace(/-/g, ' '))
          .join(', ')
      : null;

    return {
      flagged: result.flagged,
      reason,
      score: result.flagged
        ? Math.max(...Object.values(result.category_scores))
        : null,
    };
  },

  // Claude Haiku via Supabase Edge Function — API key stays server-side.
  // To activate: deploy supabase/functions/moderate-content, set the
  // ANTHROPIC_API_KEY secret, then change PROVIDER above to 'claude'.
  claude: async (text) => {
    const { data, error } = await supabase.functions.invoke('moderate-content', {
      body: { text },
    });
    if (error || !data) return { flagged: false, reason: null, score: null };
    return {
      flagged: data.flagged ?? false,
      reason: data.reason ?? null,
      score: data.score ?? null,
    };
  },
};

// Fails open: if the provider is unreachable the post is allowed through.
// A separate server-side check (e.g. DB trigger) can catch stragglers later.
export const moderateContent = async (text) => {
  try {
    return await providers[PROVIDER](text);
  } catch {
    return { flagged: false, reason: null, score: null };
  }
};

// Separate from moderateContent above — this isn't a safety check, it's a
// business-policy classifier: is this member using a personal post to
// advertise a business, rather than posting socially? Never blocks the
// post either way; it only feeds commercial_post_flags for admin review.
// Fails open (never flags) if the function is unreachable.
export const detectCommercialContent = async (text) => {
  try {
    const { data, error } = await supabase.functions.invoke('detect-commercial-content', {
      body: { text },
    });
    if (error || !data) return { commercial: false, reason: null };
    return { commercial: data.commercial ?? false, reason: data.reason ?? null };
  } catch {
    return { commercial: false, reason: null };
  }
};

export const flagCommercialPost = (userId, targetType, targetId, contentExcerpt, reason) =>
  supabase.from('commercial_post_flags').insert({
    user_id: userId,
    target_type: targetType,
    target_id: targetId,
    content_excerpt: contentExcerpt ? contentExcerpt.slice(0, 200) : null,
    reason,
  });

// One-liner for create-flows to call after a successful post: skips venue
// accounts entirely (Market listings excluded by callers simply never
// calling this for that flow — commercial content there is expected),
// classifies, and logs a flag row if it's commercial. Never throws, never
// blocks the post — this runs after the post already succeeded.
export const checkAndFlagIfCommercial = async (profile, targetType, targetId, text) => {
  if (!text || profile?.account_type === 'venue_owner') return;
  const { commercial, reason } = await detectCommercialContent(text);
  if (commercial) {
    // supabase-js query builders are lazy — must be awaited to actually fire
    await flagCommercialPost(profile.id, targetType, targetId, text, reason);
  }
};
