import { useCallback, useMemo, useState } from 'react';
import { Cookie, ShieldCheck, Github, Heart } from 'lucide-react';
import { parseCookiebotHtml, type ParseResult, type Cookie as CookieRecord } from './lib/parser';
import { compareReports } from './lib/compare';
import { UploadZone } from './components/UploadZone';
import { Results } from './components/Results';
import { Comparison } from './components/Comparison';
import { CookieDetailModal } from './components/CookieDetailModal';

type View = 'idle' | 'parsing' | 'results' | 'error' | 'comparison';

const REPO_URL = 'https://github.com/renanpontez/cookiebot-analyzer';
const AUTHOR_URL = 'https://martinzrenan.dev';

export function App() {
  const [view, setView] = useState<View>('idle');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [compareResult, setCompareResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [comparingBusy, setComparingBusy] = useState(false);
  const [selectedCookie, setSelectedCookie] = useState<CookieRecord | null>(null);

  const parseFile = useCallback(async (file: File): Promise<ParseResult> => {
    const text = await file.text();
    await new Promise((r) => setTimeout(r, 150));
    const parsed = parseCookiebotHtml(text);
    if (parsed.spreadsheetRow.totalTrackers === null) {
      throw new Error(
        "Couldn't find a Cookiebot scan report in that file. Make sure you exported the HTML from Cookiebot's dashboard.",
      );
    }
    return parsed;
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setView('parsing');
      setError(null);
      try {
        setResult(await parseFile(file));
        setView('results');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse the file');
        setView('error');
      }
    },
    [parseFile],
  );

  const handleCompareFile = useCallback(
    async (file: File) => {
      setComparingBusy(true);
      setCompareError(null);
      try {
        const second = await parseFile(file);
        setCompareResult(second);
        setView('comparison');
      } catch (e) {
        setCompareError(
          e instanceof Error ? e.message : 'Failed to parse the file',
        );
      } finally {
        setComparingBusy(false);
      }
    },
    [parseFile],
  );

  const reset = useCallback(() => {
    setView('idle');
    setResult(null);
    setCompareResult(null);
    setError(null);
    setCompareError(null);
  }, []);

  const exitComparison = useCallback(() => {
    setCompareResult(null);
    setCompareError(null);
    setView('results');
  }, []);

  const comparison = useMemo(() => {
    if (view !== 'comparison' || !result || !compareResult) return null;
    return compareReports(result, compareResult);
  }, [view, result, compareResult]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {view === 'comparison' && comparison ? (
        <main className="flex-1">
          <Comparison
            comparison={comparison}
            onExit={exitComparison}
            onSelectCookie={(c) => setSelectedCookie(c)}
          />
        </main>
      ) : view === 'results' && result ? (
        <main className="flex-1">
          <Results
            result={result}
            onReset={reset}
            onCompareFile={handleCompareFile}
            compareBusy={comparingBusy}
            compareError={compareError}
            onClearCompareError={() => setCompareError(null)}
            onSelectCookie={(c) => setSelectedCookie(c)}
          />
        </main>
      ) : (
        <main className="flex-1">
          <Landing
            onFile={handleFile}
            parsing={view === 'parsing'}
            error={view === 'error' ? error : null}
          />
        </main>
      )}

      <CookieDetailModal
        cookie={selectedCookie}
        onClose={() => setSelectedCookie(null)}
      />

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5 group">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-amber-400 transition-transform group-hover:scale-105">
            <Cookie className="h-4 w-4" />
          </span>
          <span className="font-semibold tracking-tight text-neutral-900">
            Cookie Audit
          </span>
        </a>
        <div className="flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-medium">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free &amp; open source
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden sm:inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

function Landing({
  onFile,
  parsing,
  error,
}: {
  onFile: (f: File) => void;
  parsing: boolean;
  error: string | null;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-14 sm:py-24">
      <div className="text-center space-y-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
          <ShieldCheck className="h-3 w-3" />
          Parsed in your browser · nothing uploaded
        </span>
        <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-neutral-900 leading-[1.05]">
          Instant Cookiebot{' '}
          <span className="bg-gradient-to-br from-amber-400 to-amber-600 bg-clip-text text-transparent">
            audit
          </span>
          .
        </h1>
        <p className="text-lg text-neutral-600 max-w-xl mx-auto">
          Drop your Cookiebot scan-report HTML and get the numbers you'd
          otherwise spend an hour collecting — pre-consent violations, GDPR
          adequacy, unclassified trackers. Spreadsheet row + ticket summary,
          ready to paste.
        </p>
      </div>

      <div className="mt-10">
        {parsing ? (
          <div className="w-full rounded-2xl border-2 border-neutral-200 bg-white p-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full border-2 border-neutral-900 border-t-amber-400 animate-spin" />
            <p className="mt-5 text-sm text-neutral-600">Analyzing scan report…</p>
          </div>
        ) : (
          <UploadZone onFile={onFile} disabled={parsing} />
        )}

        {error ? (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
      </div>

      <Features />
    </div>
  );
}

function Features() {
  const items = [
    {
      title: 'All the numbers, instantly',
      body:
        'Total trackers, new vs. removed, unclassified, pre-consent violations, GDPR adequacy — calculated in your browser in under a second.',
    },
    {
      title: 'Spreadsheet + ticket ready',
      body:
        'One-click TSV row for your monthly audit sheet. Markdown ticket summary with citation links to Cookiebot docs for each finding.',
    },
    {
      title: 'Nothing leaves your browser',
      body:
        'Your scan-report HTML is parsed client-side. No upload, no storage, no tracking. (Yes, we read the irony memo.)',
    },
  ];
  return (
    <section className="mt-20 grid sm:grid-cols-3 gap-6">
      {items.map((it) => (
        <div key={it.title}>
          <p className="font-semibold text-neutral-900">{it.title}</p>
          <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{it.body}</p>
        </div>
      ))}
    </section>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
        <p>
          © {year} Cookie Audit · open source under MIT · not affiliated with
          Cookiebot™ / Usercentrics.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-neutral-900 transition-colors"
          >
            <Github className="h-3.5 w-3.5" />
            Source
          </a>
          <span className="inline-flex items-center gap-1.5">
            Built with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> by{' '}
            <a
              href={AUTHOR_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-medium text-neutral-700 hover:text-neutral-900 underline underline-offset-2"
            >
              martinzrenan.dev
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
