'use client';

import { useT } from '@/components/i18n/provider';
import { Markdown } from '@/components/math/markdown';
import { Chip } from '@/components/ui/chip';
import type { AnswerValue } from '@/lib/exam/answer-state';
import type { ParsedPayload } from '@/lib/exam/payload';
import { AnswerO } from './answer-o';
import { AnswerY1 } from './answer-y1';
import { AnswerY2 } from './answer-y2';
import { FigureImage } from './figure';
import { FitText } from './fit-text';

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
}

const asRecord = (v: AnswerValue | undefined): Record<string, string> => (v && typeof v === 'object' ? (v as Record<string, string>) : {});

/**
 * Savol matni hajmi kontentga moslashadi: qisqa savol katta va markazda, uzun savol kichikroq va chapdan o'qiladi.
 * Uzunlik formula buyruqlarisiz (backslash-buyruq, {, $ ...) sanaladi; chizma bo'lsa bir pog'ona kichik.
 */
const SIZES = [
  // max: katta ekranda boshlang'ich (eng katta) hajm; FitText ajratilgan joyga sig'maguncha kichraytiradi
  { cls: 'text-[30px] leading-[40px] lg:text-[48px]', max: 48, center: true },
  { cls: 'text-[28px] leading-[38px] lg:text-[40px]', max: 40, center: true },
  { cls: 'text-[26px] leading-[35px] lg:text-[33px]', max: 33, center: false },
  { cls: 'text-[24px] leading-[33px] lg:text-[28px]', max: 28, center: false },
] as const;

export function stemSize(stemMd: string, hasFigure: boolean) {
  const len = stemMd.replace(/\\[a-zA-Z]+/g, 'x').replace(/[{}$\s^_]/g, '').length;
  const tier = len <= 70 ? 0 : len <= 160 ? 1 : len <= 320 ? 2 : 3;
  return SIZES[Math.min(3, tier + (hasFigure ? 1 : 0))];
}

export function QuestionView({ item, value, onChange }: Props) {
  const t = useT();
  const { payload } = item;
  const typeLabel = { y1: t('exam.typeY1'), y2: t('exam.typeY2'), o: t('exam.typeO') }[payload.type];
  const size = stemSize(item.stemMd, !!payload.data.figure);

  return (
    // key: savol almashganda ichki holat (masalan Y-2 tanlangan band) qayta boshlanadi
    <section key={item.questionId} aria-labelledby="question-title" className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="brand">{t('exam.task', { n: item.position })}</Chip>
        <Chip>{typeLabel}</Chip>
        <span className="text-[15px] font-bold text-muted">{item.blockName}</span>
      </div>

      {/* Savol: kartaning o'rtasida. Chizma bo'lsa: matn chapda, chizma o'ngda va mavjud balandlikka sig'adi (scrollsiz) */}
      <div className="flex flex-col lg:min-h-[110px] lg:flex-1">
        {payload.data.figure ? (
          <div className="grid gap-5 py-3 lg:h-full lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-10 lg:py-0">
            <FitText
              id="question-title"
              contentKey={item.stemMd}
              max={size.max}
              className={`font-heading font-semibold text-ink select-none ${size.cls}`}
              boxClassName="lg:h-full"
            >
              <Markdown>{item.stemMd}</Markdown>
            </FitText>
            <div className="flex min-h-0 items-center justify-center lg:h-full lg:py-1">
              <FigureImage figure={payload.data.figure} fill />
            </div>
          </div>
        ) : (
          <FitText
            id="question-title"
            contentKey={item.stemMd}
            max={size.max}
            className={`mx-auto max-w-[1000px] font-heading font-semibold text-ink select-none ${size.cls} ${size.center ? 'text-center' : ''}`}
            boxClassName="py-3 lg:h-full lg:py-2"
          >
            <Markdown>{item.stemMd}</Markdown>
          </FitText>
        )}
      </div>

      {/* Javoblar: karta pastiga mahkamlangan, har savolda bir xil joyda */}
      <div className="flex flex-col gap-5 lg:shrink-0 lg:border-t-2 lg:border-line lg:pt-5">
        {payload.type === 'y1' && <AnswerY1 payload={payload.data} value={typeof value === 'string' ? value : undefined} onChange={onChange} />}
        {payload.type === 'y2' && <AnswerY2 payload={payload.data} value={asRecord(value)} onChange={onChange} />}
        {payload.type === 'o' && <AnswerO payload={payload.data} value={asRecord(value)} onChange={onChange} />}
      </div>
    </section>
  );
}
