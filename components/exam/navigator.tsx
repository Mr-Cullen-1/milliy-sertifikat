'use client';

import { Fragment } from 'react';
import { useT } from '@/components/i18n/provider';
import type { NavState } from '@/lib/exam/answer-state';

export interface NavItem {
  position: number;
  state: NavState;
  /** Savol turi: berilsa, ketma-ket bir xil turdagi savollar "N-qism · tur" sarlavhasi ostida guruhlanadi. */
  type?: 'y1' | 'y2' | 'o';
}

const styles: Record<NavState, string> = {
  current: 'border-brand-edge bg-brand-current text-white',
  flagged: 'border-gold-edge bg-warn-soft text-ink',
  answered: 'border-accent bg-accent-soft text-accent',
  empty: 'border-line bg-white text-muted hover:bg-surface',
};

const DEFAULT_COLUMNS = 'grid-cols-6 sm:grid-cols-9 lg:grid-cols-5';

/** Ketma-ket bir xil turdagi savollarni guruhlaydi; tur ko'rsatilmagan bo'lsa bitta guruh (sarlavhasiz). */
function groupItems(items: NavItem[]) {
  const groups: { type: NavItem['type']; entries: { item: NavItem; index: number }[] }[] = [];
  items.forEach((item, index) => {
    const last = groups[groups.length - 1];
    if (last && last.type === item.type) last.entries.push({ item, index });
    else groups.push({ type: item.type, entries: [{ item, index }] });
  });
  return groups;
}

/** 1–45 savollar paneli: bo'limlar bo'yicha guruhlangan; joriy, belgilangan, javob berilgan, bo'sh. */
export function Navigator({ items, onSelect, columns = DEFAULT_COLUMNS }: { items: NavItem[]; onSelect: (index: number) => void; columns?: string }) {
  const t = useT();
  const groups = groupItems(items);
  const typed = items.every((i) => i.type);
  const typeLabel = { y1: t('exam.typeY1'), y2: t('exam.typeY2'), o: t('exam.typeO') };

  return (
    <nav aria-label={t('exam.panelAria')} className="flex flex-col gap-2 lg:gap-[clamp(4px,0.8dvh,8px)]">
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {typed && g.type && (
            <h3 className="text-[13px] leading-4 font-extrabold text-muted lg:text-[12px]">{t('exam.section', { n: gi + 1, name: typeLabel[g.type] })}</h3>
          )}
          <ol className={`grid gap-2 ${columns} lg:gap-[clamp(4px,0.9dvh,8px)]`}>
            {g.entries.map(({ item, index }) => (
              <li key={item.position}>
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-label={t('exam.questionAria', { n: item.position })}
                  aria-current={item.state === 'current' ? 'step' : undefined}
                  className={
                    'h-11 w-full rounded-xl border-2 border-b-4 text-[16px] lg:h-[clamp(27px,4dvh,46px)] font-extrabold transition ' +
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ' +
                    styles[item.state]
                  }
                >
                  {item.position}
                </button>
              </li>
            ))}
          </ol>
        </Fragment>
      ))}
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-[14px] font-bold text-muted lg:text-[13px]">
        <Legend color="bg-brand-current border-brand-edge" label={t('exam.legendCurrent')} />
        <Legend color="bg-accent-soft border-accent" label={t('exam.legendAnswered')} />
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
