import Link from 'next/link';
import { z } from 'zod';
import { MistakesList, type MistakeGroup, type MistakeRow } from '@/components/mistakes/mistakes-list';
import { PageShell } from '@/components/page-shell';
import { EmptyState, PageHero } from '@/components/page-hero';
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

/** Xatolar tahlilida Pro obunasiz ochiq xatolar soni (ro'yxat tartibida; qolganlari yopiq, tafsiloti mijozga yuborilmaydi). */
const FREE_MISTAKES_COUNT = 6;

export default async function MistakesPage() {
  const [{ t, lang }, participant] = await Promise.all([getI18n(), requireParticipant('/mistakes')]);
  const supabase = await createClient();

  const [mistakesRes, topics] = await Promise.all([supabase.rpc('get_my_mistakes', { p_lang: lang }), supabase.from('topics').select('id, name_uz')]);
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

  // Buzilgan payload'li savollar o'tkazib yuboriladi; ochiq/yopiq holat ro'yxatdagi umumiy tartib raqamidan olinadi.
  const parsed = blocks
    .map(([blockId, list]) => ({
      blockId,
      items: list.flatMap((m) => {
        try {
          return [{ m, payload: parsePayload(m.type, m.payload) }];
        } catch {
          return [];
        }
      }),
    }))
    .filter((g) => g.items.length > 0);
  const groups: MistakeGroup[] = parsed.map((g, gi) => {
    const offset = parsed.slice(0, gi).reduce((n, x) => n + x.items.length, 0);
    return {
      blockId: g.blockId,
      label: blockLabel(g.blockId),
      rows: g.items.map(({ m, payload }, ri): MistakeRow => {
        const locked = !participant.isPro && offset + ri >= FREE_MISTAKES_COUNT;
        const base = { id: m.question_id, timesText: t('mistakes.times', { n: m.times_wrong }), topicText: topicName(m.topic_id, lang, uzName.get(m.topic_id)), locked };
        if (locked) return { ...base, detail: null };
        const y2Ids = payload.type === 'y2' ? payload.data.items.map((i) => i.id) : [];
        return {
          ...base,
          detail: {
            stemMd: m.stem_md,
            figure: payload.data.figure ?? null,
            lastText: describeAnswer(m.type, parseAnswer(m.type, m.last_value), y2Ids, t('mistakes.noAnswer')),
            correct: describeKey(m.type, m.correct_answer, y2Ids) || null,
            solutionMd: m.solution_md || null,
            mistakeNoteMd: m.mistake_note_md || null,
          },
        };
      }),
    };
  });

  return (
    <PageShell active="mistakes">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <PageHero art="mascot-think">
          <Chip tone="brand">{t('mistakes.count', { n: mistakes.length })}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('mistakes.title')}</h1>
          <p className="text-[19px] leading-7 font-semibold text-muted">{t('mistakes.lead')}</p>
        </PageHero>

        {mistakes.length === 0 ? (
          <EmptyState art="mascot-celebrate">
            <p className="text-[19px] font-semibold text-muted">{t('mistakes.empty')}</p>
            <Link href="/exams" className={buttonClass('primary')}>
              {t('mistakes.startExam')}
            </Link>
          </EmptyState>
        ) : (
          <MistakesList groups={groups} />
        )}
      </main>
    </PageShell>
  );
}
