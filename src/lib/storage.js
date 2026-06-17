import { supabase } from './supabase';

export const uploadPostPhoto = async (userId, uri) => {
  const ext = uri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error } = await supabase.storage
    .from('post-photos')
    .upload(path, blob, { contentType: `image/${ext}`, upsert: false });
  if (error) return { error };
  const { data } = supabase.storage.from('post-photos').getPublicUrl(path);
  return { url: data.publicUrl };
};
