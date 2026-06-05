import { orderStatuses } from '@/lib/constants';

type StatusBadgeProps = {
  value: string;
};

const toneClass: Record<string, string> = {
  blue: 'is-blue',
  amber: 'is-amber',
  purple: 'is-purple',
  orange: 'is-orange',
  green: 'is-green',
  red: 'is-red'
};

export function StatusBadge({ value }: StatusBadgeProps) {
  const status = orderStatuses.find((item) => item.value === value);
  const className = toneClass[status?.tone || 'blue'] || toneClass.blue;

  return (
    <span className={`status-badge ${className}`}>
      {status?.label || value}
    </span>
  );
}
