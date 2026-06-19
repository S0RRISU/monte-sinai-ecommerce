'use client';

import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShieldCheck, ShoppingCart, Trash2, Truck } from 'lucide-react';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { money } from '@/lib/store-data';

export function CartPageContent({
  deliveryFee,
  freeDeliveryMinimum,
  allowDelivery
}: {
  deliveryFee: number;
  freeDeliveryMinimum: number;
  allowDelivery: boolean;
}) {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = getCartTotals(items, { deliveryFee, freeDeliveryMinimum, allowDelivery });
  const amountUntilFreeDelivery = Math.max(freeDeliveryMinimum - totals.subtotal, 0);
  const freeDeliveryProgress = freeDeliveryMinimum > 0 ? Math.min((totals.subtotal / freeDeliveryMinimum) * 100, 100) : 100;

  if (!items.length) {
    return (
      <section className="cart-layout">
        <div className="cart-main-panel cart-empty-panel">
          <span className="cart-empty-icon"><ShoppingCart className="size-8" /></span>
          <span>Carrinho</span>
          <h1>Seu carrinho esta vazio</h1>
          <p>Adicione seus produtos e acompanhe quantidade, entrega e total em um unico lugar.</p>
          <Link href="/produtos">Explorar produtos <ArrowRight className="size-4" /></Link>
        </div>

        <aside className="cart-summary-panel" aria-label="Resumo do carrinho">
          <div className="cart-summary-heading">
            <span>Resumo</span>
            <strong>0 itens</strong>
          </div>
          <div>
            <span>Subtotal</span>
            <strong>{money(0)}</strong>
          </div>
          <div>
            <span>Entrega</span>
            <strong>A calcular</strong>
          </div>
          <button type="button" disabled>
            Finalizar pedido
          </button>
        </aside>
      </section>
    );
  }

  return (
    <section className="cart-layout">
      <div className="cart-items-panel">
        <div className="cart-title-row">
          <div>
            <span>Seu carrinho · {totals.quantity} {totals.quantity === 1 ? 'item' : 'itens'}</span>
            <h1>Revise antes de finalizar</h1>
            <p>Altere quantidades e confira cada produto do pedido.</p>
          </div>
          <Link href="/produtos"><Plus className="size-4" /> Adicionar itens</Link>
        </div>

        <div className="cart-item-list">
          {items.map((item) => (
            <article className="cart-item-row" key={item.id}>
              <Link href={`/produto/${item.productSlug}`} className="cart-item-media">
                <img src={item.image} alt={item.productName} />
              </Link>

              <div className="cart-item-info">
                <span>{item.categoryLabel}</span>
                <h2>{item.productShortName}</h2>
                <p>{item.variationLabel ? `${item.unit} - ${item.variationLabel}` : item.unit}</p>
                <strong>{money(item.unitPrice)}</strong>
              </div>

              <div className="cart-item-controls">
                <div className="quantity-control" aria-label={`Quantidade de ${item.productName}`}>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus className="size-4" />
                  </button>
                  <strong>{item.quantity}</strong>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <strong className="cart-line-total">{money(item.unitPrice * item.quantity)}</strong>
                <button className="remove-line-button" type="button" onClick={() => removeItem(item.id)}>
                  <Trash2 className="size-4" />
                  Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="cart-summary-panel" aria-label="Resumo do carrinho">
        <div className="cart-summary-heading">
          <span>Resumo do pedido</span>
          <strong>{totals.quantity} {totals.quantity === 1 ? 'item' : 'itens'}</strong>
        </div>
        {allowDelivery && freeDeliveryMinimum > 0 ? (
          <div className="cart-delivery-progress">
            <span><Truck className="size-4" /> Entrega</span>
            <strong>{amountUntilFreeDelivery > 0 ? `Faltam ${money(amountUntilFreeDelivery)} para entrega gratis` : 'Entrega gratis liberada'}</strong>
            <i aria-hidden="true"><b style={{ width: `${freeDeliveryProgress}%` }} /></i>
          </div>
        ) : null}
        <div>
          <span>Itens</span>
          <strong>{totals.quantity}</strong>
        </div>
        <div>
          <span>Subtotal</span>
          <strong>{money(totals.subtotal)}</strong>
        </div>
        <div>
          <span>Entrega</span>
          <strong>{totals.delivery === 0 ? 'Gratis' : money(totals.delivery)}</strong>
        </div>
        <div>
          <span>Total</span>
          <strong>{money(totals.total)}</strong>
        </div>
        <Link className="summary-action" href="/checkout">
          Ir para o checkout <ArrowRight className="size-4" />
        </Link>
        <p className="cart-secure-note"><ShieldCheck className="size-4" /> Seus dados sao confirmados antes do envio.</p>
      </aside>
    </section>
  );
}
