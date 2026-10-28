'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { setLanguageAction } from '@/app/language-actions';
import { LANGS, LANG_LABELS, type Lang } from '@/lib/i18n/config';
import { LANG_CODES, LangFlag } from './flags';
import { useLang, useT } from './provider';

/**
 * Til almashtirgich (4 til): ixcham tugma (bayroq + UZ/RU/QQ/EN), bosilganda ochiladigan ro'yxat.
 * Tanlanganda sahifa yangi til bilan qayta yuklanadi (holat saqlanadi).
 */
export function LangSwitcher({ className = '' }: { className?: string }) {
  const lang = useLang();
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  // Ro'yxat ekran chetidan chiqib ketmasligi uchun: ochilganda tugma joyiga qarab chap chegara va kenglik hisoblanadi
  const [pos, setPos] = useState<{ left: number; width: number }>({ left: 0, width: 220 });
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const change = (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    start(async () => {
      await setLanguageAction(next);
      router.refresh();
    });
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!open && root.current) {
            const r = root.current.getBoundingClientRect();
            const vw = window.innerWidth;
            const width = Math.min(220, vw - 24);
            const left = Math.min(Math.max(r.right - width, 12), vw - width - 12);
            setPos({ left: left - r.left, width });
          }
          setOpen((o) => !o);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${t('lang.label')}: ${LANG_LABELS[lang]}`}
        disabled={pending}
        className="flex h-10 items-center gap-1.5 rounded-xl border-2 border-line bg-white px-2 text-[14px] font-extrabold text-ink transition hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 sm:px-2.5"
      >
        <LangFlag lang={lang} />
        <span>{LANG_CODES[lang]}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`text-muted transition ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t('lang.label')}
          style={{ left: pos.left, width: pos.width }}
          className="absolute top-full z-50 mt-2 overflow-hidden rounded-2xl border-2 border-b-4 border-line-strong bg-white p-1.5 shadow-card"
        >
          {LANGS.map((l) => (
            <li key={l} role="option" aria-selected={l === lang}>
              <button
                type="button"
                onClick={() => change(l)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[15px] font-extrabold transition ${l === lang ? 'bg-accent-soft text-ink' : 'text-ink-soft hover:bg-surface'}`}
              >
                <LangFlag lang={l} />
                <span className="flex-1">{LANG_LABELS[l]}</span>
                <span className="text-[12px] font-black text-muted">{LANG_CODES[l]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
