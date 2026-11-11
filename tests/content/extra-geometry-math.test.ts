import { describe, expect, it } from 'vitest';
import { GEOMETRY_TEMPLATES, geometryInstance } from '../../content/gen/extra/geometry';
import { checkExtraTemplate } from './extra-harness';
import { evalTex, near } from './tex-eval';

// Geometriya shablonlari (7.1, hozircha) uchun mustaqil matematik tekshiruv: javob savol MATNIDAGI sonlardan boshqa formula bilan
// qayta hisoblanadi (Geron, yarim perimetr, burchak -> radian, Pifagor), shablonning ichki hisobiga tayanmasdan.

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const TPL = new Map(GEOMETRY_TEMPLATES.map((t) => [t.id, t]));

const keyNum = (f: string): number => (f.includes('/') ? Number(f.split('/')[0]) / Number(f.split('/')[1]) : Number(f));
const ints = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);

interface Q {
  id: string;
  seed: number;
  stem: string;
  type: 'y1' | 'o';
  correct: string;
  wrongs: string[];
  key: { a?: string[]; b?: string[] };
  parts?: Record<string, { prompt_md: string }>;
}
function load(id: string, seed: number): Q {
  const inst = geometryInstance(id, seed);
  const c = inst.spec.content('uz');
  const type = TPL.get(id)!.type as 'y1' | 'o';
  const q: Q = { id, seed, stem: c.stem_md, type, correct: '', wrongs: [], key: {} };
  if (type === 'y1') {
    const opts = (c.payload as { options: Record<string, string> }).options;
    const letter = (inst.spec.key as { correct: string }).correct;
    q.correct = opts[letter]!;
    q.wrongs = Object.entries(opts).filter(([l]) => l !== letter).map(([, t]) => t);
  } else {
    q.key = inst.spec.key as Q['key'];
    q.parts = (c.payload as { parts: Q['parts'] }).parts;
  }
  return q;
}
function expectVal(q: Q, expected: number): void {
  expect(near(evalTex(q.correct), expected), `${q.id}#${q.seed}: to'g'ri variant ${q.correct} = ${evalTex(q.correct)}, kutilgan ${expected}`).toBe(true);
  for (const w of q.wrongs) expect(near(evalTex(w), expected, 1e-7), `${q.id}#${q.seed}: chalg'ituvchi ${w} to'g'ri javobga teng`).toBe(false);
}
function expectKey(q: Q, part: 'a' | 'b', expected: number): void {
  const forms = q.key[part];
  expect(forms, `${q.id}#${q.seed}: ${part}) kalit yo'q`).toBeDefined();
  for (const f of forms!) expect(near(keyNum(f), expected), `${q.id}#${q.seed}: ${part}) kalit "${f}", kutilgan ${expected}`).toBe(true);
}

const heron = (a: number, b: number, c: number): number => {
  const s = (a + b + c) / 2;
  return Math.sqrt(s * (s - a) * (s - b) * (s - c));
};

type Check = (q: Q) => void;
const CHECKS: Record<string, Check> = {};

CHECKS['g71-arc'] = (q) => {
  const [r, al] = ints(q.stem);
  const rad = (al! * Math.PI) / 180;
  if (/yuzini/.test(q.stem)) expectVal(q, 0.5 * r! * r! * rad);
  else if (/uzunligini/.test(q.stem)) expectVal(q, r! * rad);
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
};

CHECKS['g71-sector-o'] = (q) => {
  const [k, m] = [...q.stem.matchAll(/\$(\d+)\\pi\$/g)].map((x) => Number(x[1])) as [number, number];
  // yoy uzunligi l = k*pi, yuzi S = m*pi: S = l*r/2 => r = 2m/k; markaziy burchak = l/r (radian)
  const r = (2 * m) / k;
  expectKey(q, 'a', r);
  expectKey(q, 'b', ((k * Math.PI) / r) * (180 / Math.PI));
};

CHECKS['g71-ring'] = (q) => {
  const [R, r] = ints(q.stem) as [number, number];
  expectVal(q, Math.PI * (R * R - r * r));
};

CHECKS['g71-ring-chord'] = (q) => {
  // vatar kichik aylanaga urinadi: vatar yarmi, kichik radius va katta radius to'g'ri burchakli uchburchak: R^2 - r^2 = (c/2)^2
  const [c] = ints(q.stem) as [number];
  expectVal(q, Math.PI * (c / 2) ** 2);
};

CHECKS['g71-heron'] = (q) => {
  const [a, b, c] = ints(q.stem) as [number, number, number];
  expectVal(q, heron(a, b, c));
};

CHECKS['g71-sinarea'] = (q) => {
  const [a, b, g] = ints(q.stem) as [number, number, number];
  expectVal(q, 0.5 * a * b * Math.sin((g * Math.PI) / 180));
};

CHECKS['g71-tri-o'] = (q) => {
  const [a, b, c] = ints(q.stem) as [number, number, number];
  const S = heron(a, b, c);
  expectKey(q, 'a', S);
  const outer = /tashqi/.test(q.parts!.b!.prompt_md);
  const inner = /ichki/.test(q.parts!.b!.prompt_md);
  expect(outer !== inner).toBe(true);
  expectKey(q, 'b', outer ? (a * b * c) / (4 * S) : S / ((a + b + c) / 2));
};

describe("qo'shimcha shablonlar: geometriya (mustaqil matematik tekshiruv)", () => {
  it('har shablon uchun tekshiruv bor', () => {
    expect(GEOMETRY_TEMPLATES.map((t) => t.id).filter((id) => !CHECKS[id])).toEqual([]);
    expect(Object.keys(CHECKS).filter((id) => !TPL.has(id))).toEqual([]);
  });

  for (const t of GEOMETRY_TEMPLATES) {
    it(`${t.id} (mavzu ${t.topic}, ${t.type}/${t.difficulty})`, () => {
      for (const seed of SEEDS) CHECKS[t.id]!(load(t.id, seed));
    });
  }

  it('umumiy sifat (KaTeX, 4 til, import sxemasi)', () => {
    expect(GEOMETRY_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS)).slice(0, 10)).toEqual([]);
  });
});
