'use client';

import { getSupabaseClient } from './supabase';
import { resolveAdminImageUrl } from './assets';
import { slugify } from './format';
import { officialStoreUrl, storeConfig } from './constants';
import { defaultModuleAccess, normalizeModuleAccess, type AdminModule } from './module-access';
import { canonicalRole } from './roles';
import type {
  AdminProfile,
  AdminRole,
  AdminSiteConfig,
  AdminUser,
  ManualOrderInput,
  Order,
  OrderOrigin,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductVariation,
  StockMovement,
  StockMovementInput,
  StockMovementType,
  UserModulePermission
} from './types';

type JsonRecord = Record<string, unknown>;

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function asRecord(value: unknown): JsonRecord {
  if (Array.isArray(value)) return (value[0] as JsonRecord | undefined) || {};
  return value && typeof value === 'object' ? (value as JsonRecord) : {};
}

function asChoice<T extends string>(value: unknown, choices: readonly T[], fallback: T) {
  return typeof value === 'string' && choices.includes(value as T) ? (value as T) : fallback;
}

function normalizeNumericSku(seed: string) {
  const digits = seed.replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(-8);

  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000000;
  }

  return String(hash || Date.now()).replace(/\D/g, '').slice(-8).padStart(8, '0');
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [record.message, record.details, record.hint]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .map((part) => part.trim());
    if (parts.length) return parts.join(' ');
    if (typeof record.code === 'string') return `${fallback} (${record.code})`;
  }
  return fallback;
}

function isMissingRpc(error: unknown, rpcName: string) {
  const message = errorMessage(error, '').toLowerCase();
  return message.includes(rpcName.toLowerCase()) && (message.includes('schema cache') || message.includes('could not find') || message.includes('not found'));
}

function throwSupabaseError(error: unknown, fallback: string): never {
  throw new Error(errorMessage(error, fallback));
}

function normalizeOrderStatus(value: unknown, confirmed = false): OrderStatus {
  const clean = asString(value, 'Recebido')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();

  if (['a confirmar', 'aguardando confirmacao', 'confirmar', 'pendente confirmacao'].includes(clean)) return 'A confirmar';
  if (['recebido', 'pedido enviado', 'pendente'].includes(clean)) return confirmed ? 'Recebido' : 'A confirmar';
  if (['preparando', 'em preparacao', 'em separacao', 'separacao'].includes(clean)) return 'Em separação';
  if (['a caminho', 'saiu para entrega', 'saiu', 'em rota', 'rota'].includes(clean)) return 'A caminho';
  if (['entregue', 'entregues', 'finalizado', 'concluido', 'concluida'].includes(clean)) return 'Entregue';
  if (['cancelado', 'cancelada', 'cancelados'].includes(clean)) return 'Cancelado';
  return confirmed ? 'Recebido' : 'A confirmar';
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const clean = asString(value, 'Pendente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (clean === 'pago' || clean === 'paga') return 'Pago';
  if (clean === 'cancelado' || clean === 'cancelada') return 'Cancelado';
  return 'Pendente';
}

function normalizeOrderOrigin(value: unknown): OrderOrigin {
  const clean = asString(value, 'site')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (clean === 'presencial') return 'presencial';
  if (clean === 'telefone') return 'telefone';
  if (clean === 'whatsapp') return 'whatsapp';
  return 'site';
}

const defaultSiteConfig: AdminSiteConfig = {
  name: storeConfig.name,
  tagline: storeConfig.tagline,
  whatsapp: storeConfig.whatsapp,
  contactEmail: '',
  instagram: '',
  address: '',
  businessHours: 'Seg. a sab. 09h-20h / Dom. 09h-14h',
  topNotice: 'Atendimento pelo WhatsApp e entregas todos os dias.',
  storeOpen: true,
  maintenanceMessage: 'A loja esta temporariamente fechada. Voltaremos em breve.',
  checkoutMessage: 'A loja confirma os detalhes pelo WhatsApp antes de separar o pedido.',
  deliveryFee: '',
  freeDeliveryMinimum: '80',
  minimumOrder: '',
  deliveryAreas: '',
  allowDelivery: true,
  allowPickup: true,
  showUnavailableProducts: false,
  featuredProductSlug: '',
  visibleCategories: 'agua,gas,limpeza,utensilios,ofertas',
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
  blockUnavailableProducts: true,
  alertNewOrders: true,
  alertLowStock: true,
  alertUnavailableProducts: true,
  alertCheckoutErrors: true
};

function mapSiteConfig(value: unknown): AdminSiteConfig {
  const record = value && typeof value === 'object' ? (value as JsonRecord) : {};
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
    deliveryFee: asString(record.deliveryFee, defaultSiteConfig.deliveryFee),
    freeDeliveryMinimum: asString(record.freeDeliveryMinimum, defaultSiteConfig.freeDeliveryMinimum),
    minimumOrder: asString(record.minimumOrder, defaultSiteConfig.minimumOrder),
    deliveryAreas: asString(record.deliveryAreas, defaultSiteConfig.deliveryAreas),
    allowDelivery: asBoolean(record.allowDelivery, defaultSiteConfig.allowDelivery),
    allowPickup: asBoolean(record.allowPickup, defaultSiteConfig.allowPickup),
    showUnavailableProducts: asBoolean(record.showUnavailableProducts, defaultSiteConfig.showUnavailableProducts),
    featuredProductSlug: asString(record.featuredProductSlug, defaultSiteConfig.featuredProductSlug),
    visibleCategories: asString(record.visibleCategories, defaultSiteConfig.visibleCategories),
    productSort: asChoice(record.productSort, ['catalog', 'name', 'offers'] as const, defaultSiteConfig.productSort),
    showFeaturedSection: asBoolean(record.showFeaturedSection, defaultSiteConfig.showFeaturedSection),
    showOffersSection: asBoolean(record.showOffersSection, defaultSiteConfig.showOffersSection),
    defaultOrderStatus: asChoice(
      record.defaultOrderStatus,
      ['Recebido', 'A confirmar', 'Em separação', 'A caminho', 'Entregue', 'Cancelado'] as const,
      defaultSiteConfig.defaultOrderStatus
    ),
    defaultPaymentStatus: asChoice(record.defaultPaymentStatus, ['Pendente', 'Pago', 'Cancelado'] as const, defaultSiteConfig.defaultPaymentStatus),
    defaultOrderOrigin: asChoice(record.defaultOrderOrigin, ['site', 'presencial', 'telefone', 'whatsapp'] as const, defaultSiteConfig.defaultOrderOrigin),
    whatsappTemplate: asString(record.whatsappTemplate, defaultSiteConfig.whatsappTemplate),
    acceptPix: asBoolean(record.acceptPix, defaultSiteConfig.acceptPix),
    acceptCash: asBoolean(record.acceptCash, defaultSiteConfig.acceptCash),
    acceptCard: asBoolean(record.acceptCard, defaultSiteConfig.acceptCard),
    requireEmail: asBoolean(record.requireEmail, defaultSiteConfig.requireEmail),
    blockUnavailableProducts: asBoolean(record.blockUnavailableProducts, defaultSiteConfig.blockUnavailableProducts),
    alertNewOrders: asBoolean(record.alertNewOrders, defaultSiteConfig.alertNewOrders),
    alertLowStock: asBoolean(record.alertLowStock, defaultSiteConfig.alertLowStock),
    alertUnavailableProducts: asBoolean(record.alertUnavailableProducts, defaultSiteConfig.alertUnavailableProducts),
    alertCheckoutErrors: asBoolean(record.alertCheckoutErrors, defaultSiteConfig.alertCheckoutErrors)
  };
}

function mapProfile(row: JsonRecord = {}): AdminProfile {
  const role = canonicalRole(asString(row.role), {
    adminRole: asString(row.admin_role),
    isAdmin: asBoolean(row.is_admin)
  });

  return {
    id: asString(row.id),
    email: asString(row.email),
    name: asString(row.nome) || asString(row.name) || asString(row.email),
    role,
    isAdmin: role === 'admin' || role === 'developer',
    avatarUrl: asString(row.avatar_url) || asString(row.foto) || asString(row.photo_url),
    moduleAccess: defaultModuleAccess(role)
  };
}

function roleLabel(role: AdminRole) {
  const labels: Record<AdminRole, string> = {
    cliente: 'Cliente',
    equipe: 'Equipe',
    motoboy: 'Entregador',
    admin: 'Administrador',
    developer: 'Desenvolvedor'
  };
  return labels[role];
}

function mapAdminUser(row: JsonRecord = {}): AdminUser {
  const role = canonicalRole(asString(row.role), {
    adminRole: asString(row.admin_role),
    isAdmin: asBoolean(row.is_admin)
  });
  const hasPanelRole = role !== 'cliente';

  return {
    id: asString(row.id),
    email: asString(row.email),
    name: asString(row.name) || asString(row.nome) || asString(row.email, 'Usuário'),
    role,
    roleLabel: asString(row.role_label) || roleLabel(role),
    active: hasPanelRole && asBoolean(row.active, true),
    avatarUrl: asString(row.avatar_url) || asString(row.foto) || asString(row.photo_url),
    lastAccess: asString(row.last_access) || null,
    moduleCount: asNumber(row.module_count),
    updatedAt: asString(row.updated_at) || null
  };
}

async function withModuleAccess(profile: AdminProfile) {
  return {
    ...profile,
    moduleAccess: await fetchCurrentModuleAccess(profile.role)
  };
}

export async function getCurrentProfile() {
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) return null;
  const user = userData.user;
  if (!user) return null;
  const userMetadata = asRecord(user.user_metadata);
  const metadataAvatar =
    asString(userMetadata.avatar_url) ||
    asString(userMetadata.picture) ||
    asString(userMetadata.foto) ||
    asString(userMetadata.photo_url);

  try {
    const { data, error } = await client.rpc('app_current_profile');
    if (error) throw error;
    if (data && typeof data === 'object') {
      const { data: photoData } = await client.from('profiles').select('foto').eq('id', user.id).maybeSingle();
      return withModuleAccess(
        mapProfile({
          ...(data as JsonRecord),
          foto: asString((photoData as JsonRecord | null)?.foto) || metadataAvatar
        })
      );
    }
  } catch {
    // Fallback keeps the guard usable if the RPC was not installed yet.
  }

  const { data, error } = await client
    .from('profiles')
    .select('id, email, nome, role, admin_role, is_admin, foto')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return withModuleAccess(
    mapProfile({
      ...((data || { id: user.id, email: user.email }) as JsonRecord),
      foto: asString((data as JsonRecord | null)?.foto) || metadataAvatar
    })
  );
}

export async function fetchCurrentModuleAccess(role: AdminProfile['role']) {
  if (role === 'developer') return defaultModuleAccess(role);
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('app_current_module_access', {});
    if (error) throw error;
    return normalizeModuleAccess(role, data);
  } catch {
    return defaultModuleAccess(role);
  }
}

export async function fetchDeveloperModulePermissions() {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_module_permissions', {});
  if (error) throw error;
  return (data || []).map((row) => ({
    role: asString((row as JsonRecord).role),
    module: asString((row as JsonRecord).module) as AdminModule,
    enabled: asBoolean((row as JsonRecord).enabled)
  }));
}

export async function setDeveloperModulePermission(role: 'admin', module: AdminModule, enabled: boolean) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_set_module_permission', {
    p_role: role,
    p_module: module,
    p_enabled: enabled
  });
  if (error) throw error;
  return data;
}

export async function fetchAdminUsers() {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_users_overview', {});
  if (error) {
    if (isMissingRpc(error, 'developer_users_overview')) {
      throw new Error(
        'A RPC developer_users_overview ainda nao existe no Supabase. Rode o SQL supabase/20260603-admin-user-access.sql; o arquivo 20260603-admin-module-permissions.sql nao lista usuarios reais.'
      );
    }
    throwSupabaseError(error, 'Nao foi possivel carregar usuarios reais do Supabase.');
  }
  return (data || []).map((row) => mapAdminUser(row as JsonRecord));
}

export async function fetchUserModulePermissions(userId: string): Promise<UserModulePermission[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_user_module_permissions', {
    p_user_id: userId
  });
  if (error) throwSupabaseError(error, 'Nao foi possivel carregar permissoes do usuario.');
  return (data || []).map((row) => ({
    userId: asString((row as JsonRecord).user_id) || userId,
    module: asString((row as JsonRecord).module) as AdminModule,
    enabled: asBoolean((row as JsonRecord).enabled),
    locked: asBoolean((row as JsonRecord).locked),
    source: asString((row as JsonRecord).source)
  }));
}

export async function setUserModulePermission(userId: string, module: AdminModule, enabled: boolean) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_set_user_module_permission', {
    p_user_id: userId,
    p_module: module,
    p_enabled: enabled
  });
  if (error) throwSupabaseError(error, 'Nao foi possivel salvar permissao do modulo.');
  return data;
}

export async function setUserAccess(userId: string, role: AdminRole, active: boolean) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('developer_set_user_access', {
    p_user_id: userId,
    p_role: role,
    p_active: active
  });
  if (error) throwSupabaseError(error, 'Nao foi possivel alterar acesso do usuario.');
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapAdminUser(row as JsonRecord) : null;
}

export async function sendUserPasswordRecovery(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) throw new Error('Este usuario nao tem e-mail cadastrado.');

  const redirectTo = `${officialStoreUrl.replace(/\/$/, '')}/login?recovery=1`;
  const client = getSupabaseClient();
  const { error } = await client.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
  if (error) throwSupabaseError(error, 'Nao foi possivel enviar recuperacao de senha.');
}

function mapOrderItem(row: JsonRecord = {}): Order['items'][number] {
  return {
    id: asString(row.id) || asString(row.produto_id) || asString(row.nome),
    productId: asString(row.produto_id) || null,
    name: asString(row.nome, 'Item'),
    variation: asString(row.variacao),
    quantity: asNumber(row.quantidade, 1),
    price: asNumber(row.preco_unitario),
    total: asNumber(row.total),
    image: resolveAdminImageUrl(asString(row.imagem))
  };
}

function mapOrder(row: JsonRecord = {}): Order {
  const items = Array.isArray(row.pedido_itens) ? row.pedido_itens : [];
  const confirmed = asBoolean(row.confirmado);

  return {
    id: asString(row.id),
    code: asString(row.codigo) || asString(row.id),
    status: normalizeOrderStatus(row.status, confirmed),
    paymentStatus: normalizePaymentStatus(row.pagamento_status),
    payment: asString(row.pagamento),
    origin: normalizeOrderOrigin(row.origem),
    confirmed,
    total: asNumber(row.total),
    subtotal: asNumber(row.subtotal),
    delivery: asNumber(row.entrega),
    discount: asNumber(row.desconto),
    createdAt: asString(row.created_at),
    customer: {
      name: asString(row.cliente_nome),
      email: asString(row.cliente_email),
      phone: asString(row.cliente_telefone),
      address: asString(row.endereco_entrega)
    },
    items: items.map((item) => mapOrderItem(item as JsonRecord)),
    archivedAt: asString(row.archived_at) || null
  };
}

function mapVariation(row: JsonRecord = {}): ProductVariation {
  return {
    id: asString(row.id),
    productId: asString(row.produto_id),
    name: asString(row.nome),
    sku: asString(row.sku),
    price: asNumber(row.preco),
    promoPrice: row.preco_promocional === null || row.preco_promocional === undefined ? null : asNumber(row.preco_promocional),
    stock: row.estoque === null || row.estoque === undefined ? null : asNumber(row.estoque),
    minStock: asNumber(row.estoque_minimo, 0),
    image: resolveAdminImageUrl(asString(row.imagem)),
    offerActive: asBoolean(row.oferta_ativa),
    active: row.ativo !== false
  };
}

function mapProduct(row: JsonRecord = {}, variations: ProductVariation[] = [], images: string[] = []): Product {
  return {
    id: asString(row.id),
    name: asString(row.nome, 'Produto'),
    category: asString(row.categoria, 'Produtos'),
    description: asString(row.descricao_detalhada) || asString(row.descricao),
    image: resolveAdminImageUrl(asString(row.imagem)),
    images: images.map((image) => resolveAdminImageUrl(image)),
    price: asNumber(row.preco),
    promoPrice: row.preco_promocional === null || row.preco_promocional === undefined ? null : asNumber(row.preco_promocional),
    stock: row.estoque === null || row.estoque === undefined ? null : asNumber(row.estoque),
    minStock: asNumber(row.estoque_minimo, 0),
    active: row.ativo !== false,
    storeVisible: row.loja_visivel !== false,
    catalogVisible: row.catalogo_visivel !== false,
    featured: asBoolean(row.destaque) || asBoolean(row.catalogo_destaque),
    offerActive: asBoolean(row.oferta_ativa),
    variations,
    updatedAt: asString(row.updated_at) || asString(row.created_at)
  };
}

function mapStockMovement(row: JsonRecord = {}): StockMovement {
  const product = asRecord(row.produto);
  const variation = asRecord(row.variacao);
  const type = asChoice(
    row.tipo,
    ['entrada', 'saida_venda', 'ajuste', 'ajuste_entrada', 'ajuste_saida', 'cancelamento', 'devolucao', 'perda'] as const,
    'ajuste'
  ) as StockMovementType;

  return {
    id: asString(row.id),
    productId: asString(row.produto_id),
    variationId: asString(row.variacao_id) || null,
    productName: asString(product.nome, 'Produto removido'),
    variationName: asString(variation.nome),
    sku: asString(variation.sku),
    type,
    quantity: asNumber(row.quantidade),
    previousStock: row.estoque_anterior === null || row.estoque_anterior === undefined ? null : asNumber(row.estoque_anterior),
    newStock: row.estoque_novo === null || row.estoque_novo === undefined ? null : asNumber(row.estoque_novo),
    reason: asString(row.motivo),
    supplier: asString(row.fornecedor),
    document: asString(row.documento),
    unitCost: row.custo_unitario === null || row.custo_unitario === undefined ? null : asNumber(row.custo_unitario),
    occurredAt: asString(row.ocorrido_em) || asString(row.created_at),
    registeredAt: asString(row.created_at),
    responsibleName: asString(row.responsavel_nome, 'Sistema'),
    responsibleEmail: asString(row.responsavel_email),
    groupId: asString(row.grupo_id) || null,
    orderId: asString(row.pedido_id) || null
  };
}

export async function fetchAdminOrders(limit = 5000) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row) => mapOrder(row as JsonRecord));
}

export async function updateOrderStatus(orderId: string, payload: { status?: OrderStatus; paymentStatus?: PaymentStatus; confirmed?: boolean }) {
  const client = getSupabaseClient();
  const databaseStatus = payload.status ? toDatabaseOrderStatus(payload.status) : null;
  const confirmed = payload.confirmed ?? (payload.status ? toConfirmationValue(payload.status) : null);

  const { data, error } = await client.rpc('admin_update_order', {
    p_id: orderId,
    p_status: databaseStatus,
    p_pagamento_status: payload.paymentStatus || null,
    p_confirmado: confirmed
  });

  if (error) {
    const { data: fallbackData, error: fallbackError } = await client
      .from('pedidos')
      .update({
        ...(databaseStatus ? { status: databaseStatus } : {}),
        ...(payload.paymentStatus ? { pagamento_status: payload.paymentStatus } : {}),
        ...(confirmed !== null ? { confirmado: confirmed } : {})
      })
      .eq('id', orderId)
      .select('id')
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    if (!fallbackData) throw new Error('Pedido nao foi atualizado. Verifique permissao, RLS ou se o pedido ainda existe.');
    return fallbackData;
  }
  if (!hasUpdatedRow(data)) throw new Error('Pedido nao foi atualizado. Verifique permissao, RLS ou se o pedido ainda existe.');
  return data;
}

export async function deleteAdminOrder(orderId: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('admin_delete_order', { p_id: orderId });

  if (error) {
    if (isMissingRpc(error, 'admin_delete_order')) {
      throw new Error('Rode o SQL supabase/20260605-admin-excluir-pedido.sql para ativar a exclusao de pedidos.');
    }
    throwSupabaseError(error, 'Nao foi possivel excluir o pedido.');
  }

  if (!hasUpdatedRow(data)) throw new Error('Pedido nao foi excluido. Verifique permissao ou se o pedido ainda existe.');
  return data;
}

export async function fetchSiteConfig() {
  const client = getSupabaseClient();
  const { data, error } = await client.from('site_configuracoes').select('config').eq('id', 'site').maybeSingle();
  if (error) throw error;
  return mapSiteConfig((data as JsonRecord | null)?.config);
}

export async function saveSiteConfig(config: AdminSiteConfig) {
  const client = getSupabaseClient();
  const payload = mapSiteConfig(config);
  const { error } = await client
    .from('site_configuracoes')
    .upsert({ id: 'site', config: payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
  return payload;
}

export async function createManualOrder(input: ManualOrderInput) {
  const client = getSupabaseClient();
  const fallbackName = 'Cliente presencial';
  const fallbackPhone = '11900000000';
  const fallbackAddress = 'Venda presencial na loja';
  const cleanPhone = input.customer.phone.replace(/\D/g, '');
  const payload = {
    cliente_nome: input.customer.name.trim() || fallbackName,
    cliente_email: input.customer.email.trim(),
    cliente_telefone: cleanPhone.length >= 10 && cleanPhone.length <= 13 ? cleanPhone : fallbackPhone,
    endereco_entrega: input.customer.address.trim() || fallbackAddress,
    observacao: ['Venda presencial registrada pelo painel.', input.notes.trim()].filter(Boolean).join(' '),
    pagamento: input.payment,
    pagamento_status: input.paymentStatus,
    status: input.status,
    origem: 'presencial',
    entrega: 0,
    desconto: Math.max(Number(input.discount || 0), 0),
    whatsapp_enviado: false
  };
  const items = input.items.map((item) => ({
    produto_id: item.productId,
    variacao_id: item.variationId || null,
    nome: item.name,
    variacao: item.variationName || '',
    quantidade: item.quantity,
    preco_unitario: item.price,
    imagem: item.image || ''
  }));

  const { data, error } = await client.rpc('admin_create_manual_order', {
    order_payload: payload,
    items_payload: items
  });

  if (error) {
    if (isMissingRpc(error, 'admin_create_manual_order')) {
      throw new Error('Rode o SQL supabase/20260617-admin-venda-presencial.sql para ativar venda presencial pelo painel.');
    }
    throwSupabaseError(error, 'Nao foi possivel registrar a venda presencial.');
  }
  return data as { order_id?: string; codigo?: string; total?: number } | null;
}

function hasUpdatedRow(data: unknown) {
  if (Array.isArray(data)) return data.length > 0;
  return Boolean(data);
}

function toDatabaseOrderStatus(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    Recebido: 'recebido',
    'A confirmar': 'recebido',
    'Em separação': 'em_separacao',
    'A caminho': 'saiu_para_entrega',
    Entregue: 'entregue',
    Cancelado: 'cancelado'
  };
  return map[status];
}

function toConfirmationValue(status: OrderStatus) {
  if (status === 'A confirmar') return false;
  if (status === 'Cancelado') return null;
  return true;
}

export async function fetchAdminProducts() {
  const client = getSupabaseClient();
  const [{ data: products, error: productError }, { data: variations, error: variationError }, galleryResult] = await Promise.all([
    client
      .from('produtos')
      .select(
        'id, nome, preco, imagem, categoria, descricao, ativo, estoque, estoque_minimo, destaque, oferta_ativa, preco_promocional, catalogo_visivel, loja_visivel, catalogo_destaque, descricao_detalhada, created_at, updated_at'
      )
      .order('nome', { ascending: true }),
    client.from('produto_variacoes').select('id, produto_id, nome, sku, preco, preco_promocional, estoque, estoque_minimo, ativo, oferta_ativa, imagem').order('ordem', { ascending: true }),
    client.from('produto_imagens').select('id, produto_id, url, ordem').order('ordem', { ascending: true })
  ]);

  if (productError) throw productError;
  if (variationError) throw variationError;
  if (galleryResult.error && !isMissingProductImagesTable(galleryResult.error)) throw galleryResult.error;

  const byProduct = new Map<string, ProductVariation[]>();
  (variations || []).forEach((row) => {
    const variation = mapVariation(row as JsonRecord);
    byProduct.set(variation.productId, [...(byProduct.get(variation.productId) || []), variation]);
  });

  const imagesByProduct = new Map<string, string[]>();
  (galleryResult.data || []).forEach((row) => {
    const image = row as JsonRecord;
    const productId = asString(image.produto_id);
    const url = asString(image.url);
    if (!productId || !url) return;
    imagesByProduct.set(productId, [...(imagesByProduct.get(productId) || []), url]);
  });

  return (products || []).map((row) => {
    const productId = asString((row as JsonRecord).id);
    return mapProduct(row as JsonRecord, byProduct.get(productId) || [], imagesByProduct.get(productId) || []);
  });
}

export async function fetchStockMovements(limit = 500) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('estoque_movimentacoes')
    .select(
      'id, produto_id, variacao_id, tipo, quantidade, motivo, pedido_id, created_at, estoque_anterior, estoque_novo, fornecedor, documento, custo_unitario, ocorrido_em, responsavel_nome, responsavel_email, grupo_id, produto:produtos(nome, categoria), variacao:produto_variacoes(nome, sku)'
    )
    .order('ocorrido_em', { ascending: false })
    .limit(limit);

  if (error) throwSupabaseError(error, 'Nao foi possivel carregar o historico de estoque.');
  return (data || []).map((row) => mapStockMovement(row as JsonRecord));
}

export async function registerStockMovements(inputs: StockMovementInput[]) {
  const client = getSupabaseClient();
  const groupId = inputs[0]?.groupId || globalThis.crypto?.randomUUID?.() || null;
  const results: unknown[] = [];

  for (const input of inputs) {
    const { data, error } = await client.rpc('admin_registrar_movimentacao_estoque', {
      p_produto_id: input.productId,
      p_variacao_id: input.variationId || null,
      p_tipo: input.type,
      p_quantidade: Math.trunc(input.quantity),
      p_motivo: input.reason?.trim() || null,
      p_fornecedor: input.supplier?.trim() || null,
      p_documento: input.document?.trim() || null,
      p_custo_unitario: input.unitCost ?? null,
      p_ocorrido_em: input.occurredAt || new Date().toISOString(),
      p_grupo_id: input.groupId || groupId
    });

    if (error) {
      if (isMissingRpc(error, 'admin_registrar_movimentacao_estoque')) {
        throw new Error('Rode o SQL supabase/20260605-estoque-movimentacoes-profissional.sql para ativar o historico de estoque.');
      }
      throwSupabaseError(error, 'Nao foi possivel registrar a movimentacao de estoque.');
    }
    results.push(data);
  }

  return results;
}

export async function saveProduct(input: Partial<Product>) {
  const client = getSupabaseClient();
  const row = {
    nome: input.name,
    categoria: input.category,
    descricao: input.description || '',
    preco: Number(input.price || 0),
    preco_promocional: input.promoPrice || null,
    imagem: input.image || '',
    estoque: input.stock ?? null,
    estoque_minimo: input.minStock ?? 0,
    ativo: input.active !== false,
    loja_visivel: input.storeVisible !== false,
    catalogo_visivel: input.catalogVisible !== false,
    destaque: Boolean(input.featured),
    oferta_ativa: Boolean(input.offerActive)
  };

  const request = input.id
    ? client.from('produtos').update(row).eq('id', input.id).select('id').maybeSingle()
    : client.from('produtos').insert(row).select('id').maybeSingle();

  const { data, error } = await request;
  if (error) throw error;

  const productId = input.id || asString((data as JsonRecord | null)?.id);
  if (productId && Array.isArray(input.variations)) {
    for (const [index, variation] of input.variations.entries()) {
      const variationRow = {
        produto_id: productId,
        nome: variation.name || input.name || 'Variacao',
        slug: `${slugify(variation.name || input.name || 'variacao')}-${index + 1}`,
        sku: normalizeNumericSku(variation.sku || `${productId}-${variation.name}-${index}`),
        preco: Number(variation.price || input.price || 0),
        preco_promocional: variation.promoPrice || null,
        estoque: variation.stock ?? null,
        estoque_minimo: variation.minStock ?? 0,
        ativo: variation.active !== false,
        imagem: variation.image || '',
        oferta_ativa: Boolean(variation.offerActive),
        ordem: index
      };

      const variationRequest = variation.id
        ? client.from('produto_variacoes').update(variationRow).eq('id', variation.id).select('id').maybeSingle()
        : client.from('produto_variacoes').insert(variationRow).select('id').maybeSingle();
      const { error: variationError } = await variationRequest;
      if (variationError) throw variationError;
    }
  }

  if (productId && Array.isArray(input.images)) {
    await saveProductImages(productId, input.images);
  }

  return data;
}

async function saveProductImages(productId: string, images: string[]) {
  const client = getSupabaseClient();
  const cleanImages = Array.from(new Set(images.map((image) => image.trim()).filter(Boolean)));

  const { error: deleteError } = await client.from('produto_imagens').delete().eq('produto_id', productId);
  if (deleteError) {
    if (isMissingProductImagesTable(deleteError) && cleanImages.length === 0) return;
    if (isMissingProductImagesTable(deleteError)) throw new Error('Rode o SQL supabase/20260604-produto-imagens.sql para ativar a galeria de fotos.');
    throw deleteError;
  }

  if (!cleanImages.length) return;

  const { error: insertError } = await client.from('produto_imagens').insert(
    cleanImages.map((url, index) => ({
      produto_id: productId,
      url,
      ordem: index
    }))
  );
  if (insertError) throw insertError;
}

function isMissingProductImagesTable(error: unknown) {
  const detail = error as { code?: string; message?: string; details?: string };
  const text = [detail.code, detail.message, detail.details].filter(Boolean).join(' ').toLowerCase();
  return text.includes('produto_imagens') && (text.includes('does not exist') || text.includes('schema cache') || text.includes('relation') || text.includes('pgrst'));
}

export async function deleteProduct(productId: string) {
  const client = getSupabaseClient();
  const { error: variationError } = await client.from('produto_variacoes').delete().eq('produto_id', productId);
  if (variationError) throw variationError;

  const { data, error } = await client.from('produtos').delete().eq('id', productId).select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Produto nao foi excluido. Verifique permissao, RLS ou se o produto ainda existe.');
  return data;
}

export async function uploadProductImage(file: File, productName = 'produto') {
  const client = getSupabaseClient();
  const extension = file.name.split('.').pop() || 'png';
  const path = `${slugify(productName)}/${Date.now()}-${slugify(file.name)}.${extension}`;
  const { error } = await client.storage.from('produtos').upload(path, file, {
    cacheControl: '31536000',
    upsert: false
  });

  if (error) throw error;
  const { data } = client.storage.from('produtos').getPublicUrl(path);
  return data.publicUrl || path;
}

export async function signInWithPassword(email: string, password: string) {
  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signInWithMagicLink(email: string, emailRedirectTo?: string) {
  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo
    }
  });
  if (error) throw error;
}

export async function signOut(scope: 'global' | 'local' | 'others' = 'local') {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut({ scope });
  if (error) throw error;
}
