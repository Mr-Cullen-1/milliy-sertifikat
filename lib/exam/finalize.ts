import type { QuestionType, ScoringConfig } from './format';
import { levelFor } from './levels';
import { parseAnswer, parseKey } from './schemas';
import { scoreAttempt, scoreItem, type ItemScore, type ScorableItem } from './scoring';

export interface CloseResult {
  status: 'in_progress' | 'submitted';
  /** ball allaqachon yozilganmi (raw_score is not null) */
  scored: boolean;
  /** DB soati (ISO); brauzer taymerini sinxronlash uchun */
  serverNow?: string;
}

export interface ScoringInputItem {
  item: ScorableItem;
  /** question_keys.key_json */
  key: unknown;
  /** answers.value_json (javob berilmagan bo'lsa null/undefined) */
  answer: unknown;
}

export interface ScoringData {
  scoring: ScoringConfig;
  items: ScoringInputItem[];
}

// `type` (interface emas): JSON sifatida DB'ga yuborilgani uchun implicit index signature kerak.
export type StoredResult = {
  question_id: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  parts: { a: boolean; b: boolean } | null;
};

export interface AttemptResult {
  raw: number;
  maxRaw: number;
  scaled: number;
  level: string | null;
  scoringVersion: string;
  results: StoredResult[];
}

/** Ma'lumotlar qatlami (Supabase adapteri, testda PGlite adapteri). Barcha metodlar faqat serverda chaqiriladi. */
export interface ExamStore {
  /** DB: close_attempt(p_attempt_id, p_only_if_expired) */
  closeAttempt(attemptId: string, onlyIfExpired: boolean): Promise<CloseResult>;
  /** Javoblar, kalitlar va ball konfiguratsiyasini bitta o'qishda yuklaydi */
  loadScoringData(attemptId: string): Promise<ScoringData>;
  /** DB: store_attempt_score(...); ball allaqachon yozilgan bo'lsa false */
  storeScore(attemptId: string, result: AttemptResult): Promise<boolean>;
}

export type FinalizeOutcome =
  | { status: 'in_progress'; serverNow?: string }
  | { status: 'submitted'; scored: true; result?: AttemptResult; serverNow?: string };

/** Sof hisoblash: kalit noto'g'ri bo'lsa jim ketmaydi — xato beradi (0 ball berib yuborish halol emas). */
export function computeAttemptResult(data: ScoringData): AttemptResult {
  const scored: Array<{ questionId: string; type: QuestionType; score: ItemScore }> = data.items.map(
    ({ item, key, answer }) => {
      let parsedKey;
      try {
        parsedKey = parseKey(item.type, key);
      } catch (cause) {
        throw new Error(`Savol ${item.questionId} kaliti noto'g'ri (${item.type})`, { cause });
      }
      const score = scoreItem(item, parseAnswer(item.type, answer), parsedKey, data.scoring);
      return { questionId: item.questionId, type: item.type, score };
    },
  );

  const totals = scoreAttempt(
    scored.map((s) => s.score),
    data.scoring,
  );

  return {
    ...totals,
    level: levelFor(totals.scaled, data.scoring.levels),
    scoringVersion: data.scoring.version,
    results: scored.map(({ questionId, score }) => ({
      question_id: questionId,
      is_correct: score.correct,
      score: score.score,
      max_score: score.max,
      parts: score.parts ?? null,
    })),
  };
}

/**
 * Attempt'ni yopadi va ballini yozadi.
 * - onlyIfExpired=true: lazy finalize (muddat DB soati bo'yicha o'tgan bo'lsagina yopiladi)
 * - onlyIfExpired=false: talaba "topshirish" tugmasini bosdi
 * Idempotent: yopilgan, lekin ballsiz attempt (oldingi chaqiruv yarimda uzilgan) qayta hisoblanadi;
 * ballangan attempt'ga tegilmaydi.
 */
export async function finalizeAttempt(
  store: ExamStore,
  attemptId: string,
  opts: { onlyIfExpired: boolean },
): Promise<FinalizeOutcome> {
  const closed = await store.closeAttempt(attemptId, opts.onlyIfExpired);
  if (closed.status !== 'submitted') return { status: 'in_progress', serverNow: closed.serverNow };
  if (closed.scored) return { status: 'submitted', scored: true, serverNow: closed.serverNow };

  const result = computeAttemptResult(await store.loadScoringData(attemptId));
  await store.storeScore(attemptId, result);
  return { status: 'submitted', scored: true, result, serverNow: closed.serverNow };
}
