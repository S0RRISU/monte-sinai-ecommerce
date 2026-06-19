import { CustomerAccountDetailsContent } from '@/components/store/customer-account-details-content';
import { StoreShell } from '@/components/store/store-shell';

export default function AccountDetailsPage() {
  return (
    <StoreShell minimalHeader hideWhatsApp>
      <main className="store-main account-page profile-page">
        <CustomerAccountDetailsContent />
      </main>
    </StoreShell>
  );
}
