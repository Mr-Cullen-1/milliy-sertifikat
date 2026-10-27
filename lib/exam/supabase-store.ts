import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Database } from '../supabase/database.types';
import type { AttemptResult, CloseResult, ExamStore, ScoringData } from './finalize';
import { scoringConfigSchema } from './schemas';

const closeResultSchema = z.object({
  status: z.enum(['in_progress', 'submitted']),
  scored: z.boolean(),
  server_now: z.string().optional(),
});

function check<T>(op: string, res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) throw new Error(`${op}: ${res.error.message} (${res.error.code})`, { cause: res.error });
  if (res.data === null || res.data === undefined) throw new Error(`${op}: bo'sh javob`);
  return res.data;
}

// PostgREST bog'lanishni obyekt yoki massiv ko'rinishida qaytarishi mumkin.
const first = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * ExamStore'ning Supabase realizatsiyasi. `admin` — service_role mijozi (lib/supabase/admin.ts),
 * shuning uchun faqat serverda va foydalanuvchi attempt egasi ekani tekshirilgandan keyin ishlating.
 */
export function createSupabaseExamStore(admin: SupabaseClient<Database>): ExamStore {
  return {
    async closeAttempt(attemptId, onlyIfExpired): Promise<CloseResult> {
      const data = check(
        'close_attempt',
        await admin.rpc('close_attempt', { p_attempt_id: attemptId, p_only_if_expired: onlyIfExpired }),
      );
      const r = closeResultSchema.parse(data);
      return { status: r.status, scored: r.scored, serverNow: r.server_now };
    },

    async loadScoringData(attemptId): Promise<ScoringData> {
      const attempt = check(
        'attempts',
        await admin
          .from('attempts')
          .select('exam_id, exams!inner(exam_formats!inner(scoring))')
          .eq('id', attemptId)
          .single(),
      );
      const format = first(first(attempt.exams)?.exam_formats);
      if (!format) throw new Error(`attempt ${attemptId}: imtihon formati topilmadi`);
      const scoring = scoringConfigSchema.parse(format.scoring);

      const items = check(
        'exam_items',
        await admin
          .from('exam_items')
          .select('position, question_id, questions!inner(type, difficulty, weight, question_keys(key_json))')
          .eq('exam_id', attempt.exam_id)
          .order('position'),
      );

      const answers = check(
        'answers',
        await admin.from('answers').select('question_id, value_json').eq('attempt_id', attemptId),
      );
      const answerByQuestion = new Map(answers.map((a) => [a.question_id, a.value_json]));

      return {
        scoring,
        items: items.map((row) => {
          const q = first(row.questions);
          if (!q) throw new Error(`savol ${row.question_id} topilmadi`);
          return {
            item: { questionId: row.question_id, type: q.type, difficulty: q.difficulty, weight: q.weight },
            key: first(q.question_keys)?.key_json ?? null,
            answer: answerByQuestion.get(row.question_id) ?? null,
          };
        }),
      };
    },

    async storeScore(attemptId, result: AttemptResult): Promise<boolean> {
      return check(
        'store_attempt_score',
        await admin.rpc('store_attempt_score', {
          p_attempt_id: attemptId,
          p_raw: result.raw,
          p_max: result.maxRaw,
          p_scaled: result.scaled,
          // Daraja berilmasa NULL yuboriladi: generatsiya qilingan tip nullni bilmaydi, SQL esa qabul qiladi.
          p_level: result.level as string,
          p_scoring_version: result.scoringVersion,
          p_results: result.results,
        }),
      );
    },
  };
}
