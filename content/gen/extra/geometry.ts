// 7-bo'lim (Geometriya) uchun qo'shimcha (mashq zaxirasi) shablonlari. Shartnoma: content/gen/extra/types.ts
//
// Rasmiy spetsifikatsiya (2023) 7-bo'lim: 7.1 shakl o'lchovlari, 7.3 fazoda to'g'ri chiziq va tekislik, 7.4 fazoviy jismlar,
// 7.5 koordinatalar va vektorlar. Mavzular: 73, 78, 84 (7.1), 83, 84, 114, 115 (7.3), 85-92, 116, 117 (7.4), 81, 93, 118-120 (7.5).
// Uslub rasmiy namunaviy testga (static.oliygoh.uz/uploads/4/matem.pdf) o'xshash: qisqa shart, A-D variantlar (tipik xatolar),
// ochiq topshiriqlarda a/b bandlar va son javob. Namunadagi savol matni va sonlari KO'CHIRILMAGAN: hammasi original.
// `// ekspert: ...` izohlari mutaxassis tekshiradigan joylar; `// kaa: tekshirilsin` qoraqalpoq atamalari uchun.
//
// Har shablon `build(seed)` orqali {spec, facts} beradi: `facts` ichida xom parametrlar (koordinatalar, o'lchamlar);
// tests/content/extra-geometry-math.test.ts javobni shu parametrlardan MUSTAQIL usul bilan qayta hisoblaydi.
import { fAdd, fMul, frac, keyForms, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng, type Y1Built } from '../helpers';
import { Svg, boxPoly, drawPoly, ACCENT, SOFT, type P2, type V3 } from '../svg3d';
import { QUADS, TRIPLES, figureOf, qMath, qNum, texPt, type Qty } from '../stereo-lib';
import type { Lang, Level, QuestionSpec } from '../types';
import type { ExtraTemplate } from './types';

// ============================ Umumiy qurilma ============================

type Facts = Record<string, unknown>;
interface Inst {
  spec: QuestionSpec;
  facts: Facts;
}
interface Def {
  id: string;
  topic: number;
  type: 'y1' | 'o';
  difficulty: Level;
  build: (seed: number) => Inst;
}

const DEFS: Def[] = [];
const def = (id: string, topic: number, type: 'y1' | 'o', difficulty: Level, build: (seed: number, rng: Rng) => Inst): void => {
  DEFS.push({ id, topic, type, difficulty, build: (seed) => build(seed, makeRng(`gx|${id}|${seed}`)) });
};

const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });
const J = (...p: string[]): string => p.join('\n\n');

/** Tillar bo'yicha bir xil shakldagi ikki qismli yechim: "a) ... b) ..." (rus tilida kirill harflari) */
const AB = (a: L10n, b: L10n): L10n => ({
  uz: `a) ${a.uz}\n\nb) ${b.uz}`,
  ru: `а) ${a.ru}\n\nб) ${b.ru}`,
  kaa: `a) ${a.kaa}\n\nb) ${b.kaa}`,
  en: `a) ${a.en}\n\nb) ${b.en}`,
});

/** Kichik havzadan seed bo'yicha (turli seed = turli element, havza tugamaguncha takrorsiz). */
const shufCache = new Map<string, unknown[]>();
function pickSeed<T>(key: string, pool: readonly T[], seed: number): T {
  if (pool.length === 0) throw new Error(`bo'sh havza: ${key}`);
  let sh = shufCache.get(key) as T[] | undefined;
  if (!sh) {
    sh = makeRng(`gxp|${key}`).shuffle(pool);
    shufCache.set(key, sh);
  }
  return sh[seed % sh.length]!;
}

function lazy<T>(f: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= f());
}

/** Tasodifiy parametr, shart bajarilmaguncha qayta tanlanadi */
function sample<T>(gen: () => T, ok: (t: T) => boolean = () => true, tries = 2000): T {
  for (let i = 0; i < tries; i++) {
    const t = gen();
    if (ok(t)) return t;
  }
  throw new Error("mos parametr topilmadi");
}

const EST: Record<Level, number> = { L1: 75, L2: 130, L3: 210 };
const EST_O = 360;

type FigFn = (lang: Lang) => { svg: string; alt: string };
type YOpts = { options: Record<'A' | 'B' | 'C' | 'D', string> | Record<'A' | 'B' | 'C' | 'D', L10n>; correct: 'A' | 'B' | 'C' | 'D' };

function y1(topic: number, difficulty: Level, b: Y1Built | YOpts, stem: L10n, sol: L10n, mist: L10n, fig?: FigFn): QuestionSpec {
  const letters = ['A', 'B', 'C', 'D'] as const;
  return {
    topic,
    difficulty,
    estSeconds: EST[difficulty],
    key: { correct: b.correct },
    content: (lang) => ({
      stem_md: stem[lang],
      solution_md: sol[lang],
      mistake_note_md: mist[lang],
      payload: {
        options: Object.fromEntries(letters.map((l) => [l, typeof b.options[l] === 'string' ? b.options[l] : (b.options[l] as L10n)[lang]])),
        ...(fig ? { figure: fig(lang) } : {}),
      },
    }),
  };
}

const HINT = L(
  "Javobni butun son yoki oddiy kasr (masalan 7/3) ko'rinishida yozing.",
  'Запишите ответ целым числом или обыкновенной дробью (например 7/3).',
  'Juwaptı pútin san yamasa ápiwayı bólshek (mısalı 7/3) kórinisinde jazıń.', // kaa: tekshirilsin
  'Write the answer as an integer or a common fraction (for example 7/3).',
);

interface Part {
  p: L10n;
  k: string[];
}
function open(topic: number, difficulty: Level, a: Part, b: Part, stem: L10n, sol: L10n, mist: L10n, fig?: FigFn): QuestionSpec {
  return {
    topic,
    difficulty,
    estSeconds: EST_O,
    key: { a: a.k, b: b.k },
    content: (lang) => ({
      stem_md: stem[lang],
      solution_md: sol[lang],
      mistake_note_md: mist[lang],
      payload: {
        parts: { a: { prompt_md: a.p[lang], hint: HINT[lang] }, b: { prompt_md: b.p[lang], hint: HINT[lang] } },
        ...(fig ? { figure: fig(lang) } : {}),
      },
    }),
  };
}

/** Variantlar: to'g'ri javob + tipik xatolar (tasodifiy tartibda) + zaxira (yetmasa); matn jihatidan noyob */
function opts<T>(correct: T, wrong: readonly T[], extra: readonly T[], fmt: (t: T) => string, rng: Rng, valid: (t: T) => boolean = () => true): Y1Built {
  const seen = new Set([fmt(correct)]);
  const out: string[] = [];
  for (const t of [...rng.shuffle(wrong), ...extra]) {
    if (!valid(t)) continue;
    const s = fmt(t);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return y1Options(fmt(correct), out, rng);
}

/** Matnli variantlar (4 ta, tillarga tarjima qilinadi): to'g'ri indeks va tasodifiy tartib */
function wordOpts(items: readonly L10n[], right: number, rng: Rng): YOpts {
  const order = rng.shuffle(items.map((_, i) => i));
  const letters = ['A', 'B', 'C', 'D'] as const;
  const options = {} as Record<'A' | 'B' | 'C' | 'D', L10n>;
  let correct: 'A' | 'B' | 'C' | 'D' = 'A';
  order.forEach((idx, i) => {
    options[letters[i]!] = items[idx]!;
    if (idx === right) correct = letters[i]!;
  });
  return { options, correct };
}

// --- Formatlash ---
const M = (s: string | number): string => `$${s}$`;
const fmtInt = (n: number): string => `$${n}$`;
const fmtFrac = (f: Frac): string => `$${texFrac(f)}$`;
const fmtDeg = (n: number): string => `$${n}^\\circ$`;
const fmtQty = (x: Qty): string => qMath(x);
const vecTex = (v: readonly number[]): string => `(${v.join(';\\,')})`;
const fmtPt = (v: readonly number[]): string => `$${vecTex(v)}$`;
const fr = (n: number, d = 1): string => texFrac(frac(n, d));
const nearInt = (c: number): number[] => [c + 1, c - 1, c + 2, c - 2, c + 3, c - 3, c * 2, c + 5];
const nearFrac = (c: Frac): Frac[] => [fMul(c, frac(2)), fMul(c, frac(1, 2)), fMul(c, frac(3)), fMul(c, frac(1, 3)), fAdd(c, frac(1)), fMul(c, frac(3, 2)), fMul(c, frac(2, 3))];
const nearQty = (x: Qty): Qty[] => [2, 1 / 2, 3, 1 / 3, 3 / 2, 2 / 3, 4].map((k) => ({ ...x, c: fMul(x.c, frac(Math.round(k * 6), 6)) }));
const qty = (c: Frac | number, o: { pi?: boolean; sq?: number } = {}): Qty => ({ c: typeof c === 'number' ? frac(c) : c, ...o });
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
const isSq = (n: number): boolean => n >= 0 && Math.round(Math.sqrt(n)) ** 2 === n;
const isq = (n: number): number => Math.round(Math.sqrt(n));

const sub = (a: readonly number[], b: readonly number[]): number[] => a.map((x, i) => x - b[i]!);
const addv = (a: readonly number[], b: readonly number[]): number[] => a.map((x, i) => x + b[i]!);
const scl = (a: readonly number[], k: number): number[] => a.map((x) => x * k);
const dotv = (a: readonly number[], b: readonly number[]): number => a.reduce((s, x, i) => s + x * b[i]!, 0);
const cross = (a: readonly number[], b: readonly number[]): number[] => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];

/** "$A(1;\,2;\,3)$" uchun: nom + koordinatalar */
const P = (name: string, v: readonly number[]): string => texPt(name, v);

// ============================ 7.1 Shakl o'lchovlari ============================

/** Sektor chizmasi (markaz O, radius r, burchak al gradus) */
function sectorFig(r: number, al: number): FigFn {
  const svg = new Svg(240, 200);
  const c: P2 = [90, 110];
  const R = 80;
  const rad = (al * Math.PI) / 180;
  const e: P2 = [c[0] + R * Math.cos(rad), c[1] - R * Math.sin(rad)];
  svg.path(`M ${c[0]} ${c[1]} L ${c[0] + R} ${c[1]} A ${R} ${R} 0 ${al > 180 ? 1 : 0} 0 ${Math.round(e[0] * 10) / 10} ${Math.round(e[1] * 10) / 10} Z`, { fill: SOFT, opacity: 0.6, color: ACCENT, width: 2 });
  svg.dot(c);
  svg.text([c[0] - 10, c[1] + 12], 'O', { size: 12, bold: true });
  svg.text([c[0] + R / 2, c[1] + 14], String(r), { size: 12, color: ACCENT, bold: true });
  svg.text([c[0] + 26, c[1] - 12], `${al}°`, { size: 12, bold: true });
  return figureOf(svg, L(`Radiusi ${r}, markaziy burchagi ${al}° bo'lgan sektor.`, `Сектор радиуса ${r} с центральным углом ${al}°.`, `Radiusı ${r}, orayılıq múyeshi ${al}° bolǵan sektor.`, `A sector of radius ${r} and central angle ${al}°.`));
}

// 78 (L1): yoy uzunligi yoki sektor yuzi, natija pi ning ulushi
const ARC_POOL = lazy(() => {
  const out: { r: number; al: number; kind: 'arc' | 'area' }[] = [];
  for (let r = 2; r <= 15; r++) for (const al of [30, 45, 60, 90, 120, 135, 150, 180, 240, 270, 300]) for (const kind of ['arc', 'area'] as const) out.push({ r, al, kind });
  return out;
});
def('g71-arc', 78, 'y1', 'L1', (seed, rng) => {
  const { r, al, kind } = pickSeed('g71-arc', ARC_POOL(), seed);
  const arc = qty(frac(r * al, 180), { pi: true });
  const area = qty(frac(r * r * al, 360), { pi: true });
  const correct = kind === 'arc' ? arc : area;
  const wrong =
    kind === 'arc'
      ? [qty(frac(r * al, 360), { pi: true }), area, qty(frac(r * al, 90), { pi: true }), qty(frac(2 * r, 1), { pi: true })]
      : [qty(frac(r * r * al, 180), { pi: true }), arc, qty(frac(r * r * al, 720), { pi: true }), qty(frac(r * r, 1), { pi: true })];
  const built = opts(correct, wrong, nearQty(correct), fmtQty, rng, (x) => qNum(x) > 0);
  const stem =
    kind === 'arc'
      ? L(
          `Radiusi $${r}$ ga teng aylananing markaziy burchagi $${al}^\\circ$ bo'lgan yoyining uzunligini toping.`,
          `Найдите длину дуги окружности радиуса $${r}$, центральный угол которой равен $${al}^\\circ$.`,
          `Radiusı $${r}$ ǵa teń sheńberdiń orayılıq múyeshi $${al}^\\circ$ bolǵan doǵasınıń uzınlıǵın tabıń.`,
          `Find the length of the arc of a circle of radius $${r}$ whose central angle is $${al}^\\circ$.`,
        )
      : L(
          `Radiusi $${r}$ ga teng doiraning markaziy burchagi $${al}^\\circ$ bo'lgan sektorining yuzini toping.`,
          `Найдите площадь сектора круга радиуса $${r}$ с центральным углом $${al}^\\circ$.`,
          `Radiusı $${r}$ ǵa teń dóńgelektiń orayılıq múyeshi $${al}^\\circ$ bolǵan sektorınıń maydanın tabıń.`,
          `Find the area of a sector of a disk of radius $${r}$ with central angle $${al}^\\circ$.`,
        );
  const sol =
    kind === 'arc'
      ? L(`$l=\\frac{\\pi r\\alpha}{180}=\\frac{\\pi\\cdot${r}\\cdot${al}}{180}=${qTexOf(arc)}$.`, `$l=\\frac{\\pi r\\alpha}{180}=\\frac{\\pi\\cdot${r}\\cdot${al}}{180}=${qTexOf(arc)}$.`, `$l=\\frac{\\pi r\\alpha}{180}=\\frac{\\pi\\cdot${r}\\cdot${al}}{180}=${qTexOf(arc)}$.`, `$l=\\frac{\\pi r\\alpha}{180}=\\frac{\\pi\\cdot${r}\\cdot${al}}{180}=${qTexOf(arc)}$.`)
      : L(`$S=\\frac{\\pi r^2\\alpha}{360}=\\frac{\\pi\\cdot${r * r}\\cdot${al}}{360}=${qTexOf(area)}$.`, `$S=\\frac{\\pi r^2\\alpha}{360}=\\frac{\\pi\\cdot${r * r}\\cdot${al}}{360}=${qTexOf(area)}$.`, `$S=\\frac{\\pi r^2\\alpha}{360}=\\frac{\\pi\\cdot${r * r}\\cdot${al}}{360}=${qTexOf(area)}$.`, `$S=\\frac{\\pi r^2\\alpha}{360}=\\frac{\\pi\\cdot${r * r}\\cdot${al}}{360}=${qTexOf(area)}$.`);
  const mist = L(
    "Yoy uzunligi $\\frac{\\pi r\\alpha}{180}$, sektor yuzi esa $\\frac{\\pi r^2\\alpha}{360}$: bu ikki formulani va 180/360 ni adashtirish.",
    'Длина дуги $\\frac{\\pi r\\alpha}{180}$, а площадь сектора $\\frac{\\pi r^2\\alpha}{360}$: путают эти формулы и числа 180/360.',
    "Doǵa uzınlıǵı $\\frac{\\pi r\\alpha}{180}$, sektor maydanı $\\frac{\\pi r^2\\alpha}{360}$: bul eki formulanı hám 180/360 di shatastırıw.", // kaa: tekshirilsin
    'The arc length is $\\frac{\\pi r\\alpha}{180}$ while the sector area is $\\frac{\\pi r^2\\alpha}{360}$: mixing up the two formulas or 180/360.',
  );
  return { spec: y1(78, 'L1', built, stem, sol, mist, sectorFig(r, al)), facts: { r, al, kind } };
});

function qTexOf(x: Qty): string {
  return qMath(x).slice(1, -1);
}

// 78 (L2, O): sektor yoyi va yuzi (pi ning karrali) -> radius va markaziy burchak
const SECTOR_O_POOL = lazy(() => {
  const out: { r: number; al: number; k: number; m: number }[] = [];
  for (let r = 2; r <= 24; r++)
    for (const al of [30, 45, 60, 90, 120, 135, 150, 180, 240, 270]) {
      const k = (r * al) / 180;
      const m = (r * r * al) / 360;
      if (Number.isInteger(k) && Number.isInteger(m)) out.push({ r, al, k, m });
    }
  return out;
});
def('g71-sector-o', 78, 'o', 'L2', (seed) => {
  const { r, al, k, m } = pickSeed('g71-sector-o', SECTOR_O_POOL(), seed);
  const stem = L(
    `Doiraviy sektor yoyining uzunligi $${k}\\pi$ ga, sektor yuzi esa $${m}\\pi$ ga teng.`,
    `Длина дуги кругового сектора равна $${k}\\pi$, а площадь сектора равна $${m}\\pi$.`,
    `Dóńgelek sektorı doǵasınıń uzınlıǵı $${k}\\pi$ ǵa, sektor maydanı $${m}\\pi$ ǵa teń.`, // kaa: tekshirilsin
    `The arc of a circular sector has length $${k}\\pi$ and the sector has area $${m}\\pi$.`,
  );
  const sol = AB(
    L(`$S=\\frac12 lr$ dan $r=\\frac{2S}{l}=\\frac{2\\cdot${m}\\pi}{${k}\\pi}=${r}$.`, `$S=\\frac12 lr$, откуда $r=\\frac{2S}{l}=\\frac{2\\cdot${m}\\pi}{${k}\\pi}=${r}$.`, `$S=\\frac12 lr$ nan $r=\\frac{2S}{l}=\\frac{2\\cdot${m}\\pi}{${k}\\pi}=${r}$.`, `From $S=\\frac12 lr$: $r=\\frac{2S}{l}=\\frac{2\\cdot${m}\\pi}{${k}\\pi}=${r}$.`),
    L(`$l=\\frac{\\pi r\\alpha}{180}$ dan $\\alpha=\\frac{180\\cdot${k}\\pi}{\\pi\\cdot${r}}=${al}$.`, `Из $l=\\frac{\\pi r\\alpha}{180}$: $\\alpha=\\frac{180\\cdot${k}\\pi}{\\pi\\cdot${r}}=${al}$.`, `$l=\\frac{\\pi r\\alpha}{180}$ nan $\\alpha=\\frac{180\\cdot${k}\\pi}{\\pi\\cdot${r}}=${al}$.`, `From $l=\\frac{\\pi r\\alpha}{180}$: $\\alpha=\\frac{180\\cdot${k}\\pi}{\\pi\\cdot${r}}=${al}$.`),
  );
  const mist = L(
    "$S=\\frac12 lr$ formulasidagi $\\frac12$ ni tushirib qoldirish (radius ikki marta katta chiqadi); burchakni radianda topib, gradusga o'tkazmaslik.",
    'Пропустить множитель $\\frac12$ в $S=\\frac12 lr$ (радиус получается вдвое больше); найти угол в радианах и не перевести в градусы.',
    "$S=\\frac12 lr$ formulasındaǵı $\\frac12$ di umıtıw (radius eki ese úlken shıǵadı); múyeshti radianda tawıp, gradusqa ótkermew.",
    'Dropping the $\\frac12$ in $S=\\frac12 lr$ (the radius comes out twice too big); finding the angle in radians and not converting to degrees.',
  );
  return {
    spec: open(
      78,
      'L2',
      { p: L('a) Sektor radiusini toping.', 'а) Найдите радиус сектора.', 'a) Sektor radiusın tabıń.', 'a) Find the radius of the sector.'), k: [String(r)] },
      { p: L("b) Sektorning markaziy burchagini (gradusda) toping.", 'б) Найдите центральный угол сектора (в градусах).', 'b) Sektordıń orayılıq múyeshin (gradusta) tabıń.', 'b) Find the central angle of the sector (in degrees).'), k: [String(al)] },
      stem,
      sol,
      mist,
    ),
    facts: { r, al, k, m },
  };
});

// 78 (L1): halqa yuzi, radiuslar bo'yicha
def('g71-ring', 78, 'y1', 'L1', (seed, rng) => {
  const { R, r } = pickSeed('g71-ring', Array.from({ length: 15 }, (_, i) => i + 3).flatMap((R) => Array.from({ length: R - 1 }, (_, r) => ({ R, r: r + 1 })).filter((x) => x.r < R && R - x.r >= 1)), seed);
  const area = qty(R * R - r * r, { pi: true });
  const built = opts(area, [qty((R - r) ** 2, { pi: true }), qty(R * R + r * r, { pi: true }), qty(2 * (R - r), { pi: true }), qty(R - r, { pi: true })], nearQty(area), fmtQty, rng, (x) => qNum(x) > 0);
  const stem = L(
    `Markazlari bir xil bo'lgan ikki aylana radiuslari $${R}$ va $${r}$ ga teng. Ular orasidagi halqaning yuzini toping.`,
    `Две концентрические окружности имеют радиусы $${R}$ и $${r}$. Найдите площадь кольца между ними.`,
    `Orayları bir bolǵan eki sheńberdiń radiusları $${R}$ hám $${r}$ ǵa teń. Olar arasındaǵı saqıyna maydanın tabıń.`, // kaa: tekshirilsin
    `Two concentric circles have radii $${R}$ and $${r}$. Find the area of the ring between them.`,
  );
  const t = `\\pi(R^2-r^2)=\\pi(${R * R}-${r * r})=${qTexOf(area)}`;
  const sol = L(`Halqa yuzi katta va kichik doira yuzlarining ayirmasi: $${t}$.`, `Площадь кольца равна разности площадей кругов: $${t}$.`, `Saqıyna maydanı úlken hám kishi dóńgelek maydanlarınıń ayırması: $${t}$.`, `The ring area is the difference of the disk areas: $${t}$.`);
  const mist = L(
    "$\\pi(R-r)^2$ deb hisoblash: radiuslar ayirmasi emas, yuzlar ayirmasi olinadi.",
    'Считать $\\pi(R-r)^2$: вычитают площади кругов, а не радиусы.',
    '$\\pi(R-r)^2$ dep esaplaw: radiuslar emes, maydanlar ayırması alınadı.',
    'Computing $\\pi(R-r)^2$: one subtracts the areas, not the radii.',
  );
  return { spec: y1(78, 'L1', built, stem, sol, mist), facts: { R, r } };
});

// 78 (L2): halqa, katta aylananing kichikka urinuvchi vatari
def('g71-ring-chord', 78, 'y1', 'L2', (seed, rng) => {
  const c = pickSeed('g71-ring-chord', Array.from({ length: 36 }, (_, i) => i + 4), seed);
  const area = qty(frac(c * c, 4), { pi: true });
  const built = opts(area, [qty(c * c, { pi: true }), qty(frac(c * c, 2), { pi: true }), qty(frac(c, 2), { pi: true }), qty(frac(c * c, 8), { pi: true })], nearQty(area), fmtQty, rng, (x) => qNum(x) > 0);
  const stem = L(
    `Markazlari bir xil bo'lgan ikki aylana halqa hosil qiladi. Katta aylananing kichik aylanaga urinuvchi vatari $${c}$ ga teng. Halqaning yuzini toping.`,
    `Две концентрические окружности образуют кольцо. Хорда большей окружности, касающаяся меньшей, равна $${c}$. Найдите площадь кольца.`,
    `Orayları bir bolǵan eki sheńber saqıyna payda etedi. Úlken sheńberdiń kishi sheńberge urınatuǵın xordası $${c}$ ǵa teń. Saqıyna maydanın tabıń.`, // kaa: tekshirilsin
    `Two concentric circles form a ring. A chord of the larger circle that touches the smaller one has length $${c}$. Find the area of the ring.`,
  );
  const sol = L(
    `Urinish nuqtasi vatarning o'rtasi: $R^2-r^2=\\left(\\frac{${c}}{2}\\right)^2$. $S=\\pi(R^2-r^2)=${qTexOf(area)}$.`,
    `Точка касания — середина хорды: $R^2-r^2=\\left(\\frac{${c}}{2}\\right)^2$. $S=\\pi(R^2-r^2)=${qTexOf(area)}$.`,
    `Urınıw noqatı xordanıń ortası: $R^2-r^2=\\left(\\frac{${c}}{2}\\right)^2$. $S=\\pi(R^2-r^2)=${qTexOf(area)}$.`,
    `The point of tangency is the midpoint of the chord: $R^2-r^2=\\left(\\frac{${c}}{2}\\right)^2$. $S=\\pi(R^2-r^2)=${qTexOf(area)}$.`,
  );
  const mist = L(
    "Vatarning to'liq uzunligini yarim vatar o'rniga olish ($\\pi c^2$): Pifagor teoremasida yarim vatar ishlatiladi.",
    'Брать всю хорду вместо половины хорды ($\\pi c^2$): в теореме Пифагора участвует половина хорды.',
    'Xordanıń tolıq uzınlıǵın yarım xorda ornına alıw ($\\pi c^2$): Pifagor teoremasında yarım xorda qollanıladı.',
    'Using the whole chord instead of half of it ($\\pi c^2$): the Pythagorean theorem involves the half-chord.',
  );
  return { spec: y1(78, 'L2', built, stem, sol, mist), facts: { c } };
});

// 73 (L1): Geron formulasi, butun yuzli uchburchaklar
const HERON_POOL = lazy(() => {
  const out: { a: number; b: number; c: number; S: number }[] = [];
  for (let a = 3; a <= 40; a++)
    for (let b = a; b <= 40; b++)
      for (let c = b; c <= 40 && c < a + b; c++) {
        const p2 = a + b + c;
        const v = p2 * (p2 - 2 * a) * (p2 - 2 * b) * (p2 - 2 * c);
        if (v > 0 && v % 16 === 0 && isSq(v / 16) && gcd(gcd(a, b), c) === 1 && !(a === b && b === c)) out.push({ a, b, c, S: isq(v / 16) });
      }
  return out;
});
def('g71-heron', 73, 'y1', 'L1', (seed, rng) => {
  const { a, b, c, S } = pickSeed('g71-heron', HERON_POOL(), seed);
  const p = (a + b + c) / 2;
  const built = opts(S, [(a * b) / 2, p, a + b + c, S * 2, Math.round((a * b * c) / (4 * p))], nearInt(S), fmtInt, rng, (n) => Number.isInteger(n) && n > 0);
  const stem = L(
    `Uchburchakning tomonlari $${a}$, $${b}$ va $${c}$ ga teng. Uning yuzini toping.`,
    `Стороны треугольника равны $${a}$, $${b}$ и $${c}$. Найдите его площадь.`,
    `Úshmúyeshliktiń tárepleri $${a}$, $${b}$ hám $${c}$ ǵa teń. Onıń maydanın tabıń.`,
    `The sides of a triangle are $${a}$, $${b}$ and $${c}$. Find its area.`,
  );
  const tex = `p=\\frac{${a}+${b}+${c}}{2}=${fr(2 * p, 2)},\\ S=\\sqrt{p(p-${a})(p-${b})(p-${c})}=${S}`;
  const sol = L(`Geron formulasi: $${tex}$.`, `Формула Герона: $${tex}$.`, `Geron formulası: $${tex}$.`, `Heron's formula: $${tex}$.`);
  const mist = L(
    'Geron formulasida yarim perimetr $p$ o\'rniga perimetrni olish yoki $p$ ni javob deb yozish.',
    'Брать в формуле Герона периметр вместо полупериметра $p$ или записать $p$ как ответ.',
    'Geron formulasında yarım perimetr $p$ ornına perimetrdi alıw yamasa $p$ di juwap dep jazıw.',
    "Using the perimeter instead of the semi-perimeter $p$ in Heron's formula, or giving $p$ as the answer.",
  );
  return { spec: y1(73, 'L1', built, stem, sol, mist), facts: { a, b, c, S } };
});

// 73 (L2): S = 1/2 ab sin(gamma)
def('g71-sinarea', 73, 'y1', 'L2', (seed, rng) => {
  const { a, b, g } = pickSeed(
    'g71-sinarea',
    Array.from({ length: 11 }, (_, i) => i + 2).flatMap((a) => Array.from({ length: 11 }, (_, i) => i + 2).map((b) => ({ a, b }))).flatMap((x) => [30, 45, 60, 120, 135, 150].map((g) => ({ ...x, g }))),
    seed,
  );
  const sinQ = (g0: number, k: Frac): Qty => (g0 === 30 || g0 === 150 ? qty(fMul(k, frac(1, 2))) : g0 === 45 || g0 === 135 ? qty(fMul(k, frac(1, 2)), { sq: 2 }) : qty(fMul(k, frac(1, 2)), { sq: 3 }));
  const k = frac(a * b, 2);
  const S = sinQ(g, k);
  const other = g === 30 || g === 150 ? 60 : g === 45 || g === 135 ? 30 : 30; // sin o'rniga cos aralashtirilganda chiqadigan qiymat
  const wrong = [sinQ(other, k), qty(frac(a * b, 1), S.sq ? { sq: S.sq } : {}), qty(fMul(k, frac(2, 1)), S.sq ? { sq: S.sq } : {}), qty(frac(a * b, 4), S.sq === 2 ? { sq: 3 } : S.sq === 3 ? { sq: 2 } : {})];
  const built = opts(S, wrong, nearQty(S), fmtQty, rng, (x) => qNum(x) > 0);
  const stem = L(
    `Uchburchakning ikki tomoni $${a}$ va $${b}$, ular orasidagi burchak $${g}^\\circ$. Uchburchakning yuzini toping.`,
    `Две стороны треугольника равны $${a}$ и $${b}$, угол между ними равен $${g}^\\circ$. Найдите площадь треугольника.`,
    `Úshmúyeshliktiń eki tárepi $${a}$ hám $${b}$, olar arasındaǵı múyesh $${g}^\\circ$. Úshmúyeshliktiń maydanın tabıń.`,
    `Two sides of a triangle are $${a}$ and $${b}$ and the angle between them is $${g}^\\circ$. Find the area of the triangle.`,
  );
  const sinTex = g === 30 || g === 150 ? '\\frac12' : g === 45 || g === 135 ? '\\frac{\\sqrt2}{2}' : '\\frac{\\sqrt3}{2}';
  const tex = `S=\\frac12 ab\\sin\\gamma=\\frac12\\cdot${a}\\cdot${b}\\cdot${sinTex}=${qTexOf(S)}`;
  const sol = L(`$\\sin${g}^\\circ=${sinTex}$ (qo'shni burchaklar sinuslari teng). $${tex}$.`, `$\\sin${g}^\\circ=${sinTex}$ (синусы смежных углов равны). $${tex}$.`, `$\\sin${g}^\\circ=${sinTex}$ (qońsılas múyeshlerdiń sinusları teń). $${tex}$.`, `$\\sin${g}^\\circ=${sinTex}$ (supplementary angles have equal sines). $${tex}$.`);
  const mist = L(
    "$\\frac12$ ni unutish yoki sinus o'rniga kosinus olish ($\\sin 30^\\circ$ va $\\sin 60^\\circ$ qiymatlarini almashtirish).",
    'Забыть $\\frac12$ или взять косинус вместо синуса (перепутать $\\sin 30^\\circ$ и $\\sin 60^\\circ$).',
    '$\\frac12$ di umıtıw yamasa sinus ornına kosinus alıw ($\\sin 30^\\circ$ hám $\\sin 60^\\circ$ mánislerin shatastırıw).',
    'Forgetting $\\frac12$ or using cosine instead of sine (swapping $\\sin 30^\\circ$ and $\\sin 60^\\circ$).',
  );
  return { spec: y1(73, 'L2', built, stem, sol, mist), facts: { a, b, g } };
});

// 73 (L3, O): uchburchak yuzi va ichki yoki tashqi chizilgan aylana radiusi
def('g71-tri-o', 73, 'o', 'L3', (seed) => {
  const { a, b, c, S } = pickSeed('g71-tri-o', HERON_POOL().filter((t) => t.a + t.b + t.c <= 72), seed);
  const wantR = seed % 2 === 1; // tashqi chizilgan: R = abc/(4S); ichki: r = S/p
  const p2 = a + b + c;
  const rad = wantR ? frac(a * b * c, 4 * S) : frac(2 * S, p2);
  const stem = L(
    `Uchburchakning tomonlari $${a}$, $${b}$ va $${c}$ ga teng.`,
    `Стороны треугольника равны $${a}$, $${b}$ и $${c}$.`,
    `Úshmúyeshliktiń tárepleri $${a}$, $${b}$ hám $${c}$ ǵa teń.`,
    `The sides of a triangle are $${a}$, $${b}$ and $${c}$.`,
  );
  const radName = wantR
    ? L("tashqi chizilgan aylananing radiusini toping.", 'найдите радиус описанной окружности.', 'sırtqı sızılǵan sheńberdiń radiusın tabıń.', 'find the radius of the circumscribed circle.')
    : L("ichki chizilgan aylananing radiusini toping.", 'найдите радиус вписанной окружности.', 'ishki sızılǵan sheńberdiń radiusın tabıń.', 'find the radius of the inscribed circle.');
  const sol = AB(
    L(`Geron: $p=${fr(p2, 2)}$, $S=\\sqrt{p(p-a)(p-b)(p-c)}=${S}$.`, `Герон: $p=${fr(p2, 2)}$, $S=\\sqrt{p(p-a)(p-b)(p-c)}=${S}$.`, `Geron: $p=${fr(p2, 2)}$, $S=\\sqrt{p(p-a)(p-b)(p-c)}=${S}$.`, `Heron: $p=${fr(p2, 2)}$, $S=\\sqrt{p(p-a)(p-b)(p-c)}=${S}$.`),
    wantR
      ? L(`$R=\\frac{abc}{4S}=\\frac{${a * b * c}}{${4 * S}}=${texFrac(rad)}$.`, `$R=\\frac{abc}{4S}=\\frac{${a * b * c}}{${4 * S}}=${texFrac(rad)}$.`, `$R=\\frac{abc}{4S}=\\frac{${a * b * c}}{${4 * S}}=${texFrac(rad)}$.`, `$R=\\frac{abc}{4S}=\\frac{${a * b * c}}{${4 * S}}=${texFrac(rad)}$.`)
      : L(`$r=\\frac{S}{p}=\\frac{${S}}{${fr(p2, 2)}}=${texFrac(rad)}$.`, `$r=\\frac{S}{p}=\\frac{${S}}{${fr(p2, 2)}}=${texFrac(rad)}$.`, `$r=\\frac{S}{p}=\\frac{${S}}{${fr(p2, 2)}}=${texFrac(rad)}$.`, `$r=\\frac{S}{p}=\\frac{${S}}{${fr(p2, 2)}}=${texFrac(rad)}$.`),
  );
  const mist = L(
    "$r=\\frac{S}{p}$ da $p$ yarim perimetr ekanini unutib, $r=\\frac{S}{a+b+c}$ yozish (javob 2 marta kichik chiqadi); $R=\\frac{abc}{4S}$ o'rniga $\\frac{abc}{S}$ olish.",
    'В $r=\\frac{S}{p}$ взять периметр вместо полупериметра (ответ вдвое меньше); в $R=\\frac{abc}{4S}$ потерять множитель 4.',
    '$r=\\frac{S}{p}$ de $p$ yarım perimetr ekenin umıtıp $r=\\frac{S}{a+b+c}$ dep jazıw (juwap 2 ese kishi shıǵadı); $R=\\frac{abc}{4S}$ ornına $\\frac{abc}{S}$ alıw.',
    'In $r=\\frac{S}{p}$ using the perimeter instead of the semi-perimeter (answer twice too small); losing the factor 4 in $R=\\frac{abc}{4S}$.',
  );
  return {
    spec: open(73, 'L3', { p: L('a) Uchburchakning yuzini toping.', 'а) Найдите площадь треугольника.', 'a) Úshmúyeshliktiń maydanın tabıń.', 'a) Find the area of the triangle.'), k: [String(S)] }, { p: L(`b) Shu uchburchakka ${radName.uz}`, `б) Для этого треугольника ${radName.ru}`, `b) Usı úshmúyeshlikke ${radName.kaa}`, `b) For this triangle ${radName.en}`), k: keyForms(rad) }, stem, sol, mist),
    facts: { a, b, c, S, wantR },
  };
});

// ===FOOTER===
export function geometryInstance(id: string, seed: number): Inst {
  const d = DEFS.find((x) => x.id === id);
  if (!d) throw new Error(`noma'lum shablon: ${id}`);
  return d.build(seed);
}

export const GEOMETRY_TEMPLATES: ExtraTemplate[] = DEFS.map((d) => ({ id: d.id, topic: d.topic, type: d.type, difficulty: d.difficulty, generate: (seed: number) => d.build(seed).spec }));
