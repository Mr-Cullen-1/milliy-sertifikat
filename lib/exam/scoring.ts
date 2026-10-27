import type { Difficulty, QuestionType, ScoringConfig } from './format';
import { matchesAny } from './normalize-answer';

export interface ScorableItem {
  questionId: string;
  type: QuestionType;
  difficulty: Difficulty;
  /** muallif belgilagan vazn; bo'lmasa konfigdagi standart ishlatiladi */
  weight?: number | null;
}

export type AnswerValue = string | Record<string, string> | { a?: string; b?: string };

export type AnswerKey =
  | { type: 'y1'; correct: string }
  | { type: 'y2'; pairs: Record<string, string> }
  | { type: 'o'; a?: readonly string[]; b?: readonly string[] };

export interface ItemScore {
  score: number;
  max: number;
  correct: boolean;
  parts?: { a: boolean; b: boolean };
}

export interface AttemptScore {
  raw: number;
  maxRaw: number;
  scaled: number;
}

// Kasr ball yig'indisidagi suzuvchi nuqta xatosini bartaraf etish uchun 1 xona aniqlikda yaxlitlanadi.
const round1 = (x: number) => Math.round(x * 10) / 10;

function y1Weight(item: ScorableItem, cfg: ScoringConfig): number {
  return item.weight ?? cfg.y1Weights[item.difficulty];
}

export function maxScore(item: ScorableItem, key: AnswerKey, cfg: ScoringConfig): number {
  if (item.type === 'y1') return y1Weight(item, cfg);
  if (item.type === 'y2') return item.weight ?? cfg.y2Weight;
  if (key.type !== 'o') return 0;
  const hasA = !!key.a?.length;
  const hasB = !!key.b?.length;
  if (hasA && hasB) return cfg.open.both;
  return hasA ? cfg.open.a : hasB ? cfg.open.b : 0;
}

export function scoreItem(
  item: ScorableItem,
  answer: AnswerValue | undefined,
  key: AnswerKey,
  cfg: ScoringConfig,
): ItemScore {
  const max = maxScore(item, key, cfg);
  if (answer === undefined || key.type !== item.type) return { score: 0, max, correct: false };

  if (key.type === 'y1') {
    const correct = typeof answer === 'string' && answer.trim().toUpperCase() === key.correct.toUpperCase();
    return { score: correct ? max : 0, max, correct };
  }

  if (key.type === 'y2') {
    const given = typeof answer === 'object' ? (answer as Record<string, string>) : {};
    const entries = Object.entries(key.pairs);
    const correct =
      entries.length > 0 && entries.every(([sub, letter]) => given[sub]?.toUpperCase() === letter.toUpperCase());
    return { score: correct ? max : 0, max, correct };
  }

  const given = typeof answer === 'object' ? (answer as { a?: string; b?: string }) : {};
  const a = !!key.a?.length && matchesAny(given.a, key.a);
  const b = !!key.b?.length && matchesAny(given.b, key.b);
  const score = a && b ? cfg.open.both : a ? cfg.open.a : b ? cfg.open.b : 0;
  const hasBoth = !!key.a?.length && !!key.b?.length;
  return { score, max, correct: hasBoth ? a && b : a || b, parts: { a, b } };
}

/** Xom ulush (0..1) ni konfigdagi bo'lakli-chiziqli nuqtalar bo'yicha 0..75 shkalaga o'tkazadi. */
export function toScaled(ratio: number, scale: ScoringConfig['scale']): number {
  const first = scale[0];
  const last = scale[scale.length - 1];
  if (!first || !last) return 0;
  if (ratio <= first[0]) return round1(first[1]);
  if (ratio >= last[0]) return round1(last[1]);
  for (let i = 1; i < scale.length; i++) {
    const [x0, y0] = scale[i - 1]!;
    const [x1, y1] = scale[i]!;
    if (ratio <= x1) return round1(y0 + ((ratio - x0) / (x1 - x0)) * (y1 - y0));
  }
  return round1(last[1]);
}

export function scoreAttempt(results: ItemScore[], cfg: ScoringConfig): AttemptScore {
  const raw = round1(results.reduce((sum, r) => sum + r.score, 0));
  const maxRaw = round1(results.reduce((sum, r) => sum + r.max, 0));
  const scaled = maxRaw > 0 ? toScaled(raw / maxRaw, cfg.scale) : 0;
  return { raw, maxRaw, scaled };
}
