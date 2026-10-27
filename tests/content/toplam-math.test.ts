import { describe, expect, it } from 'vitest';
import * as P from '../../content/gen/toplam';
import { makeRng, type Frac } from '../../content/gen/helpers';
import { binom, factorial } from '../../content/gen/analiz-toplam-util';

// Mustaqil tekshiruv: to'liq sanash (odamlar, butun sonlar, natijalar to'plami), qo'lda yozilgan rostlik jadvallari,
// ko'phadlarni ko'paytirish va yopiq formulalar bilan solishtiriladi.

const seeds = (name: string, n = 300) => Array.from({ length: n }, (_, i) => makeRng(`${name}-${i}`));
const val = (f: Frac) => f.n / f.d;
const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

describe('toplam: javob kalitlari mustaqil usul bilan mos', () => {
  it("Eyler-Venn: odamlarni sohalarga qo'yib sanash", () => {
    for (const rng of seeds('venn')) {
      const v = P.sampleVenn(rng);
      const s = P.solveVenn(v);
      // har bir odam: [A, B, C] a'zoligi
      const people: boolean[][] = [];
      const add = (n: number, m: boolean[]) => people.push(...Array.from({ length: n }, () => m));
      add(v.a, [true, false, false]);
      add(v.b, [false, true, false]);
      add(v.c, [false, false, true]);
      add(v.ab, [true, true, false]);
      add(v.ac, [true, false, true]);
      add(v.bc, [false, true, true]);
      add(v.abc, [true, true, true]);
      add(v.none, [false, false, false]);
      const cnt = (pred: (m: boolean[]) => boolean) => people.filter(pred).length;
      expect(s.N).toBe(people.length);
      expect(s.X).toBe(cnt((m) => m[0]!));
      expect(s.Y).toBe(cnt((m) => m[1]!));
      expect(s.Z).toBe(cnt((m) => m[2]!));
      expect(s.P).toBe(cnt((m) => m[0]! && m[1]!));
      expect(s.Q).toBe(cnt((m) => m[0]! && m[2]!));
      expect(s.R).toBe(cnt((m) => m[1]! && m[2]!));
      expect(s.T).toBe(cnt((m) => m[0]! && m[1]! && m[2]!));
      expect(s.onlyOne).toBe(cnt((m) => m.filter(Boolean).length === 1));
      expect(s.exactlyTwo).toBe(cnt((m) => m.filter(Boolean).length === 2));
      expect(s.union).toBe(cnt((m) => m.some(Boolean)));
      // formulalar
      expect(s.onlyOne).toBe(s.X + s.Y + s.Z - 2 * (s.P + s.Q + s.R) + 3 * s.T);
      expect(s.union).toBe(s.X + s.Y + s.Z - s.P - s.Q - s.R + s.T);
    }
  });

  it("mantiq: qo'lda yozilgan rostlik jadvallari", () => {
    const impl = (a: number, b: number) => (a === 1 ? b : 1);
    const expected = (id: string, p: number, q: number, r: number): number => {
      switch (id) {
        case 'imp':
          return impl(p & q, r);
        case 'orNeg':
          return impl(p | q, 1 - r);
        case 'eqImp':
          return (p === q ? 1 : 0) & impl(q, r);
        case 'cycle':
          return impl(p, q) & impl(q, r) & impl(r, p);
        case 'xorImp':
          return impl(p ^ q, r);
        case 'mix':
          return (1 - (p & q)) | (r & (1 - p));
        default:
          throw new Error(id);
      }
    };
    for (const f of P.LOGIC) {
      let trues = 0;
      for (let bits = 0; bits < 8; bits++) {
        const [p, q, r] = [(bits >> 2) & 1, (bits >> 1) & 1, bits & 1] as const;
        expect(f.fn(p === 1, q === 1, r === 1) ? 1 : 0).toBe(expected(f.id, p, q, r));
        trues += expected(f.id, p, q, r);
      }
      expect(P.solveLogic({ f, askTrue: true }).answer).toBe(trues);
      expect(P.solveLogic({ f, askTrue: false }).answer).toBe(8 - trues);
      expect(trues).toBeGreaterThan(0);
      expect(trues).toBeLessThan(8);
    }
  });

  it("raqamlardan sonlar: butun sonlarni birma-bir tekshirish", () => {
    for (const rng of seeds('digits', 120)) {
      const p = P.sampleDigits(rng);
      const lo = 10 ** (p.len - 1);
      const hi = 10 ** p.len;
      const set = new Set(p.digits.map(String));
      let count = 0;
      for (let x = lo; x < hi; x++) {
        const s = String(x);
        if (new Set(s).size !== s.length) continue;
        if ([...s].some((ch) => !set.has(ch))) continue;
        const last = x % 10;
        if (p.cond === 'even' ? last % 2 === 0 : p.cond === 'odd' ? last % 2 === 1 : last === 0 || last === 5) count++;
      }
      expect(P.solveDigits(p).count).toBe(count);
      expect(P.digitsFormula(p).count).toBe(count);
    }
  });

  it('qatorga joylashtirish: yopiq formulalar', () => {
    const f = factorial;
    for (let n = 5; n <= 8; n++) {
      expect(P.solveArr({ n, cond: 'notAdj' })).toBe(f(n) - 2 * f(n - 1));
      expect(P.solveArr({ n, cond: 'notEnds' })).toBe(f(n) - 2 * f(n - 1) + f(n - 2));
      expect(P.solveArr({ n, cond: 'triple' })).toBe(6 * f(n - 2));
      expect(P.solveAdj({ n })).toEqual({ adjacent: 2 * f(n - 1), apart: f(n) - 2 * f(n - 1) });
    }
  });

  it("Nyuton binomi: ko'phad (Laurent) ko'paytirish bilan", () => {
    for (const rng of seeds('binom')) {
      const p = P.sampleBinom(rng);
      // (a x^p + b x^-q)^n ni ketma-ket ko'paytirish
      let poly = new Map<number, number>([[0, 1]]);
      for (let i = 0; i < p.n; i++) {
        const next = new Map<number, number>();
        for (const [e, c] of poly) {
          next.set(e + p.p, (next.get(e + p.p) ?? 0) + c * p.a);
          next.set(e - p.q, (next.get(e - p.q) ?? 0) + c * p.b);
        }
        poly = next;
      }
      const { coef, exp } = P.binomTerm(p, p.k);
      expect(poly.get(exp) ?? 0).toBe(coef);
      // har bir k uchun
      for (let k = 0; k <= p.n; k++) {
        const t = P.binomTerm(p, k);
        expect(poly.get(t.exp)).toBe(t.coef);
      }
      expect(binom(p.n, p.k)).toBe(factorial(p.n) / (factorial(p.k) * factorial(p.n - p.k)));
    }
  });

  it("o'yin soqqalari: alohida sanash", () => {
    const conds = [
      { kind: 'sumDiv', m: 4 },
      { kind: 'sumDiv', m: 5 },
      { kind: 'prod6' },
      { kind: 'diffGe', d: 3 },
      { kind: 'diffGe', d: 4 },
      { kind: 'sum3', s: 9 },
      { kind: 'sum3', s: 10 },
      { kind: 'sum3', s: 11 },
      { kind: 'sum3', s: 12 },
    ] as const;
    const expected: Record<string, number> = { 'sumDiv4': 9, 'sumDiv5': 7, 'prod6': 15, 'diffGe3': 12, 'diffGe4': 6, 'sum3-9': 25, 'sum3-10': 27, 'sum3-11': 27, 'sum3-12': 25 };
    const keyOf = (c: (typeof conds)[number]) => (c.kind === 'sumDiv' ? `sumDiv${c.m}` : c.kind === 'diffGe' ? `diffGe${c.d}` : c.kind === 'sum3' ? `sum3-${c.s}` : c.kind);
    for (const c of conds) {
      const s = P.solveDice(c);
      expect(s.favorable, keyOf(c)).toBe(expected[keyOf(c)]);
      expect(s.total).toBe(c.kind === 'sum3' ? 216 : 36);
    }
    // butun imkoniyatlar bo'yicha namuna: har bir sampleDice natijasi shu jadvaldan
    for (const rng of seeds('dice', 60)) expect(Object.keys(expected)).toContain(keyOf(P.sampleDice(rng) as (typeof conds)[number]));
  });

  it("Bayes: 10000 ta buyumli to'plam", () => {
    for (const rng of seeds('bayes')) {
      const p = P.sampleBayes(rng);
      const n1 = p.x * 100; // 1-zavod buyumlari
      const n2 = (100 - p.x) * 100;
      const d1 = (n1 * p.a) / 100;
      const d2 = (n2 * p.b) / 100;
      expect(Number.isInteger(d1) && Number.isInteger(d2)).toBe(true);
      const s = P.solveBayes(p);
      near(val(s.posterior), d1 / (d1 + d2));
      near(val(s.defective), (d1 + d2) / 10000);
    }
  });

  it("dispersiya: to'g'ridan-to'g'ri", () => {
    for (const rng of seeds('var')) {
      const { data } = P.sampleVar(rng);
      const n = data.length;
      const mean = data.reduce((s, v) => s + v, 0) / n;
      const variance = data.map((v) => (v - mean) ** 2).reduce((s, v) => s + v, 0) / n;
      const s = P.solveVar({ data });
      expect(Number.isInteger(s.variance)).toBe(true);
      near(s.variance, variance);
      near(s.mean, mean);
      // D = E[x^2] - mean^2
      near(variance, data.reduce((a, v) => a + v * v, 0) / n - mean * mean);
    }
  });

  it("taksi tarifi: kilometrlab solishtirish", () => {
    for (const rng of seeds('tariff')) {
      const p = P.sampleTariff(rng);
      const { c, answer } = P.solveTariff(p);
      const costA = (x: number) => p.a + p.b * x;
      const costB = (x: number) => c + p.d * x;
      expect(costB(answer)).toBeLessThan(costA(answer));
      expect(costB(answer - 1)).toBeGreaterThanOrEqual(costA(answer - 1));
      for (let x = answer; x < answer + 30; x++) expect(costB(x)).toBeLessThan(costA(x));
      expect(costB(p.x0)).toBe(costA(p.x0));
    }
  });

  it("diagramma: qiymatlar va javob", () => {
    for (const rng of seeds('diag')) {
      const p = P.sampleDiagram(rng);
      const s = P.solveDiagram(p);
      expect(p.values).toHaveLength(6);
      if (p.kind === 'aboveAvg') {
        const mean = p.values.reduce((a, b) => a + b, 0) / 6;
        expect(Number.isInteger(mean)).toBe(true);
        let sum = 0;
        for (const v of p.values) if (v > mean) sum += v;
        expect(s.answer).toBe(sum);
      } else {
        const max = Math.max(...p.values);
        const min = Math.min(...p.values);
        expect(p.values.filter((v) => v === max)).toHaveLength(1);
        expect(p.values.filter((v) => v === min)).toHaveLength(1);
        expect(Number.isInteger(((max - min) * 100) / min)).toBe(true);
        near(s.answer, ((max - min) / min) * 100);
      }
    }
  });

  it("ochiq: sharlar (juftliklarni sanash)", () => {
    for (const rng of seeds('balls')) {
      const k = P.sampleBalls(rng);
      const colors = [...Array(k.r).fill(0), ...Array(k.b).fill(1), ...Array(k.g).fill(2)] as number[];
      let total = 0;
      let same = 0;
      for (let i = 0; i < colors.length; i++) {
        for (let j = i + 1; j < colors.length; j++) {
          total++;
          if (colors[i] === colors[j]) same++;
        }
      }
      const s = P.solveBalls(k);
      expect(s.total).toBe(total);
      expect(s.same).toBe(same);
      expect(val(s.p)).toBeCloseTo(same / total, 12);
    }
  });

  it("ochiq: binom, ikkita had", () => {
    for (const rng of seeds('obinom', 100)) {
      const p = P.sampleBinomOpen(rng);
      expect(p.k2).not.toBe(p.k);
      expect(P.binomTerm(p, p.k2).exp).not.toBe(P.binomTerm(p, p.k).exp);
    }
  });

  it("ochiq: chastotalar jadvali (ma'lumotlarni yoyib)", () => {
    for (const rng of seeds('freq')) {
      const p = P.sampleFreq(rng);
      const data = p.xs.flatMap((x, i) => Array.from({ length: p.fs[i]! }, () => x));
      const n = data.length;
      const mean = data.reduce((a, b) => a + b, 0) / n;
      const variance = data.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
      const s = P.solveFreq(p);
      expect(s.n).toBe(n);
      near(val(s.mean), mean);
      near(val(s.variance), variance);
    }
  });

  it("ochiq: shartli ehtimollik (N ta natija)", () => {
    for (const rng of seeds('cond')) {
      const p = P.sampleCond(rng);
      // natijalar: 0..N-1; A = [0, alpha), B = [alpha-gamma, alpha-gamma+beta)
      const inA = (i: number) => i < p.alpha;
      const inB = (i: number) => i >= p.alpha - p.gamma && i < p.alpha - p.gamma + p.beta;
      const all = Array.from({ length: p.N }, (_, i) => i);
      const both = all.filter((i) => inA(i) && inB(i)).length;
      const union = all.filter((i) => inA(i) || inB(i)).length;
      expect(both).toBe(p.gamma);
      const s = P.solveCond(p);
      near(val(s.pU), union / p.N);
      near(val(s.pAB), both / p.N);
      near(val(s.cond), both / all.filter(inB).length);
    }
  });

  it("ochiq: uchta to'plam (odamlarni sanash)", () => {
    for (const rng of seeds('sets', 100)) {
      const v = P.sampleVenn(rng);
      const s = P.solveVenn(v);
      expect(s.union).toBe(v.a + v.b + v.c + v.ab + v.ac + v.bc + v.abc);
      expect(s.exactlyTwo).toBe(s.P + s.Q + s.R - 3 * s.T);
    }
  });
});
