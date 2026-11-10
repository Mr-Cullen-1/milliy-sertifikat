'use client';

import { useEffect, useRef, useState } from 'react';
import { logoutParticipant } from '@/app/auth-actions';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';

/** Kichik dumaloq "chiqish" tugmasi (faqat ikonka); bosilganda oqibatini aytib tasdiq so'raydi. */
export function LogoutButton() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('nav.logout')}
        title={t('nav.logout')}
        className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-b-4 border-line-strong bg-white text-muted transition hover:border-danger/40 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="m-auto w-[min(92vw,440px)] rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <h2 className="font-heading text-[24px] leading-8 font-semibold">{t('nav.logoutTitle')}</h2>
        <p className="mt-2 text-[16px] leading-6 font-semibold text-muted">{t('nav.logoutLead')}</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <form action={logoutParticipant}>
            <Button type="submit" className="w-full">
              {t('nav.logout')}
            </Button>
          </form>
        </div>
      </dialog>
    </>
  );
}
