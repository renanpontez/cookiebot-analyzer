import type { Category, Cookie, ParseResult } from './parser';

export type CookieChangeReason =
  | 'category'
  | 'adequacy'
  | 'pre-consent'
  | 'expiry'
  | 'data-sent-to';

export interface CookieChange {
  before: Cookie;
  after: Cookie;
  reasons: CookieChangeReason[];
}

export interface MetricDelta {
  before: number;
  after: number;
  delta: number;
  /** true if the metric moving up is a bad outcome (e.g. violations) */
  higherIsBad: boolean;
}

export interface CategoryDeltas {
  before: Record<Category, number>;
  after: Record<Category, number>;
}

export interface ComparisonResult {
  past: ParseResult;
  current: ParseResult;
  /** Cookies present in current but not past, keyed by identity. */
  added: Cookie[];
  /** Cookies present in past but not current. */
  removed: Cookie[];
  /** Cookies present in both, with a meaningful field change. */
  changed: CookieChange[];
  /** Present in both without differences (count only — the list can be huge). */
  keptCount: number;
  metrics: {
    total: MetricDelta;
    unclassified: MetricDelta;
    notBlockedPriorConsent: MetricDelta;
    notAdequate: MetricDelta;
  };
  categories: CategoryDeltas;
  /** True when both reports carry a domain and they don't match. */
  domainMismatch: boolean;
  /** True when past's scanDate is newer than current's (roles will be swapped). */
  scanDateSwapped: boolean;
}

const identity = (c: Cookie): string =>
  `${c.name.toLowerCase()}|${c.provider.toLowerCase()}|${c.type.toLowerCase()}`;

const toMap = (cookies: Cookie[]): Map<string, Cookie> => {
  const m = new Map<string, Cookie>();
  for (const c of cookies) {
    const k = identity(c);
    // First occurrence wins — cookie scan reports rarely dedupe by these three
    // fields, but if they do, we treat later ones as duplicates.
    if (!m.has(k)) m.set(k, c);
  }
  return m;
};

const changeReasons = (before: Cookie, after: Cookie): CookieChangeReason[] => {
  const reasons: CookieChangeReason[] = [];
  if (before.category !== after.category) reasons.push('category');
  if (before.adequate !== after.adequate) reasons.push('adequacy');
  if (before.blockedPriorConsent !== after.blockedPriorConsent) {
    reasons.push('pre-consent');
  }
  if (before.expiry !== after.expiry) reasons.push('expiry');
  if ((before.dataSentTo ?? '') !== (after.dataSentTo ?? '')) {
    reasons.push('data-sent-to');
  }
  return reasons;
};

/**
 * Parse Cookiebot's DD/MM/YYYY date into a comparable number, or null if we
 * can't. We only use this to decide "past vs current" ordering — falls back
 * to caller-provided order if parsing fails on either side.
 */
export function parseCookiebotDate(s: string | null): number | null {
  if (!s) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  const year = Number(m[3]);
  return Date.UTC(year, month, day);
}

const metric = (
  before: number,
  after: number,
  higherIsBad: boolean,
): MetricDelta => ({ before, after, delta: after - before, higherIsBad });

/**
 * Diff two parsed reports. Caller passes them in upload order; the function
 * decides which is "past" vs "current" by scan date, falling back to input
 * order.
 */
export function compareReports(
  first: ParseResult,
  second: ParseResult,
): ComparisonResult {
  const dFirst = parseCookiebotDate(first.summary.scanDate);
  const dSecond = parseCookiebotDate(second.summary.scanDate);

  let past = first;
  let current = second;
  let swapped = false;
  if (dFirst !== null && dSecond !== null && dFirst > dSecond) {
    past = second;
    current = first;
    swapped = true;
  }

  const pastMap = toMap(past.cookies);
  const currentMap = toMap(current.cookies);

  const added: Cookie[] = [];
  const removed: Cookie[] = [];
  const changed: CookieChange[] = [];
  let keptCount = 0;

  for (const [k, cur] of currentMap) {
    const prev = pastMap.get(k);
    if (!prev) {
      added.push(cur);
    } else {
      const reasons = changeReasons(prev, cur);
      if (reasons.length > 0) {
        changed.push({ before: prev, after: cur, reasons });
      } else {
        keptCount += 1;
      }
    }
  }
  for (const [k, prev] of pastMap) {
    if (!currentMap.has(k)) removed.push(prev);
  }

  const p = past.spreadsheetRow;
  const c = current.spreadsheetRow;

  const domainMismatch =
    !!past.summary.domain &&
    !!current.summary.domain &&
    past.summary.domain.trim().toLowerCase() !==
      current.summary.domain.trim().toLowerCase();

  return {
    past,
    current,
    added,
    removed,
    changed,
    keptCount,
    metrics: {
      total: metric(p.totalTrackers ?? 0, c.totalTrackers ?? 0, false),
      unclassified: metric(p.unclassified, c.unclassified, true),
      notBlockedPriorConsent: metric(
        p.notBlockedPriorConsent,
        c.notBlockedPriorConsent,
        true,
      ),
      notAdequate: metric(p.notAdequate, c.notAdequate, true),
    },
    categories: {
      before: past.categoryCounts,
      after: current.categoryCounts,
    },
    domainMismatch,
    scanDateSwapped: swapped,
  };
}
