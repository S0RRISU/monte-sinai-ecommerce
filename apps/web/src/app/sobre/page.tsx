import Link from 'next/link';
import { BadgeCheck, MapPin, MessageCircle, PackageCheck, ShieldCheck, Truck } from 'lucide-react';
import { StoreShell } from '@/components/store/store-shell';
import { getStorefrontConfig } from '@/lib/storefront-data';

const pillars = [
  {
    title: 'Entrega local',
    text: 'Atendimento focado em Pirajussara e bairros proximos, com pedido organizado antes da separacao.',
    icon: Truck
  },
  {
    title: 'Produto certo',
    text: 'Agua, gas e limpeza com opcoes selecionaveis quando o produto tem marca ou fragrancia.',
    icon: PackageCheck
  },
  {
    title: 'Atendimento direto',
    text: 'A loja confirma os detalhes pelo WhatsApp quando precisa alinhar endereco, pagamento ou entrega.',
    icon: MessageCircle
  }
];

export default async function AboutPage() {
  const config = await getStorefrontConfig();

  return (
    <StoreShell>
      <main className="store-main about-page">
        <section className="about-hero">
          <div>
            <span className="about-kicker">
              <BadgeCheck className="size-4" />
              Monte Sinai
            </span>
            <h1>Agua, gas e limpeza para abastecer sua casa com menos complicacao.</h1>
            <p>
              A Monte Sinai organiza produtos essenciais em uma loja simples de comprar, com carrinho, pedidos e atendimento
              conectados ao painel interno da equipe.
            </p>
            <div className="about-actions">
              <Link href="/produtos">Ver produtos</Link>
              <Link href="/conta/editar#localizacao">Definir entrega</Link>
            </div>
          </div>

          <aside className="about-service-card" aria-label="Endereco e atendimento">
            <img src="/brand/monte-sinai-logo-transparente.png" alt={config.name} />
            <p>
              <MapPin className="size-4" />
              {config.address}
            </p>
            <p>
              <Truck className="size-4" />
              {config.deliveryAreas}
            </p>
            <p>
              <ShieldCheck className="size-4" />
              {config.businessHours}
            </p>
          </aside>
        </section>

        <section className="about-grid" aria-label="Diferenciais da loja">
          {pillars.map((item) => (
            <article key={item.title}>
              <span>
                <item.icon className="size-5" />
              </span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </section>

        <section className="about-panel">
          <div>
            <span>Como funciona</span>
            <h2>O pedido so vira venda quando voce confirma no checkout.</h2>
            <p>
              O carrinho serve para escolher produtos. A venda e registrada apenas no fechamento, mantendo pedidos,
              estoque e atendimento mais confiaveis.
            </p>
          </div>
          <Link href="/carrinho">Ir para o carrinho</Link>
        </section>
      </main>
    </StoreShell>
  );
}
