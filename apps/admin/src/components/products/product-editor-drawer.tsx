'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Boxes, CheckCircle2, ImagePlus, Save, Trash2, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { registerStockMovements, saveProduct, uploadProductImage } from '@/lib/admin-services';
import { resolveAdminImageUrl } from '@/lib/assets';
import { money } from '@/lib/format';
import type { Product, StockMovementInput } from '@/lib/types';
import { useAdminStore } from '@/store/admin-store';

const nullableNumber = z.preprocess((value) => (value === '' || value === null || value === undefined ? null : value), z.coerce.number().min(0).nullable());

const productSchema = z.object({
  name: z.string().min(2, 'Informe o nome.'),
  category: z.string().min(2, 'Informe a categoria.'),
  description: z.string().optional(),
  image: z.string().optional(),
  price: z.coerce.number().min(0),
  promoPrice: nullableNumber.optional(),
  stock: nullableNumber.optional(),
  minStock: z.coerce.number().min(0),
  active: z.boolean(),
  storeVisible: z.boolean(),
  catalogVisible: z.boolean(),
  featured: z.boolean(),
  offerActive: z.boolean()
});

type ProductFormInput = z.input<typeof productSchema>;
type ProductFormData = z.output<typeof productSchema>;
type VariationDraft = {
  id?: string;
  productId?: string;
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

export function ProductEditorDrawer({
  product,
  open,
  mode = 'edit',
  onEdit,
  onClose,
  onSaved
}: {
  product: Product | null;
  open: boolean;
  mode?: 'edit' | 'view';
  onEdit?: () => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [variations, setVariations] = useState<VariationDraft[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const addNotification = useAdminStore((state) => state.addNotification);
  const form = useForm<ProductFormInput, unknown, ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues(product)
  });
  const watched = form.watch();

  useEffect(() => {
    form.reset(defaultValues(product));
    setProductImages(product?.images || []);
    setVariations(
      (product?.variations || []).map((variation, index) => ({
        id: variation.id,
        productId: variation.productId,
        name: variation.name,
        sku: numericSku(variation.sku || `${product?.id || ''}-${variation.name}-${index + 1}`),
        price: variation.price,
        promoPrice: variation.promoPrice,
        stock: variation.stock,
        minStock: variation.minStock,
        image: variation.image,
        offerActive: variation.offerActive,
        active: variation.active
      }))
    );
  }, [form, product]);

  const previewPrice = useMemo(() => {
    const promo = Number(watched.promoPrice || 0);
    return promo > 0 ? promo : Number(watched.price || 0);
  }, [watched.price, watched.promoPrice]);
  const discount = useMemo(() => {
    const price = Number(watched.price || 0);
    const promo = Number(watched.promoPrice || 0);
    if (!price || !promo || promo >= price) return 0;
    return Math.round(((price - promo) / price) * 100);
  }, [watched.price, watched.promoPrice]);
  const lowStock = Number(watched.stock || 0) <= Number(watched.minStock || 0);

  if (!open) return null;
  if (mode === 'view' && product) {
    return <ProductView product={product} onEdit={onEdit} onClose={onClose} />;
  }

  async function handleUpload(file?: File | null, variationIndex?: number) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const targetName = typeof variationIndex === 'number' ? variations[variationIndex]?.name || form.getValues('name') : form.getValues('name');
      const url = await uploadProductImage(file, targetName);
      if (typeof variationIndex === 'number') {
        updateVariation(variationIndex, { image: url });
      } else {
        form.setValue('image', url, { shouldDirty: true });
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  }

  function clearProductImage() {
    form.setValue('image', '', { shouldDirty: true, shouldTouch: true });
  }

  async function handleGalleryUpload(files?: FileList | File[] | null) {
    const nextFiles = Array.from(files || []);
    if (!nextFiles.length) return;
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const file of nextFiles) {
        uploaded.push(await uploadProductImage(file, form.getValues('name') || 'produto'));
      }
      setProductImages((current) => Array.from(new Set([...current, ...uploaded])));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  }

  function addProductImageUrl(url: string) {
    const cleanUrl = url.trim();
    if (!cleanUrl) return;
    setProductImages((current) => Array.from(new Set([...current, cleanUrl])));
  }

  function removeProductImage(index: number) {
    setProductImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function setGalleryImageAsMain(image: string) {
    form.setValue('image', image, { shouldDirty: true, shouldTouch: true });
  }

  function clearVariationImage(index: number) {
    updateVariation(index, { image: '' });
  }

  function addVariation() {
    const baseName = form.getValues('name') || 'Variacao';
    setVariations((current) => [
      ...current,
      {
        name: `${baseName} - opcao ${current.length + 1}`,
        sku: numericSku(`${baseName}-${Date.now()}-${current.length + 1}`),
        price: Number(form.getValues('price') || 0),
        promoPrice: Number(form.getValues('promoPrice') || 0) || null,
        stock: null,
        minStock: Number(form.getValues('minStock') || 0),
        image: '',
        offerActive: Boolean(form.getValues('offerActive')),
        active: true
      }
    ]);
  }

  function updateVariation(index: number, updates: Partial<VariationDraft>) {
    setVariations((current) => current.map((variation, itemIndex) => (itemIndex === index ? { ...variation, ...updates } : variation)));
  }

  function removeVariation(index: number) {
    setVariations((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveValues(values: ProductFormData, shouldPublish: boolean) {
    setError('');
    try {
      const productStock = product?.stock ?? null;
      const saved = await saveProduct({
        id: product?.id,
        ...values,
        active: shouldPublish ? true : values.active,
        storeVisible: shouldPublish ? true : values.storeVisible,
        catalogVisible: shouldPublish ? true : values.catalogVisible,
        description: values.description || '',
        image: values.image || '',
        promoPrice: values.promoPrice || null,
        stock: productStock,
        images: productImages,
        variations: variations
          .filter((variation) => variation.name.trim() || variation.sku.trim())
          .map((variation, index) => {
            const currentVariation = product?.variations.find((item) => item.id === variation.id);
            return {
              id: variation.id || '',
              productId: variation.productId || product?.id || '',
              name: variation.name.trim() || values.name,
              sku: numericSku(variation.sku || `${values.name}-${index + 1}`),
              price: Number(variation.price || values.price || 0),
              promoPrice: variation.promoPrice || null,
              stock: variation.id ? (currentVariation?.stock ?? null) : (variation.stock ?? null),
              minStock: variation.minStock ?? 0,
              image: variation.image || '',
              offerActive: variation.offerActive,
              active: variation.active
            };
          })
      });
      const savedId = getSavedProductId(saved) || product?.id || '';
      const stockAdjustments = buildStockAdjustments({
        productId: savedId,
        product,
        desiredProductStock: values.stock ?? null,
        variations
      });
      if (stockAdjustments.length) {
        await registerStockMovements(stockAdjustments);
      }
      addNotification({
        title: product ? 'Produto atualizado' : 'Produto criado',
        detail: stockAdjustments.length ? `${values.name} - estoque registrado no historico.` : values.name,
        tone: shouldPublish ? 'success' : 'info',
        href: savedId ? `/produtos?ver=${encodeURIComponent(savedId)}` : '/produtos'
      });
      await onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao salvar produto.');
    }
  }

  async function handleSubmit(values: ProductFormData) {
    await saveValues(values, false);
  }

  return (
    <div className="admin-product-editor fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm md:p-5">
      <section className="admin-product-editor-panel mx-auto min-h-screen w-full max-w-[1060px] border border-slate-200 bg-white text-slate-950 shadow-2xl md:min-h-0 md:rounded-[24px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-7">
          <button type="button" className="inline-flex items-center gap-3 text-lg font-black text-slate-950" onClick={onClose}>
            <ArrowLeft className="size-5 text-blue-700" />
            {product ? 'Editar produto' : 'Novo produto'}
          </button>
          <button type="button" className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>

        <form className="product-editor-form grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_320px] md:p-7" onSubmit={form.handleSubmit(handleSubmit)}>
          {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 md:col-span-2">{error}</p> : null}

          <div className="grid gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Fotos do produto</h3>
                  <p className="text-xs font-semibold text-slate-500">Defina uma capa para o catalogo e adicione fotos extras para detalhes.</p>
                </div>
              </div>

              <div className="product-photo-cover mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[150px_minmax(0,1fr)]">
                <div>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.04em] text-slate-600">Capa</span>
                  <div className="grid min-h-[138px] place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    {watched.image ? <img className="max-h-[122px] object-contain p-2" src={resolveAdminImageUrl(watched.image)} alt={watched.name || 'Produto'} /> : <ImagePlus className="size-9 text-slate-300" />}
                  </div>
                </div>
                <div className="grid content-center gap-2">
                  <div className="product-photo-actions grid gap-2 sm:grid-cols-2">
                    <label className="admin-button admin-button-soft cursor-pointer justify-center">
                      <Upload className="size-4" />
                      {watched.image ? 'Trocar capa' : uploading ? 'Enviando...' : 'Adicionar capa'}
                      <input className="hidden" type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} />
                    </label>
                    <label className="admin-button admin-button-soft cursor-pointer justify-center">
                      <ImagePlus className="size-4" />
                      Tirar foto
                      <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => handleUpload(event.target.files?.[0])} />
                    </label>
                  </div>
                  {watched.image ? (
                    <button type="button" className="admin-button justify-center border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={clearProductImage}>
                      <Trash2 className="size-4" />
                      Remover capa
                    </button>
                  ) : null}
                  <input className="admin-input bg-white" value={watched.image || ''} onChange={(event) => form.setValue('image', event.target.value, { shouldDirty: true })} placeholder="URL da capa do produto" />
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <span className="block text-xs font-black uppercase tracking-[0.04em] text-slate-600">Fotos extras</span>
                <div className="product-extra-actions mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="admin-button admin-button-soft min-h-12 cursor-pointer justify-center">
                    <Upload className="size-4" />
                    {uploading ? 'Enviando...' : 'Adicionar fotos'}
                    <input className="hidden" type="file" accept="image/*" multiple onChange={(event) => void handleGalleryUpload(event.target.files)} />
                  </label>
                  <label className="admin-button admin-button-soft min-h-12 cursor-pointer justify-center">
                    <ImagePlus className="size-4" />
                    Tirar foto extra
                    <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void handleGalleryUpload(event.target.files)} />
                  </label>
                </div>

                <GalleryUrlInput onAdd={addProductImageUrl} />

                {productImages.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {productImages.map((image, index) => (
                      <article key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="grid aspect-square place-items-center bg-white">
                          <img className="h-full w-full object-contain p-2" src={resolveAdminImageUrl(image)} alt={`Foto extra ${index + 1} de ${watched.name || 'produto'}`} />
                        </div>
                        <div className="grid gap-2 border-t border-slate-200 p-2">
                          <button type="button" className="rounded-xl border border-blue-200 bg-white px-2 py-2 text-xs font-black text-blue-700" onClick={() => setGalleryImageAsMain(image)}>
                            Usar como capa
                          </button>
                          <button type="button" className="rounded-xl border border-red-200 bg-red-50 px-2 py-2 text-xs font-black text-red-700" onClick={() => removeProductImage(index)}>
                            Remover
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">Nenhuma foto extra adicionada.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome do produto">
                  <input className="admin-input bg-white" {...form.register('name')} />
                </Field>
                <Field label="Categoria">
                  <input className="admin-input bg-white" {...form.register('category')} />
                </Field>
                <Field label="Preco">
                  <input className="admin-input bg-white" type="number" step="0.01" {...form.register('price')} />
                </Field>
                <Field label="Preco promocional">
                  <input className="admin-input bg-white" type="number" step="0.01" {...form.register('promoPrice')} />
                </Field>
                <Field label="SKU principal">
                  <input className="admin-input bg-white" value={numericSku(product?.variations[0]?.sku || product?.id || watched.name || '0')} readOnly />
                </Field>
                <Field label="Estoque">
                  <StockEditableField>
                    <input className="admin-input bg-white" type="number" min="0" step="1" {...form.register('stock')} />
                  </StockEditableField>
                </Field>
                <Field label="Estoque minimo">
                  <input className="admin-input bg-white" type="number" step="1" {...form.register('minStock')} />
                </Field>
                <div className="md:col-span-2">
                  <Link href="/estoque" className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-800">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-blue-700">
                      <Boxes className="size-5" />
                    </span>
                    <span>
                      <strong className="block text-sm font-black">Movimente o saldo pela tela Estoque</strong>
                      <small className="mt-0.5 block text-xs font-bold text-blue-600">Cada entrada, perda, devolucao ou ajuste fica registrado no historico.</small>
                    </span>
                  </Link>
                </div>
              </div>

              <Field label="Descricao do produto">
                <textarea className="admin-input mt-2 min-h-[150px] bg-white" {...form.register('description')} />
              </Field>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Variacoes</h3>
                  <p className="text-xs font-semibold text-slate-500">Use para tamanho, volume, embalagem, sabor ou qualquer opcao do produto.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {variations.length ? (
                  <>
                    {variations.map((variation, index) => (
                      <article key={`${variation.id || 'new'}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-black text-slate-950">Variacao {index + 1}</h4>
                            <p className="text-xs font-bold text-slate-500">SKU numerico automatico: {variation.sku}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className={`rounded-xl border px-3 py-2 text-xs font-black ${variation.active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500'}`} onClick={() => updateVariation(index, { active: !variation.active })}>
                              {variation.active ? 'Ativa' : 'Inativa'}
                            </button>
                            <button type="button" className={`rounded-xl border px-3 py-2 text-xs font-black ${variation.offerActive ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`} onClick={() => updateVariation(index, { offerActive: !variation.offerActive })}>
                              {variation.offerActive ? 'Promocao' : 'Sem promocao'}
                            </button>
                            {!variation.id ? (
                              <button type="button" className="grid size-10 place-items-center rounded-xl border border-red-200 bg-white text-red-600" onClick={() => removeVariation(index)} aria-label="Remover variacao">
                                <Trash2 className="size-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="product-variation-fields mt-4 grid gap-3 md:grid-cols-2">
                          <Field label="Nome da variacao">
                            <input className="admin-input bg-white" value={variation.name} onChange={(event) => updateVariation(index, { name: event.target.value })} placeholder="Ex: 500ml, 2L, P13" />
                          </Field>
                          <Field label="SKU automatico">
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                              <input className="admin-input bg-white" value={variation.sku} readOnly />
                              <button type="button" className="admin-button admin-button-soft justify-center" onClick={() => updateVariation(index, { sku: numericSku(`${variation.name}-${Date.now()}-${index}`) })}>
                                Gerar
                              </button>
                            </div>
                          </Field>
                          <Field label="Preco">
                            <input className="admin-input bg-white" type="number" step="0.01" value={variation.price} onChange={(event) => updateVariation(index, { price: Number(event.target.value || 0) })} />
                          </Field>
                          <Field label="Preco promocional">
                            <input className="admin-input bg-white" type="number" step="0.01" value={variation.promoPrice ?? ''} onChange={(event) => updateVariation(index, { promoPrice: event.target.value === '' ? null : Number(event.target.value) })} />
                          </Field>
                          <Field label="Estoque">
                            <StockEditableField compact>
                              <input className="admin-input bg-white" type="number" min="0" step="1" value={variation.stock ?? ''} onChange={(event) => updateVariation(index, { stock: event.target.value === '' ? null : Number(event.target.value || 0) })} />
                            </StockEditableField>
                          </Field>
                          <Field label="Estoque minimo">
                            <input className="admin-input bg-white" type="number" step="1" value={variation.minStock} onChange={(event) => updateVariation(index, { minStock: Number(event.target.value || 0) })} />
                          </Field>
                          <div className="md:col-span-2">
                            <span className="mb-2 mt-4 block text-xs font-black uppercase tracking-[0.04em] text-slate-600">Imagem da variacao {index + 1}</span>
                            <div className="product-variation-photo grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[104px_minmax(0,1fr)]">
                              <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                {variation.image ? <img className="h-full w-full object-contain p-1" src={resolveAdminImageUrl(variation.image)} alt={variation.name || `Variacao ${index + 1}`} /> : <ImagePlus className="size-7 text-slate-400" />}
                              </div>
                              <div className="grid gap-2">
                                <label className="admin-button admin-button-soft cursor-pointer justify-center">
                                  <Upload className="size-4" />
                                  {variation.image ? 'Trocar foto desta variacao' : uploading ? 'Enviando...' : 'Enviar foto desta variacao'}
                                  <input className="hidden" type="file" accept="image/*" onChange={(event) => void handleUpload(event.target.files?.[0], index)} />
                                </label>
                                <label className="admin-button admin-button-soft cursor-pointer justify-center">
                                  <ImagePlus className="size-4" />
                                  Tirar foto desta variacao
                                  <input className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => void handleUpload(event.target.files?.[0], index)} />
                                </label>
                                {variation.image ? (
                                  <button type="button" className="admin-button justify-center border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => clearVariationImage(index)}>
                                    <Trash2 className="size-4" />
                                    Remover foto desta variacao
                                  </button>
                                ) : null}
                                <input className="admin-input bg-white" value={variation.image} onChange={(event) => updateVariation(index, { image: event.target.value })} placeholder="URL da imagem da variacao" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                    <button type="button" className="min-h-14 rounded-2xl border border-dashed border-blue-200 text-sm font-black text-blue-700" onClick={addVariation}>
                      + Adicionar variacao
                    </button>
                  </>
                ) : (
                  <button type="button" className="min-h-14 rounded-2xl border border-dashed border-blue-200 text-sm font-black text-blue-700" onClick={addVariation}>
                    + Adicionar variacao
                  </button>
                )}
              </div>
            </section>
          </div>

          <aside className="grid content-start gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Previa do produto</h3>
              <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-center">
                <div className="mx-auto grid size-44 place-items-center rounded-2xl bg-slate-50">
                  {watched.image ? <img className="max-h-40 object-contain" src={resolveAdminImageUrl(watched.image)} alt={watched.name || 'Produto'} /> : <ImagePlus className="size-12 text-slate-300" />}
                </div>
                <h4 className="mt-4 text-base font-black text-slate-950">{watched.name || 'Nome do produto'}</h4>
                <p className="mt-1 text-lg font-black text-emerald-600">{money(previewPrice)}</p>
                {discount ? <small className="font-black text-emerald-600">{discount}% de desconto</small> : null}
                <p className={`mx-auto mt-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${lowStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {lowStock ? 'Estoque baixo' : 'Em estoque'}
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Configuracoes do produto</h3>
              <div className="mt-4 grid gap-3">
                <ToggleField name="active" label="Ativo" form={form} />
                <ToggleField name="featured" label="Destaque" form={form} />
                <ToggleField name="offerActive" label="Promocao ativa" form={form} />
                <ToggleField name="storeVisible" label="Exibir no site" form={form} />
                <ToggleField name="catalogVisible" label="Exibir no catalogo" form={form} />
              </div>
            </section>

          </aside>

          <footer className="sticky bottom-0 z-10 grid gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur md:col-span-2 md:grid-cols-[1fr_auto_auto]">
            <button type="button" className="admin-button admin-button-soft justify-center" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="admin-button admin-button-soft justify-center">
              <Save className="size-4" />
              Salvar alteracoes
            </button>
            <button type="button" className="admin-button admin-button-primary justify-center" onClick={() => void form.handleSubmit((values) => saveValues(values, true))()}>
              <CheckCircle2 className="size-4" />
              Salvar e publicar
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ProductView({ product, onEdit, onClose }: { product: Product; onEdit?: () => void; onClose: () => void }) {
  const visiblePrice = product.promoPrice && product.promoPrice > 0 ? product.promoPrice : product.price;
  const variationImages = useMemo(() => product.variations.map((variation) => variation.image).filter((image): image is string => Boolean(image)), [product.variations]);
  const galleryImages = useMemo(
    () => Array.from(new Set([product.image, ...product.images, ...variationImages].filter((image): image is string => Boolean(image)))),
    [product.image, product.images, variationImages]
  );
  const [selectedImage, setSelectedImage] = useState(product.image || '');
  const displayImage = selectedImage && galleryImages.includes(selectedImage) ? selectedImage : product.image || '';
  const lowStock = product.stock !== null && product.stock !== undefined && Number(product.stock) <= Number(product.minStock || 0);
  const published = product.active && product.storeVisible && product.catalogVisible;

  return (
    <div className="admin-product-editor fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 p-0 backdrop-blur-sm md:p-5">
      <section className="admin-product-editor-panel mx-auto min-h-screen w-full max-w-[1080px] border border-slate-200 bg-white text-slate-950 shadow-2xl md:min-h-0 md:rounded-[24px]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur md:px-7">
          <button type="button" className="inline-flex items-center gap-3 text-lg font-black text-slate-950" onClick={onClose}>
            <ArrowLeft className="size-5 text-blue-700" />
            Ver produto
          </button>
          <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 sm:inline-flex">SKU {numericSku(product.variations[0]?.sku || product.id)}</span>
          <button type="button" className="grid size-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm" onClick={onClose} aria-label="Fechar">
            <X className="size-5" />
          </button>
        </header>

        <main className="product-view-main grid gap-4 p-4 md:grid-cols-[340px_minmax(0,1fr)] md:p-7">
          <section className="grid content-start gap-4">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid min-h-[250px] place-items-center rounded-2xl border border-slate-200 bg-white">
                {displayImage ? <img className="max-h-[230px] object-contain p-4" src={displayImage} alt={product.name} /> : <ImagePlus className="size-12 text-slate-300" />}
              </div>
              {galleryImages.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((image) => (
                    <button key={image} type="button" className={`grid size-16 shrink-0 place-items-center rounded-xl border bg-white ${displayImage === image ? 'border-teal-700 ring-2 ring-teal-100' : 'border-slate-200'}`} onClick={() => setSelectedImage(image)} aria-label="Selecionar imagem">
                      <img className="max-h-14 object-contain p-1" src={resolveAdminImageUrl(image)} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
              <h2 className="mt-4 text-xl font-black text-slate-950">{product.name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{product.category}</p>
              <div className="mt-4 flex flex-wrap items-end gap-2">
                <strong className="text-2xl font-black text-teal-700">{money(visiblePrice)}</strong>
                {product.promoPrice && product.promoPrice > 0 ? <span className="pb-1 text-sm font-black text-slate-400 line-through">{money(product.price)}</span> : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill active={product.active} activeText="Ativo" inactiveText="Inativo" />
                <StatusPill active={published} activeText="Publicado" inactiveText="Nao publicado" />
                {product.featured ? <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">Destaque</span> : null}
                {product.offerActive ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Promocao</span> : null}
              </div>
            </article>

            <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Resumo rapido</h3>
              <Info label="SKU principal" value={numericSku(product.variations[0]?.sku || product.id)} />
              <Info label="Estoque atual" value={`${product.stock ?? 0} un.`} />
              <Info label="Estoque minimo" value={`${product.minStock} un.`} />
            </article>
          </section>

          <section className="grid content-start gap-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black text-slate-950">Informacoes do produto</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">Tela de leitura. Para alterar valores, use Editar produto.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${lowStock ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {lowStock ? 'Reposicao sugerida' : 'Estoque normal'}
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="Categoria" value={product.category || 'Sem categoria'} />
                <Info label="Variacoes" value={`${product.variations.length} cadastradas`} />
                <Info label="Atualizado" value={product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('pt-BR') : 'Sem data'} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="Exibir no site" value={product.storeVisible ? 'Sim' : 'Nao'} />
                <Info label="Exibir no catalogo" value={product.catalogVisible ? 'Sim' : 'Nao'} />
                <Info label="Oferta ativa" value={product.offerActive ? 'Sim' : 'Nao'} />
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="text-xs font-black uppercase text-slate-500">Descricao</h4>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{product.description || 'Produto sem descricao cadastrada.'}</p>
              </div>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Variacoes e estoque</h3>
              <div className="mt-3 grid gap-3">
                {product.variations.length ? (
                  product.variations.map((variation, index) => {
                    const variationPrice = variation.promoPrice && variation.promoPrice > 0 ? variation.promoPrice : variation.price;
                    const variationLow = variation.stock !== null && variation.stock !== undefined && Number(variation.stock) <= Number(variation.minStock || 0);
                    return (
                      <div key={variation.id || index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[58px_minmax(0,1fr)_auto]">
                        <div className="grid size-14 place-items-center rounded-xl border border-slate-200 bg-white">
                          {variation.image ? <img className="max-h-12 object-contain p-1" src={resolveAdminImageUrl(variation.image)} alt={variation.name} /> : <ImagePlus className="size-5 text-slate-300" />}
                        </div>
                        <div className="min-w-0">
                          <strong className="block truncate text-sm font-black text-slate-950">{variation.name}</strong>
                          <p className="mt-1 text-xs font-bold text-slate-500">SKU {numericSku(variation.sku || variation.id || product.id)}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusPill active={variation.active} activeText="Ativa" inactiveText="Inativa" />
                            {variation.offerActive ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-black text-amber-700">Promocao</span> : null}
                            <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black ${variationLow ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                              {variationLow ? 'Baixo estoque' : 'Estoque ok'}
                            </span>
                          </div>
                        </div>
                        <div className="grid content-center gap-1 text-left md:text-right">
                          <strong className="text-sm font-black text-teal-700">{money(variationPrice)}</strong>
                          {variation.promoPrice && variation.promoPrice > 0 ? <span className="text-xs font-black text-slate-400 line-through">{money(variation.price)}</span> : null}
                          <small className="text-xs font-black text-slate-500">{variation.stock ?? 0} un. / min. {variation.minStock || 0}</small>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">Produto sem variacoes cadastradas.</p>
                )}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-black text-slate-950">Preco e publicacao</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Info label="Preco base" value={money(product.price)} />
                <Info label="Preco promocional" value={product.promoPrice && product.promoPrice > 0 ? money(product.promoPrice) : 'Sem promocao'} />
                <Info label="Status" value={product.active ? 'Ativo para venda' : 'Desativado'} />
                <Info label="Visibilidade" value={published ? 'Aparece para clientes' : 'Oculto do cliente'} />
              </div>
            </article>
          </section>
        </main>

        <footer className="sticky bottom-0 grid gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur md:grid-cols-[1fr_auto]">
          <button type="button" className="admin-button admin-button-soft justify-center" onClick={onClose}>Fechar</button>
          {onEdit ? <button type="button" className="admin-button admin-button-primary justify-center" onClick={onEdit}>Editar produto</button> : null}
        </footer>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-xs font-black uppercase text-slate-500">{label}</span>
      <strong className="mt-1 block text-sm font-black text-slate-950">{value}</strong>
    </p>
  );
}

function GalleryUrlInput({ onAdd }: { onAdd: (url: string) => void }) {
  const [url, setUrl] = useState('');

  function handleAdd() {
    onAdd(url);
    setUrl('');
  }

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
      <input className="admin-input bg-white" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Colar URL de uma foto extra" />
      <button type="button" className="admin-button admin-button-soft justify-center" onClick={handleAdd}>
        Adicionar URL
      </button>
    </div>
  );
}

function StatusPill({ active, activeText, inactiveText }: { active: boolean; activeText: string; inactiveText: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {active ? activeText : inactiveText}
    </span>
  );
}

function StockEditableField({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <div className={`product-stock-editable ${compact ? 'is-compact' : ''}`}>
      {children}
      <small>A diferenca sera registrada no historico como ajuste de estoque.</small>
    </div>
  );
}

function buildStockAdjustments({
  productId,
  product,
  desiredProductStock,
  variations
}: {
  productId: string;
  product: Product | null;
  desiredProductStock: number | null;
  variations: VariationDraft[];
}): StockMovementInput[] {
  if (!productId) return [];
  const reason = 'Ajuste feito no editor de produto.';
  const adjustments: StockMovementInput[] = [];
  const hasVariations = variations.some((variation) => variation.name.trim() || variation.sku.trim());

  if (!hasVariations && desiredProductStock !== null) {
    const previous = product?.stock ?? 0;
    const quantity = Math.abs(desiredProductStock - previous);
    if (quantity > 0) {
      adjustments.push({
        productId,
        type: desiredProductStock > previous ? 'ajuste_entrada' : 'ajuste_saida',
        quantity,
        reason
      });
    }
  }

  for (const variation of variations) {
    if (!variation.id || variation.stock === null) continue;
    const currentVariation = product?.variations.find((item) => item.id === variation.id);
    const previous = currentVariation?.stock ?? 0;
    const quantity = Math.abs(variation.stock - previous);
    if (quantity <= 0) continue;
    adjustments.push({
      productId,
      variationId: variation.id,
      type: variation.stock > previous ? 'ajuste_entrada' : 'ajuste_saida',
      quantity,
      reason
    });
  }

  return adjustments;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 mt-4 block text-xs font-black uppercase tracking-[0.04em] text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  name,
  label,
  form
}: {
  name: keyof ProductFormInput;
  label: string;
  form: ReturnType<typeof useForm<ProductFormInput, unknown, ProductFormData>>;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input className="size-5 accent-blue-700" type="checkbox" {...form.register(name)} />
    </label>
  );
}

function defaultValues(product: Product | null): ProductFormInput {
  return {
    name: product?.name || '',
    category: product?.category || 'Produtos',
    description: product?.description || '',
    image: product?.image || '',
    price: product?.price || 0,
    promoPrice: product?.promoPrice || null,
    stock: product?.stock ?? null,
    minStock: product?.minStock || 0,
    active: product?.active ?? true,
    storeVisible: product?.storeVisible ?? true,
    catalogVisible: product?.catalogVisible ?? true,
    featured: product?.featured ?? false,
    offerActive: product?.offerActive ?? false
  };
}

function getSavedProductId(saved: unknown) {
  if (!saved || typeof saved !== 'object' || !('id' in saved)) return '';
  const id = (saved as { id?: unknown }).id;
  return typeof id === 'string' ? id : '';
}

function numericSku(seed: string) {
  const digits = seed.replace(/\D/g, '');
  if (digits.length >= 8) return digits.slice(-8);

  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 100000000;
  }

  return String(hash || Date.now()).replace(/\D/g, '').slice(-8).padStart(8, '0');
}
