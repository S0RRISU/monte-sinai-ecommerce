export const CONFIG = {
  version: '20260528-premium-foundation',
  store: {
    name: 'Monte Sinai',
    tagline: 'Agua, gas e limpeza',
    whatsapp: '5511960928234',
    email: 'contato@montesinai.com.br',
    address: 'Rua das Flores, 123',
    city: 'Sao Paulo, SP',
    deliveryFee: 3,
    freeShippingFrom: 50,
    logo: 'assets/brand/monte-sinai-logo-transparente.png',
    icon: 'assets/brand/icons/monte-sinai-icon-transparente-192.png'
  },
  supabase: {
    url: 'https://nnglqufeyergsgzafdek.supabase.co',
    key: 'sb_publishable_1WBJx-thg65xL4N7uEMuvg_mJHb-Oo9'
  },
  categories: [
    { key: 'all', label: 'Todos', icon: 'fa-border-all' },
    { key: 'agua', label: 'Agua', icon: 'fa-droplet' },
    { key: 'gas', label: 'Gas', icon: 'fa-fire-flame-simple' },
    { key: 'limpeza', label: 'Limpeza', icon: 'fa-spray-can-sparkles' },
    { key: 'utensilios', label: 'Utensilios', icon: 'fa-basket-shopping' },
    { key: 'ofertas', label: 'Ofertas', icon: 'fa-percent' }
  ],
  adminRoles: ['equipe', 'motoboy', 'admin', 'developer'],
  fullAdminRoles: ['admin', 'developer'],
  orderStatuses: [
    { value: 'Recebido', label: 'Recebido' },
    { value: 'Preparando', label: 'Em separacao' },
    { value: 'Saiu para entrega', label: 'Saiu para entrega' },
    { value: 'Entregue', label: 'Entregue' },
    { value: 'Cancelado', label: 'Cancelado' }
  ],
  paymentStatuses: ['Pendente', 'Pago', 'Cancelado'],
  fallbackProducts: [
    {
      id: 'agua-mineral-20l',
      name: 'Agua Mineral 20L',
      category: 'Agua',
      price: 15,
      image: 'assets/produtos/v2/agua-mineral-20l.png',
      description: 'Galao de agua mineral para abastecer a casa.'
    },
    {
      id: 'gas-p13',
      name: 'Gas de cozinha P13',
      category: 'Gas',
      price: 125,
      image: 'assets/produtos/v2/gas-p13.png',
      description: 'Botijao P13 para uso domestico.'
    },
    {
      id: 'desinfetante-2l',
      name: 'Desinfetante 2L',
      category: 'Limpeza',
      price: 5,
      image: 'assets/produtos/v2/desinfetante-2l.png',
      description: 'Limpeza diaria com fragrancias selecionadas.',
      featured: true
    },
    {
      id: 'sabao-omo',
      name: 'Sabao em Po Omo 2L',
      category: 'Lavanderia',
      price: 23.9,
      image: 'assets/produtos/v2/sabao-omo.png',
      description: 'Lavagem de roupas com alto rendimento.'
    },
    {
      id: 'cloro-2l',
      name: 'Cloro 2L',
      category: 'Limpeza',
      price: 12,
      image: 'assets/produtos/v2/cloro-2l.png',
      description: 'Cloro para limpeza pesada.'
    },
    {
      id: 'limpa-aluminio',
      name: 'Limpa Aluminio 500ml',
      category: 'Cozinha',
      price: 5,
      image: 'assets/produtos/v2/limpa-aluminio.png',
      description: 'Brilho para utensilios de cozinha.',
      offerActive: true,
      promoPrice: 3.99
    },
    {
      id: 'detergente-2l',
      name: 'Detergente 2L',
      category: 'Cozinha',
      price: 10,
      image: 'assets/produtos/v2/detergente-2l.png',
      description: 'Detergente para loucas e limpeza da pia.'
    },
    {
      id: 'vassoura',
      name: 'Vassoura',
      category: 'Utensilios',
      price: 12,
      image: 'assets/produtos/v2/vassoura.png',
      description: 'Item essencial para limpeza diaria.'
    }
  ]
};
