/**
 * Cookiebot scan-report HTML parser (TypeScript port of the Python reference
 * implementation used in the cookiebot-audit Claude skill).
 *
 * Cookiebot HTML structure (after tag-stripping):
 *
 *   Summary block at top:
 *     "Scan date:" / "Domain name:" / "Server location:"
 *     "Cookies, in total:" / "New cookies:" / "Removed cookies:"
 *     "Scan result"  + free text (may include "N cookies are unclassified")
 *
 *   For each category, the literal sequence:
 *     "Category:" / "<Necessary|Preferences|Statistics|Marketing|Unclassified>"
 *                 / "(<count>)" / <category description>
 *     "COOKIE NAME" / "PROVIDER" / "TYPE" / "MAXIMUM STORAGE DURATION"
 *     <rows...>
 *
 *   After the last category, Cookiebot adds redundant "New cookies (N)"
 *   and "Removed cookies (N)" sections — we skip these.
 *
 *   Per-cookie row labels:
 *     "First found URL:" / "Cookie purpose description:"
 *     "Initiator:" / "Source:"
 *     "Data is sent to:" / "( adequate )" or "( not adequate )"
 *     "Adequate country under GDPR (EU)"
 *     "Blocked until accepted by user:"   <- pre-consent violation flag
 *
 * Cookie rows are anchored by the TYPE/EXPIRY pattern in cells 3 and 4:
 * the TYPE is always one of HTTP / HTML / Pixel / etc; the EXPIRY matches
 * Session / Persistent / "N days" / "N year" patterns.
 */

export const CATEGORY_NAMES = [
  'Necessary',
  'Preferences',
  'Statistics',
  'Marketing',
  'Unclassified',
] as const;

export type Category = (typeof CATEGORY_NAMES)[number];

const POST_CATEGORY_SECTIONS = new Set(['New cookies', 'Removed cookies']);

const LABELS_WITH_VALUE = [
  'First found URL:',
  'Cookie purpose description:',
  'Initiator:',
  'Source:',
  'Data is sent to:',
  'Blocked until accepted by user:',
] as const;

const STANDALONE_MARKERS = ['Adequate country under GDPR'] as const;

const TYPE_VALUES = new Set([
  'HTTP',
  'HTML',
  'Pixel',
  'HTTP Cookie',
  'HTML Local Storage',
  'Indexed Database',
  'Session Storage',
  'IndexedDB',
]);

const EXPIRY_RE =
  /^(Session|Persistent|\d+\s+(second|minute|hour|day|week|month|year)s?|\d+\s+(seconds|minutes|hours|days|weeks|months|years))$/i;

export interface Cookie {
  name: string;
  provider: string;
  type: string;
  expiry: string;
  category: Category;
  firstFoundUrl: string | null;
  purpose: string | null;
  initiator: string | null;
  source: string | null;
  dataSentTo: string | null;
  adequate: boolean | null;
  blockedPriorConsent: boolean;
}

export interface ParseSummary {
  scanDate: string | null;
  domain: string | null;
  serverLocation: string | null;
  totalCookies: number | null;
  newCookies: number | null;
  removedCookies: number | null;
  unclassifiedCookiesFromSummary: number | null;
  googleConsentMode: {
    riskSummary: string | null;
    gcmConsentDefault: string | null;
    cmpToGcmActive: string | null;
    googleTrackersBlocked: string | null;
  };
  scanResultText: string | null;
}

export type Status = 'looks good' | 'needs improvement' | 'error detected';

export interface SpreadsheetRow {
  domain: string | null;
  scanDate: string | null;
  totalTrackers: number | null;
  new: number;
  removed: number;
  unclassified: number;
  notBlockedPriorConsent: number;
  notAdequate: number;
  status: Status;
}

export interface ParseResult {
  spreadsheetRow: SpreadsheetRow;
  categoryCounts: Record<Category, number>;
  categoryCountsParsed: Record<Category, number>;
  issuesSummary: string[];
  summary: ParseSummary;
  cookies: Cookie[];
}

// ---------------------------------------------------------------------------
// HTML → cleaned list of visible-text fragments
// ---------------------------------------------------------------------------

const TAG_RE = /<[^>]+>/gs;
const WS_RE = /[ \t\r\n ]+/g;

function decodeEntities(s: string): string {
  // Lightweight decoder for the entities Cookiebot uses.
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)));
}

export function htmlToLines(raw: string): string[] {
  let s = raw;
  s = s.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/src="data:image[^"]*"/gi, 'src=""');
  s = s.replace(/<\s*br\s*\/?\s*>/gi, '\n');
  s = s.replace(/<\/\s*(tr|td|div|p|li)\s*>/gi, '\n');
  s = s.replace(TAG_RE, ' ');
  s = decodeEntities(s);

  const out: string[] = [];
  for (const chunk of s.split('\n')) {
    const clean = chunk.replace(WS_RE, ' ').trim();
    if (clean) out.push(clean);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Summary block
// ---------------------------------------------------------------------------

function valueAfter(lines: string[], idx: number): string {
  return idx + 1 < lines.length ? lines[idx + 1] : '';
}

function parseInt0(s: string): number | null {
  const m = /\d+/.exec(s);
  return m ? Number(m[0]) : null;
}

function emptySummary(): ParseSummary {
  return {
    scanDate: null,
    domain: null,
    serverLocation: null,
    totalCookies: null,
    newCookies: null,
    removedCookies: null,
    unclassifiedCookiesFromSummary: null,
    googleConsentMode: {
      riskSummary: null,
      gcmConsentDefault: null,
      cmpToGcmActive: null,
      googleTrackersBlocked: null,
    },
    scanResultText: null,
  };
}

export function parseSummary(lines: string[]): ParseSummary {
  const out = emptySummary();

  const intFields: Record<string, (n: number | null) => void> = {
    'Cookies, in total:': (n) => (out.totalCookies = n),
    'New cookies:': (n) => (out.newCookies = n),
    'Removed cookies:': (n) => (out.removedCookies = n),
  };
  const strFields: Record<string, (v: string) => void> = {
    'Scan date:': (v) => (out.scanDate = v),
    'Domain name:': (v) => (out.domain = v),
    'Server location:': (v) => (out.serverLocation = v),
  };
  const gcmFields: Record<string, (v: string) => void> = {
    'Risk Summary:': (v) => (out.googleConsentMode.riskSummary = v),
    'GCM consent parameters set as "Default":': (v) =>
      (out.googleConsentMode.gcmConsentDefault = v),
    'CMP to GCM consent signal is active:': (v) =>
      (out.googleConsentMode.cmpToGcmActive = v),
    'Google trackers blocked prior consent:': (v) =>
      (out.googleConsentMode.googleTrackersBlocked = v),
  };

  const horizon = Math.min(lines.length, 200);
  for (let i = 0; i < horizon; i += 1) {
    const ln = lines[i];
    if (intFields[ln]) {
      intFields[ln](parseInt0(valueAfter(lines, i)));
    } else if (strFields[ln]) {
      strFields[ln](valueAfter(lines, i));
    } else if (gcmFields[ln]) {
      gcmFields[ln](valueAfter(lines, i));
    } else if (ln.startsWith('Scan result')) {
      const tail = valueAfter(lines, i);
      out.scanResultText = tail;
      const m = /(\d+)\s+cookies?\s+are\s+unclassified/i.exec(tail);
      if (m) out.unclassifiedCookiesFromSummary = Number(m[1]);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// Category boundaries
// ---------------------------------------------------------------------------

interface CategoryBoundary {
  category: Category;
  start: number;
  end: number;
  declared: number;
}

function findCategoryBoundaries(lines: string[]): CategoryBoundary[] {
  type Boundary = { tag: 'CAT' | 'STOP'; category?: Category; declared?: number; idx: number };
  const boundaries: Boundary[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const ln = lines[i];
    if (ln === 'Category:' && i + 2 < lines.length) {
      const cat = lines[i + 1] as Category;
      const countToken = lines[i + 2];
      const m = /^\((\d+)\)$/.exec(countToken);
      if ((CATEGORY_NAMES as readonly string[]).includes(cat) && m) {
        boundaries.push({ tag: 'CAT', category: cat, declared: Number(m[1]), idx: i + 1 });
      }
    } else if (
      POST_CATEGORY_SECTIONS.has(ln) &&
      i + 1 < lines.length &&
      /^\(\d+\)$/.test(lines[i + 1])
    ) {
      boundaries.push({ tag: 'STOP', idx: i });
    }
  }

  const result: CategoryBoundary[] = [];
  for (let k = 0; k < boundaries.length; k += 1) {
    const b = boundaries[k];
    if (b.tag !== 'CAT') continue;
    const end = k + 1 < boundaries.length ? boundaries[k + 1].idx : lines.length;
    result.push({ category: b.category!, start: b.idx, end, declared: b.declared! });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Row detection (TYPE/EXPIRY anchored)
// ---------------------------------------------------------------------------

function isLabelWithValue(s: string): boolean {
  return LABELS_WITH_VALUE.some((p) => s.startsWith(p));
}

function isStandaloneMarker(s: string): boolean {
  return STANDALONE_MARKERS.some((p) => s.startsWith(p));
}

function isAdequacyParen(s: string): 'adequate' | 'not_adequate' | null {
  if (/^\(\s*not\s+adequate\s*\)$/i.test(s)) return 'not_adequate';
  if (/^\(\s*adequate\s*\)$/i.test(s)) return 'adequate';
  return null;
}

function isTypeValue(s: string): boolean {
  return TYPE_VALUES.has(s);
}

function isExpiryValue(s: string): boolean {
  return EXPIRY_RE.test(s);
}

interface RowIdx {
  nameIdx: number;
  providerIdx: number;
  typeIdx: number;
  expiryIdx: number;
}

function findCookieRows(lines: string[], start: number, end: number): RowIdx[] {
  const rows: RowIdx[] = [];
  let window: number[] = [];
  let expectingValue = false;
  let i = start;

  while (i < end) {
    const ln = lines[i];

    if (expectingValue) {
      expectingValue = false;
      if (isLabelWithValue(ln) || isStandaloneMarker(ln) || isAdequacyParen(ln)) {
        // re-process this line below
      } else {
        i += 1;
        continue;
      }
    }

    if (isLabelWithValue(ln)) {
      expectingValue = true;
      window = [];
      i += 1;
      continue;
    }

    if (isStandaloneMarker(ln) || isAdequacyParen(ln)) {
      window = [];
      i += 1;
      continue;
    }

    window.push(i);
    if (window.length >= 4) {
      const cand = window.slice(-4);
      const typeIdx = cand[2];
      const expiryIdx = cand[3];
      if (isTypeValue(lines[typeIdx]) && isExpiryValue(lines[expiryIdx])) {
        rows.push({
          nameIdx: cand[0],
          providerIdx: cand[1],
          typeIdx,
          expiryIdx,
        });
        window = [];
      } else {
        window = window.slice(1);
      }
    }
    i += 1;
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Per-cookie parsing
// ---------------------------------------------------------------------------

function parseCookies(lines: string[]): { cookies: Cookie[]; declaredCounts: Record<Category, number> } {
  const cookies: Cookie[] = [];
  const declaredCounts: Record<Category, number> = {
    Necessary: 0,
    Preferences: 0,
    Statistics: 0,
    Marketing: 0,
    Unclassified: 0,
  };

  for (const { category, start, end, declared } of findCategoryBoundaries(lines)) {
    declaredCounts[category] = declared;

    // Find table header.
    let headerIdx: number | null = null;
    for (let i = start; i + 3 < end; i += 1) {
      if (
        lines[i] === 'COOKIE NAME' &&
        lines[i + 1] === 'PROVIDER' &&
        lines[i + 2] === 'TYPE' &&
        lines[i + 3] === 'MAXIMUM STORAGE DURATION'
      ) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === null) continue;

    const bodyStart = headerIdx + 4;
    const rows = findCookieRows(lines, bodyStart, end);

    for (let k = 0; k < rows.length; k += 1) {
      const { nameIdx, providerIdx, typeIdx, expiryIdx } = rows[k];
      const metaStart = expiryIdx + 1;
      const metaEnd = k + 1 < rows.length ? rows[k + 1].nameIdx : end;

      const cookie: Cookie = {
        name: lines[nameIdx],
        provider: lines[providerIdx],
        type: lines[typeIdx],
        expiry: lines[expiryIdx],
        category,
        firstFoundUrl: null,
        purpose: null,
        initiator: null,
        source: null,
        dataSentTo: null,
        adequate: null,
        blockedPriorConsent: false,
      };

      let mi = metaStart;
      while (mi < metaEnd) {
        const cur = lines[mi];
        if (cur.startsWith('Initiator:')) {
          cookie.initiator = (lines[mi + 1] ?? '').trim();
          mi += 2;
          continue;
        }
        if (cur.startsWith('Source:')) {
          cookie.source = (lines[mi + 1] ?? '').trim();
          mi += 2;
          continue;
        }
        if (cur.startsWith('Data is sent to:')) {
          cookie.dataSentTo = (lines[mi + 1] ?? '').trim();
          mi += 2;
          continue;
        }
        if (cur.startsWith('First found URL:')) {
          cookie.firstFoundUrl = (lines[mi + 1] ?? '').trim();
          mi += 2;
          continue;
        }
        if (cur.startsWith('Cookie purpose description:')) {
          cookie.purpose = (lines[mi + 1] ?? '').trim();
          mi += 2;
          continue;
        }
        if (cur.startsWith('Blocked until accepted by user:')) {
          cookie.blockedPriorConsent = true;
          mi += 2;
          continue;
        }
        if (cur.startsWith('Adequate country under GDPR')) {
          if (cookie.adequate === null) cookie.adequate = true;
          mi += 1;
          continue;
        }
        const paren = isAdequacyParen(cur);
        if (paren === 'not_adequate') {
          cookie.adequate = false;
          mi += 1;
          continue;
        }
        if (paren === 'adequate') {
          cookie.adequate = true;
          mi += 1;
          continue;
        }
        mi += 1;
      }

      cookies.push(cookie);
    }
  }

  return { cookies, declaredCounts };
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function aggregate(
  summary: ParseSummary,
  cookies: Cookie[],
  declaredCounts: Record<Category, number>,
): ParseResult {
  const notAdequate = cookies.filter((c) => c.adequate === false).length;
  const preConsent = cookies.filter((c) => c.blockedPriorConsent).length;

  const unclassified =
    summary.unclassifiedCookiesFromSummary !== null
      ? summary.unclassifiedCookiesFromSummary
      : declaredCounts.Unclassified;

  let status: Status;
  if (preConsent > 0 || unclassified > 5) status = 'error detected';
  else if (notAdequate > 0 || unclassified > 0) status = 'needs improvement';
  else status = 'looks good';

  const notes: string[] = [];
  if (preConsent > 0)
    notes.push(`${preConsent} cookies fired before consent (Cookiebot blocked them)`);
  if (notAdequate > 0)
    notes.push(`${notAdequate} cookies transfer data to non-adequate countries`);
  if (unclassified > 0)
    notes.push(`${unclassified} unclassified cookies require manual classification`);

  const categoryCountsParsed: Record<Category, number> = {
    Necessary: 0,
    Preferences: 0,
    Statistics: 0,
    Marketing: 0,
    Unclassified: 0,
  };
  for (const c of cookies) categoryCountsParsed[c.category] += 1;

  return {
    spreadsheetRow: {
      domain: summary.domain,
      scanDate: summary.scanDate,
      totalTrackers: summary.totalCookies,
      new: summary.newCookies ?? 0,
      removed: summary.removedCookies ?? 0,
      unclassified,
      notBlockedPriorConsent: preConsent,
      notAdequate,
      status,
    },
    categoryCounts: declaredCounts,
    categoryCountsParsed,
    issuesSummary: notes,
    summary,
    cookies,
  };
}

// ---------------------------------------------------------------------------
// Structured report (2026+): class-based markup, label and value share a line
//
//   .hero-domain          "Scan date: <strong>…</strong><br>Domain name: …"
//   .scan-result-text     free text + .unclassified-warn
//   .cat-title-row        .cat-name "Category: Necessary" + .cat-badge "25"
//                         (also "New cookies (N)" / "Removed cookies (N)" /
//                         "Unknown subdomains" — not categories, skipped)
//   table.cookie-table    rows: [.cookie-name + <b>Label:</b> value…,
//                                provider, type, expiry]
//   .gcm-block            .gcm-summary-status / .gcm-sub-label + .gcm-sub-status
// ---------------------------------------------------------------------------

function isStructuredReport(raw: string): boolean {
  return /class="cookie-table"/.test(raw) && /class="cat-title-row"/.test(raw);
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? '').replace(WS_RE, ' ').trim();
}


/**
 * Collects `<b>Label:</b> value` pairs; a value runs until the next `<b>`.
 * Bold text without a trailing colon (e.g. `<b>via</b> url` after Source)
 * continues the previous field.
 */
function labeledFields(cell: Element): Map<string, string> {
  const fields = new Map<string, string>();
  let label: string | null = null;
  for (const b of Array.from(cell.querySelectorAll('b'))) {
    const parts: string[] = [];
    for (let n = b.nextSibling; n && n.nodeName !== 'B'; n = n.nextSibling) {
      parts.push(n.nodeName === 'BR' ? ' ' : (n.textContent ?? ''));
    }
    const value = parts.join('').replace(WS_RE, ' ').trim();
    const bold = text(b);
    if (bold.endsWith(':') || label === null) {
      label = bold;
      fields.set(label, value);
    } else {
      fields.set(label, `${fields.get(label) ?? ''} ${bold} ${value}`.trim());
    }
  }
  return fields;
}

function parseStructuredSummary(doc: Document): ParseSummary {
  const out = emptySummary();

  const hero = doc.querySelector('.hero-domain');
  if (hero) {
    for (const strong of Array.from(hero.querySelectorAll('strong'))) {
      const label = (strong.previousSibling?.textContent ?? '').trim();
      const value = text(strong);
      if (label === 'Scan date:') out.scanDate = value;
      else if (label === 'Domain name:') out.domain = value;
      else if (label === 'Server location:') out.serverLocation = value;
      else if (label === 'Cookies, in total:') out.totalCookies = parseInt0(value);
      else if (label === 'New cookies:') out.newCookies = parseInt0(value);
      else if (label === 'Removed cookies:') out.removedCookies = parseInt0(value);
    }
  }

  const scanResult = doc.querySelector('.scan-result-text');
  if (scanResult) {
    const lines = Array.from(scanResult.childNodes)
      .map((n) => (n.textContent ?? '').trim())
      .filter(Boolean);
    out.scanResultText = lines[0] ?? null;
    const m = /(\d+)\s+cookies?\s+(are|is)\s+unclassified/i.exec(text(scanResult));
    if (m) out.unclassifiedCookiesFromSummary = Number(m[1]);
  }

  const gcm = doc.querySelector('.gcm-block');
  if (gcm) {
    const risk = /Risk Summary:\s*(.+)$/i.exec(text(gcm.querySelector('.gcm-summary-status')));
    if (risk) out.googleConsentMode.riskSummary = risk[1];
    for (const row of Array.from(gcm.querySelectorAll('.gcm-sub-row'))) {
      const label = text(row.querySelector('.gcm-sub-label'));
      const value = text(row.querySelector('.gcm-sub-status'));
      if (label.startsWith('GCM consent parameters set as'))
        out.googleConsentMode.gcmConsentDefault = value;
      else if (label.startsWith('CMP to GCM consent signal'))
        out.googleConsentMode.cmpToGcmActive = value;
      else if (label.startsWith('Google trackers blocked prior consent'))
        out.googleConsentMode.googleTrackersBlocked = value;
    }
  }

  return out;
}

function parseStructuredRow(tr: Element, category: Category): Cookie | null {
  const cells = Array.from(tr.children).filter((c) => c.tagName === 'TD');
  if (cells.length < 4) return null;
  const [main, provider, type, expiry] = cells;
  const name = text(main.querySelector('.cookie-name'));
  if (!name) return null;

  const fields = labeledFields(main);
  const field = (label: string): string | null => fields.get(label) || null;

  let adequate: boolean | null = null;
  if (main.querySelector('.adequacy-risk')) adequate = false;
  else if (main.querySelector('.adequacy-ok')) adequate = true;

  const sentTo = field('Data is sent to:');
  // Older reports flagged violations by the label's presence alone; this
  // layout prints an explicit Yes/No, where "No" means it fired pre-consent.
  const blocked = fields.get('Blocked until accepted by user:');

  return {
    name,
    provider: text(provider),
    type: text(type),
    expiry: text(expiry),
    category,
    firstFoundUrl: field('First found URL:'),
    purpose: field('Cookie purpose description:'),
    initiator: field('Initiator:'),
    source: field('Source:'),
    dataSentTo: sentTo ? sentTo.replace(/\s*\([^)]*\)\s*$/, '') || null : null,
    adequate,
    blockedPriorConsent: blocked !== undefined && !/^yes$/i.test(blocked),
  };
}

function parseStructuredCookies(doc: Document): {
  cookies: Cookie[];
  declaredCounts: Record<Category, number>;
} {
  const cookies: Cookie[] = [];
  const declaredCounts: Record<Category, number> = {
    Necessary: 0,
    Preferences: 0,
    Statistics: 0,
    Marketing: 0,
    Unclassified: 0,
  };

  let current: Category | null = null;
  for (const el of Array.from(doc.querySelectorAll('.cat-title-row, table.cookie-table'))) {
    if (el.classList.contains('cat-title-row')) {
      const m = /^Category:\s*(\w+)/.exec(text(el.querySelector('.cat-name')));
      const cat = m?.[1];
      current = cat && (CATEGORY_NAMES as readonly string[]).includes(cat) ? (cat as Category) : null;
      if (current) declaredCounts[current] = parseInt0(text(el.querySelector('.cat-badge'))) ?? 0;
      continue;
    }
    if (!current) continue;
    for (const tr of Array.from(el.querySelectorAll('tbody > tr'))) {
      const cookie = parseStructuredRow(tr, current);
      if (cookie) cookies.push(cookie);
    }
  }

  return { cookies, declaredCounts };
}

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function parseCookiebotHtml(raw: string): ParseResult {
  if (isStructuredReport(raw)) {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    const { cookies, declaredCounts } = parseStructuredCookies(doc);
    return aggregate(parseStructuredSummary(doc), cookies, declaredCounts);
  }

  const lines = htmlToLines(raw);
  const summary = parseSummary(lines);
  const { cookies, declaredCounts } = parseCookies(lines);
  return aggregate(summary, cookies, declaredCounts);
}

export function formatSpreadsheetTsv(row: SpreadsheetRow): string {
  return [
    row.scanDate ?? '',
    row.domain ?? '',
    row.totalTrackers ?? '',
    row.new,
    row.removed,
    row.unclassified,
    row.notBlockedPriorConsent,
    row.notAdequate,
    row.status,
  ].join('\t');
}

// ---------------------------------------------------------------------------
// Ticket summary + recommended actions
// ---------------------------------------------------------------------------

export interface RecommendedAction {
  id: 'pre-consent' | 'unclassified' | 'adequacy' | 'all-clear';
  severity: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  intro: string;
  steps: string[];
  link?: { href: string; label: string };
}

/**
 * Top N cookies that contribute the most concerning issues. Pre-consent
 * violations are ranked first because they are the only finding that
 * requires a code-level fix on the audited site.
 */
export function topViolators(cookies: Cookie[], limit = 5): Cookie[] {
  const score = (c: Cookie): number => {
    let s = 0;
    if (c.blockedPriorConsent) s += 100; // most important
    if (c.adequate === false) s += 10;
    if (c.category === 'Unclassified') s += 1;
    return s;
  };
  return [...cookies]
    .filter((c) => score(c) > 0)
    .sort((a, b) => score(b) - score(a))
    .slice(0, limit);
}

export function recommendedActions(result: ParseResult): RecommendedAction[] {
  const r = result.spreadsheetRow;
  const actions: RecommendedAction[] = [];

  if (r.notBlockedPriorConsent > 0) {
    actions.push({
      id: 'pre-consent',
      severity: 'critical',
      title: `Fix ${r.notBlockedPriorConsent} pre-consent violation${
        r.notBlockedPriorConsent === 1 ? '' : 's'
      }`,
      intro:
        "These scripts fire before the user grants consent and " +
        "Cookiebot's auto-blocker isn't catching them. They need to be " +
        'gated at the source.',
      steps: [
        'Locate the `<script>` tag for each violating cookie in your site code.',
        'Change its `type="text/javascript"` to `type="text/plain"` so the browser does not auto-execute it.',
        'Add `data-cookieconsent="preferences,statistics,marketing"` (use the categories that apply).',
        'Cookiebot will then enable each script only after the user grants the matching consent.',
      ],
      link: {
        href: 'https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking',
        label: 'Cookiebot docs: manual cookie blocking',
      },
    });
  }

  if (r.unclassified > 0) {
    actions.push({
      id: 'unclassified',
      severity: 'warning',
      title: `Classify ${r.unclassified} unclassified cookie${
        r.unclassified === 1 ? '' : 's'
      }`,
      intro:
        "Unclassified cookies aren't in Cookiebot's repository, so they " +
        "won't be blocked automatically and visitors can't give informed " +
        'consent. Manual classification is required.',
      steps: [
        'Open Cookiebot Admin → Cookies and Trackers.',
        'Scroll to "Discovered cookies and trackers".',
        'Click the `>` icon next to each unclassified entry.',
        'Pick the right category (Necessary / Preferences / Statistics / Marketing) and add a plain-language purpose.',
        "For first-party cookies you don't recognize, ask your dev team. For third-party, check the provider's docs.",
        'Click "Save changes".',
      ],
      link: {
        href: 'https://support.cookiebot.com/hc/en-us/articles/360003735214-How-do-I-classify-unclassified-cookies',
        label: 'Cookiebot docs: classify unclassified cookies',
      },
    });
  }

  if (r.notAdequate > 0) {
    actions.push({
      id: 'adequacy',
      severity: 'warning',
      title: `Review ${r.notAdequate} non-adequate data transfer${
        r.notAdequate === 1 ? '' : 's'
      }`,
      intro:
        'These cookies send personal data to a third country without an ' +
        'EU adequacy decision (most commonly the US). Per Cookiebot, you ' +
        'have two paths:',
      steps: [
        '**Option 1 — Remove:** delete the cookie from your site (best for low-value trackers).',
        '**Option 2 — Keep with explicit consent:** enable explicit-consent mode and update your banner to call out the transfer risk so users can make an informed choice.',
        'Either way, document your legal basis (e.g. Standard Contractual Clauses) in your privacy notice.',
      ],
      link: {
        href: 'https://support.cookiebot.com/hc/en-us/articles/360004205093-Send-personal-data-to-adequate-3rd-countries',
        label: 'Cookiebot docs: adequate vs non-adequate transfers',
      },
    });
  }

  if (actions.length === 0) {
    actions.push({
      id: 'all-clear',
      severity: 'success',
      title: 'No compliance issues detected',
      intro:
        'All cookies are properly classified, blocked prior to consent, ' +
        'and transferred only to adequate countries.',
      steps: [
        'Re-run the audit next month to confirm nothing regressed.',
      ],
    });
  }

  return actions;
}

function monthYear(scanDate: string | null): string {
  if (!scanDate) return 'Cookie Audit';
  // Cookiebot date format is DD/MM/YYYY
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(scanDate);
  if (!m) return scanDate;
  const monthIdx = Number(m[2]) - 1;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[monthIdx] ?? '?'} ${m[3]}`;
}

/**
 * Markdown-formatted summary intended to paste straight into a Jira/Linear
 * ticket. Keep it scannable: under ~30 lines.
 */
export function formatTicketSummary(result: ParseResult): string {
  const r = result.spreadsheetRow;
  const lines: string[] = [];

  lines.push(`## ${r.domain ?? 'Cookie audit'} — ${monthYear(r.scanDate)}`);
  lines.push('');

  const statusEmoji = r.status === 'looks good' ? '✅' : r.status === 'needs improvement' ? '⚠️' : '❗';
  const statusLabel = r.status.replace(/^./, (c) => c.toUpperCase());
  lines.push(`**Status:** ${statusEmoji} ${statusLabel}`);
  lines.push('');

  lines.push('**Counts**');
  lines.push(`- Total trackers: ${r.totalTrackers ?? '—'}`);
  lines.push(`- New: ${r.new}  ·  Removed: ${r.removed}`);
  lines.push(`- Unclassified: ${r.unclassified}`);
  lines.push(`- Pre-consent violations: ${r.notBlockedPriorConsent}`);
  lines.push(`- Not adequate (GDPR): ${r.notAdequate}`);
  lines.push('');

  lines.push('**Findings**');
  let any = false;
  if (r.notBlockedPriorConsent > 0) {
    lines.push(
      `❗ **${r.notBlockedPriorConsent} cookies fire before consent.** ` +
        "Cookiebot's auto-blocking isn't catching them. Gate each script " +
        'with `type="text/plain"` + `data-cookieconsent="…"` ' +
        '([docs](https://support.cookiebot.com/hc/en-us/articles/4405978132242-Manual-cookie-blocking)).',
    );
    any = true;
  }
  if (r.notAdequate > 0) {
    lines.push(
      `❗ **${r.notAdequate} cookies transfer data to non-adequate countries.** ` +
        'Either remove the cookie or update the consent banner to flag the ' +
        'transfer risk explicitly ' +
        '([docs](https://support.cookiebot.com/hc/en-us/articles/360004205093-Send-personal-data-to-adequate-3rd-countries)).',
    );
    any = true;
  }
  if (r.unclassified > 0) {
    lines.push(
      `⚠️ **${r.unclassified} unclassified cookies need manual classification.** ` +
        'Cookiebot Admin → Cookies and Trackers → Discovered cookies and ' +
        'trackers, expand each, pick a category + purpose, save ' +
        '([docs](https://support.cookiebot.com/hc/en-us/articles/360003735214-How-do-I-classify-unclassified-cookies)).',
    );
    any = true;
  }
  if (!any) {
    lines.push('✅ No compliance issues detected.');
  }
  lines.push('');

  const violators = topViolators(result.cookies, 6);
  if (violators.length > 0) {
    lines.push('**Top violators**');
    for (const c of violators) {
      const tags: string[] = [];
      if (c.blockedPriorConsent) tags.push('pre-consent');
      if (c.adequate === false) tags.push('not-adequate');
      if (c.category === 'Unclassified') tags.push('unclassified');
      lines.push(`- \`${c.name}\` @ ${c.provider} — ${tags.join(', ')}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

export function formatCookieCsv(cookies: Cookie[]): string {
  const header = [
    'name',
    'provider',
    'type',
    'expiry',
    'category',
    'data_sent_to',
    'adequate',
    'blocked_prior_consent',
    'first_found_url',
  ].join(',');
  const escape = (s: string): string =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const rows = cookies.map((c) =>
    [
      c.name,
      c.provider,
      c.type,
      c.expiry,
      c.category,
      c.dataSentTo ?? '',
      c.adequate === null ? '' : c.adequate ? 'yes' : 'no',
      c.blockedPriorConsent ? 'yes' : 'no',
      c.firstFoundUrl ?? '',
    ]
      .map((v) => escape(String(v)))
      .join(','),
  );
  return [header, ...rows].join('\n');
}
