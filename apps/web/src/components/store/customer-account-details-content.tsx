'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import {
  ArrowLeft,
  ChevronRight,
  Edit3,
  Loader2,
  LogIn,
  Mail,
  MapPinned,
  Phone,
  ShieldCheck,
  UserRound
} from 'lucide-react';
import { fetchStoreProfile, type StoreProfile } from '@/lib/profile-access';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type ProfileAccess = StoreProfile;

type SavedLocation = {
  recipient?: string;
  phone?: string;
  zipcode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
  instructions?: string;
  address?: string;
};

export function CustomerAccountDetailsContent() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileAccess | null>(null);
  const [location, setLocation] = useState<SavedLocation | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;

      setUser(data.user);
      setLocation(readSavedLocation());

      if (!data.user) {
        setChecking(false);
        return;
      }

      const profileData = await fetchStoreProfile(supabase, data.user.id);

      if (!mounted) return;
      setProfile(profileData || null);
      setChecking(false);
    }

    void hydrate();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const displayName = getCustomerName(user, profile);
  const internalAccess = getInternalAccess(profile, user);

  if (checking) {
    return (
      <section className="profile-loading-card">
        <Loader2 className="account-auth-spinner size-7" />
        <span>Carregando detalhes</span>
        <h1>Abrindo sua conta</h1>
        <p>Estamos buscando os dados ligados a este aparelho.</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="profile-panel account-details-panel">
        <Link className="back-link" href="/conta">
          <ArrowLeft className="size-5" />
          Minha conta
        </Link>
        <div className="profile-panel-heading">
          <span>
            <LogIn className="size-5" />
          </span>
          <div>
            <small>Login necessario</small>
            <h1>Entre para ver os detalhes da conta.</h1>
          </div>
        </div>
        <p>Os dados pessoais so aparecem quando voce entra na conta da loja.</p>
        <Link className="account-details-primary" href="/login?next=/conta/detalhes">
          Entrar agora
          <ChevronRight className="size-4" />
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="account-details-hero">
        <Link className="back-link" href="/conta">
          <ArrowLeft className="size-5" />
          Minha conta
        </Link>
        <div>
          <span>Detalhes da conta</span>
          <h1>{displayName}</h1>
          <p>Resumo dos dados usados pela loja para atendimento, pedidos, entrega e acesso interno.</p>
        </div>
        <div className="account-details-actions">
          <Link href="/conta/editar">
            <Edit3 className="size-4" />
            Editar perfil
          </Link>
        </div>
      </section>

      <section className="account-details-grid">
        <article className="profile-panel account-details-panel">
          <div className="profile-panel-heading">
            <span>
              <UserRound className="size-5" />
            </span>
            <div>
              <small>Dados pessoais</small>
              <h2>Identificacao</h2>
            </div>
          </div>
          <dl className="account-details-list">
            <div>
              <dt>Nome</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{profile?.email || user.email || 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>{profile?.telefone || location?.phone || 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Endereco do perfil</dt>
              <dd>{profile?.endereco || 'Nao informado'}</dd>
            </div>
          </dl>
        </article>

        <article className="profile-panel account-details-panel">
          <div className="profile-panel-heading">
            <span>
              <MapPinned className="size-5" />
            </span>
            <div>
              <small>Entrega</small>
              <h2>Localizacao salva</h2>
            </div>
          </div>
          <dl className="account-details-list">
            <div>
              <dt>Bairro</dt>
              <dd>{location?.neighborhood || 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Endereco</dt>
              <dd>{formatAddress(location) || 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Referencia</dt>
              <dd>{location?.reference || 'Nao informado'}</dd>
            </div>
            <div>
              <dt>Recebedor</dt>
              <dd>{location?.recipient || displayName}</dd>
            </div>
          </dl>
        </article>

        <article className="profile-panel account-details-panel">
          <div className="profile-panel-heading">
            <span>
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <small>Acesso</small>
              <h2>{internalAccess ? 'Conta interna' : 'Conta de cliente'}</h2>
            </div>
          </div>
          <div className="account-access-badges">
            <span>
              <Mail className="size-4" />
              {user.email}
            </span>
            <span>
              <Phone className="size-4" />
              {profile?.telefone || location?.phone || 'Telefone pendente'}
            </span>
            <span>
              <ShieldCheck className="size-4" />
              {internalAccess ? formatInternalAccess(internalAccess) : 'Cliente'}
            </span>
          </div>
        </article>
      </section>
    </>
  );
}

function readSavedLocation() {
  if (typeof window === 'undefined') return null;
  const rawLocation = window.localStorage.getItem('monte-sinai-delivery-location');
  if (!rawLocation) return null;

  try {
    return JSON.parse(rawLocation) as SavedLocation;
  } catch {
    window.localStorage.removeItem('monte-sinai-delivery-location');
    return null;
  }
}

function formatAddress(location: SavedLocation | null) {
  if (!location) return '';
  const streetLine = [location.street || location.address, location.number].map((part) => clean(part)).filter(Boolean).join(', ');
  const city = clean(location.city);
  const state = normalizeLocationState(location.state, city);
  const cityLine = [location.neighborhood, city, state].map((part) => clean(part)).filter(Boolean).join(' - ');
  return [streetLine, clean(location.complement), cityLine].filter(Boolean).join(' | ');
}

function getInternalAccess(profile: ProfileAccess | null, user: User | null) {
  const adminRole = (profile?.admin_role || '').toLowerCase();
  const role = (profile?.role || '').toLowerCase();
  if (profile?.is_admin || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(adminRole)) return adminRole || 'admin';
  if (['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(role)) return role;
  const appMetadata = user?.app_metadata || {};
  const appAdminRole = typeof appMetadata.admin_role === 'string' ? appMetadata.admin_role.toLowerCase() : '';
  const appRole = typeof appMetadata.role === 'string' ? appMetadata.role.toLowerCase() : '';
  if (appMetadata.is_admin === true || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(appAdminRole)) return appAdminRole || 'admin';
  if (['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(appRole)) return appRole;
  return '';
}

function formatInternalAccess(value: string) {
  const labels: Record<string, string> = {
    developer: 'Developer',
    owner: 'Administrador',
    admin: 'Administrador',
    staff: 'Equipe',
    equipe: 'Equipe',
    motoboy: 'Entregador'
  };
  return labels[value] || 'Acesso interno';
}

function getCustomerName(user: User | null, profile: ProfileAccess | null) {
  const metadata = user?.user_metadata || {};
  const name = profile?.nome || metadata.name || metadata.nome || metadata.full_name;
  return typeof name === 'string' && name.trim() ? name.trim() : user?.email?.split('@')[0] || 'Cliente Monte Sinai';
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLocationState(value: string | undefined, city: string) {
  const state = clean(value).toUpperCase();
  const normalizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (!state) return '';
  if (state === 'MG' && (normalizedCity === 'sao paulo' || normalizedCity === 'montes claros')) return 'SP';
  return state;
}
