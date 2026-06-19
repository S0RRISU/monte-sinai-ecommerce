'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { money } from '@/lib/store-data';
import { useStoreIndicators } from './store-indicators';

export function CartShortcut() {
  const items = useCartStore((state) => state.items);
  const totals = getCartTotals(items);
  const { cartQuantity } = useStoreIndicators();

  return (
    <Link href="/carrinho" className="shortcut-link cart-shortcut">
      <ShoppingCart className="size-5" />
      <span className="cart-badge" aria-label={`${cartQuantity} itens no carrinho`}>{cartQuantity > 99 ? '99+' : cartQuantity}</span>
      <span>
        <strong>Carrinho</strong>
        <small>{cartQuantity === 1 ? '1 item' : `${cartQuantity} itens`} · {money(totals.total)}</small>
      </span>
    </Link>
  );
}
