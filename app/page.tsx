import Link from 'next/link';
import { Art, ArtIcon } from '@/components/art';
import { ART } from '@/components/art-data';
import type { ArtName, IconName } from '@/components/art-data';
import { Decor } from '@/components/decor';
import { PageShell } from '@/components/page-shell';
import { buttonClass } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { getI18n } from '@/lib/i18n/server';
import { formatScore } from '@/lib/format';
import { requireParticipant } from '@/lib/participant.server';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const [{ t, lang }, participant] = await Promise.all([getI18n(), requireParticipant('/')]);
  // Qaytib kelgan ishtirokchi: shu sessiyada yakunlangan urinish bor
  const supabase = await createClient();
  const { data: last } = await supabase
    .from('attempts')
    .select('scaled_score')
    .eq('status', 'submitted')
    .not('scaled_score', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const returning = last !== null;
  const cards: {
    href: string;
    label: string;
    hint: string;
    icon: IconName;
    art: ArtName;
    primary?: boolean;
  }[] = [
    {
      href: '/exams',
      label: t('nav.exams'),
      hint: t('home.hintExams'),
      icon: 'trainer',
      art: 'trophy',
      primary: true,
    },
    {
      href: '/history',
      label: t('nav.history'),
      hint: t('home.hintHistory'),
      icon: 'daily-reset',
      art: 'chart',
    },
    {
      href: '/mistakes',
      label: t('nav.mistakes'),
      hint: t('home.hintMistakes'),
      icon: 'random-questions',
      art: 'books',
    },
    {
      href: '/dtm',
      label: t('nav.dtm'),
      hint: t('home.hintDtm'),
      icon: 'coin',
      art: 'crown',
    },
  ];

  return (
    <PageShell fit>
      <main className="relative mx-auto grid w-full max-w-[1180px] flex-1 content-center items-center gap-8 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-2 lg:gap-14 lg:overflow-y-auto">
        <Decor
          items={[
            {
              name: 'sparkles',
              width: 70,
              className: 'left-[44%] top-8 rotate-6',
            },
            {
              name: 'books',
              width: 62,
              className: 'left-[27%] bottom-[14%] rotate-6',
            },
            {
              name: 'pyramid',
              width: 52,
              className: 'left-[43%] bottom-[10%] -rotate-6',
            },
          ]}
        />
        <section className="relative z-10 flex flex-col gap-4 lg:gap-[clamp(8px,1.6dvh,16px)]">
          <Chip>{t('common.appName')}</Chip>
          <h1 className="font-heading text-[34px] leading-[42px] font-semibold text-ink lg:text-[clamp(30px,5.4dvh,44px)] lg:leading-[1.18]">
            {t(returning ? 'home.helloBack' : 'home.hello', { name: participant.fullName })}
          </h1>
          <p className="max-w-[460px] text-[18px] leading-7 font-semibold text-muted">{t('home.lead')}</p>
          {last?.scaled_score != null && (
            <p className="w-fit rounded-xl bg-success-soft px-3.5 py-2 text-[16px] font-extrabold text-success-ink">
              {t('home.lastResult', { score: formatScore(last.scaled_score, lang) })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/exams" className={buttonClass('primary')}>
              {t('nav.exams')}
            </Link>
            <Link href="/start" className="text-[16px] font-extrabold text-accent underline underline-offset-4">
              {t('home.edit')}
            </Link>
          </div>
          {/* mascot balandligi ekran balandligiga moslashadi: sahifa scrollsiz sig'adi */}
          <Art name="mascot-laptop" width={190} priority className="mt-1 hidden h-[clamp(90px,21dvh,190px)]! w-auto! self-start lg:block" />
        </section>

        <section className="relative z-10 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className={
                'group flex min-h-[150px] flex-col justify-between gap-4 rounded-3xl border-2 border-b-[6px] p-4 transition sm:min-h-[176px] sm:p-5 ' +
                'hover:-translate-y-1 active:translate-y-0.5 active:border-b-2 ' +
                (c.primary
                  ? 'border-brand-edge bg-linear-to-b from-[#f57c2b] to-brand text-white shadow-[0_14px_24px_-14px_rgba(184,67,6,0.8)]'
                  : 'border-line-strong bg-white text-ink shadow-card hover:border-accent/50')
              }
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl border-2 ${c.primary ? 'border-white/40 bg-white/90' : 'border-line bg-surface'}`}
                >
                  <ArtIcon name={c.icon} size={30} />
                </span>
                <Art
                  name={c.art}
                  width={Math.round((72 * ART[c.art].w) / ART[c.art].h)}
                  className="drop-shadow-[0_6px_6px_rgba(38,24,110,0.18)] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
                />
              </span>
              <span>
                <span className="block text-[20px] leading-6 font-extrabold">{c.label}</span>
                <span className={`mt-1 block text-[14px] leading-5 font-bold ${c.primary ? 'text-white/90' : 'text-muted'}`}>{c.hint}</span>
              </span>
            </Link>
          ))}
        </section>
      </main>
    </PageShell>
  );
}
