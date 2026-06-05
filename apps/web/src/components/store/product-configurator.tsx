'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { money, type Product } from '@/lib/store-data';

type ProductConfiguratorProps = {
  product: Product;
};

export function ProductConfigurator({ product }: ProductConfiguratorProps) {
  const hasRequiredVariation = Boolean(product.variations?.length);
  const [variationId, setVariationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const selectedVariation = product.variations?.find((variation) => variation.id === variationId);
  const price = selectedVariation?.price || product.price;
  const productUnavailable = product.unavailable || product.canBuy === false;
  const variationUnavailable = selectedVariation?.unavailable || selectedVariation?.canBuy === false;
  const canAddToCart = !productUnavailable && !variationUnavailable && (!hasRequiredVariation || Boolean(selectedVariation));
  const requiredLabel = product.category === 'gas' ? 'marca' : 'fragrancia';

  const statusMessage = useMemo(() => {
    if (added) return 'Produto adicionado ao carrinho.';
    if (productUnavailable) return 'Produto indisponivel no momento.';
    if (variationUnavailable) return 'Esta opcao esta sem estoque agora.';
    if (!canAddToCart) return `Escolha a ${requiredLabel} antes de colocar no carrinho.`;
    return 'Pronto para adicionar ao carrinho.';
  }, [added, canAddToCart, productUnavailable, requiredLabel, variationUnavailable]);

  function handleAddToCart() {
    if (!canAddToCart) return;
    addItem(product, selectedVariation, quantity);
    setAdded(true);
  }

  return (
    <section className="product-config" aria-label="Configurar produto">
      {product.variations?.length ? (
        <div className="variation-block">
          <h2>{product.category === 'gas' ? 'Escolha a marca' : 'Escolha a fragrancia'}</h2>
          <div className={product.category === 'limpeza' ? 'variation-grid fragrance-grid' : 'variation-grid'}>
            {product.variations.map((variation) => (
              <button
                key={variation.id}
                type="button"
                className={`variation-card ${variation.id === variationId ? 'is-selected' : ''}`}
                aria-pressed={variation.id === variationId}
                disabled={variation.unavailable || variation.canBuy === false}
                onClick={() => {
                  setVariationId(variation.id);
                  setAdded(false);
                }}
              >
                <span className="variation-check" aria-hidden="true">
                  <CheckCircle2 className="size-4" />
                </span>
                <strong>{variation.label}</strong>
                <span>{variation.helper}</span>
                {variation.unavailable || variation.canBuy === false ? <small>Sem estoque</small> : variation.badge ? <small>{variation.badge}</small> : null}
                <b>{money(variation.price)}</b>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="purchase-row">
        <div className="quantity-control" aria-label="Quantidade">
          <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade">
            <Minus className="size-4" />
          </button>
          <strong>{quantity}</strong>
          <button type="button" onClick={() => setQuantity((value) => value + 1)} aria-label="Aumentar quantidade">
            <Plus className="size-4" />
          </button>
        </div>
        <div className="delivery-card">
          <span>Entrega estimada</span>
          <strong>Hoje, entre 10h e 11h</strong>
        </div>
      </div>

      <div className="product-total">
        <span>Total</span>
        <strong>{money(price * quantity)}</strong>
      </div>

      <p className={`product-config-status ${canAddToCart ? 'is-ready' : ''}`}>
        {added ? <CheckCircle2 className="size-4" /> : null}
        {statusMessage}
      </p>

      <div className="product-action-row">
        <button className="product-cta" type="button" disabled={!canAddToCart} onClick={handleAddToCart}>
          <ShoppingCart className="size-5" />
          Adicionar ao carrinho
        </button>
        {added ? (
          <Link className="product-secondary-cta" href="/carrinho">
            Ver carrinho
          </Link>
        ) : null}
      </div>
    </section>
  );
}
