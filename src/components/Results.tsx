import { useState } from 'react';
import {
  ArrowLeft,
  Cookie as CookieIcon,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  ShieldOff,
  AlertOctagon,
  Globe,
  Calendar,
  Copy,
  Download,
  Check,
  FileText,
  GitCompare,
  X,
} from 'lucide-react';
import {
  type Cookie,
  type ParseResult,
  formatSpreadsheetTsv,
  formatCookieCsv,
  formatTicketSummary,
  recommendedActions,
} from '../lib/parser';
import { MetricCard } from './MetricCard';
import { StatusBadge } from './StatusBadge';
import { CookieTable } from './CookieTable';
import { RecommendedActions } from './RecommendedActions';
import { CategoryBar } from './CategoryBar';
import { UploadZone } from './UploadZone';

interface Props {
  result: ParseResult;
  onReset: () => void;
  onCompareFile: (file: File) => void;
  compareBusy: boolean;
  compareError: string | null;
  onClearCompareError: () => void;
  onSelectCookie: (cookie: Cookie) => void;
}

export function Results({
  result,
  onReset,
  onCompareFile,
  compareBusy,
  compareError,
  onClearCompareError,
  onSelectCookie,
}: Props) {
  const r = result.spreadsheetRow;
  const actions = recommendedActions(result);
  const ticketSummary = formatTicketSummary(result);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const copyTsv = async () => {
    await navigator.clipboard.writeText(formatSpreadsheetTsv(r));
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 1500);
  };

  const copyTicket = async () => {
    await navigator.clipboard.writeText(ticketSummary);
    setCopiedTicket(true);
    setTimeout(() => setCopiedTicket(false), 1500);
  };

  const downloadCookieCsv = () => {
    const blob = new Blob([formatCookieCsv(result.cookies)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${r.domain ?? 'cookies'}-${(r.scanDate ?? 'audit').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Run another audit
      </button>

      {/* Title row */}
      <header className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              {r.domain ?? 'Cookie audit'}
            </h1>
            <StatusBadge status={r.status} size="lg" />
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-neutral-500">
            {r.scanDate ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {r.scanDate}
              </span>
            ) : null}
            {result.summary.serverLocation ? (
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5" /> {result.summary.serverLocation}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onClearCompareError();
              setCompareOpen((v) => !v);
            }}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors shadow-sm',
              compareOpen
                ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50',
            ].join(' ')}
          >
            <GitCompare className="h-4 w-4" />
            {compareOpen ? 'Cancel compare' : 'Compare with another report'}
          </button>
          <button
            onClick={copyTsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            {copiedTsv ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copiedTsv ? 'Copied' : 'Sheet row (TSV)'}
          </button>
          <button
            onClick={downloadCookieCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            Cookies CSV
          </button>
        </div>
      </header>

      {compareOpen ? (
        <section className="mt-6">
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-neutral-100 bg-neutral-50/60">
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Upload another scan report for{' '}
                  <span className="font-mono">
                    {r.domain ?? 'this domain'}
                  </span>
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  The older report becomes "past", the newer one becomes
                  "current" — we'll figure it out from the scan date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClearCompareError();
                  setCompareOpen(false);
                }}
                className="text-neutral-400 hover:text-neutral-900 rounded-md p-1 transition-colors"
                aria-label="Close compare uploader"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              {compareBusy ? (
                <div className="w-full rounded-xl border-2 border-dashed border-neutral-200 bg-white p-10 text-center">
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-900 border-t-amber-400 animate-spin" />
                  <p className="mt-4 text-sm text-neutral-600">
                    Analyzing second report…
                  </p>
                </div>
              ) : (
                <UploadZone onFile={onCompareFile} disabled={compareBusy} />
              )}
              {compareError ? (
                <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 text-sm">
                  {compareError}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Metrics grid */}
      <section className="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <MetricCard
          label="Total trackers"
          value={r.totalTrackers ?? '—'}
          tone="accent"
          icon={<CookieIcon className="h-4 w-4" />}
        />
        <MetricCard
          label="New"
          value={r.new}
          tone={r.new >= 10 ? 'warn' : 'neutral'}
          icon={<PlusCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Removed"
          value={r.removed}
          tone={r.removed >= 10 ? 'warn' : 'neutral'}
          icon={<MinusCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Unclassified"
          value={r.unclassified}
          tone={r.unclassified > 5 ? 'bad' : r.unclassified > 0 ? 'warn' : 'good'}
          hint={r.unclassified > 0 ? 'Manual fix in Cookiebot' : undefined}
          icon={<HelpCircle className="h-4 w-4" />}
        />
        <MetricCard
          label="Pre-consent violations"
          value={r.notBlockedPriorConsent}
          tone={r.notBlockedPriorConsent > 0 ? 'bad' : 'good'}
          hint={r.notBlockedPriorConsent > 0 ? 'Needs code fix on site' : undefined}
          icon={<AlertOctagon className="h-4 w-4" />}
        />
        <MetricCard
          label="Not adequate"
          value={r.notAdequate}
          tone={r.notAdequate > 0 ? 'warn' : 'good'}
          hint="GDPR data transfer"
          icon={<ShieldOff className="h-4 w-4" />}
        />
      </section>

      {/* Compact category bar */}
      <section className="mt-4">
        <CategoryBar
          counts={result.categoryCounts}
          total={r.totalTrackers ?? 0}
        />
      </section>

      {/* Findings — full width */}
      <section className="mt-8">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
              Findings &amp; recommended actions
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              What to do, sourced from Cookiebot's own documentation.
            </p>
          </div>
          <button
            onClick={copyTicket}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors shadow-sm"
            title="Copy a markdown-formatted ticket summary"
          >
            {copiedTicket ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied ticket
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" /> Copy ticket summary
              </>
            )}
          </button>
        </div>

        <RecommendedActions actions={actions} />

        <details className="mt-3 group">
          <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-900 select-none inline-flex items-center gap-1.5">
            <span className="group-open:hidden">Preview ticket summary</span>
            <span className="hidden group-open:inline">Hide preview</span>
          </summary>
          <pre className="mt-3 text-[11px] leading-relaxed bg-white border border-neutral-200 rounded-xl p-4 overflow-x-auto text-neutral-700 whitespace-pre-wrap font-mono">
            {ticketSummary}
          </pre>
        </details>
      </section>

      {/* Cookies table */}
      <section className="mt-10">
        <h2 className="text-base sm:text-lg font-semibold text-neutral-900 mb-3">
          All cookies
        </h2>
        <CookieTable cookies={result.cookies} onSelect={onSelectCookie} />
      </section>
    </div>
  );
}
