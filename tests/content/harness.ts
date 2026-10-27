import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { assemble } from '../../content/gen/assemble';
import { slotRequests, VARIANT_COUNT } from '../../content/gen/layout';
import { LANGS, type BlockGenerator, type QuestionSpec, type SlotRequest } from '../../content/gen/types';
import { TOPIC_RANGES, type BlockCode } from '../../config/topics';
import { importQuestionSchema } from '../../lib/content/import-schema';
import { parsePayload } from '../../lib/exam/payload';
import { ZodError } from 'zod';

/** Matn ichidagi $...$ va $$...$$ qismlarini KaTeX bilan tekshiradi; muammolar ro'yxatini qaytaradi. */
export function checkMath(text: string, where: string): string[] {
  const problems: string[] = [];
  const display = [...text.matchAll(/\$\$([\s\S]+?)\$\$/g)];
  let rest = text.replace(/\$\$([\s\S]+?)\$\$/g, ' ');
  const inline = [...rest.matchAll(/\$([^$\n]+?)\$/g)];
  rest = rest.replace(/\$([^$\n]+?)\$/g, ' ');
  if (rest.includes('$')) problems.push(`${where}: juft bo'lmagan yoki literal "$" belgisi`);
  for (const m of [...display, ...inline]) {
    try {
      katex.renderToString(m[1]!, { throwOnError: true, strict: 'error' });
    } catch (e) {
      problems.push(`${where}: KaTeX xatosi "${m[1]!.slice(0, 40)}": ${(e as Error).message.slice(0, 90)}`);
    }
  }
  return problems;
}

const BAD = /undefined|NaN|\[object|null|Infinity/;

/** Bitta savolni to'liq tekshiradi (bo'sh ro'yxat = yaxshi). */
export function checkQuestion(spec: QuestionSpec, req: SlotRequest): string[] {
  const problems: string[] = [];
  const tag = `v${req.variant} #${req.position} ${req.block}/${req.type}/${req.difficulty}`;

  if (spec.difficulty !== req.difficulty) problems.push(`${tag}: qiyinlik ${spec.difficulty}, so'ralgani ${req.difficulty}`);
  const [from, to] = TOPIC_RANGES[req.block];
  if (spec.topic < from || spec.topic > to) problems.push(`${tag}: ${spec.topic}-mavzu blokka (${from}–${to}) tegishli emas`);
  if (spec.estSeconds !== undefined && (spec.estSeconds < 15 || spec.estSeconds > 900)) problems.push(`${tag}: estSeconds ${spec.estSeconds} g'alati`);

  for (const lang of LANGS) {
    let c;
    try {
      c = spec.content(lang);
    } catch (e) {
      problems.push(`${tag} [${lang}]: content() xato berdi: ${(e as Error).message}`);
      continue;
    }
    for (const [name, text] of [['stem', c.stem_md], ['solution', c.solution_md], ['mistake', c.mistake_note_md ?? '']] as const) {
      if (BAD.test(text.replace(/\\(?:infty|text\{[^}]*\})/g, ''))) problems.push(`${tag} [${lang}] ${name}: "undefined/NaN/null" kabi qoldiq: ${text.slice(0, 60)}`);
      problems.push(...checkMath(text, `${tag} [${lang}] ${name}`));
    }
    if (c.stem_md.trim().length < 8) problems.push(`${tag} [${lang}]: savol matni juda qisqa`);
    if (c.solution_md.trim().length < 20) problems.push(`${tag} [${lang}]: yechim juda qisqa`);

    try {
      const p = parsePayload(req.type, c.payload);
      const texts: string[] =
        p.type === 'y1'
          ? Object.values(p.data.options)
          : p.type === 'y2'
            ? [...Object.values(p.data.options), ...p.data.items.map((i) => i.text_md)]
            : [p.data.parts.a?.prompt_md, p.data.parts.b?.prompt_md].filter((x): x is string => !!x);
      texts.forEach((t, i) => problems.push(...checkMath(t, `${tag} [${lang}] payload[${i}]`)));
      if (p.type === 'y1') {
        const vals = Object.values(p.data.options).map((v) => v.trim());
        if (new Set(vals).size !== 4) problems.push(`${tag} [${lang}]: variantlar takrorlanadi: ${vals.join(' | ')}`);
      }
    } catch (e) {
      problems.push(`${tag} [${lang}]: payload yaroqsiz: ${e instanceof ZodError ? e.issues[0]?.message : (e as Error).message}`);
    }
  }

  // Yagona import sxemasi: kalit, payload mosligi, tarjima tuzilishi tengligi
  try {
    const parsed = importQuestionSchema.safeParse(assemble(spec, req));
    if (!parsed.success) {
      for (const i of parsed.error.issues.slice(0, 4)) problems.push(`${tag}: import sxemasi: ${i.path.join('.')} ${i.message}`);
    }
  } catch (e) {
    problems.push(`${tag}: assemble() xato berdi: ${(e as Error).message}`);
  }
  return problems;
}

interface DescribeOpts {
  name: string;
  generate: BlockGenerator;
  block: BlockCode;
  /** Faqat shu so'rovlarni qamrab oladi (masalan geometriyani ikkiga bo'lganda) */
  filter?: (req: SlotRequest) => boolean;
}

/** Block generatori uchun standart test to'plami. Barcha 6 variant, ttegishli barcha pozitsiyalar. */
export function describeGenerator({ name, generate, block, filter }: DescribeOpts): void {
  const requestsOf = (variant: number) => slotRequests(variant).filter((r) => r.block === block && (filter ? filter(r) : true));

  describe(`kontent: ${name}`, () => {
    it('barcha variantlar va pozitsiyalar uchun to\'g\'ri savol beradi (KaTeX, 4 til, kalit, tuzilish)', () => {
      const problems: string[] = [];
      let total = 0;
      for (let v = 0; v < VARIANT_COUNT; v++) {
        for (const req of requestsOf(v)) {
          total += 1;
          try {
            problems.push(...checkQuestion(generate(req), req));
          } catch (e) {
            problems.push(`v${req.variant} #${req.position}: generator xato berdi: ${(e as Error).message}`);
          }
        }
      }
      expect(total).toBeGreaterThan(0);
      expect(problems.slice(0, 15)).toEqual([]);
    });

    it('deterministik: bir xil so\'rov bir xil savol beradi', () => {
      for (const req of requestsOf(2)) {
        expect(JSON.stringify(assemble(generate(req), req))).toBe(JSON.stringify(assemble(generate(req), req)));
      }
    });

    it('6 variantda savollar takrorlanmaydi (o\'zbekcha matn + variantlar bo\'yicha)', () => {
      const seen = new Map<string, string>();
      const dups: string[] = [];
      for (let v = 0; v < VARIANT_COUNT; v++) {
        for (const req of requestsOf(v)) {
          const c = generate(req).content('uz');
          const sig = JSON.stringify([c.stem_md, c.payload]);
          const at = `v${v} #${req.position}`;
          if (seen.has(sig)) dups.push(`${at} == ${seen.get(sig)}`);
          seen.set(sig, at);
        }
      }
      expect(dups.slice(0, 10)).toEqual([]);
    });

    it('bir variant ichida mavzular xilma-xil (kamida yarmi noyob)', () => {
      for (let v = 0; v < VARIANT_COUNT; v++) {
        const reqs = requestsOf(v);
        const topics = new Set(reqs.map((r) => generate(r).topic));
        expect(topics.size, `v${v}: ${[...topics].join(',')}`).toBeGreaterThanOrEqual(Math.ceil(reqs.length / 2));
      }
    });
  });
}
