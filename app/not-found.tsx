import Link from 'next/link';
import { PageShell } from '@/components/page-shell';
import { Art } from '@/components/art';
import { buttonClass } from '@/components/ui/button';
import { getI18n } from '@/lib/i18n/server';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <PageShell minimal>
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-4 px-4 py-10">
        <Art name="mascot-think" width={120} priority />
        <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink">{t('errors.notFoundTitle')}</h1>
        <p className="text-[19px] leading-7 font-semibold text-muted">{t('errors.notFoundLead')}</p>
        <Link href="/" className={buttonClass('primary', 'w-fit')}>
          {t('common.home')}
        </Link>
      </main>
    </PageShell>
  );
}
