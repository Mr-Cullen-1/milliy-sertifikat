import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="font-heading text-[28px] leading-9 font-semibold text-ink">{title}</h1>
      {children}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-4 ${className}`}>
      {title && <h2 className="font-heading text-[18px] font-semibold text-ink">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-3">
      <span className="text-[13px] font-extrabold text-muted">{label}</span>
      <span className="text-[26px] font-black text-ink">{value}</span>
      {hint && <span className="text-[13px] font-bold text-muted">{hint}</span>}
    </div>
  );
}

const TONES = {
  gray: 'bg-track text-muted',
  green: 'bg-success-soft text-success-ink',
  orange: 'bg-brand-tint text-brand-ink',
  purple: 'bg-accent-soft text-accent',
  red: 'bg-danger/10 text-danger',
} as const;

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-extrabold ${TONES[tone]}`}>{children}</span>;
}

export const EXAM_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: 'Qoralama', tone: 'gray' },
  published: { label: 'Ochiq', tone: 'green' },
  archived: { label: 'Arxiv', tone: 'orange' },
};

export const QUESTION_STATUS: Record<string, { label: string; tone: keyof typeof TONES }> = {
  draft: { label: 'Qoralama', tone: 'gray' },
  review: { label: 'Ko\'rib chiqilmoqda', tone: 'purple' },
  published: { label: 'Nashr etilgan', tone: 'green' },
  archived: { label: 'Arxiv', tone: 'orange' },
};

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
        <thead className="bg-surface text-[13px] font-extrabold text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-bold text-ink [&_td]:px-3 [&_td]:py-2.5 [&_tr]:border-t-2 [&_tr]:border-line">{children}</tbody>
      </table>
      {empty && <p className="px-3 py-4 text-[15px] font-bold text-muted">{empty}</p>}
    </div>
  );
}

/** Sahifalash: boshqa query parametrlarini saqlaydi. */
export function Pager({ basePath, params, page, total, pageSize }: { basePath: string; params: Record<string, string | undefined>; page: number; total: number; pageSize: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="flex flex-wrap items-center gap-3 text-[15px] font-bold text-muted">
      <span>
        Jami: {total} · {page}/{pages}-sahifa
      </span>
      {page > 1 && (
        <Link href={href(page - 1)} className="font-extrabold text-accent underline underline-offset-4">
          ← Oldingi
        </Link>
      )}
      {page < pages && (
        <Link href={href(page + 1)} className="font-extrabold text-accent underline underline-offset-4">
          Keyingi →
        </Link>
      )}
    </div>
  );
}

export const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const pageParam = (v: string | string[] | undefined): number => {
  const n = Number(typeof v === 'string' ? v : '1');
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
};

export const strParam = (v: string | string[] | undefined): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);
