import { supabase } from './supabase';

// All auth operations in one place — import from here, not directly from supabase

export const signInWithEmail = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithEmail = (email, password, fullName) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google' });

export const signInWithFacebook = () =>
  supabase.auth.signInWithOAuth({ provider: 'facebook' });

export const signInWithApple = () =>
  supabase.auth.signInWithOAuth({ provider: 'apple' });

export const signOut = () =>
  supabase.auth.signOut();

export const getSession = () =>
  supabase.auth.getSession();

export const onAuthStateChange = (callback) =>
  supabase.auth.onAuthStateChange(callback);
