'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  Building2,
  Hash,
  Home,
  ImagePlus,
  Loader2,
  LogIn,
  LogOut,
  MapPinned,
  Navigation,
  Phone,
  Route,
  Save,
  Trash2,
  UserRound
} from 'lucide-react';
import { fetchStoreProfile, STORE_PROFILE_COLUMNS, STORE_PROFILE_COLUMNS_WITHOUT_AVATAR, type StoreProfile } from '@/lib/profile-access';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type ProfileAccess = StoreProfile;

type ProfileForm = {
  nome: string;
  telefone: string;
  endereco: string;
  foto: string;
};

type SavedLocation = {
  recipient: string;
  phone: string;
  zipcode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
  instructions: string;
};

type ZipcodeApiResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type SupabaseErrorLike = Error | { message?: string };

type ProfileUpdatePayload = {
  nome: string;
  telefone: string;
  endereco: string;
  foto: string;
  avatar_url?: string;
  updated_at: string;
};

type ProfilesTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: ProfileAccess | null; error: SupabaseErrorLike | null }>;
    };
  };
  update: (payload: Partial<ProfileUpdatePayload>) => {
    eq: (column: string, value: string) => {
      select: (columns: string) => {
        maybeSingle: () => Promise<{ data: ProfileAccess | null; error: SupabaseErrorLike | null }>;
      };
    };
  };
};

const emptyLocation: SavedLocation = {
  recipient: '',
  phone: '',
  zipcode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: 'Sao Paulo',
  state: 'SP',
  reference: '',
  instructions: ''
};
const PROFILE_UPDATED_EVENT = 'monte-sinai-profile-updated';
const PROFILE_SELECT_COLUMNS = STORE_PROFILE_COLUMNS;

export function CustomerProfileEditContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const router = useRouter();
  const lastZipcodeLookupRef = useRef('');
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [zipcodeLoading, setZipcodeLoading] = useState(false);
  const [zipcodeStatus, setZipcodeStatus] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState<ProfileForm>({
    nome: '',
    telefone: '',
    endereco: '',
    foto: ''
  });
  const [location, setLocation] = useState<SavedLocation>(emptyLocation);

  const lookupZipcode = useCallback(async (zipcode: string) => {
    const cleanZipcode = onlyDigits(zipcode);
    if (cleanZipcode.length !== 8) return;

    setZipcodeLoading(true);
    setZipcodeStatus('Buscando endereco pelo CEP...');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZipcode}/json/`);
      if (!response.ok) throw new Error('Nao foi possivel consultar o CEP.');

      const data = (await response.json()) as ZipcodeApiResponse;
      if (data.erro) throw new Error('CEP nao encontrado.');

      setLocation((current) => ({
        ...current,
        zipcode: formatZipcode(cleanZipcode),
        street: data.logradouro?.trim() || current.street,
        complement: current.complement || data.complemento?.trim() || '',
        neighborhood: data.bairro?.trim() || current.neighborhood,
        city: data.localidade?.trim() || current.city || emptyLocation.city,
        state: data.uf?.trim().toUpperCase() || current.state || emptyLocation.state
      }));
      setZipcodeStatus('Endereco encontrado. Complete numero, complemento e referencia.');
    } catch {
      setZipcodeStatus('Nao encontramos esse CEP. Complete o endereco manualmente.');
    } finally {
      setZipcodeLoading(false);
    }
  }, []);

  useEffect(() => {
    const cleanZipcode = onlyDigits(location.zipcode);

    if (cleanZipcode.length !== 8) return;

    if (cleanZipcode === lastZipcodeLookupRef.current) return;

    const timer = window.setTimeout(() => {
      lastZipcodeLookupRef.current = cleanZipcode;
      void lookupZipcode(cleanZipcode);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [location.zipcode, lookupZipcode]);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      setUser(data.user);
      if (!data.user) {
        setChecking(false);
        return;
      }

      const profile = await fetchStoreProfile(supabase, data.user.id);

      if (!mounted) return;
      const savedLocation = getSavedLocation();
      setForm({
        nome: profile?.nome || getCustomerName(data.user, profile),
        telefone: profile?.telefone || savedLocation.phone || '',
        endereco: profile?.endereco || formatAddress(savedLocation),
        foto: profile?.foto || profile?.avatar_url || getMetadataAvatar(data.user)
      });
      setLocation({
        ...savedLocation,
        recipient: savedLocation.recipient || profile?.nome || getCustomerName(data.user, profile),
        phone: savedLocation.phone || profile?.telefone || ''
      });
      setChecking(false);
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const avatarUrl = normalizeAvatar(form.foto);
  const displayName = form.nome.trim() || getCustomerName(user, null);
  const initials = getInitials(displayName || user?.email || 'MS');
  const zipcodeDigits = onlyDigits(location.zipcode);
  const zipcodeFeedback = zipcodeLoading
    ? 'Buscando endereco...'
    : zipcodeDigits.length >= 5 && zipcodeDigits.length < 8
      ? 'Digite os 8 numeros do CEP.'
      : zipcodeDigits.length === 8
        ? zipcodeStatus
        : '';

  function updateLocation(field: keyof SavedLocation, value: string) {
    setLocation((current) => ({ ...current, [field]: value }));
  }

  async function handleSave() {
    if (!user) {
      router.push('/login?next=/conta/editar');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const cleanLocation: SavedLocation = {
        ...location,
        recipient: location.recipient.trim() || form.nome.trim() || getCustomerName(user, null),
        phone: location.phone.trim() || form.telefone.trim(),
        city: location.city.trim() || emptyLocation.city,
        state: location.state.trim().toUpperCase() || emptyLocation.state
      };
      const formattedLocation = formatAddress(cleanLocation);
      const payload: ProfileUpdatePayload = {
        nome: form.nome.trim() || getCustomerName(user, null),
        telefone: form.telefone.trim() || cleanLocation.phone,
        endereco: form.endereco.trim() || formattedLocation,
        foto: normalizeAvatar(form.foto),
        avatar_url: normalizeAvatar(form.foto),
        updated_at: new Date().toISOString()
      };

      const profiles = supabase.from('profiles') as unknown as ProfilesTable;
      const data = await updateProfile(profiles, user.id, payload);

      setForm({
        nome: data?.nome || payload.nome,
        telefone: data?.telefone || payload.telefone,
        endereco: data?.endereco || payload.endereco,
        foto: data?.foto || data?.avatar_url || payload.foto
      });
      setLocation(cleanLocation);
      window.localStorage.setItem('monte-sinai-delivery-location', JSON.stringify(cleanLocation));
      window.dispatchEvent(new CustomEvent('monte-sinai-location-updated', { detail: cleanLocation }));
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: data || payload }));
      setMessage('Perfil e localizacao atualizados com sucesso.');
      window.setTimeout(() => router.push('/conta/detalhes'), 700);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  function handleSwitchAccount() {
    setError('');
    setMessage('');
    window.location.assign('/login?switch=1&next=/conta');
  }

  async function handleSignOut() {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUser(null);
      router.push('/conta');
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Nao foi possivel sair da conta.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(file: File | null) {
    if (!file) return;

    if (!user) {
      router.push('/login?next=/conta/editar');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Escolha uma imagem valida para a foto do perfil.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setError('A foto deve ter no maximo 3 MB.');
      return;
    }

    setUploadingPhoto(true);
    setError('');
    setMessage('');

    try {
      const extension = getImageExtension(file);
      const path = `${user.id}/avatar-${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false
      });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const profiles = supabase.from('profiles') as unknown as ProfilesTable;
      const updatedProfile = await updateProfile(profiles, user.id, {
        foto: publicUrl,
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      });

      setForm((current) => ({ ...current, foto: publicUrl }));
      window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: updatedProfile || { foto: publicUrl, avatar_url: publicUrl } }));
      setMessage('Foto do perfil atualizada.');
    } catch (photoError) {
      const message = photoError instanceof Error ? photoError.message : 'Nao foi possivel enviar a foto.';
      setError(
        message.toLowerCase().includes('bucket')
          ? 'Bucket de avatares nao encontrado. Rode o SQL supabase/20260617-profile-avatars-storage.sql no Supabase.'
          : message
      );
    } finally {
      setUploadingPhoto(false);
    }
  }

  if (checking) {
    return (
      <section className="profile-loading-card">
        <Loader2 className="account-auth-spinner size-7" />
        <span>Carregando perfil</span>
        <h1>Preparando seus dados</h1>
        <p>Estamos abrindo sua area de edicao.</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="profile-panel profile-edit-panel">
        <Link className="back-link" href="/conta">
          <ArrowLeft className="size-5" />
          Voltar
        </Link>
        <div className="profile-panel-heading">
          <span>
            <LogIn className="size-5" />
          </span>
          <div>
            <small>Login necessario</small>
            <h1>Entre para editar seu perfil.</h1>
          </div>
        </div>
        <p>Dados pessoais e foto so aparecem depois do login da loja.</p>
        <Link className="profile-primary-action" href="/login?next=/conta/editar">
          Entrar agora
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="profile-edit-hero">
        <Link className="back-link" href="/conta">
          <ArrowLeft className="size-5" />
          Minha conta
        </Link>
        <div>
          <span>Perfil do cliente</span>
          <h1>Editar perfil e localizacao</h1>
          <p>Atualize dados pessoais, foto e endereco de entrega no mesmo lugar.</p>
        </div>
      </section>

      {message ? <p className="account-auth-success">{message}</p> : null}
      {error ? <p className="account-auth-error">{error}</p> : null}

      <section className="profile-panel profile-edit-panel">
        <div className="profile-edit-layout">
          <div className="profile-edit-photo">
            <div className="profile-avatar-frame">
              {avatarUrl ? <img src={avatarUrl} alt={displayName} /> : <strong>{initials}</strong>}
            </div>
            <div>
              <strong>{displayName}</strong>
              <small>{user.email}</small>
            </div>
            <button type="button" onClick={() => setForm((current) => ({ ...current, foto: '' }))} disabled={!form.foto}>
              <Trash2 className="size-4" />
              Remover foto
            </button>
            <label className="profile-photo-upload-button">
              <ImagePlus className="size-4" />
              {uploadingPhoto ? 'Enviando...' : 'Enviar foto'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={uploadingPhoto}
                onChange={(event) => void handlePhotoUpload(event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <form
            className="profile-edit-form"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <label>
              Nome
              <input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="Seu nome" />
            </label>
            <label>
              Telefone
              <input value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} placeholder="(00) 00000-0000" />
            </label>
            <label className="profile-edit-wide">
              Endereco principal
              <input value={form.endereco} onChange={(event) => setForm((current) => ({ ...current, endereco: event.target.value }))} placeholder="Rua, numero, bairro e referencia" />
            </label>
            <label className="profile-edit-wide">
              Foto do perfil
              <span className="profile-photo-url-field">
                <ImagePlus className="size-5" />
                <input value={form.foto} onChange={(event) => setForm((current) => ({ ...current, foto: event.target.value }))} placeholder="Cole o link da sua foto" />
              </span>
            </label>

            <section className="profile-edit-location-card profile-edit-wide" id="localizacao">
              <div className="profile-edit-location-heading">
                <span>
                  <MapPinned className="size-5" />
                </span>
                <div>
                  <small>Localizacao de entrega</small>
                  <strong>Alterar endereco usado no checkout</strong>
                </div>
              </div>

              <div className="profile-edit-location-grid">
                <label>
                  Nome de quem recebe
                  <span className="profile-photo-url-field">
                    <UserRound className="size-5" />
                    <input
                      value={location.recipient}
                      onChange={(event) => updateLocation('recipient', event.target.value)}
                      placeholder="Nome do recebedor"
                    />
                  </span>
                </label>
                <label>
                  Telefone de entrega
                  <span className="profile-photo-url-field">
                    <Phone className="size-5" />
                    <input
                      inputMode="tel"
                      value={location.phone}
                      onChange={(event) => updateLocation('phone', event.target.value)}
                      placeholder="(38) 99999-9999"
                    />
                  </span>
                </label>
                <label>
                  CEP
                  <span className="profile-photo-url-field">
                    <Hash className="size-5" />
                    <input
                      inputMode="numeric"
                      value={location.zipcode}
                      onChange={(event) => updateLocation('zipcode', formatZipcode(event.target.value))}
                      placeholder="00000-000"
                    />
                  </span>
                  {zipcodeFeedback ? (
                    <small className={`profile-zipcode-status${zipcodeLoading ? ' is-loading' : ''}`}>
                      {zipcodeFeedback}
                    </small>
                  ) : null}
                </label>
                <label>
                  Rua / Avenida
                  <span className="profile-photo-url-field">
                    <Home className="size-5" />
                    <input
                      value={location.street}
                      onChange={(event) => updateLocation('street', event.target.value)}
                      placeholder="Nome da rua"
                    />
                  </span>
                </label>
                <label>
                  Numero
                  <span className="profile-photo-url-field">
                    <Hash className="size-5" />
                    <input
                      value={location.number}
                      onChange={(event) => updateLocation('number', event.target.value)}
                      placeholder="123"
                    />
                  </span>
                </label>
                <label>
                  Complemento
                  <span className="profile-photo-url-field">
                    <Building2 className="size-5" />
                    <input
                      value={location.complement}
                      onChange={(event) => updateLocation('complement', event.target.value)}
                      placeholder="Apto, casa, bloco"
                    />
                  </span>
                </label>
                <label>
                  Bairro
                  <span className="profile-photo-url-field">
                    <MapPinned className="size-5" />
                    <input
                      value={location.neighborhood}
                      onChange={(event) => updateLocation('neighborhood', event.target.value)}
                      placeholder="Bairro"
                    />
                  </span>
                </label>
                <label>
                  Cidade
                  <span className="profile-photo-url-field">
                    <Building2 className="size-5" />
                    <input
                      value={location.city}
                      onChange={(event) => updateLocation('city', event.target.value)}
                      placeholder="Sao Paulo"
                    />
                  </span>
                </label>
                <label>
                  UF
                  <span className="profile-photo-url-field">
                    <Navigation className="size-5" />
                    <input
                      maxLength={2}
                      value={location.state}
                      onChange={(event) => updateLocation('state', event.target.value.toUpperCase())}
                      placeholder="SP"
                    />
                  </span>
                </label>
                <label className="profile-edit-location-wide">
                  Referencia
                  <span className="profile-photo-url-field">
                    <MapPinned className="size-5" />
                    <input
                      value={location.reference}
                      onChange={(event) => updateLocation('reference', event.target.value)}
                      placeholder="Ex.: portao azul, perto do mercado"
                    />
                  </span>
                </label>
                <label className="profile-edit-location-wide">
                  Observacao para entrega
                  <span className="profile-photo-url-field profile-edit-textarea-field">
                    <Route className="size-5" />
                    <textarea
                      value={location.instructions}
                      onChange={(event) => updateLocation('instructions', event.target.value)}
                      placeholder="Ex.: chamar no WhatsApp, deixar com porteiro"
                      rows={3}
                    />
                  </span>
                </label>
              </div>
            </section>
            <div className="profile-edit-actions">
              <button type="button" onClick={handleSwitchAccount} disabled={loading}>
                <LogIn className="size-4" />
                Trocar conta
              </button>
              <button type="button" onClick={() => void handleSignOut()} disabled={loading}>
                <LogOut className="size-4" />
                Sair
              </button>
              <button type="submit" disabled={saving}>
                {saving ? <Loader2 className="account-auth-spinner size-4" /> : <Save className="size-4" />}
                {saving ? 'Salvando...' : 'Salvar perfil'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}

function getCustomerName(user: User | null, profile: ProfileAccess | null) {
  const metadata = user?.user_metadata || {};
  const name = profile?.nome || metadata.name || metadata.nome || metadata.full_name;
  return typeof name === 'string' && name.trim() ? name.trim() : user?.email?.split('@')[0] || 'Cliente Monte Sinai';
}

function getMetadataAvatar(user: User | null) {
  const metadata = user?.user_metadata || {};
  const avatar = metadata.avatar_url || metadata.photo || metadata.picture;
  return typeof avatar === 'string' ? avatar : '';
}

function normalizeAvatar(value?: string | null) {
  const cleanValue = value?.trim();
  if (!cleanValue || cleanValue.startsWith('data:')) return '';
  return cleanValue;
}

async function updateProfile(profiles: ProfilesTable, userId: string, payload: Partial<ProfileUpdatePayload>) {
  const result = await profiles.update(payload).eq('id', userId).select(PROFILE_SELECT_COLUMNS).maybeSingle();
  if (!result.error) return result.data;

  const message = result.error.message || '';
  if (!('avatar_url' in payload) || !/avatar_url|schema cache|column/i.test(message)) {
    throw result.error;
  }

  const fallbackPayload = { ...payload };
  delete fallbackPayload.avatar_url;
  const fallbackResult = await profiles.update(fallbackPayload).eq('id', userId).select(STORE_PROFILE_COLUMNS_WITHOUT_AVATAR).maybeSingle();
  if (fallbackResult.error) throw fallbackResult.error;
  return fallbackResult.data;
}

function getSavedLocation(): SavedLocation {
  if (typeof window === 'undefined') return emptyLocation;
  const rawLocation = window.localStorage.getItem('monte-sinai-delivery-location');
  if (!rawLocation) return emptyLocation;

  try {
    const parsed = JSON.parse(rawLocation) as Partial<SavedLocation> & { address?: string };
    const city = parsed.city || emptyLocation.city;
    return {
      recipient: parsed.recipient || '',
      phone: parsed.phone || '',
      zipcode: parsed.zipcode || '',
      street: parsed.street || parsed.address || '',
      number: parsed.number || '',
      complement: parsed.complement || '',
      neighborhood: parsed.neighborhood || '',
      city,
      state: normalizeLocationState(parsed.state, city),
      reference: parsed.reference || '',
      instructions: parsed.instructions || ''
    };
  } catch {
    window.localStorage.removeItem('monte-sinai-delivery-location');
    return emptyLocation;
  }
}

function formatAddress(location: SavedLocation) {
  const streetLine = [location.street, location.number].map((part) => part.trim()).filter(Boolean).join(', ');
  const cityLine = [location.neighborhood, location.city, location.state].map((part) => part.trim()).filter(Boolean).join(' - ');
  return [streetLine, location.complement.trim(), cityLine].filter(Boolean).join(' | ');
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, 8);
}

function formatZipcode(value: string) {
  const digits = onlyDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeLocationState(value: string | undefined, city: string) {
  const state = value?.trim().toUpperCase();
  const normalizedCity = city.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (!state) return emptyLocation.state;
  if (state === 'MG' && (normalizedCity === 'sao paulo' || normalizedCity === 'montes claros')) {
    return emptyLocation.state;
  }

  return state;
}

function getImageExtension(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'jpg';
  if (extension === 'png') return 'png';
  if (extension === 'webp') return 'webp';
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

function getInitials(value: string) {
  return (
    value
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'MS'
  );
}
