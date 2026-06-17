import { supabase } from './supabase';

export const fetchLinkPreview = async (url) => {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-link-preview', { body: { url } });
    if (error || !data || data.error) return null;
    return data; // { title, image, domain, description }
  } catch {
    return null;
  }
};
