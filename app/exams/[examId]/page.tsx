import Link from 'next/link';
import { notFound } from 'next/navigation';
import { startAttemptAction } from '@/app/attempts/actions';
import { Art } from '@/components/art';
import { FitPage } from '@/components/fit-page';
import { PageShell } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/page-skeleton';

async function ExamIntroPageContent({ params }: PageProps<'/exams/[examId]'>) {
  const { examId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(examId)) notFound();
  const [{ t }] = await Promise.all([getI18n(), requireParticipant(`/exams/${examId}`)]);

  const supabase = await createClient();
  const { data: exam, error } = await supabase.from('exams').select('id, title, exam_formats(duration_min)').eq('id', examId).maybeSingle();
  if (error) throw new Error(`exams: ${error.message}`);
  if (!exam) notFound();

  const formats = exam.exam_formats;
  const minutes = (Array.isArray(formats) ? formats[0] : formats)?.duration_min ?? 150;

  const rules = [
    { Icon: IconCalc, title: t('intro.ruleTitle1'), text: t('intro.ruleText1') },
    { Icon: IconClock, title: t('intro.ruleTitle2'), text: t('intro.ruleText2') },
    { Icon: IconChart, title: t('intro.ruleTitle3'), text: t('intro.ruleText3') },
  ];
  const startForm = (className: string) => (
    <form action={startAttemptAction.bind(null, examId)} className={className}>
      <Button type="submit" className="w-full">
        {t('intro.start')}
        <ArrowRight />
      </Button>
    </form>
  );
  const pills = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1 text-[14px] font-extrabold text-ink-soft">
        <IconList />
        {t('intro.tasksPill', { n: 45 })}
      </span>
      <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 py-1 text-[14px] font-extrabold text-ink-soft">
        <IconClockSmall />
        {t('intro.minutesPill', { minutes })}
      </span>
    </div>
  );

  return (
    <PageShell active="exams">
      <main className="flex min-h-0 flex-1 flex-col justify-center">
        <FitPage className="mx-auto flex w-full max-w-[1280px] flex-col gap-3 px-4 py-3 sm:px-6 lg:gap-4 lg:py-4">
          {/* Yo'l (breadcrumb) */}
          <nav aria-label="breadcrumb" className="flex items-center gap-2 text-[14px] font-bold text-muted lg:hidden">
            <Link href="/" aria-label={t('common.home')} className="text-muted hover:text-ink">
              <IconHome />
            </Link>
            <Chevron />
            <Link href="/exams" className="hover:text-ink hover:underline">
              {t('nav.exams')}
            </Link>
            <span aria-hidden>/</span>
            <span aria-current="page" className="font-extrabold text-ink">
              {exam.title}
            </span>
          </nav>

          {/* Mobil: ixcham variant kartasi (kompyuterda bu ma'lumot o'ng panelda) */}
          <section className="flex items-center gap-3 rounded-2xl border-2 border-b-[4px] border-line-strong bg-linear-to-b from-white to-brand-tint p-3 shadow-card lg:hidden">
            <Art name="trophy" width={44} className="shrink-0" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="font-heading text-[20px] leading-6 font-semibold text-ink">{exam.title}</h1>
              <div className="flex flex-wrap items-center gap-1.5 text-[12px] font-extrabold text-ink-soft">
                <span className="flex items-center gap-1 rounded-full border-2 border-line bg-white px-2 py-0.5">
                  <IconList small />
                  {t('intro.tasksPill', { n: 45 })}
                </span>
                <span className="flex items-center gap-1 rounded-full border-2 border-line bg-white px-2 py-0.5">
                  <IconClockSmall small />
                  {t('intro.minutesPill', { minutes })}
                </span>
              </div>
            </div>
          </section>

          {/* Bitta ikki qismli karta: chapda qoidalar, o'ngda (kompyuterda) variant paneli */}
          <section
            aria-labelledby="intro-title"
            className="grid overflow-hidden rounded-3xl border-2 border-b-[5px] border-line-strong bg-white shadow-card lg:min-h-[clamp(0px,calc(100dvh-230px),760px)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          >
            <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-6 lg:gap-5 lg:p-10">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <Chip tone="brand">
                  <span className="tracking-wide uppercase">{t('intro.chip')}</span>
                </Chip>
                <h2
                  id="intro-title"
                  className="font-heading text-[24px] leading-[30px] font-semibold text-ink sm:text-[30px] sm:leading-[38px] lg:text-[44px] lg:leading-[52px]"
                >
                  {t('intro.heroTitle')}
                </h2>
                <p className="text-[14px] leading-5 font-semibold text-muted sm:text-[16px] lg:text-[18px] lg:leading-6">{t('intro.subtitle')}</p>
              </div>

              <ul className="flex flex-col divide-y-2 divide-line lg:flex-1">
                {rules.map(({ Icon, title, text }) => (
                  <li key={title} className="flex items-center gap-3 py-2.5 first:pt-0 lg:flex-1 lg:gap-4 lg:py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent lg:size-16 lg:rounded-2xl">
                      <Icon />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      <p className="text-[15px] leading-5 font-extrabold text-ink lg:text-[22px] lg:leading-8">{title}</p>
                      <p className="text-[13px] leading-[18px] font-semibold text-muted lg:text-[17px] lg:leading-6">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="flex items-center gap-2.5 rounded-xl bg-accent-soft px-3.5 py-2.5 text-[13px] leading-[18px] font-bold text-ink-soft lg:text-[16px] lg:leading-6">
                <IconInfo />
                {t('intro.note')}
              </p>

              {/* Mobil: mascot va tilak */}
              <div className="flex items-center justify-center gap-3 lg:hidden [@media(max-height:620px)]:hidden">
                <Art name="mascot-checklist" width={64} className="shrink-0" />
                <p className="flex items-center gap-1.5 rounded-full bg-brand-tint px-4 py-1.5 text-[15px] font-extrabold text-ink">
                  <Sparks className="w-4 -scale-x-100 text-gold" small />
                  {t('intro.goodLuck')}
                  <Sparks className="w-4 text-gold" small />
                </p>
              </div>
            </div>

            {/* Kompyuter: o'ng panel (karta bilan bir xil fon, ajratuvchi chiziqsiz) */}
            <div className="hidden flex-col items-center justify-between gap-4 p-8 lg:flex">
              {/* Bitta umumiy blok: chapda kubok, o'ngda (kubok bilan bir xil balandlikda) nom va ostida belgilar */}
              <div className="flex items-stretch gap-6 pt-2">
                <div className="shrink-0">
                  <Art name="trophy" width={104} />
                </div>
                <div className="flex flex-col items-start justify-between py-1">
                  <p className="font-heading text-[38px] leading-[44px] font-semibold text-ink">{exam.title}</p>
                  {pills}
                </div>
              </div>
              <Art name="mascot-checklist" width={210} className="shrink-0 drop-shadow-[0_10px_10px_rgba(38,24,110,0.16)] lg:h-[clamp(150px,30dvh,300px)]! lg:w-auto!" />
              <p className="flex items-center gap-3 font-heading text-[30px] leading-9 font-semibold text-ink">
                <Sparks className="w-8 -scale-x-100 text-gold" small />
                {t('intro.goodLuck')}
                <Sparks className="w-8 text-gold" small />
              </p>
              {startForm('w-full')}
            </div>
          </section>

          {/* Mobil: boshlash tugmasi */}
          {startForm('lg:hidden')}
        </FitPage>
      </main>
    </PageShell>
  );
}

// Kontent URL ma'lumotiga (params/searchParams) bog'liq: Suspense ichida o'qiladi, qobiq esa darrov chiqadi.
export default function ExamIntroPage(props: Parameters<typeof ExamIntroPageContent>[0]) {
  return (
    <Suspense fallback={<PageSkeleton active="exams" />}>
      <ExamIntroPageContent {...props} />
    </Suspense>
  );
}

const svg = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9.5h13V10" />
    </svg>
  );
}
function Chevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" strokeWidth="2.6" {...svg}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2.8" {...svg}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function IconCalc() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.9" {...svg}>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <rect x="8" y="6" width="8" height="3.2" rx="0.8" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.6" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="1.9" {...svg}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" strokeWidth="2.2" {...svg}>
      <path d="M7 20v-7M12 20V6M17 20v-10" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="2" className="shrink-0 text-accent" {...svg}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8h.01" strokeWidth="2.6" />
    </svg>
  );
}
function IconList({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 13 : 16} height={small ? 13 : 16} viewBox="0 0 24 24" strokeWidth="2.2" className="text-accent" {...svg}>
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}
function IconClockSmall({ small = false }: { small?: boolean }) {
  return (
    <svg width={small ? 13 : 16} height={small ? 13 : 16} viewBox="0 0 24 24" strokeWidth="2.4" className="text-accent" {...svg}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
/** Bezak: yaltiroq chiziqlar (faqat bezak). */
function Sparks({ className = '', small = false }: { className?: string; small?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" aria-hidden className={className}>
      {small ? <path d="M4 12l9 2M4 28l9-2" /> : <path d="M8 22 4 12M20 18 18 6M32 22l8-10" />}
    </svg>
  );
}
