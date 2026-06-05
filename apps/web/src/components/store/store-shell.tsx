import Link from 'next/link';
import {
  AtSign,
  BadgePercent,
  Bell,
  ChevronDown,
  ClipboardList,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  MonitorCog,
  Search,
  ShieldCheck,
  Smartphone,
  Truck,
  UserRound
} from 'lucide-react';
import { getStorefrontConfig } from '@/lib/storefront-data';
import { adminPanelUrl } from '@/lib/admin-link';
import { visibleStoreCategories, type StorefrontSiteConfig } from '@/lib/site-config';
import { CartShortcut } from './cart-shortcut';
import { CategoryIcon } from './category-icon';
import { MobileBottomNav } from './mobile-bottom-nav';

export async function StoreShell({ children, minimalHeader = false }: { children: React.ReactNode; minimalHeader?: boolean }) {
  const siteConfig = await getStorefrontConfig();
  const visibleCategories = visibleStoreCategories(siteConfig);

  return (
    <div className={`store-shell ${minimalHeader ? 'is-minimal-shell' : ''}`}>
      <TopNotice config={siteConfig} />
      <header className="store-header">
        <div className="store-header-row">
          <Link className="store-logo" href="/" aria-label={`${siteConfig.name} inicio`}>
            <img src="/brand/monte-sinai-logo-transparente.png" alt={siteConfig.name} />
          </Link>

          <button className="address-chip" type="button">
            <MapPin className="size-5" />
            <span>
              <strong>
                <span className="address-desktop-text">Entregar em:</span>
                <span className="address-mobile-text">{siteConfig.deliveryAreas || siteConfig.address || 'Cobertura local'}</span>
              </strong>
              <small>
                <span className="address-desktop-text">{siteConfig.deliveryAreas || 'Consulte cobertura'}</span>
                <span className="address-mobile-text">{siteConfig.address || siteConfig.businessHours}</span>
              </small>
            </span>
            <ChevronDown className="address-chevron size-4" />
          </button>

          <button className="mobile-notification" type="button" aria-label="Notificacoes">
            <Bell className="size-5" />
            <span aria-hidden="true" />
          </button>

          <div className="search-box" role="search">
            <input aria-label="Buscar produtos" placeholder="Busque por produtos, marcas e muito mais..." suppressHydrationWarning />
            <button type="button" className="search-submit" aria-label="Buscar">
              <Search className="size-5" />
            </button>
          </div>

          <nav className="header-shortcuts" aria-label="Acoes da loja">
            <Link href="/produtos?categoria=ofertas" className="shortcut-link">
              <BadgePercent className="size-5" />
              <span>
                <strong>Ofertas</strong>
                <small>da semana</small>
              </span>
            </Link>
            <Link href="/pedidos" className="shortcut-link">
              <ClipboardList className="size-5" />
              <span>
                <strong>Meus pedidos</strong>
                <small>Acompanhe</small>
              </span>
            </Link>
            <CartShortcut />
            <Link href="/conta" className="shortcut-link">
              <UserRound className="size-5" />
              <span>
                <strong>Minha conta</strong>
                <small>Entrar / Cadastrar</small>
              </span>
            </Link>
          </nav>
        </div>

        <label className="mobile-search">
          <Search className="size-5" />
          <input placeholder="Buscar agua, gas, limpeza..." suppressHydrationWarning />
        </label>

        <nav className="category-nav" aria-label="Categorias principais">
          {visibleCategories.map((category) => (
            <Link key={category.id} href={`/produtos?categoria=${category.id}`} className="category-tab">
              <CategoryIcon category={category.id} />
              <span>{category.label}</span>
            </Link>
          ))}
        </nav>
      </header>

      {children}

      <footer className="store-footer">
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
            <img src="/brand/monte-sinai-logo-transparente.png" alt={siteConfig.name} />
            <p>{siteConfig.tagline || 'Agua, gas e limpeza para abastecer sua casa.'}</p>
            <Link href="/produtos" className="footer-primary-link">
              Comprar agora
            </Link>
          </div>

          <nav className="footer-column" aria-label="Links da loja">
            <h2>Loja</h2>
            <Link href="/produtos">Produtos</Link>
            <Link href="/produtos?categoria=ofertas">Ofertas</Link>
            <Link href="/pedidos">Pedidos</Link>
            <Link href="/carrinho">Carrinho</Link>
            <Link href="/conta">Conta</Link>
            <a className="footer-admin-link" href={adminPanelUrl} target="_blank" rel="noreferrer">
              Painel administrativo
              <ExternalLink className="size-3" />
            </a>
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
            <img src="/brand/monte-sinai-logo-transparente.png" alt={siteConfig.name} />
            <p>{siteConfig.tagline || 'Agua, gas e limpeza com entrega local.'}</p>
          </div>
          <div className="footer-mobile-chips" aria-label="Categorias rapidas">
            {visibleCategories.slice(0, 4).map((category) => (
              <Link key={category.id} href={`/produtos?categoria=${category.id}`}>
                {category.label}
              </Link>
            ))}
            <a href={adminPanelUrl} target="_blank" rel="noreferrer">
              Painel
            </a>
          </div>
          <p className="footer-mobile-contact">
            <MessageCircle className="size-4" />
            WhatsApp {formatPhone(siteConfig.whatsapp)}
          </p>
        </section>

        <div className="footer-bottom">
          <span>{siteConfig.name}</span>
          <a className="footer-bottom-admin" href={adminPanelUrl} target="_blank" rel="noreferrer">
            <MonitorCog className="size-4" />
            Acesso do painel
          </a>
        </div>
      </footer>

      <MobileBottomNav />
    </div>
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
