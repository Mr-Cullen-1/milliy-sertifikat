import { SiteHeader } from '@/components/site-header';
import { getI18n } from '@/lib/i18n/server';

export default async function PrivacyPage() {
  const { t } = await getI18n();
  const paragraphs = ['privacy.p1', 'privacy.p2', 'privacy.p3', 'privacy.p4', 'privacy.p5', 'privacy.p6'] as const;
  return (
    <>
      <SiteHeader minimal />
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 py-10">
        <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink">{t('privacy.title')}</h1>
        {paragraphs.map((k) => (
          <p key={k} className="text-[18px] leading-7 font-semibold text-ink-soft">
            {t(k)}
          </p>
        ))}
      </main>
    </>
  );
}
