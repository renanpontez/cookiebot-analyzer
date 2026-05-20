import {
  AlertOctagon,
  ExternalLink,
  HelpCircle,
  ShieldOff,
  CheckCircle2,
} from 'lucide-react';
import type { RecommendedAction } from '../lib/parser';

interface Props {
  actions: RecommendedAction[];
}

const iconMap = {
  'pre-consent': AlertOctagon,
  unclassified: HelpCircle,
  adequacy: ShieldOff,
  'all-clear': CheckCircle2,
} as const;

const severityStyles = {
  critical: {
    container: 'border-rose-200 bg-rose-50/60',
    badge: 'bg-rose-600 text-white',
    title: 'text-rose-900',
    icon: 'text-rose-600 bg-rose-100',
    body: 'text-rose-950/80',
    link: 'text-rose-700 hover:text-rose-900',
    bullet: 'bg-rose-400',
    severityLabel: 'CRITICAL',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50/60',
    badge: 'bg-amber-500 text-white',
    title: 'text-amber-900',
    icon: 'text-amber-700 bg-amber-100',
    body: 'text-amber-950/80',
    link: 'text-amber-800 hover:text-amber-900',
    bullet: 'bg-amber-400',
    severityLabel: 'WARNING',
  },
  info: {
    container: 'border-sky-200 bg-sky-50/60',
    badge: 'bg-sky-600 text-white',
    title: 'text-sky-900',
    icon: 'text-sky-700 bg-sky-100',
    body: 'text-sky-950/80',
    link: 'text-sky-700 hover:text-sky-900',
    bullet: 'bg-sky-400',
    severityLabel: 'INFO',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50/60',
    badge: 'bg-emerald-600 text-white',
    title: 'text-emerald-900',
    icon: 'text-emerald-700 bg-emerald-100',
    body: 'text-emerald-950/80',
    link: 'text-emerald-700 hover:text-emerald-900',
    bullet: 'bg-emerald-400',
    severityLabel: 'CLEAR',
  },
} as const;

/** Render text with inline `code` spans and **bold** markers. */
function renderInline(text: string): React.ReactNode[] {
  // Tokenize on `code` and **bold** patterns.
  const out: React.ReactNode[] = [];
  const re = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) {
      out.push(
        <code
          key={`c${i++}`}
          className="px-1.5 py-0.5 rounded bg-white/70 text-[12.5px] font-mono whitespace-nowrap"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      out.push(
        <strong key={`b${i++}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RecommendedActions({ actions }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {actions.map((a) => {
        const s = severityStyles[a.severity];
        const Icon = iconMap[a.id];
        return (
          <article
            key={a.id}
            className={`rounded-2xl border p-5 sm:p-6 ${s.container}`}
          >
            <header className="flex items-start gap-3">
              <div
                className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg ${s.icon}`}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] tracking-wider font-bold px-1.5 py-0.5 rounded ${s.badge}`}
                  >
                    {s.severityLabel}
                  </span>
                  <h3 className={`font-semibold leading-tight ${s.title}`}>
                    {a.title}
                  </h3>
                </div>
                <p className={`mt-1.5 text-sm leading-relaxed ${s.body}`}>
                  {renderInline(a.intro)}
                </p>
              </div>
            </header>

            <ul className="mt-4 space-y-2 pl-1">
              {a.steps.map((step, i) => (
                <li
                  key={i}
                  className={`relative pl-5 text-sm leading-relaxed ${s.body}`}
                >
                  <span
                    className={`absolute left-0 top-[0.55rem] h-1.5 w-1.5 rounded-full ${s.bullet}`}
                  />
                  {renderInline(step)}
                </li>
              ))}
            </ul>

            {a.link ? (
              <a
                href={a.link.href}
                target="_blank"
                rel="noreferrer noopener"
                className={`mt-4 inline-flex items-center gap-1 text-sm font-medium ${s.link}`}
              >
                {a.link.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
