'use client';

import { useActionState } from 'react';
import { setExamStatusAction, type ActionState } from '../../actions';

const LABEL = { publish: 'Ochish (nashr)', archive: 'Yopish (arxiv)', unarchive: 'Qayta ochish' } as const;
const CONFIRM = {
  publish: "Mockni nashr etasizmi? Nashrdan keyin savollar o'zgarmas bo'ladi va talabalar uni ko'radi.",
  archive: 'Mockni arxivlaysizmi? Talabalar uni boshlay olmaydi (mavjud natijalar saqlanadi).',
  unarchive: 'Mockni qayta ochasizmi?',
} as const;

export function ExamActions({ examId, status }: { examId: string; status: 'draft' | 'published' | 'archived' }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setExamStatusAction, {});
  const to = status === 'draft' ? 'publish' : status === 'published' ? 'archive' : 'unarchive';

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(CONFIRM[to])) e.preventDefault();
      }}
      className="flex flex-col items-start gap-1"
    >
      <input type="hidden" name="examId" value={examId} />
      <input type="hidden" name="to" value={to} />
      <button
        type="submit"
        disabled={pending}
        className={
          'rounded-xl border-2 border-b-4 px-3 py-1.5 text-[14px] font-extrabold disabled:opacity-60 ' +
          (to === 'publish' ? 'border-brand-edge bg-brand text-white' : 'border-line-strong bg-white text-ink hover:bg-surface')
        }
      >
        {pending ? '…' : LABEL[to]}
      </button>
      {state.message && (
        <p role="status" className={'max-w-[360px] text-[13px] font-bold ' + (state.ok ? 'text-success-ink' : 'text-danger')}>
          {state.message}
        </p>
      )}
    </form>
  );
}
