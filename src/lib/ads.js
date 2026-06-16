import { supabase } from './supabase';

export const getAdsForPage = (page) =>
  supabase
    .from('ads')
    .select('id, image_url, link_url, position')
    .eq('page', page)
    .eq('active', true)
    .order('position', { ascending: true })
    .limit(2);
