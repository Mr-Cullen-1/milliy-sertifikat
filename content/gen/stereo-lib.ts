// Stereometriya generatorining umumiy yordamchilari: miqdorlar (pi va ildiz bilan), parametr havzalari, atamalar.
import { fMul, frac, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng, type Y1Built } from './helpers';
import type { Lang } from './types';
import type { Svg } from './svg3d';

// --- Miqdor: c * (pi?) * sqrt(sq) ---

export interface Qty {
  c: Frac;
  pi?: boolean;
  sq?: number;
}

export const q = (c: Frac | number, o: { pi?: boolean; sq?: number } = {}): Qty => ({ c: typeof c === 'number' ? frac(c) : c, ...o });

export function qNum(x: Qty): number {
  return (x.c.n / x.c.d) * (x.pi ? Math.PI : 1) * Math.sqrt(x.sq ?? 1);
}

export function qTex(x: Qty): string {
  if (x.c.n === 0) return '0';
  const sq = x.sq ?? 1;
  const sym = (x.pi ? '\\pi' : '') + (sq > 1 ? `\\sqrt{${sq}}` : '');
  if (!sym) return texFrac(x.c);
  if (x.c.d === 1) {
    if (x.c.n === 1) return sym;
    if (x.c.n === -1) return `-${sym}`;
    return `${x.c.n}${sym}`;
  }
  return `${texFrac(x.c)}${sym}`;
}

export const qMath = (x: Qty): string => `$${qTex(x)}$`;

const SCALES: Frac[] = [frac(2), frac(1, 2), frac(3), frac(1, 3), frac(3, 2), frac(2, 3), frac(4), frac(1, 4), frac(5), frac(5, 2), frac(7), frac(1, 5)];

/** Noyob (son jihatidan ham) chalg'ituvchilar ro'yxati: avval tipik xatolar, yetmasa to'g'ri javobning masshtablangani. */
export function qDistractors(correct: Qty, mistakes: readonly Qty[], rng: Rng, want = 5): Qty[] {
  const seen = [qNum(correct)];
  const out: Qty[] = [];
  const add = (x: Qty) => {
    const v = qNum(x);
    if (!(v > 1e-9) || !Number.isFinite(v)) return;
    if (seen.some((s) => Math.abs(s - v) < 1e-9 * Math.max(1, Math.abs(v)))) return;
    seen.push(v);
    out.push(x);
  };
  rng.shuffle(mistakes).forEach(add);
  for (const k of SCALES) if (out.length < want) add({ ...correct, c: fMul(correct.c, k) });
  return out;
}

export function qOptions(correct: Qty, mistakes: readonly Qty[], rng: Rng): Y1Built {
  return y1Options(qMath(correct), qDistractors(correct, mistakes, rng).map(qMath), rng);
}

/** Butun son javobli y1: chalg'ituvchilar noyob, musbat/nolga teng bo'lishi mumkin */
export function intOptions(correct: number, mistakes: readonly number[], rng: Rng): Y1Built {
  const seen = new Set<number>([correct]);
  const out: number[] = [];
  const add = (n: number) => {
    if (Number.isInteger(n) && n >= 0 && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };
  rng.shuffle(mistakes).forEach(add);
  for (const d of [1, -1, 2, -2, 3, -3, 4]) add(correct + d);
  return y1Options(String(correct), out.map(String), rng);
}

// --- Parametr havzalari ---

/** Havzani qat'iy (seed) bo'yicha aralashtirib, `round` bo'yicha tanlaydi: turli raund = turli parametrlar. */
export function pickRound<T>(pool: readonly T[], round: number, key: string): T {
  if (pool.length === 0) throw new Error(`bo'sh havza: ${key}`);
  return makeRng(`pool|${key}`).shuffle(pool)[round % pool.length]!;
}

/** Pifagor uchliklari (a < b < c) */
export const TRIPLES: readonly (readonly [number, number, number])[] = (() => {
  const out: [number, number, number][] = [];
  for (let a = 3; a <= 40; a++) {
    for (let b = a + 1; b <= 60; b++) {
      const c = Math.round(Math.sqrt(a * a + b * b));
      if (c * c === a * a + b * b && c <= 65) out.push([a, b, c]);
    }
  }
  return out;
})();

/** a^2 + b^2 + c^2 = d^2 (1 <= a <= b <= c) */
export const QUADS: readonly (readonly [number, number, number, number])[] = (() => {
  const out: [number, number, number, number][] = [];
  for (let a = 1; a <= 20; a++) {
    for (let b = a; b <= 20; b++) {
      for (let c = b; c <= 20; c++) {
        const s = a * a + b * b + c * c;
        const d = Math.round(Math.sqrt(s));
        if (d * d === s) out.push([a, b, c, d]);
      }
    }
  }
  return out;
})();

export const isSquare = (n: number): boolean => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n;
export const isqrt = (n: number): number => Math.round(Math.sqrt(n));

/** Butun koordinatali nuqta uchun TeX: A(1; -2; 3) */
export const texPt = (name: string, p: readonly number[]): string => `${name}(${p.join(';\\,')})`;

// --- Atamalar lug'ati (glossary): barcha shablonlar shu yerdan foydalanadi ---
// kaa: tekshirilsin — qoraqalpoq lotin yozuvidagi terminlarning aksariyati o'zbekchaga yaqin shaklda berilgan.

export const TERMS = {
  volume: { uz: 'hajm', ru: 'объём', kaa: 'kólem', en: 'volume' },
  lateralArea: { uz: 'yon sirt yuzi', ru: 'площадь боковой поверхности', kaa: 'jan bet maydanı', en: 'lateral surface area' }, // kaa: tekshirilsin
  totalArea: { uz: 'to\'liq sirt yuzi', ru: 'площадь полной поверхности', kaa: 'tolıq bet maydanı', en: 'total surface area' }, // kaa: tekshirilsin
  surfaceArea: { uz: 'sirt yuzi', ru: 'площадь поверхности', kaa: 'bet maydanı', en: 'surface area' }, // kaa: tekshirilsin
  base: { uz: 'asos', ru: 'основание', kaa: 'tiykar', en: 'base' },
  height: { uz: 'balandlik', ru: 'высота', kaa: 'biyiklik', en: 'height' },
  radius: { uz: 'radius', ru: 'радиус', kaa: 'radius', en: 'radius' },
  edge: { uz: 'qirra', ru: 'ребро', kaa: 'qabırǵa', en: 'edge' },
  lateralEdge: { uz: 'yon qirra', ru: 'боковое ребро', kaa: 'jan qabırǵa', en: 'lateral edge' }, // kaa: tekshirilsin
  pyramid: { uz: 'piramida', ru: 'пирамида', kaa: 'piramida', en: 'pyramid' },
  frustum: { uz: 'kesik piramida', ru: 'усечённая пирамида', kaa: 'kesik piramida', en: 'frustum of a pyramid' }, // kaa: tekshirilsin
  regQuadPyramid: { uz: 'muntazam to\'rtburchakli piramida', ru: 'правильная четырёхугольная пирамида', kaa: 'durıs tórtmúyeshli piramida', en: 'regular square pyramid' }, // kaa: tekshirilsin
  regTriPyramid: { uz: 'muntazam uchburchakli piramida', ru: 'правильная треугольная пирамида', kaa: 'durıs úshmúyeshli piramida', en: 'regular triangular pyramid' }, // kaa: tekshirilsin
  prism: { uz: 'prizma', ru: 'призма', kaa: 'prizma', en: 'prism' },
  cube: { uz: 'kub', ru: 'куб', kaa: 'kub', en: 'cube' },
  cylinder: { uz: 'silindr', ru: 'цилиндр', kaa: 'cilindr', en: 'cylinder' }, // kaa: tekshirilsin
  cone: { uz: 'konus', ru: 'конус', kaa: 'konus', en: 'cone' },
  coneFrustum: { uz: 'kesik konus', ru: 'усечённый конус', kaa: 'kesik konus', en: 'truncated cone' }, // kaa: tekshirilsin
  sphere: { uz: 'sfera', ru: 'сфера', kaa: 'sfera', en: 'sphere' },
  ball: { uz: 'shar', ru: 'шар', kaa: 'shar', en: 'ball' },
  plane: { uz: 'tekislik', ru: 'плоскость', kaa: 'tegislik', en: 'plane' },
  line: { uz: 'to\'g\'ri chiziq', ru: 'прямая', kaa: 'tuwrı sızıq', en: 'line' },
  skew: { uz: 'ayqash', ru: 'скрещивающиеся', kaa: 'ayqas', en: 'skew' }, // kaa: tekshirilsin
  parallel: { uz: 'parallel', ru: 'параллельные', kaa: 'parallel', en: 'parallel' },
  intersecting: { uz: 'kesishuvchi', ru: 'пересекающиеся', kaa: 'kesilisiwshi', en: 'intersecting' }, // kaa: tekshirilsin
  axialSection: { uz: 'o\'q kesimi', ru: 'осевое сечение', kaa: 'kósher kesimi', en: 'axial section' }, // kaa: tekshirilsin
  generatrix: { uz: 'yasovchi', ru: 'образующая', kaa: 'jasawshı', en: 'slant height' }, // kaa: tekshirilsin
  center: { uz: 'markaz', ru: 'центр', kaa: 'orayı', en: 'center' }, // kaa: tekshirilsin
  distance: { uz: 'masofa', ru: 'расстояние', kaa: 'aralıq', en: 'distance' },
  angle: { uz: 'burchak', ru: 'угол', kaa: 'múyesh', en: 'angle' },
  point: { uz: 'nuqta', ru: 'точка', kaa: 'noqat', en: 'point' }, // kaa: tekshirilsin
  vector: { uz: 'vektor', ru: 'вектор', kaa: 'vektor', en: 'vector' },
  dotProduct: { uz: 'skalyar ko\'paytma', ru: 'скалярное произведение', kaa: 'skalyar kóbeyme', en: 'dot product' }, // kaa: tekshirilsin
  chord: { uz: 'vatar', ru: 'хорда', kaa: 'xorda', en: 'chord' }, // kaa: tekshirilsin
} as const satisfies Record<string, L10n>;

export const tx = (t: L10n, lang: Lang): string => t[lang];

/** Chizma: SVG matni tillarga bog'liq emas (faqat harf va sonlar), alt matni tilga qarab. */
export const figureOf = (svg: Svg, alt: L10n) => {
  const s = svg.toString();
  return (lang: Lang) => ({ svg: s, alt: alt[lang] });
};

/** Y-2 (moslashtirish): 3 ta to'g'ri qiymat + 3 ta chalg'ituvchi = 6 variant (A-F). Qiymatlar son jihatidan noyob bo'lmasa null. */
export function y2Options(
  correct: readonly Qty[],
  mistakes: readonly Qty[],
  rng: Rng,
): { options: Record<string, string>; pairs: Record<string, string> } | null {
  const nums = correct.map(qNum);
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) if (Math.abs(nums[i]! - nums[j]!) < 1e-9) return null;
  const seen = [...nums];
  const wrong: Qty[] = [];
  const add = (x: Qty) => {
    const v = qNum(x);
    if (!Number.isFinite(v) || Math.abs(v) < 1e-9) return;
    if (seen.some((s) => Math.abs(s - v) < 1e-9 * Math.max(1, Math.abs(v)))) return;
    seen.push(v);
    wrong.push(x);
  };
  rng.shuffle(mistakes).forEach(add);
  for (const k of SCALES) {
    if (wrong.length >= 3) break;
    const base = correct[wrong.length % correct.length]!;
    add({ ...base, c: fMul(base.c, k) });
  }
  if (wrong.length < 3) return null;
  const pool = rng.shuffle([...correct.map((x, i) => ({ x, id: String(i + 1) })), ...wrong.slice(0, 3).map((x) => ({ x, id: '' }))]);
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const options: Record<string, string> = {};
  const pairs: Record<string, string> = {};
  pool.forEach((it, i) => {
    options[letters[i]!] = qMath(it.x);
    if (it.id) pairs[it.id] = letters[i]!;
  });
  return { options, pairs };
}
