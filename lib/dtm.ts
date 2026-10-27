import { mathFormatV1 } from '../config/exam-format.math-v1';
import { DTM_FULL_SCORE, DTM_MAX, DTM_MIN_SCORE, type DtmSubject } from '../config/dtm';
import { levelFor } from './exam/levels';

export interface DtmResult {
  /** DTM bali (2 xona aniqlik) */
  points: number;
  max: number;
  /** maksimal ballning foizi (1 xona) */
  percent: number;
  /** sertifikat darajasi; 46 dan past bo'lsa null (sertifikat berilmaydi) */
  level: string | null;
}

export const LEVELS = mathFormatV1.scoring.levels;

/** Daraja bo'yicha hisoblashda darajaning quyi chegarasi olinadi (B+ = 60). */
export const levelMinScore = (level: string): number | undefined => LEVELS.find((l) => l.code === level)?.min;

const round = (x: number, digits: number) => {
  const k = 10 ** digits;
  return Math.round(x * k) / k;
};

/** Sertifikat bali (0..75) va fan o'rni bo'yicha DTM balli. */
export function dtmPoints(subject: DtmSubject, score: number): DtmResult {
  const max = DTM_MAX[subject];
  const level = levelFor(score, LEVELS);
  if (!Number.isFinite(score) || score < DTM_MIN_SCORE || level === null) return { points: 0, max, percent: 0, level: null };

  // Majburiy fan va A/A+ darajalar: maksimal ball. Qolganlari: ball / 65 * maksimal.
  if (subject === 'mandatory' || score >= DTM_FULL_SCORE) return { points: max, max, percent: 100, level };
  return { points: round((max * score) / DTM_FULL_SCORE, 2), max, percent: round((score / DTM_FULL_SCORE) * 100, 1), level };
}
