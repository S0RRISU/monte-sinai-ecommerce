'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Grid3X3, Home, ShoppingCart, UserRound } from 'lucide-react';
import { useStoreIndicators } from './store-indicators';

const items = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/produtos', label: 'Produtos', icon: Grid3X3 },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/carrinho', label: 'Carrinho', icon: ShoppingCart },
  { href: '/conta', label: 'Perfil', icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cartQuantity, internalAccess, openOrderCount } = useStoreIndicators();

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegacao inferior">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) || (item.href === '/conta' && pathname.startsWith('/configuracoes'));
        return (
          <Link key={item.href} href={item.href} className={active ? 'is-active' : ''}>
            <item.icon className="size-5" />
            {item.href === '/carrinho' && cartQuantity > 0 ? <span className="mobile-nav-badge">{cartQuantity > 99 ? '99+' : cartQuantity}</span> : null}
            {item.href === '/pedidos' && internalAccess && openOrderCount > 0 ? <span className="mobile-nav-badge">{openOrderCount > 99 ? '99+' : openOrderCount}</span> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
