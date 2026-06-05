import Link from 'next/link';
import {
  Bell,
  Camera,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  LogOut,
  MapPin,
  PackageCheck,
  Percent,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound
} from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';

const quickAccess = [
  { label: 'Meus dados', text: 'Informações pessoais', href: '/conta', icon: UserRound },
  { label: 'Endereços', text: 'Endereços de entrega', href: '/conta', icon: MapPin },
  { label: 'Pagamentos', text: 'Cartões e formas de pagamento', href: '/configuracoes', icon: CreditCard },
  { label: 'Favoritos', text: 'Produtos que você ama', href: '/produtos', icon: Heart },
  { label: 'Cupons', text: 'Seus cupons e vantagens', href: '/produtos?categoria=ofertas', icon: Percent },
  { label: 'Segurança', text: 'Senha, login e verificação', href: '/configuracoes', icon: ShieldCheck },
  { label: 'Preferências', text: 'Comunicação e conteúdo', href: '/configuracoes', icon: SlidersHorizontal },
  { label: 'Configurações da conta', text: 'Tema, idioma e exclusão', href: '/configuracoes', icon: Settings }
];

const stats = [
  { label: 'Total de pedidos', value: '38 pedidos', icon: PackageCheck },
  { label: 'Gasto total', value: 'R$ 2.540,90', icon: CreditCard },
  { label: 'Pedidos este mês', value: '3 pedidos', icon: Bell },
  { label: 'Último pedido', value: '16/05/2025', icon: PackageCheck }
];

export default function AccountPage() {
  return (
    <StoreShell minimalHeader>
      <main className="store-main account-page account-app-page">
        <section className="account-app-heading">
          <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
          <div>
            <h1>Minha conta</h1>
            <p>Gerencie seu perfil e preferências</p>
          </div>
        </section>

        <div className="account-desktop-grid">
          <div className="account-desktop-main">
            <section className="account-profile-card">
              <div className="profile-photo">
                <UserRound className="size-12" />
                <button type="button" aria-label="Alterar foto">
                  <Camera className="size-4" />
                </button>
              </div>
              <div className="profile-main">
                <div className="profile-title-row">
                  <h2>Cliente Monte Sinai</h2>
                  <ChevronRight className="size-5" />
                </div>
                <span className="premium-badge">
                  <ShieldCheck className="size-4" />
                  Cliente Premium
                </span>
                <p>cliente@montesinai.com</p>
                <p>(38) 99999-9999</p>
                <Link href="/conta">Editar perfil</Link>
              </div>
              <div className="profile-points-panel">
                <small>Seus pontos</small>
                <strong>1.250 pts</strong>
                <span className="points-bar">
                  <i />
                </span>
                <Link href="/pedidos">Ver meu extrato</Link>
              </div>
            </section>

            <section className="account-stats-row">
              {stats.map((stat) => (
                <article key={stat.label}>
                  <stat.icon className="size-5" />
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </article>
              ))}
            </section>

            <section className="loyalty-card">
              <div className="loyalty-main">
                <span className="loyalty-icon">
                  <Star className="size-7" />
                </span>
                <div>
                  <small>Pontos Monte Sinai</small>
                  <strong>
                    1.250 <b>pts</b>
                  </strong>
                  <p>Faltam 250 pts para o próximo nível</p>
                  <span className="points-bar">
                    <i />
                  </span>
                  <small>Nível Ouro</small>
                </div>
              </div>
              <div className="benefit-box">
                <Gift className="size-7" />
                <strong>Benefícios</strong>
                <Link href="/produtos?categoria=ofertas">Ver ofertas</Link>
              </div>
            </section>

            <section className="quick-access-section">
              <div className="account-section-title">
                <h2>Acesso rápido</h2>
                <Link href="/configuracoes">Ver tudo</Link>
              </div>
              <div className="quick-access-grid">
                {quickAccess.map((item) => (
                  <Link key={item.label} href={item.href}>
                    <item.icon className="size-6" />
                    <strong>{item.label}</strong>
                    <small>{item.text}</small>
                    <ChevronRight className="size-4" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          <aside className="account-desktop-sidebar" aria-label="Configurações rápidas">
            <h2>Configurações</h2>
            <Link href="/configuracoes">
              <Bell className="size-5" />
              <span>
                <strong>Notificações</strong>
                <small>Gerencie alertas</small>
              </span>
              <ChevronRight className="size-5" />
            </Link>
            <Link href="/configuracoes">
              <Settings className="size-5" />
              <span>
                <strong>Aparência</strong>
                <small>Tema e preferências visuais</small>
              </span>
              <ChevronRight className="size-5" />
            </Link>
            <Link href="/configuracoes">
              <ShieldCheck className="size-5" />
              <span>
                <strong>Privacidade</strong>
                <small>Dados e permissões</small>
              </span>
              <ChevronRight className="size-5" />
            </Link>
            <div className="sidebar-help-card">
              <strong>Precisa de ajuda?</strong>
              <p>Nossa equipe está pronta para ajudar.</p>
              <Link href="/configuracoes">Falar com atendimento</Link>
            </div>
          </aside>
        </div>

        <section className="account-action-list" aria-label="Preferências da conta">
          <Link className="is-highlighted" href="/configuracoes">
            <Bell className="size-6" />
            <span>
              <strong>Preferências</strong>
              <small>Notificações, comunicação e privacidade</small>
            </span>
            <ChevronRight className="size-5" />
          </Link>
          <Link href="/configuracoes" className="account-settings-row">
            <Settings className="size-6" />
            <span>
              <strong>Configurações da conta</strong>
              <small>Idioma, tema e outras opções</small>
            </span>
            <ChevronRight className="size-5" />
          </Link>
          <button type="button" className="logout-row">
            <LogOut className="size-6" />
            <span>Sair da conta</span>
            <ChevronRight className="size-5" />
          </button>
        </section>
      </main>
    </StoreShell>
  );
}
