import { describe, expect, it } from 'vitest';
import { ALGEBRA_L1, ALGEBRA_L2 } from '../../content/gen/algebra';
import { SONLAR_TEMPLATES } from '../../content/gen/sonlar';
import {
  TRIG_FNS,
  exactTrig,
  polyEval,
  polyTex,
  qMul,
  qNum,
  qScale,
  qTex,
  q,
  radTex,
  rootTex,
  terms,
  trigNum,
  validBuilt,
  type Template,
} from '../../content/gen/algebra-lib';
import { frac } from '../../content/gen/helpers';
import { LANGS } from '../../content/gen/types';

// Mustaqil tekshiruv: har bir shablon o'z "check" juftlarini (to'g'ridan-to'g'ri sonli hisob vs javobning yopiq shakli)
// ko'p variant/parametrlarda mos kelishini isbotlaydi; yordamchi funksiyalar alohida sinaladi.

describe('algebra-lib: matematik yordamchilar', () => {
  it('terms / polyTex / rootTex', () => {
    expect(terms([[1, 'x^2'], [-3, 'x'], [1, '']])).toBe('x^2-3x+1');
    expect(terms([[-1, 'x'], [0, 'y'], [-5, '']])).toBe('-x-5');
    expect(terms([[0, 'x']])).toBe('0');
    expect(polyTex([2, 0, -7])).toBe('2x^2-7');
    expect(polyTex([-1, 4])).toBe('-x+4');
    expect(rootTex(3, 5)).toBe(String.raw`3\sqrt{5}`);
    expect(rootTex(-1, 5)).toBe(String.raw`-\sqrt{5}`);
    expect(polyEval([2, -3, 1], 2)).toBe(3);
  });

  it('radTex', () => {
    expect(radTex(210)).toBe(String.raw`\frac{7\pi}{6}`);
    expect(radTex(90)).toBe(String.raw`\frac{\pi}{2}`);
    expect(radTex(180)).toBe(String.raw`\pi`);
    expect(radTex(360)).toBe(String.raw`2\pi`);
  });

  it("exactTrig: barcha burchaklar va funksiyalar bo'yicha Math.* bilan mos", () => {
    let n = 0;
    for (let deg = -360; deg <= 720; deg += 15) {
      for (const fn of TRIG_FNS) {
        let e;
        try {
          e = exactTrig(fn, deg);
        } catch {
          continue; // jadvalda yo'q (masalan 15 gradus) yoki aniqlanmagan (tg 90)
        }
        n += 1;
        expect(qNum(e), `${fn} ${deg}`).toBeCloseTo(trigNum(fn, deg), 9);
      }
    }
    expect(n).toBeGreaterThan(150);
  });

  it("qTex kanonik: ishora va maxraj to'g'ri", () => {
    expect(qTex(exactTrig('sin', 120))).toBe(String.raw`\frac{\sqrt{3}}{2}`);
    expect(qTex(exactTrig('cos', 135))).toBe(String.raw`-\frac{\sqrt{2}}{2}`);
    expect(qTex(exactTrig('tan', 150))).toBe(String.raw`-\frac{\sqrt{3}}{3}`);
    expect(qTex(exactTrig('cos', 180))).toBe('-1');
    expect(qTex(exactTrig('sin', 0))).toBe('0');
    expect(qTex(q(frac(1, 2), frac(0), frac(1, 2)))).toBe(String.raw`\frac{1+\sqrt{3}}{2}`);
  });

  it("qMul: ko'paytirish sonli qiymat bilan mos", () => {
    const vals = [exactTrig('sin', 45), exactTrig('cos', 30), exactTrig('tan', 60), exactTrig('cos', 120), exactTrig('cot', 30)];
    for (const a of vals) {
      for (const b of vals) {
        expect(qNum(qMul(a, b))).toBeCloseTo(qNum(a) * qNum(b), 10);
        expect(qNum(qScale(qMul(a, b), frac(1, 2)))).toBeCloseTo((qNum(a) * qNum(b)) / 2, 10);
      }
    }
  });
});

const POOLS: Array<[string, readonly Template[]]> = [
  ['algebra L1', ALGEBRA_L1],
  ['algebra L2', ALGEBRA_L2],
  ['sonlar L1', SONLAR_TEMPLATES],
];

const formulas = (x: string): string => [...x.matchAll(/\$\$?([^$]+)\$?\$/g)].map((m) => m[1]).sort().join('|');

describe("shablonlar: javob kaliti sonli tekshiruvdan o'tadi (30 variant, har shablon)", () => {
  for (const [name, pool] of POOLS) {
    for (const t of pool) {
      it(`${name}: ${t.id}`, () => {
        const seen = new Set<string>();
        for (let v = 0; v < 30; v++) {
          const b = t.build(v);
          // 1) mustaqil sonli tekshiruv: to'g'ridan-to'g'ri hisob == javobning yopiq shakli
          expect(b.check.length, `${t.id} v${v}: check yo'q`).toBeGreaterThan(0);
          for (const [direct, closed] of b.check) {
            expect(Math.abs(direct - closed), `${t.id} v${v}: ${direct} != ${closed}`).toBeLessThan(1e-9 * Math.max(1, Math.abs(direct)));
          }
          // 2) kamida 3 ta noyob chalg'ituvchi, to'g'ri javobdan farqli
          expect(validBuilt(b), `${t.id} v${v}: yaroqsiz`).toBe(true);
          // 3) barcha tillarda matn bor; formula (raqamlar) tillar o'rtasida bir xil
          const uz = b.stem('uz');
          for (const lang of LANGS) {
            expect(b.stem(lang).length).toBeGreaterThan(8);
            expect(b.solution(lang).length).toBeGreaterThan(20);
            expect(b.mistake(lang).length).toBeGreaterThan(10);
            expect(formulas(b.stem(lang)), `${t.id} v${v} [${lang}]: stem formulalari farq qiladi`).toBe(formulas(uz));
            expect(formulas(b.solution(lang)), `${t.id} v${v} [${lang}]: yechim formulalari farq qiladi`).toBe(formulas(b.solution('uz')));
          }
          // 4) 30 variantda (stem + javob) takrorlanmaydi
          const sig = `${uz}||${b.correct}`;
          expect(seen.has(sig), `${t.id}: v${v} takror`).toBe(false);
          seen.add(sig);
        }
      });
    }
  }
});

describe('maxsus tekshiruvlar', () => {
  it("keltirish formulalari (alg-redsimp): natija bir nechta burchakda to'g'ri", () => {
    const t = ALGEBRA_L1.find((x) => x.id === 'alg-redsimp')!;
    for (let v = 0; v < 25; v++) {
      const b = t.build(v);
      expect(b.check.length).toBeGreaterThanOrEqual(3);
      for (const [d, c] of b.check) expect(d).toBeCloseTo(c, 9);
    }
  });

  it('shablonlar soni talabga mos: algebra L1 >= 15, L2 >= 2; sonlar >= 3', () => {
    expect(ALGEBRA_L1.length).toBeGreaterThanOrEqual(15);
    expect(ALGEBRA_L2.length).toBeGreaterThanOrEqual(2);
    expect(SONLAR_TEMPLATES.length).toBeGreaterThanOrEqual(3);
  });
});
