'use client';

import { useT } from '@/components/i18n/provider';
import type { NavState } from '@/lib/exam/answer-state';

export interface NavItem {
  position: number;
  state: NavState;
}

const styles: Record<NavState, string> = {
  current: 'border-brand-edge bg-brand-current text-white',
  flagged: 'border-gold-edge bg-warn-soft text-ink',
  answered: 'border-success bg-success-soft text-success-ink',
  empty: 'border-line bg-white text-muted hover:bg-surface',
};

/** 1–45 savollar paneli: joriy, belgilangan, javob berilgan, bo'sh. */
export function Navigator({ items, onSelect }: { items: NavItem[]; onSelect: (index: number) => void }) {
  const t = useT();
  return (
    <nav aria-label={t('exam.panelAria')} className="flex flex-col gap-3">
      <ol className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-5 lg:gap-[clamp(4px,0.9dvh,8px)]">
        {items.map((item, i) => (
          <li key={item.position}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-label={t('exam.questionAria', { n: item.position })}
              aria-current={item.state === 'current' ? 'step' : undefined}
              className={
                'h-11 w-full rounded-xl border-2 border-b-4 text-[16px] lg:h-[clamp(30px,4.8dvh,46px)] font-extrabold transition ' +
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                styles[item.state]
              }
            >
              {item.position}
            </button>
          </li>
        ))}
      </ol>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] font-bold text-muted">
        <Legend color="bg-success-soft border-success" label={t('exam.legendAnswered')} />
        <Legend color="bg-warn-soft border-gold-edge" label={t('exam.legendFlagged')} />
        <Legend color="bg-white border-line" label={t('exam.legendEmpty')} />
      </ul>
    </nav>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-3.5 rounded border-2 ${color}`} />
      {label}
    </li>
  );
}
