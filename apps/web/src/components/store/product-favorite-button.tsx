'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

const favoritesKey = 'monte-sinai:favorite-products';
const favoritesChangedEvent = 'monte-sinai:favorites-changed';

function readFavorites() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(favoritesKey) || '[]');
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeFavorites(favorites: Set<string>) {
  window.localStorage.setItem(favoritesKey, JSON.stringify(Array.from(favorites)));
  window.dispatchEvent(new Event(favoritesChangedEvent));
}

export function ProductFavoriteButton({ productSlug, productName }: { productSlug: string; productName: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const syncFavorite = () => {
      const favorites = readFavorites();
      const active = favorites.has(productSlug);
      setIsFavorite(active);
      document.querySelectorAll<HTMLElement>(`[data-product-slug="${productSlug}"]`).forEach((card) => {
        card.classList.toggle('is-favorite', active);
      });
    };

    syncFavorite();
    window.addEventListener('storage', syncFavorite);
    window.addEventListener(favoritesChangedEvent, syncFavorite);
    return () => {
      window.removeEventListener('storage', syncFavorite);
      window.removeEventListener(favoritesChangedEvent, syncFavorite);
    };
  }, [productSlug]);

  return (
    <button
      type="button"
      className={`favorite-button ${isFavorite ? 'is-active' : ''}`}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? `Remover ${productName} dos favoritos` : `Favoritar ${productName}`}
      onClick={() => {
        const favorites = readFavorites();
        if (favorites.has(productSlug)) {
          favorites.delete(productSlug);
        } else {
          favorites.add(productSlug);
        }
        writeFavorites(favorites);
      }}
    >
      <Heart className="size-4" fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}

export function readFavoriteProductSlugs() {
  return readFavorites();
}

export { favoritesChangedEvent };
