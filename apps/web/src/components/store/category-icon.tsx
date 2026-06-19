import { BadgePercent, Droplet, Flame, Package, Sparkles, type LucideIcon } from 'lucide-react';
import type { ProductCategory } from '@/lib/store-data';

const categoryIcons: Record<ProductCategory, LucideIcon> = {
  agua: Droplet,
  gas: Flame,
  limpeza: Sparkles,
  utensilios: Package,
  ofertas: BadgePercent
};

export function CategoryIcon({ category }: { category: ProductCategory }) {
  const Icon = categoryIcons[category];

  return <Icon className="category-icon" aria-hidden="true" />;
}
