'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getCurrentProfile, signOut } from '@/lib/admin-services';
import { canAccessModule, moduleFromPath } from '@/lib/module-access';
import { canAccessAdmin } from '@/lib/roles';
import { useAdminStore } from '@/store/admin-store';
import { SkeletonPanel } from '@/components/ui/skeleton';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPath = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const { profile, loading, setProfile, setLoading, setError } = useAdminStore();
  const noAccessPath = pathname === '/sem-acesso';

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const nextProfile = await getCurrentProfile();
        if (!active) return;
        if (!nextProfile) {
          router.replace(`/login?next=${encodeURIComponent(currentPath)}`);
          return;
        }
        setProfile(nextProfile);
        if (!canAccessAdmin(nextProfile.role)) {
          await signOut();
          setProfile(null);
          router.replace(`/login?next=${encodeURIComponent('/dashboard')}&semAcesso=1`);
          return;
        }
        if (!canAccessModule(nextProfile.role, nextProfile.moduleAccess, moduleFromPath(pathname))) {
          if (!noAccessPath) router.replace('/sem-acesso');
        }
      } catch (error) {
        if (!active) return;
        setError(error instanceof Error ? error.message : 'Falha ao validar acesso administrativo.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [currentPath, noAccessPath, pathname, router, setError, setLoading, setProfile]);

  if (loading && !profile) {
    return (
      <main className="min-h-screen bg-admin p-4 md:p-8">
        <SkeletonPanel />
      </main>
    );
  }

  if (!profile || (!noAccessPath && !canAccessAdmin(profile.role))) {
    return (
      <main className="min-h-screen bg-admin p-4 md:p-8">
        <SkeletonPanel />
      </main>
    );
  }

  return <>{children}</>;
}
