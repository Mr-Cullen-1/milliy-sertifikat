import { z } from 'zod';

// admin_* RPC javoblari (jsonb) uchun sxemalar

const num = z.coerce.number();

export const overviewSchema = z.object({
  participants: num,
  attempts_active: num,
  attempts_submitted: num,
  attempts_24h: num,
  avg_scaled: num.nullable(),
  levels: z.record(z.string(), num),
  questions: z.object({ total: num, published: num, draft: num }),
  exams: z.array(
    z.object({
      id: z.string(),
      code: z.string().nullable(),
      title: z.string(),
      status: z.enum(['draft', 'published', 'archived']),
      published_at: z.string().nullable(),
      items: num,
      attempts: num,
      submitted: num,
      avg_scaled: num.nullable(),
    }),
  ),
});
export type Overview = z.infer<typeof overviewSchema>;

export const attemptRowSchema = z.object({
  id: z.string(),
  exam_id: z.string(),
  exam_title: z.string(),
  exam_code: z.string().nullable(),
  user_id: z.string(),
  name: z.string().nullable(),
  phone: z.string().nullable(),
  grade: z.string().nullable(),
  status: z.enum(['in_progress', 'submitted']),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
  submit_reason: z.enum(['user', 'timeout']).nullable(),
  raw_score: num.nullable(),
  max_raw: num.nullable(),
  scaled_score: num.nullable(),
  level: z.string().nullable(),
  tab_switches: num,
});
export const attemptsPageSchema = z.object({ total: num, rows: z.array(attemptRowSchema) });

export const participantsPageSchema = z.object({
  total: num,
  rows: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string().nullable(),
      grade: z.string().nullable(),
      lang: z.string().nullable(),
      created_at: z.string(),
      consent_at: z.string().nullable(),
      attempts: num,
      best_scaled: num.nullable(),
      last_attempt_at: z.string().nullable(),
    }),
  ),
});

export const questionStatSchema = z.object({
  question_id: z.string(),
  external_id: z.string().nullable(),
  block_id: num,
  type: z.enum(['y1', 'y2', 'o']),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  position: num.nullable(),
  answered: num,
  correct: num,
});
export const questionStatsSchema = z.array(questionStatSchema);

export const PAGE_SIZE = 50;
