'use client';

import Link from 'next/link';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { money } from '@/lib/store-data';

export function CartPageContent() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const totals = getCartTotals(items);

  if (!items.length) {
    return (
      <section className="cart-layout">
        <div className="cart-main-panel cart-empty-panel">
          <ShoppingCart className="size-8" />
          <span>Carrinho</span>
          <h1>Seu carrinho esta vazio</h1>
          <p>Escolha um produto para montar seu pedido.</p>
          <Link href="/produtos">Ver produtos</Link>
        </div>

        <aside className="cart-summary-panel" aria-label="Resumo do carrinho">
          <h2>Resumo</h2>
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
            <span>Carrinho</span>
            <h1>Confira seu pedido</h1>
          </div>
          <Link href="/produtos">Adicionar mais itens</Link>
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
        <h2>Resumo</h2>
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
          Finalizar pedido
        </Link>
      </aside>
    </section>
  );
}
