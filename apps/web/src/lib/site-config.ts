import { categories, type ProductCategory } from './store-data';

export type StorefrontSiteConfig = {
  name: string;
  tagline: string;
  whatsapp: string;
  contactEmail: string;
  instagram: string;
  address: string;
  businessHours: string;
  topNotice: string;
  storeOpen: boolean;
  maintenanceMessage: string;
  checkoutMessage: string;
  deliveryFee: number;
  freeDeliveryMinimum: number;
  minimumOrder: number;
  deliveryAreas: string;
  allowDelivery: boolean;
  allowPickup: boolean;
  showUnavailableProducts: boolean;
  featuredProductSlug: string;
  visibleCategories: ProductCategory[];
  productSort: 'catalog' | 'name' | 'offers';
  showFeaturedSection: boolean;
  showOffersSection: boolean;
  defaultOrderStatus: string;
  defaultPaymentStatus: string;
  defaultOrderOrigin: 'site' | 'presencial' | 'telefone' | 'whatsapp';
  whatsappTemplate: string;
  acceptPix: boolean;
  acceptCash: boolean;
  acceptCard: boolean;
  requireEmail: boolean;
  blockUnavailableProducts: boolean;
};

export const defaultSiteConfig: StorefrontSiteConfig = {
  name: 'Monte Sinai',
  tagline: 'Agua, gas e limpeza',
  whatsapp: '5511960928234',
  contactEmail: '',
  instagram: '',
  address: 'Centro, Montes Claros - MG',
  businessHours: 'Seg. a sab. 09h-20h / Dom. 09h-14h',
  topNotice: 'Atendimento pelo WhatsApp e entregas todos os dias.',
  storeOpen: true,
  maintenanceMessage: 'A loja esta temporariamente fechada. Voltaremos em breve.',
  checkoutMessage: 'A loja confirma os detalhes pelo WhatsApp antes de separar o pedido.',
  deliveryFee: 5,
  freeDeliveryMinimum: 80,
  minimumOrder: 0,
  deliveryAreas: 'Centro e bairros proximos',
  allowDelivery: true,
  allowPickup: true,
  showUnavailableProducts: false,
  featuredProductSlug: '',
  visibleCategories: ['agua', 'gas', 'limpeza', 'utensilios', 'ofertas'],
  productSort: 'catalog',
  showFeaturedSection: true,
  showOffersSection: true,
  defaultOrderStatus: 'Recebido',
  defaultPaymentStatus: 'Pendente',
  defaultOrderOrigin: 'site',
  whatsappTemplate: 'Ola, quero confirmar meu pedido {{codigo}} no valor de {{total}}.',
  acceptPix: true,
  acceptCash: true,
  acceptCard: true,
  requireEmail: false,
  blockUnavailableProducts: true
};

const categoryIds = new Set(categories.map((category) => category.id));

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asMoney(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function asChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T) {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : fallback;
}

function mapCategories(value: unknown) {
  const source = Array.isArray(value) ? value : asString(value, defaultSiteConfig.visibleCategories.join(',')).split(',');
  const selected = source
    .map((item) => asString(item).trim())
    .filter((item): item is ProductCategory => categoryIds.has(item as ProductCategory));
  return selected.length ? selected : defaultSiteConfig.visibleCategories;
}

export function mapSiteConfig(value: unknown): StorefrontSiteConfig {
  const record = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    name: asString(record.name, defaultSiteConfig.name),
    tagline: asString(record.tagline, defaultSiteConfig.tagline),
    whatsapp: asString(record.whatsapp, defaultSiteConfig.whatsapp),
    contactEmail: asString(record.contactEmail, defaultSiteConfig.contactEmail),
    instagram: asString(record.instagram, defaultSiteConfig.instagram),
    address: asString(record.address, defaultSiteConfig.address),
    businessHours: asString(record.businessHours, defaultSiteConfig.businessHours),
    topNotice: asString(record.topNotice, defaultSiteConfig.topNotice),
    storeOpen: asBoolean(record.storeOpen, defaultSiteConfig.storeOpen),
    maintenanceMessage: asString(record.maintenanceMessage, defaultSiteConfig.maintenanceMessage),
    checkoutMessage: asString(record.checkoutMessage, defaultSiteConfig.checkoutMessage),
    deliveryFee: asMoney(record.deliveryFee, defaultSiteConfig.deliveryFee),
    freeDeliveryMinimum: asMoney(record.freeDeliveryMinimum, defaultSiteConfig.freeDeliveryMinimum),
    minimumOrder: asMoney(record.minimumOrder, defaultSiteConfig.minimumOrder),
    deliveryAreas: asString(record.deliveryAreas, defaultSiteConfig.deliveryAreas),
    allowDelivery: asBoolean(record.allowDelivery, defaultSiteConfig.allowDelivery),
    allowPickup: asBoolean(record.allowPickup, defaultSiteConfig.allowPickup),
    showUnavailableProducts: asBoolean(record.showUnavailableProducts, defaultSiteConfig.showUnavailableProducts),
    featuredProductSlug: asString(record.featuredProductSlug, defaultSiteConfig.featuredProductSlug),
    visibleCategories: mapCategories(record.visibleCategories),
    productSort: asChoice(record.productSort, ['catalog', 'name', 'offers'] as const, defaultSiteConfig.productSort),
    showFeaturedSection: asBoolean(record.showFeaturedSection, defaultSiteConfig.showFeaturedSection),
    showOffersSection: asBoolean(record.showOffersSection, defaultSiteConfig.showOffersSection),
    defaultOrderStatus: asString(record.defaultOrderStatus, defaultSiteConfig.defaultOrderStatus),
    defaultPaymentStatus: asString(record.defaultPaymentStatus, defaultSiteConfig.defaultPaymentStatus),
    defaultOrderOrigin: asChoice(record.defaultOrderOrigin, ['site', 'presencial', 'telefone', 'whatsapp'] as const, defaultSiteConfig.defaultOrderOrigin),
    whatsappTemplate: asString(record.whatsappTemplate, defaultSiteConfig.whatsappTemplate),
    acceptPix: asBoolean(record.acceptPix, defaultSiteConfig.acceptPix),
    acceptCash: asBoolean(record.acceptCash, defaultSiteConfig.acceptCash),
    acceptCard: asBoolean(record.acceptCard, defaultSiteConfig.acceptCard),
    requireEmail: asBoolean(record.requireEmail, defaultSiteConfig.requireEmail),
    blockUnavailableProducts: asBoolean(record.blockUnavailableProducts, defaultSiteConfig.blockUnavailableProducts)
  };
}

export function visibleStoreCategories(config: StorefrontSiteConfig = defaultSiteConfig) {
  const visibleIds = new Set(config.visibleCategories);
  return categories.filter((category) => visibleIds.has(category.id));
}
