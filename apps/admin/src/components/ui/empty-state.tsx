import { Inbox } from 'lucide-react';

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="glass-card grid min-h-[220px] place-items-center p-8 text-center">
      <div>
        <div className="mx-auto grid size-14 place-items-center rounded-3xl bg-blue-500/15 text-blue-100">
          <Inbox className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-300">{description}</p>
      </div>
    </div>
  );
}
