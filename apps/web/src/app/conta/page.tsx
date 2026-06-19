import { CustomerAccountContent } from '@/components/store/customer-account-content';
import { StoreShell } from '@/components/store/store-shell';

export default function AccountPage() {
  return (
    <StoreShell minimalHeader hideWhatsApp>
      <main className="store-main account-page profile-page">
        <CustomerAccountContent />
      </main>
    </StoreShell>
  );
}
