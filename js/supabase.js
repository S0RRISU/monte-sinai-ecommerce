(() => {
  'use strict';

  // Valores atuais no repositório (fallback). Recomenda-se remover estes
  // e injetar via meta tags ou `window.__SUPABASE_*__` em produção.
  const FALLBACK_SUPABASE_URL = 'https://nnglqufeyergsgzafdek.supabase.co';
  const FALLBACK_SUPABASE_KEY = 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9';

  const getMeta = (name) => {
    try {
      const m = document.querySelector(`meta[name="${name}"]`);
      return m ? m.getAttribute('content') : null;
    } catch (e) {
      return null;
    }
  };

  const SUPABASE_URL = (window && window.__SUPABASE_URL__) || getMeta('supabase-url') || FALLBACK_SUPABASE_URL;
  const SUPABASE_KEY = (window && window.__SUPABASE_KEY__) || getMeta('supabase-key') || FALLBACK_SUPABASE_KEY;

  if (!window.supabase) {
    console.warn('[Supabase] Biblioteca do Supabase não carregou.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('xxxxxxxx')) {
    console.warn('[Supabase] Configure a chave pública real via meta tags ou `window.__SUPABASE_KEY__`. Veja .env.example.');
    return;
  }

  window.monteSinaiSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  window.supabaseClient = window.monteSinaiSupabase;
})();
