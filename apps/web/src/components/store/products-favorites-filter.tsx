'use client';

import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { favoritesChangedEvent, readFavoriteProductSlugs } from './product-favorite-button';

function syncCardsWithFavorites(showOnlyFavorites: boolean) {
  const favorites = readFavoriteProductSlugs();
  const grid = document.querySelector<HTMLElement>('.products-grid');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.products-grid [data-product-slug]'));
  let favoriteCardsInCurrentGrid = 0;

  grid?.classList.toggle('is-showing-favorites', showOnlyFavorites);
  cards.forEach((card) => {
    const slug = card.dataset.productSlug || '';
    const isFavorite = favorites.has(slug);
    if (isFavorite) favoriteCardsInCurrentGrid += 1;
    card.classList.toggle('is-favorite', isFavorite);
  });
  grid?.classList.toggle('has-favorites', favoriteCardsInCurrentGrid > 0);

  return favorites.size;
}

export function ProductsFavoritesFilter() {
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);

  useEffect(() => {
    const sync = () => {
      setFavoriteCount(syncCardsWithFavorites(showOnlyFavorites));
    };

    sync();
    window.addEventListener('storage', sync);
    window.addEventListener(favoritesChangedEvent, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(favoritesChangedEvent, sync);
    };
  }, [showOnlyFavorites]);

  return (
    <button
      type="button"
      className={`products-favorites-toggle ${showOnlyFavorites ? 'is-active' : ''}`}
      aria-pressed={showOnlyFavorites}
      onClick={() => setShowOnlyFavorites((current) => !current)}
    >
      <Heart className="size-4" fill={showOnlyFavorites ? 'currentColor' : 'none'} />
      Favoritos
      {favoriteCount ? <span>{favoriteCount}</span> : null}
    </button>
  );
}
