import { expect } from 'vitest';
import { assemble } from '../../content/gen/assemble';
import { slotRequests } from '../../content/gen/layout';
import type { DraftO, DraftY1, OEntry, Y1Entry } from '../../content/gen/tf-common';
import { LANGS, type BlockGenerator, type QType, type SlotRequest } from '../../content/gen/types';
import type { BlockCode } from '../../config/topics';

// "tenglama" va "funksiyalar" matematik testlari uchun umumiy yordamchilar.

export const reqOf = (block: BlockCode, type: QType, variant: number, index: number, count: number, position: number): SlotRequest => ({
  variant,
  block,
  type,
  difficulty: 'L2',
  index,
  count,
  position,
});

/** Har bir variant va bir nechta pozitsiya uchun shablonni ishga tushiradi */
export function drawsY1(entry: Y1Entry, block: BlockCode, count: number, firstPos: number): DraftY1[] {
  const out: DraftY1[] = [];
  for (let v = 0; v < 6; v++) for (let i = 0; i < count; i++) out.push(entry.run(reqOf(block, 'y1', v, i, count, firstPos + i)));
  return out;
}

export function drawsO(entry: OEntry, block: BlockCode, count: number, firstPos: number): DraftO[] {
  const out: DraftO[] = [];
  for (let v = 0; v < 6; v++) for (let i = 0; i < count; i++) out.push(entry.run(reqOf(block, 'o', v, i, count, firstPos + i)));
  return out;
}

export const nums = (s: string): number[] => (s.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

export const close = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

export function expectClose(actual: number, expected: number, msg: string, eps = 1e-9): void {
  expect(close(actual, expected, eps), `${msg}: ${actual} != ${expected}`).toBe(true);
}

export const lcmInt = (a: number, b: number): number => {
  let x = a;
  let y = b;
  while (y) [x, y] = [y, x % y];
  return (a * b) / x;
};

/** Natijalarning tillar bo'yicha izchilligi va yozuv tozaligi */
export function checkLanguageHygiene(generate: BlockGenerator, block: BlockCode): string[] {
  const problems: string[] = [];
  const stripMath = (t: string) => t.replace(/\$\$[\s\S]+?\$\$/g, ' ').replace(/\$[^$\n]+?\$/g, ' ');
  const cyr = /[Ѐ-ӿ]/;
  for (let v = 0; v < 6; v++) {
    for (const req of slotRequests(v).filter((r) => r.block === block)) {
      const spec = generate(req);
      const per = LANGS.map((l) => ({ l, c: spec.content(l) }));
      const shapeOf = (t: string) => nums(t).map((n) => Math.abs(n)).sort((a, b) => a - b).join(',');
      const base = per[0]!;
      for (const { l, c } of per) {
        const at = `v${v} #${req.position} [${l}]`;
        const payload = c.payload as { parts?: Record<string, { prompt_md: string; hint?: string }> };
        const extra = payload.parts ? Object.values(payload.parts).flatMap((p) => [p.prompt_md, p.hint ?? '']) : [];
        const texts: string[] = [c.stem_md, c.solution_md, c.mistake_note_md ?? '', ...extra];
        for (const t of texts) {
          const plain = stripMath(t);
          if (l !== 'ru' && cyr.test(plain)) problems.push(`${at}: kirill harflari: ${plain.slice(0, 60)}`);
          for (const w of plain.split(/\s+/)) if (cyr.test(w) && /[A-Za-z]/.test(w.replace(/\\[a-z]+/g, ''))) problems.push(`${at}: aralash yozuvli so'z "${w}"`);
        }
        // raqamlar tillarda bir xil bo'lishi kerak
        if (shapeOf(c.stem_md) !== shapeOf(base.c.stem_md)) problems.push(`${at}: savol raqamlari uz dan farq qiladi`);
        if (JSON.stringify(c.payload) !== JSON.stringify(base.c.payload) && req.type === 'y1') problems.push(`${at}: variantlar tillarda farq qiladi`);
      }
    }
  }
  return problems;
}

/** assemble() natijasidagi kalit va payload bir xil kalit/variant ma'lumotini beradi */
export const assembled = (generate: BlockGenerator, req: SlotRequest) => assemble(generate(req), req);

/** "x^{2} - 5x + 6" -> {2: 1, 1: -5, 0: 6} (faqat x o'zgaruvchi, butun koeffitsiyentlar) */
export function parsePoly(tex: string, v = 'x'): Record<number, number> {
  const out: Record<number, number> = {};
  const terms = tex.trim().replace(/ - /g, ' + -').split(' + ');
  const re = new RegExp(String.raw`^(-?)(\d*)(${v}(?:\^\{(\d+)\})?)?$`);
  for (const t of terms) {
    const m = re.exec(t.trim());
    if (!m || (m[2] === '' && !m[3])) throw new Error(`ko'phad hadi tushunarsiz: "${t}"`);
    const coef = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    const deg = m[3] ? (m[4] ? Number(m[4]) : 1) : 0;
    out[deg] = (out[deg] ?? 0) + coef;
  }
  return out;
}

/** Matndagi birinchi "<ko'phad> (=|<|le) 0" ifodasidan ko'phadni oladi */
export function firstPoly(stem: string): Record<number, number> {
  const m = /\$([^$]*?) (?:=|<|\\le) 0\$/.exec(stem);
  if (!m) throw new Error(`ko'phad topilmadi: ${stem.slice(0, 60)}`);
  return parsePoly(m[1]!);
}

/** "$-\frac{3}{4}$", "$12$", "$\frac{5\pi}{6}$", "$2\pi$" -> son. Tushunarsiz bo'lsa null. */
export function parseTexNumber(s: string): number | null {
  const t = s.trim().replace(/^\$|\$$/g, '');
  const m = /^(-?)(?:(\d+)|\\frac\{(\d*)(\\pi)?\}\{(\d+)\}|(\d*)(\\pi))$/.exec(t);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  if (m[2] !== undefined) return sign * Number(m[2]);
  if (m[5] !== undefined) return (sign * (m[3] === '' || m[3] === undefined ? 1 : Number(m[3])) * (m[4] ? Math.PI : 1)) / Number(m[5]);
  return sign * (m[6] === '' ? 1 : Number(m[6])) * Math.PI;
}
