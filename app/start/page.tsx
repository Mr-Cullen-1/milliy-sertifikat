import { Art } from '@/components/art';
import { Decor } from '@/components/decor';
import { PageShell } from '@/components/page-shell';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { getParticipant } from '@/lib/participant.server';
import { StartForm } from './start-form';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/page-skeleton';

async function StartPageContent({ searchParams }: PageProps<'/start'>) {
  const [{ t }, participant, params] = await Promise.all([getI18n(), getParticipant(), searchParams]);
  const next = typeof params.next === 'string' ? params.next : '/';
  const features = [t('start.f1'), t('start.f2'), t('start.f3'), t('start.f4')];

  return (
    // Katta ekranda sahifa viewport balandligiga sig'adi (scrollsiz); juda past oynada faqat <main> ichida aylanadi.
    <PageShell minimal fit>
      <main className="relative mx-auto grid w-full max-w-[1180px] flex-1 content-center items-center gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:gap-14 lg:overflow-y-auto">
        <Decor
          items={[
            {
              name: 'sparkles',
              width: 64,
              className: 'left-[47%] top-6 rotate-6',
            },
            {
              name: 'books',
              width: 56,
              className: 'left-[1%] bottom-4 -rotate-12 opacity-90',
            },
            {
              name: 'orb',
              width: 90,
              className: 'left-[44%] bottom-3 opacity-80',
            },
          ]}
        />
        <section className="relative z-10 flex flex-col gap-5">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[34px] leading-[42px] font-semibold text-ink sm:text-[40px] sm:leading-[48px] lg:text-[48px] lg:leading-[56px]">
            {t('start.title')}
          </h1>
          <p className="max-w-[520px] text-[18px] leading-7 font-semibold text-muted">{t('start.lead')}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-b-[5px] border-line-strong bg-white px-4 py-3 shadow-card">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-brand text-[14px] font-black text-white">{i + 1}</span>
                <span className="text-[16px] leading-6 font-bold text-ink">{f}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="relative z-10 mt-12 rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-5 shadow-card sm:p-6 lg:mt-14">
          <Art name="mascot-waving" width={104} priority className="absolute -top-[74px] right-5" />
          <StartForm
            defaults={{
              fullName: participant?.fullName ?? '',
              phone: participant?.phone ?? '',
              grade: participant?.grade ?? '',
            }}
            next={next}
          />
        </section>
      </main>
    </PageShell>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function StartPage(props: Parameters<typeof StartPageContent>[0]) {
  return (
    <Suspense fallback={<PageSkeleton minimal />}>
      <StartPageContent {...props} />
    </Suspense>
  );
}
