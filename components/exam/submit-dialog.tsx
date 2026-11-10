'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  unanswered: number;
  flagged: number;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Yakuniy topshirishni tasdiqlash (native <dialog>: fokus tuzog'i va Esc tayyor). */
export function SubmitDialog({ open, unanswered, flagged, submitting, error, onCancel, onConfirm }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!submitting) onCancel();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-6 text-ink shadow-xl backdrop:bg-ink/40"
    >
      <h2 className="font-heading text-[26px] leading-8 font-semibold">{t('exam.dialog.title')}</h2>
      <ul className="mt-4 flex flex-col gap-2 text-[18px] font-bold">
        <li className={unanswered > 0 ? 'text-brand-ink' : 'text-success-ink'}>
          {unanswered > 0 ? t('exam.dialog.unanswered', { n: unanswered }) : t('exam.dialog.allAnswered')}
        </li>
        {flagged > 0 && <li className="text-muted">{t('exam.dialog.flagged', { n: flagged })}</li>}
      </ul>
      <p className="mt-3 text-[16px] font-semibold text-muted">{t('exam.dialog.irreversible')}</p>
      {error && (
        <p role="alert" className="mt-3 text-[16px] font-bold text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          {t('exam.dialog.cancel')}
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? t('exam.dialog.submitting') : t('exam.dialog.confirm')}
        </Button>
      </div>
    </dialog>
  );
}
