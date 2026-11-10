import { mathFormatV1 } from '../../config/exam-format.math-v1';
import type { Difficulty, QuestionType } from '../exam/format';
import { scoreItem } from '../exam/scoring';
import { parseAnswer, parseKey } from '../exam/schemas';

export interface PracticeGrade {
  correct: boolean;
  /** O savol uchun a/b bandlari; boshqa turlarda null */
  parts: { a: boolean; b: boolean } | null;
}

/**
 * Mashq javobini kalit bilan solishtiradi (imtihon bilan bir xil qoidalar: lib/exam/scoring.ts).
 * Javob berilmagan yoki shakli noto'g'ri bo'lsa noto'g'ri hisoblanadi; kalit buzilgan bo'lsa xato tashlanadi.
 */
export function gradePractice(type: QuestionType, difficulty: Difficulty, rawValue: unknown, rawKey: unknown): PracticeGrade {
  const key = parseKey(type, rawKey);
  const answer = parseAnswer(type, rawValue);
  const r = scoreItem({ questionId: '', type, difficulty }, answer, key, mathFormatV1.scoring);
  return { correct: r.correct, parts: r.parts ?? null };
}
