import { z } from 'zod';

export const topicStatSchema = z.object({
  topic_id: z.number().int(),
  block_id: z.number().int(),
  total: z.number().int(),
  correct: z.number().int(),
});

export type TopicStat = z.infer<typeof topicStatSchema>;

export interface WeakTopic extends TopicStat {
  /** 0..100 */
  pct: number;
}

/**
 * Zaif mavzular: kamida minTotal ta savol bo'yicha eng past to'g'ri javoblar ulushi (o'sish tartibida).
 * 100% li mavzular zaif hisoblanmaydi.
 */
export function weakTopics(stats: TopicStat[], opts: { minTotal?: number; limit?: number } = {}): WeakTopic[] {
  const { minTotal = 2, limit = 5 } = opts;
  return stats
    .filter((s) => s.total >= minTotal && s.correct < s.total)
    .map((s) => ({ ...s, pct: Math.round((s.correct / s.total) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total || a.topic_id - b.topic_id)
    .slice(0, limit);
}

export interface HistorySummary {
  attempts: number;
  best: number | null;
  average: number | null;
}

export function summarize(scores: number[]): HistorySummary {
  if (scores.length === 0) return { attempts: 0, best: null, average: null };
  const sum = scores.reduce((s, x) => s + x, 0);
  return { attempts: scores.length, best: Math.max(...scores), average: Math.round((sum / scores.length) * 10) / 10 };
}

// Xatolar daftari (get_my_mistakes) qatori
export const mistakeSchema = z.object({
  question_id: z.string(),
  block_id: z.number().int(),
  topic_id: z.number().int(),
  type: z.enum(['y1', 'y2', 'o']),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  stem_md: z.string(),
  payload: z.unknown(),
  solution_md: z.string().nullish(),
  mistake_note_md: z.string().nullish(),
  correct_answer: z.unknown().nullish(),
  last_value: z.unknown().nullish(),
  times_wrong: z.number().int(),
  times_seen: z.number().int(),
});

export type Mistake = z.infer<typeof mistakeSchema>;
