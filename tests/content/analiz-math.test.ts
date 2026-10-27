import { describe, expect, it } from 'vitest';
import * as A from '../../content/gen/analiz';
import { makeRng, type Frac } from '../../content/gen/helpers';
import { polyAt, polyDer } from '../../content/gen/analiz-toplam-util';

// Mustaqil sonli tekshiruv: javoblar boshqa usul bilan (markaziy ayirma, trapetsiya, to'g'ridan-to'g'ri yig'ish,
// panjara qidiruvi) qayta hisoblanadi.

const seeds = (name: string, n = 300) => Array.from({ length: n }, (_, i) => makeRng(`${name}-${i}`));
const val = (f: Frac) => f.n / f.d;
const cdiff = (f: (x: number) => number, x: number, h = 1e-5) => (f(x + h) - f(x - h)) / (2 * h);
const close = (a: number, b: number, tol = 1e-4) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol * Math.max(1, Math.abs(b)));

function trapezoid(f: (x: number) => number, a: number, b: number, n = 20000): number {
  const h = (b - a) / n;
  let s = (f(a) + f(b)) / 2;
  for (let i = 1; i < n; i++) s += f(a + i * h);
  return s * h;
}

describe('analiz: javob kalitlari sonli usul bilan mos', () => {
  it('murakkab funksiya hosilasi', () => {
    for (const rng of seeds('chain')) {
      const p = A.sampleChain(rng);
      close(A.solveChain(p), cdiff((x) => (p.a * x + p.b) ** p.n, p.x0), 1e-5);
    }
  });

  it('urinma tenglamasi: burchak koeffitsiyenti va kesishish', () => {
    for (const rng of seeds('tan')) {
      const p = A.sampleTangent(rng);
      const f = (x: number) => polyAt(p.coefs, x);
      const { k, b } = A.solveTangent(p);
      close(k, cdiff(f, p.x0), 1e-5);
      close(k * p.x0 + b, f(p.x0));
      const h = 1e-3;
      expect(Math.abs(f(p.x0 + h) - (k * (p.x0 + h) + b))).toBeLessThan(0.1 * h);
    }
  });

  it("ekstremum: hosila nolga teng, minimum va maksimum to'g'ri", () => {
    for (const rng of seeds('ext')) {
      const p = A.sampleExtremum(rng);
      const { coefs, fmin, fmax } = A.solveExtremum(p);
      const f = (x: number) => polyAt(coefs, x);
      close(cdiff(f, p.r1), 0, 1e-3);
      close(cdiff(f, p.r2), 0, 1e-3);
      expect(f(p.r2)).toBe(fmin);
      expect(fmin).toBeLessThanOrEqual(Math.min(f(p.r2 - 0.1), f(p.r2 + 0.1)));
      expect(fmax).toBeGreaterThanOrEqual(Math.max(f(p.r1 - 0.1), f(p.r1 + 0.1)));
    }
  });

  it('kesmada eng katta/kichik qiymat (panjara qidiruvi)', () => {
    for (const rng of seeds('seg')) {
      const p = A.sampleSegment(rng);
      const { coefs, value } = A.solveSegment(p);
      let best = p.wantMax ? -Infinity : Infinity;
      for (let x = p.lo; x <= p.hi + 1e-9; x += 0.001) {
        const y = polyAt(coefs, x);
        best = p.wantMax ? Math.max(best, y) : Math.min(best, y);
      }
      close(value, best, 1e-4);
    }
  });

  it("arifmetik progressiya: ketma-ketlikni to'g'ridan-to'g'ri yig'ish", () => {
    for (const rng of seeds('ap')) {
      const p = A.sampleAp(rng);
      const { ap, aq, sn } = A.solveAp(p);
      const seq = Array.from({ length: p.n }, (_, i) => p.a1 + i * p.d);
      expect(seq[p.p - 1]).toBe(ap);
      expect(p.a1 + (p.q - 1) * p.d).toBe(aq);
      expect(seq.reduce((s, v) => s + v, 0)).toBe(sn);
      expect(Number.isInteger(sn)).toBe(true);
    }
  });

  it("cheksiz geometrik progressiya: qisman yig'indi yaqinlashadi", () => {
    for (const rng of seeds('gp')) {
      const p = A.sampleGp(rng);
      const { b1, b3, s } = A.solveGp(p);
      const q = val(p.q);
      expect(Math.abs(q)).toBeLessThan(1);
      expect(p.neg).toBe(q < 0);
      close(b1 * q * q, b3, 1e-9);
      let sum = 0;
      let term = b1;
      for (let i = 0; i < 400; i++, term *= q) sum += term;
      close(sum, val(s), 1e-9);
    }
  });

  it('0/0 limit: nuqtaga yaqin qiymatlar', () => {
    for (const rng of seeds('lim00')) {
      const { p, q } = A.sampleLim00(rng);
      const ans = val(A.solveLim00({ p, q }));
      const f = (x: number) => (x * x - (p + q) * x + p * q) / (x * x - q * q);
      close(f(q + 1e-6), ans, 1e-4);
      close(f(q - 1e-6), ans, 1e-4);
    }
  });

  it('ketma-ketlik limiti: katta n da', () => {
    for (const rng of seeds('seq')) {
      const k = A.sampleSeqLim(rng);
      const n = 1e7;
      const a = ((k.p * n + k.q) * (k.r * n + k.s)) / (k.t * n * n + k.u * n);
      close(a, val(A.solveSeqLim(k)), 1e-5);
    }
  });

  it("boshlang'ich funksiya: aniq integral bilan", () => {
    for (const rng of seeds('anti')) {
      const k = A.sampleAnti(rng);
      const { fCoefs, value } = A.solveAnti(k);
      close(k.s + trapezoid((x) => polyAt(fCoefs, x), k.x1, k.x2), value, 1e-6);
    }
  });

  it("parabola yuzi: |f| trapetsiya yig'indisi", () => {
    for (const rng of seeds('area')) {
      const a = A.sampleArea(rng);
      const { coefs, area } = A.solveArea(a);
      close(trapezoid((x) => Math.abs(polyAt(coefs, x)), a.p, a.q), val(area), 1e-6);
    }
  });

  it("bo'linma hosilasi: markaziy ayirma", () => {
    for (const rng of seeds('quot')) {
      const k = A.sampleQuot(rng);
      close(val(A.solveQuot(k)), cdiff((x) => (x * x + k.a) / (x + k.b), k.x0), 1e-5);
    }
  });

  it('ochiq: urinmaning Ox bilan kesishishi', () => {
    for (const rng of seeds('otan')) {
      const p = A.sampleTangent(rng);
      const { k, xInt } = A.solveTangentOpen(p);
      const f = (x: number) => polyAt(p.coefs, x);
      close(k, cdiff(f, p.x0), 1e-5);
      close(f(p.x0) + k * (val(xInt) - p.x0), 0, 1e-9);
    }
  });

  it("ochiq: devor yonidagi maydon (panjara qidiruvi)", () => {
    for (const rng of seeds('fence')) {
      const s = A.solveFence(A.sampleFence(rng));
      let bestX = 0;
      let best = -Infinity;
      for (let x = 0; x <= s.total / 3; x += 0.01) {
        const area = x * (s.total - 3 * x);
        if (area > best) [best, bestX] = [area, x];
      }
      close(bestX, s.x, 1e-3);
      close(best, s.area, 1e-4);
    }
  });

  it('ochiq: quti hajmi (panjara qidiruvi)', () => {
    for (const rng of seeds('box')) {
      const s = A.solveBox(A.sampleBox(rng));
      let bestX = 0;
      let best = -Infinity;
      for (let x = 0; x <= s.side / 2; x += 0.005) {
        const v = x * (s.side - 2 * x) ** 2;
        if (v > best) [best, bestX] = [v, x];
      }
      close(bestX, s.x, 1e-3);
      close(best, s.volume, 1e-4);
    }
  });

  it('ochiq: parametrli ekstremum', () => {
    for (const rng of seeds('crit')) {
      const k = A.sampleCrit(rng);
      const { p, q, fmax } = A.solveCrit(k);
      const coefs = [1, p, q, k.c];
      const f = (x: number) => polyAt(coefs, x);
      expect(Number.isInteger(p)).toBe(true);
      close(polyAt(polyDer(coefs), k.r1), 0, 1e-12);
      close(polyAt(polyDer(coefs), k.r2), 0, 1e-12);
      expect(f(k.r1)).toBe(fmax);
      expect(fmax).toBeGreaterThanOrEqual(Math.max(f(k.r1 - 0.1), f(k.r1 + 0.1)));
    }
  });

  it("ochiq: parabola va to'g'ri chiziq orasidagi yuza", () => {
    for (const rng of seeds('btw')) {
      const k = A.sampleBetween(rng);
      const { line, area } = A.solveBetween(k);
      for (const r of [k.p, k.q]) close(r * r, polyAt(line, r), 1e-12);
      close(trapezoid((x) => polyAt(line, x) - x * x, k.p, k.q), val(area), 1e-6);
    }
  });

  it('ochiq: arifmetik progressiya tizimi', () => {
    for (const rng of seeds('apo')) {
      const k = A.sampleApOpen(rng);
      const s = A.solveApOpen(k);
      expect(s.dFound).toBe(k.d);
      expect(s.a1Found).toBe(k.a1);
      const seq = Array.from({ length: 20 }, (_, i) => k.a1 + i * k.d);
      expect(seq[1]! + seq[8]!).toBe(s.A);
      expect(seq[4]).toBe(s.B);
      expect(seq.slice(0, k.n).reduce((x, y) => x + y, 0)).toBe(s.sn);
    }
  });

  it('ochiq: cheksiz geometrik progressiya', () => {
    for (const rng of seeds('gpo')) {
      const k = A.sampleGpOpen(rng);
      expect(Number.isInteger(k.b1)).toBe(true);
      const { q, b3 } = A.solveGpOpen(k);
      expect(Math.abs(val(q))).toBeLessThan(1);
      let sum = 0;
      let term = k.b1;
      for (let i = 0; i < 400; i++, term *= val(q)) sum += term;
      close(sum, k.S, 1e-9);
      close(k.b1 * val(q) ** 2, val(b3), 1e-9);
    }
  });

  it('ochiq: limitlar', () => {
    for (const rng of seeds('limo')) {
      const k = A.sampleLimOpen(rng);
      const { first, second } = A.solveLimOpen(k);
      const f = (x: number) => (x * x - (k.p + k.s) * x + k.p * k.s) / (x - k.p);
      close(f(k.p + 1e-7), first, 1e-5);
      let sum = 0;
      const n = 100000;
      for (let i = 1; i <= n; i++) sum += i;
      close((k.a * sum) / (n * n + k.c), val(second), 1e-3);
    }
  });
});
