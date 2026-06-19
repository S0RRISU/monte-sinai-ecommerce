export type StoreProfile = {
  id?: string | null;
  nome?: string | null;
  email?: string | null;
  foto?: string | null;
  avatar_url?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  role?: string | null;
  admin_role?: string | null;
  is_admin?: boolean | null;
};

type ProfileQueryResult = {
  data: StoreProfile | null;
  error: { message?: string } | null;
};

type ProfilesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<ProfileQueryResult>;
    };
  };
};

type ProfileClient = {
  from: (table: 'profiles') => ProfilesTable;
};

export const STORE_PROFILE_COLUMNS = 'id,nome,email,foto,avatar_url,telefone,endereco,role,admin_role,is_admin';
export const STORE_PROFILE_COLUMNS_WITHOUT_AVATAR = 'id,nome,email,foto,telefone,endereco,role,admin_role,is_admin';

export async function fetchStoreProfile(supabase: unknown, userId: string) {
  const profiles = (supabase as ProfileClient).from('profiles');
  const result = await profiles.select(STORE_PROFILE_COLUMNS).eq('id', userId).maybeSingle();

  if (!result.error) return result.data;

  const message = result.error.message || '';
  if (!/avatar_url|schema cache|column/i.test(message)) {
    throw result.error;
  }

  const fallbackResult = await profiles.select(STORE_PROFILE_COLUMNS_WITHOUT_AVATAR).eq('id', userId).maybeSingle();
  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data;
}
