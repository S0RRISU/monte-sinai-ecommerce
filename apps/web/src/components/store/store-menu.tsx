'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ClipboardList,
  Home,
  Info,
  Menu,
  Navigation,
  PackageSearch,
  ShieldCheck,
  ShoppingCart,
  X
} from 'lucide-react';
import { CategoryIcon } from './category-icon';
import { StoreAppInstall } from './store-app-install';
import { ThemeToggle } from './theme-toggle';
import type { StorefrontSiteConfig, visibleStoreCategories } from '@/lib/site-config';

type StoreMenuProps = {
  categories: ReturnType<typeof visibleStoreCategories>;
  config: StorefrontSiteConfig;
};

const CLOSE_ANIMATION_MS = 420;

export function StoreMenu({ categories, config }: StoreMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const themeSlotRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const openMenu = useCallback(() => {
    setIsMounted(true);
    setIsClosing(false);
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const closeMenu = useCallback(() => {
    if (!isMounted || isClosing) return;
    setIsOpen(false);
    setIsClosing(true);
    window.setTimeout(() => {
      setIsMounted(false);
      setIsClosing(false);
    }, CLOSE_ANIMATION_MS);
  }, [isClosing, isMounted]);

  const toggleMenu = () => {
    if (isMounted && !isClosing) {
      closeMenu();
      return;
    }

    openMenu();
  };

  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMenu, isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    let frame = 0;
    const alignThemeControl = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      const slot = themeSlotRef.current;
      if (!trigger || !panel || !slot) return;
      const triggerRect = trigger.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      slot.style.top = `${triggerRect.top + (triggerRect.height - slotRect.height) / 2}px`;
      slot.style.left = `${panel.offsetWidth - slotRect.width - 24}px`;
    };
    const scheduleAlignment = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(alignThemeControl);
    };

    scheduleAlignment();
    window.addEventListener('resize', scheduleAlignment);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', scheduleAlignment);
    };
  }, [isMounted]);

  const navigationLinks = [
    { href: '/', label: 'Inicio', text: 'Voltar para a primeira tela.', icon: Home },
    { href: '/sobre', label: 'Sobre a loja', text: 'Endereco, funcionamento e atendimento.', icon: Info },
    { href: '/localizacao', label: 'Area atendida', text: 'Ver entrega e endereco salvo.', icon: Navigation }
  ];
  const accountLinks = [
    { href: '/pedidos', label: 'Pedidos', text: 'Acompanhar compras feitas.', icon: ClipboardList },
    { href: '/carrinho', label: 'Carrinho', text: 'Revisar antes do checkout.', icon: ShoppingCart },
    { href: '/conta', label: 'Conta', text: 'Login, perfil e acesso.', icon: ShieldCheck }
  ];

  return (
    <div className={`store-menu ${isOpen ? 'is-open' : ''} ${isClosing ? 'is-closing' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="store-menu-trigger"
        aria-label={isMounted ? 'Fechar menu da loja' : 'Abrir menu da loja'}
        aria-expanded={isMounted}
        onClick={toggleMenu}
      >
        {isMounted ? <X className="size-5" /> : <Menu className="size-5" />}
        <span className="store-menu-label">Menu</span>
      </button>

      {isMounted ? (
        <>
          <button
            type="button"
            className="store-menu-backdrop"
            aria-label="Fechar menu"
            onClick={closeMenu}
          />

          <div ref={panelRef} className="store-menu-panel" role="dialog" aria-modal="true" aria-label="Menu da loja">
            <div ref={themeSlotRef} className="store-menu-theme-slot">
              <ThemeToggle className="store-menu-theme-toggle" />
            </div>

            <section className="store-menu-feature">
              <span>Monte Sinai</span>
              <strong>Agua, gas e limpeza para o dia a dia.</strong>
              <small>{config.address}</small>
              <Link href="/produtos" onClick={closeMenu}>
                <PackageSearch className="size-4" />
                Ver todos os produtos
              </Link>
            </section>

            <section className="store-menu-section" aria-label="Categorias">
              <strong>Comprar por categoria</strong>
              <div className="store-menu-categories">
                {categories.map((category) => (
                  <Link key={category.id} href={`/produtos?categoria=${category.id}`} onClick={closeMenu}>
                    <CategoryIcon category={category.id} />
                    {category.label}
                  </Link>
                ))}
              </div>
            </section>

            <nav className="store-menu-links" aria-label="Paginas da loja">
              {navigationLinks.map((item) => (
                <Link key={item.href} href={item.href} className="store-menu-link" onClick={closeMenu}>
                  <item.icon className="size-5" />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.text}</small>
                  </span>
                </Link>
              ))}
            </nav>

            <section className="store-menu-section" aria-label="Conta e pedido">
              <strong>Minha compra</strong>
              <div className="store-menu-compact-links">
                {accountLinks.map((item) => (
                  <Link key={item.href} href={item.href} onClick={closeMenu}>
                    <item.icon className="size-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            <section className="store-menu-section" aria-label="Aplicativo da loja">
              <strong>Aplicativo da loja</strong>
              <StoreAppInstall />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
