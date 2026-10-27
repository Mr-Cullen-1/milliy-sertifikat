'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Badge } from '@/components/admin/ui';
import { importAction, type ImportState } from '../../actions';

export function ImportForm() {
  const [state, action, pending] = useActionState<ImportState, FormData>(importAction, {});
  const s = state.summary;

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="file" className="text-[15px] font-extrabold text-ink">
          JSON fayl
        </label>
        <input id="file" name="file" type="file" accept=".json,application/json" className="text-[15px] font-bold text-ink" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="text" className="text-[15px] font-extrabold text-ink">
          yoki JSON matnini shu yerga qo&apos;ying
        </label>
        <textarea
          id="text"
          name="text"
          rows={8}
          spellCheck={false}
          placeholder='{ "exam": { "title": "Variant G", "code": "G" }, "questions": [ ... 45 ta ... ] }'
          className="w-full rounded-xl border-2 border-line bg-white p-3 font-mono text-[13px] text-ink outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          name="intent"
          value="validate"
          disabled={pending}
          className="rounded-xl border-2 border-b-4 border-line-strong bg-white px-4 py-2 text-[15px] font-extrabold text-ink hover:bg-surface disabled:opacity-60"
        >
          {pending ? '…' : 'Tekshirish'}
        </button>
        <button
          type="submit"
          name="intent"
          value="commit"
          disabled={pending}
          onClick={(e) => {
            if (!window.confirm("Bazaga yozamizmi? Savollar qoralama sifatida saqlanadi (mock nashr etilguncha o'zgartirish mumkin).")) e.preventDefault();
          }}
          className="rounded-xl border-2 border-b-4 border-brand-edge bg-brand px-4 py-2 text-[15px] font-extrabold text-white disabled:opacity-60"
        >
          Tekshirib yuklash
        </button>
      </div>

      {state.message && (
        <p role="status" className={'text-[15px] font-bold ' + (state.ok ? 'text-success-ink' : 'text-danger')}>
          {state.message}
        </p>
      )}
      {state.examId && (
        <Link href={`/admin/exams/${state.examId}`} className="w-fit text-[15px] font-extrabold text-accent underline underline-offset-4">
          Yaratilgan mockni ochish →
        </Link>
      )}

      {s && (
        <div className="flex flex-col gap-2 rounded-xl bg-surface p-3 text-[14px] font-bold text-ink">
          <p>
            Savollar: <b>{s.questions}</b>
            {s.exam && (
              <>
                {' '}
                · Mock: <b>{s.exam.title}</b> {s.exam.code && <Badge tone="purple">{s.exam.code}</Badge>}
              </>
            )}
          </p>
          <p>
            Turlar: {Object.entries(s.byType).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')}
          </p>
          <p>Qiyinlik: {Object.entries(s.byDifficulty).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
          <p>Bo&apos;limlar: {Object.entries(s.byBlock).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
          <p>
            Tarjimalar: RU {s.translated.ru} · KAA {s.translated.kaa} · EN {s.translated.en} · Chizmali: {s.withFigure}
          </p>
        </div>
      )}

      {state.problems && state.problems.length > 0 && (
        <div role="alert" className="flex flex-col gap-1.5 rounded-xl border-2 border-danger/30 bg-danger/5 p-3">
          <p className="text-[14px] font-extrabold text-danger">Xatolar ({state.problems.length}{state.truncated ? '+' : ''}):</p>
          <ul className="flex max-h-[360px] flex-col gap-1 overflow-y-auto text-[13px] font-semibold text-ink">
            {state.problems.map((p, i) => (
              <li key={i}>
                <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[12px] text-brand-ink">{p.path}</code> {p.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
