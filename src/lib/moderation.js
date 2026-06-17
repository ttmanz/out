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
