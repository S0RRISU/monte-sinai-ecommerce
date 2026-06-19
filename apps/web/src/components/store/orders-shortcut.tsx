'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { useStoreIndicators } from './store-indicators';

export function OrdersShortcut() {
  const { internalAccess, openOrderCount } = useStoreIndicators();

  return (
    <Link href="/pedidos" className="shortcut-link orders-shortcut">
      <ClipboardList className="size-5" />
      {internalAccess && openOrderCount > 0 ? (
        <span className="store-count-badge" aria-label={`${openOrderCount} pedidos pendentes`}>
          {formatCount(openOrderCount)}
        </span>
      ) : null}
      <span>
        <strong>{internalAccess ? 'Pedidos da loja' : 'Meus pedidos'}</strong>
        <small>{internalAccess ? `${openOrderCount} pendentes` : 'Acompanhe'}</small>
      </span>
    </Link>
  );
}

function formatCount(value: number) {
  return value > 99 ? '99+' : value;
}
