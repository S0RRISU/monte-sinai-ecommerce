import { redirect } from 'next/navigation';

type CatalogRedirectProps = {
  searchParams: Promise<{ categoria?: string }>;
};

export default async function CatalogRedirect({ searchParams }: CatalogRedirectProps) {
  const params = await searchParams;
  redirect(params.categoria ? `/produtos?categoria=${params.categoria}` : '/produtos');
}
