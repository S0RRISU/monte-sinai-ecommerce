(() => {
  'use strict';

  const fallbackUrl = 'https://nnglqufeyergsgzafdek.supabase.co';
  const fallbackKey = 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9';

  const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.getAttribute('content') || '';
  const url = window.__SUPABASE_URL__ || meta('supabase-url') || fallbackUrl;
  const key = window.__SUPABASE_KEY__ || meta('supabase-key') || fallbackKey;

  if (!window.supabase || !url || !key) {
    console.warn('[Monte Sinai] Supabase client nao inicializado.');
    return;
  }

  window.monteSinaiSupabase = window.supabase.createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.supabaseClient = window.monteSinaiSupabase;
})();
