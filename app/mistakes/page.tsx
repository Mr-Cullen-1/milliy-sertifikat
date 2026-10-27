import Link from 'next/link';
import { z } from 'zod';
import { FigureImage } from '@/components/exam/figure';
import { Markdown } from '@/components/math/markdown';
import { SiteHeader } from '@/components/site-header';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { describeAnswer, describeKey } from '@/lib/exam/answer-state';
import { parsePayload } from '@/lib/exam/payload';
import { mistakeSchema, type Mistake } from '@/lib/exam/stats';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { topicName } from '@/lib/i18n/topics';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';
import { parseAnswer } from '@/lib/exam/schemas';

export default async function MistakesPage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/mistakes')]);
  const supabase = await createClient();

  const [mistakesRes, topics] = await Promise.all([
    supabase.rpc('get_my_mistakes', { p_lang: lang }),
    supabase.from('topics').select('id, name_uz'),
  ]);
  if (mistakesRes.error) throw new Error(`get_my_mistakes: ${mistakesRes.error.message}`);
  if (topics.error) throw new Error(`topics: ${topics.error.message}`);

  const uzName = new Map((topics.data ?? []).map((x) => [x.id, x.name_uz]));
  const mistakes = z.array(mistakeSchema).parse(mistakesRes.data ?? []);

  const byBlock = new Map<number, Mistake[]>();
  for (const m of mistakes) byBlock.set(m.block_id, [...(byBlock.get(m.block_id) ?? []), m]);
  const blocks = [...byBlock.entries()].sort(([a], [b]) => a - b);
  const blockLabel = (id: number) => {
    const code = blockCodeOf(id);
    return code ? t(`blocks.${code}`) : String(id);
  };

  return (
    <>
      <SiteHeader active="mistakes" />
      <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col gap-8 px-4 py-10">
        <header className="flex flex-col gap-3">
          <Chip tone="brand">{t('mistakes.count', { n: mistakes.length })}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('mistakes.title')}</h1>
          <p className="text-[19px] leading-7 font-semibold text-muted">{t('mistakes.lead')}</p>
        </header>

        {mistakes.length === 0 ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-[19px] font-semibold text-muted">{t('mistakes.empty')}</p>
            <Link href="/exams" className={buttonClass('primary')}>
              {t('mistakes.startExam')}
            </Link>
          </div>
        ) : (
          blocks.map(([blockId, list]) => (
            <section key={blockId} className="flex flex-col gap-3" aria-label={blockLabel(blockId)}>
              <h2 className="font-heading text-[22px] font-semibold text-ink">{blockLabel(blockId)}</h2>
              <ul className="flex flex-col gap-3">
                {list.map((m) => {
                  let payload;
                  try {
                    payload = parsePayload(m.type, m.payload);
                  } catch {
                    return null;
                  }
                  const y2Ids = payload.type === 'y2' ? payload.data.items.map((i) => i.id) : [];
                  const none = t('mistakes.noAnswer');
                  const last = describeAnswer(m.type, parseAnswer(m.type, m.last_value), y2Ids, none);
                  const correct = describeKey(m.type, m.correct_answer, y2Ids);
                  return (
                    <li key={m.question_id}>
                      <details className="rounded-2xl border-2 border-line open:border-line-strong">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5">
                          <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[14px] font-extrabold text-brand-ink">
                            {t('mistakes.times', { n: m.times_wrong })}
                          </span>
                          <span className="min-w-0 flex-1 text-[16px] font-bold text-ink">
                            {t('mistakes.topic')}: {topicName(m.topic_id, lang, uzName.get(m.topic_id))}
                          </span>
                        </summary>
                        <div className="flex flex-col gap-4 border-t-2 border-line px-4 py-4">
                          <Markdown className="text-[19px] font-bold text-ink">{m.stem_md}</Markdown>
                          {payload.data.figure && <FigureImage figure={payload.data.figure} />}
                          <p className="text-[16px] font-bold text-muted">
                            {t('mistakes.lastAnswer')}: <span className="font-extrabold text-danger">{last}</span>
                          </p>
                          {correct && (
                            <p className="text-[16px] font-bold text-muted">
                              {t('mistakes.correct')}: <span className="font-extrabold text-success-ink">{correct}</span>
                            </p>
                          )}
                          {m.solution_md && (
                            <div className="rounded-2xl bg-brand-tint p-4">
                              <p className="mb-1.5 text-[15px] font-extrabold text-brand-ink">{t('mistakes.solution')}</p>
                              <Markdown className="text-[17px] font-semibold text-ink">{m.solution_md}</Markdown>
                            </div>
                          )}
                          {m.mistake_note_md && (
                            <div className="rounded-2xl bg-accent-soft p-4">
                              <p className="mb-1.5 text-[15px] font-extrabold text-accent">{t('mistakes.mistake')}</p>
                              <Markdown className="text-[17px] font-semibold text-ink">{m.mistake_note_md}</Markdown>
                            </div>
                          )}
                        </div>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </main>
    </>
  );
}
