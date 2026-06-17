import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Deep-link redirect for OAuth — add this URL to Supabase Dashboard →
// Authentication → URL Configuration → Redirect URLs
// Production:  outandaround://auth
// Development: run the app and check the console log below
const redirectTo = makeRedirectUri({ scheme: 'outandaround', path: 'auth' });

const oauthSignIn = async (provider) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { error: error ?? new Error('No OAuth URL') };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: null }; // user cancelled

  return supabase.auth.exchangeCodeForSession(result.url);
};

export const signInWithEmail = (email, password) =>
  supabase.auth.signInWithPassword({ email, password });

export const signUpWithEmail = (email, password, fullName) =>
  supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

export const signInWithGoogle   = () => oauthSignIn('google');
export const signInWithFacebook = () => oauthSignIn('facebook');
export const signInWithApple    = () => oauthSignIn('apple');

// Phone OTP — requires an SMS provider configured in Supabase Dashboard →
// Authentication → Providers → Phone. Supports Twilio, Vonage, etc.
export const signInWithPhone = (phone) =>
  supabase.auth.signInWithOtp({ phone });

export const verifyPhoneOtp = (phone, token) =>
  supabase.auth.verifyOtp({ phone, token, type: 'sms' });

export const signOut = () => supabase.auth.signOut();

export const getSession = () => supabase.auth.getSession();

export const onAuthStateChange = (callback) =>
  supabase.auth.onAuthStateChange(callback);
