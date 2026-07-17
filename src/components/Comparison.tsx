import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Cookie as CookieIcon,
  ShieldOff,
  AlertOctagon,
  HelpCircle,
  AlertTriangle,
  Search,
} from 'lucide-react';
import type { Cookie, Category } from '../lib/parser';
import { CATEGORY_NAMES } from '../lib/parser';
import type {
  ComparisonResult,
  CookieChange,
  CookieChangeReason,
  MetricDelta,
} from '../lib/compare';

interface Props {
  comparison: ComparisonResult;
  onExit: () => void;
  onSelectCookie?: (cookie: Cookie) => void;
}

type DiffTab = 'added' | 'removed' | 'changed';

const REASON_LABEL: Record<CookieChangeReason, string> = {
  category: 'category',
  adequacy: 'adequacy',
  'pre-consent': 'pre-consent',
  expiry: 'expiry',
  'data-sent-to': 'data destination',
};

export function Comparison({ comparison, onExit, onSelectCookie }: Props) {
  const { past, current, added, removed, changed, keptCount, metrics } =
    comparison;

  const initialTab: DiffTab =
    added.length > 0 ? 'added' : removed.length > 0 ? 'removed' : 'changed';
  const [tab, setTab] = useState<DiffTab>(initialTab);
  const [query, setQuery] = useState('');

  const pastLabel = past.summary.scanDate ?? 'Past report';
  const currentLabel = current.summary.scanDate ?? 'Current report';

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to single report
      </button>

      {/* Title row */}
      <header className="mt-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            {current.summary.domain ?? past.summary.domain ?? 'Comparison'}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
            <RefreshCw className="h-3 w-3" />
            Comparison
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2 sm:gap-3 text-sm text-neutral-600 flex-wrap">
          <ScanChip label="Past" date={pastLabel} tone="neutral" />
          <ArrowRight className="h-4 w-4 text-neutral-400 shrink-0" />
          <ScanChip label="Current" date={currentLabel} tone="accent" />
        </div>

        {comparison.domainMismatch ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              These two reports are for different domains (
              <strong>{past.summary.domain}</strong> vs{' '}
              <strong>{current.summary.domain}</strong>). The diff will still
              work but numbers won't be meaningful.
            </span>
          </div>
        ) : null}
      </header>

      {/* Metric deltas */}
      <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <DeltaCard
          label="Total trackers"
          metric={metrics.total}
          icon={<CookieIcon className="h-4 w-4" />}
        />
        <DeltaCard
          label="Unclassified"
          metric={metrics.unclassified}
          icon={<HelpCircle className="h-4 w-4" />}
        />
        <DeltaCard
          label="Pre-consent violations"
          metric={metrics.notBlockedPriorConsent}
          icon={<AlertOctagon className="h-4 w-4" />}
        />
        <DeltaCard
          label="Not adequate"
          metric={metrics.notAdequate}
          icon={<ShieldOff className="h-4 w-4" />}
        />
      </section>

      {/* Category comparison */}
      <section className="mt-4">
        <CategoryCompare
          before={comparison.categories.before}
          after={comparison.categories.after}
        />
      </section>

      {/* Cookie diff */}
      <section className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
              Cookie diff
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Matched by name + provider + type. {keptCount} unchanged.
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name or provider"
              className="w-full sm:w-64 pl-9 pr-3 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <DiffTabChip
            active={tab === 'added'}
            tone="added"
            count={added.length}
            onClick={() => setTab('added')}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Added
          </DiffTabChip>
          <DiffTabChip
            active={tab === 'removed'}
            tone="removed"
            count={removed.length}
            onClick={() => setTab('removed')}
          >
            <MinusCircle className="h-3.5 w-3.5" />
            Removed
          </DiffTabChip>
          <DiffTabChip
            active={tab === 'changed'}
            tone="changed"
            count={changed.length}
            onClick={() => setTab('changed')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Changed
          </DiffTabChip>
        </div>

        {tab === 'added' ? (
          <SimpleCookieList
            cookies={added}
            query={query}
            emptyMessage="No new cookies since the past report."
            onSelect={onSelectCookie}
            tone="added"
          />
        ) : null}

        {tab === 'removed' ? (
          <SimpleCookieList
            cookies={removed}
            query={query}
            emptyMessage="No cookies were removed."
            onSelect={onSelectCookie}
            tone="removed"
          />
        ) : null}

        {tab === 'changed' ? (
          <ChangedCookieList
            changes={changed}
            query={query}
            onSelect={onSelectCookie}
          />
        ) : null}
      </section>
    </div>
  );
}

function ScanChip({
  label,
  date,
  tone,
}: {
  label: string;
  date: string;
  tone: 'neutral' | 'accent';
}) {
  const cls =
    tone === 'accent'
      ? 'bg-neutral-900 text-white border-neutral-900'
      : 'bg-white text-neutral-800 border-neutral-200';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${cls}`}
    >
      <Calendar className="h-3.5 w-3.5 opacity-70" />
      <span
        className={
          tone === 'accent' ? 'text-white/70 mr-1' : 'text-neutral-400 mr-1'
        }
      >
        {label}
      </span>
      <span className="tabular">{date}</span>
    </span>
  );
}

function DeltaCard({
  label,
  metric,
  icon,
}: {
  label: string;
  metric: MetricDelta;
  icon: React.ReactNode;
}) {
  const { before, after, delta, higherIsBad } = metric;
  const isFlat = delta === 0;
  const isBad = !isFlat && (higherIsBad ? delta > 0 : delta < 0);
  const isGood = !isFlat && !isBad;

  const deltaClasses = isFlat
    ? 'bg-neutral-100 text-neutral-600'
    : isBad
      ? 'bg-rose-100 text-rose-700'
      : 'bg-emerald-100 text-emerald-700';

  const Icon = isFlat ? Minus : delta > 0 ? ArrowUpRight : ArrowDownRight;
  const sign = delta > 0 ? '+' : '';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wide text-neutral-500 leading-snug">
          {label}
        </p>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 shrink-0">
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl sm:text-[1.75rem] font-semibold text-neutral-400 tabular leading-none">
          {before}
        </span>
        <ArrowRight className="h-4 w-4 text-neutral-300" />
        <span
          className={[
            'text-2xl sm:text-[1.75rem] font-semibold tabular leading-none',
            isGood ? 'text-emerald-700' : isBad ? 'text-rose-700' : 'text-neutral-900',
          ].join(' ')}
        >
          {after}
        </span>
      </div>
      <div className="mt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular ${deltaClasses}`}
        >
          <Icon className="h-3 w-3" />
          {sign}
          {delta}
        </span>
      </div>
    </div>
  );
}

function CategoryCompare({
  before,
  after,
}: {
  before: Record<Category, number>;
  after: Record<Category, number>;
}) {
  const rows = CATEGORY_NAMES.filter((c) => before[c] > 0 || after[c] > 0);
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
        By category
      </h2>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
        {rows.map((cat) => {
          const b = before[cat];
          const a = after[cat];
          const d = a - b;
          const isFlat = d === 0;
          return (
            <div
              key={cat}
              className="flex items-center justify-between border-b border-neutral-100 last:border-0 sm:border-0 py-1.5"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${categoryDot(cat)}`} />
                <span className="text-sm text-neutral-700">{cat}</span>
              </div>
              <div className="flex items-baseline gap-2 tabular">
                <span className="text-sm text-neutral-400">{b}</span>
                <ArrowRight className="h-3 w-3 text-neutral-300" />
                <span className="text-sm font-semibold text-neutral-900">
                  {a}
                </span>
                {!isFlat ? (
                  <span
                    className={`text-[11px] font-semibold ${
                      d > 0 ? 'text-neutral-700' : 'text-neutral-500'
                    }`}
                  >
                    ({d > 0 ? '+' : ''}
                    {d})
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function categoryDot(cat: Category): string {
  switch (cat) {
    case 'Necessary':
      return 'bg-neutral-800';
    case 'Preferences':
      return 'bg-sky-500';
    case 'Statistics':
      return 'bg-violet-500';
    case 'Marketing':
      return 'bg-pink-500';
    case 'Unclassified':
      return 'bg-amber-400';
  }
}

function DiffTabChip({
  active,
  tone,
  count,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'added' | 'removed' | 'changed';
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeMap: Record<typeof tone, string> = {
    added: 'bg-emerald-600 text-white',
    removed: 'bg-rose-600 text-white',
    changed: 'bg-neutral-900 text-white',
  };
  const idleMap: Record<typeof tone, string> = {
    added: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
    removed: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
    changed: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
  };
  const countBadgeIdle: Record<typeof tone, string> = {
    added: 'bg-emerald-200 text-emerald-900',
    removed: 'bg-rose-200 text-rose-900',
    changed: 'bg-neutral-200 text-neutral-700',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active ? activeMap[tone] : idleMap[tone]
      }`}
    >
      {children}
      <span
        className={`tabular text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
          active ? 'bg-white/25 text-white' : countBadgeIdle[tone]
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function useFilter<T>(items: T[], query: string, getText: (t: T) => string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => getText(it).toLowerCase().includes(q));
  }, [items, query, getText]);
}

function SimpleCookieList({
  cookies,
  query,
  emptyMessage,
  onSelect,
  tone,
}: {
  cookies: Cookie[];
  query: string;
  emptyMessage: string;
  onSelect?: (c: Cookie) => void;
  tone: 'added' | 'removed';
}) {
  const filtered = useFilter(
    cookies,
    query,
    (c) => `${c.name} ${c.provider}`,
  );

  if (cookies.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
        {emptyMessage}
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        No matches for that filter.
      </div>
    );
  }

  const rowTone =
    tone === 'added'
      ? 'border-l-emerald-400 hover:bg-emerald-50/40'
      : 'border-l-rose-400 hover:bg-rose-50/40';

  return (
    <ul className="rounded-2xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
      {filtered.map((c, i) => (
        <li
          key={`${c.name}|${c.provider}|${i}`}
          onClick={() => onSelect?.(c)}
          className={`cursor-pointer border-l-4 px-4 py-3 transition-colors ${rowTone}`}
        >
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-mono text-xs text-neutral-900 truncate">
                {c.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">{c.provider}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <TinyCategoryPill category={c.category} />
              {c.blockedPriorConsent ? (
                <TinyFlag tone="critical">
                  <AlertOctagon className="h-2.5 w-2.5" />
                  Pre-consent
                </TinyFlag>
              ) : null}
              {c.adequate === false ? (
                <TinyFlag tone="warn">
                  <ShieldOff className="h-2.5 w-2.5" />
                  Not adequate
                </TinyFlag>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChangedCookieList({
  changes,
  query,
  onSelect,
}: {
  changes: CookieChange[];
  query: string;
  onSelect?: (c: Cookie) => void;
}) {
  const filtered = useFilter(
    changes,
    query,
    (ch) => `${ch.after.name} ${ch.after.provider}`,
  );

  if (changes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-4 py-10 text-center text-sm text-neutral-500">
        No cookies changed between the two reports.
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
        No matches for that filter.
      </div>
    );
  }

  return (
    <ul className="rounded-2xl border border-neutral-200 bg-white overflow-hidden divide-y divide-neutral-100">
      {filtered.map((ch, i) => (
        <li
          key={`${ch.after.name}|${ch.after.provider}|${i}`}
          onClick={() => onSelect?.(ch.after)}
          className="cursor-pointer border-l-4 border-l-amber-400 px-4 py-3 transition-colors hover:bg-amber-50/40"
        >
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="font-mono text-xs text-neutral-900 truncate">
                {ch.after.name}
              </p>
              <p className="text-xs text-neutral-500 truncate">
                {ch.after.provider}
              </p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {ch.reasons.map((r) => (
                <ChangeBadge key={r} reason={r} change={ch} />
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChangeBadge({
  reason,
  change,
}: {
  reason: CookieChangeReason;
  change: CookieChange;
}) {
  const { before, after } = change;
  let value: string;
  switch (reason) {
    case 'category':
      value = `${before.category} → ${after.category}`;
      break;
    case 'adequacy':
      value = `${labelAdequate(before.adequate)} → ${labelAdequate(after.adequate)}`;
      break;
    case 'pre-consent':
      value = `${before.blockedPriorConsent ? 'yes' : 'no'} → ${
        after.blockedPriorConsent ? 'yes' : 'no'
      }`;
      break;
    case 'expiry':
      value = `${before.expiry} → ${after.expiry}`;
      break;
    case 'data-sent-to':
      value = `${before.dataSentTo ?? '—'} → ${after.dataSentTo ?? '—'}`;
      break;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 text-neutral-700 px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-neutral-200">
      <span className="text-neutral-500 uppercase tracking-wide text-[9px]">
        {REASON_LABEL[reason]}:
      </span>
      {value}
    </span>
  );
}

function labelAdequate(v: boolean | null): string {
  if (v === null) return '—';
  return v ? 'adequate' : 'not adequate';
}

function TinyCategoryPill({ category }: { category: Category }) {
  const map: Record<Category, string> = {
    Necessary: 'bg-neutral-100 text-neutral-700',
    Preferences: 'bg-sky-100 text-sky-800',
    Statistics: 'bg-violet-100 text-violet-800',
    Marketing: 'bg-pink-100 text-pink-800',
    Unclassified: 'bg-amber-100 text-amber-900',
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${map[category]}`}
    >
      {category}
    </span>
  );
}

function TinyFlag({
  tone,
  children,
}: {
  tone: 'critical' | 'warn';
  children: React.ReactNode;
}) {
  const map: Record<typeof tone, string> = {
    critical: 'bg-rose-100 text-rose-800 ring-rose-200',
    warn: 'bg-amber-100 text-amber-900 ring-amber-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ring-1 text-[10px] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}
