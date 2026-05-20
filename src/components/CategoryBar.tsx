import type { Category } from '../lib/parser';

interface Props {
  counts: Record<Category, number>;
  total: number;
}

const COLOR: Record<Category, { bar: string; dot: string; text: string }> = {
  Necessary: {
    bar: 'bg-neutral-800',
    dot: 'bg-neutral-800',
    text: 'text-neutral-800',
  },
  Preferences: {
    bar: 'bg-sky-500',
    dot: 'bg-sky-500',
    text: 'text-sky-700',
  },
  Statistics: {
    bar: 'bg-violet-500',
    dot: 'bg-violet-500',
    text: 'text-violet-700',
  },
  Marketing: {
    bar: 'bg-pink-500',
    dot: 'bg-pink-500',
    text: 'text-pink-700',
  },
  Unclassified: {
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
  },
};

const CATEGORY_ORDER: Category[] = [
  'Necessary',
  'Preferences',
  'Statistics',
  'Marketing',
  'Unclassified',
];

export function CategoryBar({ counts, total }: Props) {
  const entries = CATEGORY_ORDER.filter((c) => counts[c] > 0);
  const safeTotal = total > 0 ? total : 1;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          By category
        </h2>
        <span className="text-xs text-neutral-400 tabular">
          {total} active cookies
        </span>
      </div>

      {/* Stacked bar */}
      <div className="mt-3 h-2.5 rounded-full overflow-hidden bg-neutral-100 flex">
        {entries.map((cat) => {
          const pct = (counts[cat] / safeTotal) * 100;
          return (
            <div
              key={cat}
              className={`${COLOR[cat].bar} h-full transition-all`}
              style={{ width: `${pct}%` }}
              title={`${cat}: ${counts[cat]} (${pct.toFixed(0)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {CATEGORY_ORDER.map((cat) => (
          <li
            key={cat}
            className="flex items-center gap-1.5 text-xs"
          >
            <span className={`h-2 w-2 rounded-full ${COLOR[cat].dot}`} />
            <span className="text-neutral-600">{cat}</span>
            <span className={`tabular font-semibold ${COLOR[cat].text}`}>
              {counts[cat]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
