import { importFileSchema, type ImportFile } from './import-schema';

export const MAX_IMPORT_BYTES = 4 * 1024 * 1024;
const MAX_PROBLEMS = 60;

export interface ImportProblem {
  path: string;
  message: string;
}

export interface ImportSummary {
  questions: number;
  byType: Record<string, number>;
  byBlock: Record<string, number>;
  byDifficulty: Record<string, number>;
  /** Har tilda nechta savolda tarjima bor (uz: asosiy matn, hammasida) */
  translated: Record<'ru' | 'kaa' | 'en', number>;
  withFigure: number;
  exam: { title: string; code?: string; is_free?: boolean } | null;
}

export type ImportValidation =
  | { ok: true; file: ImportFile; summary: ImportSummary }
  | { ok: false; problems: ImportProblem[]; truncated: boolean };

const formatPath = (path: readonly PropertyKey[]): string =>
  path.reduce<string>((acc, p) => (typeof p === 'number' ? `${acc}[${p + 1}]` : acc ? `${acc}.${String(p)}` : String(p)), '') || '(ildiz)';

export function summarize(file: ImportFile): ImportSummary {
  const count = (key: (q: ImportFile['questions'][number]) => string) =>
    file.questions.reduce<Record<string, number>>((acc, q) => ({ ...acc, [key(q)]: (acc[key(q)] ?? 0) + 1 }), {});
  const hasFigure = (payload: unknown) => !!payload && typeof payload === 'object' && 'figure' in payload && !!(payload as { figure?: unknown }).figure;
  return {
    questions: file.questions.length,
    byType: count((q) => q.type),
    byBlock: count((q) => q.block),
    byDifficulty: count((q) => q.difficulty),
    translated: {
      ru: file.questions.filter((q) => q.i18n?.ru).length,
      kaa: file.questions.filter((q) => q.i18n?.kaa).length,
      en: file.questions.filter((q) => q.i18n?.en).length,
    },
    withFigure: file.questions.filter((q) => hasFigure(q.payload)).length,
    exam: file.exam ? { title: file.exam.title, code: file.exam.code, is_free: file.exam.is_free } : null,
  };
}

/** Admin yuklagan JSON matnini tekshiradi. Xatolar savol raqami (1 dan) va maydon yo'li bilan qaytadi. */
export function validateImportText(text: string): ImportValidation {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) {
    return { ok: false, problems: [{ path: '(fayl)', message: `Fayl ${MAX_IMPORT_BYTES / 1024 / 1024} MB dan katta` }], truncated: false };
  }

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, problems: [{ path: '(fayl)', message: `JSON sintaksisi noto'g'ri: ${(e as Error).message}` }], truncated: false };
  }

  // Yalang'och massiv ham qabul qilinadi: faqat savollar, mocksiz.
  const input = Array.isArray(json) ? { questions: json } : json;
  const parsed = importFileSchema.safeParse(input);
  if (!parsed.success) {
    const seen = new Set<string>();
    const problems: ImportProblem[] = [];
    for (const issue of parsed.error.issues) {
      const p = { path: formatPath(issue.path), message: issue.message };
      const key = `${p.path}|${p.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        problems.push(p);
      }
    }
    return { ok: false, problems: problems.slice(0, MAX_PROBLEMS), truncated: problems.length > MAX_PROBLEMS };
  }

  // external_id fayl ichida takrorlanmasin
  const ids = new Map<string, number>();
  const dups: ImportProblem[] = [];
  parsed.data.questions.forEach((q, i) => {
    if (!q.external_id) return;
    if (ids.has(q.external_id)) dups.push({ path: `questions[${i + 1}].external_id`, message: `"${q.external_id}" ${ids.get(q.external_id)! + 1}-savolda ham bor` });
    else ids.set(q.external_id, i);
  });
  if (dups.length > 0) return { ok: false, problems: dups.slice(0, MAX_PROBLEMS), truncated: dups.length > MAX_PROBLEMS };

  return { ok: true, file: parsed.data, summary: summarize(parsed.data) };
}

/** "A".."F" -> 0..5 (ro'yxatda tartib); boshqa kod uchun 0. */
export const examSortFromCode = (code: string | undefined): number => {
  const i = code ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(code.toUpperCase()) : -1;
  return i >= 0 ? i : 0;
};
