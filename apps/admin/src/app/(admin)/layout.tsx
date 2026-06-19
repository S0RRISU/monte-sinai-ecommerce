import { Suspense } from 'react';
import { AdminGate } from '@/components/admin/admin-gate';
import { AdminShell } from '@/components/admin/admin-shell';
import { SkeletonPanel } from '@/components/ui/skeleton';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-admin p-4 md:p-8"><SkeletonPanel /></main>}>
      <AdminGate>
        <AdminShell>{children}</AdminShell>
      </AdminGate>
    </Suspense>
  );
}
