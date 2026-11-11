'use client';

import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { Chip } from '@/components/ui/chip';
import { Flag } from '@/components/ui/icons';
import type { AnswerValue } from '@/lib/exam/answer-state';
import type { ParsedPayload } from '@/lib/exam/payload';
import { AnswerO } from './answer-o';
import { AnswerY1 } from './answer-y1';
import { AnswerY2 } from './answer-y2';
import { FigureImage } from './figure';
import { FitText } from './fit-text';
import { FitZoom } from './fit-zoom';

export interface RunnerItem {
  position: number;
  questionId: string;
  blockName: string;
  stemMd: string;
  payload: ParsedPayload;
}

interface Props {
  item: RunnerItem;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
  /** Belgilash (bayroq) tugmasi kartaning yuqori o'ng burchagida; berilmasa (masalan admin ko'rinishi) chiqmaydi. */
  flag?: { on: boolean; disabled?: boolean; onToggle: () => void };
  /** Javob o'zgartirib bo'lmaydi (mashqda tekshirilgan savol): javob maydonlari bosilmaydi. */
  locked?: boolean;
  /**
   * Karta aniq balandlikka ega (imtihon/mashq ekrani): savol matni va javoblar har qanday ekranda (telefon, planshet, kompyuter)
   * ajratilgan joyga sig'adi, sahifa aylanmaydi. Yo'q bo'lsa (admin ko'rinishi): oddiy oqim, moslash faqat lg+ da.
   */
  fit?: boolean;
}

const asRecord = (v: AnswerValue | undefined): Record<string, string> => (v && typeof v === 'object' ? (v as Record<string, string>) : {});

/**
 * Savol matni hajmi kontentga moslashadi: qisqa savol katta va markazda, uzun savol kichikroq va chapdan o'qiladi.
 * Uzunlik formula buyruqlarisiz (backslash-buyruq, {, $ ...) sanaladi; chizma bo'lsa bir pog'ona kichik.
 */
const SIZES = [
  // max: katta ekranda boshlang'ich (eng katta) hajm; FitText ajratilgan joyga sig'maguncha kichraytiradi
  // phone: telefondagi boshlang'ich eng katta hajm (fit rejimi); undan keyin sig'maguncha kichrayadi
  { cls: 'text-[30px] leading-[40px] lg:text-[48px]', max: 48, phone: 28, center: true },
  { cls: 'text-[28px] leading-[38px] lg:text-[40px]', max: 40, phone: 25, center: true },
  { cls: 'text-[26px] leading-[35px] lg:text-[33px]', max: 33, phone: 22, center: false },
  { cls: 'text-[24px] leading-[33px] lg:text-[28px]', max: 28, phone: 20, center: false },
] as const;

export function stemSize(stemMd: string, hasFigure: boolean) {
  const len = stemMd.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}$\s^_]/g, '').length;
  const tier = len <= 70 ? 0 : len <= 160 ? 1 : len <= 320 ? 2 : 3;
  return SIZES[Math.min(3, tier + (hasFigure ? 1 : 0))];
}

export function QuestionView({ item, value, onChange, flag, locked = false, fit = false }: Props) {
  const t = useT();
  const { payload } = item;
  const typeLabel = { y1: t('exam.typeY1'), y2: t('exam.typeY2'), o: t('exam.typeO') }[payload.type];
  const size = stemSize(item.stemMd, !!payload.data.figure);

  return (
    // key: savol almashganda ichki holat (masalan Y-2 tanlangan band) qayta boshlanadi
    <section key={item.questionId} aria-labelledby="question-title" className={fit ? 'flex min-h-0 flex-1 flex-col gap-3 lg:gap-4' : 'flex flex-col gap-4 lg:min-h-0 lg:flex-1'}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Chip tone="brand">{t('exam.task', { n: item.position })}</Chip>
          <Chip>{typeLabel}</Chip>
          {/* Mavzu nomi mobilda yashiriladi (rasmiy imtihonda ham ko'rsatilmaydi; joy tejaladi) */}
          <span className="hidden text-[15px] font-bold text-muted sm:inline">{item.blockName}</span>
        </div>
        {flag && (
          <button
            type="button"
            onClick={flag.onToggle}
            disabled={flag.disabled}
            aria-pressed={flag.on}
            aria-label={flag.on ? t('exam.flagged') : t('exam.flag')}
            title={flag.on ? t('exam.flagged') : t('exam.flag')}
            className={
              'flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-b-4 transition lg:size-10 ' +
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 ' +
              (flag.on ? 'border-gold-edge bg-warn-soft text-brand-ink' : 'border-line-strong bg-white text-muted hover:bg-surface hover:text-ink')
            }
          >
            <Flag width={22} height={22} fill={flag.on ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      {/* Savol: kartaning o'rtasida. Chizma bo'lsa: matn chapda, chizma o'ngda va mavjud balandlikka sig'adi (scrollsiz) */}
      <div className={fit ? 'flex min-h-[64px] flex-1 flex-col lg:min-h-[88px]' : 'flex flex-col lg:min-h-[88px] lg:flex-1'}>
        {payload.data.figure ? (
          <div
            className={
              fit
                ? 'grid h-full grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 sm:grid-cols-2 sm:grid-rows-[minmax(0,1fr)] sm:gap-6 lg:gap-10'
                : 'grid gap-5 py-3 lg:h-full lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:py-0'
            }
          >
            <FitText
              id="question-title"
              contentKey={item.stemMd}
              max={size.max}
              maxNarrow={size.phone}
              always={fit}
              className={`font-heading font-semibold text-ink select-none ${size.cls}`}
              boxClassName={fit ? 'h-full' : 'lg:h-full'}
            >
              <Markdown>{item.stemMd}</Markdown>
            </FitText>
            <div className={fit ? 'flex min-h-0 items-center justify-center py-1' : 'flex min-h-0 items-center justify-center lg:h-full lg:py-1'}>
              <FigureImage figure={payload.data.figure} fill={fit ? 'always' : true} />
            </div>
          </div>
        ) : (
          <FitText
            id="question-title"
            contentKey={item.stemMd}
            max={size.max}
            maxNarrow={size.phone}
            always={fit}
            className={`mx-auto max-w-[1000px] font-heading font-semibold text-ink select-none ${size.cls} ${size.center ? 'text-center' : ''}`}
            boxClassName={fit ? 'h-full py-1 lg:py-2' : 'py-3 lg:h-full lg:py-2'}
          >
            <Markdown>{item.stemMd}</Markdown>
          </FitText>
        )}
      </div>

      {/* Javoblar: karta pastiga mahkamlangan, har savolda bir xil joyda; ajratilgan joyga sig'maguncha kichrayadi (scrollsiz) */}
      <FitZoom contentKey={item.questionId} always={fit}>
        <div inert={locked} className={locked ? 'opacity-90' : undefined}>
          {payload.type === 'y1' && <AnswerY1 payload={payload.data} value={typeof value === 'string' ? value : undefined} onChange={onChange} />}
          {payload.type === 'y2' && <AnswerY2 payload={payload.data} value={asRecord(value)} onChange={onChange} />}
          {payload.type === 'o' && <AnswerO payload={payload.data} value={asRecord(value)} onChange={onChange} />}
        </div>
      </FitZoom>
    </section>
  );
}
