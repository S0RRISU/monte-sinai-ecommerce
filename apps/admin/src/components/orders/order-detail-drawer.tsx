'use client';

import type { ReactNode } from 'react';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CreditCard,
  FileText,
  MapPin,
  MessageCircle,
  MoreVertical,
  Package,
  PackageCheck,
  Phone,
  Send,
  Trash2,
  Truck,
  UserRound,
  type LucideIcon
} from 'lucide-react';
import { fullDate, money, shortDate } from '@/lib/format';
import { resolveAdminImageUrl } from '@/lib/assets';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/types';
import { downloadOrderReceipt } from './order-receipt';

type StatusAction = { label: string; status: OrderStatus; icon: LucideIcon; tone: 'blue' | 'green' | 'amber' | 'red' };

const statusActionsByStatus: Record<OrderStatus, StatusAction[]> = {
  'A confirmar': [
    { label: 'Confirmar pedido', status: 'Recebido', icon: CheckCircle2, tone: 'blue' },
    { label: 'Cancelar pedido', status: 'Cancelado', icon: Ban, tone: 'red' }
  ],
  Recebido: [
    { label: 'Iniciar separacao', status: 'Em separação', icon: PackageCheck, tone: 'blue' },
    { label: 'Cancelar pedido', status: 'Cancelado', icon: Ban, tone: 'red' }
  ],
  'Em separação': [
    { label: 'Chamar entregador', status: 'A caminho', icon: Truck, tone: 'blue' },
    { label: 'Cancelar pedido', status: 'Cancelado', icon: Ban, tone: 'red' }
  ],
  'A caminho': [
    { label: 'Marcar entregue', status: 'Entregue', icon: CheckCircle2, tone: 'green' },
    { label: 'Cancelar pedido', status: 'Cancelado', icon: Ban, tone: 'red' }
  ],
  Entregue: [],
  Cancelado: []
};

const statusTone: Record<OrderStatus, string> = {
  'A confirmar': 'bg-amber-100 text-amber-700 ring-amber-200',
  Recebido: 'bg-blue-100 text-blue-700 ring-blue-200',
  'Em separação': 'bg-orange-100 text-orange-700 ring-orange-200',
  'A caminho': 'bg-violet-100 text-violet-700 ring-violet-200',
  Entregue: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  Cancelado: 'bg-red-100 text-red-700 ring-red-200'
};

const statusStepIndex: Record<OrderStatus, number> = {
  'A confirmar': 0,
  Recebido: 1,
  'Em separação': 2,
  'A caminho': 3,
  Entregue: 4,
  Cancelado: -1
};

const timelineSteps = [
  { title: 'Recebido', description: 'Pedido entrou no painel' },
  { title: 'Confirmado', description: 'Confirmacao administrativa' },
  { title: 'Em separacao', description: 'Separacao dos itens' },
  { title: 'Saiu para entrega', description: 'Coleta pelo entregador' },
  { title: 'Entregue', description: 'Finalizacao do pedido' }
];

const manualStatusOptions: Array<{ label: string; status: OrderStatus; icon: LucideIcon; tone: 'blue' | 'amber' | 'violet' | 'green' | 'red' }> = [
  { label: 'Recebido', status: 'Recebido', icon: PackageCheck, tone: 'blue' },
  { label: 'Em separacao', status: 'Em separação', icon: Package, tone: 'amber' },
  { label: 'A caminho', status: 'A caminho', icon: Truck, tone: 'violet' },
  { label: 'Entregue', status: 'Entregue', icon: CheckCircle2, tone: 'green' },
  { label: 'Cancelado', status: 'Cancelado', icon: Ban, tone: 'red' }
];

export function OrderDetailDrawer({
  order,
  onClose,
  onStatusChange,
  onDelete,
  saving
}: {
  order: Order | null;
  onClose: () => void;
  onStatusChange?: (order: Order, nextStatus: OrderStatus, nextPayment: PaymentStatus) => Promise<void>;
  onDelete?: (order: Order) => Promise<void>;
  saving?: boolean;
}) {
  if (!order) return null;

  const statusActions = statusActionsByStatus[order.status] || [];
  const subtotal = order.subtotal || order.items.reduce((sum, item) => sum + (item.total || item.price * item.quantity), 0);
  const whatsappUrl = buildWhatsAppUrl(order.customer.phone, `Olá, ${order.customer.name || 'cliente'}! Sobre o pedido #${order.code}:`);

  return (
    <div className="admin-order-detail-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/72 text-slate-950 backdrop-blur-md">
      <section className="admin-order-detail-shell mx-auto min-h-screen w-full max-w-[1040px] bg-white px-4 pb-24 pt-4 shadow-2xl sm:px-5 md:my-5 md:min-h-[calc(100vh-2.5rem)] md:rounded-[26px] md:border md:border-blue-100 md:p-6">
        <header className="flex items-center justify-between gap-3 border-b border-blue-100 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300" onClick={onClose} aria-label="Voltar para pedidos">
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-black text-slate-950 sm:text-2xl">Pedido #{order.code}</h2>
                <StatusPill status={order.status} />
                <OriginPill origin={order.origin} />
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500 sm:text-sm">Realizado em {fullDate(order.createdAt)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="grid size-10 place-items-center rounded-2xl border border-blue-100 bg-white text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300" onClick={() => void downloadOrderReceipt(order)} aria-label="Baixar comprovante PDF">
              <FileText className="size-5" />
            </button>
            <button type="button" className="hidden size-10 place-items-center rounded-2xl border border-blue-100 bg-white text-slate-600 shadow-sm sm:grid" aria-label="Mais opcoes">
              <MoreVertical className="size-5" />
            </button>
          </div>
        </header>

        <main className="mt-4 grid gap-4">
          <section className="grid gap-4 lg:grid-cols-[0.95fr_1fr]">
            <InfoPanel title="Cliente" icon={UserRound} action={profileHref(order) ? <a className="text-xs font-black text-blue-700" href={profileHref(order)}>Ver perfil</a> : null}>
              <div className="flex gap-3">
                <Avatar name={order.customer.name || 'Cliente'} />
                <div className="min-w-0 space-y-1 text-sm font-semibold text-slate-600">
                  <strong className="block truncate text-base text-slate-950">{order.customer.name || 'Cliente sem nome'}</strong>
                  <p className="flex items-center gap-2"><Phone className="size-4 text-blue-500" /> {order.customer.phone || 'Telefone nao informado'}</p>
                  <p className="truncate">{order.customer.email || 'E-mail nao informado'}</p>
                  <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-blue-500" /> <span>{order.customer.address || 'Endereco nao informado'}</span></p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                <p className="text-xs font-black text-blue-700">Observacoes do cliente</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Nenhuma observacao registrada neste pedido.</p>
              </div>
            </InfoPanel>

            <InfoPanel title="Acompanhe o pedido" icon={PackageCheck}>
              <Timeline order={order} />
              <StatusControls order={order} onStatusChange={onStatusChange} saving={saving} />
            </InfoPanel>
          </section>

          <InfoPanel title={`Itens do pedido (${order.items.length} ${order.items.length === 1 ? 'produto' : 'produtos'})`} icon={Package}>
            <div className="divide-y divide-blue-100">
              {order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-3 first:pt-0 last:pb-0 md:grid-cols-[64px_minmax(0,1fr)_80px_120px_120px]">
                  <ProductThumb item={item} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
                    <p className="text-xs font-semibold text-slate-500">
                      {item.productId ? `Codigo: ${item.productId}` : 'Item do pedido'}
                      {item.variation ? ` · ${item.variation}` : ''}
                    </p>
                  </div>
                  <p className="hidden text-center text-sm font-bold text-slate-600 md:block">{item.quantity}</p>
                  <p className="hidden text-right text-sm font-bold text-slate-600 md:block">{money(item.price)}</p>
                  <strong className="text-right text-sm text-slate-950">{money(item.total || item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 border-t border-blue-100 pt-4 md:grid-cols-[1fr_320px]">
              <div className="space-y-2 text-sm font-semibold text-slate-600">
                <SummaryLine label="Taxa de entrega" value={money(order.delivery)} />
                <SummaryLine label="Desconto" value={`-${money(order.discount)}`} tone={order.discount > 0 ? 'green' : undefined} />
              </div>
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <SummaryLine label="Subtotal" value={money(subtotal)} />
                <div className="mt-3 flex items-center justify-between border-t border-blue-100 pt-3">
                  <span className="text-sm font-black text-slate-700">Total</span>
                  <strong className="text-2xl font-black text-blue-700">{money(order.total)}</strong>
                </div>
                <div className="mt-2 flex justify-end">
                  <span className={`rounded-lg px-3 py-1 text-xs font-black ${order.paymentStatus === 'Pago' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{order.paymentStatus}</span>
                </div>
              </div>
            </div>
          </InfoPanel>

          <section className="grid gap-4 lg:grid-cols-3">
            <InfoPanel title="Pagamento" icon={CreditCard}>
              <DetailLine label="Metodo de pagamento" value={order.payment || 'Forma nao informada'} />
              <DetailLine label="Status do pagamento" value={order.paymentStatus} tone={order.paymentStatus === 'Pago' ? 'green' : 'amber'} />
              <DetailLine label="Autorizacao" value={order.paymentStatus === 'Pago' ? `#${order.code}` : 'Pendente'} />
              <PaymentControls order={order} onStatusChange={onStatusChange} saving={saving} />
            </InfoPanel>

            <InfoPanel title="Entrega" icon={Truck}>
              <div className="mb-3 h-24 rounded-2xl border border-blue-100 bg-[linear-gradient(135deg,#edf6ff_25%,#ffffff_25%,#ffffff_50%,#edf6ff_50%,#edf6ff_75%,#ffffff_75%)] bg-[length:28px_28px] p-3">
                <div className="flex h-full items-center justify-center gap-2 rounded-xl bg-white/80 text-xs font-black text-blue-700">
                  <MapPin className="size-4" />
                  Rota de entrega
                </div>
              </div>
              <DetailLine label="Endereco de entrega" value={order.customer.address || 'Endereco nao informado'} />
              <DetailLine label="Previsao" value="Defina a rota para calcular" />
            </InfoPanel>

            <InfoPanel title="Entregador" icon={UserRound}>
              <div className="flex items-center gap-3">
                <Avatar name="Entregador" />
                <div>
                  <p className="font-black text-slate-950">Nao atribuido</p>
                  <p className="text-sm font-semibold text-slate-500">Atribua quando o pedido sair para entrega.</p>
                </div>
              </div>
              <button type="button" className="mt-4 w-full rounded-xl border border-blue-200 px-4 py-3 text-sm font-black text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-400">
                Ver entregas do dia
              </button>
            </InfoPanel>
          </section>

          <InfoPanel title="Chat com o cliente" icon={MessageCircle} action={whatsappUrl ? <a className="text-xs font-black text-blue-700" href={whatsappUrl} target="_blank" rel="noreferrer">Abrir WhatsApp</a> : null}>
            <div className="rounded-2xl border border-blue-100 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-500">{order.customer.name || 'Cliente'}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">Use o WhatsApp cadastrado para confirmar detalhes deste pedido.</p>
            </div>
            <div className="mt-3 flex gap-2">
              <input className="min-w-0 flex-1 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400" value={`Pedido #${order.code}`} readOnly />
              <a className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg ${whatsappUrl ? 'bg-blue-700' : 'pointer-events-none bg-slate-300'}`} href={whatsappUrl || undefined} target="_blank" rel="noreferrer" aria-label="Enviar mensagem">
                <Send className="size-5" />
              </a>
            </div>
          </InfoPanel>

          <ActionBar order={order} actions={statusActions} onStatusChange={onStatusChange} onDelete={onDelete} saving={saving} whatsappUrl={whatsappUrl} />
        </main>
      </section>
    </div>
  );
}

function InfoPanel({ title, icon: Icon, action, children }: { title: string; icon: LucideIcon; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-4 shadow-[0_14px_36px_rgba(30,64,175,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-950">
          <span className="grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Icon className="size-4" />
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`rounded-md px-2.5 py-1 text-[0.65rem] font-black ring-1 ${statusTone[status]}`}>{status}</span>;
}

function OriginPill({ origin }: { origin: Order['origin'] }) {
  const labels: Record<Order['origin'], string> = {
    site: 'Site',
    presencial: 'Presencial',
    telefone: 'Telefone',
    whatsapp: 'WhatsApp'
  };

  return <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[0.65rem] font-black text-slate-600 ring-1 ring-slate-200">{labels[origin] || 'Site'}</span>;
}

function Timeline({ order }: { order: Order }) {
  const current = statusStepIndex[order.status];

  if (order.status === 'Cancelado') {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
        Pedido cancelado. Nenhuma proxima etapa ativa.
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {timelineSteps.map((step, index) => {
        const done = index < current || order.status === 'Entregue';
        const active = index === current && order.status !== 'Entregue';
        const state = done ? 'Concluido' : active ? 'Atual' : 'Pendente';
        return (
          <li key={step.title} className="grid grid-cols-[26px_minmax(0,1fr)_auto] gap-3">
            <div className="relative flex justify-center">
              <span className={`mt-1 grid size-5 place-items-center rounded-full border-2 ${done || active ? 'border-blue-700 bg-blue-700 text-white' : 'border-blue-500 bg-white text-blue-500'}`}>
                {done ? <CheckCircle2 className="size-3" /> : null}
              </span>
              {index < timelineSteps.length - 1 ? <span className={`absolute top-6 h-[calc(100%-0.15rem)] w-0.5 ${done ? 'bg-blue-700' : 'bg-blue-200'}`} /> : null}
            </div>
            <div className="pb-5">
              <p className="text-sm font-black text-slate-800">{step.title}</p>
              <p className="text-xs font-semibold text-slate-500">{index === 0 ? shortDate(order.createdAt) : step.description}</p>
            </div>
            <span className={`mt-0.5 rounded-lg px-2 py-1 text-[0.65rem] font-black ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
              {state}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StatusControls({
  order,
  onStatusChange,
  saving
}: {
  order: Order;
  onStatusChange?: (order: Order, nextStatus: OrderStatus, nextPayment: PaymentStatus) => Promise<void>;
  saving?: boolean;
}) {
  return (
    <div className="mt-3 border-t border-blue-100 pt-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Alterar status</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {manualStatusOptions.map((item) => {
          const active = order.status === item.status || (order.status === 'A confirmar' && item.status === 'Recebido');
          return (
            <button
              key={item.status}
              type="button"
              className={`status-control status-control-${item.tone} ${active ? 'is-active' : ''}`}
              disabled={saving || !onStatusChange || active}
              onClick={() => onStatusChange?.(order, item.status, order.paymentStatus)}
            >
              <item.icon className="size-4" />
              {active ? 'Atual' : item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PaymentControls({
  order,
  onStatusChange,
  saving
}: {
  order: Order;
  onStatusChange?: (order: Order, nextStatus: OrderStatus, nextPayment: PaymentStatus) => Promise<void>;
  saving?: boolean;
}) {
  const options: PaymentStatus[] = ['Pendente', 'Pago', 'Cancelado'];

  return (
    <div className="mt-4 border-t border-blue-100 pt-3">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Alterar pagamento</p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={`payment-control ${order.paymentStatus === option ? 'is-active' : ''}`}
            disabled={saving || !onStatusChange || order.paymentStatus === option}
            onClick={() => onStatusChange?.(order, order.status, option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductThumb({ item }: { item: Order['items'][number] }) {
  if (item.image) {
    return <img src={resolveAdminImageUrl(item.image)} alt="" className="size-12 rounded-2xl border border-blue-100 object-cover md:size-14" />;
  }

  return (
    <div className="grid size-12 place-items-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-700 md:size-14">
      <Package className="size-5" />
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return <div className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-black text-blue-700">{initials || 'MS'}</div>;
}

function SummaryLine({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <strong className={tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-slate-900'}>{value}</strong>
    </div>
  );
}

function DetailLine({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${tone === 'green' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function ActionBar({
  order,
  actions,
  onStatusChange,
  onDelete,
  saving,
  whatsappUrl
}: {
  order: Order;
  actions: StatusAction[];
  onStatusChange?: (order: Order, nextStatus: OrderStatus, nextPayment: PaymentStatus) => Promise<void>;
  onDelete?: (order: Order) => Promise<void>;
  saving?: boolean;
  whatsappUrl: string;
}) {
  return (
    <section className="sticky bottom-0 z-10 -mx-4 grid gap-2 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:p-3 md:grid-cols-3">
      {actions.map((action) => (
        <button key={action.status} type="button" className={`detail-action detail-action-${action.tone}`} disabled={saving || !onStatusChange} onClick={() => onStatusChange?.(order, action.status, order.paymentStatus)}>
          <action.icon className="size-5" />
          {action.label}
        </button>
      ))}
      {order.paymentStatus !== 'Pago' && onStatusChange ? (
        <button type="button" className="detail-action detail-action-green" disabled={saving} onClick={() => onStatusChange(order, order.status, 'Pago')}>
          <CreditCard className="size-5" />
          Marcar pagamento
        </button>
      ) : null}
      <a className={`detail-action detail-action-outline ${whatsappUrl ? '' : 'pointer-events-none opacity-50'}`} href={whatsappUrl || undefined} target="_blank" rel="noreferrer">
        <MessageCircle className="size-5" />
        Enviar mensagem
      </a>
      <button type="button" className="detail-action detail-action-outline" onClick={() => void downloadOrderReceipt(order)}>
        <FileText className="size-5" />
        Baixar comprovante
      </button>
      {onDelete ? (
        <button type="button" className="detail-action detail-action-red" disabled={saving} onClick={() => void onDelete(order)}>
          <Trash2 className="size-5" />
          Excluir pedido
        </button>
      ) : null}
    </section>
  );
}

function profileHref(order: Order) {
  const query = order.customer.phone || order.customer.email || order.customer.name;
  return query ? `/clientes?q=${encodeURIComponent(query)}` : '';
}

function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
