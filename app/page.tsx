import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';

export default async function Home() {
  const [{ t }, participant] = await Promise.all([getI18n(), requireParticipant('/')]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center gap-4 px-4 py-10">
        <Chip>{t('common.appName')}</Chip>
        <h1 className="font-heading text-[36px] leading-[43px] font-semibold text-ink">{t('home.hello', { name: participant.fullName })}</h1>
        <p className="text-[19px] leading-7 font-semibold text-muted">{t('home.lead')}</p>
        <Link href="/exams" className={buttonClass('primary', 'w-fit')}>
          {t('nav.exams')}
        </Link>
        <Link href="/start" className="w-fit text-[17px] font-extrabold text-accent underline underline-offset-4">
          {t('home.edit')}
        </Link>
      </main>
    </>
  );
}
