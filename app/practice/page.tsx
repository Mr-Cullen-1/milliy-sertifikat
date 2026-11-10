import Link from 'next/link';
import { z } from 'zod';
import { PageHero } from '@/components/page-hero';
import { PageShell } from '@/components/page-shell';
import { PracticeSetup, type SetupBlock } from '@/components/practice/practice-setup';
import { Chip } from '@/components/ui/chip';
import { BLOCK_CODES } from '@/config/topics';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { poolStatSchema, practiceListRowSchema } from '@/lib/practice/state';
import { createClient } from '@/lib/supabase/server';

/** Mashq: sozlash (bo'lim, qiyinlik, rejim, savollar soni) va oxirgi mashqlar. Mashq savollari mock variantlardan alohida zaxirada. */
export default async function PracticePage() {
  const [{ t, lang }] = await Promise.all([getI18n(), requireParticipant('/practice')]);
  const supabase = await createClient();
  const [statsRes, listRes] = await Promise.all([supabase.rpc('get_practice_pool_stats'), supabase.rpc('list_my_practice', { p_limit: 8 })]);
  // Migratsiya qo'llanmagan yoki zaxira bo'sh bo'lsa sahifa xatosiz, bo'sh holatda ochiladi
  const stats = z.array(poolStatSchema).catch([]).parse(statsRes.data ?? []);
  const recent = z.array(practiceListRowSchema).catch([]).parse(listRes.data ?? []);

  const blocks: SetupBlock[] = BLOCK_CODES.map((code, i) => {
    const rows = stats.filter((s) => s.block_id === i + 1);
    const n = (d: string) => rows.find((r) => r.difficulty === d)?.n ?? 0;
    return { code, label: t(`blocks.${code}`), counts: { L1: n('L1'), L2: n('L2'), L3: n('L3'), all: rows.reduce((a, r) => a + r.n, 0) } };
  });
  const empty = blocks.every((b) => b.counts.all === 0);
  const modeName = { practice: t('practice.modePractice'), timed: t('practice.modeTimed'), exam: t('practice.modeExam') };
  const dateFmt = new Intl.DateTimeFormat(lang === 'kaa' ? 'uz' : lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <PageShell active="practice">
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:gap-6">
        <PageHero art="mascot-pencil">
          <Chip tone="brand">{t('nav.practice')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('practice.title')}</h1>
          <p className="text-[19px] leading-7 font-semibold text-muted">{t('practice.lead')}</p>
        </PageHero>

        {empty ? <p className="text-[19px] font-semibold text-muted">{t('practice.poolEmpty')}</p> : <PracticeSetup blocks={blocks} />}

        <section aria-label={t('practice.recent')} className="flex flex-col gap-3">
          <h2 className="font-heading text-[22px] font-semibold text-ink">{t('practice.recent')}</h2>
          {recent.length === 0 ? (
            <p className="text-[17px] font-semibold text-muted">{t('practice.noneYet')}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {recent.map((r) => {
                const done = r.status === 'submitted';
                const block = t(`blocks.${BLOCK_CODES[r.block_id - 1] ?? 'sonlar'}`);
                return (
                  <li key={r.id}>
                    <Link
                      href={done ? `/practice/${r.id}/result` : `/practice/${r.id}`}
                      className="flex items-center justify-between gap-4 rounded-2xl border-2 border-line bg-white px-4 py-3.5 shadow-card hover:bg-surface"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[17px] font-bold text-ink">{block}</span>
                        <span className="truncate text-[14px] font-semibold text-muted">
                          {modeName[r.mode]} · {dateFmt.format(new Date(r.started_at))}
                        </span>
                      </span>
                      <span className={`shrink-0 text-[16px] font-extrabold ${done ? 'text-ink' : 'text-brand-ink'}`}>
                        {done ? t('practice.scoreLine', { c: r.correct_count ?? 0, n: r.question_count }) : t('practice.resume')}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </PageShell>
  );
}
