'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useT } from '@/components/i18n/provider';
import { Button } from '@/components/ui/button';
import { GRADES } from '@/config/participant';
import { registerParticipant, type StartState } from './actions';

interface Props {
  defaults: { fullName: string; phone: string; grade: string };
  next: string;
}

const initialState: StartState = {};

export function StartForm({ defaults, next }: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState(registerParticipant, initialState);
  const v = state.values ?? { ...defaults, consent: false };
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />

      <Field label={t('start.fullName')} error={errors.fullName} htmlFor="fullName">
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder={t('start.fullNamePlaceholder')}
          required
          defaultValue={v.fullName}
          aria-invalid={!!errors.fullName}
          className={inputClass(!!errors.fullName)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('start.phone')} error={errors.phone} htmlFor="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={t('start.phonePlaceholder')}
            required
            defaultValue={v.phone}
            aria-invalid={!!errors.phone}
            className={inputClass(!!errors.phone)}
          />
        </Field>

        <Field label={t('start.grade')} error={errors.grade} htmlFor="grade">
          <select
            id="grade"
            name="grade"
            required
            defaultValue={v.grade}
            aria-invalid={!!errors.grade}
            className={inputClass(!!errors.grade)}
          >
            <option value="" disabled>
              {t('start.gradePlaceholder')}
            </option>
            {GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {t(`grades.${g.value}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-[14px] leading-5 font-bold text-ink">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={v.consent}
            aria-invalid={!!errors.consent}
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-brand)]"
          />
          <span>
            {t('start.consent')}{' '}
            <Link href="/privacy" className="text-accent underline underline-offset-4" target="_blank">
              {t('start.consentMore')}
            </Link>
          </span>
        </label>
        {errors.consent && (
          <p className="text-[14px] font-bold text-danger" aria-live="polite">
            {errors.consent}
          </p>
        )}
      </div>

      {state.message && (
        <p role="alert" className="text-[15px] font-bold text-danger">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t('start.saving') : t('start.submit')}
      </Button>
    </form>
  );
}

// Figma B: Choice kartasi uslubi (2px chegara, 5px pastki chegara, 16px radius); zich: balandlikni tejash uchun.
const inputClass = (invalid: boolean) =>
  'h-[52px] w-full rounded-2xl border-2 border-b-[5px] bg-white px-4 text-[17px] font-bold text-ink outline-none ' +
  'placeholder:font-semibold placeholder:text-faint focus:border-accent ' +
  (invalid ? 'border-danger' : 'border-line');

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[15px] font-extrabold text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-[14px] leading-5 font-bold text-danger" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}
