'use client';

import { useEffect } from 'react';

export function ProductsMenuController() {
  useEffect(() => {
    const menus = Array.from(document.querySelectorAll<HTMLDetailsElement>('.products-menu'));

    const closeMenus = (except?: HTMLDetailsElement) => {
      menus.forEach((menu) => {
        if (menu !== except) menu.open = false;
      });
    };

    const handleToggle = (event: Event) => {
      const current = event.currentTarget as HTMLDetailsElement;
      if (current.open) closeMenus(current);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menus.some((menu) => menu.contains(target))) {
        if (target instanceof Element && target.closest('a')) closeMenus();
        return;
      }
      closeMenus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenus();
    };

    menus.forEach((menu) => menu.addEventListener('toggle', handleToggle));
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      menus.forEach((menu) => menu.removeEventListener('toggle', handleToggle));
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return null;
}
