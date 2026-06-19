'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { fetchStoreProfile, type StoreProfile } from '@/lib/profile-access';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type StoreIndicatorsValue = {
  cartQuantity: number;
  internalAccess: boolean;
  openOrderCount: number;
};

type OrderStatusRow = {
  status?: string | null;
};

const StoreIndicatorsContext = createContext<StoreIndicatorsValue>({
  cartQuantity: 0,
  internalAccess: false,
  openOrderCount: 0
});

export function StoreIndicatorsProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const items = useCartStore((state) => state.items);
  const [internalAccess, setInternalAccess] = useState(false);
  const [openOrderCount, setOpenOrderCount] = useState(0);
  const cartQuantity = getCartTotals(items).quantity;

  const refreshOrderCount = useCallback(async () => {
    if (!internalAccess) {
      setOpenOrderCount(0);
      return;
    }

    const { data, error } = await supabase.from('pedidos').select('status').limit(1000);
    if (error) return;
    const rows = (data || []) as OrderStatusRow[];
    setOpenOrderCount(rows.filter((row) => isOpenOrder(row.status)).length);
  }, [internalAccess, supabase]);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!active) return;

      if (!user) {
        setInternalAccess(false);
        setOpenOrderCount(0);
        return;
      }

      try {
        const profile = await fetchStoreProfile(supabase, user.id);
        const nextInternalAccess = hasInternalAccess(profile, user);
        if (active) setInternalAccess(nextInternalAccess);
        if (nextInternalAccess) {
          const { data: orderRows } = await supabase.from('pedidos').select('status').limit(1000);
          if (active) setOpenOrderCount(((orderRows || []) as OrderStatusRow[]).filter((row) => isOpenOrder(row.status)).length);
        } else if (active) setOpenOrderCount(0);
      } catch {
        const nextInternalAccess = hasInternalAccess(null, user);
        if (active) setInternalAccess(nextInternalAccess);
        if (!nextInternalAccess && active) setOpenOrderCount(0);
      }
    }

    void loadAccess();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(() => void loadAccess());

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!internalAccess) return;

    const channel = supabase
      .channel('store-order-indicator-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => void refreshOrderCount())
      .subscribe();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshOrderCount();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [internalAccess, refreshOrderCount, supabase]);

  return (
    <StoreIndicatorsContext.Provider value={{ cartQuantity, internalAccess, openOrderCount }}>
      {children}
    </StoreIndicatorsContext.Provider>
  );
}

export function useStoreIndicators() {
  return useContext(StoreIndicatorsContext);
}

function isOpenOrder(status: string | null | undefined) {
  const normalized = (status || '').trim().toLowerCase();
  return !['entregue', 'cancelado', 'cancelada'].includes(normalized);
}

function hasInternalAccess(profile: StoreProfile | null, user: User) {
  const allowed = ['developer', 'owner', 'admin', 'staff', 'equipe', 'motoboy'];
  const profileRole = (profile?.role || '').toLowerCase();
  const profileAdminRole = (profile?.admin_role || '').toLowerCase();
  const appRole = typeof user.app_metadata?.role === 'string' ? user.app_metadata.role.toLowerCase() : '';
  const appAdminRole = typeof user.app_metadata?.admin_role === 'string' ? user.app_metadata.admin_role.toLowerCase() : '';

  return Boolean(
    profile?.is_admin ||
      user.app_metadata?.is_admin === true ||
      allowed.includes(profileRole) ||
      allowed.includes(profileAdminRole) ||
      allowed.includes(appRole) ||
      allowed.includes(appAdminRole)
  );
}
