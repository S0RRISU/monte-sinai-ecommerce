import Link from 'next/link';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  FileText,
  Headphones,
  HelpCircle,
  Info,
  Languages,
  LockKeyhole,
  LogOut,
  MapPin,
  MessageCircle,
  MonitorCog,
  Moon,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { ThemeSettings } from '@/components/store/theme-settings';
import { adminPanelUrl } from '@/lib/admin-link';

const sections = [
  {
    title: 'Conta e pedidos',
    items: [
      { label: 'Endereços', text: 'Gerencie seus endereços de entrega', href: '/conta', icon: MapPin },
      { label: 'Métodos de pagamento', text: 'Adicione, edite ou remova cartões', href: '/configuracoes', icon: CreditCard },
      { label: 'Notificações', text: 'Escolha como deseja receber avisos', href: '/configuracoes', icon: Bell },
      { label: 'Preferências de entrega', text: 'Horários, instruções e outras opções', href: '/configuracoes', icon: Truck }
    ]
  },
  {
    title: 'Ajuda e suporte',
    items: [
      { label: 'Ajuda', text: 'Perguntas frequentes e como usar', href: '/configuracoes', icon: HelpCircle },
      { label: 'WhatsApp', text: 'Fale conosco pelo WhatsApp', href: '/configuracoes', icon: MessageCircle },
      { label: 'Central de suporte', text: 'Abra um chamado ou acompanhe', href: '/configuracoes', icon: Headphones }
    ]
  },
  {
    title: 'Sobre',
    items: [
      { label: 'Sobre a Monte Sinai', text: 'Conheça mais sobre nossa empresa', href: '/configuracoes', icon: Info },
      { label: 'Política de privacidade', text: 'Como tratamos seus dados', href: '/configuracoes', icon: LockKeyhole },
      { label: 'Termos e condições', text: 'Leia nossos termos de uso', href: '/configuracoes', icon: FileText }
    ]
  }
];

export default function SettingsPage() {
  return (
    <StoreShell minimalHeader>
      <main className="store-main settings-app-page">
        <section className="settings-topbar">
          <img src="/brand/monte-sinai-logo-transparente.png" alt="Monte Sinai" />
          <button type="button">
            <MapPin className="size-4" />
            <span>
              <strong>Rua das Palmeiras, 123</strong>
              <small>Jardim das Flores</small>
            </span>
            <ChevronDown className="size-4" />
          </button>
        </section>

        <section className="settings-title-row">
          <div>
            <h1>Configurações</h1>
            <p>Gerencie sua conta, preferências e app.</p>
          </div>
          <Link href="/conta" className="settings-profile-chip">
            <span>MS</span>
            <small>
              Olá, Marcos
              <b>Ver perfil</b>
            </small>
            <ChevronRight className="size-4" />
          </Link>
        </section>

        <div className="settings-desktop-grid">
          <div className="settings-desktop-main">
            {sections.slice(0, 1).map((section) => (
              <SettingsSection key={section.title} title={section.title} items={section.items} />
            ))}

            <section className="settings-section">
              <h2>App e preferências</h2>
              <div className="settings-list">
                <div className="settings-list-row theme-row">
                  <Moon className="size-6" />
                  <span>
                    <strong>Tema do app</strong>
                    <small>Use o padrão do aparelho ou escolha manualmente</small>
                  </span>
                  <ThemeSettings />
                </div>
                <Link href="/configuracoes" className="settings-list-row">
                  <Languages className="size-6" />
                  <span>
                    <strong>Tamanho do texto</strong>
                    <small>Ajuste o tamanho do texto do aplicativo</small>
                  </span>
                  <em>Médio</em>
                  <ChevronRight className="size-5" />
                </Link>
                <Link href="/configuracoes" className="settings-list-row">
                  <ShieldCheck className="size-6" />
                  <span>
                    <strong>Privacidade e segurança</strong>
                    <small>Gerencie seus dados e permissões</small>
                  </span>
                  <ChevronRight className="size-5" />
                </Link>
              </div>
            </section>
          </div>

          <aside className="settings-desktop-side">
            {sections.slice(1).map((section) => (
              <SettingsSection key={section.title} title={section.title} items={section.items} />
            ))}
            <section className="settings-admin-card">
              <span>
                <MonitorCog className="size-6" />
              </span>
              <div>
                <small>Equipe Monte Sinai</small>
                <strong>Painel administrativo</strong>
                <p>Abra o app do painel para gerenciar pedidos, produtos e estoque.</p>
              </div>
              <a href={adminPanelUrl} target="_blank" rel="noreferrer">
                Abrir painel
                <ExternalLink className="size-4" />
              </a>
            </section>
            <section className="settings-section">
              <div className="settings-list">
                <button type="button" className="settings-list-row logout-settings-row">
                  <LogOut className="size-6" />
                  <span>
                    <strong>Sair da conta</strong>
                    <small>Encerrar sessão neste dispositivo</small>
                  </span>
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </StoreShell>
  );
}

function SettingsSection({
  title,
  items
}: {
  title: string;
  items: Array<{ label: string; text: string; href: string; icon: typeof MapPin }>;
}) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-list">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="settings-list-row">
            <item.icon className="size-6" />
            <span>
              <strong>{item.label}</strong>
              <small>{item.text}</small>
            </span>
            <ChevronRight className="size-5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
