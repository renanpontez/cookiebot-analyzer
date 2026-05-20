import { useMemo, useState } from 'react';
import { Search, ShieldOff, AlertOctagon, HelpCircle } from 'lucide-react';
import type { Cookie, Category } from '../lib/parser';
import { CATEGORY_NAMES } from '../lib/parser';

interface Props {
  cookies: Cookie[];
  onSelect?: (cookie: Cookie) => void;
}

type IssueFilter = 'pre-consent' | 'not-adequate' | 'all-issues';
type Filter = 'all' | IssueFilter | Category;

const filterLabels: Record<Filter, string> = {
  all: 'All',
  'pre-consent': 'Pre-consent violations',
  'not-adequate': 'Not adequate',
  'all-issues': 'Any issue',
  Necessary: 'Necessary',
  Preferences: 'Preferences',
  Statistics: 'Statistics',
  Marketing: 'Marketing',
  Unclassified: 'Unclassified',
};

const hasAnyIssue = (c: Cookie) =>
  c.category === 'Unclassified' || c.blockedPriorConsent || c.adequate === false;

export function CookieTable({ cookies, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  // Build filter chip list dynamically — only show issue filters when there
  // are actually cookies with that issue, and only show categories that are
  // present in the data.
  const { issueFilters, categoryFilters } = useMemo(() => {
    const presentCategories = new Set<Category>(cookies.map((c) => c.category));
    const issues: Filter[] = ['all'];
    const counts = {
      preConsent: cookies.filter((c) => c.blockedPriorConsent).length,
      notAdequate: cookies.filter((c) => c.adequate === false).length,
      anyIssue: cookies.filter(hasAnyIssue).length,
    };
    if (counts.preConsent > 0) issues.push('pre-consent');
    if (counts.notAdequate > 0) issues.push('not-adequate');
    if (counts.anyIssue > 0 && (counts.preConsent > 0 || counts.notAdequate > 0)) {
      issues.push('all-issues');
    }
    const categories = CATEGORY_NAMES.filter((c) => presentCategories.has(c)) as Filter[];
    return { issueFilters: issues, categoryFilters: categories, counts };
  }, [cookies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cookies.filter((c) => {
      switch (filter) {
        case 'all':
          break;
        case 'pre-consent':
          if (!c.blockedPriorConsent) return false;
          break;
        case 'not-adequate':
          if (c.adequate !== false) return false;
          break;
        case 'all-issues':
          if (!hasAnyIssue(c)) return false;
          break;
        default:
          if (c.category !== filter) return false;
      }
      if (q && !`${c.name} ${c.provider}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [cookies, filter, query]);

  const issueCount = (f: Filter): number => {
    switch (f) {
      case 'pre-consent':
        return cookies.filter((c) => c.blockedPriorConsent).length;
      case 'not-adequate':
        return cookies.filter((c) => c.adequate === false).length;
      case 'all-issues':
        return cookies.filter(hasAnyIssue).length;
      default:
        return 0;
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
      <div className="flex flex-col gap-3 p-4 border-b border-neutral-200">
        {/* Issue filters — emphasize pre-consent visually */}
        <div className="flex flex-wrap items-center gap-1.5">
          {issueFilters.map((f) => (
            <FilterChip
              key={f}
              active={filter === f}
              tone={
                f === 'pre-consent'
                  ? 'critical'
                  : f === 'not-adequate'
                    ? 'warn'
                    : 'neutral'
              }
              count={f === 'all' ? undefined : issueCount(f)}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </FilterChip>
          ))}
        </div>

        {/* Category + search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-100 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-400 mr-1">Categories:</span>
            {categoryFilters.map((f) => (
              <FilterChip
                key={f}
                active={filter === f}
                tone="neutral"
                onClick={() => setFilter(f)}
              >
                {filterLabels[f]}
              </FilterChip>
            ))}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Cookie</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Expiry</th>
              <th className="px-4 py-3 font-medium">Data to</th>
              <th className="px-4 py-3 font-medium text-right">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-neutral-400"
                >
                  No cookies match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={`${c.name}|${c.provider}|${i}`}
                  onClick={() => onSelect?.(c)}
                  className={[
                    'cursor-pointer transition-colors',
                    c.blockedPriorConsent
                      ? 'bg-rose-50/30 hover:bg-rose-100/50'
                      : 'hover:bg-neutral-50',
                  ].join(' ')}
                >
                  <td
                    className="px-4 py-3 font-mono text-xs text-neutral-900 max-w-[180px] truncate"
                    title={c.name}
                  >
                    {c.name}
                  </td>
                  <td
                    className="px-4 py-3 text-neutral-700 max-w-[180px] truncate"
                    title={c.provider}
                  >
                    {c.provider}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryPill category={c.category} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{c.type}</td>
                  <td className="px-4 py-3 text-neutral-600 tabular">{c.expiry}</td>
                  <td className="px-4 py-3 text-neutral-600">{c.dataSentTo ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1 flex-wrap">
                      {c.blockedPriorConsent ? (
                        <Flag
                          tone="critical"
                          title="Cookie fires before consent — your site code needs to gate this script."
                          icon={<AlertOctagon className="h-3 w-3" />}
                          label="Pre-consent"
                        />
                      ) : null}
                      {c.adequate === false ? (
                        <Flag
                          tone="warn"
                          title="Data transfer to non-adequate country (GDPR)"
                          icon={<ShieldOff className="h-3 w-3" />}
                          label="Not adequate"
                        />
                      ) : null}
                      {c.category === 'Unclassified' ? (
                        <Flag
                          tone="info"
                          title="Needs manual classification in Cookiebot dashboard"
                          icon={<HelpCircle className="h-3 w-3" />}
                          label="Unclassified"
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 border-t border-neutral-200 text-xs text-neutral-500 flex items-center justify-between">
        <span>
          Showing {filtered.length} of {cookies.length} cookies
          {onSelect ? (
            <span className="hidden sm:inline text-neutral-400">
              {' · click a row for full details'}
            </span>
          ) : null}
        </span>
        {filter !== 'all' ? (
          <button
            type="button"
            onClick={() => {
              setFilter('all');
              setQuery('');
            }}
            className="text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
          >
            Reset filters
          </button>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  tone,
  count,
  onClick,
  children,
}: {
  active: boolean;
  tone: 'neutral' | 'warn' | 'critical';
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors';
  const activeStyles: Record<typeof tone, string> = {
    neutral: 'bg-neutral-900 text-white',
    warn: 'bg-amber-500 text-white',
    critical: 'bg-rose-600 text-white',
  };
  const idleStyles: Record<typeof tone, string> = {
    neutral: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
    warn: 'bg-amber-100 text-amber-900 hover:bg-amber-200',
    critical: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${active ? activeStyles[tone] : idleStyles[tone]}`}
    >
      {children}
      {count !== undefined && count > 0 ? (
        <span
          className={[
            'tabular text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            active
              ? 'bg-white/25 text-white'
              : tone === 'critical'
                ? 'bg-rose-200 text-rose-900'
                : tone === 'warn'
                  ? 'bg-amber-200 text-amber-900'
                  : 'bg-neutral-200 text-neutral-700',
          ].join(' ')}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function CategoryPill({ category }: { category: Category }) {
  const map: Record<Category, string> = {
    Necessary: 'bg-neutral-100 text-neutral-700',
    Preferences: 'bg-sky-100 text-sky-800',
    Statistics: 'bg-violet-100 text-violet-800',
    Marketing: 'bg-pink-100 text-pink-800',
    Unclassified: 'bg-amber-100 text-amber-900',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${map[category]}`}
    >
      {category}
    </span>
  );
}

function Flag({
  tone,
  title,
  icon,
  label,
}: {
  tone: 'critical' | 'warn' | 'info';
  title: string;
  icon: React.ReactNode;
  label: string;
}) {
  const map: Record<typeof tone, string> = {
    critical: 'bg-rose-100 text-rose-800 ring-rose-200',
    warn: 'bg-amber-100 text-amber-900 ring-amber-200',
    info: 'bg-sky-100 text-sky-800 ring-sky-200',
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ring-1 text-[10px] font-medium ${map[tone]}`}
    >
      {icon}
      {label}
    </span>
  );
}
