import { VARIANT_CODES } from './layout';
import { LANGS, type QuestionSpec, type SlotRequest } from './types';

/** Generator natijasini import formatiga (lib/content/import-schema.ts) o'tkazadi: uz asosiy, qolgan tillar i18n da. */
export function assemble(spec: QuestionSpec, req: SlotRequest): Record<string, unknown> {
  const base = spec.content('uz');
  const i18n: Record<string, unknown> = {};
  for (const lang of LANGS) {
    if (lang === 'uz') continue;
    const c = spec.content(lang);
    i18n[lang] = { stem_md: c.stem_md, payload: c.payload, solution_md: c.solution_md, mistake_note_md: c.mistake_note_md };
  }
  return {
    external_id: `gen-${VARIANT_CODES[req.variant]}-${String(req.position).padStart(2, '0')}`,
    type: req.type,
    block: req.block,
    topic: spec.topic,
    extra_topics: spec.extraTopics,
    difficulty: req.difficulty,
    est_seconds: spec.estSeconds,
    source: 'gen:v1',
    stem_md: base.stem_md,
    payload: base.payload,
    key: spec.key,
    solution_md: base.solution_md,
    mistake_note_md: base.mistake_note_md,
    i18n,
  };
}
