'use client';

import { useActionState } from 'react';
import { createTesterAction, setParticipantProAction, testerLinkAction, type ActionState } from '@/app/admin/actions';

const btn = 'rounded-xl border-2 border-b-4 px-3 py-1 text-[13px] font-extrabold disabled:opacity-60';

function LinkBox({ link }: { link: string }) {
  return (
    <input
      readOnly
      value={link}
      onFocus={(e) => e.currentTarget.select()}
      aria-label="Kirish havolasi"
      className="w-full min-w-[260px] rounded-xl border-2 border-line bg-surface px-2.5 py-1.5 text-[12px] font-bold text-ink"
    />
  );
}

function Message({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div role="status" className="flex flex-col gap-1.5">
      <p className={'max-w-[420px] text-[13px] font-bold ' + (state.ok ? 'text-success-ink' : 'text-danger')}>{state.message}</p>
      {state.link && <LinkBox link={state.link} />}
    </div>
  );
}

/** Qator amallari: Pro berish/olib tashlash; test akkaunt uchun kirish havolasi. */
export function ParticipantActions({ id, isPro, isTester }: { id: string; isPro: boolean; isTester: boolean }) {
  const [proState, proAction, proPending] = useActionState<ActionState, FormData>(setParticipantProAction, {});
  const [linkState, linkAction, linkPending] = useActionState<ActionState, FormData>(testerLinkAction, {});

  return (
    <div className="flex min-w-[200px] flex-col items-start gap-2">
      <form
        action={proAction}
        onSubmit={(e) => {
          if (!window.confirm(isPro ? 'Pro huquqini olib tashlaysizmi?' : "Pro huquqini berasizmi? Qoralama variantlar va to'liq tahlil ochiladi.")) e.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={id} />
        <input type="hidden" name="pro" value={isPro ? 'false' : 'true'} />
        <button
          type="submit"
          disabled={proPending}
          className={btn + (isPro ? ' border-line-strong bg-white text-ink hover:bg-surface' : ' border-accent bg-accent-soft text-accent')}
        >
          {proPending ? '…' : isPro ? 'Pro ni olish' : 'Pro berish'}
        </button>
      </form>
      {isTester && (
        <form action={linkAction}>
          <input type="hidden" name="userId" value={id} />
          <button type="submit" disabled={linkPending} className={btn + ' border-line-strong bg-white text-ink hover:bg-surface'}>
            {linkPending ? '…' : 'Kirish havolasi'}
          </button>
        </form>
      )}
      <Message state={proState} />
      <Message state={linkState} />
    </div>
  );
}

/** Test o'quvchi akkaunti: Pro bilan yaratiladi va kirish havolasi beriladi. */
export function CreateTesterForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createTesterAction, {});
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-[13px] font-extrabold text-muted">
        {"Test o'quvchi nomi"}
        <input name="name" placeholder="Test o'quvchi" maxLength={60} className="rounded-xl border-2 border-line bg-white px-2.5 py-1.5 text-[14px] font-bold text-ink" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl border-2 border-b-4 border-brand-edge bg-brand px-4 py-1.5 text-[14px] font-extrabold text-white disabled:opacity-60"
      >
        {pending ? '…' : 'Test akkaunt yaratish'}
      </button>
      <Message state={state} />
    </form>
  );
}
