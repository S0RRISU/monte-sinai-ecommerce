import { OrdersPageContent } from '@/components/store/orders-page-content';
import { StoreShell } from '@/components/store/store-shell';

export default function OrdersPage() {
  return (
    <StoreShell>
      <main className="store-main orders-page">
        <OrdersPageContent />
      </main>
    </StoreShell>
  );
}
