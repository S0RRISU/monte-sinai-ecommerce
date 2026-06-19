'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Product, ProductVariation } from './store-data';

export type CartItem = {
  id: string;
  productSlug: string;
  productName: string;
  productShortName: string;
  categoryLabel: string;
  image: string;
  unit: string;
  variationId?: string;
  variationLabel?: string;
  unitPrice: number;
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (product: Product, variation: ProductVariation | undefined, quantity: number) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
};

export type CartTotals = {
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  quantity: number;
};

export type CartTotalsOptions = {
  deliveryFee?: number;
  freeDeliveryMinimum?: number;
  allowDelivery?: boolean;
};

function cartItemId(productSlug: string, variationId?: string) {
  return variationId ? `${productSlug}:${variationId}` : productSlug;
}

export function getCartTotals(items: CartItem[], options: CartTotalsOptions = {}): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryFee = Math.max(Number(options.deliveryFee ?? 5), 0);
  const freeDeliveryMinimum = Math.max(Number(options.freeDeliveryMinimum ?? 80), 0);
  const delivery = options.allowDelivery === false || subtotal === 0 || (freeDeliveryMinimum > 0 && subtotal >= freeDeliveryMinimum) ? 0 : deliveryFee;

  return {
    subtotal,
    delivery,
    discount: 0,
    total: subtotal + delivery,
    quantity
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (product, variation, quantity) => {
        const normalizedQuantity = Math.max(1, Math.floor(quantity));
        const itemId = cartItemId(product.slug, variation?.id);

        set((state) => {
          const existingItem = state.items.find((item) => item.id === itemId);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === itemId ? { ...item, quantity: item.quantity + normalizedQuantity } : item
              )
            };
          }

          return {
            items: [
              ...state.items,
              {
                id: itemId,
                productSlug: product.slug,
                productName: product.name,
                productShortName: product.shortName,
                categoryLabel: product.categoryLabel,
                image: product.image,
                unit: product.unit,
                variationId: variation?.id,
                variationLabel: variation?.label,
                unitPrice: variation?.price || product.price,
                quantity: normalizedQuantity
              }
            ]
          };
        });
      },
      updateQuantity: (itemId, quantity) => {
        const normalizedQuantity = Math.max(1, Math.floor(quantity));
        set((state) => ({
          items: state.items.map((item) => (item.id === itemId ? { ...item, quantity: normalizedQuantity } : item))
        }));
      },
      removeItem: (itemId) => {
        set((state) => ({ items: state.items.filter((item) => item.id !== itemId) }));
      },
      clearCart: () => set({ items: [] })
    }),
    {
      name: 'monte-sinai-cart-v1',
      storage: createJSONStorage(() => localStorage),
      version: 1
    }
  )
);
