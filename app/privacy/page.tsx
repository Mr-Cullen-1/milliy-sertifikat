import { PageShell } from '@/components/page-shell';
import { PageHero } from '@/components/page-hero';
import { getI18n } from '@/lib/i18n/server';

export default async function PrivacyPage() {
  const { t } = await getI18n();
  const paragraphs = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4', 'privacy.p5', 'privacy.p6'] as const;
  return (
    <PageShell minimal>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 py-10">
        <PageHero art="books">
          <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink">{t('privacy.title')}</h1>
        </PageHero>
        {paragraphs.map((k) => (
          <p key={k} className="rounded-2xl border-2 border-line bg-white px-5 py-4 text-[18px] leading-7 font-semibold text-ink-soft shadow-card">
            {t(k)}
          </p>
        ))}
      </main>
    </PageShell>
  );
}
