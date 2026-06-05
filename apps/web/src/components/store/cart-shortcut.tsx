'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { getCartTotals, useCartStore } from '@/lib/cart-store';
import { money } from '@/lib/store-data';

export function CartShortcut() {
  const items = useCartStore((state) => state.items);
  const totals = getCartTotals(items);

  return (
    <Link href="/carrinho" className="shortcut-link cart-shortcut">
      <ShoppingCart className="size-5" />
      {totals.quantity > 0 ? <span className="cart-badge">{totals.quantity}</span> : null}
      <span>
        <strong>Carrinho</strong>
        <small>{money(totals.total)}</small>
      </span>
    </Link>
  );
}
