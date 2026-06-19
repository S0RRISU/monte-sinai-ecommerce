import { officialStoreUrl } from './constants';

const absoluteAssetPattern = /^(https?:|data:|blob:)/i;

function storeBaseUrl() {
  return officialStoreUrl.replace(/\/+$/, '');
}

export function resolveAdminImageUrl(image: string | null | undefined) {
  const cleanImage = String(image || '').trim();

  if (!cleanImage) return '';
  if (absoluteAssetPattern.test(cleanImage)) return cleanImage;

  const normalized = cleanImage.replace(/^\/+/, '');
  const productFilename = normalized.split('/').pop() || normalized;

  if (
    normalized.startsWith('assets/produtos/v2/')
    || normalized.startsWith('assets/produtos/site/v2/')
    || normalized.startsWith('produtos/v2/')
    || normalized.startsWith('products/')
    || /^[a-z0-9-]+\.png$/i.test(normalized)
  ) {
    return `${storeBaseUrl()}/products/${productFilename}`;
  }

  return cleanImage.startsWith('/') ? cleanImage : `/${cleanImage}`;
}
