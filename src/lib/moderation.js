// To upgrade to a paid/smarter provider, change PROVIDER and implement the
// corresponding entry in `providers` below. The return shape never changes.
const PROVIDER = 'openai';

const OPENAI_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY;

// Consistent return shape for every provider:
// { flagged: boolean, reason: string | null, score: number | null }

const providers = {
  openai: async (text) => {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) return { flagged: false, reason: null, score: null };
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

  // Placeholder — swap PROVIDER to 'claude' once the Edge Function is ready
  claude: async (_text) => {
    // TODO: POST to Supabase Edge Function `moderate-content`
    // which calls Claude with a structured classification prompt
    return { flagged: false, reason: null, score: null };
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
