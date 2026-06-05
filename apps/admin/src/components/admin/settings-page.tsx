'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Eye,
  LayoutGrid,
  LogOut,
  Moon,
  Monitor,
  Palette,
  Save,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sun,
  Truck,
  UserRound,
  type LucideIcon
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { fetchSiteConfig, saveSiteConfig, signOut } from '@/lib/admin-services';
import { officialStoreUrl } from '@/lib/constants';
import type { AdminSiteConfig } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';
import {
  useTheme,
  type AdminDarkPalette,
  type AdminLightPalette,
  type Theme
} from './theme-provider';

type SettingsSection = 'appearance' | 'store' | 'sales' | 'catalog' | 'alerts' | 'access';

const sections: Array<{ id: SettingsSection; label: string; helper: string; icon: LucideIcon }> = [
  { id: 'appearance', label: 'Aparencia', helper: 'Tema e cores do painel', icon: Palette },
  { id: 'store', label: 'Loja e site', helper: 'Identidade e funcionamento', icon: Store },
  { id: 'sales', label: 'Vendas', helper: 'Entrega, checkout e pedidos', icon: ShoppingBag },
  { id: 'catalog', label: 'Vitrine', helper: 'Categorias e exibicao', icon: LayoutGrid },
  { id: 'alerts', label: 'Alertas', helper: 'Avisos do painel', icon: Bell },
  { id: 'access', label: 'Conta e acesso', helper: 'Sessao, usuarios e logs', icon: ShieldCheck }
];

const themeChoices: Array<{ value: Theme; label: string; icon: LucideIcon }> = [
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'system', label: 'Sistema', icon: Monitor }
];

const lightPaletteChoices: Array<{
  value: AdminLightPalette;
  label: string;
  group: 'Simples' | 'Suaves' | 'Contrastados' | 'Diferenciados';
  colors: [string, string, string];
}> = [
  { value: 'clean', label: 'Branco limpo', group: 'Simples', colors: ['#ffffff', '#e5e7eb', '#0f766e'] },
  { value: 'gray', label: 'Cinza claro', group: 'Simples', colors: ['#f1f3f5', '#cbd5e1', '#475569'] },
  { value: 'mist', label: 'Nevoa', group: 'Suaves', colors: ['#f5f7fb', '#e2e8f0', '#64748b'] },
  { value: 'mint', label: 'Menta', group: 'Suaves', colors: ['#f0fdf4', '#bbf7d0', '#15803d'] },
  { value: 'sky', label: 'Ceu', group: 'Suaves', colors: ['#eff6ff', '#bfdbfe', '#2563eb'] },
  { value: 'rose', label: 'Rosa suave', group: 'Suaves', colors: ['#fff1f2', '#fecdd3', '#be123c'] },
  { value: 'contrast', label: 'Preto no branco', group: 'Contrastados', colors: ['#ffffff', '#111827', '#000000'] },
  { value: 'color', label: 'Cores vivas', group: 'Diferenciados', colors: ['#fff7ed', '#7c3aed', '#ea580c'] }
];

const darkPaletteChoices: Array<{
  value: AdminDarkPalette;
  label: string;
  group: 'Simples' | 'Suaves' | 'Contrastados' | 'Diferenciados';
  colors: [string, string, string];
}> = [
  { value: 'black', label: 'Preto puro', group: 'Simples', colors: ['#000000', '#171717', '#ffffff'] },
  { value: 'graphite', label: 'Grafite', group: 'Simples', colors: ['#111827', '#334155', '#94a3b8'] },
  { value: 'soft', label: 'Noturno suave', group: 'Suaves', colors: ['#1c1c24', '#343442', '#a3a3b2'] },
  { value: 'forest', label: 'Floresta', group: 'Suaves', colors: ['#071510', '#164e3a', '#34d399'] },
  { value: 'ocean', label: 'Oceano', group: 'Suaves', colors: ['#061525', '#164e63', '#38bdf8'] },
  { value: 'wine', label: 'Vinho', group: 'Diferenciados', colors: ['#1f0711', '#881337', '#fb7185'] },
  { value: 'neon', label: 'Neon', group: 'Contrastados', colors: ['#030712', '#00ff9d', '#c4ff00'] },
  { value: 'sunset', label: 'Por do sol', group: 'Diferenciados', colors: ['#1b0a15', '#c2410c', '#facc15'] }
];

const categoryChoices = [
  { value: 'agua', label: 'Agua' },
  { value: 'gas', label: 'Gas' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'utensilios', label: 'Utensilios' },
  { value: 'ofertas', label: 'Ofertas' }
];

const defaultConfig: AdminSiteConfig = {
  name: 'Monte Sinai',
  tagline: 'Agua, gas e limpeza',
  whatsapp: '5511960928234',
  contactEmail: '',
  instagram: '',
  address: '',
  businessHours: 'Seg. a sab. 09h-20h / Dom. 09h-14h',
  topNotice: 'Atendimento pelo WhatsApp e entregas todos os dias.',
  storeOpen: true,
  maintenanceMessage: 'A loja esta temporariamente fechada. Voltaremos em breve.',
  checkoutMessage: 'A loja confirma os detalhes pelo WhatsApp antes de separar o pedido.',
  deliveryFee: '',
  freeDeliveryMinimum: '80',
  minimumOrder: '',
  deliveryAreas: '',
  allowDelivery: true,
  allowPickup: true,
  showUnavailableProducts: false,
  featuredProductSlug: '',
  visibleCategories: 'agua,gas,limpeza,utensilios,ofertas',
  productSort: 'catalog',
  showFeaturedSection: true,
  showOffersSection: true,
  defaultOrderStatus: 'Recebido',
  defaultPaymentStatus: 'Pendente',
  defaultOrderOrigin: 'site',
  whatsappTemplate: 'Ola, quero confirmar meu pedido {{codigo}} no valor de {{total}}.',
  acceptPix: true,
  acceptCash: true,
  acceptCard: true,
  requireEmail: false,
  blockUnavailableProducts: true,
  alertNewOrders: true,
  alertLowStock: true,
  alertUnavailableProducts: true,
  alertCheckoutErrors: true
};

export function AdminSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    theme,
    resolvedTheme,
    setTheme,
    lightPalette,
    setLightPalette,
    darkPalette,
    setDarkPalette
  } = useTheme();
  const { profile, addNotification } = useAdminStore();
  const [activeSection, setActiveSection] = useState<SettingsSection>('store');
  const [config, setConfig] = useState<AdminSiteConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const selectedCategories = useMemo(
    () => new Set(config.visibleCategories.split(',').map((category) => category.trim()).filter(Boolean)),
    [config.visibleCategories]
  );
  const currentSection = sections.find((section) => section.id === activeSection) || sections[0];

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      try {
        const nextConfig = await fetchSiteConfig();
        if (active) setConfig(nextConfig);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar as configuracoes do site.');
      }
    }

    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  function updateConfig<K extends keyof AdminSiteConfig>(field: K, value: AdminSiteConfig[K]) {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  function toggleCategory(category: string) {
    const next = new Set(selectedCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    const ordered = categoryChoices.map((item) => item.value).filter((item) => next.has(item));
    updateConfig('visibleCategories', ordered.join(','));
  }

  async function saveAll() {
    setSaving(true);
    setError('');
    try {
      const savedConfig = await saveSiteConfig(config);
      setConfig(savedConfig);
      setSaved(true);
      addNotification({
        title: 'Configuracoes salvas',
        detail: 'Painel, loja, vitrine, checkout e alertas foram atualizados.',
        tone: 'success',
        href: '/configuracoes'
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar as configuracoes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-settings-page is-compact">
      <PageHeader
        title="Configuracoes"
        description="Controle central do painel e da loja oficial."
        className="settings-page-header"
        action={
          <button type="button" className="admin-button admin-button-primary" onClick={saveAll} disabled={saving}>
            <Save className="size-4" />
            {saving ? 'Salvando...' : 'Salvar alteracoes'}
          </button>
        }
      />

      {error ? <div className="settings-alert is-error">{error}</div> : null}
      {saved ? (
        <div className="settings-alert is-success">
          <CheckCircle2 className="size-4" /> Alteracoes salvas
        </div>
      ) : null}

      <div className="settings-workspace">
        <aside className="settings-navigation" aria-label="Categorias de configuracao">
          <div className="settings-store-status">
            <span className={config.storeOpen ? 'is-open' : 'is-closed'} />
            <div>
              <strong>{config.storeOpen ? 'Loja aberta' : 'Loja fechada'}</strong>
              <small>{config.name || 'Monte Sinai'}</small>
            </div>
          </div>

          <nav>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'is-active' : ''}
                onClick={() => setActiveSection(section.id)}
              >
                <section.icon className="size-4" />
                <span>
                  <strong>{section.label}</strong>
                  <small>{section.helper}</small>
                </span>
              </button>
            ))}
          </nav>

          <a className="settings-store-link" href={officialStoreUrl} target="_blank" rel="noreferrer">
            Abrir loja
            <ExternalLink className="size-4" />
          </a>
        </aside>

        <div className="settings-content">
          <header className="settings-content-header">
            <span>
              <currentSection.icon className="size-5" />
            </span>
            <div>
              <h2>{currentSection.label}</h2>
              <p>{currentSection.helper}</p>
            </div>
          </header>

          {activeSection === 'appearance' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Tema do painel" icon={Monitor}>
                <div className="settings-segmented" role="radiogroup" aria-label="Tema">
                  {themeChoices.map((item) => (
                    <button key={item.value} type="button" className={theme === item.value ? 'is-selected' : ''} onClick={() => setTheme(item.value)}>
                      <item.icon className="size-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </SettingsPanel>

              <SettingsPanel title="Paletas independentes" icon={Palette}>
                <p className="settings-theme-note">
                  O modo atual e <strong>{resolvedTheme === 'light' ? 'claro' : 'escuro'}</strong>. Cada modo guarda sua propria paleta.
                </p>
                <PaletteCollection
                  title="Paleta do modo claro"
                  active={lightPalette}
                  choices={lightPaletteChoices}
                  onSelect={(value) => setLightPalette(value as AdminLightPalette)}
                />
                <PaletteCollection
                  title="Paleta do modo escuro"
                  active={darkPalette}
                  choices={darkPaletteChoices}
                  onSelect={(value) => setDarkPalette(value as AdminDarkPalette)}
                />
              </SettingsPanel>
            </div>
          ) : null}

          {activeSection === 'store' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Identidade" icon={Store}>
                <div className="settings-form-grid">
                  <Field label="Nome da loja" value={config.name} onChange={(value) => updateConfig('name', value)} />
                  <Field label="Slogan" value={config.tagline} onChange={(value) => updateConfig('tagline', value)} />
                  <Field label="WhatsApp" value={config.whatsapp} onChange={(value) => updateConfig('whatsapp', value)} />
                  <Field label="E-mail de contato" value={config.contactEmail} onChange={(value) => updateConfig('contactEmail', value)} />
                  <Field label="Instagram" value={config.instagram} onChange={(value) => updateConfig('instagram', value)} />
                  <Field label="Endereco" value={config.address} onChange={(value) => updateConfig('address', value)} />
                </div>
              </SettingsPanel>

              <SettingsPanel title="Funcionamento" icon={Settings2}>
                <div className="settings-toggle-list is-compact">
                  <Toggle label="Loja aberta para pedidos" checked={config.storeOpen} onChange={() => updateConfig('storeOpen', !config.storeOpen)} />
                </div>
                <div className="settings-form-grid">
                  <Field label="Horario de funcionamento" value={config.businessHours} onChange={(value) => updateConfig('businessHours', value)} wide />
                  <Field label="Aviso no topo do site" value={config.topNotice} onChange={(value) => updateConfig('topNotice', value)} wide />
                  <TextAreaField
                    label="Mensagem quando a loja estiver fechada"
                    value={config.maintenanceMessage}
                    onChange={(value) => updateConfig('maintenanceMessage', value)}
                  />
                </div>
              </SettingsPanel>
            </div>
          ) : null}

          {activeSection === 'sales' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Entrega e retirada" icon={Truck}>
                <div className="settings-toggle-list is-compact">
                  <Toggle label="Permitir entrega" checked={config.allowDelivery} onChange={() => updateConfig('allowDelivery', !config.allowDelivery)} />
                  <Toggle label="Permitir retirada" checked={config.allowPickup} onChange={() => updateConfig('allowPickup', !config.allowPickup)} />
                </div>
                <div className="settings-form-grid">
                  <Field label="Taxa padrao" value={config.deliveryFee} onChange={(value) => updateConfig('deliveryFee', value)} />
                  <Field label="Frete gratis acima" value={config.freeDeliveryMinimum} onChange={(value) => updateConfig('freeDeliveryMinimum', value)} />
                  <Field label="Pedido minimo" value={config.minimumOrder} onChange={(value) => updateConfig('minimumOrder', value)} />
                  <Field label="Areas atendidas" value={config.deliveryAreas} onChange={(value) => updateConfig('deliveryAreas', value)} />
                </div>
              </SettingsPanel>

              <SettingsPanel title="Checkout e pagamentos" icon={CreditCard}>
                <div className="settings-toggle-list is-compact">
                  <Toggle label="Pix na entrega" checked={config.acceptPix} onChange={() => updateConfig('acceptPix', !config.acceptPix)} />
                  <Toggle label="Dinheiro" checked={config.acceptCash} onChange={() => updateConfig('acceptCash', !config.acceptCash)} />
                  <Toggle label="Cartao na entrega" checked={config.acceptCard} onChange={() => updateConfig('acceptCard', !config.acceptCard)} />
                  <Toggle label="Exigir e-mail" checked={config.requireEmail} onChange={() => updateConfig('requireEmail', !config.requireEmail)} />
                  <Toggle
                    label="Bloquear indisponiveis"
                    checked={config.blockUnavailableProducts}
                    onChange={() => updateConfig('blockUnavailableProducts', !config.blockUnavailableProducts)}
                  />
                </div>
                <TextAreaField label="Mensagem do checkout" value={config.checkoutMessage} onChange={(value) => updateConfig('checkoutMessage', value)} />
              </SettingsPanel>

              <SettingsPanel title="Padroes dos pedidos" icon={ShoppingBag}>
                <div className="settings-form-grid">
                  <SelectField
                    label="Status inicial"
                    value={config.defaultOrderStatus}
                    onChange={(value) => updateConfig('defaultOrderStatus', value as AdminSiteConfig['defaultOrderStatus'])}
                    options={[
                      { value: 'Recebido', label: 'Recebido' },
                      { value: 'A confirmar', label: 'A confirmar' }
                    ]}
                  />
                  <SelectField
                    label="Pagamento"
                    value={config.defaultPaymentStatus}
                    onChange={(value) => updateConfig('defaultPaymentStatus', value as AdminSiteConfig['defaultPaymentStatus'])}
                    options={[
                      { value: 'Pendente', label: 'Pendente' },
                      { value: 'Pago', label: 'Pago' }
                    ]}
                  />
                  <SelectField
                    label="Origem"
                    value={config.defaultOrderOrigin}
                    onChange={(value) => updateConfig('defaultOrderOrigin', value as AdminSiteConfig['defaultOrderOrigin'])}
                    options={[
                      { value: 'site', label: 'Site' },
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'telefone', label: 'Telefone' },
                      { value: 'presencial', label: 'Presencial' }
                    ]}
                  />
                </div>
                <TextAreaField label="Modelo de mensagem do WhatsApp" value={config.whatsappTemplate} onChange={(value) => updateConfig('whatsappTemplate', value)} />
              </SettingsPanel>
            </div>
          ) : null}

          {activeSection === 'catalog' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Secoes da pagina inicial" icon={Eye}>
                <div className="settings-toggle-list is-compact">
                  <Toggle
                    label="Mais pedidos"
                    checked={config.showFeaturedSection}
                    onChange={() => updateConfig('showFeaturedSection', !config.showFeaturedSection)}
                  />
                  <Toggle
                    label="Ofertas da semana"
                    checked={config.showOffersSection}
                    onChange={() => updateConfig('showOffersSection', !config.showOffersSection)}
                  />
                  <Toggle
                    label="Mostrar indisponiveis"
                    checked={config.showUnavailableProducts}
                    onChange={() => updateConfig('showUnavailableProducts', !config.showUnavailableProducts)}
                  />
                </div>
                <div className="settings-form-grid">
                  <Field label="Produto em destaque (slug)" value={config.featuredProductSlug} onChange={(value) => updateConfig('featuredProductSlug', value)} />
                  <SelectField
                    label="Ordem dos produtos"
                    value={config.productSort}
                    onChange={(value) => updateConfig('productSort', value as AdminSiteConfig['productSort'])}
                    options={[
                      { value: 'catalog', label: 'Ordem do catalogo' },
                      { value: 'name', label: 'Nome' },
                      { value: 'offers', label: 'Ofertas primeiro' }
                    ]}
                  />
                </div>
              </SettingsPanel>

              <SettingsPanel title="Categorias visiveis" icon={LayoutGrid}>
                <div className="settings-category-grid">
                  {categoryChoices.map((category) => (
                    <button
                      key={category.value}
                      type="button"
                      className={selectedCategories.has(category.value) ? 'is-selected' : ''}
                      onClick={() => toggleCategory(category.value)}
                    >
                      <span>{selectedCategories.has(category.value) ? <CheckCircle2 className="size-4" /> : null}</span>
                      {category.label}
                    </button>
                  ))}
                </div>
              </SettingsPanel>
            </div>
          ) : null}

          {activeSection === 'alerts' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Notificacoes operacionais" icon={Bell}>
                <div className="settings-toggle-list is-compact">
                  <Toggle label="Pedido novo" checked={config.alertNewOrders} onChange={() => updateConfig('alertNewOrders', !config.alertNewOrders)} />
                  <Toggle label="Estoque baixo" checked={config.alertLowStock} onChange={() => updateConfig('alertLowStock', !config.alertLowStock)} />
                  <Toggle
                    label="Produto indisponivel"
                    checked={config.alertUnavailableProducts}
                    onChange={() => updateConfig('alertUnavailableProducts', !config.alertUnavailableProducts)}
                  />
                  <Toggle label="Erro no checkout" checked={config.alertCheckoutErrors} onChange={() => updateConfig('alertCheckoutErrors', !config.alertCheckoutErrors)} />
                </div>
              </SettingsPanel>
            </div>
          ) : null}

          {activeSection === 'access' ? (
            <div className="settings-section-grid">
              <SettingsPanel title="Conta atual" icon={UserRound}>
                <div className="settings-account-compact">
                  <span className="settings-account-avatar">
                    {profile?.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name || 'Administrador'} /> : <UserRound className="size-5" />}
                  </span>
                  <span>
                    <strong>{profile?.name || 'Administrador'}</strong>
                    <small>{profile?.email || 'Sessao ativa'}</small>
                  </span>
                </div>
                <div className="settings-row-actions">
                  <button type="button" onClick={() => void switchAccount(router, pathname)}>
                    <UserRound className="size-4" />
                    Trocar conta
                  </button>
                  <button type="button" onClick={() => void handleSignOut(router)}>
                    <LogOut className="size-4" />
                    Sair
                  </button>
                </div>
              </SettingsPanel>

              <SettingsPanel title="Administracao" icon={ShieldCheck}>
                <div className="settings-row-actions">
                  <button type="button" onClick={() => router.push('/usuarios')}>
                    Usuarios e permissoes
                  </button>
                  <button type="button" onClick={() => router.push('/logs')}>
                    Logs de auditoria
                  </button>
                </div>
              </SettingsPanel>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SettingsPanel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <article className="settings-panel settings-panel-compact">
      <header>
        <span>
          <Icon className="size-4" />
        </span>
        <h3>{title}</h3>
      </header>
      {children}
    </article>
  );
}

function PaletteCollection({
  title,
  active,
  choices,
  onSelect
}: {
  title: string;
  active: string;
  choices: Array<{ value: string; label: string; group: string; colors: [string, string, string] }>;
  onSelect: (value: string) => void;
}) {
  return (
    <section className="settings-palette-collection">
      <h4>{title}</h4>
      <div className="settings-palette-grid" role="radiogroup" aria-label={title}>
        {choices.map((item) => (
          <button key={item.value} type="button" className={active === item.value ? 'is-selected' : ''} onClick={() => onSelect(item.value)}>
            <span>
              {item.colors.map((color) => (
                <i key={color} style={{ backgroundColor: color }} />
              ))}
            </span>
            <strong>{item.label}</strong>
            <small>{item.group}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label className={`settings-field ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="settings-field is-wide">
      <span>{label}</span>
      <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label>
      <span>
        <strong>{label}</strong>
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} />
    </label>
  );
}

async function switchAccount(router: ReturnType<typeof useRouter>, pathname: string) {
  await signOut();
  const params = new URLSearchParams();
  params.set('next', pathname || '/dashboard');
  params.set('trocarConta', '1');
  router.push(`/login?${params.toString()}`);
}

async function handleSignOut(router: ReturnType<typeof useRouter>) {
  await signOut();
  router.replace('/login');
}
