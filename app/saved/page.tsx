import Link from 'next/link';
import { z } from 'zod';
import { MistakesList, type MistakeGroup, type MistakeRow } from '@/components/mistakes/mistakes-list';
import { MistakesTabs } from '@/components/mistakes/mistakes-tabs';
import { PageShell } from '@/components/page-shell';
import { EmptyState, PageHero } from '@/components/page-hero';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { describeAnswer, describeKey, isAnswered } from '@/lib/exam/answer-state';
import { parsePayload } from '@/lib/exam/payload';
import { parseAnswer } from '@/lib/exam/schemas';
import { savedSchema } from '@/lib/exam/stats';
import { blockCodeOf } from '@/lib/i18n/blocks';
import { getI18n } from '@/lib/i18n/server';
import { topicName } from '@/lib/i18n/topics';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

/** Saqlangan savollar: ishtirokchi tahlil oynasida yer belgisi bilan saqlaganlari (bo'limlar bo'yicha). Xatolar daftari bilan bir xil ko'rinish. */
export default async function SavedPage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/saved')]);
  const supabase = await createClient();

  const [savedRes, topics] = await Promise.all([supabase.rpc('get_my_saved', { p_lang: lang }), supabase.from('topics').select('id, name_uz')]);
  if (savedRes.error) throw new Error(`get_my_saved: ${savedRes.error.message}`);
  if (topics.error) throw new Error(`topics: ${topics.error.message}`);

  const uzName = new Map((topics.data ?? []).map((x) => [x.id, x.name_uz]));
  const saved = z.array(savedSchema).parse(savedRes.data ?? []);

  const blockLabel = (id: number) => {
    const code = blockCodeOf(id);
    return code ? t(`blocks.${code}`) : String(id);
  };

  // Bo'limlar bo'yicha guruhlash (bo'lim tartibida); buzilgan payload'li savollar o'tkazib yuboriladi.
  const byBlock = new Map<number, typeof saved>();
  for (const s of saved) byBlock.set(s.block_id, [...(byBlock.get(s.block_id) ?? []), s]);
  const groups: MistakeGroup[] = [...byBlock.entries()]
    .sort(([a], [b]) => a - b)
    .map(([blockId, list]) => ({
      blockId,
      label: blockLabel(blockId),
      rows: list.flatMap((s): MistakeRow[] => {
        let payload;
        try {
          payload = parsePayload(s.type, s.payload);
        } catch {
          return [];
        }
        const y2Ids = payload.type === 'y2' ? payload.data.items.map((i) => i.id) : [];
        const last = parseAnswer(s.type, s.last_value);
        const status = s.last_correct ? t('result.ok') : isAnswered(s.type, last) ? t('result.wrong') : t('result.empty');
        return [
          {
            id: s.question_id,
            timesText: status,
            topicText: topicName(s.topic_id, lang, uzName.get(s.topic_id)),
            locked: false,
            detail: {
              stemMd: s.stem_md,
              figure: payload.data.figure ?? null,
              lastText: describeAnswer(s.type, last, y2Ids, t('mistakes.noAnswer')),
              correct: describeKey(s.type, s.correct_answer, y2Ids) || null,
              solutionMd: s.solution_md || null,
              mistakeNoteMd: s.mistake_note_md || null,
            },
          },
        ];
      }),
    }))
    .filter((g) => g.rows.length > 0);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  return (
    <PageShell active="mistakes">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <MistakesTabs current="saved" />

        <PageHero art="mascot-think">
          <Chip tone="brand">{t('saved.count', { n: total })}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('saved.title')}</h1>
          <p className="text-[19px] leading-7 font-semibold text-muted">{t('saved.lead')}</p>
        </PageHero>

        {total === 0 ? (
          <EmptyState art="mascot-celebrate">
            <p className="text-[19px] font-semibold text-muted">{t('saved.empty')}</p>
            <Link href="/history" className={buttonClass('primary')}>
              {t('nav.history')}
            </Link>
          </EmptyState>
        ) : (
          <MistakesList groups={groups} savedIds={saved.map((s) => s.question_id)} />
        )}
      </main>
    </PageShell>
  );
}
