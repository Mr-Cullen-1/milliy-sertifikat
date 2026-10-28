import { DtmCalculator } from '@/components/dtm/calculator';
import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { Chip } from '@/components/ui/chip';
import { levelMinScore } from '@/lib/dtm';
import { getI18n } from '@/lib/i18n/server';

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);

export default async function DtmPage({ searchParams }: PageProps<'/dtm'>) {
  const [{ t }, params] = await Promise.all([getI18n(), searchParams]);

  // Natija sahifasidan keladigan ?score=62.4&level=B+ (tekshiriladi, aks holda e'tiborsiz)
  const rawScore = one(params.score);
  const score = rawScore !== undefined && /^\d{1,2}(\.\d+)?$/.test(rawScore) && Number(rawScore) <= 75 ? Number(rawScore) : undefined;
  const rawLevel = one(params.level);
  const level = rawLevel && levelMinScore(rawLevel) !== undefined ? rawLevel : undefined;

  return (
    <PageShell active="dtm">
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-4 py-10">
        <PageHero art="mascot-coin" artWidth={104}>
          <Chip tone="brand">{t('nav.dtm')}</Chip>
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink sm:text-[36px] sm:leading-[43px]">{t('dtm.title')}</h1>
          <p className="text-[19px] leading-7 font-semibold text-muted">{t('dtm.lead')}</p>
        </PageHero>
        <DtmCalculator initialScore={score} initialLevel={level} />
      </main>
    </PageShell>
  );
}
