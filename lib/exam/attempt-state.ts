import { z } from 'zod';
import { parsePayload, type ParsedPayload } from './payload';

// get_attempt_state() RPC javobi. Kalit hech qachon kelmaydi; yechim va ball faqat topshirilgandan keyin.

const type = z.enum(['y1', 'y2', 'o']);

const itemSchema = z.object({
  position: z.number().int().positive(),
  section: type,
  question_id: z.string(),
  type,
  block_id: z.number().int(),
  topic_id: z.number().int(),
  difficulty: z.enum(['L1', 'L2', 'L3']),
  stem_md: z.string(),
  payload: z.unknown(),
  solution_md: z.string().nullish(),
  mistake_note_md: z.string().nullish(),
  /** Faqat topshirilgandan keyin: question_keys.key_json */
  correct_answer: z.unknown().optional(),
});

const answerSchema = z.object({
  question_id: z.string(),
  value: z.unknown().nullable(),
  flagged: z.boolean(),
  time_spent_sec: z.number(),
  is_correct: z.boolean().nullish(),
  score: z.number().nullish(),
  max_score: z.number().nullish(),
  parts: z.object({ a: z.boolean(), b: z.boolean() }).nullish(),
});

const attemptSchema = z.object({
  id: z.string(),
  exam_id: z.string(),
  status: z.enum(['in_progress', 'submitted']),
  started_at: z.string(),
  deadline_at: z.string(),
  submitted_at: z.string().nullable(),
  submit_reason: z.enum(['user', 'timeout']).nullable(),
  raw_score: z.number().nullable(),
  max_raw: z.number().nullable(),
  scaled_score: z.number().nullable(),
  level: z.string().nullable(),
  scoring_version: z.string().nullable(),
  is_estimate: z.boolean(),
});

export const attemptStateSchema = z.object({
  server_now: z.string(),
  attempt: attemptSchema,
  items: z.array(itemSchema),
  answers: z.array(answerSchema),
});

export type AttemptState = z.infer<typeof attemptStateSchema>;
export type StateItem = AttemptState['items'][number];
export type StateAnswer = AttemptState['answers'][number];

export interface ParsedItem {
  position: number;
  questionId: string;
  type: StateItem['type'];
  blockId: number;
  topicId: number;
  stemMd: string;
  payload: ParsedPayload;
  solutionMd: string | null;
  mistakeNoteMd: string | null;
  correctAnswer: unknown;
}

/** Payload'ni tekshirib ko'rsatishga tayyor savollar ro'yxatini beradi; buzuq payload xato beradi (kontent xatosi). */
export function parseItems(items: StateItem[]): ParsedItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((i) => {
      try {
        return {
          position: i.position,
          questionId: i.question_id,
          type: i.type,
          blockId: i.block_id,
          topicId: i.topic_id,
          stemMd: i.stem_md,
          payload: parsePayload(i.type, i.payload),
          solutionMd: i.solution_md ?? null,
          mistakeNoteMd: i.mistake_note_md ?? null,
          correctAnswer: i.correct_answer ?? null,
        };
      } catch (cause) {
        throw new Error(`Savol ${i.question_id} (${i.position}-pozitsiya) payload'i yaroqsiz`, { cause });
      }
    });
}
