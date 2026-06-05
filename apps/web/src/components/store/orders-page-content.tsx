'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ClipboardList, PackageCheck, Search, Truck } from 'lucide-react';
import { getLocalOrders, type SavedOrder } from '@/lib/checkout';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { money } from '@/lib/store-data';

type TrackedOrder = {
  id: string;
  uuid?: string;
  status: string;
  confirmed?: boolean;
  payment: string;
  paymentStatus: string;
  total: number;
  items: Array<{ nome: string; variacao?: string; quantidade: number; total: number }>;
};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function OrdersPageContent() {
  const [orders] = useState<SavedOrder[]>(() => getLocalOrders());
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrder | null>(null);
  const [tracking, setTracking] = useState(false);

  async function handleTrackOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setTrackedOrder(null);

    if (!code.trim() || phone.replace(/\D/g, '').length < 10) {
      setMessage('Informe o codigo do pedido e o telefone usado na compra.');
      return;
    }

    setTracking(true);

    try {
      const supabase = getSupabaseBrowserClient() as unknown as RpcClient;
      const { data, error } = await supabase.rpc('track_order', {
        p_codigo: code.trim(),
        p_cliente_telefone: phone
      });

      if (error) throw new Error(error.message);

      const order = data as TrackedOrder;
      setTrackedOrder(order);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel localizar o pedido.');
    } finally {
      setTracking(false);
    }
  }

  return (
    <>
      <section className="orders-hero">
        <span>Meus pedidos</span>
        <h1>Acompanhe suas compras</h1>
        <p>Consulte o pedido pelo codigo ou veja os pedidos feitos neste aparelho.</p>
        <Link href="/produtos">Escolher produtos</Link>
      </section>

      <section className="orders-content-grid">
        <form className="orders-track-card" onSubmit={handleTrackOrder}>
          <div>
            <Search className="size-6" />
            <span>Buscar pedido</span>
            <h2>Codigo e telefone</h2>
          </div>
          <label>
            Codigo do pedido
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="MS-260602-ABC123" />
          </label>
          <label>
            Telefone usado na compra
            <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="(38) 99999-9999" />
          </label>
          {message ? <p className="checkout-message">{message}</p> : null}
          <button type="submit" disabled={tracking}>
            {tracking ? 'Buscando...' : 'Acompanhar'}
          </button>
        </form>

        <section className="order-history-list" aria-label="Pedidos recentes">
          <div className="section-header">
            <h2>Recentes neste aparelho</h2>
            <Link href="/produtos">Comprar novamente</Link>
          </div>

          {trackedOrder ? <TrackedOrderCard order={trackedOrder} /> : null}

          {orders.length ? (
            orders.map((order) => <SavedOrderCard key={order.code} order={order} />)
          ) : (
            <article className="orders-empty-card">
              <ClipboardList className="size-7" />
              <div>
                <h2>Nenhum pedido salvo aqui</h2>
                <p>Quando voce finalizar uma compra neste aparelho, ela aparece nesta lista.</p>
              </div>
            </article>
          )}
        </section>
      </section>

      <section className="order-steps" aria-label="Etapas do pedido">
        <article>
          <ClipboardList className="size-5" />
          <strong>Recebido</strong>
          <span>Pedido confirmado.</span>
        </article>
        <article>
          <PackageCheck className="size-5" />
          <strong>Separacao</strong>
          <span>Produtos preparados.</span>
        </article>
        <article>
          <Truck className="size-5" />
          <strong>Entrega</strong>
          <span>Saiu para rota.</span>
        </article>
      </section>
    </>
  );
}

function SavedOrderCard({ order }: { order: SavedOrder }) {
  return (
    <article className="order-history-card">
      <div>
        <span className="order-status-pill">{formatCustomerOrderStatus(order.status, true)}</span>
        <h3>Pedido #{order.code}</h3>
        <p>{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
      </div>
      <ul>
        {order.items.slice(0, 3).map((item) => (
          <li key={item.id}>
            {item.quantity}x {item.productShortName}
            {item.variationLabel ? ` - ${item.variationLabel}` : ''}
          </li>
        ))}
      </ul>
      <strong>{money(order.total)}</strong>
    </article>
  );
}

function TrackedOrderCard({ order }: { order: TrackedOrder }) {
  return (
    <article className="order-history-card is-tracked">
      <div>
        <span className="order-status-pill">{formatCustomerOrderStatus(order.status, order.confirmed)}</span>
        <h3>Pedido #{order.id}</h3>
        <p>
          {order.payment} - {order.paymentStatus}
        </p>
      </div>
      <ul>
        {order.items?.slice(0, 4).map((item, index) => (
          <li key={`${item.nome}-${index}`}>
            {item.quantidade}x {item.nome}
            {item.variacao ? ` - ${item.variacao}` : ''}
          </li>
        ))}
      </ul>
      <strong>{money(Number(order.total || 0))}</strong>
    </article>
  );
}

function formatCustomerOrderStatus(status: string, confirmed = false) {
  const clean = status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();

  if (['recebido', 'pedido enviado', 'pendente'].includes(clean)) {
    return confirmed ? 'Pedido recebido' : 'Aguardando confirmação';
  }
  if (['em separacao', 'preparando', 'em preparo'].includes(clean)) return 'Em preparação';
  if (['saiu para entrega', 'a caminho', 'em rota', 'rota'].includes(clean)) return 'A caminho';
  if (clean === 'entregue') return 'Entregue';
  if (clean === 'cancelado') return 'Cancelado';
  return status || 'Pedido recebido';
}
