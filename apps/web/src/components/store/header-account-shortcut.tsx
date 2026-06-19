'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { UserRound } from 'lucide-react';
import { fetchStoreProfile, type StoreProfile } from '@/lib/profile-access';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type HeaderProfile = StoreProfile & { id: string };

const PROFILE_UPDATED_EVENT = 'monte-sinai-profile-updated';

export function HeaderAccountShortcut() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!mounted) return;

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const data = await fetchStoreProfile(supabase, user.id);

      if (!mounted) return;

      setProfile({
        id: user.id,
        nome: data?.nome || user.user_metadata?.name || user.email || 'Minha conta',
        email: data?.email || user.email || '',
        foto: data?.foto || data?.avatar_url || getMetadataAvatar(user)
      });
      setLoading(false);
    }

    loadProfile();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    window.addEventListener(PROFILE_UPDATED_EVENT, loadProfile);

    return () => {
      mounted = false;
      window.removeEventListener(PROFILE_UPDATED_EVENT, loadProfile);
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!profile) {
    return (
      <Link href="/conta" className="shortcut-link account-shortcut-link">
        <UserRound className="size-5" />
        <span>
          <strong>{loading ? 'Conta' : 'Minha conta'}</strong>
          <small>{loading ? 'Carregando' : 'Entrar'}</small>
        </span>
      </Link>
    );
  }

  const displayName = profile.nome || 'Minha conta';

  return (
    <Link href="/conta" className="shortcut-link account-shortcut-link is-authenticated">
      <span className="header-avatar" aria-hidden="true">
        {profile.foto ? <img src={profile.foto} alt="" /> : getInitials(displayName)}
      </span>
      <span>
        <strong>{firstName(displayName)}</strong>
        <small>Perfil</small>
      </span>
    </Link>
  );
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || 'Conta';
}

function getInitials(value: string) {
  const names = value.trim().split(/\s+/).filter(Boolean);
  const first = names[0]?.[0] || 'M';
  const second = names.length > 1 ? names[names.length - 1]?.[0] : '';
  return `${first}${second}`.toUpperCase();
}

function getMetadataAvatar(user: { user_metadata?: Record<string, unknown> }) {
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.photo || user.user_metadata?.picture;
  return typeof avatar === 'string' && !avatar.startsWith('data:') ? avatar : '';
}
