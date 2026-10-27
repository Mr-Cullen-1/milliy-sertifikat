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

const asRecord = (v: AnswerValue | undefined): Record<string, string> =>
  v && typeof v === 'object' ? (v as Record<string, string>) : {};

export function QuestionView({ item, value, onChange }: Props) {
  const t = useT();
  const { payload } = item;
  const typeLabel = { y1: t('exam.typeY1'), y2: t('exam.typeY2'), o: t('exam.typeO') }[payload.type];

  return (
    // key: savol almashganda ichki holat (masalan Y-2 tanlangan band) qayta boshlanadi
    <section key={item.questionId} aria-labelledby="question-title" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="brand">{t('exam.task', { n: item.position })}</Chip>
        <Chip>{typeLabel}</Chip>
        <span className="text-[15px] font-bold text-muted">{item.blockName}</span>
      </div>

      <div
        id="question-title"
        className="font-heading text-[26px] leading-[34px] font-semibold text-ink select-none sm:text-[30px] sm:leading-[38px]"
      >
        <Markdown>{item.stemMd}</Markdown>
      </div>

      {payload.data.figure && <FigureImage figure={payload.data.figure} />}

      {payload.type === 'y1' && (
        <AnswerY1 payload={payload.data} value={typeof value === 'string' ? value : undefined} onChange={onChange} />
      )}
      {payload.type === 'y2' && <AnswerY2 payload={payload.data} value={asRecord(value)} onChange={onChange} />}
      {payload.type === 'o' && <AnswerO payload={payload.data} value={asRecord(value)} onChange={onChange} />}
    </section>
  );
}
