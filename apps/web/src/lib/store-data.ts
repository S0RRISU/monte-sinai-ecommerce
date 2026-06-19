export type ProductCategory = 'agua' | 'gas' | 'limpeza' | 'utensilios' | 'ofertas';

export type ProductVariation = {
  id: string;
  label: string;
  helper: string;
  price: number;
  badge?: string;
  canBuy?: boolean;
  unavailable?: boolean;
};

export type Product = {
  slug: string;
  name: string;
  shortName: string;
  category: ProductCategory;
  categoryLabel: string;
  description: string;
  image: string;
  images?: string[];
  price: number;
  oldPrice?: number;
  unit: string;
  badge?: string;
  popular?: boolean;
  offer?: boolean;
  rating?: number;
  variations?: ProductVariation[];
  canBuy?: boolean;
  unavailable?: boolean;
  benefits: string[];
  useCases: string[];
};

type ProductInput = Omit<Product, 'benefits' | 'useCases'> & Partial<Pick<Product, 'benefits' | 'useCases'>>;

export const categories: Array<{ id: ProductCategory; label: string; image: string }> = [
  { id: 'agua', label: 'Água', image: '/products/agua-mineral-20l.png' },
  { id: 'gas', label: 'Gás', image: '/products/gas-p13.png' },
  { id: 'limpeza', label: 'Limpeza', image: '/products/desinfetante-2l.png' },
  { id: 'utensilios', label: 'Utensílios', image: '/products/rodo-grande.png' },
  { id: 'ofertas', label: 'Ofertas', image: '/products/vanish-oxi-action-450g.png' }
];

function localProduct(product: ProductInput): Product {
  return {
    benefits: ['Entrega rápida', 'Produto selecionado', 'Atendimento local'],
    useCases: ['Casa', 'Comércio'],
    rating: 4.8,
    ...product
  };
}

export const products: Product[] = [
  localProduct({
    slug: 'agua-mineral-20l',
    name: 'Água Mineral 20L',
    shortName: 'Água 20L',
    category: 'agua',
    categoryLabel: 'Água',
    description: 'Galão de água mineral para casa ou comércio.',
    image: '/products/agua-mineral-20l.png',
    price: 15,
    unit: 'Galão 20L',
    popular: true,
    rating: 4.9,
    benefits: ['Entrega rápida', 'Qualidade garantida', 'Ideal para casa e comércio'],
    useCases: ['Casa', 'Escritório', 'Comércio']
  }),
  localProduct({
    slug: 'gas-p13',
    name: 'Gás P13',
    shortName: 'Gás P13',
    category: 'gas',
    categoryLabel: 'Gás',
    description: 'Botijão P13 para fogão residencial. Escolha a marca antes de comprar.',
    image: '/products/gas-p13.png',
    price: 125,
    unit: 'Botijão 13kg',
    popular: true,
    rating: 4.9,
    variations: [
      { id: 'supergas', label: 'Supergas', helper: 'Marca Supergas', price: 125 },
      { id: 'ultragas', label: 'Ultragas', helper: 'Marca Ultragas', price: 135 }
    ],
    benefits: ['Entrega segura', 'Marca certificada', 'Atendimento especializado'],
    useCases: ['Fogão', 'Casa', 'Cozinha']
  }),
  localProduct({
    slug: 'alcool-perfumado-500ml',
    name: 'Álcool Perfumado 500ml',
    shortName: 'Álcool 500ml',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Álcool perfumado 500ml para limpeza diária.',
    image: '/products/alcool-perfumado.png',
    price: 5,
    unit: 'Frasco 500ml'
  }),
  localProduct({
    slug: 'amaciante-2l',
    name: 'Amaciante 2L',
    shortName: 'Amaciante',
    category: 'limpeza',
    categoryLabel: 'Lavanderia',
    description: 'Amaciante para roupas macias e perfumadas.',
    image: '/products/amaciante-2l.png',
    price: 10,
    unit: 'Frasco 2L',
    useCases: ['Roupas', 'Cama', 'Banho']
  }),
  localProduct({
    slug: 'candida-2l-tradicional',
    name: 'Cândida 2L Tradicional',
    shortName: 'Cândida 2L',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Cândida tradicional 2 litros para limpeza geral.',
    image: '/products/candida-2l.png',
    price: 5,
    unit: 'Frasco 2L'
  }),
  localProduct({
    slug: 'candida-colorida-2l',
    name: 'Cândida Colorida 2L',
    shortName: 'Cândida Colorida',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Cândida colorida 2 litros para limpeza e cuidado com tecidos.',
    image: '/products/candida-colorida.png',
    price: 12,
    unit: 'Frasco 2L'
  }),
  localProduct({
    slug: 'cloro-1l-tradicional',
    name: 'Cloro 1L Tradicional',
    shortName: 'Cloro 1L',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Cloro tradicional 1 litro para limpeza pesada.',
    image: '/products/cloro-1l.png',
    price: 7.5,
    unit: 'Frasco 1L'
  }),
  localProduct({
    slug: 'cloro-2l-tradicional',
    name: 'Cloro 2L Tradicional',
    shortName: 'Cloro 2L',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Cloro tradicional 2 litros para limpeza pesada.',
    image: '/products/cloro-2l.png',
    price: 12,
    unit: 'Frasco 2L',
    useCases: ['Quintal', 'Pisos', 'Banheiro']
  }),
  localProduct({
    slug: 'detergente-2l-neutro',
    name: 'Detergente 2L Neutro',
    shortName: 'Detergente',
    category: 'limpeza',
    categoryLabel: 'Cozinha',
    description: 'Detergente neutro para louças e limpeza da cozinha.',
    image: '/products/detergente-2l.png',
    price: 10,
    unit: 'Frasco 2L',
    useCases: ['Louças', 'Pia', 'Cozinha']
  }),
  localProduct({
    slug: 'desinfetante-2l',
    name: 'Desinfetante 2L',
    shortName: 'Desinfetante',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Desinfetante 2 litros com fragrâncias para escolher.',
    image: '/products/desinfetante-2l.png',
    price: 5,
    unit: 'Frasco 2L',
    popular: true,
    variations: [
      { id: 'kaiake', label: 'Kaiake', helper: 'Fragrância Kaiake', price: 5 },
      { id: 'violeta', label: 'Violeta', helper: 'Fragrância Violeta', price: 5 },
      { id: 'eucalipto', label: 'Eucalipto', helper: 'Fragrância Eucalipto', price: 5 },
      { id: 'pinho', label: 'Pinho', helper: 'Fragrância Pinho', price: 5 },
      { id: 'jasmim', label: 'Jasmim', helper: 'Fragrância Jasmim', price: 5 },
      { id: 'talco', label: 'Talco', helper: 'Fragrância Talco', price: 5 },
      { id: 'dama-noite', label: 'Dama da Noite', helper: 'Fragrância Dama da Noite', price: 5 },
      { id: 'palmolive', label: 'Palmolive', helper: 'Fragrância Palmolive', price: 5 }
    ],
    benefits: ['Elimina odores', 'Perfume prolongado', 'Limpeza diária'],
    useCases: ['Pisos', 'Banheiros', 'Cozinhas', 'Áreas de serviço']
  }),
  localProduct({
    slug: 'limpa-aluminio',
    name: 'Limpa Alumínio 500ml',
    shortName: 'Limpa Alumínio',
    category: 'limpeza',
    categoryLabel: 'Cozinha',
    description: 'Produto para dar brilho em utensílios de alumínio.',
    image: '/products/limpa-aluminio.png',
    price: 5,
    unit: 'Frasco 500ml'
  }),
  localProduct({
    slug: 'limpa-pedra-2l-uso-pesado',
    name: 'Limpa Pedra 2L Uso Pesado',
    shortName: 'Limpa Pedra',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Limpa pedra 2 litros para limpeza pesada.',
    image: '/products/limpa-pedra-2l.png',
    price: 12,
    unit: 'Frasco 2L'
  }),
  localProduct({
    slug: 'limpa-pedra-500ml-uso-diario',
    name: 'Limpa Pedra 500ml Uso Diário',
    shortName: 'Pedra 500ml',
    category: 'limpeza',
    categoryLabel: 'Limpeza',
    description: 'Limpa pedra 500ml para limpeza diária.',
    image: '/products/limpa-pedra-500ml.png',
    price: 5,
    unit: 'Frasco 500ml'
  }),
  localProduct({
    slug: 'sabao-coco-2l',
    name: 'Sabão de Coco 2L',
    shortName: 'Sabão Coco',
    category: 'limpeza',
    categoryLabel: 'Lavanderia',
    description: 'Sabão de coco 2 litros para lavagem de roupas.',
    image: '/products/sabao-coco.png',
    price: 12,
    unit: 'Frasco 2L'
  }),
  localProduct({
    slug: 'sabao-omo-2l',
    name: 'Sabão Omo 2L',
    shortName: 'Omo 2L',
    category: 'limpeza',
    categoryLabel: 'Lavanderia',
    description: 'Sabão Omo 2 litros para lavagem de roupas.',
    image: '/products/sabao-omo.png',
    price: 22,
    unit: 'Frasco 2L',
    popular: true,
    useCases: ['Roupas', 'Lavanderia']
  }),
  localProduct({
    slug: 'sabonete-liquido-dove-500ml',
    name: 'Sabonete Líquido Dove 500ml',
    shortName: 'Sabonete',
    category: 'limpeza',
    categoryLabel: 'Higiene',
    description: 'Sabonete líquido Dove 500ml para higiene diária.',
    image: '/products/sabonete-liquido.png',
    price: 6,
    unit: 'Frasco 500ml'
  }),
  localProduct({
    slug: 'vassoura',
    name: 'Vassoura',
    shortName: 'Vassoura',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Vassoura para limpeza doméstica e comercial.',
    image: '/products/vassoura.png',
    price: 12,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'rodo-grande',
    name: 'Rodo Grande',
    shortName: 'Rodo Grande',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Rodo grande para limpeza de pisos.',
    image: '/products/rodo-grande.png',
    price: 9.9,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'rodo-pequeno',
    name: 'Rodo Pequeno',
    shortName: 'Rodo Pequeno',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Rodo pequeno para banheiro e áreas menores.',
    image: '/products/rodo-pequeno.png',
    price: 7.99,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'rodinho-pia',
    name: 'Rodinho de Pia',
    shortName: 'Rodinho',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Rodinho para pia e limpeza da cozinha.',
    image: '/products/rodinho-pia.png',
    price: 5,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'saco-lixo',
    name: 'Saco de Lixo',
    shortName: 'Saco Lixo',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Saco de lixo para uso doméstico.',
    image: '/products/saco-lixo.png',
    price: 6,
    unit: 'Pacote'
  }),
  localProduct({
    slug: 'bombril',
    name: 'Bombril',
    shortName: 'Bombril',
    category: 'utensilios',
    categoryLabel: 'Cozinha',
    description: 'Esponja de aço para limpeza pesada de panelas.',
    image: '/products/bombril.png',
    price: 3,
    unit: 'Pacote'
  }),
  localProduct({
    slug: 'esponja-aco',
    name: 'Esponja de Aço',
    shortName: 'Esponja Aço',
    category: 'utensilios',
    categoryLabel: 'Cozinha',
    description: 'Esponja de aço para panelas e utensílios.',
    image: '/products/esponja-aco.png',
    price: 4.9,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'esponja-louca',
    name: 'Esponja de Louça',
    shortName: 'Esponja',
    category: 'utensilios',
    categoryLabel: 'Cozinha',
    description: 'Esponja para lavar louças.',
    image: '/products/esponja-louca.png',
    price: 2,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'esponjao',
    name: 'Esponjão',
    shortName: 'Esponjão',
    category: 'utensilios',
    categoryLabel: 'Cozinha',
    description: 'Esponja maior para limpeza pesada.',
    image: '/products/esponjao.png',
    price: 9.9,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'escova-roupa',
    name: 'Escova de Roupa',
    shortName: 'Escova Roupa',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Escova para lavar roupas e tecidos resistentes.',
    image: '/products/escova-roupa.png',
    price: 5,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'escova-vaso',
    name: 'Escova de Vaso com Pote',
    shortName: 'Escova Vaso',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Escova para limpeza de vaso sanitário.',
    image: '/products/escova-vaso.png',
    price: 8.5,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'pa',
    name: 'Pá',
    shortName: 'Pá',
    category: 'utensilios',
    categoryLabel: 'Utensílios',
    description: 'Pá para recolher sujeira na limpeza diária.',
    image: '/products/pa.png',
    price: 7.5,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'pasta-brilho',
    name: 'Pasta de Brilho',
    shortName: 'Pasta Brilho',
    category: 'utensilios',
    categoryLabel: 'Cozinha',
    description: 'Pasta para dar brilho em panelas e superfícies.',
    image: '/products/pasta-brilho.png',
    price: 6,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'pedra-vaso',
    name: 'Pedra de Vaso Sanitário',
    shortName: 'Pedra Vaso',
    category: 'utensilios',
    categoryLabel: 'Banheiro',
    description: 'Pedra sanitária para banheiro.',
    image: '/products/pedra-vaso.png',
    price: 2.5,
    unit: 'Unidade'
  }),
  localProduct({
    slug: 'prendedor-madeira',
    name: 'Prendedor de Madeira',
    shortName: 'Prendedor',
    category: 'utensilios',
    categoryLabel: 'Lavanderia',
    description: 'Prendedores de madeira para varal.',
    image: '/products/prendedor-madeira.png',
    price: 3.2,
    unit: 'Pacote'
  }),
  localProduct({
    slug: 'prendedor-plastico',
    name: 'Prendedor Plástico',
    shortName: 'Prendedor',
    category: 'utensilios',
    categoryLabel: 'Lavanderia',
    description: 'Prendedores de plastico para varal.',
    image: '/products/prendedor-plastico.png',
    price: 3.6,
    unit: 'Pacote'
  })
];

export function money(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function productsByCategory(category?: string) {
  if (!category || category === 'todos') return products;
  if (category === 'ofertas') return products.filter((product) => product.offer || product.oldPrice);
  return products.filter((product) => product.category === category);
}

export function featuredProducts() {
  return products.slice(0, 12);
}

export function offerProducts() {
  return products.filter((product) => product.offer || product.oldPrice).slice(0, 8);
}
