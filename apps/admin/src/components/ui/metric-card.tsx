import type { LucideIcon } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
};

const tones = {
  blue: 'from-blue-500/22 text-blue-100',
  green: 'from-emerald-500/22 text-emerald-100',
  amber: 'from-amber-400/24 text-amber-100',
  purple: 'from-purple-500/22 text-purple-100',
  red: 'from-red-500/22 text-red-100'
};

export function MetricCard({ label, value, trend, icon: Icon, tone = 'blue' }: MetricCardProps) {
  return (
    <article className="glass-card min-h-[124px] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br ${tones[tone]} to-transparent`}>
          <Icon className="size-5" />
        </div>
        {trend ? <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-xs font-semibold text-emerald-200">{trend}</span> : null}
      </div>
      <p className="mt-4 text-sm text-[color:var(--admin-muted)]">{label}</p>
      <strong className="mt-1 block text-2xl font-black tracking-tight text-[color:var(--admin-text)]">{value}</strong>
    </article>
  );
}
