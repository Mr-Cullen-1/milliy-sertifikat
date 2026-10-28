import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, PageTitle, QUESTION_STATUS } from '@/components/admin/ui';
import { QuestionView } from '@/components/exam/question-view';
import { Markdown } from '@/components/math/markdown';
import { BLOCK_CODES } from '@/config/topics';
import { parsePayload } from '@/lib/exam/payload';
import { LANGS, type Lang } from '@/lib/i18n/config';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { BlockSkeleton } from '@/components/page-skeleton';

type Localized = { stem_md?: string; payload?: unknown; solution_md?: string; mistake_note_md?: string };

async function AdminQuestionPreviewContent({ params, searchParams }: PageProps<'/admin/questions/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lang: Lang = LANGS.find((l) => l === sp.lang) ?? 'uz';

  const supabase = await createClient();
  const [q, key, usage] = await Promise.all([
    supabase.from('questions').select('*').eq('id', id).maybeSingle(),
    supabase.from('question_keys').select('key_json').eq('question_id', id).maybeSingle(),
    supabase.from('exam_items').select('position, exams(title, code)').eq('question_id', id),
  ]);
  if (q.error) throw new Error(`questions: ${q.error.message}`);
  if (!q.data) notFound();
  const row = q.data;

  const tr = ((row.i18n ?? {}) as Record<string, Localized>)[lang];
  const stem = (lang !== 'uz' && tr?.stem_md) || row.stem_md;
  const payloadRaw = (lang !== 'uz' && tr?.payload) || row.payload;
  const solution = (lang !== 'uz' && tr?.solution_md) || row.solution_md;
  const mistake = (lang !== 'uz' && tr?.mistake_note_md) || row.mistake_note_md;

  let payload;
  let payloadError: string | null = null;
  try {
    payload = parsePayload(row.type, payloadRaw);
  } catch (e) {
    payloadError = e instanceof Error ? e.message : String(e);
  }
  const st = QUESTION_STATUS[row.status]!;
  const available = ['uz', ...Object.keys((row.i18n ?? {}) as Record<string, unknown>)];
  const first = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

  return (
    <>
      <PageTitle title={row.external_id ?? row.id.slice(0, 8)}>
        <Badge tone={st.tone}>{st.label}</Badge>
      </PageTitle>

      <Card>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px] font-bold text-muted">
          <span>Tur: {row.type.toUpperCase()}</span>
          <span>Bo&apos;lim: {BLOCK_CODES[row.block_id - 1]}</span>
          <span>Mavzu: {row.primary_topic_id}</span>
          <span>Qiyinlik: {row.difficulty}</span>
          <span>Vaqt: {row.est_seconds ?? '—'} s</span>
          <span>Versiya: {row.version}</span>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Til">
          {LANGS.map((l) => (
            <Link
              key={l}
              href={`/admin/questions/${id}?lang=${l}`}
              className={
                'rounded-xl border-2 px-3 py-1 text-[14px] font-extrabold ' +
                (l === lang ? 'border-selected bg-accent-soft text-ink' : 'border-line bg-white text-muted') +
                (available.includes(l) ? '' : ' opacity-50')
              }
            >
              {l.toUpperCase()}
              {!available.includes(l) && ' (yo\'q)'}
            </Link>
          ))}
        </div>
        {usage.data && usage.data.length > 0 && (
          <p className="text-[14px] font-semibold text-muted">
            Ishlatilgan: {usage.data.map((u) => `${first(u.exams)?.code ?? first(u.exams)?.title ?? '?'} #${u.position}`).join(', ')}
          </p>
        )}
      </Card>

      <Card title={`Ko'rinishi (${lang.toUpperCase()}) — talaba shunday ko'radi`}>
        {payload ? (
          <div className="rounded-2xl border-2 border-line bg-white p-4 shadow-card">
            <QuestionView
              item={{ position: 0, questionId: row.id, blockName: BLOCK_CODES[row.block_id - 1] ?? '', stemMd: stem, payload }}
              value={undefined}
              onChange={() => {}}
            />
          </div>
        ) : (
          <p role="alert" className="text-[15px] font-bold text-danger">
            Payload yaroqsiz: {payloadError}
          </p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="To'g'ri javob (kalit)">
          <pre className="overflow-x-auto rounded-xl bg-surface p-3 text-[14px] font-semibold text-ink">{JSON.stringify(key.data?.key_json ?? null, null, 2)}</pre>
        </Card>
        <Card title="Yechim">
          {solution ? <Markdown className="text-[16px] font-semibold text-ink">{solution}</Markdown> : <p className="text-[15px] font-bold text-muted">Yo&apos;q</p>}
          {mistake && (
            <div className="rounded-xl bg-accent-soft p-3">
              <p className="mb-1 text-[13px] font-extrabold text-accent">Tipik xato</p>
              <Markdown className="text-[15px] font-semibold text-ink">{mistake}</Markdown>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function AdminQuestionPreview(props: Parameters<typeof AdminQuestionPreviewContent>[0]) {
  return (
    <Suspense fallback={<BlockSkeleton />}>
      <AdminQuestionPreviewContent {...props} />
    </Suspense>
  );
}
