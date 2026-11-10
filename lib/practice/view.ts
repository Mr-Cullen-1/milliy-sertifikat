import { describeAnswer, describeKey, type AnswerValue } from '../exam/answer-state';
import { parsePayload, type ParsedPayload } from '../exam/payload';
import { parseAnswer } from '../exam/schemas';
import { FREE_PRACTICE_SOLUTIONS } from './config';
import type { PracticeAnswer, PracticeItem } from './state';

export interface ParsedPracticeItem extends PracticeItem {
  parsed: ParsedPayload;
}

/** Savol payload'ini tekshirib o'qiydi; buzilgan savol butun mashqni yiqitmaydi (o'tkazib yuboriladi). */
export function parseItems(items: PracticeItem[]): ParsedPracticeItem[] {
  return items.flatMap((it) => {
    try {
      return [{ ...it, parsed: parsePayload(it.type, it.payload) }];
    } catch {
      return [];
    }
  });
}

export const answerValueOf = (type: PracticeItem['type'], a: PracticeAnswer | undefined): AnswerValue | undefined => parseAnswer(type, a?.value);

/** Yechim ochiqmi: Pro yoki har mashqdagi dastlabki FREE_PRACTICE_SOLUTIONS ta savol. */
export const solutionOpen = (position: number, isPro: boolean): boolean => isPro || position <= FREE_PRACTICE_SOLUTIONS;

export const y2IdsOf = (p: ParsedPayload): string[] => (p.type === 'y2' ? p.data.items.map((i) => i.id) : []);

export { describeAnswer, describeKey };
