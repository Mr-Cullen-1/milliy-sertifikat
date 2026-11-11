import { describe, expect, it } from 'vitest';
import { MOCK_TEMPLATES } from '../../content/gen/mock-templates';
import { SONLAR_TEMPLATES } from '../../content/gen/sonlar';
import { evalTex, near } from './tex-eval';

// G–O (mock-official) algebra va analiz slotlariga kiritilgan oddiy shablonlar: mock-ap/gp/work/motion/scale/phys va sonlar shablonlaridan
// son-percent, son-prop. Javob savol MATNIDAGI sonlardan boshqa usul bilan (simulyatsiya, tenglama yechish) qayta hisoblanadi.

const VARIANTS = Array.from({ length: 40 }, (_, i) => i);
const NS = 'mock-official';
const tpl = (id: string) => MOCK_TEMPLATES[id] ?? SONLAR_TEMPLATES.find((t) => t.id === id)!;
const ints = (s: string): number[] => (s.match(/-?\d+/g) ?? []).map(Number);

interface Case {
  id: string;
  v: number;
  stem: string;
  topic: number;
  correct: string;
  wrong: string[];
}
const build = (id: string, v: number): Case => {
  const b = tpl(id).build(v, NS);
  return { id, v, stem: b.stem('uz'), topic: b.topic, correct: b.correct, wrong: b.wrong };
};
const norm = (s: string): string => s.replace(/\\,/g, '').replace(/\s+/g, '');

function expectNum(c: Case, expected: number): void {
  const got = evalTex(c.correct);
  expect(near(got, expected, 1e-9), `${c.id}#${c.v}: to'g'ri javob ${c.correct} = ${got}, kutilgan ${expected}: ${c.stem}`).toBe(true);
  const others = new Set(c.wrong.map(norm).filter((w) => w !== norm(c.correct)));
  expect(others.size, `${c.id}#${c.v}: kamida 3 ta noyob chalg'ituvchi`).toBeGreaterThanOrEqual(3);
  for (const w of others) expect(near(evalTex(w), expected, 1e-9), `${c.id}#${c.v}: chalg'ituvchi ${w} to'g'ri javobga teng`).toBe(false);
}

type Check = (c: Case) => void;
const CHECKS: Record<string, Check> = {};

CHECKS['mock-ap'] = (c) => {
  const terms = [...c.stem.matchAll(/a_\{(\d+)\}=(-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  if (/ayirmasi/.test(c.stem)) {
    const [[p, x], [q, y]] = terms as [readonly [number, number], readonly [number, number]];
    expectNum(c, (y - x) / (q - p));
    return;
  }
  const a1 = Number(/a_1=(-?\d+)/.exec(c.stem)![1]);
  const d = Number(/d=(-?\d+)/.exec(c.stem)![1]);
  if (/yig'indisini/.test(c.stem)) {
    const n = Number(/dastlabki \$(\d+)\$ ta/.exec(c.stem)![1]);
    let s = 0;
    for (let k = 0; k < n; k++) s += a1 + k * d;
    expectNum(c, s);
  } else {
    const n = Number(/\$(\d+)\$-hadi/.exec(c.stem)![1]);
    let a = a1;
    for (let k = 1; k < n; k++) a += d;
    expectNum(c, a);
  }
};

CHECKS['mock-gp'] = (c) => {
  const terms = [...c.stem.matchAll(/b_\{(\d+)\}=(-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
  if (/maxraji/.test(c.stem)) {
    const [[p, x], [q, y]] = terms as [readonly [number, number], readonly [number, number]];
    const qs: number[] = [];
    for (let r = -12; r <= 12; r++) if (r !== 0 && x * r ** (q - p) === y) qs.push(r);
    expect(qs.length, `${c.id}#${c.v}: q yagona`).toBe(1);
    expectNum(c, qs[0]!);
    return;
  }
  const b1 = Number(/b_1=(-?\d+)/.exec(c.stem)![1]);
  const r = Number(/q=(-?\d+)/.exec(c.stem)![1]);
  if (/yig'indisini/.test(c.stem)) {
    const n = Number(/dastlabki \$(\d+)\$ ta/.exec(c.stem)![1]);
    let s = 0;
    let t = b1;
    for (let k = 0; k < n; k++) {
      s += t;
      t *= r;
    }
    expectNum(c, s);
  } else {
    const n = Number(/\$(\d+)\$-hadi/.exec(c.stem)![1]);
    let t = b1;
    for (let k = 1; k < n; k++) t *= r;
    expectNum(c, t);
  }
};

CHECKS['mock-work'] = (c) => {
  const [a, b] = ints(c.stem) as [number, number];
  if (/Ikkalasi birga ishlasa/.test(c.stem)) expectNum(c, 1 / (1 / a + 1 / b));
  else if (/bo'shaydi/.test(c.stem)) expectNum(c, 1 / (1 / a - 1 / b));
  else if (/yolg'iz o'zi necha kunda/.test(c.stem)) expectNum(c, 1 / (1 / a - 1 / b)); // birga a kun, birinchisi b kun
  else throw new Error(`savol turi tanilmadi: ${c.stem}`);
};

CHECKS['mock-motion'] = (c) => {
  const v = ints(c.stem);
  if (/yetib oladi/.test(c.stem)) {
    const [v1, t0, v2] = v as [number, number, number];
    // ikkinchi chiqqandan keyin t soat: v2 t = v1 (t + t0)
    expectNum(c, (v1 * t0) / (v2 - v1));
  } else if (/o'rtacha tezlik/.test(c.stem)) {
    const [v1, v2] = v as [number, number];
    expectNum(c, (2 * v1 * v2) / (v1 + v2));
  } else if (/uchrashadi/.test(c.stem)) {
    const [d, v1, v2] = v as [number, number, number];
    expectNum(c, d / (v1 + v2));
  } else throw new Error(`savol turi tanilmadi: ${c.stem}`);
};

CHECKS['mock-scale'] = (c) => {
  const nm = /1:([\d\\,]+)/.exec(c.stem);
  if (/masshtabini toping/.test(c.stem)) {
    const [cm, km] = ints(c.stem) as [number, number];
    const N = (km * 100000) / cm;
    expect(norm(c.correct), `${c.id}#${c.v}`).toBe(`1:${N}`);
    for (const w of c.wrong) expect(norm(w)).not.toBe(`1:${N}`);
    return;
  }
  const N = Number(nm![1]!.replace(/\\,/g, ''));
  const x = Number(/\$(\d+)\$ (sm|km)/.exec(c.stem)![1]);
  if (/Haqiqiy masofa necha km/.test(c.stem)) expectNum(c, (x * N) / 100000);
  else expectNum(c, (x * 100000) / N);
};

/** s(t)=... ko'phad koeffitsiyentlari (t^k oldida) */
function polyOf(stem: string): number[] {
  const body = /s\(t\)=([^$]+)\$/.exec(stem)![1]!;
  const coefs = [0, 0, 0, 0];
  for (const m of body.matchAll(/([+-]?)(\d*)t(?:\^(\d))?|([+-]\d+)(?!t)/g)) {
    if (m[4] !== undefined) coefs[0]! += Number(m[4]);
    else coefs[m[3] ? Number(m[3]) : 1] = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
  }
  // o'zgarmas had (oxirida) alohida
  const cm = /([+-]\d+)$/.exec(body);
  if (cm && !/t(\^\d)?[+-]\d+$/.test('') && !/t$/.test(body)) coefs[0] = Number(cm[1]);
  return coefs;
}
const dPoly = (c: number[]): number[] => c.slice(1).map((x, i) => x * (i + 1));
const evalPoly = (c: number[], t: number): number => c.reduce((s, x, i) => s + x * t ** i, 0);

CHECKS['mock-phys'] = (c) => {
  const s = polyOf(c.stem);
  const v = dPoly(s);
  const a = dPoly(v);
  const t0m = /\$t=(\d+)\$ s paytdagi/.exec(c.stem);
  if (/tezlanishini/.test(c.stem)) expectNum(c, evalPoly(a, Number(t0m![1])));
  else if (/tezligini/.test(c.stem) && t0m) expectNum(c, evalPoly(v, Number(t0m[1])));
  else if (/Qaysi \$t\$/.test(c.stem)) {
    const V = Number(/tezligi \$(-?\d+)\$ m\/s/.exec(c.stem)![1]);
    // v(t) = V: sonli yechish
    let found = NaN;
    for (let t = 0; t <= 60; t += 0.5) if (Math.abs(evalPoly(v, t) - V) < 1e-9) found = t;
    expect(Number.isNaN(found), `${c.id}#${c.v}: ildiz topilmadi`).toBe(false);
    expectNum(c, found);
  } else throw new Error(`savol turi tanilmadi: ${c.stem}`);
};

CHECKS['son-percent'] = (c) => {
  const v = ints(c.stem);
  if (/oxirgi narxi/.test(c.stem)) {
    const [P, up, down] = v as [number, number, number];
    expectNum(c, P * (1 + up / 100) * (1 - down / 100));
  } else if (/foizini toping/.test(c.stem)) {
    const [N, p] = v as [number, number];
    expectNum(c, (N * p) / 100);
  } else if (/necha foizini/.test(c.stem)) {
    const [a, b] = v as [number, number];
    expectNum(c, (a / b) * 100);
  } else throw new Error(`savol turi tanilmadi: ${c.stem}`);
};

CHECKS['son-prop'] = (c) => {
  const v = ints(c.stem);
  if (/nisbatda ikki qismga/.test(c.stem)) {
    const [T, a, b] = v as [number, number, number];
    expectNum(c, (T * Math.max(a, b)) / (a + b));
  } else if (/ishchi ishni/.test(c.stem)) {
    const [w1, d1, w2] = v as [number, number, number];
    expectNum(c, (w1 * d1) / w2);
  } else if (/proporsiyadan/.test(c.stem)) {
    // x : A = B : C  =>  x = A*B/C
    const [A, B, C] = v as [number, number, number];
    expectNum(c, (A * B) / C);
  } else throw new Error(`savol turi tanilmadi: ${c.stem}`);
};

describe("mock-official: algebra/analiz slotlariga kiritilgan shablonlar (mustaqil matematik tekshiruv)", () => {
  for (const id of Object.keys(CHECKS)) {
    it(`${id}: ${VARIANTS.length} variantda javob qayta hisoblanadi`, () => {
      for (const v of VARIANTS) CHECKS[id]!(build(id, v));
    });
  }

  it("rasmiy mavzu raqamlari: 57, 58, 42, 105, 110, 7, 8", () => {
    const want: Record<string, number[]> = { 'mock-ap': [57], 'mock-gp': [58], 'mock-work': [42], 'mock-motion': [42], 'mock-scale': [105], 'mock-phys': [110], 'son-percent': [8], 'son-prop': [7] };
    for (const [id, tops] of Object.entries(want)) for (const v of VARIANTS) expect(tops, `${id}#${v}`).toContain(build(id, v).topic);
  });
});
