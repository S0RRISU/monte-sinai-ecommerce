import type { AdminModule, ModuleAccessMap } from './module-access';

export type AdminRole = 'cliente' | 'equipe' | 'motoboy' | 'admin' | 'developer';

export type AdminProfile = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  isAdmin: boolean;
  avatarUrl?: string;
  moduleAccess?: ModuleAccessMap;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  roleLabel: string;
  active: boolean;
  avatarUrl?: string;
  lastAccess?: string | null;
  moduleCount: number;
  updatedAt?: string | null;
};

export type UserModulePermission = {
  userId: string;
  module: AdminModule;
  enabled: boolean;
  locked: boolean;
  source: string;
};

export type AdminSiteConfig = {
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
  deliveryFee: string;
  freeDeliveryMinimum: string;
  minimumOrder: string;
  deliveryAreas: string;
  allowDelivery: boolean;
  allowPickup: boolean;
  showUnavailableProducts: boolean;
  featuredProductSlug: string;
  visibleCategories: string;
  productSort: 'catalog' | 'name' | 'offers';
  showFeaturedSection: boolean;
  showOffersSection: boolean;
  defaultOrderStatus: OrderStatus;
  defaultPaymentStatus: PaymentStatus;
  defaultOrderOrigin: OrderOrigin;
  whatsappTemplate: string;
  acceptPix: boolean;
  acceptCash: boolean;
  acceptCard: boolean;
  requireEmail: boolean;
  blockUnavailableProducts: boolean;
  alertNewOrders: boolean;
  alertLowStock: boolean;
  alertUnavailableProducts: boolean;
  alertCheckoutErrors: boolean;
};

export type OrderStatus = 'Recebido' | 'A confirmar' | 'Em separação' | 'A caminho' | 'Entregue' | 'Cancelado';
export type PaymentStatus = 'Pendente' | 'Pago' | 'Cancelado';
export type OrderOrigin = 'site' | 'presencial' | 'telefone' | 'whatsapp';

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  variation: string;
  quantity: number;
  price: number;
  total: number;
  image: string;
};

export type Order = {
  id: string;
  code: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  payment: string;
  origin: OrderOrigin;
  confirmed: boolean;
  total: number;
  subtotal: number;
  delivery: number;
  discount: number;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  items: OrderItem[];
  archivedAt?: string | null;
};

export type ManualOrderItemInput = {
  productId: string;
  variationId?: string | null;
  name: string;
  variationName?: string;
  quantity: number;
  price: number;
  image?: string;
};

export type ManualOrderInput = {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  payment: string;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  discount: number;
  notes: string;
  items: ManualOrderItemInput[];
};

export type ProductVariation = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  promoPrice: number | null;
  stock: number | null;
  minStock: number;
  image: string;
  offerActive: boolean;
  active: boolean;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
  images: string[];
  price: number;
  promoPrice: number | null;
  stock: number | null;
  minStock: number;
  active: boolean;
  storeVisible: boolean;
  catalogVisible: boolean;
  featured: boolean;
  offerActive: boolean;
  variations: ProductVariation[];
  updatedAt: string;
};

export type StockMovementType =
  | 'entrada'
  | 'saida_venda'
  | 'ajuste'
  | 'ajuste_entrada'
  | 'ajuste_saida'
  | 'cancelamento'
  | 'devolucao'
  | 'perda';

export type StockMovement = {
  id: string;
  productId: string;
  variationId: string | null;
  productName: string;
  variationName: string;
  sku: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number | null;
  newStock: number | null;
  reason: string;
  supplier: string;
  document: string;
  unitCost: number | null;
  occurredAt: string;
  registeredAt: string;
  responsibleName: string;
  responsibleEmail: string;
  groupId: string | null;
  orderId: string | null;
};

export type StockMovementInput = {
  productId: string;
  variationId?: string | null;
  type: Exclude<StockMovementType, 'saida_venda' | 'ajuste'>;
  quantity: number;
  reason?: string;
  supplier?: string;
  document?: string;
  unitCost?: number | null;
  occurredAt?: string;
  groupId?: string | null;
};

export type DashboardMetrics = {
  totalOrders: number;
  todayOrders: number;
  revenue: number;
  averageTicket: number;
  activeProducts: number;
  lowStock: number;
  deliveredOrders: number;
  openOrders: number;
};
