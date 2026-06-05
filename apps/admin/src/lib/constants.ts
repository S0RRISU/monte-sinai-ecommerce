export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnglqufeyergsgzafdek.supabase.co';

export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9';

export const storeConfig = {
  name: 'Monte Sinai',
  tagline: 'Agua, gas e limpeza',
  logo: '/brand/monte-sinai-logo-transparente.png',
  whatsapp: '5511960928234'
};

export const officialStoreUrl =
  process.env.NEXT_PUBLIC_STORE_URL || (process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3000' : '/');

export const adminRoles = ['admin', 'developer'] as const;
export const staffRoles = ['equipe', 'motoboy', 'admin', 'developer'] as const;

export const orderStatuses = [
  { value: 'Recebido', label: 'Recebido', tone: 'blue' },
  { value: 'A confirmar', label: 'Novo pedido', tone: 'amber' },
  { value: 'Em separação', label: 'Em separação', tone: 'purple' },
  { value: 'A caminho', label: 'A caminho', tone: 'orange' },
  { value: 'Entregue', label: 'Entregue', tone: 'green' },
  { value: 'Cancelado', label: 'Cancelado', tone: 'red' }
] as const;

export const paymentStatuses = ['Pendente', 'Pago', 'Cancelado'] as const;
