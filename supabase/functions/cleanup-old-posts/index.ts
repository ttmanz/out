import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Verify caller is our cron job
  const secret = req.headers.get('x-cron-secret');
  if (secret !== Deno.env.get('CRON_SECRET')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const baseStorageUrl = `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/post-photos/`;

  // 1. Fetch expired posts that have storage photos
  const { data: postsWithPhotos } = await supabase
    .from('happenings')
    .select('id, photo_url')
    .lt('created_at', cutoff)
    .not('photo_url', 'is', null);

  // 2. Delete storage files
  const storagePaths = (postsWithPhotos ?? [])
    .filter((p) => p.photo_url?.startsWith(baseStorageUrl))
    .map((p) => p.photo_url.replace(baseStorageUrl, ''));

  if (storagePaths.length > 0) {
    await supabase.storage.from('post-photos').remove(storagePaths);
  }

  // 3. Delete the rows
  const { count, error } = await supabase
    .from('happenings')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ deleted_posts: count, deleted_photos: storagePaths.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
