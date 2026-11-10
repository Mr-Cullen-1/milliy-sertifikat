'use client';

import { useT } from '@/components/i18n/provider';
import { Bookmark } from '@/components/ui/icons';
import type { SavedError } from './use-saved';

/** Savolni saqlash tugmasi (yer belgisi): oynaning sarlavhasida. Xato bo'lsa ostida qisqa matn chiqadi (`role="alert"`). */
export function SaveButton({
  saved,
  pending,
  error,
  onToggle,
}: {
  saved: boolean;
  pending: boolean;
  error: SavedError;
  onToggle: () => void;
}) {
  const t = useT();
  const label = saved ? t('saved.saved') : t('saved.save');
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        title={label}
        className={
          'flex size-11 items-center justify-center rounded-xl border-2 border-b-4 transition ' +
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60 ' +
          (saved ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong bg-white text-muted hover:bg-surface hover:text-ink')
        }
      >
        <Bookmark width={22} height={22} fill={saved ? 'currentColor' : 'none'} />
      </button>
      {error && (
        <p role="alert" className="max-w-[180px] text-right text-[12px] leading-4 font-bold text-danger">
          {t(`saved.err.${error}`)}
        </p>
      )}
    </div>
  );
}
