import { buildExtraQuestion, extraRequest } from '../../content/gen/extra/build';
import type { ExtraTemplate } from '../../content/gen/extra/types';
import { importQuestionSchema } from '../../lib/content/import-schema';
import { checkQuestion } from './harness';

/** Bir shablonning bir nechta seedi uchun umumiy tekshiruv (KaTeX, 4 til, tuzilish, import sxemasi); bo'sh ro'yxat = yaxshi. */
export function checkExtraTemplate(tpl: ExtraTemplate, seeds: number[]): string[] {
  const problems: string[] = [];
  for (const seed of seeds) {
    try {
      const spec = tpl.generate(seed);
      problems.push(...checkQuestion(spec, extraRequest(tpl, seed)));
      const q = buildExtraQuestion(tpl, seed);
      const r = importQuestionSchema.safeParse(q);
      if (!r.success) problems.push(`${tpl.id}#${seed}: import sxemasi: ${r.error.issues[0]?.message}`);
    } catch (e) {
      problems.push(`${tpl.id}#${seed}: ${(e as Error).message.slice(0, 120)}`);
    }
  }
  return problems;
}
