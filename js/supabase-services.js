import { CONFIG } from './config.js';
import {
  appState,
  canonicalRole,
  categoryKey,
  escapeHTML,
  localProfileAvatar,
  localOrders,
  normalize,
  onlyDigits,
  saveLocalProfileAvatar,
  saveLocalOrder,
  rememberAccount,
  slugify,
  writeJSON,
  STORAGE
} from './state.js';
import { getAuthUser, getSupabaseClient, hasSupabase } from './supabase-client.js';

const PUBLIC_PRODUCT_SELECT = [
  'id',
  'nome',
  'preco',
  'preco_original',
  'imagem',
  'categoria',
  'descricao',
  'tipo',
  'destaque',
  'oferta_ativa',
  'preco_promocional',
  'oferta_inicio',
  'oferta_fim',
  'kit_itens',
  'catalogo_ordem',
  'descricao_detalhada',
  'catalogo_destaque',
  'pode_comprar',
  'indisponivel',
  'created_at',
  'updated_at'
].join(', ');

const PUBLIC_VARIATION_SELECT = [
  'id',
  'produto_id',
  'nome',
  'slug',
  'sku',
  'preco',
  'preco_original',
  'imagem',
  'atributos',
  'ordem',
  'preco_promocional',
  'oferta_ativa',
  'oferta_inicio',
  'oferta_fim',
  'pode_comprar',
  'indisponivel',
  'created_at',
  'updated_at'
].join(', ');

const ADMIN_PRODUCT_SELECT = [
  'id',
  'nome',
  'preco',
  'imagem',
  'categoria',
  'descricao',
  'ativo',
  'estoque',
  'estoque_minimo',
  'tipo',
  'destaque',
  'oferta_ativa',
  'preco_promocional',
  'oferta_inicio',
  'oferta_fim',
  'kit_itens',
  'catalogo_visivel',
  'loja_visivel',
  'catalogo_ordem',
  'descricao_detalhada',
  'catalogo_destaque',
  'created_at',
  'updated_at'
].join(', ');

const PROFILE_BASE_SELECT = 'id, email, nome, telefone, endereco, role, admin_role, is_admin';
const PROFILE_EXTENDED_SELECT = `${PROFILE_BASE_SELECT}, foto, avatar_url, avatar`;

function activeOffer(row = {}) {
  if (!row.oferta_ativa || !row.preco_promocional || Number(row.preco_promocional) <= 0) return false;
  const now = Date.now();
  const starts = row.oferta_inicio ? new Date(row.oferta_inicio).getTime() : 0;
  const ends = row.oferta_fim ? new Date(row.oferta_fim).getTime() : Infinity;
  return starts <= now && now <= ends;
}

export function mapProduct(row = {}, variations = []) {
  const offer = activeOffer(row);
  const basePrice = Number(row.preco || 0);
  const promoPrice = offer ? Number(row.preco_promocional || basePrice) : null;
  const id = String(row.id || row.slug || slugify(row.nome || row.name));
  return {
    id,
    productId: row.id || null,
    name: row.nome || row.name || 'Produto',
    category: row.categoria || row.category || 'Produtos',
    categoryKey: categoryKey(row.categoria || row.category || ''),
    price: Number(promoPrice || basePrice || row.price || 0),
    originalPrice: Number(row.preco_original || (promoPrice ? basePrice : 0) || 0),
    promoPrice,
    image: row.imagem || row.image || '',
    description: row.descricao_detalhada || row.descricao || row.description || '',
    type: row.tipo || 'produto',
    featured: Boolean(row.destaque || row.catalogo_destaque || row.featured),
    offerActive: Boolean(offer || row.offerActive),
    canBuy: row.pode_comprar !== false && row.indisponivel !== true && row.ativo !== false,
    unavailable: row.indisponivel === true || row.ativo === false,
    stock: row.estoque ?? null,
    updatedAt: row.updated_at || row.created_at || '',
    variations
  };
}

function fallbackProducts() {
  return CONFIG.fallbackProducts.map((product) => mapProduct({
    id: product.id,
    nome: product.name,
    categoria: product.category,
    preco: product.promoPrice || product.price,
    preco_original: product.promoPrice ? product.price : 0,
    imagem: product.image,
    descricao: product.description,
    destaque: product.featured,
    oferta_ativa: product.offerActive,
    preco_promocional: product.promoPrice,
    pode_comprar: true
  }));
}

function profileAvatar(row = {}, user = {}) {
  return localProfileAvatar(user.id) || row.foto || row.avatar_url || row.avatar || row.imagem || '';
}

function mapProfileRow(row = {}, user = {}) {
  const role = canonicalRole(row.role || row.admin_role, {
    adminRole: row.admin_role,
    isAdmin: row.is_admin === true
  });
  return {
    id: row.id || user.id,
    email: row.email || user.email || '',
    name: row.nome || row.name || user.email || '',
    phone: row.telefone || '',
    address: row.endereco || '',
    avatar: profileAvatar(row, user),
    role,
    raw: row
  };
}

async function fetchProfileRow(client, userId) {
  try {
    const { data, error } = await client
      .from('profiles')
      .select(PROFILE_EXTENDED_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  } catch (extendedError) {
    console.warn('[Monte Sinai] Campos de avatar do perfil indisponiveis.', extendedError);
    const { data, error } = await client
      .from('profiles')
      .select(PROFILE_BASE_SELECT)
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
}

function dataURLToBlob(dataUrl = '') {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/webp';
  const binary = atob(data || '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mime });
}

function imageFileToDataURL(file, maxSize = 640) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Imagem invalida.'));
      image.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * ratio));
        const height = Math.max(1, Math.round(image.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function fetchPublicVariations(client) {
  try {
    const { data, error } = await client
      .from('vw_catalogo_variacoes_publicas')
      .select(PUBLIC_VARIATION_SELECT)
      .order('ordem', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('[Monte Sinai] Variacoes publicas indisponiveis.', error);
    return [];
  }
}

function variationsByProduct(rows = []) {
  return rows.reduce((map, row) => {
    const key = String(row.produto_id || '');
    if (!key) return map;
    const offer = activeOffer(row);
    const variation = {
      id: row.id,
      name: row.nome,
      price: Number((offer ? row.preco_promocional : row.preco) || 0),
      originalPrice: Number(row.preco_original || (offer ? row.preco : 0) || 0),
      image: row.imagem || '',
      canBuy: row.pode_comprar !== false && row.indisponivel !== true
    };
    map.set(key, [...(map.get(key) || []), variation]);
    return map;
  }, new Map());
}

export async function fetchProducts() {
  if (!hasSupabase()) return { products: fallbackProducts(), source: 'fallback' };
  const client = getSupabaseClient();

  try {
    const variations = variationsByProduct(await fetchPublicVariations(client));
    const { data, error } = await client
      .from('vw_catalogo_publico')
      .select(PUBLIC_PRODUCT_SELECT)
      .order('catalogo_ordem', { ascending: true, nullsFirst: false })
      .order('nome', { ascending: true });
    if (error) throw error;
    return {
      products: (data || []).map((row) => mapProduct(row, variations.get(String(row.id)) || [])),
      source: 'supabase'
    };
  } catch (viewError) {
    console.warn('[Monte Sinai] View publica indisponivel, tentando tabela produtos.', viewError);
    try {
      const { data, error } = await client
        .from('produtos')
        .select(ADMIN_PRODUCT_SELECT)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      if (error) throw error;
      return { products: (data || []).map((row) => mapProduct(row)), source: 'supabase-table' };
    } catch (tableError) {
      console.warn('[Monte Sinai] Catalogo local ativado.', tableError);
      return { products: fallbackProducts(), source: 'fallback' };
    }
  }
}

export async function fetchCurrentProfile() {
  const user = await getAuthUser();
  if (!user || !hasSupabase()) {
    appState.profile = null;
    return null;
  }

  const client = getSupabaseClient();
  try {
    const { data, error } = await client.rpc('app_current_profile', {});
    if (error) throw error;
    const profile = Array.isArray(data) ? data[0] : data?.app_current_profile || data;
    if (profile?.id) {
      appState.profile = mapProfileRow(profile, user);
      writeJSON(STORAGE.profile, appState.profile);
      rememberAccount(appState.profile);
      return appState.profile;
    }
  } catch (rpcError) {
    console.warn('[Monte Sinai] app_current_profile indisponivel.', rpcError);
  }

  try {
    const data = await fetchProfileRow(client, user.id);
    appState.profile = data ? mapProfileRow(data, user) : null;
    if (appState.profile) {
      writeJSON(STORAGE.profile, appState.profile);
      rememberAccount(appState.profile);
    }
    return appState.profile;
  } catch (error) {
    console.warn('[Monte Sinai] Perfil indisponivel.', error);
    return null;
  }
}

export async function signIn(email, password) {
  const client = getSupabaseClient();
  if (!client?.auth) throw new Error('Supabase Auth nao carregou.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  await fetchCurrentProfile();
  return data;
}

export async function signUp({ name, email, phone, password }) {
  const client = getSupabaseClient();
  if (!client?.auth) throw new Error('Supabase Auth nao carregou.');
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      data: { name, phone }
    }
  });
  if (error) throw error;

  const userId = data?.user?.id;
  if (userId) {
    await client
      .from('profiles')
      .upsert({ id: userId, email, nome: name, telefone: phone, role: 'cliente' }, { onConflict: 'id' })
      .then(({ error: profileError }) => {
        if (profileError) console.warn('[Monte Sinai] Perfil nao gravado no cadastro.', profileError);
      });
  }

  await fetchCurrentProfile();
  return data;
}

export async function signOut() {
  const client = getSupabaseClient();
  if (!client?.auth) return;
  await client.auth.signOut();
  appState.user = null;
  appState.profile = null;
}

export async function updateProfile(payload) {
  const user = await getAuthUser();
  const client = getSupabaseClient();
  if (!user || !client?.from) throw new Error('Entre na conta para atualizar seu perfil.');
  const baseRow = {
    id: user.id,
    email: payload.email || user.email || '',
    nome: payload.name || '',
    telefone: payload.phone || '',
    endereco: payload.address || ''
  };
  const avatar = typeof payload.avatar === 'string' ? payload.avatar : '';
  if (avatar) saveLocalProfileAvatar(user.id, avatar);
  const saveRow = async (row) => {
    const { data, error } = await client
      .from('profiles')
      .update(row)
      .eq('id', user.id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (data?.id) return data;

    const { data: inserted, error: insertError } = await client
      .from('profiles')
      .insert(row)
      .select('id')
      .maybeSingle();
    if (insertError) throw insertError;
    return inserted;
  };

  try {
    const row = avatar ? { ...baseRow, foto: avatar } : baseRow;
    await saveRow(row);
  } catch (error) {
    if (!avatar) throw error;
    console.warn('[Monte Sinai] Coluna foto indisponivel, salvando perfil sem avatar remoto.', error);
    await saveRow(baseRow);
  }
  return fetchCurrentProfile();
}

export async function saveProfileAvatar(avatar = '') {
  const user = await getAuthUser();
  const client = getSupabaseClient();
  if (!user || !client?.from) throw new Error('Entre na conta para atualizar sua foto.');
  saveLocalProfileAvatar(user.id, avatar);
  if (appState.profile) appState.profile = { ...appState.profile, avatar };
  try {
    const { error } = await client.from('profiles').update({ foto: avatar || null }).eq('id', user.id);
    if (error) throw error;
  } catch (error) {
    console.warn('[Monte Sinai] Avatar remoto nao atualizado, mantendo avatar local.', error);
  }
  return fetchCurrentProfile();
}

export async function uploadProfileAvatar(file) {
  const user = await getAuthUser();
  const client = getSupabaseClient();
  if (!user || !client?.from) throw new Error('Entre na conta para atualizar sua foto.');
  if (!file?.type?.startsWith('image/')) throw new Error('Escolha uma imagem valida.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Use uma imagem de ate 4 MB.');

  const dataUrl = await imageFileToDataURL(file);
  let avatar = dataUrl;

  if (client?.storage) {
    try {
      const blob = dataURLToBlob(dataUrl);
      const path = `${user.id}/avatar.webp`;
      const { error } = await client.storage.from('avatars').upload(path, blob, {
        cacheControl: '31536000',
        contentType: 'image/webp',
        upsert: true
      });
      if (error) throw error;
      const { data } = client.storage.from('avatars').getPublicUrl(path);
      avatar = data?.publicUrl || dataUrl;
    } catch (error) {
      console.warn('[Monte Sinai] Storage de avatar indisponivel, usando avatar local.', error);
    }
  }

  await saveProfileAvatar(avatar);
  return avatar;
}

export async function createOrder({ customer, payment, notes, items, totals }) {
  const payload = {
    codigo: customer.code,
    cliente_nome: customer.name,
    cliente_email: customer.email || '',
    cliente_telefone: onlyDigits(customer.phone),
    endereco_entrega: customer.address,
    observacao: notes || '',
    pagamento: payment || 'Pagar na entrega',
    status: 'Recebido',
    pagamento_status: 'Pendente',
    desconto: 0,
    entrega: totals.delivery,
    cupom_codigo: '',
    brinde: items.some((item) => categoryKey(item.category) === 'gas'),
    whatsapp_enviado: true
  };

  const orderItems = items.map((item) => ({
    produto_id: item.productId || null,
    variacao_id: item.variationId || null,
    nome: item.name,
    variacao: item.variationName || '',
    quantidade: Number(item.quantity || 1),
    preco_unitario: Number(item.price || 0),
    imagem: item.image || ''
  }));

  if (hasSupabase()) {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('create_order', {
      order_payload: payload,
      items_payload: orderItems
    });
    if (error) throw error;
    const remoteOrder = {
      id: data?.order_id || payload.codigo,
      code: data?.codigo || payload.codigo,
      total: Number(data?.total || totals.total),
      status: 'Recebido',
      paymentStatus: 'Pendente',
      customer,
      items,
      createdAt: new Date().toISOString(),
      remote: true
    };
    saveLocalOrder(remoteOrder);
    return remoteOrder;
  }

  const localOrder = {
    id: payload.codigo,
    code: payload.codigo,
    total: totals.total,
    status: 'Recebido',
    paymentStatus: 'Pendente',
    customer,
    items,
    createdAt: new Date().toISOString(),
    remote: false
  };
  saveLocalOrder(localOrder);
  return localOrder;
}

export function whatsappOrderUrl(order) {
  const lines = [
    `Pedido ${order.code} - Monte Sinai`,
    '',
    `Cliente: ${order.customer.name}`,
    `Telefone: ${order.customer.phone}`,
    `Endereco: ${order.customer.address}`,
    '',
    ...order.items.map((item) => `- ${item.quantity}x ${item.name}: R$ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`),
    '',
    `Total: R$ ${Number(order.total || 0).toFixed(2)}`
  ];
  return `https://wa.me/${CONFIG.store.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function mapOrder(row = {}) {
  const items = row.pedido_itens || row.items || [];
  return {
    id: row.id || row.order_id || row.codigo,
    code: row.codigo || row.code || row.id,
    status: row.status || 'Recebido',
    paymentStatus: row.pagamento_status || row.paymentStatus || 'Pendente',
    payment: row.pagamento || '',
    total: Number(row.total || 0),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    customer: {
      name: row.cliente_nome || row.customer?.name || '',
      email: row.cliente_email || row.customer?.email || '',
      phone: row.cliente_telefone || row.customer?.phone || '',
      address: row.endereco_entrega || row.customer?.address || ''
    },
    items: items.map((item) => ({
      id: item.id || item.produto_id || item.nome,
      name: item.nome || item.name || 'Item',
      quantity: Number(item.quantidade || item.quantity || 1),
      price: Number(item.preco_unitario || item.price || 0),
      image: item.imagem || item.image || ''
    })),
    remote: Boolean(row.id)
  };
}

export async function fetchCustomerOrders() {
  const user = await getAuthUser();
  if (!user || !hasSupabase()) return localOrders();
  const client = getSupabaseClient();
  try {
    const { data, error } = await client
      .from('pedidos')
      .select('*, pedido_itens(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapOrder);
  } catch (error) {
    console.warn('[Monte Sinai] Pedidos remotos indisponiveis.', error);
    return localOrders();
  }
}

export async function trackOrder(code, phone) {
  if (!hasSupabase()) {
    return localOrders().find((order) => normalize(order.code) === normalize(code) && onlyDigits(order.customer?.phone) === onlyDigits(phone)) || null;
  }
  const client = getSupabaseClient();
  const { data, error } = await client.rpc('track_order', {
    p_codigo: code,
    p_cliente_telefone: phone
  });
  if (error) throw error;
  return data ? mapOrder(data) : null;
}

export async function adminFetchProducts() {
  const client = getSupabaseClient();
  if (!client?.from) return appState.products;
  const { data, error } = await client.from('produtos').select(ADMIN_PRODUCT_SELECT).order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => mapProduct(row));
}

export async function adminSaveProduct(product) {
  const client = getSupabaseClient();
  if (!client?.from) throw new Error('Supabase nao carregou.');
  const row = {
    nome: product.name,
    preco: Number(product.price || 0),
    categoria: product.category,
    descricao: product.description || '',
    imagem: product.image || '',
    ativo: product.active !== false,
    estoque: product.stock === '' || product.stock === null ? null : Number(product.stock),
    destaque: Boolean(product.featured),
    oferta_ativa: Boolean(product.offerActive),
    preco_promocional: product.promoPrice ? Number(product.promoPrice) : null,
    loja_visivel: true,
    catalogo_visivel: true
  };
  const request = product.id && /^[0-9a-f-]{36}$/i.test(product.id)
    ? client.from('produtos').update(row).eq('id', product.id).select('id').maybeSingle()
    : client.from('produtos').insert(row).select('id').maybeSingle();
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function adminDeleteProduct(id) {
  const client = getSupabaseClient();
  if (!client?.from) throw new Error('Supabase nao carregou.');
  const { error } = await client.from('produtos').delete().eq('id', id);
  if (error) throw error;
}

export async function adminUploadProductImage(file, productName = 'produto') {
  const client = getSupabaseClient();
  if (!client?.storage) throw new Error('Supabase Storage nao carregou.');
  const safeName = slugify(productName);
  const ext = file.name.split('.').pop() || 'png';
  const path = `${safeName}/${Date.now()}-${slugify(file.name)}.${ext}`;
  const { error } = await client.storage.from('produtos').upload(path, file, {
    cacheControl: '31536000',
    upsert: false
  });
  if (error) throw error;
  const { data } = client.storage.from('produtos').getPublicUrl(path);
  return data?.publicUrl || path;
}

export async function adminFetchOrders() {
  const client = getSupabaseClient();
  if (!client?.from) return localOrders();
  const { data, error } = await client
    .from('pedidos')
    .select('*, pedido_itens(*)')
    .order('created_at', { ascending: false })
    .limit(80);
  if (error) throw error;
  return (data || []).map(mapOrder);
}

export async function adminUpdateOrder(orderId, payload) {
  const client = getSupabaseClient();
  if (!client?.from) throw new Error('Supabase nao carregou.');
  const row = {};
  if (payload.status) row.status = payload.status;
  if (payload.paymentStatus) row.pagamento_status = payload.paymentStatus;
  try {
    const { error } = await client.rpc('admin_update_order', {
      p_id: orderId,
      p_status: payload.status || null,
      p_pagamento_status: payload.paymentStatus || null,
      p_confirmado: null
    });
    if (error) throw error;
  } catch (rpcError) {
    const { data, error } = await client
      .from('pedidos')
      .update(row)
      .eq('id', orderId)
      .select('id')
      .maybeSingle();
    if (error) throw rpcError;
    if (!data?.id) throw rpcError;
  }
}

export function safeAdminHTML(value) {
  return escapeHTML(value);
}
