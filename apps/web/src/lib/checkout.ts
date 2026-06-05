'use client';

import type { CartItem } from './cart-store';
import { getCartTotals } from './cart-store';
import type { StorefrontSiteConfig } from './site-config';
import { getSupabaseBrowserClient } from './supabase-client';

export type CheckoutFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  complement: string;
  deliveryWindow: string;
  payment: string;
  notes: string;
};

export type SavedOrder = {
  code: string;
  orderId: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  address: string;
  payment: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  delivery: number;
  discount: number;
  total: number;
  items: CartItem[];
};

type CreateOrderResponse = {
  order_id?: string;
  codigo?: string;
  subtotal?: number | string;
  desconto?: number | string;
  entrega?: number | string;
  total?: number | string;
};

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

const ordersKey = 'monte-sinai-orders-v1';

function toNumber(value: number | string | undefined, fallback: number) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return fallback;
}

function cleanPhone(phone: string) {
  return phone.replace(/\D/g, '');
}

function buildOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(2, 10).replaceAll('-', '');
  const random = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `MS-${date}-${random}`;
}

export function validateCheckout(form: CheckoutFormData, items: CartItem[], config?: StorefrontSiteConfig) {
  const totals = getCartTotals(items, config);
  if (!items.length) return 'Seu carrinho esta vazio.';
  if (config?.storeOpen === false) return config.maintenanceMessage || 'A loja esta temporariamente fechada para pedidos.';
  if (config?.minimumOrder && totals.subtotal < config.minimumOrder) return `Pedido minimo de ${formatMoney(config.minimumOrder)}.`;
  if (config?.allowDelivery === false && config?.allowPickup === false) return 'A loja esta temporariamente fechada para pedidos.';
  if (!form.name.trim()) return 'Informe o nome de quem vai receber.';
  if (cleanPhone(form.phone).length < 10) return 'Informe um telefone valido para contato.';
  if (config?.requireEmail && !form.email.trim()) return 'Informe seu e-mail para finalizar o pedido.';
  if (config?.allowDelivery !== false && !form.address.trim()) return 'Informe o endereco de entrega.';
  if (!form.payment) return 'Escolha a forma de pagamento.';
  if (config && !availablePayments(config).includes(form.payment)) return 'Escolha uma forma de pagamento disponivel.';
  return '';
}

export async function submitCheckoutOrder(form: CheckoutFormData, items: CartItem[], config?: StorefrontSiteConfig) {
  const validationMessage = validateCheckout(form, items, config);
  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const totals = getCartTotals(items, config);
  const code = buildOrderCode();
  const supabase = getSupabaseBrowserClient() as unknown as RpcClient;

  const orderPayload = {
    codigo: code,
    cliente_nome: form.name.trim(),
    cliente_email: form.email.trim(),
    cliente_telefone: cleanPhone(form.phone),
    endereco_entrega:
      config?.allowDelivery === false
        ? 'Retirada na loja'
        : [form.address.trim(), form.complement.trim()].filter(Boolean).join(' - '),
    observacao: [config?.allowDelivery === false ? 'Retirada na loja' : form.deliveryWindow, form.notes.trim()].filter(Boolean).join(' | '),
    pagamento: form.payment,
    status: config?.defaultOrderStatus || 'Recebido',
    pagamento_status: config?.defaultPaymentStatus || 'Pendente',
    origem: config?.defaultOrderOrigin || 'site',
    desconto: totals.discount,
    entrega: totals.delivery,
    whatsapp_enviado: false
  };

  const itemsPayload = items.map((item) => ({
    nome: item.productName,
    variacao: item.variationLabel || '',
    quantidade: item.quantity,
    preco_unitario: item.unitPrice,
    imagem: item.image
  }));

  const { data, error } = await supabase.rpc('create_order', {
    order_payload: orderPayload,
    items_payload: itemsPayload
  });

  if (error) {
    throw new Error(error.message || 'Nao foi possivel finalizar o pedido.');
  }

  const response = (data || {}) as CreateOrderResponse;

  const savedOrder: SavedOrder = {
    code: response.codigo || code,
    orderId: response.order_id || code,
    createdAt: new Date().toISOString(),
    customerName: orderPayload.cliente_nome,
    customerPhone: orderPayload.cliente_telefone,
    address: orderPayload.endereco_entrega,
    payment: orderPayload.pagamento,
    status: orderPayload.status,
    paymentStatus: orderPayload.pagamento_status,
    subtotal: toNumber(response.subtotal, totals.subtotal),
    delivery: toNumber(response.entrega, totals.delivery),
    discount: toNumber(response.desconto, totals.discount),
    total: toNumber(response.total, totals.total),
    items
  };

  saveLocalOrder(savedOrder);
  return savedOrder;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function availablePayments(config: StorefrontSiteConfig) {
  return [
    config.acceptPix ? 'Pix na entrega' : '',
    config.acceptCash ? 'Dinheiro' : '',
    config.acceptCard ? 'Cartao na entrega' : ''
  ].filter(Boolean);
}

export function getLocalOrders(): SavedOrder[] {
  if (typeof window === 'undefined') return [];

  try {
    return JSON.parse(window.localStorage.getItem(ordersKey) || '[]') as SavedOrder[];
  } catch {
    return [];
  }
}

export function saveLocalOrder(order: SavedOrder) {
  if (typeof window === 'undefined') return;

  const existingOrders = getLocalOrders().filter((savedOrder) => savedOrder.code !== order.code);
  window.localStorage.setItem(ordersKey, JSON.stringify([order, ...existingOrders].slice(0, 20)));
}
