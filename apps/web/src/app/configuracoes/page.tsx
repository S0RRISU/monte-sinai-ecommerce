import Link from 'next/link';
import { ChevronRight, Settings2 } from 'lucide-react';
import { CustomerSettingsContent } from '@/components/store/customer-settings-content';
import { StoreShell } from '@/components/store/store-shell';
import { getStorefrontConfig } from '@/lib/storefront-data';

export default async function SettingsPage() {
  const siteConfig = await getStorefrontConfig();
  const whatsappHref = `https://wa.me/${siteConfig.whatsapp.replace(/\D/g, '')}`;

  return (
    <StoreShell minimalHeader hideWhatsApp>
      <main className="store-main settings-app-page">
        <section className="settings-title-row">
          <div>
            <span><Settings2 className="size-5" /> Central de preferencias</span>
            <h1>Configuracoes</h1>
            <p>Personalize a experiencia, a conta e os dados usados neste aparelho.</p>
          </div>
          <Link href="/conta/detalhes" className="settings-profile-chip">
            <span>MS</span>
            <small>
              Detalhes
              <b>Conta</b>
            </small>
            <ChevronRight className="size-4" />
          </Link>
        </section>

        <CustomerSettingsContent whatsappHref={whatsappHref} />
      </main>
    </StoreShell>
  );
}
