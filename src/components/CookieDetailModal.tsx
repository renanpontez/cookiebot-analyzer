import { useEffect } from 'react';
import {
  X,
  AlertOctagon,
  ShieldOff,
  HelpCircle,
  Globe,
  ExternalLink,
  Clock,
  FileType,
  Activity,
  Server,
  MapPin,
} from 'lucide-react';
import type { Cookie, Category } from '../lib/parser';

interface Props {
  cookie: Cookie | null;
  onClose: () => void;
}

const CATEGORY_PILL: Record<Category, string> = {
  Necessary: 'bg-neutral-100 text-neutral-700',
  Preferences: 'bg-sky-100 text-sky-800',
  Statistics: 'bg-violet-100 text-violet-800',
  Marketing: 'bg-pink-100 text-pink-800',
  Unclassified: 'bg-amber-100 text-amber-900',
};

export function CookieDetailModal({ cookie, onClose }: Props) {
  // ESC to close + body scroll lock
  useEffect(() => {
    if (!cookie) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [cookie, onClose]);

  if (!cookie) return null;

  const flags: Array<{
    label: string;
    classes: string;
    icon: React.ReactNode;
    tip: string;
  }> = [];
  if (cookie.blockedPriorConsent) {
    flags.push({
      label: 'Pre-consent violation',
      classes: 'bg-rose-100 text-rose-800 ring-rose-200',
      icon: <AlertOctagon className="h-3 w-3" />,
      tip: 'Fires before user consent. Needs script-tag gating in your site code.',
    });
  }
  if (cookie.adequate === false) {
    flags.push({
      label: 'Non-adequate transfer',
      classes: 'bg-amber-100 text-amber-900 ring-amber-200',
      icon: <ShieldOff className="h-3 w-3" />,
      tip: 'Sends data to a country without an EU adequacy decision.',
    });
  }
  if (cookie.category === 'Unclassified') {
    flags.push({
      label: 'Unclassified',
      classes: 'bg-sky-100 text-sky-800 ring-sky-200',
      icon: <HelpCircle className="h-3 w-3" />,
      tip: 'Cookiebot does not know this cookie. Classify it manually.',
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="pr-10">
            <p
              id="cookie-detail-title"
              className="font-mono text-lg sm:text-xl font-semibold text-neutral-900 break-all leading-tight"
            >
              {cookie.name}
            </p>
            <p className="mt-1 text-sm text-neutral-500 break-all">
              {cookie.provider}
            </p>
          </div>

          {/* Pills + flags */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${CATEGORY_PILL[cookie.category]}`}
            >
              {cookie.category}
            </span>
            {flags.map((f) => (
              <span
                key={f.label}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md ring-1 text-[11px] font-medium ${f.classes}`}
              >
                {f.icon}
                {f.label}
              </span>
            ))}
          </div>

          {/* Issue tips (only if flags) */}
          {flags.length > 0 ? (
            <div className="mt-4 space-y-2">
              {flags.map((f) => (
                <div
                  key={f.label}
                  className="rounded-lg bg-neutral-50 border border-neutral-200 px-3 py-2 text-xs text-neutral-700 flex items-start gap-2"
                >
                  <span className="mt-0.5 text-neutral-400">{f.icon}</span>
                  <span>
                    <strong className="font-semibold text-neutral-900">
                      {f.label}.
                    </strong>{' '}
                    {f.tip}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Purpose */}
          {cookie.purpose ? (
            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-500">
                Purpose
              </h3>
              <p className="mt-1.5 text-sm text-neutral-800 leading-relaxed">
                {cookie.purpose}
              </p>
            </section>
          ) : (
            <section className="mt-6">
              <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-500">
                Purpose
              </h3>
              <p className="mt-1.5 text-sm italic text-neutral-500">
                No purpose description provided. (Cookiebot will show this in
                the consent banner — empty means visitors get no explanation.)
              </p>
            </section>
          )}

          {/* Technical details grid */}
          <section className="mt-6">
            <h3 className="text-xs uppercase tracking-wide font-semibold text-neutral-500">
              Technical
            </h3>
            <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <DetailRow
                icon={<FileType className="h-3.5 w-3.5" />}
                label="Type"
                value={cookie.type}
              />
              <DetailRow
                icon={<Clock className="h-3.5 w-3.5" />}
                label="Expiry"
                value={cookie.expiry}
              />
              <DetailRow
                icon={<Activity className="h-3.5 w-3.5" />}
                label="Initiator"
                value={cookie.initiator ?? '—'}
              />
              <DetailRow
                icon={<Server className="h-3.5 w-3.5" />}
                label="Source"
                value={cookie.source ?? '—'}
                mono
              />
              <DetailRow
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Data sent to"
                value={
                  cookie.dataSentTo ? (
                    <span className="inline-flex items-center gap-1.5">
                      {cookie.dataSentTo}
                      {cookie.adequate === false ? (
                        <span className="text-rose-700 font-medium">
                          (not adequate)
                        </span>
                      ) : cookie.adequate === true ? (
                        <span className="text-emerald-700 font-medium">
                          (adequate)
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              {cookie.firstFoundUrl ? (
                <DetailRow
                  icon={<Globe className="h-3.5 w-3.5" />}
                  label="First found on"
                  value={
                    <a
                      href={cookie.firstFoundUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-neutral-700 underline underline-offset-2 hover:text-neutral-900 break-all"
                    >
                      {cookie.firstFoundUrl}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  }
                />
              ) : null}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-neutral-500">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </dt>
      <dd
        className={[
          'mt-0.5 text-neutral-800 break-words',
          mono ? 'font-mono text-xs' : 'text-sm',
        ].join(' ')}
      >
        {value}
      </dd>
    </div>
  );
}
