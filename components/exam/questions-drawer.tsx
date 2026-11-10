'use client';

import { useEffect, useRef } from 'react';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { useT } from '@/components/i18n/provider';
import { Close } from '@/components/ui/icons';
import { Navigator, type NavItem } from './navigator';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  items: NavItem[];
  onSelect: (index: number) => void;
}

/**
 * Mobil imtihon: "Barcha savollar" paneli o'ng tomondan ochiladigan oyna (native <dialog>: fokus tuzog'i va Esc tayyor).
 * Tashqarisiga bosish yoki savolni tanlash oynani yopadi. Ichida imtihon nomi, til almashtirgich va bo'limlar bo'yicha savollar.
 */
export function QuestionsDrawer({ open, onClose, title, items, onSelect }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="drawer-title"
      className="app-drawer flex-col rounded-l-3xl border-2 border-r-0 border-line-strong bg-white p-0 text-ink shadow-xl open:flex"
    >
      <div className="flex shrink-0 items-center gap-3 border-b-2 border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 id="drawer-title" className="font-heading text-[20px] leading-6 font-semibold">
            {t('exam.panel')}
          </h2>
          <p className="truncate text-[14px] font-bold text-muted">{title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-line bg-white text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Close width={18} height={18} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-[14px] leading-5 font-bold text-muted">{t('exam.noCalc')}</p>
          <LangSwitcher className="shrink-0" />
        </div>
        <Navigator
          items={items}
          columns="grid-cols-5"
          onSelect={(i) => {
            onSelect(i);
            onClose();
          }}
        />
      </div>
    </dialog>
  );
}
