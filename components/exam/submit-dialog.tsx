'use client';

import { useEffect, useRef } from 'react';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  answered: number;
  unanswered: number;
  flagged: number;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Yakuniy topshirishni tasdiqlash (native <dialog>: fokus tuzog'i va Esc tayyor). */
export function SubmitDialog({ open, answered, unanswered, flagged, submitting, error, onCancel, onConfirm }: Props) {
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
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-3 text-center">
        <Stat value={answered} label={t('exam.dialog.statAnswered')} tone="text-success-ink" />
        <Stat value={unanswered} label={t('exam.dialog.statUnanswered')} tone={unanswered > 0 ? 'text-brand-ink' : 'text-ink'} />
        <Stat value={flagged} label={t('exam.dialog.statFlagged')} tone="text-ink" />
      </dl>
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

function Stat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col-reverse gap-0.5">
      <dt className="text-[13px] leading-4 font-bold text-muted">{label}</dt>
      <dd className={`text-[26px] leading-8 font-black ${tone}`}>{value}</dd>
    </div>
  );
}
