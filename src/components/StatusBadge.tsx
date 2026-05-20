import type { Status } from '../lib/parser';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface Props {
  status: Status;
  size?: 'sm' | 'lg';
}

const config: Record<
  Status,
  { label: string; classes: string; Icon: typeof CheckCircle2 }
> = {
  'looks good': {
    label: 'Looks good',
    classes: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
    Icon: CheckCircle2,
  },
  'needs improvement': {
    label: 'Needs improvement',
    classes: 'bg-amber-100 text-amber-900 ring-amber-200',
    Icon: AlertTriangle,
  },
  'error detected': {
    label: 'Error detected',
    classes: 'bg-rose-100 text-rose-800 ring-rose-200',
    Icon: XCircle,
  },
};

export function StatusBadge({ status, size = 'sm' }: Props) {
  const { label, classes, Icon } = config[status];
  const pad = size === 'lg' ? 'px-3.5 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  const iconSize = size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 font-medium ${pad} ${classes}`}
    >
      <Icon className={iconSize} strokeWidth={2.2} />
      {label}
    </span>
  );
}
