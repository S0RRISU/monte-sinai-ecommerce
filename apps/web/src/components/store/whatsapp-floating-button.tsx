'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type ProfileAccess = {
  role?: string | null;
  admin_role?: string | null;
  is_admin?: boolean | null;
};

export function WhatsAppFloatingButton({ phone }: { phone: string }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function resolveVisibility() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        if (mounted) setVisible(true);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, admin_role, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!mounted) return;
      setVisible(!isInternalProfile((profileData as ProfileAccess | null) || null));
    }

    void resolveVisibility();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => {
      void resolveVisibility();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!visible) return null;

  return (
    <a
      className="whatsapp-floating-button"
      href={`https://wa.me/${phone.replace(/\D/g, '')}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a Monte Sinai pelo WhatsApp"
    >
      <svg className="whatsapp-brand-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M16 3.5c-6.9 0-12.5 5.2-12.5 11.65 0 2.2.66 4.34 1.9 6.17L4 27.5l6.47-1.55A13.1 13.1 0 0 0 16 27.2c6.9 0 12.5-5.2 12.5-11.65S22.9 3.5 16 3.5Z"
        />
        <path
          fill="#fff"
          d="M10.15 8.55c.68-.55 1.68-.42 2.2.28l1.42 1.92c.42.57.36 1.35-.14 1.85l-.9.9a11.9 11.9 0 0 0 5.76 5.76l.9-.9c.5-.5 1.28-.56 1.85-.14l1.92 1.42c.7.52.83 1.52.28 2.2l-.73.9c-.85 1.05-2.27 1.48-3.56 1.08A17.42 17.42 0 0 1 8.17 12.84c-.4-1.3.03-2.72 1.08-3.57l.9-.72Z"
        />
      </svg>
      <span>WhatsApp</span>
    </a>
  );
}

function isInternalProfile(profile: ProfileAccess | null) {
  const role = (profile?.role || '').toLowerCase();
  const adminRole = (profile?.admin_role || '').toLowerCase();
  return Boolean(profile?.is_admin || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(role) || ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'].includes(adminRole));
}
