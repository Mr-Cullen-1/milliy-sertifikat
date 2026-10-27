import { describe, expect, it } from 'vitest';
import { chooseEntry } from '../../content/gen/tf-common';
import { generateTenglama, TENGLAMA_O, TENGLAMA_Y1, TRIG_TABLE } from '../../content/gen/tenglama';
import type { OEntry, Y1Entry } from '../../content/gen/tf-common';
import { slotRequests } from '../../content/gen/layout';
import { parseTexNumber, assembled, checkLanguageHygiene, drawsO, drawsY1, expectClose, firstPoly, nums } from './tf-math-utils';

// Javob qiymatlari generatordagi formulalardan MUSTAQIL usullar bilan tekshiriladi:
// sonli ildizlar, butun sonlar bo'yicha to'liq qidiruv, matndan o'qilgan raqamlar bo'yicha qidiruv.

const y1 = (id: string): Y1Entry => TENGLAMA_Y1.find((e) => e.id === id)!;
const op = (id: string): OEntry => TENGLAMA_O.find((e) => e.id === id)!;
const y1Draws = (id: string) => drawsY1(y1(id), 'tenglama', 6, 14);
const oDraws = (id: string) => drawsO(op(id), 'tenglama', 2, 36);
const ints = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

describe('tenglama: Y-1 shablonlarining to\'g\'ri javobi', () => {
  it('viet: ildizlarni sonli topib ifodani hisoblaydi', () => {
    for (const d of y1Draws('viet')) {
      const { qty } = d.params as { qty: string };
      const poly = firstPoly(d.stem('uz'));
      const [a, b, c] = [poly[2]!, poly[1] ?? 0, poly[0]!];
      const D = b * b - 4 * a * c;
      expect(D).toBeGreaterThan(0);
      const x1 = (-b + Math.sqrt(D)) / (2 * a);
      const x2 = (-b - Math.sqrt(D)) / (2 * a);
      const exact = { sq: x1 * x1 + x2 * x2, rec: 1 / x1 + 1 / x2, cube: x1 ** 3 + x2 ** 3, diff2: (x1 - x2) ** 2 }[qty]!;
      expectClose(d.value, exact, `viet ${qty} a=${a} b=${b} c=${c}`, 1e-9);
    }
  });

  it('qineq: butun sonlar bo\'yicha to\'liq qidiruv', () => {
    for (const d of y1Draws('qineq')) {
      const { p, gap, strict, ask } = d.params as { p: number; gap: number; strict: boolean; ask: 'count' | 'sum' };
      const q = p + gap;
      expect(gap).toBeGreaterThan(0);
      const poly = firstPoly(d.stem('uz'));
      const [b, c] = [poly[1] ?? 0, poly[0] ?? 0];
      expect(poly[2]).toBe(1);
      const sol = ints(-100, 100).filter((x) => (strict ? x * x + b * x + c < 0 : x * x + b * x + c <= 0));
      expect(sol.length === 0 || (sol[0] === (strict ? p + 1 : p) && sol[sol.length - 1] === (strict ? q - 1 : q))).toBe(true);
      expect(d.value).toBe(ask === 'count' ? sol.length : sol.reduce((s, x) => s + x, 0));
    }
  });

  it('trap: surat nol, maxraj nolga teng emas', () => {
    for (const d of y1Draws('trap')) {
      const { q, r, excl } = d.params as { q: number; r: number; excl: 'q' | 'r' };
      const bad = excl === 'q' ? q : r;
      const sol = ints(-60, 60).filter((x) => x !== bad && (x - q) * (x - r) === 0);
      expect(sol).toHaveLength(1);
      expect(d.value).toBe(sol[0]);
    }
  });

  it('modEq: yarim butun nuqtalar bo\'yicha qidiruv', () => {
    for (const d of y1Draws('modEq')) {
      const { p, q, s, ask } = d.params as { p: number; q: number; s: number; ask: 'max' | 'min' };
      const roots: number[] = [];
      for (let t = -240; t <= 240; t++) {
        const x = t / 4;
        if (Math.abs(x - p) + Math.abs(x - q) === s) roots.push(x);
      }
      expect(roots).toHaveLength(2);
      expect(d.value).toBe(ask === 'max' ? Math.max(...roots) : Math.min(...roots));
    }
  });

  it('modIneq: butun sonlar soni', () => {
    for (const d of y1Draws('modIneq')) {
      const { a, b, c, strict } = d.params as { a: number; b: number; c: number; strict: boolean };
      const count = ints(-200, 200).filter((x) => (strict ? Math.abs(a * x + b) < c : Math.abs(a * x + b) <= c)).length;
      expect(d.value).toBe(count);
    }
  });

  it('irr: tenglamani to\'g\'ridan-to\'g\'ri tekshiradi, yagona butun ildiz', () => {
    for (const d of y1Draws('irr')) {
      const { b, d: dd } = d.params as { b: number; d: number };
      const r1 = b + dd;
      const r2 = 2 * b + 1 - r1;
      const a = b * b - r1 * r2;
      const sol = ints(-100, 100).filter((x) => x + a >= 0 && Math.abs(Math.sqrt(x + a) - (x - b)) < 1e-12);
      expect(sol).toEqual([d.value]);
    }
  });

  it('system: matndagi sistemadan yechim qidiradi', () => {
    for (const d of y1Draws('system')) {
      const stem = d.stem('uz');
      const m = /x - y = (-?\d+) \\\\ x\^2 - y\^2 = (-?\d+)/.exec(stem)!;
      const diff = Number(m[1]);
      const sq = Number(m[2]);
      const sol: number[] = [];
      for (const x of ints(-60, 60)) for (const y of ints(-60, 60)) if (x - y === diff && x * x - y * y === sq) sol.push(x * y);
      expect(sol).toEqual([d.value]);
    }
  });

  it('exp: butun x lar bo\'yicha ildizlarni topadi', () => {
    for (const d of y1Draws('exp')) {
      const { a, m, n, ask } = d.params as { a: number; m: number; n: number; ask: 'sum' | 'prod' };
      const stem = d.stem('uz');
      const [base, c1, c2] = [...stem.matchAll(/\$(\d+)\^\{2x\} - (\d+)\\cdot \d+\^\{x\} \+ (\d+) = 0\$/g)].flatMap((x) => [Number(x[1]), Number(x[2]), Number(x[3])]);
      expect(base).toBe(a);
      const roots = ints(-6, 12).filter((x) => a ** (2 * x) - c1! * a ** x + c2! === 0);
      expect(roots).toEqual([m, n]);
      expect(d.value).toBe(ask === 'sum' ? roots[0]! + roots[1]! : roots[0]! * roots[1]!);
    }
  });

  it('log: sonli tekshiruv (yagona musbat ildiz)', () => {
    for (const d of y1Draws('log')) {
      const stem = d.stem('uz');
      const m = /\\log_\{(\d+)\} x \+ \\log_\{\d+\} \(x \+ (\d+)\) = (\d+)/.exec(stem)!;
      const [a, s, k] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const sol = ints(1, 400).filter((x) => Math.abs(Math.log(x) / Math.log(a) + Math.log(x + s) / Math.log(a) - k) < 1e-9);
      expect(sol).toEqual([d.value]);
    }
  });

  it('trig: tenglamani sonli yechadi, eng kichik musbat ildiz', () => {
    const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
    for (const d of y1Draws('trig')) {
      const stem = d.stem('uz');
      const m = /\\(sin|cos|tan) (\d+)x = (.+?)\$/.exec(stem)!;
      const fn = fns[m[1] as keyof typeof fns];
      const k = Number(m[2]);
      const entry = TRIG_TABLE.find((e) => e.fn === m[1] && e.val === m[3])!;
      expect(entry).toBeDefined();
      const g = (x: number) => fn(k * x) - entry.num;
      expect(Math.abs(g(d.value))).toBeLessThan(1e-9);
      // d.value dan kichik musbat ildiz yo'q: belgi o'zgarishini izlaymiz (tan uzilishlarini o'tkazib yuboramiz)
      const N = 4000;
      let prev = g(1e-9);
      let crossings = 0;
      for (let i = 1; i < N; i++) {
        const cur = g((d.value * i) / N);
        if (Math.abs(prev) < 50 && Math.abs(cur) < 50 && prev * cur < 0) crossings++;
        prev = cur;
      }
      expect(crossings, `${stem}: d.value dan kichik ildiz bor`).toBe(0);
    }
  });

  it('trig jadvali: qiymat va 2 ta oila tekshiriladi', () => {
    const fns = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
    for (const e of TRIG_TABLE) {
      expectClose(fns[e.fn](e.t.n * Math.PI / e.t.d), e.num, `${e.fn} ${e.val} t`, 1e-12);
      expectClose(fns[e.fn](e.alt.n * Math.PI / e.alt.d), e.num, `${e.fn} ${e.val} alt`, 1e-12);
    }
  });

  it('param: a ni butun qiymatlar bo\'yicha qidiradi (diskriminant = 0)', () => {
    for (const d of y1Draws('param')) {
      const stem = d.stem('uz');
      const m = /\$x\^2 ([+-]) (\d+)x \+ (\d*)a ([+-]) (\d+) = 0\$/.exec(stem)!;
      const B = (m[1] === '-' ? -1 : 1) * Number(m[2]);
      const q = m[3] === '' ? 1 : Number(m[3]);
      const r = (m[4] === '-' ? -1 : 1) * Number(m[5]);
      const sol = ints(-200, 200).filter((a) => B * B - 4 * (q * a + r) === 0);
      expect(sol).toEqual([d.value]);
    }
  });

  it('motion: matndagi son-lardan v va c ni topadi', () => {
    for (const d of y1Draws('motion')) {
      const [dist, t1, t2] = nums(d.stem('uz'));
      const sols: [number, number][] = [];
      for (let v = 1; v <= 80; v++) for (let c = 1; c < v; c++) if (dist! === (v + c) * t1! && dist! === (v - c) * t2!) sols.push([v, c]);
      expect(sols).toHaveLength(1);
      const ask = (d.params as { ask: 'current' | 'boat' }).ask;
      expect(d.value).toBe(ask === 'current' ? sols[0]![1] : sols[0]![0]);
      expect(Number.isInteger(dist! / t1!) && Number.isInteger(dist! / t2!)).toBe(true);
    }
  });

  it('mixture: matndan raqamlarni olib kg ni qidiradi', () => {
    for (const d of y1Draws('mixture')) {
      const [p, m, q, r] = nums(d.stem('uz'));
      const sol = ints(1, 600).filter((x) => m! * p! + x * q! === (m! + x) * r!);
      expect(sol).toEqual([d.value]);
    }
  });

  it('shablon identifikatorlari va mavzular xilma-xil', () => {
    expect(new Set(TENGLAMA_Y1.map((e) => e.id)).size).toBe(TENGLAMA_Y1.length);
    expect(new Set(TENGLAMA_Y1.map((e) => e.topic)).size).toBeGreaterThanOrEqual(10);
  });
});

describe('tenglama: ochiq (O) shablonlarining to\'g\'ri javobi', () => {
  it('oViet: ildizlar va kvadratlar yig\'indisi', () => {
    for (const d of oDraws('oViet')) {
      const stem = d.stem('uz');
      const poly = firstPoly(stem);
      const [A, B, C] = [poly[2]!, poly[1] ?? 0, poly[0]!];
      const D = B * B - 4 * A * C;
      const x1 = (-B + Math.sqrt(D)) / (2 * A);
      const x2 = (-B - Math.sqrt(D)) / (2 * A);
      expectClose(d.parts.a!.value, Math.max(x1, x2), 'katta ildiz');
      expectClose(d.parts.b!.value, x1 * x1 + x2 * x2, 'kvadratlar yig\'indisi');
    }
  });

  it('oQineq: butun yechimlar soni va yig\'indisi', () => {
    for (const d of oDraws('oQineq')) {
      const { a, p, gap, strict } = d.params as { a: number; p: number; gap: number; strict: boolean };
      const q = p + gap;
      const poly = firstPoly(d.stem('uz'));
      const f = (x: number) => (poly[2] ?? 0) * x * x + (poly[1] ?? 0) * x + (poly[0] ?? 0);
      expect(f(p)).toBe(0);
      expect(f(q)).toBe(0);
      expect(poly[2]).toBe(a);
      const sol = ints(-100, 100).filter((x) => (strict ? f(x) < 0 : f(x) <= 0));
      expect(d.parts.a!.value).toBe(sol.length);
      expect(d.parts.b!.value).toBe(sol.reduce((s, x) => s + x, 0));
    }
  });

  it('oBiq: ko\'phadni ko\'paytirib haqiqiy ildizlarni sanaydi', () => {
    const mul = (u: number[], v: number[]) => {
      const out = Array<number>(u.length + v.length - 1).fill(0);
      u.forEach((x, i) => v.forEach((y, j) => (out[i + j] = out[i + j]! + x * y)));
      return out;
    };
    for (const d of oDraws('oBiq')) {
      const { kind, m, n } = d.params as { kind: 'four' | 'three' | 'two'; m: number; n: number };
      // koeffitsiyentlar x^0 dan boshlab
      const f1 = [-m * m, 0, 1];
      const f2 = kind === 'four' ? [-n * n, 0, 1] : kind === 'three' ? [0, 0, 1] : [n, 0, 1];
      const poly = mul(f1, f2);
      const ev = (x: number) => poly.reduce((s, c, i) => s + c * x ** i, 0);
      const roots = ints(-30, 30).filter((x) => ev(x) === 0);
      expect(d.parts.a!.value).toBe(roots.length);
      expect(d.parts.b!.value).toBe(roots.reduce((s, x) => s + x * x, 0));
      // stemdagi tenglama shu ko'phad bilan bir xil
      const shown = firstPoly(d.stem('uz'));
      poly.forEach((cf, i) => expect(shown[i] ?? 0, `x^${i}`).toBe(cf));
    }
  });

  it('oBoat: matndan v va c ni topadi; ko\'ldagi vaqt', () => {
    for (const d of oDraws('oBoat')) {
      const [dist, t1, t2] = nums(d.stem('uz'));
      const sols: [number, number][] = [];
      for (let v = 1; v <= 80; v++) for (let c = 1; c < v; c++) if (dist! === (v + c) * t1! && dist! === (v - c) * t2!) sols.push([v, c]);
      expect(sols).toHaveLength(1);
      const [v, c] = sols[0]!;
      expect(d.parts.a!.value).toBe(c);
      const L = Number(/(\d+) km masofani/.exec(d.parts.b!.prompt('uz'))![1]);
      expectClose(d.parts.b!.value, L / v, 'ko\'ldagi vaqt');
    }
  });

  it('oSystem: matndagi sistemadan juftliklarni qidiradi', () => {
    for (const d of oDraws('oSystem')) {
      const stem = d.stem('uz');
      const s = Number(/x \+ y = (-?\d+)/.exec(stem)![1]);
      const m = Number(/x\^2 \+ y\^2 = (-?\d+)/.exec(stem)![1]);
      const sols: [number, number][] = [];
      for (const x of ints(-40, 40)) for (const y of ints(-40, 40)) if (x + y === s && x * x + y * y === m) sols.push([x, y]);
      expect(sols).toHaveLength(2);
      const best = sols.reduce((u, w) => (w[0] > u[0] ? w : u));
      expect(d.parts.a!.value).toBe(best[0]);
      expect(d.parts.b!.value).toBe(best[1]);
    }
  });

  it('shablonlar mavzulari bloklar diapazonida va xilma-xil', () => {
    expect(new Set(TENGLAMA_O.map((e) => e.topic)).size).toBeGreaterThanOrEqual(4);
  });
});

describe('tenglama: kalit va variantlar', () => {
  it('kalit harfi to\'g\'ri javobga ishora qiladi (barcha tillarda), ochiq kalitlar mos', () => {
    for (let v = 0; v < 6; v++) {
      for (const req of slotRequests(v).filter((r) => r.block === 'tenglama')) {
        const spec = generateTenglama(req);
        if (req.type === 'y1') {
          const { correct } = spec.key as { correct: 'A' | 'B' | 'C' | 'D' };
          const texts = ['uz', 'ru', 'kaa', 'en'].map((l) => ((spec.content(l as 'uz').payload as { options: Record<string, string> }).options)[correct]);
          expect(new Set(texts).size).toBe(1);
          expect(texts[0]!.startsWith('$')).toBe(true);
        } else {
          const a = assembled(generateTenglama, req);
          expect(Object.keys(a.key as object).sort()).toEqual(['a', 'b']);
        }
      }
    }
  });

  it('tillar izchilligi: raqamlar bir xil, kirill/lotin aralashmaydi', () => {
    expect(checkLanguageHygiene(generateTenglama, 'tenglama').slice(0, 10)).toEqual([]);
  });

  it('barcha variantlarda y1 savollar L2, o savollar L2; 6 y1 + 2 o', () => {
    for (let v = 0; v < 6; v++) {
      const reqs = slotRequests(v).filter((r) => r.block === 'tenglama');
      expect(reqs.filter((r) => r.type === 'y1')).toHaveLength(6);
      expect(reqs.filter((r) => r.type === 'o')).toHaveLength(2);
      expect(reqs.every((r) => r.difficulty === 'L2')).toBe(true);
    }
  });

  it('bir variantda y1 shablonlari takrorlanmaydi', () => {
    for (let v = 0; v < 6; v++) {
      const ids = slotRequests(v)
        .filter((r) => r.block === 'tenglama' && r.type === 'y1')
        .map((r) => chooseEntry(TENGLAMA_Y1, r).id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('tenglama: y1 variantlari sonli jihatdan to\'g\'ri', () => {
  it('to\'g\'ri variant qiymatga teng, noto\'g\'rilari undan va bir-biridan farq qiladi', () => {
    for (const e of TENGLAMA_Y1) {
      for (const d of drawsY1(e, 'tenglama', 6, 14)) {
        const c = parseTexNumber(d.correct);
        expect(c, `${e.id}: ${d.correct}`).not.toBeNull();
        expectClose(c!, d.value, `${e.id} to'g'ri variant`, 1e-9);
        const wr = d.wrong.map((w) => parseTexNumber(w));
        expect(wr.every((w) => w !== null), `${e.id}: ${d.wrong.join(' | ')}`).toBe(true);
        for (const w of wr) expect(Math.abs(w! - d.value) > 1e-9, `${e.id}: noto'g'ri variant javobga teng`).toBe(true);
        expect(new Set(wr.map((w) => w!.toFixed(9))).size, `${e.id}: takroriy chalg'ituvchi`).toBe(wr.length);
        expect(wr.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
