'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { CheckCircle2, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { money, type Product } from '@/lib/store-data';

type ProductConfiguratorProps = {
  product: Product;
  storeOpen: boolean;
  allowDelivery: boolean;
  businessHours: string;
};

export function ProductConfigurator({ product, storeOpen, allowDelivery, businessHours }: ProductConfiguratorProps) {
  const hasRequiredVariation = Boolean(product.variations?.length);
  const [variationId, setVariationId] = useState(product.variations?.[0]?.id || '');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const selectedVariation = product.variations?.find((variation) => variation.id === variationId);
  const price = selectedVariation?.price || product.price;
  const productUnavailable = product.unavailable || product.canBuy === false;
  const variationUnavailable = selectedVariation?.unavailable || selectedVariation?.canBuy === false;
  const canAddToCart = !productUnavailable && !variationUnavailable && (!hasRequiredVariation || Boolean(selectedVariation));
  const requiredLabel = product.category === 'gas' ? 'marca' : 'fragrancia';
  const currentMinute = useSyncExternalStore(subscribeToClock, getMinuteSnapshot, getServerMinuteSnapshot);
  const deliveryEstimate = useMemo(
    () => currentMinute ? calculateDeliveryEstimate(currentMinute, product.category, storeOpen, allowDelivery, businessHours) : 'Calculando prazo...',
    [allowDelivery, businessHours, currentMinute, product.category, storeOpen]
  );

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
      <div className="product-price-panel product-price-panel-live">
        <div>
          <span>{selectedVariation ? `${requiredLabel} selecionada` : 'Valor inicial'}</span>
          <strong>{money(price)}</strong>
          {product.oldPrice && !selectedVariation ? <del>{money(product.oldPrice)}</del> : null}
          <small>
            {selectedVariation
              ? `${selectedVariation.label} sera usado neste pedido.`
              : product.variations?.length
                ? `Escolha a ${requiredLabel} para confirmar o valor.`
                : 'Valor do produto por unidade.'}
          </small>
        </div>
        {selectedVariation ? (
          <b className="selected-option-pill">
            <CheckCircle2 className="size-4" />
            {selectedVariation.label}
          </b>
        ) : null}
      </div>

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
                <span>{variation.helper.replace(/^SKU\s+/i, 'SKU ')}</span>
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
          <span>Previsao calculada agora</span>
          <strong>{deliveryEstimate}</strong>
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

function subscribeToClock(callback: () => void) {
  const timer = window.setInterval(callback, 30_000);
  return () => window.clearInterval(timer);
}

function getMinuteSnapshot() {
  return Math.floor(Date.now() / 60_000);
}

function getServerMinuteSnapshot() {
  return 0;
}

function calculateDeliveryEstimate(
  currentMinute: number,
  category: Product['category'],
  storeOpen: boolean,
  allowDelivery: boolean,
  businessHours: string
) {
  if (!allowDelivery) return 'Disponivel somente para retirada';
  if (!storeOpen) return 'Entregas pausadas pela loja';

  const timing = category === 'gas'
    ? { preparation: 25, window: 25 }
    : category === 'agua'
      ? { preparation: 35, window: 30 }
      : { preparation: 45, window: 30 };
  const now = new Date(currentMinute * 60_000);
  const start = findNextDeliveryStart(now, timing.preparation, timing.window, businessHours);
  const end = addMinutes(start, timing.window);
  const dayLabel = formatDeliveryDay(now, start);
  const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dayLabel}, entre ${timeFormatter.format(start)} e ${timeFormatter.format(end)}`;
}

function findNextDeliveryStart(now: Date, preparationMinutes: number, windowMinutes: number, businessHours: string) {
  for (let offset = 0; offset < 8; offset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const { openingHour, closingHour } = storeHours(day.getDay(), businessHours);
    const opening = new Date(day);
    opening.setHours(openingHour, 0, 0, 0);
    const closing = new Date(day);
    closing.setHours(closingHour, 0, 0, 0);
    const candidate = offset === 0 && now >= opening ? addMinutes(now, preparationMinutes) : addMinutes(opening, preparationMinutes);
    if (addMinutes(candidate, windowMinutes) <= closing) return candidate;
  }

  return addMinutes(now, preparationMinutes);
}

function storeHours(day: number, businessHours: string) {
  const windows = Array.from(businessHours.matchAll(/(\d{1,2})h(?:\d{2})?\s*-\s*(\d{1,2})h(?:\d{2})?/gi));
  const selected = day === 0 ? windows[windows.length - 1] : windows[0];
  const openingHour = Number(selected?.[1]);
  const closingHour = Number(selected?.[2]);
  if (Number.isFinite(openingHour) && Number.isFinite(closingHour)) return { openingHour, closingHour };
  return day === 0 ? { openingHour: 9, closingHour: 14 } : { openingHour: 9, closingHour: 20 };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function formatDeliveryDay(now: Date, delivery: Date) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(delivery);
  target.setHours(0, 0, 0, 0);
  const difference = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (difference === 0) return 'Hoje';
  if (difference === 1) return 'Amanha';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(delivery);
}
