import {
  categories,
  featuredProducts as localFeaturedProducts,
  getProduct as getLocalProduct,
  offerProducts as localOfferProducts,
  products,
  productsByCategory as localProductsByCategory,
  type Product,
  type ProductCategory,
  type ProductVariation
} from './store-data';
import { defaultSiteConfig, mapSiteConfig, type StorefrontSiteConfig } from './site-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnglqufeyergsgzafdek.supabase.co';
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9';

type CatalogProductRow = {
  id: string;
  nome: string;
  preco: number | string | null;
  preco_original?: number | string | null;
  imagem?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  descricao_detalhada?: string | null;
  destaque?: boolean | null;
  oferta_ativa?: boolean | null;
  preco_promocional?: number | string | null;
  catalogo_destaque?: boolean | null;
  catalogo_ordem?: number | null;
  pode_comprar?: boolean | null;
  indisponivel?: boolean | null;
};

type CatalogVariationRow = {
  id: string;
  produto_id: string;
  nome: string;
  preco: number | string | null;
  preco_original?: number | string | null;
  sku?: string | null;
  imagem?: string | null;
  ordem?: number | null;
  oferta_ativa?: boolean | null;
  pode_comprar?: boolean | null;
  indisponivel?: boolean | null;
};

type ProductImageRow = {
  produto_id: string;
  url: string;
  ordem?: number | null;
};

type SiteConfigRow = {
  config?: unknown;
};

const categoryAliases: Record<string, ProductCategory> = {
  agua: 'agua',
  'agua mineral': 'agua',
  gas: 'gas',
  botijao: 'gas',
  limpeza: 'limpeza',
  lavanderia: 'limpeza',
  cozinha: 'limpeza',
  banheiro: 'limpeza',
  higiene: 'limpeza',
  'limpeza pesada': 'limpeza',
  utensilios: 'utensilios',
  ofertas: 'ofertas'
};

function asNumber(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactSearchText(value: string) {
  return normalizeText(value).replace(/\s+/g, '');
}

function levenshteinDistance(first: string, second: string) {
  if (first === second) return 0;
  if (!first.length) return second.length;
  if (!second.length) return first.length;

  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = Array.from({ length: second.length + 1 }, () => 0);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    current[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const cost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        current[secondIndex - 1] + 1,
        previous[secondIndex] + 1,
        previous[secondIndex - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[second.length];
}

function fuzzyTokenMatch(token: string, searchableTokens: string[]) {
  if (token.length <= 2) {
    return searchableTokens.some((candidate) => candidate.startsWith(token));
  }

  return searchableTokens.some((candidate) => {
    if (candidate.includes(token) || token.includes(candidate)) return true;
    const limit = token.length <= 5 ? 1 : 2;
    return levenshteinDistance(token, candidate) <= limit;
  });
}

function slugify(value: string) {
  return (
    normalizeText(value)
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '') || 'produto'
  );
}

function normalizeImage(value?: string | null, category?: ProductCategory) {
  const cleanValue = (value || '').trim();
  if (cleanValue.startsWith('http') || cleanValue.startsWith('/')) return cleanValue;
  if (cleanValue.startsWith('assets/produtos/site/v2/') || cleanValue.startsWith('assets/produtos/v2/')) {
    return `/products/${cleanValue.split('/').pop()}`;
  }
  if (cleanValue.startsWith('assets/')) return `/${cleanValue}`;
  const fallback = categories.find((item) => item.id === category)?.image;
  return fallback || '/products/desinfetante-2l.png';
}

const officialImageAliases: Record<string, string> = {
  'alcool-perfumado-1l': '/products/alcool-perfumado.png',
  'gas-de-cozinha-p13': '/products/gas-p13.png',
  'gas-p13-supergas': '/products/gas-p13.png',
  'gas-p13-ultragas': '/products/gas-p13.png',
  'limpa-aluminio-500ml': '/products/limpa-aluminio.png',
  'escova-de-vaso-com-pote': '/products/escova-vaso.png',
  'pedra-de-vaso-sanitario': '/products/pedra-vaso.png',
  'pasta-de-brilho': '/products/pasta-brilho.png',
  'prendedor-de-madeira': '/products/prendedor-madeira.png',
  'prendedor-plastico': '/products/prendedor-plastico.png',
  'prendedor-de-plastico': '/products/prendedor-plastico.png',
  'rodo-grande': '/products/rodo-grande.png',
  'rodo-pequeno': '/products/rodo-pequeno.png',
  'rodinho-de-pia': '/products/rodinho-pia.png',
  'saco-de-lixo': '/products/saco-lixo.png'
};

const officialImagesBySlug = new Map(products.map((product) => [product.slug, product.image]));
const ignoredImageSlugTokens = new Set(['de', 'da', 'do', 'das', 'dos', 'com', 'e', 'uso', 'tradicional', 'diario', 'pesado']);

function comparableImageSlug(value: string) {
  return slugify(value)
    .split('-')
    .filter((token) => token && !ignoredImageSlugTokens.has(token))
    .sort()
    .join('-');
}

const officialImagesByComparableSlug = new Map(products.map((product) => [comparableImageSlug(product.slug), product.image]));

function officialImageForProduct(name: string) {
  const slug = slugify(name);
  const exact = officialImagesBySlug.get(slug) || officialImageAliases[slug];
  if (exact) return exact;

  const comparable = officialImagesByComparableSlug.get(comparableImageSlug(name));
  if (comparable) return comparable;

  const partial = products.find((product) => slug.startsWith(`${product.slug}-`) || product.slug.startsWith(`${slug}-`));
  return partial?.image;
}

function normalizeCategory(value?: string | null): { id: ProductCategory; label: string } {
  const clean = (value || '').trim();
  const key = normalizeText(clean);
  const id = categoryAliases[key] || 'limpeza';
  return {
    id,
    label: clean || categories.find((category) => category.id === id)?.label || 'Produtos'
  };
}

function uniqueSlug(base: string, used: Map<string, number>) {
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function variationScore(variation: CatalogVariationRow) {
  const sku = variation.sku || '';
  return Number(sku.includes('-')) * 2 + Number(variation.ordem !== null && variation.ordem !== undefined);
}

function uniqueCatalogVariations(variations: CatalogVariationRow[]) {
  const byName = new Map<string, CatalogVariationRow>();

  variations.forEach((variation) => {
    const key = normalizeText(variation.nome || variation.sku || variation.id);
    const current = byName.get(key);
    if (!current || variationScore(variation) > variationScore(current)) {
      byName.set(key, variation);
    }
  });

  return Array.from(byName.values()).sort((first, second) => {
    const firstOrder = first.ordem ?? 9999;
    const secondOrder = second.ordem ?? 9999;
    if (firstOrder !== secondOrder) return firstOrder - secondOrder;
    return (first.nome || '').localeCompare(second.nome || '', 'pt-BR');
  });
}

async function fetchCatalogRows<T>(path: string): Promise<T[]> {
  if (!supabaseUrl || !supabasePublishableKey) return [];

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: supabasePublishableKey,
        Authorization: `Bearer ${supabasePublishableKey}`
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) return [];
    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

export async function getStorefrontConfig() {
  const rows = await fetchCatalogRows<SiteConfigRow>('site_configuracoes?select=config&id=eq.site&limit=1');
  return rows.length ? mapSiteConfig(rows[0]?.config) : defaultSiteConfig;
}

function sortCatalogProducts(catalogProducts: Product[], config: StorefrontSiteConfig) {
  const sorted = [...catalogProducts];
  if (config.productSort === 'name') {
    sorted.sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'));
  }
  if (config.productSort === 'offers') {
    sorted.sort((first, second) => Number(Boolean(second.offer || second.oldPrice)) - Number(Boolean(first.offer || first.oldPrice)));
  }
  if (config.featuredProductSlug) {
    sorted.sort((first, second) => Number(second.slug === config.featuredProductSlug) - Number(first.slug === config.featuredProductSlug));
  }
  return sorted;
}

async function fetchCatalogProducts(config: StorefrontSiteConfig = defaultSiteConfig) {
  const [catalogProducts, catalogVariations, catalogImages] = await Promise.all([
    fetchCatalogRows<CatalogProductRow>('vw_catalogo_publico?select=*&order=catalogo_ordem.asc.nullslast,nome.asc&limit=500'),
    fetchCatalogRows<CatalogVariationRow>('vw_catalogo_variacoes_publicas?select=*&order=ordem.asc,nome.asc&limit=1000'),
    fetchCatalogRows<ProductImageRow>('produto_imagens?select=produto_id,url,ordem&order=ordem.asc,created_at.asc&limit=1500')
  ]);

  const visibleCategories = new Set(config.visibleCategories);
  if (!catalogProducts.length) {
    return sortCatalogProducts(
      products.filter((product) => visibleCategories.has(product.category) && (config.showUnavailableProducts || product.unavailable !== true)),
      config
    );
  }

  const variationsByProduct = new Map<string, CatalogVariationRow[]>();
  catalogVariations.forEach((variation) => {
    variationsByProduct.set(variation.produto_id, [...(variationsByProduct.get(variation.produto_id) || []), variation]);
  });

  const imagesByProduct = new Map<string, string[]>();
  catalogImages.forEach((image) => {
    const cleanUrl = image.url?.trim();
    if (!image.produto_id || !cleanUrl) return;
    const url = normalizeImage(cleanUrl);
    imagesByProduct.set(image.produto_id, [...(imagesByProduct.get(image.produto_id) || []), url]);
  });

  const usedSlugs = new Map<string, number>();
  const mappedProducts = catalogProducts.map((row) => {
    const category = normalizeCategory(row.categoria);
    const price = asNumber(row.preco);
    const originalPrice = asNumber(row.preco_original || row.preco);
    const hasDiscount = originalPrice > price;
    const dbVariations = uniqueCatalogVariations(variationsByProduct.get(row.id) || []);
    const officialImage = officialImageForProduct(row.nome);
    const mainImage = officialImage || normalizeImage(row.imagem, category.id);
    const galleryImages = officialImage ? [officialImage] : Array.from(new Set([mainImage, ...(imagesByProduct.get(row.id) || [])]));
    const variations: ProductVariation[] = dbVariations.map((variation) => ({
      id: variation.id,
      label: variation.nome || 'Opcao',
      helper: variation.sku ? `SKU ${variation.sku}` : variation.pode_comprar === false ? 'Sem estoque agora' : 'Disponivel',
      price: asNumber(variation.preco, price),
      badge: variation.oferta_ativa ? 'Oferta' : undefined,
      canBuy: variation.pode_comprar !== false,
      unavailable: variation.indisponivel === true
    }));

    const slug = uniqueSlug(slugify(row.nome), usedSlugs);
    return {
      slug,
      name: row.nome || 'Produto',
      shortName: row.nome || 'Produto',
      category: category.id,
      categoryLabel: category.label,
      description: row.descricao_detalhada || row.descricao || 'Produto Monte Sinai.',
      image: mainImage,
      images: galleryImages,
      price,
      oldPrice: hasDiscount ? originalPrice : undefined,
      unit: variations.length ? 'Escolha a opcao' : 'Unidade',
      badge: row.oferta_ativa ? 'Oferta' : undefined,
      popular: Boolean(row.destaque || row.catalogo_destaque),
      offer: Boolean(row.oferta_ativa || hasDiscount),
      rating: 4.8,
      variations,
      canBuy: row.pode_comprar !== false,
      unavailable: row.indisponivel === true,
      benefits: ['Entrega rapida', 'Produto selecionado', 'Atendimento local'],
      useCases: ['Casa', 'Comercio']
    } satisfies Product;
  });

  return sortCatalogProducts(
    mappedProducts.filter((product) => visibleCategories.has(product.category) && (config.showUnavailableProducts || product.unavailable !== true)),
    config
  );
}

export async function getStorefrontProducts() {
  const config = await getStorefrontConfig();
  return fetchCatalogProducts(config);
}

export async function getStorefrontProduct(slug: string) {
  const config = await getStorefrontConfig();
  const catalogProducts = await fetchCatalogProducts(config);
  return catalogProducts.find((product) => product.slug === slug) || getLocalProduct(slug);
}

export async function storefrontProductsByCategory(category?: string) {
  const config = await getStorefrontConfig();
  const catalogProducts = await fetchCatalogProducts(config);
  if (!catalogProducts.length) return localProductsByCategory(category);
  if (!category || category === 'todos') return catalogProducts;
  if (category === 'ofertas') return catalogProducts.filter((product) => product.offer || product.oldPrice);
  return catalogProducts.filter((product) => product.category === category);
}

export function searchStorefrontProducts(catalogProducts: Product[], query?: string) {
  const term = normalizeText(query || '');
  if (!term) return catalogProducts;

  const queryTokens = term.split(' ').filter(Boolean);
  const compactTerm = compactSearchText(query || '');

  return catalogProducts
    .map((product) => {
      const haystack = normalizeText(
        [
          product.name,
          product.shortName,
          product.categoryLabel,
          product.description,
          product.unit,
          ...(product.variations || []).map((variation) => `${variation.label} ${variation.helper}`)
        ].join(' ')
      );
      const compactHaystack = haystack.replace(/\s+/g, '');
      const searchableTokens = haystack.split(' ').filter(Boolean);
      const exact = haystack.includes(term) || compactHaystack.includes(compactTerm);
      const tokenMatches = queryTokens.filter((token) => fuzzyTokenMatch(token, searchableTokens)).length;
      const score = exact ? 100 + tokenMatches : tokenMatches;
      return { product, score };
    })
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.product.name.localeCompare(second.product.name, 'pt-BR'))
    .map(({ product }) => product);
}

export async function storefrontFeaturedProducts() {
  const config = await getStorefrontConfig();
  const catalogProducts = await fetchCatalogProducts(config);
  if (!catalogProducts.length) return localFeaturedProducts();
  if (config.featuredProductSlug) {
    const configured = catalogProducts.find((product) => product.slug === config.featuredProductSlug);
    const rest = catalogProducts.filter((product) => product.slug !== config.featuredProductSlug);
    if (configured) return [configured, ...rest].slice(0, 12);
  }
  const featured = catalogProducts.filter((product) => product.popular).slice(0, 12);
  return featured.length ? featured : catalogProducts.slice(0, 12);
}

export async function storefrontOfferProducts() {
  const config = await getStorefrontConfig();
  const catalogProducts = await fetchCatalogProducts(config);
  if (!catalogProducts.length) return localOfferProducts();
  return catalogProducts.filter((product) => product.offer || product.oldPrice).slice(0, 8);
}
