'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardList, CreditCard, MapPin, MessageCircle, Truck } from 'lucide-react';
import { availablePayments, submitCheckoutOrder, type CheckoutFormData, type SavedOrder, validateCheckout } from '@/lib/checkout';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { money } from '@/lib/store-data';
import type { StorefrontSiteConfig } from '@/lib/site-config';

const initialForm: CheckoutFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  complement: '',
  deliveryWindow: 'Entregar o quanto antes',
  payment: 'Pix na entrega',
  notes: ''
};

const deliveryOptions = ['Entregar o quanto antes', 'Manha', 'Tarde', 'Noite'];

export function CheckoutPageContent({ siteConfig }: { siteConfig: StorefrontSiteConfig }) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const availablePaymentOptions = availablePayments(siteConfig);
  const [form, setForm] = useState(() => ({ ...initialForm, payment: availablePaymentOptions[0] || '' }));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [createdOrder, setCreatedOrder] = useState<SavedOrder | null>(null);
  const availableDeliveryOptions = siteConfig.allowDelivery ? deliveryOptions : ['Retirada na loja'];
  const totals = useMemo(() => getCartTotals(items, siteConfig), [items, siteConfig]);

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data }) => {
      if (!active || !data.user) return;
      const metadata = data.user.user_metadata || {};
      const metadataName = metadata.name || metadata.nome || metadata.full_name;
      setForm((current) => ({
        ...current,
        email: current.email || data.user?.email || '',
        name: current.name || (typeof metadataName === 'string' ? metadataName : '')
      }));
    });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field: keyof CheckoutFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateCheckout(form, items, siteConfig);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setSubmitting(true);
    setMessage('');

    try {
      const order = await submitCheckoutOrder(form, items, siteConfig);
      setCreatedOrder(order);
      clearCart();
      router.prefetch('/pedidos');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Nao foi possivel finalizar o pedido.');
    } finally {
      setSubmitting(false);
    }
  }

  if (createdOrder) {
    return (
      <section className="order-success-card">
        <CheckCircle2 className="size-10" />
        <span>Pedido recebido</span>
        <h1>{createdOrder.code}</h1>
        <p>{siteConfig.checkoutMessage}</p>
        <div className="success-summary">
          <strong>{money(createdOrder.total)}</strong>
          <small>
            {createdOrder.items.length} {createdOrder.items.length === 1 ? 'item' : 'itens'}
          </small>
        </div>
        <div className="success-actions">
          <Link href="/pedidos">Acompanhar pedido</Link>
          <Link href="/produtos">Comprar mais</Link>
        </div>
      </section>
    );
  }

  if (!siteConfig.storeOpen) {
    return (
      <section className="cart-main-panel cart-empty-panel">
        <ClipboardList className="size-8" />
        <span>Loja fechada</span>
        <h1>Pedidos temporariamente pausados</h1>
        <p>{siteConfig.maintenanceMessage}</p>
        <Link href="/produtos">Ver produtos</Link>
      </section>
    );
  }

  if (!items.length) {
    return (
      <section className="cart-main-panel cart-empty-panel">
        <ClipboardList className="size-8" />
        <span>Checkout</span>
        <h1>Nao ha itens para finalizar</h1>
        <p>Adicione um produto ao carrinho antes de seguir para o pedido.</p>
        <Link href="/produtos">Ver produtos</Link>
      </section>
    );
  }

  return (
    <section className="checkout-layout">
      <form className="checkout-form-panel" onSubmit={handleSubmit}>
        <div className="checkout-title-row">
          <span>Checkout</span>
          <h1>Finalize seu pedido</h1>
          <p>{siteConfig.checkoutMessage}</p>
        </div>

        <div className="checkout-stepper" aria-label="Etapas do checkout">
          <span className="is-active">
            <MapPin className="size-4" />
            {siteConfig.allowDelivery ? 'Endereco' : 'Retirada'}
          </span>
          <span className="is-active">
            <Truck className="size-4" />
            Entrega
          </span>
          <span className="is-active">
            <CreditCard className="size-4" />
            Pagamento
          </span>
        </div>

        <fieldset className="checkout-fieldset">
          <legend>Contato</legend>
          <div className="checkout-form-grid">
            <label className="field">
              <span>Nome de quem recebe</span>
              <input value={form.name} onChange={(event) => updateField('name', event.target.value)} autoComplete="name" />
            </label>
            <label className="field">
              <span>Telefone/WhatsApp</span>
              <input
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
            <label className="field is-wide">
              <span>E-mail{siteConfig.requireEmail ? ' obrigatorio' : ''}</span>
              <input value={form.email} onChange={(event) => updateField('email', event.target.value)} autoComplete="email" />
            </label>
          </div>
        </fieldset>

        <fieldset className="checkout-fieldset">
          <legend>{siteConfig.allowDelivery ? 'Entrega' : 'Retirada'}</legend>
          <div className="checkout-form-grid">
            {siteConfig.allowDelivery ? (
              <>
                <label className="field is-wide">
                  <span>Endereco completo</span>
                  <input
                    value={form.address}
                    onChange={(event) => updateField('address', event.target.value)}
                    autoComplete="street-address"
                  />
                </label>
                <label className="field is-wide">
                  <span>Complemento ou referencia</span>
                  <input value={form.complement} onChange={(event) => updateField('complement', event.target.value)} />
                </label>
              </>
            ) : (
              <p className="checkout-message">Retirada habilitada. A loja confirma o melhor horario pelo WhatsApp.</p>
            )}
          </div>
          <div className="checkout-radio-grid">
            {availableDeliveryOptions.map((option) => (
              <label className="checkout-radio" key={option}>
                <input
                  type="radio"
                  name="deliveryWindow"
                  checked={form.deliveryWindow === option}
                  onChange={() => updateField('deliveryWindow', option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="checkout-fieldset">
          <legend>Pagamento</legend>
          <div className="checkout-radio-grid">
            {availablePaymentOptions.map((option) => (
              <label className="checkout-radio" key={option}>
                <input type="radio" name="payment" checked={form.payment === option} onChange={() => updateField('payment', option)} />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {!availablePaymentOptions.length ? <p className="checkout-message">Nenhuma forma de pagamento esta habilitada.</p> : null}
          <label className="field">
            <span>Observacao</span>
            <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={3} />
          </label>
        </fieldset>

        {message ? <p className="checkout-message">{message}</p> : null}

        <button className="checkout-submit" type="submit" disabled={submitting || !availablePaymentOptions.length}>
          <MessageCircle className="size-5" />
          {submitting ? 'Enviando pedido...' : 'Confirmar pedido'}
        </button>
      </form>

      <aside className="checkout-summary-panel">
        <h2>Seu pedido</h2>
        <div className="checkout-items-list">
          {items.map((item) => (
            <article key={item.id}>
              <img src={item.image} alt={item.productName} />
              <span>
                <strong>{item.productShortName}</strong>
                <small>{item.variationLabel ? `${item.quantity}x ${item.variationLabel}` : `${item.quantity}x ${item.unit}`}</small>
              </span>
              <b>{money(item.unitPrice * item.quantity)}</b>
            </article>
          ))}
        </div>
        <div className="checkout-total-lines">
          <p>
            <span>Subtotal</span>
            <strong>{money(totals.subtotal)}</strong>
          </p>
          <p>
            <span>Entrega</span>
            <strong>{siteConfig.allowDelivery === false ? 'Retirada' : totals.delivery === 0 ? 'Gratis' : money(totals.delivery)}</strong>
          </p>
          <p>
            <span>Total</span>
            <strong>{money(totals.total)}</strong>
          </p>
        </div>
      </aside>
    </section>
  );
}
