import { z } from 'zod';

// get_practice_state natijasi (kalit faqat ochilishi mumkin bo'lgan javoblarda keladi)
export const practiceSessionSchema = z.object({
  id: z.string(),
  block_id: z.number().int(),
  difficulty: z.enum(['L1', 'L2', 'L3']).nullable(),
  mode: z.enum(['practice', 'timed', 'exam']),
  question_count: z.number().int(),
  started_at: z.string(),
  deadline_at: z.string().nullable(),
  submitted_at: z.string().nullable(),
  status: z.enum(['in_progress', 'submitted']),
  correct_count: z.number().int().nullable(),
  server_now: z.string(),
});

export const practiceItemSchema = z.object({
  position: z.number().int(),
  question_id: z.string(),
  type: z.enum(['y1', 'y2', 'o']),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  block_id: z.number().int(),
  topic_id: z.number().int(),
  stem_md: z.string(),
  payload: z.unknown(),
});

export const practiceAnswerSchema = z.object({
  question_id: z.string(),
  value: z.unknown().nullish(),
  is_correct: z.boolean().nullish(),
  parts: z.object({ a: z.boolean(), b: z.boolean() }).nullish(),
  correct_answer: z.unknown().nullish(),
  solution_md: z.string().nullish(),
  mistake_note_md: z.string().nullish(),
});

export const practiceStateSchema = z.object({
  session: practiceSessionSchema,
  items: z.array(practiceItemSchema),
  answers: z.array(practiceAnswerSchema),
});

export type PracticeState = z.infer<typeof practiceStateSchema>;
export type PracticeAnswer = z.infer<typeof practiceAnswerSchema>;
export type PracticeItem = z.infer<typeof practiceItemSchema>;

/** Savol tekshirilganmi (kalit ochilgan): is_correct kelgan bo'lsa. */
export const isRevealed = (a: PracticeAnswer | undefined): boolean => a?.is_correct !== undefined && a.is_correct !== null;

export const practiceListRowSchema = z.object({
  id: z.string(),
  block_id: z.number().int(),
  difficulty: z.enum(['L1', 'L2', 'L3']).nullable(),
  mode: z.enum(['practice', 'timed', 'exam']),
  question_count: z.number().int(),
  status: z.enum(['in_progress', 'submitted']),
  correct_count: z.number().int().nullable(),
  started_at: z.string(),
  submitted_at: z.string().nullable(),
});
export type PracticeListRow = z.infer<typeof practiceListRowSchema>;

export const poolStatSchema = z.object({ block_id: z.number().int(), difficulty: z.enum(['L1', 'L2', 'L3']), n: z.number().int() });
