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

const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'm4v'];

export const uploadStoryMedia = async (userId, uri) => {
  const ext = uri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const isVideo = VIDEO_EXTS.includes(ext);
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const contentType = isVideo
    ? `video/${ext === 'mov' ? 'quicktime' : ext}`
    : `image/${ext}`;
  const { error } = await supabase.storage
    .from('story-media')
    .upload(path, blob, { contentType, upsert: false });
  if (error) return { error };
  const { data } = supabase.storage.from('story-media').getPublicUrl(path);
  return { url: data.publicUrl, isVideo };
};
