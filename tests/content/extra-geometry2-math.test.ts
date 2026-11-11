import { describe, expect, it } from 'vitest';
import { GEOMETRY2_TEMPLATES } from '../../content/gen/extra/geometry2';
import { checkExtraTemplate } from './extra-harness';
import { evalTex, near } from './tex-eval';

// Geometriya (planimetriya, fazo, jismlar, vektorlar) shablonlari: javob savol MATNIDAGI sonlardan boshqa usul bilan qayta hisoblanadi
// (koordinatalar, bissektrisani bisektsiya bilan topish, sonli integrallash, bevosita sanash). Shablonning ichki parametrlariga tayanilmaydi.

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const TPL = new Map(GEOMETRY2_TEMPLATES.map((t) => [t.id, t]));

interface Q {
  id: string;
  seed: number;
  stem: string;
  correct: string;
  wrongs: string[];
}
function load(id: string, seed: number): Q {
  const spec = TPL.get(id)!.generate(seed);
  const c = spec.content('uz');
  const opts = (c.payload as { options: Record<string, string> }).options;
  const letter = (spec.key as { correct: string }).correct;
  return { id, seed, stem: c.stem_md, correct: opts[letter]!, wrongs: Object.entries(opts).filter(([l]) => l !== letter).map(([, t]) => t) };
}
const ints = (s: string): number[] => (s.match(/-?\d+/g) ?? []).map(Number);
const pos = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);
const chunks = (s: string): string[] => [...s.matchAll(/\$([^$\n]+?)\$/g)].map((m) => m[1]!);
const flat = (s: string): string => s.replace(/\\ /g, '').replace(/\s+/g, '');

function expectVal(q: Q, expected: number): void {
  expect(near(evalTex(q.correct), expected, 1e-9), `${q.id}#${q.seed}: to'g'ri variant ${q.correct} = ${evalTex(q.correct)}, kutilgan ${expected}`).toBe(true);
  for (const w of q.wrongs) expect(near(evalTex(w), expected, 1e-7), `${q.id}#${q.seed}: chalg'ituvchi ${w} to'g'ri javobga teng`).toBe(false);
}
/** (x; y) yoki (x; y; z) nuqta matni -> sonlar */
const tuple = (t: string): number[] => flat(t.replace(/\$/g, '')).replace(/^.*?\(/, '').replace(/\)$/, '').split(';').map(Number);
const vecOf = (stem: string, name: string): number[] => {
  const m = new RegExp(`\\\\vec\\{${name}\\}=\\(([^)]*)\\)`).exec(stem);
  if (!m) throw new Error(`vektor ${name} topilmadi: ${stem}`);
  return flat(m[1]!).split(';').map((x) => (x === 'k' ? NaN : Number(x)));
};
const norm = (v: number[]): number => Math.sqrt(v.reduce((s, x) => s + x * x, 0));
const has = (q: Q, re: RegExp): boolean => re.test(q.stem);

type Check = (q: Q) => void;
const CHECKS: Record<string, Check> = {};

CHECKS['g2-par-angle'] = (q) => {
  const [x] = pos(q.stem) as [number];
  expectVal(q, has(q, /Kichik burchakni/) ? (180 - x) / 2 : 180 - x);
};

CHECKS['g2-tri-angles'] = (q) => {
  const w = chunks(q.stem)[0]!.split(':').map(Number);
  const S = w.reduce((s, x) => s + x, 0);
  expectVal(q, ((has(q, /Eng katta/) ? Math.max(...w) : Math.min(...w)) * 180) / S);
};

CHECKS['g2-tri-ineq'] = (q) => {
  const [a, b] = pos(q.stem) as [number, number];
  const ok: number[] = [];
  for (let c = 1; c <= a + b + 2; c++) if (a + b > c && a + c > b && b + c > a) ok.push(c);
  if (has(q, /necha xil/)) expectVal(q, ok.length);
  else if (has(q, /eng katta mumkin/)) expectVal(q, a + b + Math.max(...ok));
  else expectVal(q, a + b + Math.min(...ok));
};

CHECKS['g2-similar-area'] = (q) => {
  const [m, n] = chunks(q.stem)[0]!.split(':').map(Number) as [number, number];
  const S1 = Number(chunks(q.stem)[1]);
  expectVal(q, S1 * (n / m) ** 2);
};

CHECKS['g2-pyth-basic'] = (q) => {
  const [x, y] = pos(q.stem) as [number, number];
  expectVal(q, has(q, /Gipotenuzasini toping/) ? Math.hypot(x, y) : Math.sqrt(x * x - y * y));
};

CHECKS['g2-pyth-altitude'] = (q) => {
  const [A, B] = pos(q.stem) as [number, number];
  const c = Math.hypot(A, B);
  expectVal(q, has(q, /balandlikni/) ? (A * B) / c : (A * A) / c);
};

CHECKS['g2-median-centroid'] = (q) => {
  const [x] = pos(q.stem) as [number];
  if (has(q, /perimetri/)) expectVal(q, x / 2);
  else if (has(q, /chiqqan uchgacha/)) expectVal(q, (2 * x) / 3);
  else if (has(q, /tushgan tomongacha/)) expectVal(q, x / 3);
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
};

CHECKS['g2-bisector'] = (q) => {
  const g = (re: RegExp): number => Number(re.exec(q.stem)![1]);
  const c = g(/AB=(\d+)/);
  const b = g(/AC=(\d+)/);
  const a = g(/BC=(\d+)/);
  // B=(0,0), C=(a,0), A koordinatalari; bissektrisaning BC bilan kesishishini burchaklarni tenglashtirib topamiz
  const ax = (c * c + a * a - b * b) / (2 * a);
  const ay = Math.sqrt(c * c - ax * ax);
  const ang = (ux: number, uy: number, vx: number, vy: number): number => Math.acos((ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy)));
  const diff = (t: number): number => ang(-ax, -ay, t - ax, -ay) - ang(t - ax, -ay, a - ax, -ay);
  let lo = 0;
  let hi = a;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid;
    else hi = mid;
  }
  expectVal(q, (lo + hi) / 2);
};

CHECKS['g2-parallelogram'] = (q) => {
  if (has(q, /Parallelogrammning/)) {
    const [a, b, g] = pos(q.stem) as [number, number, number];
    expectVal(q, a * b * Math.sin((g * Math.PI) / 180));
  } else {
    const [d1, d2] = pos(q.stem) as [number, number];
    const side = Math.hypot(d1 / 2, d2 / 2);
    expectVal(q, has(q, /tomonini/) ? side : has(q, /perimetrini/) ? 4 * side : (d1 * d2) / 2);
  }
};

CHECKS['g2-rectangle'] = (q) => {
  const [A, C] = pos(q.stem) as [number, number];
  const B = Math.sqrt(C * C - A * A);
  expectVal(q, has(q, /yuzini/) ? A * B : 2 * (A + B));
};

CHECKS['g2-trapezoid'] = (q) => {
  const [b, big, l] = pos(q.stem) as [number, number, number];
  const x = (big - b) / 2;
  expectVal(q, ((b + big) / 2) * Math.sqrt(l * l - x * x));
};

CHECKS['g2-polygon'] = (q) => {
  const [n] = pos(q.stem) as [number];
  if (has(q, /yig'indisini/)) expectVal(q, (n - 2) * 180);
  else if (has(q, /diagonallari sonini/)) {
    let d = 0;
    for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) if (!(i === 0 && j === n - 1)) d++;
    expectVal(q, d);
  } else if (has(q, /Muntazam \$\d+\$ burchakning/)) expectVal(q, 180 - 360 / n);
  else if (has(q, /tomonlari sonini/)) expectVal(q, 360 / (180 - n));
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
};

CHECKS['g2-circle-angles'] = (q) => {
  const [a, b] = pos(q.stem) as [number, number];
  if (has(q, /ichki chizilgan burchakni|Urinma va vatar/)) expectVal(q, a / 2);
  else if (has(q, /ikki vatari/)) expectVal(q, (a + b) / 2);
  else if (has(q, /ikki kesuvchi/)) expectVal(q, (a - b) / 2);
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
};

CHECKS['g2-circle-in-out'] = (q) => {
  const [A, B] = pos(q.stem) as [number, number];
  const c = Math.hypot(A, B);
  const r = (A * B) / (A + B + c); // r = S / p
  const R = c / 2;
  expectVal(q, has(q, /Ichki chizilgan aylana radiusini/) ? r : has(q, /Tashqi chizilgan aylana radiusini/) ? R : r + R);
};

CHECKS['g2-chord-power'] = (q) => {
  const v = pos(q.stem);
  if (has(q, /vatari/)) expectVal(q, (v[0]! * v[1]!) / v[2]!);
  else expectVal(q, (v[0]! * v[0]!) / v[1]!);
};

CHECKS['g2-transform-point'] = (q) => {
  const m = /M?A\(?/.exec(q.stem);
  void m;
  const pt = /A\((-?\d+);\\ (-?\d+)\)/.exec(q.stem)!;
  let p: [number, number] = [Number(pt[1]), Number(pt[2])];
  const seq = /avval (.+?), so'ng (.+?) qo'llanildi/.exec(q.stem)!;
  for (const t of [seq[1]!, seq[2]!]) {
    if (/Ox o'qiga/.test(t)) p = [p[0], -p[1]];
    else if (/Oy o'qiga/.test(t)) p = [-p[0], p[1]];
    else if (/koordinata boshiga/.test(t)) p = [-p[0], -p[1]];
    else if (/ko'chirish/.test(t)) {
      const v = /\((-?\d+);\\ (-?\d+)\)/.exec(t)!;
      p = [p[0] + Number(v[1]), p[1] + Number(v[2])];
    } else if (/gomotetiya/.test(t)) {
      const k = Number(/k=(-?\d+)/.exec(t)![1]);
      p = [p[0] * k, p[1] * k];
    } else throw new Error(`almashtirish tanilmadi: ${t}`);
  }
  const [cx, cy] = tuple(q.correct);
  expect([cx! + 0, cy! + 0], `${q.id}#${q.seed}: to'g'ri variant`).toEqual([p[0] + 0, p[1] + 0]);
  for (const w of q.wrongs) {
    const [wx, wy] = tuple(w);
    expect([wx! + 0, wy! + 0], `${q.id}#${q.seed}: chalg'ituvchi ${w}`).not.toEqual([p[0] + 0, p[1] + 0]);
  }
};

CHECKS['g2-thales'] = (q) => {
  const g = (re: RegExp): number => Number(re.exec(q.stem)![1]);
  const x = g(/AD=(\d+)/);
  const y = g(/DB=(\d+)/);
  if (/AE=/.test(q.stem)) expectVal(q, (g(/AE=(\d+)/) * y) / x);
  else expectVal(q, (g(/DE=(\d+)/) * (x + y)) / x);
};

CHECKS['g2-three-perp'] = (q) => {
  const h = Number(/SO=(\d+)/.exec(q.stem)![1]);
  const d = Number(/masofa \$(\d+)\$/.exec(q.stem)![1]);
  expectVal(q, Math.hypot(h, d));
};

const coef = (s: string): number => (s === '' || s === '+' ? 1 : s === '-' ? -1 : Number(s));
CHECKS['g2-point-plane'] = (q) => {
  const pt = /M\((-?\d+);\\ (-?\d+);\\ (-?\d+)\)/.exec(q.stem)!;
  const plane = chunks(q.stem).find((c) => /x.*y.*z=/.test(c))!;
  const m = /^(-?\d*)x([+-]\d*)y([+-]\d*)z=(-?\d+)$/.exec(plane)!;
  const [a, b, c, d] = [coef(m[1]!), coef(m[2]!), coef(m[3]!), Number(m[4])];
  expectVal(q, Math.abs(a * Number(pt[1]) + b * Number(pt[2]) + c * Number(pt[3]) - d) / Math.hypot(a, b, c));
};

CHECKS['g2-line-plane-angle'] = (q) => {
  const [L, P] = pos(q.stem) as [number, number];
  const h = Math.sqrt(L * L - P * P);
  expectVal(q, has(q, /burchakning sinusini/) ? h / L : has(q, /burchakning kosinusini/) ? P / L : h / P);
};

CHECKS['g2-box-diag'] = (q) => {
  const v = pos(q.stem);
  if (has(q, /diagonalini toping/)) expectVal(q, Math.sqrt(v[0]! ** 2 + v[1]! ** 2 + v[2]! ** 2));
  else expectVal(q, Math.sqrt(v[0]! ** 2 - v[1]! ** 2 - v[2]! ** 2));
};

CHECKS['g2-prism'] = (q) => {
  const [a, b, H] = pos(q.stem) as [number, number, number];
  const c = Math.hypot(a, b);
  const base = (a * b) / 2;
  expectVal(q, has(q, /hajmini/) ? base * H : has(q, /yon sirtini/) ? (a + b + c) * H : (a + b + c) * H + 2 * base);
};

CHECKS['g2-pyramid'] = (q) => {
  const [a, h] = pos(q.stem) as [number, number];
  const l = Math.hypot(h, a / 2);
  expectVal(q, has(q, /Hajmini/) ? (a * a * h) / 3 : has(q, /Yon sirtini/) ? 0.5 * 4 * a * l : l);
};

CHECKS['g2-cylinder'] = (q) => {
  const [r, h] = pos(q.stem) as [number, number];
  expectVal(q, has(q, /Yon sirtini/) ? 2 * Math.PI * r * h : has(q, /Hajmini/) ? Math.PI * r * r * h : 2 * r * h);
};

CHECKS['g2-cone'] = (q) => {
  const [R, H] = pos(q.stem) as [number, number];
  const l = Math.hypot(R, H);
  expectVal(q, has(q, /Hajmini/) ? (Math.PI * R * R * H) / 3 : has(q, /Yon sirtini/) ? Math.PI * R * l : Math.PI * R * R + Math.PI * R * l);
};

CHECKS['g2-sphere'] = (q) => {
  if (has(q, /radiusini toping/)) {
    const V = evalTex(chunks(q.stem)[0]!);
    expectVal(q, Math.cbrt((3 * V) / (4 * Math.PI)));
  } else {
    const [r] = pos(q.stem) as [number];
    expectVal(q, has(q, /hajmini/) ? (4 / 3) * Math.PI * r ** 3 : 4 * Math.PI * r * r);
  }
};

CHECKS['g2-sphere-section'] = (q) => {
  const [R, v] = pos(q.stem) as [number, number];
  expectVal(q, has(q, /Kesim yuzini/) ? Math.PI * (R * R - v * v) : Math.sqrt(R * R - v * v));
};

CHECKS['g2-euler'] = (q) => {
  const v = pos(q.stem);
  if (has(q, /Qirralari sonini/)) expectVal(q, v[0]! + v[1]! - 2);
  else if (has(q, /Uchlari sonini toping/) && has(q, /qirrasi va/)) expectVal(q, 2 - v[1]! + v[0]!);
  else if (has(q, /prizmaning qirralari/)) expectVal(q, 2 * v[0]! + v[0]!);
  else if (has(q, /piramidaning uchlari/)) expectVal(q, v[0]! + 1);
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
};

CHECKS['g2-cube-sphere'] = (q) => {
  const [a] = pos(q.stem) as [number];
  expectVal(q, has(q, /hajmini/) ? (4 / 3) * Math.PI * (a / 2) ** 3 : 4 * Math.PI * (a / 2) ** 2);
};

CHECKS['g2-sphere-cap'] = (q) => {
  const [R, h] = pos(q.stem) as [number, number];
  if (has(q, /hajmini/)) {
    // sferik segment hajmi: sharning R-h dan R gacha qismi, sonli integral
    const n = 20000;
    const x0 = R - h;
    const dx = h / n;
    let v = 0;
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + 0.5) * dx;
      v += Math.PI * (R * R - x * x) * dx;
    }
    expect(near(evalTex(q.correct), v, 1e-7), `${q.id}#${q.seed}: ${q.correct} != ${v}`).toBe(true);
    for (const w of q.wrongs) expect(near(evalTex(w), v, 1e-7)).toBe(false);
  } else expectVal(q, Math.PI * (R * R - (R - h) ** 2));
};

CHECKS['g2-vec-plane'] = (q) => {
  if (has(q, /uzunligini/)) {
    expectVal(q, norm(vecOf(q.stem, 'a')));
    return;
  }
  const a = vecOf(q.stem, 'a');
  const b = vecOf(q.stem, 'b');
  if (has(q, /skalyar/)) expectVal(q, a[0]! * b[0]! + a[1]! * b[1]!);
  else expectVal(q, 2 * a[0]! - 3 * b[0]! + (2 * a[1]! - 3 * b[1]!));
};

CHECKS['g2-vec-param'] = (q) => {
  const a = vecOf(q.stem, 'a');
  const b = vecOf(q.stem, 'b');
  const c = b[0]!;
  if (has(q, /kollinear/)) expectVal(q, (a[1]! * c) / a[0]!); // a x b = 0: a0*k - a1*c = 0
  else expectVal(q, -(a[0]! * c) / a[1]!); // a . b = 0: a0*c + a1*k = 0
};

CHECKS['g2-section-ratio'] = (q) => {
  const A = tuple(/A\(([^)]*)\)/.exec(q.stem.replace(/\$/g, ''))![0]!);
  const B = tuple(/B\(([^)]*)\)/.exec(q.stem.replace(/\$/g, ''))![0]!);
  const [m, n] = chunks(q.stem).find((c) => /^\d+:\d+$/.test(c))!.split(':').map(Number) as [number, number];
  const name = /\$([xyz])\$ koordinatasini/.exec(q.stem)![1]!;
  const i = 'xyz'.indexOf(name);
  // AC:CB = m:n => C = A + (m/(m+n)) (B - A)
  expectVal(q, A[i]! + (m / (m + n)) * (B[i]! - A[i]!));
};

CHECKS['g2-sphere-eq'] = (q) => {
  const eq = flat(chunks(q.stem)[0]!);
  const lin = (v: string): number => {
    const m = new RegExp(`([+-]\\d+)${v}(?![\\^\\d])`).exec(eq);
    return m ? Number(m[1]) : 0;
  };
  const p = lin('x');
  const qq = lin('y');
  const r = lin('z');
  const sm = /([+-]\d+)=0$/.exec(eq);
  const s = sm && !/[xyz]$/.test(eq.slice(0, eq.length - sm[0].length)) ? Number(sm[1]) : sm ? Number(sm[1]) : 0;
  const cen = [-p / 2, -qq / 2, -r / 2];
  const R2 = cen[0]! ** 2 + cen[1]! ** 2 + cen[2]! ** 2 - s;
  if (has(q, /kvadratini/)) expectVal(q, R2);
  else if (has(q, /yig'indisini/)) expectVal(q, cen[0]! + cen[1]! + cen[2]!);
  else expectVal(q, Math.sqrt(R2));
};

CHECKS['g2-space-vec'] = (q) => {
  const a = vecOf(q.stem, 'a');
  const b = vecOf(q.stem, 'b');
  if (has(q, /kosinusini/)) expectVal(q, (a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!) / (norm(a) * norm(b)));
  else expectVal(q, -(a[0]! * b[0]! + a[1]! * b[1]!) / a[2]!);
};

describe("qo'shimcha shablonlar: geometriya 2 (7.2-7.5) (mustaqil matematik tekshiruv)", () => {
  it('har shablon uchun tekshiruv bor', () => {
    expect(GEOMETRY2_TEMPLATES.map((t) => t.id).filter((id) => !CHECKS[id])).toEqual([]);
    expect(Object.keys(CHECKS).filter((id) => !TPL.has(id))).toEqual([]);
  });

  for (const t of GEOMETRY2_TEMPLATES) {
    it(`${t.id} (mavzu ${t.topic}, ${t.type}/${t.difficulty})`, () => {
      for (const seed of SEEDS) CHECKS[t.id]!(load(t.id, seed));
    });
  }

  it('umumiy sifat (KaTeX, 4 til, import sxemasi)', () => {
    expect(GEOMETRY2_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS)).slice(0, 10)).toEqual([]);
  });
});
