import Link from 'next/link';
import Image from 'next/image';
import {
  AtSign,
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
} from 'lucide-react';
import { getStorefrontConfig } from '@/lib/storefront-data';
import { visibleStoreCategories, type StorefrontSiteConfig } from '@/lib/site-config';
import { CartShortcut } from './cart-shortcut';
import { DeliveryLocationChip } from './delivery-location-chip';
import { HeaderAccountShortcut } from './header-account-shortcut';
import { MobileBottomNav } from './mobile-bottom-nav';
import { OrdersShortcut } from './orders-shortcut';
import { StoreIndicatorsProvider } from './store-indicators';
import { StoreAppInstallProvider, StoreFirstVisitInstall } from './store-app-install';
import { StoreMenu } from './store-menu';
import { WhatsAppFloatingButton } from './whatsapp-floating-button';

export async function StoreShell({
  children,
  minimalHeader = false,
  hideFooter = false,
  hideMobileNav = false,
  hideWhatsApp = false
}: {
  children: React.ReactNode;
  minimalHeader?: boolean;
  hideFooter?: boolean;
  hideMobileNav?: boolean;
  hideWhatsApp?: boolean;
}) {
  const siteConfig = await getStorefrontConfig();
  const visibleCategories = visibleStoreCategories(siteConfig);

  return (
    <StoreIndicatorsProvider>
    <StoreAppInstallProvider>
    <div className={`store-shell ${minimalHeader ? 'is-minimal-shell' : ''}`}>
      <TopNotice config={siteConfig} />
      <header className="store-header">
        <div className="store-header-row">
          <StoreMenu categories={visibleCategories} config={siteConfig} />

          <Link className="store-logo" href="/" aria-label={`${siteConfig.name} inicio`}>
            <Image
              src="/brand/monte-sinai-logo-transparente.png"
              alt={siteConfig.name}
              width={256}
              height={126}
              sizes="160px"
              quality={72}
              priority
            />
          </Link>

          <DeliveryLocationChip
            deliveryAreas={siteConfig.deliveryAreas}
            storeAddress={siteConfig.address}
            businessHours={siteConfig.businessHours}
          />

          <form className="search-box" role="search" action="/produtos">
            <input name="q" aria-label="Buscar produtos" placeholder="Busque por produtos, marcas e muito mais..." suppressHydrationWarning />
            <button type="submit" className="search-submit" aria-label="Buscar">
              <Search className="size-5" />
            </button>
          </form>

          <nav className="header-shortcuts" aria-label="Acoes da loja">
            <OrdersShortcut />
            <CartShortcut />
            <HeaderAccountShortcut />
          </nav>
        </div>

        <form className="mobile-search" role="search" action="/produtos">
          <input name="q" aria-label="Buscar produtos" placeholder="Buscar agua, gas, limpeza..." suppressHydrationWarning />
          <button type="submit" className="mobile-search-submit" aria-label="Buscar">
            <Search className="size-5" />
          </button>
        </form>
      </header>

      <StoreFirstVisitInstall />

      {children}

      {hideFooter ? null : <footer className="store-footer">
        <section className="footer-service-row" aria-label="Diferenciais Monte Sinai">
          <article>
            <Truck className="size-5" />
            <span>
              <strong>Entrega local</strong>
              <small>{siteConfig.allowDelivery ? 'Chega rapido na sua casa.' : 'Consulte retirada.'}</small>
            </span>
          </article>
          <article>
            <MessageCircle className="size-5" />
            <span>
              <strong>Atendimento direto</strong>
              <small>Voce fala com a loja.</small>
            </span>
          </article>
          <article>
            <ShieldCheck className="size-5" />
            <span>
              <strong>Produto certo</strong>
              <small>Escolha antes de comprar.</small>
            </span>
          </article>
        </section>

        <div className="footer-main">
          <div className="footer-brand">
            <Image
              src="/brand/monte-sinai-logo-transparente.png"
              alt={siteConfig.name}
              width={256}
              height={126}
              sizes="180px"
              quality={70}
              loading="lazy"
            />
            <p>{siteConfig.tagline || 'Agua, gas e limpeza para abastecer sua casa.'}</p>
            <Link href="/produtos" className="footer-primary-link">
              Comprar agora
            </Link>
          </div>

          <nav className="footer-column" aria-label="Links da loja">
            <h2>Loja</h2>
            <Link href="/sobre">Sobre</Link>
            <Link href="/produtos">Produtos</Link>
            <Link href="/produtos?categoria=ofertas">Ofertas</Link>
            <Link href="/pedidos">Pedidos</Link>
            <Link href="/carrinho">Carrinho</Link>
            <Link href="/conta">Area do cliente</Link>
          </nav>

          <nav className="footer-column" aria-label="Categorias">
            <h2>Produtos</h2>
            {visibleCategories.map((category) => (
              <Link key={category.id} href={`/produtos?categoria=${category.id}`}>
                {category.label}
              </Link>
            ))}
          </nav>

          <div className="footer-column footer-contact">
            <h2>Atendimento</h2>
            <p>
              <MapPin className="size-4" />
              {siteConfig.address || 'Endereco a confirmar'}
            </p>
            <p>
              <Clock className="size-4" />
              {siteConfig.businessHours}
            </p>
            <p>
              <MessageCircle className="size-4" />
              WhatsApp {formatPhone(siteConfig.whatsapp)}
            </p>
            {siteConfig.contactEmail ? (
              <p>
                <Mail className="size-4" />
                {siteConfig.contactEmail}
              </p>
            ) : null}
            {siteConfig.instagram ? (
              <p>
                <AtSign className="size-4" />
                {siteConfig.instagram}
              </p>
            ) : null}
          </div>
        </div>

        <section className="footer-mobile-panel" aria-label="Rodape mobile">
          <div className="footer-mobile-brand">
            <Image
              src="/brand/monte-sinai-logo-transparente.png"
              alt={siteConfig.name}
              width={224}
              height={110}
              sizes="150px"
              quality={70}
              loading="lazy"
            />
            <p>{siteConfig.tagline || 'Agua, gas e limpeza com entrega local.'}</p>
          </div>
          <div className="footer-mobile-chips" aria-label="Categorias rapidas">
            {visibleCategories.slice(0, 4).map((category) => (
              <Link key={category.id} href={`/produtos?categoria=${category.id}`}>
                {category.label}
              </Link>
            ))}
          </div>
          <p className="footer-mobile-contact">
            <MessageCircle className="size-4" />
            WhatsApp {formatPhone(siteConfig.whatsapp)}
          </p>
        </section>

        <div className="footer-bottom">
          <span>{siteConfig.name}</span>
        </div>
      </footer>}

      {hideMobileNav ? null : <MobileBottomNav />}
      {hideWhatsApp ? null : <WhatsAppFloatingButton phone={siteConfig.whatsapp} />}
    </div>
    </StoreAppInstallProvider>
    </StoreIndicatorsProvider>
  );
}

function TopNotice({ config }: { config: StorefrontSiteConfig }) {
  return (
    <div className="top-notice">
      <div className="top-notice-inner">
        <span>
          <MessageCircle className="size-4" />
          Atendimento {formatPhone(config.whatsapp)}
        </span>
        <strong>
          <Truck className="size-4" />
          {config.storeOpen ? config.topNotice : config.maintenanceMessage}
        </strong>
        <span>
          <Smartphone className="size-4" />
          {config.businessHours}
        </span>
      </div>
    </div>
  );
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return value || 'a confirmar';
}
