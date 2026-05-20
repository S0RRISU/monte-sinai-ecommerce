(() => {
  'use strict';

  const SUPABASE_URL = 'https://nnglqufeyergsgzafdek.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9';

  if (!window.supabase) {
    console.warn('[Supabase] Biblioteca do Supabase não carregou.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('xxxxxxxx')) {
    console.warn('[Supabase] Configure a chave pública real em js/supabase.js. A chave atual ainda está como placeholder.');
    return;
  }

  window.monteSinaiSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabaseClient = window.monteSinaiSupabase;
  console.log('[Supabase] Cliente conectado:', SUPABASE_URL);
})();
