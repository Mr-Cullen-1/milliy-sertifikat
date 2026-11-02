'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Art } from '@/components/art';
import { useT } from '@/components/i18n/provider';
import { Button, buttonClass } from '@/components/ui/button';

const ProContext = createContext<{ open: () => void } | null>(null);

/** Pro obuna oynasini ochish (navbar va yopiq variant kartalaridagi tugmalar bitta oynani ochadi). */
export function useProModal() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('useProModal: ProProvider kerak');
  return ctx;
}

export function CrownIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M3.5 8.2c0-.8.9-1.2 1.5-.7l3.3 2.7 2.9-4.9c.4-.7 1.4-.7 1.8 0l2.9 4.9 3.3-2.7c.6-.5 1.5-.1 1.5.7l-1.3 8.6c-.1.7-.7 1.2-1.4 1.2H6.2c-.7 0-1.3-.5-1.4-1.2L3.5 8.2Z" />
      <rect x="6" y="19" width="12" height="2" rx="1" />
    </svg>
  );
}

/** Pro oynasini ochuvchi tugma. className: tashqaridan beriladi (buttonClass yoki navbar uslubi). */
export function ProOpenButton({
  className = '',
  children,
  'aria-label': ariaLabel,
  'aria-disabled': ariaDisabled,
}: {
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
  'aria-disabled'?: boolean | 'true' | 'false';
}) {
  const { open } = useProModal();
  return (
    <button type="button" onClick={open} aria-label={ariaLabel} aria-disabled={ariaDisabled} aria-haspopup="dialog" className={className}>
      {children}
    </button>
  );
}

const CHECK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/**
 * Pro obuna haqida oyna. Narx va to'lov yo'q: obunani rasmiylashtirish havolasi `NEXT_PUBLIC_PRO_URL` bilan beriladi
 * (bo'sh bo'lsa tugma ko'rsatilmaydi). Oyna Provider ichida bir marta chiziladi.
 */
export function ProProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [isOpen, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const proUrl = process.env.NEXT_PUBLIC_PRO_URL;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  const items = [t('pro.i1'), t('pro.i2'), t('pro.i3'), t('pro.i4'), t('pro.i5')];
  const stats = [
    { value: '9', label: t('pro.statVariants') },
    { value: '405', label: t('pro.statQuestions') },
    { value: '150', label: t('pro.statMinutes') },
  ];

  return (
    <ProContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        aria-labelledby="pro-title"
        className="m-auto w-[min(94vw,960px)] max-h-[92dvh] overflow-y-auto rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-0 text-ink shadow-xl backdrop:bg-ink/45"
      >
        <div className="relative grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('pro.close')}
            className="absolute top-3 right-3 z-10 flex size-10 items-center justify-center rounded-full border-2 border-line bg-white text-muted transition hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>

          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <span className="flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3.5 py-1.5 text-[14px] font-black tracking-wide text-accent uppercase">
              <CrownIcon size={16} />
              {t('pro.chip')}
            </span>
            <div className="flex flex-col gap-2">
              <h2 id="pro-title" className="font-heading text-[28px] leading-9 font-semibold text-ink sm:text-[32px] sm:leading-10">
                {t('pro.title')}
              </h2>
              <p className="text-[16px] leading-6 font-semibold text-muted">{t('pro.lead')}</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-extrabold tracking-wider text-muted uppercase">{t('pro.listTitle')}</p>
              <ul className="flex flex-col gap-3">
                {items.map((text) => (
                  <li key={text} className="flex items-start gap-3 text-[16px] leading-6 font-bold text-ink">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-ink">{CHECK}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-5 p-6 pt-0 sm:p-8 sm:pt-0 lg:pt-8">
            <Art name="mascot-celebrate" width={170} className="shrink-0 drop-shadow-[0_10px_10px_rgba(38,24,110,0.16)]" />
            <div className="grid w-full grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-b-[4px] border-line bg-white px-2 py-4 text-center shadow-card"
                >
                  <span className="font-heading text-[34px] leading-9 font-semibold text-accent">{s.value}</span>
                  <span className="text-[12px] leading-4 font-extrabold text-muted">{s.label}</span>
                </div>
              ))}
            </div>
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-accent-soft px-5 py-3">
              <span className="text-[14px] font-extrabold text-accent">{t('pro.priceTitle')}</span>
              <span className="font-heading text-[26px] leading-8 font-semibold text-accent">{t('pro.price')}</span>
            </div>
            {proUrl && (
              <a href={proUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('accent', 'w-full')}>
                <CrownIcon size={20} />
                {t('pro.cta')}
              </a>
            )}
            <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
              {t('pro.close')}
            </Button>
          </div>
        </div>
      </dialog>
    </ProContext.Provider>
  );
}
