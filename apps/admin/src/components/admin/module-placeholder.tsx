import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

export function ModulePlaceholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader
        eyebrow="Modulo planejado"
        title={title}
        description="Esta area esta reservada para a proxima fase. A fundacao ja esta isolada em Next.js para receber dados reais, permissoes e auditoria sem quebrar a loja atual."
      />
      <EmptyState title="Modulo aguardando integracao" description="Nenhum dado falso sera inventado. Quando houver schema real ou migracao aditiva aprovada, esta tela vira operacional." />
    </>
  );
}
