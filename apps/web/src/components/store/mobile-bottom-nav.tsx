'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Grid3X3, Home, ShoppingCart, UserRound } from 'lucide-react';

const items = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/produtos', label: 'Produtos', icon: Grid3X3 },
  { href: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { href: '/carrinho', label: 'Carrinho', icon: ShoppingCart },
  { href: '/conta', label: 'Perfil', icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação inferior">
      {items.map((item) => {
        const active =
          item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href) || (item.href === '/conta' && pathname.startsWith('/configuracoes'));
        return (
          <Link key={item.href} href={item.href} className={active ? 'is-active' : ''}>
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
