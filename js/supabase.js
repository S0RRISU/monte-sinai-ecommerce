(() => {
  'use strict';

  const SUPABASE_URL = 'https://nnglqufeyergsgzafdek.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_xxxxxxxxxxxxxxxxx';

  if (!window.supabase) {
    console.warn('Biblioteca do Supabase não carregou.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('xxxxxxxx')) {
    console.warn('Configure a chave pública do Supabase em js/supabase.js.');
    return;
  }

  window.monteSinaiSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.supabaseClient = window.monteSinaiSupabase;
})();
