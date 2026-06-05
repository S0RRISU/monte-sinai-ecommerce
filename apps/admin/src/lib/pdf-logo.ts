const pdfLogoPath = '/brand/monte-sinai-logo-transparente.png';

let cachedPdfLogo: Promise<string | null> | null = null;

export function getPdfLogoDataUrl() {
  if (cachedPdfLogo) return cachedPdfLogo;

  cachedPdfLogo = loadPdfLogoDataUrl();
  return cachedPdfLogo;
}

async function loadPdfLogoDataUrl() {
  if (typeof window === 'undefined') return null;

  try {
    const response = await fetch(pdfLogoPath, { cache: 'force-cache' });
    if (!response.ok) return null;

    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
