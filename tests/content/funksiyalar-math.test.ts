import { describe, expect, it } from 'vitest';
import { FUNKSIYALAR_O, FUNKSIYALAR_Y1, generateFunksiyalar } from '../../content/gen/funksiyalar';
import { slotRequests } from '../../content/gen/layout';
import { chooseEntry, type OEntry, type Y1Entry } from '../../content/gen/tf-common';
import { parseTexNumber, assembled, checkLanguageHygiene, drawsO, drawsY1, expectClose, firstPoly, nums, parsePoly } from './tf-math-utils';

// Javoblar generatordagi formulalardan mustaqil usullar bilan tekshiriladi (to'liq qidiruv, sonli skanerlash,
// matndan o'qilgan raqamlar bo'yicha qidiruv).

const y1 = (id: string): Y1Entry => FUNKSIYALAR_Y1.find((e) => e.id === id)!;
const op = (id: string): OEntry => FUNKSIYALAR_O.find((e) => e.id === id)!;
const y1Draws = (id: string) => drawsY1(y1(id), 'funksiyalar', 2, 20);
const oDraws = (id: string) => drawsO(op(id), 'funksiyalar', 1, 38);
const ints = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/** "f(x) = ..." dan keyingi ko'phadni $...$ ichidan oladi */
const polyAfterF = (stem: string) => {
  const m = /f\(x\) = ([^$]*?)\$/.exec(stem);
  if (!m) throw new Error(`f(x) topilmadi: ${stem.slice(0, 60)}`);
  return parsePoly(m[1]!);
};

describe('funksiyalar: Y-1 shablonlarining to\'g\'ri javobi', () => {
  it('domain: aniqlanish sohasidagi butun sonlar (formulani to\'g\'ridan-to\'g\'ri hisoblaydi)', () => {
    for (const d of y1Draws('domain')) {
      const stem = d.stem('uz');
      const A = /\\frac\{\\sqrt\{(\d+) - x\^2\}\}\{x\^2 - (\d+)\}/.exec(stem);
      const B = /\\sqrt\{x \+ (\d+)\} \+ \\frac\{1\}\{\\sqrt\{(\d+) - x\}\}/.exec(stem);
      expect(A || B).toBeTruthy();
      let count = 0;
      for (const x of ints(-100, 100)) {
        let ok: boolean;
        if (A) {
          const num = Number(A[1]) - x * x;
          const den = x * x - Number(A[2]);
          ok = num >= 0 && den !== 0;
        } else {
          ok = x + Number(B![1]) >= 0 && Number(B![2]) - x > 0;
        }
        if (ok) count++;
      }
      expect(d.value).toBe(count);
    }
  });

  it('evenOdd: juft va toq funksiyalarning aniq namunalari bilan', () => {
    for (const d of y1Draws('evenOdd')) {
      const stem = d.stem('uz');
      const mm = /f\((-?\d+)\) = (-?\d+), \\quad g\((-?\d+)\) = (-?\d+)\$ va \$h\(x\) = (-?\d*)f\(x\) ([+-]) (\d+)g\(x\)\$ bo'lsa, \$h\((\d+)\)\$/.exec(stem)!;
      expect(mm).toBeTruthy();
      const a = Number(mm[8]);
      const p = Number(mm[2]);
      const q = Number(mm[4]);
      const al = mm[5] === '' ? 1 : mm[5] === '-' ? -1 : Number(mm[5]);
      const be = (mm[6] === '-' ? -1 : 1) * Number(mm[7]);
      expect(Number(mm[1])).toBe(-a);
      expect(Number(mm[3])).toBe(-a);
      // juft: f(x) = p (o'zgarmas); toq: g(x) = -(q/a) x, g(-a) = q
      const f = () => p;
      const g = (x: number) => (-q / a) * x;
      expectClose(g(-a), q, 'g(-a)');
      expectClose(d.value, al * f() + be * g(a), 'h(a)');
    }
  });

  it('period: davriy funksiyani davrga keltirib hisoblaydi', () => {
    for (const d of y1Draws('period')) {
      const stem = d.stem('uz');
      const T = Number(/davri (\d+) bo'lgan/.exec(stem)![1]);
      const poly = polyAfterF(stem);
      const N = Number(/\$f\((\d+)\)\$ ni toping/.exec(stem)![1]);
      const base = (x: number) => (poly[2] ?? 0) * x * x + (poly[1] ?? 0) * x + (poly[0] ?? 0);
      let x = N;
      while (x >= T) x -= T;
      expect(d.value).toBe(base(x));
      expect(x).toBeGreaterThan(0);
    }
  });

  it('quadSeg: kesmadagi nuqtalarda (1/4 qadam) eng katta/kichik qiymat', () => {
    for (const d of y1Draws('quadSeg')) {
      const stem = d.stem('uz');
      const poly = polyAfterF(stem);
      const seg = /\[(-?\d+);\\ (-?\d+)\]/.exec(stem)!;
      const lo = Number(seg[1]);
      const hi = Number(seg[2]);
      const f = (x: number) => (poly[2] ?? 0) * x * x + (poly[1] ?? 0) * x + (poly[0] ?? 0);
      const vals: number[] = [];
      for (let t = lo * 4; t <= hi * 4; t++) vals.push(f(t / 4));
      const isMax = stem.includes('eng katta');
      expect(d.value).toBe(isMax ? Math.max(...vals) : Math.min(...vals));
    }
  });

  it('expFn: matndagi nuqtalardan k va a ni qidiradi', () => {
    for (const d of y1Draws('expFn')) {
      const stem = d.stem('uz');
      const A = /A\((\d+);\\ (\d+)\)/.exec(stem)!;
      const B = /B\((\d+);\\ (\d+)\)/.exec(stem)!;
      const r = Number(/\$f\((\d+)\)\$ ni toping/.exec(stem)![1]);
      const sols: number[] = [];
      for (let a = 2; a <= 12; a++) for (let k = 1; k <= 60; k++) if (k * a ** Number(A[1]) === Number(A[2]) && k * a ** Number(B[1]) === Number(B[2])) sols.push(k * a ** r);
      expect(sols).toEqual([d.value]);
    }
  });

  it('transform: argument tenglamasini butun sonlar bo\'yicha yechadi', () => {
    for (const d of y1Draws('transform')) {
      const stem = d.stem('uz');
      const given = /\((-?\d+);\\ (-?\d+)\)/.exec(stem)!;
      const m = Number(given[1]);
      const n = Number(given[2]);
      const g = /y = (-?\d*)f\(([^)]*)\) ([+-]) (\d+)\$/.exec(stem)!;
      const al = g[1] === '' ? 1 : g[1] === '-' ? -1 : Number(g[1]);
      const arg = parsePoly(g[2]!);
      const q = (g[3] === '-' ? -1 : 1) * Number(g[4]);
      const xs = ints(-100, 100).filter((x) => (arg[1] ?? 0) * x + (arg[0] ?? 0) === m);
      expect(xs).toHaveLength(1);
      expect(d.value).toBe(xs[0]! + (al * n + q));
    }
  });

  it('composite: f(x) = m tenglamani butun sonlar bo\'yicha yechib g ni hisoblaydi', () => {
    for (const d of y1Draws('composite')) {
      const stem = d.stem('uz');
      const fm = /f\(x\) = ([^$]*?)\$ va \$g\(x\) = ([^$]*?)\$/.exec(stem)!;
      const fp = parsePoly(fm[1]!);
      const gp = parsePoly(fm[2]!);
      const m = Number(/f\^\{-1\}\((-?\d+)\)/.exec(stem)![1]);
      const sols = ints(-100, 100).filter((x) => (fp[1] ?? 0) * x + (fp[0] ?? 0) === m);
      expect(sols).toHaveLength(1);
      const x = sols[0]!;
      expect(d.value).toBe((gp[2] ?? 0) * x * x + (gp[0] ?? 0));
    }
  });

  it('trigRange: [0, 2pi] bo\'yicha sonli skanerlash', () => {
    for (const d of y1Draws('trigRange')) {
      const stem = d.stem('uz');
      const m = /y = (-?\d+) \\sin x ([+-]) (\d+)\\cos x ([+-]) (\d+)\$/.exec(stem)!;
      const A = Number(m[1]);
      const B = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      const C = (m[4] === '-' ? -1 : 1) * Number(m[5]);
      let lo = Infinity;
      let hi = -Infinity;
      const N = 200000;
      for (let i = 0; i <= N; i++) {
        const x = (2 * Math.PI * i) / N;
        const y = A * Math.sin(x) + B * Math.cos(x) + C;
        if (y < lo) lo = y;
        if (y > hi) hi = y;
      }
      expectClose(d.value, stem.includes('eng katta') ? hi : lo, 'ekstremum', 1e-8);
    }
  });

  it('shablonlar mavzulari xilma-xil', () => {
    expect(new Set(FUNKSIYALAR_Y1.map((e) => e.id)).size).toBe(FUNKSIYALAR_Y1.length);
    expect(new Set(FUNKSIYALAR_Y1.map((e) => e.topic)).size).toBeGreaterThanOrEqual(7);
  });
});

describe('funksiyalar: ochiq (O) shablonlarining to\'g\'ri javobi', () => {
  it('oQuad: butun nuqtalarda ekstremum va uni beruvchi nuqta', () => {
    for (const d of oDraws('oQuad')) {
      const poly = polyAfterF(d.stem('uz'));
      const f = (x: number) => (poly[2] ?? 0) * x * x + (poly[1] ?? 0) * x + (poly[0] ?? 0);
      const up = (poly[2] ?? 0) > 0;
      const best = ints(-60, 60).reduce((u, x) => (up ? (f(x) < f(u) ? x : u) : f(x) > f(u) ? x : u));
      expect(d.parts.a!.value).toBe(best);
      expect(d.parts.b!.value).toBe(f(best));
      expect(d.parts.b!.prompt('uz')).toContain(up ? 'eng kichik' : 'eng katta');
    }
  });

  it('oLine: nuqtalardan to\'g\'ri chiziq', () => {
    for (const d of oDraws('oLine')) {
      const stem = d.stem('uz');
      const A = /A\((-?\d+);\\ (-?\d+)\)/.exec(stem)!;
      const B = /B\((-?\d+);\\ (-?\d+)\)/.exec(stem)!;
      const [x1, y1v, x2, y2v] = [Number(A[1]), Number(A[2]), Number(B[1]), Number(B[2])];
      const k = (y2v - y1v) / (x2 - x1);
      const b = y1v - k * x1;
      expectClose(d.parts.a!.value, k, 'k');
      expectClose(d.parts.b!.value, -b / k, 'nol', 1e-12);
      expectClose(k * (-b / k) + b, 0, 'chiziq nolda', 1e-9);
    }
  });

  it('oLog: asosni va qiymatni logarifm orqali tekshiradi', () => {
    for (const d of oDraws('oLog')) {
      const stem = d.stem('uz');
      const pt = /\((\d+);\\ (\d+)\)/.exec(stem)!;
      const N1 = Number(pt[1]);
      const q = Number(pt[2]);
      const bases = ints(2, 30).filter((a) => Math.abs(Math.log(N1) / Math.log(a) - q) < 1e-9);
      expect(bases).toEqual([d.parts.a!.value]);
      const arg = /f\((\\frac\{1\}\{(\d+)\}|\d+)\)/.exec(d.parts.b!.prompt('uz'))!;
      const N2 = arg[2] ? 1 / Number(arg[2]) : Number(arg[1]);
      expectClose(d.parts.b!.value, Math.log(N2) / Math.log(bases[0]!), 'f(N2)', 1e-9);
    }
  });

  it('oFracFn: tenglama ildizi va gorizontal asimptota', () => {
    for (const d of oDraws('oFracFn')) {
      const stem = d.stem('uz');
      const m = /\\frac\{([^}]*)\}\{([^}]*)\}\$/.exec(stem)!;
      const num = parsePoly(m[1]!);
      const den = parsePoly(m[2]!);
      const f = (x: number) => ((num[1] ?? 0) * x + (num[0] ?? 0)) / ((den[1] ?? 0) * x + (den[0] ?? 0));
      const target = nums(d.parts.a!.prompt('uz'))[0]!;
      const xs = ints(-200, 200).filter((x) => (den[1] ?? 0) * x + (den[0] ?? 0) !== 0 && Math.abs(f(x) - target) < 1e-12);
      expect(xs).toEqual([d.parts.a!.value]);
      expectClose(d.parts.b!.value, f(1e9), 'asimptota', 1e-6);
      expectClose(d.parts.b!.value, f(-1e9), 'asimptota (-)', 1e-6);
    }
  });

  it('shablonlar mavzulari xilma-xil', () => {
    expect(new Set(FUNKSIYALAR_O.map((e) => e.topic)).size).toBe(FUNKSIYALAR_O.length);
  });
});

describe('funksiyalar: kalit va variantlar', () => {
  it('kalit harfi barcha tillarda bir xil javobga ishora qiladi; ochiq kalitlar to\'liq', () => {
    for (let v = 0; v < 6; v++) {
      for (const req of slotRequests(v).filter((r) => r.block === 'funksiyalar')) {
        const spec = generateFunksiyalar(req);
        if (req.type === 'y1') {
          const { correct } = spec.key as { correct: 'A' | 'B' | 'C' | 'D' };
          const texts = (['uz', 'ru', 'kaa', 'en'] as const).map((l) => (spec.content(l).payload as { options: Record<string, string> }).options[correct]);
          expect(new Set(texts).size).toBe(1);
        } else {
          expect(Object.keys(assembled(generateFunksiyalar, req).key as object).sort()).toEqual(['a', 'b']);
        }
      }
    }
  });

  it('tillar izchilligi: raqamlar bir xil, kirill/lotin aralashmaydi', () => {
    expect(checkLanguageHygiene(generateFunksiyalar, 'funksiyalar').slice(0, 10)).toEqual([]);
  });

  it('har variantda 2 ta y1 + 1 ta o, hammasi L2; bir variantda y1 shablonlari takrorlanmaydi', () => {
    for (let v = 0; v < 6; v++) {
      const reqs = slotRequests(v).filter((r) => r.block === 'funksiyalar');
      expect(reqs.filter((r) => r.type === 'y1')).toHaveLength(2);
      expect(reqs.filter((r) => r.type === 'o')).toHaveLength(1);
      expect(reqs.every((r) => r.difficulty === 'L2')).toBe(true);
      const ids = reqs.filter((r) => r.type === 'y1').map((r) => chooseEntry(FUNKSIYALAR_Y1, r).id);
      expect(new Set(ids).size).toBe(2);
      const topics = reqs.map((r) => generateFunksiyalar(r).topic);
      expect(new Set(topics).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('firstPoly yordamchisi', () => {
    expect(firstPoly('$x^{2} - 5x + 6 = 0$')).toEqual({ 2: 1, 1: -5, 0: 6 });
  });
});

describe('funksiyalar: y1 variantlari sonli jihatdan to\'g\'ri', () => {
  it('to\'g\'ri variant qiymatga teng, noto\'g\'rilari undan va bir-biridan farq qiladi', () => {
    for (const e of FUNKSIYALAR_Y1) {
      for (const d of drawsY1(e, 'funksiyalar', 2, 20)) {
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
