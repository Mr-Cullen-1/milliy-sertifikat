import { SiteHeader } from '@/components/site-header';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { StartForm } from './start-form';

export default async function StartPage({ searchParams }: PageProps<'/start'>) {
  const [{ t }, participant, params] = await Promise.all([getI18n(), getParticipant(), searchParams]);
  const next = typeof params.next === 'string' ? params.next : '/';
  const features = [t('start.f1'), t('start.f2'), t('start.f3'), t('start.f4')];

  return (
    // Katta ekranda sahifa viewport balandligiga sig'adi (scrollsiz); juda past oynada faqat <main> ichida aylanadi.
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <SiteHeader minimal />
      <main className="mx-auto grid w-full max-w-[1180px] flex-1 content-center items-center gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:gap-14 lg:overflow-y-auto">
        <section className="flex flex-col gap-5">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[34px] leading-[42px] font-semibold text-ink sm:text-[40px] sm:leading-[48px] lg:text-[48px] lg:leading-[56px]">
            {t('start.title')}
          </h1>
          <p className="max-w-[520px] text-[18px] leading-7 font-semibold text-muted">{t('start.lead')}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-brand text-[14px] font-black text-white">{i + 1}</span>
                <span className="text-[16px] leading-6 font-bold text-ink">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border-2 border-b-[6px] border-line bg-white p-5 sm:p-6">
          <StartForm
            defaults={{ fullName: participant?.fullName ?? '', phone: participant?.phone ?? '', grade: participant?.grade ?? '' }}
            next={next}
          />
        </section>
      </main>
    </div>
  );
}
