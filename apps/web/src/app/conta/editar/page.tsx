import { CustomerProfileEditContent } from '@/components/store/customer-profile-edit-content';
import { StoreShell } from '@/components/store/store-shell';

export default function AccountEditPage() {
  return (
    <StoreShell minimalHeader hideWhatsApp>
      <main className="store-main account-page profile-page">
        <CustomerProfileEditContent />
      </main>
    </StoreShell>
  );
}
