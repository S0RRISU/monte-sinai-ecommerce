document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const STORAGE = {
    cart: 'ms_cart_v2',
    legacyCart: 'ms_cart_v1',
    user: 'ms_customer_v2',
    accounts: 'ms_accounts_v1',
    orders: 'ms_orders_v1',
    owner: 'ms_owner_config_v1',
    theme: 'ms_theme_v2',
    legacyTheme: 'ms_theme_v1'
  };

  const DEFAULT_OWNER = {
    whatsapp: '5511960928234',
    altWhatsapp: '5511982690871',
    merchantName: 'MONTE SINAI',
    merchantCity: 'SAO PAULO',
    pixKey: ''
  };

  const DELIVERY_FEE = 3;
  const FREE_SHIPPING_FROM = 50;
  let productIndex = [];
  const CATALOG_CATEGORY_ORDER = ['agua', 'gas', 'limpeza', 'lavanderia', 'higiene', 'banheiro', 'cozinha', 'utensilios', 'organizacao'];
  const CATALOG_SECTION_META = {
    recommended: {
      eyebrow: 'Recomendados',
      title: 'Água e gás mais pedidos'
    },
    agua: {
      eyebrow: 'Água mineral',
      title: 'Galões para abastecer sua casa'
    },
    gas: {
      eyebrow: 'Gás de cozinha',
      title: 'Botijões para sua cozinha'
    },
    limpeza: {
      eyebrow: 'Líquidos e químicos',
      title: 'Produtos de limpeza'
    },
    lavanderia: {
      eyebrow: 'Cuidado das roupas',
      title: 'Lavanderia'
    },
    higiene: {
      eyebrow: 'Cuidado pessoal',
      title: 'Higiene'
    },
    banheiro: {
      eyebrow: 'Banheiro',
      title: 'Itens para banheiro'
    },
    cozinha: {
      eyebrow: 'Cozinha',
      title: 'Louças, pia e fogão'
    },
    utensilios: {
      eyebrow: 'Utensílios e acessórios',
      title: 'Itens para limpeza e organização'
    },
    organizacao: {
      eyebrow: 'Organização',
      title: 'Apoio para o dia a dia'
    }
  };
  const CATALOG_VARIANT_ORDER = {
    'gas-de-cozinha-p13': ['Supergas', 'Ultragas'],
    'desinfetante-2l': ['Kaialque', 'Violeta', 'Eucalipto', 'Pinho', 'Jasmim', 'Talco', 'Dama da Noite', 'Palmolive']
  };
  const SEARCH_EXPANSIONS = {
    ada: 'agua mineral galao garrafao bebedouro',
    agau: 'agua mineral galao garrafao bebedouro',
    auga: 'agua mineral galao garrafao bebedouro',
    agua: 'agua mineral galao garrafao bebedouro',
    alcol: 'alcool perfumado higienizacao limpeza perfume',
    alcool: 'alcool perfumado higienizacao limpeza perfume',
    gaz: 'gas botijao cozinha p13 supergas ultragas fogao',
    gas: 'gas botijao cozinha p13 supergas ultragas fogao',
    detegente: 'detergente louca pia cozinha gordura',
    deterg: 'detergente louca pia cozinha gordura',
    candid: 'candida agua sanitaria cloro limpeza pesada',
    casa: 'agua gas vassoura rodo detergente desinfetante lixo limpeza',
    cozinha: 'gas detergente esponja louca rodinho pia aluminio panela agua',
    banheiro: 'desinfetante cloro candida escova vaso pedra sabonete rodo',
    roupa: 'sabao amaciante prendedor escova lavanderia coco omo tecido',
    roupas: 'sabao amaciante prendedor escova lavanderia coco omo tecido',
    lavar: 'sabao detergente amaciante escova roupa louca lavanderia',
    cheiro: 'desinfetante alcool amaciante sabonete perfume',
    perfume: 'desinfetante alcool amaciante sabonete cheiro',
    piso: 'rodo desinfetante cloro candida limpa pedra vassoura',
    quintal: 'vassoura rodo limpa pedra cloro candida pa',
    louca: 'detergente esponja pia cozinha rodinho',
    gordura: 'detergente esponja limpa aluminio pasta brilho',
    fogao: 'gas limpa aluminio pasta brilho cozinha',
    garrafao: 'agua galao mineral bebedouro',
    botijao: 'gas p13 cozinha fogao supergas ultragas',
    sanitário: 'vaso banheiro escova pedra desinfetante',
    sanitario: 'vaso banheiro escova pedra desinfetante'
  };
  const SMART_SEARCH_CHIPS = [
    { label: 'Limpar banheiro', query: 'banheiro' },
    { label: 'Lavar roupa', query: 'roupa' },
    { label: 'Cozinha e louça', query: 'cozinha' },
    { label: 'Quintal e piso', query: 'quintal' },
    { label: 'Cheiro bom', query: 'cheiro' },
    { label: 'Água mineral', query: 'água' },
    { label: 'Gás de cozinha', query: 'gás' },
    { label: 'Tirar gordura', query: 'gordura' }
  ];

  let cart = loadCart();
  let currentUser = loadJSON(STORAGE.user, null);
  let ownerConfig = { ...DEFAULT_OWNER, ...loadJSON(STORAGE.owner, {}) };
  let activePayment = 'delivery';
  let activeSearchProduct = null;
  let productSearchResults = [];
  let activeSearchSuggestionContext = null;
  let searchSuggestionFrame = 0;

  applySavedTheme();
  upgradeProductImages();
  syncProductsFromRenderedCards();
  enhanceNavigation();
  bindMobileMenu();
  setActiveNavigation();
  bindSiteSearch();
  bindCatalog();
  bindProductCards();
  bindProductRail();
  ensureCartShell();
  ensureSmartSearchShell();
  ensureProductSearchModalShell();
  bindCartActions();
  bindDataCleanupActions();
  bindSmartSearchPanel();
  renderCart();
  bindAccountPage();
  initPaymentPage();
  initProfilePage();
  initProfileEditPage();
  initSettingsPage();
  initOwnerDashboard();
  bindSubtleAnimations();
  loadProductsFromSupabase();

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qsa(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_error) {
      showToast('Não foi possível salvar. Tente remover a foto ou usar uma imagem menor.');
      return false;
    }
  }

  function loadCart() {
    const modern = loadJSON(STORAGE.cart, null);
    if (Array.isArray(modern)) return modern;

    const legacy = loadJSON(STORAGE.legacyCart, []);
    if (!Array.isArray(legacy)) return [];

    const migrated = legacy.map(item => ({
      id: item.id || makeCartId(item.name, item.variant),
      name: item.name,
      variant: item.variant || '',
      price: Number(item.price || 0),
      quantity: Number(item.quantity || 1),
      image: canonicalAssetPath(item.image || '')
    })).filter(item => item.name && item.price >= 0);

    saveJSON(STORAGE.cart, migrated);
    return migrated;
  }

  function saveCart() {
    saveJSON(STORAGE.cart, cart);
  }

  function saveUser(user) {
    currentUser = user;
    let saved = true;
    if (user) saved = saveJSON(STORAGE.user, user);
    else localStorage.removeItem(STORAGE.user);
    updateAccountUI();
    return saved;
  }

  function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function escapeHTML(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function normalizeText(value) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function splitSearchTokens(value) {
    return normalizeText(value).split(/[^a-z0-9]+/).filter(token => token.length > 1);
  }

  function parsePrice(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value ?? '').trim();
    if (!text) return 0;

    const clean = text.replace(/[^\d,.-]/g, '');
    const normalized = clean.includes(',')
      ? clean.replace(/\./g, '').replace(',', '.')
      : clean;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function categorySlug(value) {
    const normalized = normalizeText(value || 'produtos');
    if (normalized.includes('utens')) return 'utensilios';
    return normalized.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'produtos';
  }

  function categoryOrderIndex(slug) {
    const index = CATALOG_CATEGORY_ORDER.indexOf(slug);
    return index === -1 ? CATALOG_CATEGORY_ORDER.length : index;
  }

  function orderedCategoryEntries(products = productIndex) {
    const categories = new Map();

    products.forEach(product => {
      const slug = product.categorySlug || categorySlug(product.category);
      if (!categories.has(slug)) categories.set(slug, product.category || 'Produtos');
    });

    return [...categories.entries()].sort(([slugA, labelA], [slugB, labelB]) => {
      const orderA = categoryOrderIndex(slugA);
      const orderB = categoryOrderIndex(slugB);
      if (orderA !== orderB) return orderA - orderB;
      return String(labelA).localeCompare(String(labelB), 'pt-BR');
    });
  }

  function catalogSectionMeta(slug, label) {
    return CATALOG_SECTION_META[slug] || {
      eyebrow: label || 'Produtos',
      title: label || 'Produtos disponíveis'
    };
  }

  function productTerms(product) {
    const optionTerms = Array.isArray(product?.options)
      ? product.options.map(option => `${option.label || ''} ${option.value || ''}`).join(' ')
      : '';
    return `${product?.name || ''} ${product?.category || ''} ${product?.description || ''} ${product?.terms || ''} ${optionTerms}`;
  }

  function isRecommendedProduct(product) {
    const blob = normalizeText(productTerms(product));
    return Boolean(product?.recommended) || blob.includes('agua') || blob.includes('gas');
  }

  function normalizeProduct(raw = {}) {
    const name = String(raw.nome ?? raw.name ?? '').trim();
    const category = String(raw.categoria ?? raw.category ?? 'Produtos').trim() || 'Produtos';
    const description = String(raw.descricao ?? raw.description ?? '').trim();
    const price = parsePrice(raw.preco ?? raw.price);
    const image = resolveProductImagePath(raw.imagem ?? raw.image ?? '', name);

    return {
      name,
      category,
      categorySlug: categorySlug(category),
      description,
      price,
      image,
      options: Array.isArray(raw.options) ? raw.options : [],
      recommended: Boolean(raw.recommended),
      terms: `${name} ${category} ${description}`
    };
  }

  function productVariantInfo(product) {
    const name = product.name || '';
    const normalized = normalizeText(name);

    if (normalized.startsWith('gas de cozinha p13')) {
      const baseName = 'Gás de cozinha P13';
      const variant = productVariantLabel(name, baseName, /^g[aá]s de cozinha p13\s*/i);
      return {
        baseName,
        variant,
        category: 'Gás',
        description: 'Escolha o tipo: Supergas R$ 125,00 ou Ultragas R$ 135,00.'
      };
    }

    if (normalized.startsWith('desinfetante 2l')) {
      const baseName = 'Desinfetante 2L';
      const variant = productVariantLabel(name, baseName, /^desinfetante 2l\s*/i);
      return {
        baseName,
        variant,
        category: 'Limpeza',
        description: 'Escolha a fragrância de sua preferência para perfumar a limpeza.'
      };
    }

    return null;
  }

  function variantOrderIndex(baseName, variant) {
    const order = CATALOG_VARIANT_ORDER[categorySlug(baseName)] || [];
    const index = order.findIndex(item => normalizeText(item) === normalizeText(variant));
    return index === -1 ? order.length : index;
  }

  function productVariantLabel(name, baseName, prefixPattern) {
    const order = CATALOG_VARIANT_ORDER[categorySlug(baseName)] || [];
    const knownVariant = order.find(option => normalizeText(name).includes(normalizeText(option)));
    if (knownVariant) return knownVariant;
    return name.replace(prefixPattern, '').trim() || 'Padrão';
  }

  function groupProductVariants(products) {
    const grouped = new Map();
    const result = [];

    products.forEach(product => {
      const variantInfo = productVariantInfo(product);
      if (!variantInfo) {
        result.push(product);
        return;
      }

      const key = normalizeText(variantInfo.baseName);
      let group = grouped.get(key);

      if (!group) {
        group = {
          ...product,
          name: variantInfo.baseName,
          category: variantInfo.category || product.category,
          categorySlug: categorySlug(variantInfo.category || product.category),
          description: variantInfo.description || product.description,
          image: resolveProductImagePath(product.image || '', variantInfo.baseName),
          options: [],
          recommended: Boolean(product.recommended) || isRecommendedProduct(product),
          terms: `${variantInfo.baseName} ${variantInfo.category || product.category} ${product.terms || ''}`
        };
        grouped.set(key, group);
        result.push(group);
      }

      if (variantInfo.variant !== 'Padrão' && !group.options.some(option => normalizeText(option.value) === normalizeText(variantInfo.variant))) {
        group.options.push({
          label: `${variantInfo.variant} - ${formatMoney(product.price)}`,
          value: variantInfo.variant,
          price: Number(product.price || 0)
        });
      }

      group.price = group.options[0]?.price ?? group.price;
      group.terms = `${group.terms || ''} ${variantInfo.variant} ${product.description || ''}`;
    });

    result.forEach(product => {
      if (product.options?.length > 1) {
        product.options.sort((optionA, optionB) => {
          const orderA = variantOrderIndex(product.name, optionA.value);
          const orderB = variantOrderIndex(product.name, optionB.value);
          if (orderA !== orderB) return orderA - orderB;
          return String(optionA.value).localeCompare(String(optionB.value), 'pt-BR');
        });
        product.price = Number(product.options[0]?.price || product.price || 0);
      }
    });

    return result;
  }

  function uniqueProductList(products) {
    const seen = new Set();
    const unique = products
      .map(normalizeProduct)
      .filter(product => product.name)
      .filter(product => {
        const key = normalizeText(product.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    return groupProductVariants(unique);
  }

  function setProductIndex(products) {
    productIndex = uniqueProductList(products);
  }

  function syncProductsFromRenderedCards() {
    const products = qsa('.catalog-product, .rail-product')
      .filter(card => card.querySelector('.btn-add-cart'))
      .map(card => {
        const button = card.querySelector('.btn-add-cart');
        const name = button?.dataset.name || card.dataset.name || card.querySelector('h3')?.textContent || '';
        const image = card.querySelector('.product-image')?.getAttribute('src') || button?.dataset.image || '';

        return {
          name,
          category: card.dataset.category || card.querySelector('.eyebrow')?.textContent || 'Produtos',
          price: button?.dataset.price || card.querySelector('strong')?.textContent || 0,
          description: card.querySelector('p')?.textContent || '',
          image,
          recommended: card.dataset.recommended === 'true' || card.classList.contains('is-recommended')
        };
      });

    if (products.length) setProductIndex(products);
  }

  function supabaseProductClient() {
    const candidates = [
      window.monteSinaiSupabase,
      window.supabaseClient,
      window.msSupabase
    ];

    return candidates.find(client => client && typeof client.from === 'function') || null;
  }

  async function loadProductsFromSupabase() {
    const client = supabaseProductClient();
    if (!client) {
      console.warn('[Supabase] Cliente não encontrado. Usando produtos locais como fallback.');
      return;
    }

    try {
      const tableNames = ['produtos', 'produto'];
      let products = [];
      let loadedTable = '';
      let lastError = null;

      for (const tableName of tableNames) {
        console.log(`[Supabase] Buscando produtos na tabela "${tableName}"...`);
        const { data, error } = await client
          .from(tableName)
          .select('nome, preco, imagem, categoria, descricao')
          .order('nome', { ascending: true });

        if (!error) {
          products = Array.isArray(data) ? data : [];
          loadedTable = tableName;
          break;
        }

        lastError = error;
        if (error.code !== 'PGRST205') throw error;
        console.warn(`[Supabase] Tabela "${tableName}" não encontrada. Tentando próxima opção...`);
      }

      if (!loadedTable) throw lastError || new Error('Nenhuma tabela de produtos encontrada no Supabase.');
      console.log(`[Supabase] ${products.length} produto(s) carregado(s) da tabela "${loadedTable}".`, products);
      setProductIndex(products);
      renderSupabaseProducts();
    } catch (error) {
      console.error('[Supabase] Erro ao carregar produtos:', error);
      if (currentPage() === 'produtos.html') {
        showToast('Não foi possível carregar os produtos do Supabase. Mantive o catálogo local.');
      }
    }
  }

  function renderSupabaseProducts() {
    renderDynamicCatalog();
    renderDynamicProductRail();
    applyCatalogFilters();
    renderSmartSearchResults(qs('[data-smart-search-input]')?.value || '');
  }

  function searchTokens(value) {
    const tokens = splitSearchTokens(value);
    const expanded = tokens.flatMap(token => splitSearchTokens(SEARCH_EXPANSIONS[token] || ''));
    const fuzzyExpanded = tokens.flatMap(token => {
      if (token.length < 3) return [];

      return Object.entries(SEARCH_EXPANSIONS).flatMap(([key, expansion]) => {
        const keyScore = fuzzyTokenScore(token, key);
        return keyScore >= 5 ? splitSearchTokens(expansion) : [];
      });
    });

    return [...new Set([...tokens, ...expanded, ...fuzzyExpanded])];
  }

  function boundedLevenshtein(a, b, maxDistance) {
    if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
      const current = [i];
      let rowMin = current[0];

      for (let j = 1; j <= b.length; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        const value = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
        current[j] = value;
        rowMin = Math.min(rowMin, value);
      }

      if (rowMin > maxDistance) return maxDistance + 1;
      previous = current;
    }

    return previous[b.length];
  }

  function fuzzyTokenScore(token, candidate) {
    token = normalizeText(token);
    candidate = normalizeText(candidate);
    if (!token || !candidate) return 0;
    if (token === candidate) return 12;
    if (candidate.startsWith(token)) return token.length > 2 ? 9 : 4;
    if (token.startsWith(candidate) && candidate.length > 2) return 6;
    if (candidate.includes(token)) return token.length > 2 ? 6 : 2;

    if (token.length < 3 || candidate.length < 3) return 0;

    const maxDistance = token.length <= 3 ? 2 : token.length <= 6 ? 2 : 3;
    const distance = boundedLevenshtein(token, candidate, maxDistance);
    if (distance <= maxDistance) {
      return Math.max(1, (maxDistance - distance + 1) * 2);
    }

    if (candidate.length > token.length) {
      const prefix = candidate.slice(0, token.length);
      const prefixDistance = boundedLevenshtein(token, prefix, maxDistance);
      if (prefixDistance <= maxDistance) {
        return Math.max(1, (maxDistance - prefixDistance + 1) * 2);
      }
    }

    return 0;
  }

  function productSearchData(product) {
    const normalizedName = normalizeText(product.name);
    const normalizedCategory = normalizeText(product.category || '');
    const blob = normalizeText(productTerms(product));

    return {
      normalizedName,
      normalizedCategory,
      blob,
      tokens: splitSearchTokens(blob)
    };
  }

  function productScore(product, query) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return 1;

    const data = productSearchData(product);
    let score = data.blob.includes(normalizedQuery) ? 12 : 0;
    if (data.normalizedName.includes(normalizedQuery)) score += 18;
    if (data.normalizedName.startsWith(normalizedQuery)) score += 10;

    searchTokens(query).forEach(token => {
      if (data.blob.includes(token)) score += token.length > 3 ? 4 : 2;
      if (data.normalizedName.includes(token)) score += 5;
      if (data.normalizedName.startsWith(token)) score += 6;
      if (data.normalizedCategory.includes(token)) score += 3;

      const bestFuzzy = data.tokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);
      if (bestFuzzy) score += bestFuzzy;
    });

    return score;
  }

  function cardSearchData(card) {
    const name = card.dataset.name || card.querySelector('h3')?.textContent || '';
    const match = productIndex.find(product => normalizeText(product.name) === normalizeText(name) || normalizeText(name).includes(normalizeText(product.name)));
    return {
      name,
      category: card.dataset.category || match?.category || '',
      terms: `${card.textContent || ''} ${match?.terms || ''}`
    };
  }

  function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
  }

  function currentPage() {
    return location.pathname.split('/').pop() || 'index.html';
  }

  function insidePages() {
    return location.pathname.replaceAll('\\', '/').includes('/pages/');
  }

  function pageHref(page) {
    return insidePages() ? page : `pages/${page}`;
  }

  function homeHref() {
    return insidePages() ? '../index.html' : 'index.html';
  }

  function productHref(query = '') {
    const search = query ? `?q=${encodeURIComponent(query)}` : '';
    return `${pageHref('produtos.html')}${search}#todos-produtos`;
  }

  function featuredSearchProducts(limit = 6) {
    const featured = ['agua mineral', 'gas de cozinha', 'detergente', 'desinfetante', 'sabao omo', 'vassoura'];
    const highlighted = featured
      .map(term => productIndex.find(product => normalizeText(product.name).includes(term)))
      .filter(Boolean)
      .slice(0, limit);

    return uniqueProductList([...highlighted, ...productIndex])
      .slice(0, limit);
  }

  function directSearchProducts(query, limit = 5) {
    const term = String(query ?? '').trim();
    if (!term) return [];

    const normalizedTerm = normalizeText(term);
    const exact = productIndex.find(product => normalizeText(product.name) === normalizedTerm);
    if (exact) return [exact];

    const scored = productIndex
      .map(product => ({ ...product, score: productScore(product, term) }))
      .filter(product => product.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'pt-BR'));
    const hasStrongMatches = scored.some(product => product.score >= 6);

    return scored
      .filter(product => hasStrongMatches ? product.score >= 6 : product.score > 0)
      .slice(0, limit);
  }

  function searchSuggestionProducts(query, limit = 5) {
    const direct = directSearchProducts(query, limit);
    if (direct.length) return direct;
    return String(query ?? '').trim() ? featuredSearchProducts(Math.min(limit, 4)) : featuredSearchProducts(limit);
  }

  function catalogSearchProducts(query, limit = Infinity) {
    const term = String(query ?? '').trim();
    if (!term) return [];

    const normalizedTerm = normalizeText(term);
    const queryTokens = splitSearchTokens(term);
    const exact = productIndex.filter(product => normalizeText(product.name) === normalizedTerm);
    if (exact.length) return exact.slice(0, limit);

    const phraseMatches = productIndex
      .filter(product => {
        const productName = normalizeText(product.name);
        return productName.includes(normalizedTerm) || normalizedTerm.includes(productName);
      })
      .sort((a, b) => normalizeText(a.name).length - normalizeText(b.name).length || a.name.localeCompare(b.name, 'pt-BR'));

    if (phraseMatches.length) return phraseMatches.slice(0, limit);

    const scored = productIndex
      .map(product => {
        const data = productSearchData(product);
        const nameTokens = splitSearchTokens(product.name);
        const contextTokens = splitSearchTokens(`${product.category || ''} ${product.terms || ''}`);
        let nameScore = 0;
        let totalScore = 0;
        let matchedTokens = 0;

        queryTokens.forEach(token => {
          const directNameHit = data.normalizedName.includes(token);
          const bestNameScore = nameTokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);

          if (directNameHit || bestNameScore >= 5) {
            const score = Math.max(bestNameScore, directNameHit ? 8 : 0);
            nameScore += score;
            totalScore += score + 4;
            matchedTokens += 1;
            return;
          }

          const directContextHit = data.blob.includes(token);
          const bestContextScore = contextTokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);
          if (directContextHit || bestContextScore >= 6) {
            totalScore += Math.max(bestContextScore, directContextHit ? 4 : 0);
            matchedTokens += 1;
          }
        });

        return {
          ...product,
          nameScore,
          totalScore,
          matchedTokens
        };
      })
      .filter(product => {
        if (!queryTokens.length || product.matchedTokens < queryTokens.length) return false;
        if (product.nameScore > 0) return true;
        return product.totalScore >= (queryTokens.length > 1 ? 10 : 8);
      })
      .sort((a, b) => {
        if (b.nameScore !== a.nameScore) return b.nameScore - a.nameScore;
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return a.name.localeCompare(b.name, 'pt-BR');
      });

    const nameMatches = scored.filter(product => product.nameScore > 0);
    const finalMatches = nameMatches.length ? nameMatches : scored;
    return finalMatches.slice(0, limit).map(({ nameScore: _nameScore, totalScore: _totalScore, matchedTokens: _matchedTokens, ...product }) => product);
  }

  function cardMatchesCatalogProduct(card, product) {
    const cardName = normalizeText(card.dataset.name || card.querySelector('h3')?.textContent || '');
    const productName = normalizeText(product.name);
    return cardName === productName || cardName.includes(productName) || productName.includes(cardName);
  }

  function cardMatchesCatalogQuery(card, query, allowContext = false) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return true;

    const data = cardSearchData(card);
    const normalizedName = normalizeText(data.name);
    const tokens = splitSearchTokens(query);
    if (!tokens.length) return false;
    if (normalizedName === normalizedQuery || normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) return true;

    const nameTokens = splitSearchTokens(data.name);
    const contextBlob = normalizeText(`${data.category || ''} ${data.terms || ''}`);
    const contextTokens = splitSearchTokens(`${data.category || ''} ${data.terms || ''}`);
    let nameMatches = 0;
    let contextMatches = 0;

    tokens.forEach(token => {
      const directNameHit = normalizedName.includes(token);
      const bestNameScore = nameTokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);
      if (directNameHit || bestNameScore >= 5) {
        nameMatches += 1;
        return;
      }

      if (!allowContext) return;

      const directContextHit = contextBlob.includes(token);
      const bestContextScore = contextTokens.reduce((best, candidate) => Math.max(best, fuzzyTokenScore(token, candidate)), 0);
      if (directContextHit || bestContextScore >= 6) contextMatches += 1;
    });

    return nameMatches + contextMatches >= tokens.length && (nameMatches > 0 || allowContext);
  }

  function resolveSearchProduct(productOrName) {
    const value = typeof productOrName === 'string' ? productOrName : productOrName?.name;
    const normalized = normalizeText(value);
    if (!normalized) return null;

    return productIndex.find(product => normalizeText(product.name) === normalized)
      || productIndex.find(product => {
        const productName = normalizeText(product.name);
        return productName.includes(normalized) || normalized.includes(productName);
      })
      || (typeof productOrName === 'object' ? productOrName : null);
  }

  function uniqueProducts(products) {
    const seen = new Set();
    return products
      .map(resolveSearchProduct)
      .filter(Boolean)
      .filter(product => {
        const key = normalizeText(product.name);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function productCatalogCard(product) {
    return qsa('.catalog-product, .rail-product, .product-card')
      .find(card => cardMatchesCatalogProduct(card, product));
  }

  function productAssetFallback(productName) {
    const name = normalizeText(productName);
    const images = [
      ['agua', 'assets/produtos/agua-mineral-20l.png'],
      ['gas', 'assets/produtos/gas-p13.png'],
      ['alcool', 'assets/produtos/alcool-perfumado.png'],
      ['amaciante', 'assets/produtos/amaciante-2l.png'],
      ['candida colorida', 'assets/produtos/candida-colorida.png'],
      ['candida', 'assets/produtos/candida-2l.png'],
      ['cloro 1', 'assets/produtos/cloro-1l.png'],
      ['cloro 2', 'assets/produtos/cloro-2l.png'],
      ['detergente', 'assets/produtos/detergente-2l.png'],
      ['desinfetante', 'assets/produtos/desinfetante-2l.png'],
      ['limpa aluminio', 'assets/produtos/limpa-aluminio.png'],
      ['limpa pedra 500', 'assets/produtos/limpa-pedra-500ml.png'],
      ['limpa pedra', 'assets/produtos/limpa-pedra-2l.png'],
      ['sabao de coco', 'assets/produtos/sabao-coco.png'],
      ['sabao omo', 'assets/produtos/sabao-omo.png'],
      ['sabonete', 'assets/produtos/sabonete-liquido.png'],
      ['escova de roupa', 'assets/produtos/escova-roupa.png'],
      ['escova de vaso', 'assets/produtos/escova-vaso.png'],
      ['esponja de aco', 'assets/produtos/esponja-aco.png'],
      ['esponja de louca', 'assets/produtos/esponja-louca.png'],
      ['esponjao', 'assets/produtos/esponjao.png'],
      ['bombril', 'assets/produtos/bombril.png'],
      ['pasta de brilho', 'assets/produtos/pasta-brilho.png'],
      ['pedra de vaso', 'assets/produtos/pedra-vaso.png'],
      ['prendedor de madeira', 'assets/produtos/prendedor-madeira.png'],
      ['prendedor plastico', 'assets/produtos/prendedor-plastico.png'],
      ['rodo grande', 'assets/produtos/rodo-grande.png'],
      ['rodo pequeno', 'assets/produtos/rodo-pequeno.png'],
      ['rodinho', 'assets/produtos/rodinho-pia.png'],
      ['saco de lixo', 'assets/produtos/saco-lixo.png'],
      ['vassoura', 'assets/produtos/vassoura.png'],
      ['pa', 'assets/produtos/pa.png']
    ];

    return images.find(([term]) => name.includes(term))?.[1] || '';
  }

  function productAssetPath(product, card = productCatalogCard(product)) {
    const productImage = resolveProductImagePath(product?.image || '', product?.name || '');
    if (productImage) return productImage;

    const cardImage = card?.querySelector('.product-image')?.getAttribute('src');
    if (cardImage) return canonicalAssetPath(cardImage);

    return productAssetFallback(product?.name || '');
  }

  function productDescription(product, card = productCatalogCard(product)) {
    return card?.querySelector('p')?.textContent?.trim()
      || `Produto de ${product.category || 'catálogo'} pronto para adicionar ao seu pedido.`;
  }

  function productOptions(product, card = productCatalogCard(product)) {
    if (Array.isArray(product?.options) && product.options.length) {
      return product.options.map(option => ({
        label: option.label || option.value || 'Opção',
        value: option.value || option.label || '',
        price: Number(option.price || product.price || 0)
      }));
    }

    const select = card?.querySelector('.product-option');
    if (select) {
      return [...select.options].map(option => ({
        label: option.textContent.trim(),
        value: option.value || option.textContent.trim(),
        price: Number(option.dataset.price || product.price || 0)
      }));
    }

    return [{ label: 'Padrão', value: '', price: Number(product.price || 0) }];
  }

  function openSearchProductFromQuery(query) {
    const term = String(query ?? '').trim();
    if (!term) {
      showToast('Digite o produto que você quer encontrar.');
      return;
    }

    const direct = directSearchProducts(term, 6);
    const matches = direct.length ? direct : searchSuggestionProducts(term, 6);
    if (!matches.length) {
      showToast('Nenhum produto encontrado para essa busca.');
      return;
    }

    openProductSearchModal(matches[0], matches, term);
  }

  function ensureProductSearchModalShell() {
    if (qs('.product-search-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'product-search-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Produto pesquisado');
    modal.innerHTML = `
      <div class="product-search-backdrop" data-close-product-search></div>
      <article class="product-search-panel">
        <button class="icon-button product-search-close" type="button" data-close-product-search aria-label="Fechar produto">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="product-search-content" data-product-search-content></div>
      </article>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target.closest('[data-close-product-search]')) {
        closeProductSearchModal();
        return;
      }

      const resultButton = event.target.closest('[data-product-result-index]');
      if (resultButton) {
        const index = Number(resultButton.dataset.productResultIndex || 0);
        const nextProduct = productSearchResults[index];
        if (nextProduct) renderProductSearchModal(nextProduct);
        return;
      }

      const addButton = event.target.closest('[data-add-search-product]');
      if (!addButton || !activeSearchProduct) return;

      const options = productOptions(activeSearchProduct);
      const selectedIndex = Number(qs('[data-product-search-variant]', modal)?.value || 0);
      const selected = options[selectedIndex] || options[0];
      addToCart({
        name: activeSearchProduct.name,
        variant: selected?.value || '',
        price: Number(selected?.price || activeSearchProduct.price || 0),
        image: productAssetPath(activeSearchProduct)
      });
      closeProductSearchModal();
    });
  }

  function openProductSearchModal(product, results = [], query = '') {
    const resolved = resolveSearchProduct(product);
    if (!resolved) {
      showToast('Produto não encontrado.');
      return;
    }

    productSearchResults = uniqueProducts(results.length ? results : [resolved]);
    if (!productSearchResults.some(item => normalizeText(item.name) === normalizeText(resolved.name))) {
      productSearchResults.unshift(resolved);
    }

    const modal = qs('.product-search-modal');
    if (!modal) return;
    modal.dataset.searchTerm = query;
    renderProductSearchModal(resolved);
    modal.classList.add('open');
    document.body.classList.add('product-search-open');
  }

  function closeProductSearchModal() {
    qs('.product-search-modal')?.classList.remove('open');
    document.body.classList.remove('product-search-open');
    activeSearchProduct = null;
  }

  function renderProductSearchModal(product) {
    activeSearchProduct = resolveSearchProduct(product);
    const content = qs('[data-product-search-content]');
    if (!content || !activeSearchProduct) return;

    const card = productCatalogCard(activeSearchProduct);
    const image = productAssetPath(activeSearchProduct, card);
    const description = productDescription(activeSearchProduct, card);
    const options = productOptions(activeSearchProduct, card);
    const firstOption = options[0] || { price: activeSearchProduct.price || 0 };
    const resultButtons = productSearchResults.length > 1
      ? `
        <div class="product-search-more">
          <span>Outras sugestões</span>
          <div>
            ${productSearchResults.map((result, index) => `
              <button class="${normalizeText(result.name) === normalizeText(activeSearchProduct.name) ? 'active' : ''}" type="button" data-product-result-index="${index}">
                ${escapeHTML(result.name)}
              </button>
            `).join('')}
          </div>
        </div>
      `
      : '';

    content.innerHTML = `
      <div class="product-search-media">
        ${image ? `<img src="${assetHref(image)}" alt="${escapeHTML(activeSearchProduct.name)}">` : `<i class="fa-solid ${smartProductIcon(activeSearchProduct)}"></i>`}
      </div>
      <div class="product-search-info">
        <span class="eyebrow">Produto encontrado</span>
        <h2>${escapeHTML(activeSearchProduct.name)}</h2>
        <p>${escapeHTML(description)}</p>
        <strong data-product-search-price>${formatMoney(firstOption.price || activeSearchProduct.price)}</strong>
        ${options.length > 1 ? `
          <label class="product-search-variant">
            <span>Escolha uma opção</span>
            <select data-product-search-variant>
              ${options.map((option, index) => `<option value="${index}">${escapeHTML(option.label)}</option>`).join('')}
            </select>
          </label>
        ` : ''}
        ${resultButtons}
        <div class="product-search-actions">
          <button class="btn btn-primary" type="button" data-add-search-product>
            <i class="fa-solid fa-cart-plus"></i>
            Adicionar ao carrinho
          </button>
          <button class="btn btn-secondary" type="button" data-close-product-search>Agora não</button>
        </div>
      </div>
    `;

    qs('[data-product-search-variant]', content)?.addEventListener('change', event => {
      const selected = options[Number(event.target.value || 0)] || firstOption;
      const price = qs('[data-product-search-price]', content);
      if (price) price.textContent = formatMoney(selected.price || activeSearchProduct.price);
    });
  }

  function activateCatalogFilter(filter = 'all') {
    qsa('[data-filter]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });
  }

  function updateCatalogSearchURL(term) {
    if (currentPage() !== 'produtos.html') return;

    const url = new URL(location.href);
    const value = String(term ?? '').trim();
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    url.hash = 'todos-produtos';
    history.replaceState(null, '', url);
  }

  function scrollCatalogToTop(behavior = 'smooth') {
    const target = qs('#todos-produtos') || qs('.catalog-tools');
    if (!target) return;

    const navHeight = qs('.navbar')?.getBoundingClientRect().height || 0;
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - navHeight - 8);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top, behavior });
    });
  }

  function runCatalogSearch(term, options = {}) {
    const {
      scroll = true,
      syncURL = true,
      resetFilter = true,
      behavior = 'smooth'
    } = options;
    const value = String(term ?? '').trim();
    const catalogInput = qs('[data-catalog-search]');

    if (catalogInput) catalogInput.value = value;
    if (resetFilter) activateCatalogFilter('all');
    applyCatalogFilters();
    if (syncURL) updateCatalogSearchURL(value);
    if (scroll) scrollCatalogToTop(behavior);
  }

  function loginHref(params = {}) {
    const query = new URLSearchParams(params).toString();
    return `${pageHref('login.html')}${query ? `?${query}` : ''}`;
  }

  function profileHref() {
    return pageHref('perfil.html');
  }

  function checkoutHref() {
    return pageHref('pagamento.html');
  }

  function currentLocationForRedirect() {
    const path = insidePages() ? currentPage() : '../index.html';
    return `${path}${location.search}${location.hash}`;
  }

  function profileComplete(user = currentUser) {
    return Boolean(user?.name && user?.phone && user?.address);
  }

  function firstName(user = currentUser) {
    return String(user?.nick || user?.name || 'Cliente').split(' ')[0];
  }

  function ensureCustomerProfile() {
    currentUser = loadJSON(STORAGE.user, null);
    if (currentUser) {
      if (!currentUser.email) {
        currentUser.email = `cliente-${Date.now()}@monte-sinai.local`;
        currentUser.provider = currentUser.provider || 'Cadastro local';
        saveUser(currentUser);
      }
      return currentUser;
    }

    currentUser = {
      email: `cliente-${Date.now()}@monte-sinai.local`,
      name: '',
      nick: '',
      phone: '',
      address: '',
      provider: 'Cadastro local'
    };
    saveUser(currentUser);
    return currentUser;
  }

  function cartSubtotal() {
    return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }

  function deliveryFee() {
    return cartSubtotal() >= FREE_SHIPPING_FROM || cartSubtotal() === 0 ? 0 : DELIVERY_FEE;
  }

  function orderTotal() {
    return cartSubtotal() + deliveryFee();
  }

  function cartCount() {
    return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function hasGasGift() {
    return cart.some(item => normalizeText(item.name).includes('gas'));
  }

  function ownerWhatsApp() {
    return onlyDigits(ownerConfig.whatsapp) || DEFAULT_OWNER.whatsapp;
  }

  function makeCartId(name, variant = '') {
    return normalizeText(`${name} ${variant}`).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function canonicalAssetPath(src) {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    const clean = src.replaceAll('\\', '/');
    const index = clean.indexOf('assets/');
    return index >= 0 ? clean.slice(index) : clean.replace(/^\.\.\//, '').replace(/^\.\//, '');
  }

  function resolveProductImagePath(src, productName = '') {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;

    const clean = String(src).trim().replaceAll('\\', '/').replace(/^\/+/, '');
    if (!clean) return '';
    if (clean.includes('assets/')) return canonicalAssetPath(clean);
    if (clean.startsWith('produtos/')) return `assets/${clean}`;
    if (clean.startsWith('site/')) return `assets/produtos/${clean}`;
    if (/\.(png|jpe?g|webp|svg|gif)$/i.test(clean)) return `assets/produtos/${clean}`;

    const fallback = productAssetFallback(productName || clean);
    return fallback || clean;
  }

  function assetHref(src) {
    if (!src || /^(https?:|data:|blob:)/.test(src)) return src || '';
    const clean = canonicalAssetPath(src);
    return `${insidePages() ? '../' : ''}${clean}`;
  }

  function showToast(message) {
    let toast = qs('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function applySavedTheme() {
    if (!localStorage.getItem(STORAGE.theme)) localStorage.removeItem(STORAGE.legacyTheme);
    const stored = localStorage.getItem(STORAGE.theme);
    setTheme(stored || preferredSystemTheme(), false);
    bindSystemThemeSync();
  }

  function preferredSystemTheme() {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function bindSystemThemeSync() {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media || bindSystemThemeSync.bound) return;

    bindSystemThemeSync.bound = true;
    const syncTheme = event => {
      if (localStorage.getItem(STORAGE.theme)) return;
      setTheme(event.matches ? 'dark' : 'light', false);
    };

    if (media.addEventListener) media.addEventListener('change', syncTheme);
    else media.addListener?.(syncTheme);
  }

  function setTheme(theme, persist = true) {
    const isLight = theme !== 'dark';
    document.body.classList.toggle('light-mode', isLight);
    if (persist) localStorage.setItem(STORAGE.theme, isLight ? 'light' : 'dark');
    updateThemeControls();
  }

  function updateThemeControls() {
    const isLight = document.body.classList.contains('light-mode');
    const darkToggle = qs('#dark-mode-toggle');
    const current = qs('#theme-current');
    const preview = qs('#theme-preview');

    if (darkToggle) {
      darkToggle.classList.toggle('active', !isLight);
      darkToggle.setAttribute('aria-pressed', String(!isLight));
    }

    if (current) current.textContent = isLight ? 'Modo claro ativado' : 'Modo noturno ativado';
    if (preview) preview.textContent = isLight ? 'Claro' : 'Noturno';
  }

  function upgradeProductImages() {
    qsa('.product-card .product-image').forEach(img => {
      const original = img.getAttribute('src') || '';
      if (!original || original.includes('/site/') || original.endsWith('.svg')) return;

      const enhanced = original.replace('/produtos/', '/produtos/site/');
      img.dataset.originalSrc = original;
      img.src = enhanced;
      img.addEventListener('error', () => {
        img.src = img.dataset.originalSrc || original;
      }, { once: true });
    });
  }

  function enhanceNavigation() {
    const navInner = qs('.nav-inner');
    if (!navInner) return;

    const mobileToggle = qs('.mobile-menu-toggle', navInner);
    const navMenu = qs('.nav-menu', navInner);
    const brand = qs('.brand', navInner);

    if (brand && !qs('.brand-text', brand)) {
      brand.insertAdjacentHTML('beforeend', '<span class="brand-text">Monte Sinai</span>');
    }

    if (!qs('.nav-search', navInner)) {
      const search = document.createElement('form');
      search.className = 'nav-search';
      search.setAttribute('role', 'search');
      search.dataset.siteSearchForm = '';
      search.innerHTML = `
        <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
        <input type="search" name="busca" data-site-search-input placeholder="Pesquisar produto">
        <button type="submit" aria-label="Buscar produto">
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      `;
      navInner.insertBefore(search, navMenu?.nextSibling || mobileToggle || null);
    }

    if (!qs('.nav-actions', navInner)) {
      const actions = document.createElement('div');
      actions.className = 'nav-actions';
      actions.innerHTML = `
        <a class="nav-pill nav-account-link" href="${profileHref()}" aria-label="Abrir perfil do cliente">
          <span class="nav-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span class="nav-account-label" data-account-label>Entrar ou cadastrar</span>
        </a>
        <button class="nav-icon nav-cart-link" type="button" data-open-cart aria-label="Abrir carrinho">
          <i class="fa-solid fa-bag-shopping"></i>
          <span class="nav-cart-count" data-cart-count>0</span>
        </button>
      `;
      navInner.insertBefore(actions, mobileToggle || null);
    }

    const mobileMenu = qs('.mobile-menu');
    if (mobileMenu && !qs('[data-mobile-extra]', mobileMenu)) {
      mobileMenu.insertAdjacentHTML('beforeend', `
        <div class="mobile-menu-divider" data-mobile-extra></div>
        <a class="mobile-only-link nav-account-link" href="${profileHref()}" data-mobile-extra>
          <span class="mobile-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span data-account-label>Entrar ou cadastrar</span>
        </a>
        <button class="mobile-only-link mobile-menu-button" type="button" data-open-cart data-mobile-extra>
          <i class="fa-solid fa-bag-shopping"></i>
          Carrinho
          <strong data-cart-count>0</strong>
        </button>
      `);
    }

    if (!document.body.classList.contains('auth-body') && !qs('.mobile-quick-dock')) {
      const dock = document.createElement('nav');
      dock.className = 'mobile-quick-dock';
      dock.setAttribute('aria-label', 'Atalhos para celular');
      dock.innerHTML = `
        <a href="${homeHref()}" data-dock-section="home">
          <i class="fa-solid fa-house"></i>
          <span>Início</span>
        </a>
        <a href="${productHref()}" data-dock-section="store">
          <i class="fa-solid fa-store"></i>
          <span>Loja</span>
        </a>
        <button class="dock-cart" type="button" data-open-cart data-dock-section="cart">
          <i class="fa-solid fa-bag-shopping"></i>
          <span>Carrinho</span>
          <strong data-cart-count>0</strong>
        </button>
        <button type="button" data-open-search data-dock-section="search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Pesquisa</span>
        </button>
        <a class="nav-account-link dock-profile-link" href="${profileHref()}" data-dock-section="account">
          <span class="dock-account-avatar" data-account-avatar><i class="fa-solid fa-user" aria-hidden="true"></i></span>
          <span class="dock-profile-label" data-account-label>Perfil</span>
        </a>
      `;
      document.body.appendChild(dock);
    }

    updateAccountUI();
    updateDockActive();
  }

  function accountAvatarHTML(signed) {
    if (!signed) return '<i class="fa-solid fa-user" aria-hidden="true"></i>';
    if (currentUser?.photo) return `<img src="${escapeHTML(currentUser.photo)}" alt="">`;
    const initial = (currentUser?.name || currentUser?.email || 'U').trim().charAt(0).toUpperCase() || 'U';
    return `<span>${escapeHTML(initial)}</span>`;
  }

  function updateAccountUI() {
    const signed = Boolean(currentUser?.email);
    const hasPhoto = signed && Boolean(currentUser?.photo);
    qsa('[data-account-label]').forEach(label => {
      label.textContent = label.closest('.mobile-quick-dock')
        ? 'Perfil'
        : (signed ? firstName() : 'Entrar ou cadastrar');
    });

    qsa('[data-account-avatar]').forEach(avatar => {
      avatar.classList.toggle('signed-in', signed);
      avatar.classList.toggle('has-photo', hasPhoto);
      avatar.innerHTML = accountAvatarHTML(signed);
    });

    qsa('.nav-account-link').forEach(link => {
      link.classList.toggle('has-photo', hasPhoto);
    });

    qsa('[data-dock-section="account"]').forEach(link => {
      link.classList.toggle('has-photo', hasPhoto);
    });

    qsa('.nav-account-link, [data-account-cta]').forEach(link => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = profileHref();
      link.classList.toggle('active', ['perfil.html', 'editar-perfil.html', 'configuracoes.html'].includes(currentPage()));
      link.setAttribute('aria-label', signed ? `Conta de ${firstName()}` : 'Abrir perfil do cliente');

      if (link.hasAttribute('data-account-cta')) {
        link.innerHTML = signed
          ? '<i class="fa-solid fa-user-gear"></i> Minha conta'
          : '<i class="fa-solid fa-user-check"></i> Entrar ou cadastrar';
      }
    });

    qsa('[data-account-login]').forEach(link => {
      if (!(link instanceof HTMLAnchorElement)) return;
      link.href = signed ? profileHref() : loginHref({ redirect: currentLocationForRedirect() });
      link.setAttribute('aria-label', signed ? `Conta de ${firstName()}` : 'Entrar ou cadastrar');
    });
  }

  function bindMobileMenu() {
    const toggle = qs('.mobile-menu-toggle');
    const menu = qs('.mobile-menu');
    if (!toggle || !menu) return;

    const close = () => {
      menu.classList.remove('show');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = '<i class="fa-solid fa-bars"></i>';
      document.body.classList.remove('menu-open');
    };

    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const open = !menu.classList.contains('show');
      menu.classList.toggle('show', open);
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
      document.body.classList.toggle('menu-open', open);
    });

    menu.addEventListener('click', event => {
      if (event.target.closest('a, button')) close();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
  }

  function setActiveNavigation() {
    const page = currentPage();
    qsa('.nav-menu a, .mobile-menu a, .footer-links a').forEach(link => {
      const linkPage = (link.getAttribute('href') || '').split(/[?#]/)[0].split('/').pop() || 'index.html';
      link.classList.toggle('active', linkPage === page);
    });
    updateDockActive();
  }

  function updateDockActive() {
    const page = currentPage();
    const activeSection = (() => {
      if (page === 'index.html') return 'home';
      if (page === 'produtos.html') return 'store';
      if (['login.html', 'perfil.html', 'editar-perfil.html', 'configuracoes.html', 'criar.html'].includes(page)) return 'account';
      return '';
    })();

    setDockSectionActive(activeSection);
  }

  function setDockSectionActive(activeSection) {
    qsa('.mobile-quick-dock a, .mobile-quick-dock button').forEach(item => {
      const isActive = item.dataset.dockSection === activeSection;
      item.classList.toggle('active', isActive);
      if (isActive) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
  }

  function bindSiteSearch() {
    bindSearchSuggestionViewportTracking();

    qsa('[data-site-search-form]').forEach(form => {
      const input = qs('[data-site-search-input]', form);
      const suggestions = ensureSearchSuggestions(form);

      form.setAttribute('autocomplete', 'off');
      input?.setAttribute('autocomplete', 'off');
      input?.setAttribute('autocapitalize', 'none');
      input?.setAttribute('autocorrect', 'off');
      input?.setAttribute('spellcheck', 'false');

      input?.addEventListener('input', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
        scheduleSearchSuggestionsPosition(form, suggestions);
      });
      input?.addEventListener('focus', () => {
        closeOtherSearchSuggestions(suggestions);
        renderSearchSuggestions(form, suggestions, input.value);
        scheduleSearchSuggestionsPosition(form, suggestions);
      });
      input?.addEventListener('blur', () => {
        releaseSearchFormAfterBlur(form, suggestions);
      });

      form.addEventListener('submit', event => {
        event.preventDefault();
        const term = input?.value.trim() || '';
        hideSearchSuggestions(suggestions);
        openSearchProductFromQuery(term);
      });
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        qsa('.search-suggestions').forEach(hideSearchSuggestions);
      }
    });

    qsa('[data-mobile-search]').forEach(button => {
      button.addEventListener('click', () => {
        if (currentPage() !== 'produtos.html') {
          window.location.href = productHref();
          return;
        }
        qs('[data-catalog-search]')?.focus();
        scrollCatalogToTop();
      });
    });
  }

  function ensureSearchSuggestions(form) {
    let suggestions = qs('.search-suggestions', form);
    if (suggestions) return suggestions;

    suggestions = document.createElement('div');
    suggestions.className = 'search-suggestions';
    suggestions.setAttribute('role', 'listbox');
    suggestions.setAttribute('aria-label', 'Sugestões de produtos');
    suggestions.addEventListener('touchmove', event => event.stopPropagation(), { passive: true });
    suggestions.addEventListener('wheel', event => event.stopPropagation(), { passive: true });
    form.appendChild(suggestions);
    return suggestions;
  }

  function renderSearchSuggestions(form, suggestions, query) {
    const term = query.trim();
    if (term.length < 2) {
      suggestions.innerHTML = '';
      hideSearchSuggestions(suggestions);
      return;
    }

    const matches = searchSuggestionProducts(term, 5);
    const usingFallback = !directSearchProducts(term, 5).length;

    suggestions.innerHTML = '';

    if (!matches.length) {
      suggestions.innerHTML = `
        <div class="search-suggestion-empty">
          <strong>Nenhum produto exato</strong>
          <span>Veja limpeza, água, gás e utensílios no catálogo.</span>
        </div>
      `;
      suggestions.classList.add('show');
      scheduleSearchSuggestionsPosition(form, suggestions);
      return;
    }

    matches.forEach(product => {
      const item = document.createElement('button');
      item.className = 'search-suggestion-item';
      item.type = 'button';
      item.setAttribute('role', 'option');
      item.innerHTML = `
        <span>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.category)} - ${formatMoney(product.price)}${usingFallback ? ' - sugestao' : ''}</small>
        </span>
        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
      `;
      item.addEventListener('click', () => {
        const input = qs('[data-site-search-input]', form);
        if (input) input.value = product.name;
        hideSearchSuggestions(suggestions);
        openProductSearchModal(product, matches, product.name);
      });
      suggestions.appendChild(item);
    });

    suggestions.classList.add('show');
    scheduleSearchSuggestionsPosition(form, suggestions);
  }

  function hideSearchSuggestions(suggestions) {
    suggestions?.classList.remove('show');
    clearSearchSuggestionsPosition(suggestions);
  }

  function closeOtherSearchSuggestions(activeSuggestions) {
    qsa('.search-suggestions').forEach(suggestions => {
      if (suggestions !== activeSuggestions) hideSearchSuggestions(suggestions);
    });
  }

  function isMobileSearchViewport() {
    return window.matchMedia('(max-width: 760px)').matches;
  }

  function clearSearchSuggestionsPosition(suggestions) {
    if (!suggestions) return;
    suggestions.classList.remove('is-mobile-fixed');
    ['--suggestions-top', '--suggestions-left', '--suggestions-width', '--suggestions-max-height'].forEach(prop => {
      suggestions.style.removeProperty(prop);
    });
    if (activeSearchSuggestionContext?.suggestions === suggestions) activeSearchSuggestionContext = null;
  }

  function releaseSearchFormAfterBlur(form, suggestions) {
    window.setTimeout(() => {
      const focusedInside = form.contains(document.activeElement);
      if (focusedInside) return;
      hideSearchSuggestions(suggestions);
    }, 180);
  }

  function scheduleSearchSuggestionsPosition(form, suggestions) {
    activeSearchSuggestionContext = { form, suggestions };
    window.cancelAnimationFrame(searchSuggestionFrame);
    searchSuggestionFrame = window.requestAnimationFrame(() => positionSearchSuggestions(form, suggestions));
  }

  function positionSearchSuggestions(form, suggestions) {
    if (!suggestions?.classList.contains('show')) {
      clearSearchSuggestionsPosition(suggestions);
      return;
    }

    if (!isMobileSearchViewport()) {
      clearSearchSuggestionsPosition(suggestions);
      return;
    }

    clearSearchSuggestionsPosition(suggestions);
  }

  function bindSearchSuggestionViewportTracking() {
    if (document.body.dataset.searchSuggestionTracking === 'true') return;
    document.body.dataset.searchSuggestionTracking = 'true';

    const refresh = () => {
      const context = activeSearchSuggestionContext;
      if (context?.form && context?.suggestions) scheduleSearchSuggestionsPosition(context.form, context.suggestions);
    };

    window.addEventListener('resize', refresh, { passive: true });
    window.addEventListener('scroll', refresh, { passive: true });
    window.visualViewport?.addEventListener('resize', refresh, { passive: true });
    window.visualViewport?.addEventListener('scroll', refresh, { passive: true });
  }

  function ensureSmartSearchShell() {
    if (document.body.classList.contains('auth-body') || qs('.smart-search')) return;

    const shell = document.createElement('section');
    shell.className = 'smart-search';
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', 'Busca inteligente de produtos');
    shell.innerHTML = `
      <div class="smart-search-backdrop" data-close-search></div>
      <div class="smart-search-panel">
        <header class="smart-search-head">
          <div>
            <span class="eyebrow">Busca inteligente</span>
            <h2>O que você precisa hoje?</h2>
            <p>Digite do seu jeito: banheiro, lavar roupa, tirar gordura, gás ou água.</p>
          </div>
          <button class="smart-search-close" type="button" data-close-search aria-label="Fechar busca">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </header>

        <form class="smart-search-form" data-smart-search-form role="search">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input data-smart-search-input type="search" autocomplete="off" placeholder="Ex: limpar banheiro, lavar roupa, gás...">
          <button type="submit">Buscar</button>
        </form>

        <div class="smart-search-results" data-smart-search-results></div>
      </div>
    `;

    document.body.appendChild(shell);
    renderSmartSearchResults('');
  }

  function bindSmartSearchPanel() {
    const shell = qs('.smart-search');
    if (!shell) return;

    qsa('[data-open-search]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        const seed = qs('[data-catalog-search]')?.value || qs('[data-site-search-input]')?.value || '';
        openSmartSearch(seed);
      });
    });

    const form = qs('[data-smart-search-form]', shell);
    const input = qs('[data-smart-search-input]', shell);

    input?.addEventListener('input', () => renderSmartSearchResults(input.value));

    form?.addEventListener('submit', event => {
      event.preventDefault();
      navigateSmartSearch(input?.value || '');
    });

    shell.addEventListener('click', event => {
      const closeButton = event.target.closest('[data-close-search]');
      if (closeButton) {
        closeSmartSearch();
        return;
      }

      const product = event.target.closest('[data-smart-product]');
      if (product) navigateSmartSearch(product.dataset.smartProduct || input?.value || '');
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && shell.classList.contains('open')) closeSmartSearch();
    });
  }

  function openSmartSearch(seed = '') {
    const shell = qs('.smart-search');
    if (!shell) {
      window.location.href = productHref(seed);
      return;
    }

    const input = qs('[data-smart-search-input]', shell);
    if (input) input.value = seed.trim();
    renderSmartSearchResults(seed);
    shell.classList.add('open');
    document.body.classList.add('smart-search-open');
    setDockSectionActive('search');
    setTimeout(() => input?.focus(), 80);
  }

  function closeSmartSearch() {
    qs('.smart-search')?.classList.remove('open');
    document.body.classList.remove('smart-search-open');
    updateDockActive();
  }

  function navigateSmartSearch(query) {
    const term = query.trim();
    closeSmartSearch();
    openSearchProductFromQuery(term);
  }

  function renderSmartSearchResults(query = '') {
    const results = qs('[data-smart-search-results]');
    if (!results) return;

    const term = query.trim();
    const matches = smartSearchMatches(term);
    const heading = term ? 'Produtos encontrados' : 'Mais procurados agora';
    const subtitle = term
      ? `${matches.length} sugestao${matches.length === 1 ? '' : 'es'} para "${escapeHTML(term)}"`
      : 'Atalhos para os pedidos mais comuns no celular';

    results.innerHTML = `
      <div class="smart-search-result-head">
        <div>
          <strong>${heading}</strong>
          <span>${subtitle}</span>
        </div>
      </div>
      ${matches.length ? `
        <div class="smart-search-result-grid">
          ${matches.map(product => `
            <button type="button" class="smart-search-product" data-smart-product="${escapeHTML(product.name)}">
              <span class="smart-search-product-icon"><i class="fa-solid ${smartProductIcon(product)}"></i></span>
              <span class="smart-search-product-copy">
                <strong>${escapeHTML(product.name)}</strong>
                <small>${escapeHTML(product.category)} - ${formatMoney(product.price)}</small>
              </span>
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="smart-search-empty">
          <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
          <strong>Nenhum produto exato ainda</strong>
          <span>Tente procurar por banheiro, roupa, cozinha, quintal, gás, água ou cheiro bom.</span>
        </div>
      `}
    `;
  }

  function smartSearchMatches(query) {
    return searchSuggestionProducts(query, String(query ?? '').trim() ? 5 : 6);
  }

  function smartProductIcon(product) {
    const blob = normalizeText(productTerms(product));
    if (blob.includes('gas')) return 'fa-fire-flame-simple';
    if (blob.includes('agua')) return 'fa-droplet';
    if (blob.includes('roupa') || blob.includes('lavanderia') || blob.includes('sabao') || blob.includes('amaciante')) return 'fa-shirt';
    if (blob.includes('cozinha') || blob.includes('detergente') || blob.includes('esponja')) return 'fa-kitchen-set';
    if (blob.includes('banheiro') || blob.includes('vaso') || blob.includes('sabonete')) return 'fa-bath';
    if (blob.includes('vassoura') || blob.includes('rodo') || blob.includes('pa')) return 'fa-broom';
    return 'fa-spray-can-sparkles';
  }

  function productCardHTML(product, mode = 'catalog') {
    const normalized = normalizeProduct(product);
    const recommended = isRecommendedProduct(normalized);
    const image = productAssetPath(normalized);
    const options = productOptions(normalized);
    const hasOptions = options.length > 1;
    const firstOption = options[0] || { price: normalized.price };
    const cardClass = [
      'product-card',
      mode === 'rail' ? 'rail-product tilt-3d' : 'catalog-product',
      recommended ? 'is-recommended' : ''
    ].filter(Boolean).join(' ');

    return `
      <article class="${cardClass}" data-name="${escapeHTML(normalized.name)}" data-category="${escapeHTML(normalized.categorySlug)}" data-recommended="${recommended}">
        ${recommended ? '<span class="recommended-badge">Recomendado</span>' : ''}
        <div class="product-media">
          ${image
            ? `<img class="product-image" src="${escapeHTML(assetHref(image))}" alt="${escapeHTML(normalized.name)}">`
            : `<i class="fa-solid ${smartProductIcon(normalized)}"></i>`}
        </div>
        <div class="product-icon"><i class="fa-solid ${smartProductIcon(normalized)}"></i></div>
        <h3>${escapeHTML(normalized.name)}</h3>
        <p>${escapeHTML(normalized.description || `Produto de ${normalized.category} pronto para adicionar ao pedido.`)}</p>
        ${hasOptions ? `
          <select class="product-option" aria-label="${escapeHTML(normalized.name.includes('Desinfetante') ? 'Escolher fragrância do desinfetante' : 'Escolher tipo do produto')}">
            ${options.map(option => `<option value="${escapeHTML(option.value)}" data-price="${escapeHTML(option.price)}">${escapeHTML(option.label)}</option>`).join('')}
          </select>
        ` : ''}
        <strong>${formatMoney(firstOption.price || normalized.price)}</strong>
        <button class="btn btn-primary btn-add-cart" data-name="${escapeHTML(normalized.name)}" data-price="${escapeHTML(firstOption.price || normalized.price)}" data-image="${escapeHTML(image)}">Adicionar</button>
      </article>
    `;
  }

  function renderDynamicFilters() {
    const filterBar = qs('.filter-chips');
    if (!filterBar || !productIndex.length) return;

    const categories = orderedCategoryEntries();

    filterBar.innerHTML = [
      '<button class="filter-chip active" type="button" data-filter="all">Todos</button>',
      '<button class="filter-chip" type="button" data-filter="recommended">Recomendados</button>',
      ...categories.map(([slug, label]) => `<button class="filter-chip" type="button" data-filter="${escapeHTML(slug)}">${escapeHTML(label)}</button>`)
    ].join('');
  }

  function catalogProductGroups() {
    const recommended = productIndex.filter(product => isRecommendedProduct(product));
    const recommendedNames = new Set(recommended.map(product => normalizeText(product.name)));
    const remaining = productIndex.filter(product => !recommendedNames.has(normalizeText(product.name)));
    const groups = [];

    if (recommended.length) {
      groups.push({
        slug: 'recommended',
        products: recommended,
        ...CATALOG_SECTION_META.recommended
      });
    }

    orderedCategoryEntries(remaining).forEach(([slug, label]) => {
      const products = remaining.filter(product => (product.categorySlug || categorySlug(product.category)) === slug);
      if (!products.length) return;

      groups.push({
        slug,
        products,
        ...catalogSectionMeta(slug, label)
      });
    });

    return groups;
  }

  function renderDynamicCatalog() {
    const catalog = qs('#todos-produtos > div');
    if (!catalog) return;

    renderDynamicFilters();

    [...catalog.children].forEach(child => {
      if (child.matches('.section-head, .grid-produtos')) child.remove();
    });

    let empty = qs('#catalog-empty', catalog);
    if (!empty) {
      empty = document.createElement('p');
      empty.id = 'catalog-empty';
      empty.className = 'empty-cart hidden';
      empty.textContent = 'Nenhum produto encontrado com esse filtro.';
      catalog.appendChild(empty);
    }

    catalogProductGroups().forEach(group => {
      const head = document.createElement('div');
      head.className = 'section-head';
      head.dataset.catalogSection = group.slug;
      head.innerHTML = `
        <span class="eyebrow">${escapeHTML(group.eyebrow)}</span>
        <h2>${escapeHTML(group.title)}</h2>
      `;

      const grid = document.createElement('div');
      grid.className = 'grid-produtos';
      grid.dataset.dynamicCatalog = '';
      grid.dataset.catalogSection = group.slug;
      grid.innerHTML = group.products.map(product => productCardHTML(product, 'catalog')).join('');

      catalog.insertBefore(head, empty);
      catalog.insertBefore(grid, empty);
    });
  }

  function renderDynamicProductRail() {
    const rail = qs('[data-product-rail]');
    if (!rail || !productIndex.length) return;

    const recommended = productIndex.filter(product => isRecommendedProduct(product));
    const recommendedNames = new Set(recommended.map(product => normalizeText(product.name)));
    const featured = [...recommended, ...productIndex.filter(product => !recommendedNames.has(normalizeText(product.name)))].slice(0, 6);
    rail.innerHTML = `
      ${featured.map(product => productCardHTML(product, 'rail')).join('')}
      <a class="more-card rail-product more-card-3d tilt-3d" href="${productHref()}" aria-label="Ver mais produtos">
        <div class="product-icon"><i class="fa-solid fa-arrow-right"></i></div>
        <h3>Ver mais produtos</h3>
        <p>Abra o catálogo completo com todos os produtos cadastrados.</p>
        <span class="btn btn-secondary">Ver catálogo completo</span>
      </a>
    `;
    qsa('.rail-product', rail).forEach((card, index) => card.classList.toggle('is-center', index === 0));
  }

  function bindCatalog() {
    const input = qs('[data-catalog-search]');
    const filterBar = qs('.filter-chips');
    const params = new URLSearchParams(location.search);
    const initialQuery = params.get('q') || '';
    if (input && initialQuery) input.value = initialQuery;
    if (initialQuery) activateCatalogFilter('all');

    input?.addEventListener('input', () => {
      if (input.value.trim()) activateCatalogFilter('all');
      applyCatalogFilters();
    });

    filterBar?.addEventListener('click', event => {
      const chip = event.target.closest('[data-filter]');
      if (!chip) return;
      qsa('[data-filter]').forEach(item => item.classList.toggle('active', item === chip));
      applyCatalogFilters();
    });

    applyCatalogFilters();
    if (initialQuery || location.hash === '#todos-produtos') {
      setTimeout(() => scrollCatalogToTop('auto'), 80);
    }
  }

  function applyCatalogFilters() {
    const products = qsa('.catalog-product');

    const rawTerm = qs('[data-catalog-search]')?.value || '';
    const term = normalizeText(rawTerm);
    const searchProducts = term ? catalogSearchProducts(rawTerm, 8) : [];
    const activeChip = qs('[data-filter].active');
    const filter = activeChip?.dataset.filter || 'all';
    let visible = 0;

    products.forEach(card => {
      const category = card.dataset.category || '';
      const recommended = card.dataset.recommended === 'true' || card.classList.contains('is-recommended');
      const matchesProduct = searchProducts.some(product => cardMatchesCatalogProduct(card, product));
      const matchesCardText = !searchProducts.length && cardMatchesCatalogQuery(card, rawTerm, true);
      const matchesTerm = !term || matchesProduct || matchesCardText;
      const matchesFilter = filter === 'all' || category === filter || (filter === 'recommended' && recommended);
      const show = matchesTerm && matchesFilter;
      card.classList.toggle('hidden', !show);
      card.classList.toggle('is-related-result', false);
      if (show) visible += 1;
    });

    qsa('.grid-produtos').forEach(grid => {
      const hasVisibleProducts = qsa('.catalog-product:not(.hidden)', grid).length > 0;
      const sectionHead = grid.previousElementSibling?.classList.contains('section-head') ? grid.previousElementSibling : null;
      const hideGroup = Boolean(term || filter !== 'all') && !hasVisibleProducts;
      grid.classList.toggle('hidden', hideGroup);
      sectionHead?.classList.toggle('hidden', hideGroup);
    });

    qs('#catalog-empty')?.classList.toggle('hidden', visible > 0);
    const result = qs('[data-catalog-results]');
    if (result) {
      const suffix = term ? ` para "${rawTerm.trim()}"` : '';
      const suggested = term && visible ? (visible === 1 ? ' sugerido' : ' sugeridos') : '';
      result.textContent = `${visible} produto${visible === 1 ? '' : 's'}${suggested} encontrado${visible === 1 ? '' : 's'}${suffix}`;
    }
  }

  function bindProductCards() {
    document.body.addEventListener('change', event => {
      const select = event.target.closest('.product-option');
      if (!select) return;

      const option = select.selectedOptions[0];
      const card = select.closest('.product-card');
      const price = Number(option?.dataset.price || card?.querySelector('.btn-add-cart')?.dataset.price || 0);
      const priceEl = card?.querySelector('strong');
      const button = card?.querySelector('.btn-add-cart');

      if (priceEl) priceEl.textContent = formatMoney(price);
      if (button && option?.dataset.price) button.dataset.price = option.dataset.price;
    });

    document.body.addEventListener('click', event => {
      const button = event.target.closest('.btn-add-cart');
      if (!button) return;

      const card = button.closest('.product-card');
      const select = card?.querySelector('.product-option');
      const option = select?.selectedOptions[0];
      const baseName = button.dataset.name || card?.dataset.name || card?.querySelector('h3')?.textContent.trim();
      const variant = option?.value || '';
      const price = Number(option?.dataset.price || button.dataset.price || 0);
      const image = canonicalAssetPath(card?.querySelector('.product-image')?.getAttribute('src') || button.dataset.image || '');

      if (!baseName || Number.isNaN(price)) return;

      addToCart({
        name: baseName,
        variant,
        price,
        image
      });

      const original = button.dataset.originalText || button.textContent.trim();
      button.dataset.originalText = original;
      button.textContent = 'Adicionado';
      button.classList.add('is-added');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-added');
      }, 1150);
    });
  }

  function addToCart(product) {
    const displayName = product.variant ? `${product.name} - ${product.variant}` : product.name;
    const id = makeCartId(product.name, product.variant);
    const existing = cart.find(item => item.id === id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id,
        name: displayName,
        baseName: product.name,
        variant: product.variant || '',
        price: Number(product.price || 0),
        quantity: 1,
        image: product.image || ''
      });
    }

    saveCart();
    renderCart();
    showToast(`${displayName} adicionado ao carrinho.`);
  }

  function bindProductRail() {
    const rail = qs('[data-product-rail]');
    if (!rail) return;

    const cards = () => qsa('.rail-product', rail);
    let active = 0;

    const applyRailState = index => {
      const list = cards();
      if (!list.length) return;
      active = Math.max(0, Math.min(index, list.length - 1));
      list.forEach((card, cardIndex) => {
        const distance = Math.abs(cardIndex - active);
        card.classList.toggle('is-center', cardIndex === active);
        card.classList.toggle('is-near', distance === 1);
        card.classList.toggle('is-left', cardIndex < active);
        card.classList.toggle('is-right', cardIndex > active);
      });
    };

    const scrollRailTo = (index, behavior = 'smooth') => {
      const list = cards();
      if (!list.length) return;
      const safeIndex = Math.max(0, Math.min(index, list.length - 1));
      const target = list[safeIndex];
      const targetRect = target.getBoundingClientRect();
      const step = (targetRect.width || target.offsetWidth || 316) + 18;
      const left = safeIndex * step;
      const desiredLeft = Math.max(0, left);
      rail.scrollTo({ left: desiredLeft, behavior });
      window.setTimeout(() => {
        if (Math.abs(rail.scrollLeft - desiredLeft) < 1 && desiredLeft > 0) {
          rail.scrollLeft = desiredLeft;
        }
      }, 120);
    };

    const focusCard = (index, behavior = 'smooth') => {
      applyRailState(index);
      scrollRailTo(active, behavior);
    };

    qsa('[data-rail-scroll]').forEach(button => {
      button.addEventListener('click', () => {
        focusCard(active + (button.dataset.railScroll === 'prev' ? -1 : 1));
      });
    });

    rail.addEventListener('click', event => {
      if (event.target.closest('button, select, input, textarea, label, a')) return;

      const card = event.target.closest('.rail-product');
      if (!card || !rail.contains(card)) return;

      const list = cards();
      const index = list.indexOf(card);
      if (index < 0) return;

      focusCard(index === active ? (active + 1) % list.length : index);
    });

    rail.addEventListener('scroll', () => {
      window.requestAnimationFrame(() => {
        const rect = rail.getBoundingClientRect();
        const center = rect.left + rect.width / 2;
        let next = active;
        let best = Infinity;

        cards().forEach((card, index) => {
          const cardRect = card.getBoundingClientRect();
          const distance = Math.abs(center - (cardRect.left + cardRect.width / 2));
          if (distance < best) {
            best = distance;
            next = index;
          }
        });

        if (next !== active) applyRailState(next);
      });
    }, { passive: true });

    window.requestAnimationFrame(() => applyRailState(0));
  }

  function ensureCartShell() {
    if (!qs('.cart-float') && !document.body.classList.contains('auth-body')) {
      const float = document.createElement('button');
      float.className = 'cart-float is-empty';
      float.type = 'button';
      float.dataset.openCart = '';
      float.innerHTML = '<i class="fa-solid fa-bag-shopping"></i><span>Carrinho</span><span class="badge" data-cart-count>0</span>';
      document.body.appendChild(float);
    }

    if (!qs('.cart-modal')) {
      const modal = document.createElement('div');
      modal.className = 'cart-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-label', 'Carrinho de compras');
      modal.innerHTML = `
        <div class="cart-modal-panel">
          <header class="cart-modal-header">
            <div>
              <span class="eyebrow">Seu carrinho</span>
              <h3>Resumo do pedido</h3>
            </div>
            <button class="icon-button" type="button" data-close-cart aria-label="Fechar carrinho">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </header>
          <div class="cart-items" data-modal-cart-items></div>
          <footer class="cart-modal-footer">
            <div class="cart-total">
              <span>Subtotal</span>
              <strong data-cart-total>R$ 0,00</strong>
            </div>
            <a class="btn btn-primary btn-full" data-modal-checkout href="${checkoutHref()}">
              <i class="fa-solid fa-lock"></i>
              Finalizar pedido
            </a>
            <button class="btn btn-secondary btn-full cart-clear-button hidden" type="button" data-clear-cart>
              <i class="fa-solid fa-trash-can"></i>
              Limpar carrinho
            </button>
            <a class="btn btn-secondary btn-full" href="${productHref()}">
              <i class="fa-solid fa-store"></i>
              Continuar comprando
            </a>
          </footer>
        </div>
      `;
      document.body.appendChild(modal);
    }
  }

  function bindCartActions() {
    document.body.addEventListener('click', event => {
      const open = event.target.closest('[data-open-cart]');
      const close = event.target.closest('[data-close-cart]');
      const action = event.target.closest('[data-cart-action]');
      const pageCheckout = event.target.closest('[data-page-checkout]');
      const clearCart = event.target.closest('[data-clear-cart]');

      if (open) {
        openCartModal();
        return;
      }

      if (close || event.target.classList.contains('cart-modal')) {
        closeCartModal();
        return;
      }

      if (pageCheckout) {
        if (!cart.length) {
          showToast('Adicione pelo menos um produto antes de finalizar.');
          return;
        }
        window.location.href = checkoutHref();
        return;
      }

      if (clearCart) {
        clearCartItems();
        return;
      }

      if (!action) return;

      const id = action.dataset.cartId;
      const item = cart.find(entry => entry.id === id);
      if (!item) return;

      if (action.dataset.cartAction === 'increase') item.quantity += 1;
      if (action.dataset.cartAction === 'decrease') item.quantity = Math.max(1, item.quantity - 1);
      if (action.dataset.cartAction === 'remove') cart = cart.filter(entry => entry.id !== id);

      saveCart();
      renderCart();
      renderPaymentSummary();
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeCartModal();
        closeProductSearchModal();
      }
    });
  }

  function bindDataCleanupActions() {
    document.body.addEventListener('click', event => {
      const clearCache = event.target.closest('[data-clear-cache]');
      const clearOrders = event.target.closest('[data-clear-order-history]');
      const clearAll = event.target.closest('[data-clear-cache-orders]');

      if (clearCache) {
        clearLocalCache();
        return;
      }

      if (clearOrders) {
        clearOrderHistory();
        return;
      }

      if (clearAll) {
        if (!confirm('Deseja limpar cache local, carrinho e histórico de pedidos deste navegador?')) return;
        clearLocalCache(false);
        clearOrderHistory(false);
        showToast('Cache e histórico de pedidos limpos.');
      }
    });
  }

  function clearCartItems(showMessage = true) {
    if (!cart.length) {
      if (showMessage) showToast('O carrinho já está vazio.');
      return;
    }

    if (showMessage && !confirm('Deseja remover todos os produtos do carrinho?')) return;
    cart = [];
    saveCart();
    renderCart();
    renderPaymentSummary();
    if (showMessage) showToast('Carrinho limpo.');
  }

  function clearOrderHistory(showMessage = true) {
    if (showMessage && !confirm('Deseja limpar o histórico de pedidos deste navegador?')) return;
    saveJSON(STORAGE.orders, []);
    renderOrdersEverywhere();
    if (showMessage) showToast('Histórico de pedidos limpo.');
  }

  function clearLocalCache(showMessage = true) {
    if (showMessage && !confirm('Deseja limpar o cache local do site neste navegador?')) return;

    localStorage.removeItem(STORAGE.cart);
    localStorage.removeItem(STORAGE.legacyCart);
    localStorage.removeItem(STORAGE.legacyTheme);
    Object.keys(localStorage)
      .filter(key => key.startsWith('ms_setting_'))
      .forEach(key => localStorage.removeItem(key));

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(() => {});
    }

    cart = [];
    renderCart();
    renderPaymentSummary();
    updateThemeControls();
    if (showMessage) showToast('Cache local limpo.');
  }

  function openCartModal() {
    renderCart();
    qs('.cart-modal')?.classList.add('open');
    document.body.classList.add('cart-open');
    setDockSectionActive('cart');
  }

  function closeCartModal() {
    qs('.cart-modal')?.classList.remove('open');
    document.body.classList.remove('cart-open');
    updateDockActive();
  }

  function renderCart() {
    const hasItems = cartCount() > 0;
    document.body.classList.toggle('cart-has-items', hasItems);

    qsa('[data-cart-count], #cart-count').forEach(el => {
      el.textContent = String(cartCount());
    });
    qsa('[data-profile-cart-count]').forEach(el => {
      el.textContent = String(cartCount());
    });

    qsa('[data-cart-total], #cart-total').forEach(el => {
      el.textContent = formatMoney(cartSubtotal());
    });

    qsa('.cart-float, .nav-cart-link, .mobile-quick-dock .dock-cart, .mobile-menu-button[data-open-cart]').forEach(button => {
      button.classList.toggle('has-items', hasItems);
      button.classList.toggle('is-empty', !hasItems);
    });

    const pageItems = qs('#cart-items');
    const modalItems = qs('[data-modal-cart-items]');
    if (pageItems) renderCartItems(pageItems);
    if (modalItems) renderCartItems(modalItems);

    qsa('[data-page-checkout], [data-modal-checkout]').forEach(button => {
      button.classList.toggle('hidden', cart.length === 0);
      if (button instanceof HTMLAnchorElement) button.href = checkoutHref();
    });

    qsa('[data-clear-cart]').forEach(button => {
      button.classList.toggle('hidden', cart.length === 0);
    });
  }

  function renderCartItems(container) {
    container.innerHTML = '';

    if (!cart.length) {
      container.innerHTML = '<p class="empty-cart">Seu carrinho está vazio.</p>';
      return;
    }

    cart.forEach(item => {
      const row = document.createElement('article');
      row.className = 'cart-item';
      row.innerHTML = `
        <div class="cart-item-left">
          <span class="cart-thumb">
            ${item.image ? `<img class="cart-thumb-img" src="${assetHref(item.image)}" alt="">` : '<i class="fa-solid fa-box"></i>'}
          </span>
          <span>
            <span class="cart-item-name">${escapeHTML(item.name)}</span>
            <span class="cart-item-price">${formatMoney(item.price)} cada</span>
          </span>
        </div>
        <div class="cart-item-right">
          <div class="qty-controls" aria-label="Quantidade">
            <button class="icon-button" type="button" data-cart-action="decrease" data-cart-id="${escapeHTML(item.id)}" aria-label="Diminuir quantidade">
              <i class="fa-solid fa-minus"></i>
            </button>
            <span class="qty">${escapeHTML(item.quantity)}</span>
            <button class="icon-button" type="button" data-cart-action="increase" data-cart-id="${escapeHTML(item.id)}" aria-label="Aumentar quantidade">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>
          <button class="icon-button btn-remove" type="button" data-cart-action="remove" data-cart-id="${escapeHTML(item.id)}" aria-label="Remover produto">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `;
      container.appendChild(row);
    });
  }

  function bindAccountPage() {
    const form = qs('#account-form');
    if (!form) return;

    const params = new URLSearchParams(location.search);
    const tabs = qsa('[data-auth-mode]');
    const submitLabel = qs('[data-auth-submit-label]');
    const status = qs('#account-status');
    const nameInput = qs('#login-name');
    const emailInput = qs('#login-email');
    const passInput = qs('#login-password');
    const confirmInput = qs('#login-password-confirm');
    const phoneInput = qs('#login-phone');
    const addressInput = qs('#login-address');

    const setMode = mode => {
      form.dataset.authMode = mode;
      tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode));
      qsa('[data-register-only]').forEach(field => field.classList.toggle('hidden', mode !== 'register'));
      if (submitLabel) submitLabel.textContent = mode === 'register' ? 'Cadastrar' : 'Entrar';
      if (status) {
        status.textContent = mode === 'register'
          ? 'Crie sua conta local para salvar telefone e endereço neste aparelho.'
          : 'Entre para usar seus dados salvos e finalizar pedidos mais rápido.';
      }
      passInput?.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
    };

    tabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.authMode || 'login')));

    if (currentUser?.email) {
      emailInput.value = currentUser.email || '';
      nameInput.value = currentUser.name || '';
      phoneInput.value = currentUser.phone || '';
      addressInput.value = currentUser.address || '';
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      const mode = form.dataset.authMode || 'login';
      const accounts = loadJSON(STORAGE.accounts, {});
      const email = emailInput.value.trim().toLowerCase();
      const password = passInput.value;

      if (!email || !password) {
        showToast('Informe email e senha para continuar.');
        return;
      }

      if (mode === 'register') {
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const address = addressInput.value.trim();

        if (!name || !phone || !address) {
          showToast('Preencha nome, WhatsApp e endereço para cadastrar.');
          return;
        }

        if (password.length < 4) {
          showToast('Use uma senha com pelo menos 4 caracteres.');
          return;
        }

        if (password !== confirmInput.value) {
          showToast('A confirmação da senha precisa ser igual.');
          return;
        }

        const user = { email, password, name, phone, address, nick: '', provider: 'Cadastro local' };
        accounts[email] = user;
        saveJSON(STORAGE.accounts, accounts);
        finishLogin(user, 'Conta criada com sucesso.');
        return;
      }

      const saved = accounts[email];
      if (saved && saved.password !== password) {
        showToast('Senha diferente da conta salva neste aparelho.');
        return;
      }

      const user = saved || {
        email,
        password,
        name: email.split('@')[0],
        phone: '',
        address: '',
        nick: '',
        provider: 'Login local'
      };
      accounts[email] = user;
      saveJSON(STORAGE.accounts, accounts);
      finishLogin(user, profileComplete(user) ? 'Login realizado.' : 'Login realizado. Complete seu endereço quando finalizar.');
    });

    setMode(params.get('mode') === 'register' ? 'register' : 'login');
  }

  function finishLogin(user, message) {
    const { password: _password, ...safeUser } = user;
    saveUser(safeUser);
    showToast(message);

    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    setTimeout(() => {
      window.location.href = redirect || profileHref();
    }, 500);
  }

  function initPaymentPage() {
    if (!qs('#payment-summary')) return;

    qsa('[data-payment-option]').forEach(button => {
      button.addEventListener('click', () => setPaymentOption(button.dataset.paymentOption || 'delivery'));
    });

    qs('#order-for-other')?.addEventListener('change', event => {
      if (event.target.checked) {
        qs('#payment-form')?.classList.remove('profile-ready');
        ['#payment-name', '#payment-phone', '#payment-address'].forEach(selector => {
          const input = qs(selector);
          if (input) input.value = '';
        });
        showToast('Preencha os dados do destinatário.');
      } else {
        applyCheckoutProfile();
      }
    });

    qs('#checkout-edit-customer')?.addEventListener('click', () => {
      qs('#payment-form')?.classList.remove('profile-ready');
      qs('#checkout-profile-box')?.classList.add('hidden');
      showToast('Dados liberados para edição neste pedido.');
    });

    qs('#payment-confirm')?.addEventListener('click', finalizeOrder);

    renderPaymentSummary();
    applyCheckoutProfile();
    setPaymentOption('delivery');
  }

  function setPaymentOption(option) {
    activePayment = option || 'delivery';
    qsa('[data-payment-option]').forEach(button => {
      button.classList.toggle('active', button.dataset.paymentOption === activePayment);
    });
    qsa('[data-payment-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.paymentPanel === activePayment);
    });

    const confirm = qs('#payment-confirm');
    if (confirm) {
      confirm.innerHTML = activePayment === 'whatsapp'
        ? '<i class="fa-brands fa-whatsapp"></i> Enviar pelo WhatsApp'
        : '<i class="fa-solid fa-truck-fast"></i> Finalizar para entrega';
    }
  }

  function renderPaymentSummary() {
    const summary = qs('#payment-summary');
    if (!summary) return;

    const empty = qs('#payment-empty');
    const form = qs('#payment-form');
    const accountCard = qs('#checkout-account-card');
    summary.innerHTML = '';

    if (!cart.length) {
      empty?.classList.remove('hidden');
      form?.classList.add('hidden');
      accountCard?.classList.add('hidden');
      return;
    }

    empty?.classList.add('hidden');
    form?.classList.remove('hidden');
    accountCard?.classList.remove('hidden');

    const list = document.createElement('div');
    list.className = 'payment-items';
    cart.forEach(item => {
      const row = document.createElement('div');
      row.className = 'payment-item';
      row.innerHTML = `<span>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</span><strong>${formatMoney(item.price * item.quantity)}</strong>`;
      list.appendChild(row);
    });

    const fee = deliveryFee();
    const gift = hasGasGift();
    summary.appendChild(list);
    summary.insertAdjacentHTML('beforeend', `
      <div class="payment-fee">
        <span>Entrega</span>
        <strong>${fee ? formatMoney(fee) : 'Grátis'}</strong>
      </div>
      ${gift ? '<div class="payment-gift"><span>Brinde</span><strong>Compra de gás</strong></div>' : ''}
      <div class="payment-total">
        <span>Total</span>
        <strong>${formatMoney(orderTotal())}</strong>
      </div>
      <button class="btn btn-secondary btn-full cart-clear-button" type="button" data-clear-cart>
        <i class="fa-solid fa-trash-can"></i>
        Limpar carrinho
      </button>
    `);
  }

  function applyCheckoutProfile() {
    currentUser = loadJSON(STORAGE.user, null);
    const form = qs('#payment-form');
    const profileBox = qs('#checkout-profile-box');
    const accountCard = qs('#checkout-account-card');
    const accountText = qs('#checkout-account-text');
    const loginLink = qs('[data-account-login]');
    const signed = Boolean(currentUser?.email);
    const complete = profileComplete();

    accountCard?.classList.toggle('is-signed', signed);
    accountCard?.classList.toggle('needs-profile-data', signed && !complete);
    accountCard?.classList.toggle('profile-complete', complete);

    if (signed) {
      const nameInput = qs('#payment-name');
      const phoneInput = qs('#payment-phone');
      const addressInput = qs('#payment-address');

      if (nameInput && currentUser.name) nameInput.value = currentUser.name;
      if (phoneInput && currentUser.phone) phoneInput.value = currentUser.phone;
      if (addressInput && currentUser.address) addressInput.value = currentUser.address;

      form?.classList.toggle('profile-ready', complete);
      profileBox?.classList.remove('hidden');
      if (profileBox) {
        const boxText = qs('p', profileBox);
        if (boxText) {
          boxText.textContent = complete
            ? `Usando os dados salvos de ${firstName()} para este pedido.`
            : 'Conta conectada. Complete os dados que faltam para finalizar o pedido.';
        }
      }
      if (accountText) {
        accountText.textContent = complete
          ? `Conta conectada como ${firstName()}. Seus dados serao usados na entrega.`
          : `Conta conectada como ${firstName()}. Complete telefone e endereco para finalizar.`;
      }
      if (loginLink) {
        loginLink.href = profileHref();
        loginLink.innerHTML = complete
          ? '<i class="fa-solid fa-user-check"></i> Minha conta'
          : '<i class="fa-solid fa-user-pen"></i> Completar dados';
      }
    } else {
      form?.classList.remove('profile-ready');
      profileBox?.classList.add('hidden');
      if (accountText) accountText.textContent = 'Entre ou cadastre-se para salvar seus dados e pedir mais rápido.';
      if (loginLink) {
        loginLink.href = loginHref({ redirect: currentLocationForRedirect() });
        loginLink.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Entrar';
      }
    }
  }

  function collectCheckoutCustomer() {
    const customer = {
      name: qs('#payment-name')?.value.trim() || '',
      phone: qs('#payment-phone')?.value.trim() || '',
      address: qs('#payment-address')?.value.trim() || '',
      note: qs('#payment-note')?.value.trim() || '',
      email: currentUser?.email || ''
    };

    if (!customer.name || !customer.phone || !customer.address) {
      showToast('Preencha nome, telefone e endereço.');
      return null;
    }

    return customer;
  }

  function finalizeOrder() {
    if (!cart.length) {
      showToast('Seu carrinho está vazio.');
      return;
    }

    const customer = collectCheckoutCustomer();
    if (!customer) return;

    const order = {
      id: createOrderId(),
      createdAt: new Date().toISOString(),
      customer,
      items: cart.map(item => ({ ...item })),
      subtotal: cartSubtotal(),
      delivery: deliveryFee(),
      total: orderTotal(),
      gift: hasGasGift(),
      payment: activePayment === 'whatsapp'
        ? 'Combinar pelo WhatsApp'
        : (qs('input[name="delivery-payment"]:checked')?.value || 'Pagar na entrega'),
      status: 'Pedido enviado'
    };

    saveOrder(order);
    openWhatsAppOrder(order);
    cart = [];
    saveCart();
    renderCart();

    const summary = qs('#payment-summary');
    qs('#payment-form')?.classList.add('hidden');
    qs('#checkout-account-card')?.classList.add('hidden');
    if (summary) {
      summary.innerHTML = `
        <div class="checkout-success">
          <span class="eyebrow">Pedido enviado</span>
          <h3>${escapeHTML(order.id)}</h3>
          <p>Seu pedido foi montado e enviado para atendimento no WhatsApp. Você também pode reenviar a mensagem se o navegador bloquear a abertura automática.</p>
          <a class="btn btn-primary" href="https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}" target="_blank" rel="noreferrer">
            <i class="fa-brands fa-whatsapp"></i>
            Reenviar WhatsApp
          </a>
          <a class="btn btn-secondary" href="${productHref()}">Comprar mais</a>
        </div>
      `;
    }

    renderOrdersEverywhere();
    showToast('Pedido finalizado.');
  }

  function createOrderId() {
    const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MS-${date}-${random}`;
  }

  function saveOrder(order) {
    const orders = loadJSON(STORAGE.orders, []);
    orders.unshift(order);
    saveJSON(STORAGE.orders, orders.slice(0, 100));
  }

  function buildOrderMessage(order) {
    const lines = [
      '*Novo pedido Monte Sinai*',
      `Pedido: ${order.id}`,
      `Cliente: ${order.customer.name}`,
      `Telefone: ${order.customer.phone}`,
      `Endereço: ${order.customer.address}`,
      `Pagamento: ${order.payment}`,
      '',
      '*Itens:*'
    ];

    order.items.forEach(item => {
      lines.push(`- ${item.quantity} x ${item.name} = ${formatMoney(item.price * item.quantity)}`);
    });

    lines.push('');
    lines.push(`Subtotal: ${formatMoney(order.subtotal)}`);
    lines.push(`Entrega: ${order.delivery ? formatMoney(order.delivery) : 'Grátis'}`);
    if (order.gift) lines.push('Brinde: compra de gás');
    lines.push(`*Total: ${formatMoney(order.total)}*`);
    if (order.customer.note) lines.push(`Observações: ${order.customer.note}`);
    return lines.join('\n');
  }

  function openWhatsAppOrder(order) {
    window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(buildOrderMessage(order))}`, '_blank');
  }

  function profileActionText(signed, action) {
    if (!signed) {
      return {
        personal: 'Entre ou cadastre-se para salvar nome, WhatsApp, endereço e foto.',
        orders: 'Abra o catálogo, escolha os produtos e finalize quando estiver pronto.',
        privacy: 'Ajuste tema, notificações, cache, carrinho e histórico local.',
        support: 'Fale conosco pelo WhatsApp para dúvidas, pedidos e ajuda no cadastro.'
      }[action] || '';
    }

    const missing = [
      !currentUser.name ? 'nome' : '',
      !currentUser.phone ? 'WhatsApp' : '',
      !currentUser.address ? 'endereço' : ''
    ].filter(Boolean);

    if (action === 'personal') {
      return missing.length
        ? `Conta conectada. Falta completar: ${missing.join(', ')}.`
        : `${firstName()}, seus dados estão prontos para pedidos rápidos.`;
    }

    if (action === 'orders') {
      const count = cartCount();
      return count
        ? `Você tem ${count} item${count === 1 ? '' : 's'} no carrinho para finalizar.`
        : 'Use seus dados salvos para comprar sem repetir informações.';
    }

    if (action === 'privacy') {
      return 'Seus dados ficam neste navegador. Você pode limpar cache, carrinho e histórico quando quiser.';
    }

    if (action === 'support') {
      return `Chame a Monte Sinai pelo WhatsApp${currentUser.name ? ` como ${firstName()}` : ''}.`;
    }

    return '';
  }

  function setProfileActionCard(action, config) {
    const card = qs(`[data-profile-action-card="${action}"]`);
    if (!card) return;

    const text = qs('[data-profile-action-text]', card);
    const cta = qs('.profile-action-card-cta', card);
    if (text) text.textContent = config.text || '';
    if (cta) {
      cta.innerHTML = `${escapeHTML(config.cta || 'Abrir')} <i class="fa-solid fa-arrow-right"></i>`;
    }

    if (card instanceof HTMLAnchorElement) {
      card.href = config.href;
      if (config.external) {
        card.target = '_blank';
        card.rel = 'noreferrer';
      } else {
        card.removeAttribute('target');
        card.removeAttribute('rel');
      }
    }

    card.setAttribute('aria-label', config.label || config.cta || 'Abrir ação do perfil');
  }

  function updateProfileActionCards(signed) {
    const cartHasItems = cartCount() > 0;
    const supportText = signed
      ? `Olá, sou ${currentUser.name || currentUser.email}. Preciso de ajuda no site Monte Sinai.`
      : 'Olá, preciso de ajuda no site Monte Sinai.';

    setProfileActionCard('personal', {
      href: signed ? 'editar-perfil.html' : loginHref({ mode: 'register', redirect: 'perfil.html' }),
      text: profileActionText(signed, 'personal'),
      cta: signed ? (profileComplete() ? 'Atualizar dados' : 'Completar perfil') : 'Entrar ou cadastrar',
      label: signed ? 'Editar dados pessoais' : 'Entrar ou cadastrar para salvar dados'
    });

    setProfileActionCard('orders', {
      href: cartHasItems ? checkoutHref() : productHref(),
      text: profileActionText(signed, 'orders'),
      cta: cartHasItems ? 'Finalizar carrinho' : 'Abrir catálogo',
      label: cartHasItems ? 'Finalizar pedido no carrinho' : 'Abrir catálogo de produtos'
    });

    setProfileActionCard('privacy', {
      href: 'configuracoes.html#controle-dados',
      text: profileActionText(signed, 'privacy'),
      cta: 'Abrir privacidade',
      label: 'Abrir configurações de privacidade e dados'
    });

    setProfileActionCard('support', {
      href: `https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(supportText)}`,
      text: profileActionText(signed, 'support'),
      cta: 'Chamar no WhatsApp',
      label: 'Abrir suporte direto no WhatsApp',
      external: true
    });
  }

  function initProfilePage() {
    if (!qs('#profile-page') || currentPage() !== 'perfil.html') return;
    const summary = qs('.profile-summary');
    const details = qs('#profile-details');
    const empty = qs('#profile-empty');
    const guestActions = qs('#profile-guest-actions');
    const authActions = qs('#profile-actions');
    const authOnly = qsa('[data-auth-only]');
    const loginUrl = loginHref({ redirect: 'perfil.html' });
    const registerUrl = loginHref({ mode: 'register', redirect: 'perfil.html' });
    const signed = Boolean(currentUser?.email);

    document.body.classList.toggle('profile-guest-mode', !signed);
    empty?.classList.add('hidden');
    summary?.classList.remove('hidden');
    details?.classList.remove('hidden');
    guestActions?.classList.toggle('hidden', signed);
    authActions?.classList.toggle('hidden', !signed);
    authOnly.forEach(item => item.classList.toggle('hidden', !signed));
    qsa('[data-profile-login]').forEach(link => {
      if (link instanceof HTMLAnchorElement) link.href = loginUrl;
    });
    qsa('[data-profile-register]').forEach(link => {
      if (link instanceof HTMLAnchorElement) link.href = registerUrl;
    });

    const avatar = qs('#profile-avatar');
    if (avatar) {
      avatar.textContent = signed
        ? (currentUser.name || currentUser.email || 'U').trim().charAt(0).toUpperCase()
        : 'V';
      if (signed && currentUser.photo) {
        avatar.innerHTML = `<img src="${escapeHTML(currentUser.photo)}" alt="">`;
      }
    }

    if (!currentUser) currentUser = {};

    setText('#profile-name', signed ? (currentUser.name || 'Cliente Monte Sinai') : 'Cliente visitante');
    setText('#profile-nick', signed && currentUser.nick ? `@${currentUser.nick}` : '');
    setText('#profile-provider', signed ? (currentUser.provider || 'Cadastro local') : 'Entre ou cadastre-se para salvar seus dados');
    setText('#profile-email', signed ? (currentUser.email || 'Não informado') : 'Disponível após entrar ou cadastrar');
    setText('#profile-phone', signed ? (currentUser.phone || 'Complete seu WhatsApp') : 'Salve seu WhatsApp em uma conta');
    setText('#profile-address', signed ? (currentUser.address || 'Complete seu endereço') : 'Salve seu endereço para pedidos rápidos');
    setText('#profile-details-eyebrow', signed ? 'Detalhes do perfil' : 'Área do cliente');
    setText('.profile-details .section-head h2', signed ? 'Informações do cliente' : 'Acesso e configurações');
    setText('.profile-details .section-head p', signed
      ? 'Todos os dados são usados apenas para simplificar o pedido e a entrega.'
      : 'Você pode ajustar as configurações do site agora. Para editar perfil e salvar dados, entre ou cadastre-se.');
    updateProfileActionCards(signed);

    qsa('[data-profile-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.profileTab || 'details';
        qsa('[data-profile-tab]').forEach(item => item.classList.toggle('active', item === tab));
        qsa('[data-profile-panel]').forEach(panel => {
          panel.classList.toggle('hidden', panel.dataset.profilePanel !== target);
        });
      });
    });

    qs('[data-switch-account]')?.addEventListener('click', () => {
      window.location.href = loginHref({ redirect: 'perfil.html' });
    });

    qs('[data-logout-account]')?.addEventListener('click', () => {
      saveUser(null);
      showToast('Você saiu da conta.');
      setTimeout(() => window.location.href = profileHref(), 500);
    });

    renderOrdersEverywhere();
  }

  function initProfileEditPage() {
    const form = qs('#profile-edit-form');
    if (!form) return;

    currentUser = loadJSON(STORAGE.user, null);
    if (!currentUser?.email) {
      showToast('Entre ou cadastre-se para editar o perfil.');
      setTimeout(() => {
        window.location.href = loginHref({ mode: 'register', redirect: 'editar-perfil.html' });
      }, 500);
      return;
    }

    qs('#edit-name').value = currentUser.name || '';
    qs('#edit-nick').value = currentUser.nick || '';
    qs('#edit-phone').value = currentUser.phone || '';
    qs('#edit-address').value = currentUser.address || '';

    const preview = qs('#edit-photo-preview');
    if (preview && currentUser.photo) {
      preview.src = currentUser.photo;
      preview.classList.remove('hidden');
    }

    qs('#edit-photo')?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (!file) return;
      resizeProfilePhoto(file).then(photo => {
        if (preview) {
          preview.src = photo;
          preview.classList.remove('hidden');
        }
      }).catch(() => showToast('Não consegui carregar esta foto. Tente outra imagem.'));
    });

    qs('[data-cancel-edit]')?.addEventListener('click', () => {
      window.location.href = profileHref();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const updated = {
        ...currentUser,
        name: qs('#edit-name')?.value.trim() || '',
        nick: qs('#edit-nick')?.value.trim() || '',
        phone: qs('#edit-phone')?.value.trim() || '',
        address: qs('#edit-address')?.value.trim() || '',
        photo: preview?.src?.startsWith('data:') ? preview.src : currentUser.photo,
        provider: currentUser.provider || 'Cadastro local',
        updatedAt: new Date().toISOString()
      };

      if (!updated.name || !updated.phone || !updated.address) {
        showToast('Preencha nome, WhatsApp e endereço.');
        return;
      }

      const accounts = loadJSON(STORAGE.accounts, {});
      accounts[updated.email] = { ...(accounts[updated.email] || {}), ...updated };
      const accountSaved = saveJSON(STORAGE.accounts, accounts);
      const profileSaved = saveUser(updated);
      if (!accountSaved || !profileSaved) return;
      showToast('Perfil atualizado e salvo.');
      setTimeout(() => window.location.href = profileHref(), 500);
    });
  }

  function resizeProfilePhoto(file) {
    return new Promise((resolve, reject) => {
      if (!file.type?.startsWith('image/')) {
        reject(new Error('Arquivo invalido'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const max = 420;
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    });
  }

  function setText(selector, value) {
    const el = qs(selector);
    if (el) el.textContent = value;
  }

  function initSettingsPage() {
    qs('#dark-mode-toggle')?.addEventListener('click', () => {
      setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light');
    });
    updateThemeControls();

    qsa('[data-setting-toggle]').forEach(toggle => {
      const key = `ms_setting_${toggle.dataset.settingToggle}`;
      const stored = localStorage.getItem(key);
      if (stored !== null) toggle.classList.toggle('active', stored === 'true');
      toggle.setAttribute('aria-pressed', String(toggle.classList.contains('active')));
      toggle.addEventListener('click', () => {
        const active = !toggle.classList.contains('active');
        toggle.classList.toggle('active', active);
        toggle.setAttribute('aria-pressed', String(active));
        localStorage.setItem(key, String(active));
      });
    });

    qs('[data-reset-feedback]')?.addEventListener('click', () => {
      qs('#feedback-form')?.reset();
      qs('#feedback-success')?.classList.remove('show');
    });

    qs('#feedback-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const text = [
        `Olá! Sou ${data.get('name') || 'cliente'}.`,
        `Contato: ${data.get('contact') || ''}`,
        `Categoria: ${data.get('category') || ''}`,
        '',
        `Sugestão: ${data.get('message') || ''}`
      ].join('\n');

      qs('#feedback-success')?.classList.add('show');
      window.open(`https://wa.me/${ownerWhatsApp()}?text=${encodeURIComponent(text)}`, '_blank');
      setTimeout(() => qs('#feedback-success')?.classList.remove('show'), 1800);
    });

    renderOrdersEverywhere();
  }

  function initOwnerDashboard() {
    const form = qs('#owner-config-form');
    const ordersList = qs('#orders-list');
    if (!form && !ordersList) return;

    const fields = {
      whatsapp: qs('#owner-whatsapp'),
      pixKey: qs('#owner-pix-key'),
      merchantName: qs('#owner-merchant-name'),
      merchantCity: qs('#owner-merchant-city')
    };

    if (fields.whatsapp) fields.whatsapp.value = ownerConfig.whatsapp || '';
    if (fields.pixKey) fields.pixKey.value = ownerConfig.pixKey || '';
    if (fields.merchantName) fields.merchantName.value = ownerConfig.merchantName || DEFAULT_OWNER.merchantName;
    if (fields.merchantCity) fields.merchantCity.value = ownerConfig.merchantCity || DEFAULT_OWNER.merchantCity;

    form?.addEventListener('submit', event => {
      event.preventDefault();
      ownerConfig = {
        whatsapp: fields.whatsapp?.value.trim() || DEFAULT_OWNER.whatsapp,
        pixKey: fields.pixKey?.value.trim() || '',
        merchantName: fields.merchantName?.value.trim() || DEFAULT_OWNER.merchantName,
        merchantCity: fields.merchantCity?.value.trim() || DEFAULT_OWNER.merchantCity,
        savedAt: new Date().toISOString()
      };
      saveJSON(STORAGE.owner, ownerConfig);
      showToast('Configuração salva.');
    });

    qs('#request-notification')?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        showToast('Este navegador não suporta notificações.');
        return;
      }
      const permission = await Notification.requestPermission();
      showToast(permission === 'granted' ? 'Notificações ativadas.' : 'Notificações não autorizadas.');
    });

    qs('#export-orders')?.addEventListener('click', () => {
      const orders = loadJSON(STORAGE.orders, []);
      const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pedidos-monte-sinai-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });

    qs('#clear-orders')?.addEventListener('click', () => {
      if (!confirm('Deseja limpar os pedidos salvos neste navegador?')) return;
      saveJSON(STORAGE.orders, []);
      renderOrdersEverywhere();
      showToast('Pedidos removidos.');
    });

    document.body.addEventListener('click', event => {
      const button = event.target.closest('[data-order-whatsapp]');
      if (!button) return;
      const order = loadJSON(STORAGE.orders, []).find(item => item.id === button.dataset.orderWhatsapp);
      if (order) openWhatsAppOrder(order);
    });

    renderOrdersEverywhere();
  }

  function renderOrdersEverywhere() {
    const orders = loadJSON(STORAGE.orders, []);
    const customerOrders = currentUser?.email
      ? orders.filter(order => order.customer?.email === currentUser.email || order.customer?.phone === currentUser.phone)
      : [];

    setText('#dash-orders-count', String(orders.length));
    setText('#dash-orders-total', formatMoney(orders.reduce((sum, order) => sum + Number(order.total || 0), 0)));
    setText('#dash-last-order', orders[0]?.id || 'Nenhum');
    qsa('[data-profile-order-count]').forEach(el => {
      el.textContent = String(customerOrders.length);
    });

    qsa('[data-orders-container], #orders-list').forEach(container => {
      renderOrders(container, orders);
    });
  }

  function renderOrders(container, orders) {
    if (!container) return;
    const isProfileHistory = container.id === 'profile-orders';
    container.innerHTML = '';

    if (isProfileHistory) {
      container.insertAdjacentHTML('beforeend', `
        <div class="section-head">
          <span class="eyebrow">Histórico de pedidos</span>
          <h3>Pedidos salvos neste navegador</h3>
          <p>Acompanhe os pedidos já enviados e limpe o histórico quando quiser.</p>
        </div>
        <div class="settings-actions profile-history-actions">
          <button class="btn btn-secondary" type="button" data-clear-order-history>
            <i class="fa-solid fa-clock-rotate-left"></i>
            Limpar histórico
          </button>
          <button class="btn btn-secondary" type="button" data-clear-cache-orders>
            <i class="fa-solid fa-broom"></i>
            Limpar cache e histórico
          </button>
        </div>
      `);
    }

    let visibleOrders = orders;
    if (isProfileHistory) {
      if (!currentUser?.email) {
        container.insertAdjacentHTML('beforeend', `
          <div class="profile-guest-note">
            <strong>Pedidos salvos aparecem depois do cadastro.</strong>
            <p>Entre ou cadastre-se para vincular seus pedidos ao perfil deste aparelho.</p>
            <div class="settings-actions">
              <a class="btn btn-primary" href="${loginHref({ mode: 'register', redirect: 'perfil.html' })}">Cadastrar</a>
              <a class="btn btn-secondary" href="${loginHref({ redirect: 'perfil.html' })}">Entrar</a>
            </div>
          </div>
        `);
        return;
      }
      visibleOrders = orders.filter(order => order.customer?.email === currentUser.email || order.customer?.phone === currentUser.phone);
    }

    if (!visibleOrders.length) {
      container.insertAdjacentHTML('beforeend', '<p class="empty-cart">Nenhum pedido registrado neste navegador ainda.</p>');
      return;
    }

    visibleOrders.forEach(order => {
      const card = document.createElement('article');
      card.className = 'order-card';
      const items = (order.items || []).map(item => `<li>${escapeHTML(item.quantity)} x ${escapeHTML(item.name)}</li>`).join('');
      card.innerHTML = `
        <header>
          <strong>${escapeHTML(order.id)}</strong>
          <span class="badge">${escapeHTML(order.status || 'Pedido enviado')}</span>
        </header>
        <p>${escapeHTML(order.customer?.name || '')} - ${escapeHTML(order.customer?.phone || '')}</p>
        <p>${escapeHTML(order.customer?.address || '')}</p>
        <ul>${items}</ul>
        <footer>
          <strong>${formatMoney(order.total || 0)}</strong>
          <button class="btn btn-secondary" type="button" data-order-whatsapp="${escapeHTML(order.id)}">
            <i class="fa-brands fa-whatsapp"></i>
            Abrir WhatsApp
          </button>
        </footer>
      `;
      container.appendChild(card);
    });
  }

  function bindSubtleAnimations() {
    const elements = qsa('.section-head, .category-card, .product-card, .info-card, .about-card, .contact-box, .settings-section, .profile-card');
    elements.forEach(el => el.classList.add('reveal-on-scroll'));

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });

    elements.forEach(el => observer.observe(el));
  }
});
