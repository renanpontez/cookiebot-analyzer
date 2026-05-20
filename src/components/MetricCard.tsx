import type { ReactNode } from 'react';

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'accent';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
}

const cardTone: Record<Tone, string> = {
  neutral: 'bg-white border-neutral-200',
  good: 'bg-emerald-50/70 border-emerald-200/70',
  warn: 'bg-amber-50/70 border-amber-200/70',
  bad: 'bg-rose-50/70 border-rose-200/70',
  accent: 'bg-neutral-900 border-neutral-900 text-white',
};

const labelTone: Record<Tone, string> = {
  neutral: 'text-neutral-500',
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
  accent: 'text-white/70',
};

const valueTone: Record<Tone, string> = {
  neutral: 'text-neutral-900',
  good: 'text-emerald-700',
  warn: 'text-amber-700',
  bad: 'text-rose-700',
  accent: 'text-amber-400',
};

const iconTone: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  good: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-rose-100 text-rose-700',
  accent: 'bg-white/10 text-amber-400',
};

const hintTone: Record<Tone, string> = {
  neutral: 'text-neutral-500',
  good: 'text-emerald-700/80',
  warn: 'text-amber-700/80',
  bad: 'text-rose-700/80',
  accent: 'text-white/60',
};

export function MetricCard({ label, value, hint, tone = 'neutral', icon }: Props) {
  return (
    <div
      className={[
        'rounded-2xl border p-4 sm:p-5 transition-shadow shadow-sm hover:shadow-md',
        cardTone[tone],
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={[
            'text-[11px] sm:text-xs font-medium uppercase tracking-wide leading-snug',
            labelTone[tone],
          ].join(' ')}
        >
          {label}
        </p>
        {icon ? (
          <span
            className={[
              'inline-flex h-7 w-7 items-center justify-center rounded-lg shrink-0',
              iconTone[tone],
            ].join(' ')}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={[
          'mt-3 text-3xl sm:text-[2rem] font-semibold tabular leading-none',
          valueTone[tone],
        ].join(' ')}
      >
        {value}
      </p>
      {hint ? (
        <p className={`mt-2 text-[11px] leading-snug ${hintTone[tone]}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
