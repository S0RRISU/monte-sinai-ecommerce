import { Suspense } from 'react';
import { CustomerLoginContent } from '@/components/store/customer-login-content';

export default function LoginPage() {
  return (
    <main className="customer-login-screen">
      <Suspense fallback={null}>
        <CustomerLoginContent />
      </Suspense>
    </main>
  );
}
