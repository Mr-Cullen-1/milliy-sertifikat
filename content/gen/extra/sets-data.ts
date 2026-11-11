import { fAdd, fMul, frac, keyForms, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng } from '../helpers';
import type { Level, QuestionSpec } from '../types';
import type { ExtraTemplate } from './types';

// 5-bo'lim (To'plam, mulohaza, ma'lumotlar tahlili, kombinatorika, ehtimol, modellashtirish) uchun qo'shimcha shablonlar.
// Rasmiy mazmun elementlari: 5.1 (94, 95, 111), 5.2 (101, 102, 112), 5.3 (96, 97, 98), 5.4 (99, 100), 5.5 (103, 113). config/elements.ts.
// Har shablon: draw(rng) parametrlarni tanlaydi (rad etilsa qayta urinadi), build(p) javobni KOD bilan hisoblaydi.
// Parametrlar content() dan tashqarida bir marta hisoblanadi: tillar o'rtasida raqamlar, harflar va kalit bir xil.
// Mustaqil tekshiruv: tests/content/extra-sets-data-math.test.ts (setsDataParams orqali parametrlarni oladi).
// Jadvallar KaTeX array bilan yoziladi (Markdown jadvali: components/math/markdown.tsx da remark-gfm yo'q, shuning uchun ishlamaydi).
// kaa (qoraqalpoq lotin): hamma kaa matnlar "// kaa: tekshirilsin"; mantiq atamalari alohida shubhali (konversiya, inversiya, kontrapozitsiya, predikat, kvantor).

const T = String.raw;
const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });

class Retry extends Error {}
/** Shart bajarilmasa parametrlarni qayta tanlaydi. */
function need(ok: boolean): asserts ok {
  if (!ok) throw new Retry('qayta');
}

const M = (s: string): string => `$${s}$`;
const mi = (n: number): string => M(String(n));
const mf = (f: Frac): string => M(texFrac(f));
const nums = (xs: readonly number[], sep = ',\\ '): string => xs.join(sep);
const setTex = (xs: readonly number[]): string => (xs.length ? `\\{${xs.join(';\\ ')}\\}` : '\\varnothing');
const sortedUnique = (xs: readonly number[]): number[] => [...new Set(xs)].sort((a, b) => a - b);
const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const choose = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
const isqrtExact = (n: number): number | null => {
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
};

/** O'nli kasr (vergul bilan) yoki oddiy kasr: 15/2 -> 7{,}5; 1/3 -> \frac{1}{3} */
function texDec(f: Frac): string {
  if (f.d === 1) return String(f.n);
  let d = f.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  if (d !== 1) return texFrac(f);
  return String(f.n / f.d).replace('.', '{,}');
}
const md = (f: Frac): string => M(texDec(f));

// --- Chalg'ituvchi variantlar ---

interface WrongOpts {
  min?: number;
  max?: number;
  fmt?: (n: number) => string;
}
/** Butun javob uchun: avval tipik xatolar, yetmasa +-1, +-2 ... qadamlar. */
function intWrong(correct: number, mistakes: readonly number[], o: WrongOpts = {}): string[] {
  const fmt = o.fmt ?? mi;
  const out: string[] = [];
  const seen = new Set<number>([correct]);
  const push = (n: number) => {
    if (Number.isInteger(n) && n >= (o.min ?? 0) && n <= (o.max ?? Infinity) && !seen.has(n)) {
      seen.add(n);
      out.push(fmt(n));
    }
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 60; k++) {
    push(correct + k);
    push(correct - k);
  }
  return out;
}

/** Kasr javob uchun (odatda 0..1 oralig'ida): tipik xatolar, keyin qo'shni kasrlar. */
function fracWrong(correct: Frac, mistakes: readonly Frac[], o: { lo?: number; hi?: number; fmt?: (f: Frac) => string } = {}): string[] {
  const fmt = o.fmt ?? mf;
  const lo = o.lo ?? 0;
  const hi = o.hi ?? 1;
  const out: string[] = [];
  const seen = new Set<string>([`${correct.n}/${correct.d}`]);
  const push = (f: Frac) => {
    if (!Number.isFinite(f.n) || !Number.isFinite(f.d) || f.d <= 0) return;
    const v = f.n / f.d;
    const key = `${f.n}/${f.d}`;
    if (v < lo || v > hi || seen.has(key)) return;
    seen.add(key);
    out.push(fmt(f));
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 30; k++) {
    push(frac(correct.n + k, correct.d));
    push(frac(correct.n - k, correct.d));
    push(frac(correct.n, correct.d + k));
    push(frac(correct.n, correct.d - k));
  }
  return out;
}

// --- Shablon qurilishi ---

interface Y1Out {
  stem: L10n;
  correct: string;
  wrong: readonly string[];
  sol: L10n;
  mis: L10n;
}
interface OPart {
  prompt: L10n;
  key: Frac;
  /** javob kasr bo'lishi mumkin: ko'rsatma qo'shiladi */
  hint?: boolean;
}
interface OOut {
  stem: L10n;
  a: OPart;
  b: OPart;
  sol: L10n;
  mis: L10n;
}

const ALL: ExtraTemplate[] = [];
const PARAMS = new Map<string, (seed: number) => unknown>();

/** Testlar uchun: shablonning shu seeddagi (qabul qilingan) parametrlari. */
export function setsDataParams(id: string, seed: number): unknown {
  const f = PARAMS.get(id);
  if (!f) throw new Error(`shablon yo'q: ${id}`);
  return f(seed);
}

/** Rad etilgan parametrlar uchun qayta urinish (deterministik: har urinish o'z rng i bilan). */
function attempt<R>(id: string, seed: number, fn: (base: string) => R): R {
  let last: unknown;
  for (let i = 0; i < 400; i++) {
    try {
      return fn(`${id}|${seed}|${i}`);
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error(`${id}#${seed}: parametr topilmadi`);
}

const HINT_FRAC = L(
  "Javobni butun son, oddiy kasr (masalan 3/4) yoki o'nli kasr (masalan 0.75) ko'rinishida yozing.",
  'Запишите ответ целым числом, обыкновенной дробью (например, 3/4) или десятичной дробью (например, 0.75).',
  'Juwaptı pútin san, ápiwayı bólshek (mısalı 3/4) yamasa onlıq bólshek (mısalı 0.75) kórinisinde jazıń.', // kaa: tekshirilsin
  'Write the answer as an integer, a common fraction (e.g. 3/4) or a decimal (e.g. 0.75).',
);

function y1T<P>(id: string, topic: number, difficulty: Level, est: number, draw: (r: Rng) => P, build: (p: P, r: Rng) => Y1Out): ExtraTemplate {
  const run = (seed: number) =>
    attempt(id, seed, (base) => {
      const p = draw(makeRng(base));
      const out = build(p, makeRng(`${base}|b`));
      return { p, out, built: y1Options(out.correct, out.wrong, makeRng(`${base}|o`)) };
    });
  PARAMS.set(id, (seed) => run(seed).p);
  const tpl: ExtraTemplate = {
    id,
    topic,
    type: 'y1',
    difficulty,
    generate(seed): QuestionSpec {
      const { out, built } = run(seed);
      return {
        topic,
        difficulty,
        estSeconds: est,
        key: { correct: built.correct },
        content: (lang) => ({ stem_md: out.stem[lang], payload: { options: built.options }, solution_md: out.sol[lang], mistake_note_md: out.mis[lang] }),
      };
    },
  };
  ALL.push(tpl);
  return tpl;
}

function oT<P>(id: string, topic: number, difficulty: Level, est: number, draw: (r: Rng) => P, build: (p: P, r: Rng) => OOut): ExtraTemplate {
  const run = (seed: number) =>
    attempt(id, seed, (base) => {
      const p = draw(makeRng(base));
      return { p, out: build(p, makeRng(`${base}|b`)) };
    });
  PARAMS.set(id, (seed) => run(seed).p);
  const tpl: ExtraTemplate = {
    id,
    topic,
    type: 'o',
    difficulty,
    generate(seed): QuestionSpec {
      const { out } = run(seed);
      return {
        topic,
        difficulty,
        estSeconds: est,
        key: { a: keyForms(out.a.key), b: keyForms(out.b.key) },
        content: (lang) => ({
          stem_md: out.stem[lang],
          payload: {
            parts: {
              a: out.a.hint ? { prompt_md: out.a.prompt[lang], hint: HINT_FRAC[lang] } : { prompt_md: out.a.prompt[lang] },
              b: out.b.hint ? { prompt_md: out.b.prompt[lang], hint: HINT_FRAC[lang] } : { prompt_md: out.b.prompt[lang] },
            },
          },
          solution_md: out.sol[lang],
          mistake_note_md: out.mis[lang],
        }),
      };
    },
  };
  ALL.push(tpl);
  return tpl;
}

// =====================================================================================================
// 5.1 To'plam, mulohaza va mantiq (mavzular 94, 95, 111)
// =====================================================================================================

// --- 94: butun sonli oraliqlar (L1) ---
interface IntervalP {
  a1: number;
  a2: number;
  b1: number;
  b2: number;
  op: 'cap' | 'cup' | 'AB' | 'BA';
}
const OP_TEX = { cap: 'A\\cap B', cup: 'A\\cup B', AB: 'A\\setminus B', BA: 'B\\setminus A' } as const;
y1T<IntervalP>(
  'sd-set-interval',
  94,
  'L1',
  90,
  (r) => {
    const a1 = r.int(-9, 3);
    const a2 = a1 + r.int(4, 9);
    const b1 = r.int(a1 + 1, a2);
    const b2 = a2 + r.int(2, 7);
    const swap = r.chance(0.5);
    const [x1, x2, y1, y2] = swap ? [b1, b2, a1, a2] : [a1, a2, b1, b2];
    return { a1: x1, a2: x2, b1: y1, b2: y2, op: r.pick(['cap', 'cup', 'AB', 'BA'] as const) };
  },
  (p) => {
    const A = new Set(range(p.a1, p.a2));
    const B = new Set(range(p.b1, p.b2));
    const inter = [...A].filter((x) => B.has(x));
    need(inter.length >= 1);
    const nA = A.size;
    const nB = B.size;
    const nI = inter.length;
    const ans = p.op === 'cap' ? nI : p.op === 'cup' ? nA + nB - nI : p.op === 'AB' ? nA - nI : nB - nI;
    const wrong =
      p.op === 'cap'
        ? [nI - 1, nI + 1, nA + nB, Math.min(nA, nB)]
        : p.op === 'cup'
          ? [nA + nB, nA + nB - nI + 1, nA + nB - nI - 1, nA + nB - nI + 2]
          : p.op === 'AB'
            ? [nA - nI + 1, nA - nI - 1, nA, nB - nI]
            : [nB - nI + 1, nB - nI - 1, nB, nA - nI];
    const calc =
      p.op === 'cap'
        ? T`|A\cap B|=${Math.max(p.a1, p.b1) === p.b1 ? `${p.a2}` : `${p.b2}`}`
        : '';
    void calc;
    const lo = Math.max(p.a1, p.b1);
    const hi = Math.min(p.a2, p.b2);
    const formula =
      p.op === 'cap'
        ? T`|A\cap B|=${hi}-${lo < 0 ? `(${lo})` : lo}+1=${nI}`
        : p.op === 'cup'
          ? T`|A\cup B|=${nA}+${nB}-${nI}=${ans}`
          : p.op === 'AB'
            ? T`|A\setminus B|=${nA}-${nI}=${ans}`
            : T`|B\setminus A|=${nB}-${nI}=${ans}`;
    const setsTex = T`A=\{x\mid ${p.a1}\le x\le ${p.a2},\ x\in\mathbb{Z}\}`;
    const setsTexB = T`B=\{x\mid ${p.b1}\le x\le ${p.b2},\ x\in\mathbb{Z}\}`;
    return {
      stem: L(
        T`$${setsTex}$ va $${setsTexB}$ to'plamlar berilgan. $${OP_TEX[p.op]}$ to'plamning elementlari sonini toping.`,
        T`Заданы множества $${setsTex}$ и $${setsTexB}$. Найдите число элементов множества $${OP_TEX[p.op]}$.`,
        T`$${setsTex}$ hám $${setsTexB}$ úyirmeleri berilgen. $${OP_TEX[p.op]}$ úyirmesiniń elementleri sanın tabıń.`, // kaa: tekshirilsin
        T`Sets $${setsTex}$ and $${setsTexB}$ are given. Find the number of elements of $${OP_TEX[p.op]}$.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`$|A|=${p.a2}-${p.a1 < 0 ? `(${p.a1})` : p.a1}+1=${nA}$, $|B|=${nB}$; umumiy elementlar: $${lo},\ldots,${hi}$. $${formula}$.`,
        T`$|A|=${p.a2}-${p.a1 < 0 ? `(${p.a1})` : p.a1}+1=${nA}$, $|B|=${nB}$; общие элементы: $${lo},\ldots,${hi}$. $${formula}$.`,
        T`$|A|=${p.a2}-${p.a1 < 0 ? `(${p.a1})` : p.a1}+1=${nA}$, $|B|=${nB}$; ulıwma elementler: $${lo},\ldots,${hi}$. $${formula}$.`,
        T`$|A|=${p.a2}-${p.a1 < 0 ? `(${p.a1})` : p.a1}+1=${nA}$, $|B|=${nB}$; common elements: $${lo},\ldots,${hi}$. $${formula}$.`,
      ),
      mis: L(
        "Oraliqdagi butun sonlar soni $b-a+1$ (chegaralar ham kiradi): $b-a$ deb olish yoki umumiy elementlarni ikki marta sanash xatosi.",
        'Число целых чисел отрезка равно $b-a+1$ (концы входят); частая ошибка — взять $b-a$ или посчитать общие элементы дважды.',
        'Aralıqtaǵı pútin sanlar sanı $b-a+1$ (shegaralar da kiredi): $b-a$ dep alıw yamasa ulıwma elementlerdi eki ret sanaw qatesi.',
        'The number of integers in a range is $b-a+1$ (both ends included); typical errors are using $b-a$ or counting common elements twice.',
      ),
    };
  },
);

// --- 94: universal to'plam va to'ldiruvchi (L2) ---
interface UniverseP {
  u: number;
  a1: number;
  a2: number;
  b1: number;
  b2: number;
  op: 'compCap' | 'compCup' | 'AcB' | 'AcupBc';
}
const UOP_TEX = { compCap: String.raw`\overline{A\cap B}`, compCup: String.raw`\overline{A\cup B}`, AcB: String.raw`\overline{A}\cap B`, AcupBc: String.raw`A\cup\overline{B}` } as const;
y1T<UniverseP>(
  'sd-set-universe',
  94,
  'L2',
  120,
  (r) => {
    const u = r.int(6, 12);
    const a1 = r.int(-u, 0);
    const a2 = r.int(a1 + 2, u - 1);
    const b1 = r.int(-u + 1, a2);
    const b2 = r.int(Math.max(b1 + 2, a2 + 1), u);
    return { u, a1, a2, b1, b2, op: r.pick(['compCap', 'compCup', 'AcB', 'AcupBc'] as const) };
  },
  (p) => {
    const U = range(-p.u, p.u);
    const inA = (x: number) => x >= p.a1 && x <= p.a2;
    const inB = (x: number) => x >= p.b1 && x <= p.b2;
    const test = (x: number) => (p.op === 'compCap' ? !(inA(x) && inB(x)) : p.op === 'compCup' ? !(inA(x) || inB(x)) : p.op === 'AcB' ? !inA(x) && inB(x) : inA(x) || !inB(x));
    const ans = U.filter(test).length;
    const nU = U.length;
    const nA = U.filter(inA).length;
    const nB = U.filter(inB).length;
    const nI = U.filter((x) => inA(x) && inB(x)).length;
    const nUn = nA + nB - nI;
    need(nI >= 1 && nUn < nU);
    const wrong =
      p.op === 'compCap'
        ? [nU - nUn, nU - nI - 1, nU - nI + 1, nI]
        : p.op === 'compCup'
          ? [nU - nI, nU - nUn + 1, nU - nUn - 1, nUn]
          : p.op === 'AcB'
            ? [nB, nU - nA, nB - nI + 1, nB - nI - 1]
            : [nA, nU - nB, nU - nB + nA, nU - nB + nI];
    const calc =
      p.op === 'compCap'
        ? T`|\overline{A\cap B}|=${nU}-${nI}=${ans}`
        : p.op === 'compCup'
          ? T`|\overline{A\cup B}|=${nU}-(${nA}+${nB}-${nI})=${ans}`
          : p.op === 'AcB'
            ? T`|\overline{A}\cap B|=|B|-|A\cap B|=${nB}-${nI}=${ans}`
            : T`|A\cup\overline{B}|=|A|+|\overline{B}|-|A\cap\overline{B}|=${nA}+${nU - nB}-${nA - nI}=${ans}`;
    const defs = T`U=\{x\mid -${p.u}\le x\le ${p.u},\ x\in\mathbb{Z}\}`;
    const defA = T`A=\{x\mid ${p.a1}\le x\le ${p.a2},\ x\in\mathbb{Z}\}`;
    const defB = T`B=\{x\mid ${p.b1}\le x\le ${p.b2},\ x\in\mathbb{Z}\}`;
    return {
      stem: L(
        T`$${defs}$ universal to'plam va uning $${defA}$, $${defB}$ qism to'plamlari berilgan. $${UOP_TEX[p.op]}$ to'plamning elementlari sonini toping. Bunda $\overline{X}$ — $X$ to'plamning to'ldiruvchisi.`,
        T`Заданы универсальное множество $${defs}$ и его подмножества $${defA}$, $${defB}$. Найдите число элементов множества $${UOP_TEX[p.op]}$. Здесь $\overline{X}$ — дополнение множества $X$.`,
        T`$${defs}$ universal úyirme hám onıń $${defA}$, $${defB}$ ishki úyirmeleri berilgen. $${UOP_TEX[p.op]}$ úyirmesiniń elementleri sanın tabıń. Bunda $\overline{X}$ — $X$ úyirmesiniń toltırıwshısı.`, // kaa: tekshirilsin
        T`A universal set $${defs}$ and its subsets $${defA}$, $${defB}$ are given. Find the number of elements of $${UOP_TEX[p.op]}$. Here $\overline{X}$ is the complement of $X$.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`$|U|=${nU}$, $|A|=${nA}$, $|B|=${nB}$, $|A\cap B|=${nI}$. $${calc}$.`,
        T`$|U|=${nU}$, $|A|=${nA}$, $|B|=${nB}$, $|A\cap B|=${nI}$. $${calc}$.`,
        T`$|U|=${nU}$, $|A|=${nA}$, $|B|=${nB}$, $|A\cap B|=${nI}$. $${calc}$.`,
        T`$|U|=${nU}$, $|A|=${nA}$, $|B|=${nB}$, $|A\cap B|=${nI}$. $${calc}$.`,
      ),
      mis: L(
        "To'ldiruvchini ($U$ dan ayirish) to'ldirmasdan, to'plamning o'zini sanash; $U$ da $0$ ham borligini unutish (manfiy va musbat sonlar soni teng emas).",
        'Считать само множество вместо его дополнения; забыть, что $0$ тоже принадлежит $U$.',
        'Toltırıwshını ($U$ dan ayırıw) esaplamay, úyirmeniń ózin sanaw; $U$ da $0$ de barlıǵın umıtıw.',
        'Counting the set itself instead of its complement, or forgetting that $0$ belongs to $U$.',
      ),
    };
  },
);

// --- 94: ikki to'plam, Eyler-Venn (L1) ---
const CLUBS: { uz: string; ru: string; kaa: string; en: string }[] = [
  { uz: 'shaxmat', ru: 'шахматы', kaa: 'shaxmat', en: 'chess' },
  { uz: 'shashka', ru: 'шашки', kaa: 'shashka', en: 'draughts' },
  { uz: 'futbol', ru: 'футбол', kaa: 'futbol', en: 'football' },
  { uz: 'voleybol', ru: 'волейбол', kaa: 'voleybol', en: 'volleyball' },
  { uz: 'rasm', ru: 'рисование', kaa: 'súwret', en: 'art' },
  { uz: 'musiqa', ru: 'музыка', kaa: 'muzıka', en: 'music' },
  { uz: 'dasturlash', ru: 'программирование', kaa: 'dástúrlew', en: 'programming' },
  { uz: 'robototexnika', ru: 'робототехника', kaa: 'robototexnika', en: 'robotics' },
];
interface Venn2P {
  c1: number;
  c2: number;
  n: number;
  x: number;
  y: number;
  both: number;
  ask: 'none' | 'both' | 'onlyA';
}
y1T<Venn2P>(
  'sd-venn-two',
  94,
  'L1',
  90,
  (r) => {
    const c1 = r.int(0, CLUBS.length - 1);
    let c2 = r.int(0, CLUBS.length - 1);
    if (c2 === c1) c2 = (c2 + 1) % CLUBS.length;
    const onlyA = r.int(3, 14);
    const onlyB = r.int(3, 14);
    const both = r.int(2, 9);
    const none = r.int(1, 8);
    return { c1, c2, n: onlyA + onlyB + both + none, x: onlyA + both, y: onlyB + both, both, ask: r.pick(['none', 'both', 'onlyA'] as const) };
  },
  (p) => {
    const a = CLUBS[p.c1]!;
    const b = CLUBS[p.c2]!;
    const union = p.x + p.y - p.both;
    const none = p.n - union;
    const ans = p.ask === 'none' ? none : p.ask === 'both' ? p.both : p.x - p.both;
    need(none >= 1 && p.x - p.both >= 1);
    const wrong =
      p.ask === 'none'
        ? [p.n - p.x - p.y, p.n - p.x - p.y + 2 * p.both, p.n - union + p.both, union]
        : p.ask === 'both'
          ? [p.x + p.y - p.n, p.x + p.y, p.x + p.y - union - none, none]
          : [p.x - none, p.x, p.y - p.both, union - p.y - 1];
    const given =
      p.ask === 'both'
        ? L(
            `${p.n} o'quvchidan ${p.x} tasi ${a.uz} to'garagiga, ${p.y} tasi ${b.uz} to'garagiga qatnashadi, ${none} tasi hech qaysi to'garakka qatnashmaydi.`,
            `Из ${p.n} учеников ${p.x} ходят в кружок «${a.ru}», ${p.y} — в кружок «${b.ru}», а ${none} не ходят ни в один кружок.`,
            `${p.n} oqıwshıdan ${p.x} i «${a.kaa}» úyirmesine, ${p.y} i «${b.kaa}» úyirmesine qatnasadı, ${none} i hesh qaysı úyirmege qatnaspaydı.`, // kaa: tekshirilsin
            `Of ${p.n} students, ${p.x} attend the ${a.en} club, ${p.y} attend the ${b.en} club and ${none} attend neither club.`,
          )
        : L(
            `${p.n} o'quvchidan ${p.x} tasi ${a.uz} to'garagiga, ${p.y} tasi ${b.uz} to'garagiga, ${p.both} tasi ikkala to'garakka ham qatnashadi.`,
            `Из ${p.n} учеников ${p.x} ходят в кружок «${a.ru}», ${p.y} — в кружок «${b.ru}», а ${p.both} — в оба кружка.`,
            `${p.n} oqıwshıdan ${p.x} i «${a.kaa}» úyirmesine, ${p.y} i «${b.kaa}» úyirmesine, ${p.both} i eki úyirmege de qatnasadı.`, // kaa: tekshirilsin
            `Of ${p.n} students, ${p.x} attend the ${a.en} club, ${p.y} attend the ${b.en} club and ${p.both} attend both.`,
          );
    const question =
      p.ask === 'none'
        ? L("Hech qaysi to'garakka qatnashmaydigan o'quvchilar nechta?", 'Сколько учеников не ходят ни в один кружок?', 'Hesh qaysı úyirmege qatnaspaytuǵın oqıwshılar neshe?', 'How many students attend neither club?')
        : p.ask === 'both'
          ? L("Ikkala to'garakka ham qatnashadigan o'quvchilar nechta?", 'Сколько учеников ходят в оба кружка?', 'Eki úyirmege de qatnasatuǵın oqıwshılar neshe?', 'How many students attend both clubs?')
          : L(
              `Faqat ${a.uz} to'garagiga qatnashadigan o'quvchilar nechta?`,
              `Сколько учеников ходят только в кружок «${a.ru}»?`,
              `Tek «${a.kaa}» úyirmesine qatnasatuǵın oqıwshılar neshe?`,
              `How many students attend only the ${a.en} club?`,
            );
    const calc =
      p.ask === 'none'
        ? T`${p.n}-(${p.x}+${p.y}-${p.both})=${none}`
        : p.ask === 'both'
          ? T`${p.x}+${p.y}-(${p.n}-${none})=${p.both}`
          : T`${p.x}-${p.both}=${p.x - p.both}`;
    return {
      stem: L(`${given.uz} ${question.uz}`, `${given.ru} ${question.ru}`, `${given.kaa} ${question.kaa}`, `${given.en} ${question.en}`),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`Eyler-Venn: $|A\cup B|=|A|+|B|-|A\cap B|$. ${p.ask === 'both' ? `Hech qaysisiga qatnashmaydiganlar chiqarilsa, $|A\\cup B|=${p.n - none}$.` : `Demak, kamida bittasiga qatnashadiganlar $${union}$ ta.`} Javob: $${calc}$.`,
        T`Круги Эйлера: $|A\cup B|=|A|+|B|-|A\cap B|$. ${p.ask === 'both' ? `Без тех, кто не ходит никуда, $|A\\cup B|=${p.n - none}$.` : `Значит, хотя бы в один кружок ходят $${union}$ учеников.`} Ответ: $${calc}$.`,
        T`Eyler-Venn: $|A\cup B|=|A|+|B|-|A\cap B|$. ${p.ask === 'both' ? `Hesh qaysısına qatnaspaǵanlar shıǵarılsa, $|A\\cup B|=${p.n - none}$.` : `Demek, keminde birewine qatnasatuǵınlar $${union}$ ta.`} Juwap: $${calc}$.`,
        T`Euler-Venn: $|A\cup B|=|A|+|B|-|A\cap B|$. ${p.ask === 'both' ? `Without those attending neither, $|A\\cup B|=${p.n - none}$.` : `So $${union}$ students attend at least one club.`} Answer: $${calc}$.`,
      ),
      mis: L(
        "Ikkala to'garakka qatnashuvchilar yig'indiga ikki marta kiradi: $|A|+|B|$ ni to'g'ridan-to'g'ri jami deb olish xato.",
        'Посещающие оба кружка входят в сумму дважды: брать $|A|+|B|$ за число учеников ошибочно.',
        'Eki úyirmege de qatnasatuǵınlar qosındıǵa eki ret kiredi: $|A|+|B|$ di tuwrıdan-tuwrı jámi dep alıw qáte.',
        'Students in both clubs are counted twice in $|A|+|B|$, so it is not the total.',
      ),
    };
  },
);

// --- 94: uchta to'plam (L2): kamida bittasi / hech biri ---
interface RegionsP {
  a: number;
  b: number;
  c: number;
  ab: number;
  ac: number;
  bc: number;
  abc: number;
  none: number;
  ask?: 'union' | 'none';
  c1?: number;
  c2?: number;
  c3?: number;
}
function sampleRegions(r: Rng): RegionsP {
  const triple: [number, number, number] = [0, 0, 0];
  const idx = r.shuffle(range(0, CLUBS.length - 1)).slice(0, 3);
  triple[0] = idx[0]!;
  triple[1] = idx[1]!;
  triple[2] = idx[2]!;
  return { a: r.int(2, 9), b: r.int(2, 9), c: r.int(2, 9), ab: r.int(1, 6), ac: r.int(1, 6), bc: r.int(1, 6), abc: r.int(1, 4), none: r.int(1, 8), c1: triple[0], c2: triple[1], c3: triple[2] };
}
const regionTotals = (v: RegionsP) => ({
  X: v.a + v.ab + v.ac + v.abc,
  Y: v.b + v.ab + v.bc + v.abc,
  Z: v.c + v.ac + v.bc + v.abc,
  P: v.ab + v.abc,
  Q: v.ac + v.abc,
  R: v.bc + v.abc,
  union: v.a + v.b + v.c + v.ab + v.ac + v.bc + v.abc,
});
y1T<RegionsP>(
  'sd-venn-three',
  94,
  'L2',
  150,
  (r) => ({ ...sampleRegions(r), ask: r.pick(['union', 'none'] as const) }),
  (v) => {
    const s = regionTotals(v);
    const N = s.union + v.none;
    const a = CLUBS[v.c1!]!;
    const b = CLUBS[v.c2!]!;
    const c = CLUBS[v.c3!]!;
    const ans = v.ask === 'union' ? s.union : v.none;
    const naive = s.X + s.Y + s.Z;
    const wrong = v.ask === 'union' ? [naive, naive - (s.P + s.Q + s.R), naive - (s.P + s.Q + s.R) - v.abc, naive - 2 * (s.P + s.Q + s.R) + v.abc] : [N - naive, N - (naive - (s.P + s.Q + s.R)), N - s.union - v.abc, s.union];
    const ask = L(
      v.ask === 'union' ? "Kamida bitta to'garakka qatnashadigan o'quvchilar nechta?" : "Hech qaysi to'garakka qatnashmaydigan o'quvchilar nechta?",
      v.ask === 'union' ? 'Сколько учеников ходят хотя бы в один кружок?' : 'Сколько учеников не ходят ни в один кружок?',
      v.ask === 'union' ? 'Keminde bir úyirmege qatnasatuǵın oqıwshılar neshe?' : 'Hesh qaysı úyirmege qatnaspaytuǵın oqıwshılar neshe?',
      v.ask === 'union' ? 'How many students attend at least one club?' : 'How many students attend no club at all?',
    );
    const calc = v.ask === 'union' ? T`${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${v.abc}=${s.union}` : T`${N}-(${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${v.abc})=${N}-${s.union}=${v.none}`;
    return {
      stem: L(
        `${N} o'quvchidan ${s.X} tasi ${a.uz}, ${s.Y} tasi ${b.uz}, ${s.Z} tasi ${c.uz} to'garagiga qatnashadi. ${a.uz} va ${b.uz} ga ${s.P} ta, ${a.uz} va ${c.uz} ga ${s.Q} ta, ${b.uz} va ${c.uz} ga ${s.R} ta, uchala to'garakka ${v.abc} ta o'quvchi qatnashadi. ${ask.uz}`,
        `Из ${N} учеников ${s.X} ходят в кружок «${a.ru}», ${s.Y} — «${b.ru}», ${s.Z} — «${c.ru}». В «${a.ru}» и «${b.ru}» ходят ${s.P}, в «${a.ru}» и «${c.ru}» — ${s.Q}, в «${b.ru}» и «${c.ru}» — ${s.R}, во все три — ${v.abc}. ${ask.ru}`,
        `${N} oqıwshıdan ${s.X} i «${a.kaa}», ${s.Y} i «${b.kaa}», ${s.Z} i «${c.kaa}» úyirmesine qatnasadı. «${a.kaa}» hám «${b.kaa}» ǵa ${s.P}, «${a.kaa}» hám «${c.kaa}» ǵa ${s.Q}, «${b.kaa}» hám «${c.kaa}» ǵa ${s.R}, úsh úyirmege de ${v.abc} oqıwshı qatnasadı. ${ask.kaa}`, // kaa: tekshirilsin
        `Of ${N} students, ${s.X} attend the ${a.en} club, ${s.Y} the ${b.en} club and ${s.Z} the ${c.en} club. ${s.P} attend ${a.en} and ${b.en}, ${s.Q} attend ${a.en} and ${c.en}, ${s.R} attend ${b.en} and ${c.en}, and ${v.abc} attend all three. ${ask.en}`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`Kiritish-chiqarish: $|A\cup B\cup C|=|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|$. $${calc}$.`,
        T`Включение-исключение: $|A\cup B\cup C|=|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|$. $${calc}$.`,
        T`Kirgiziw-shıǵarıw: $|A\cup B\cup C|=|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|$. $${calc}$.`,
        T`Inclusion-exclusion: $|A\cup B\cup C|=|A|+|B|+|C|-|A\cap B|-|A\cap C|-|B\cap C|+|A\cap B\cap C|$. $${calc}$.`,
      ),
      mis: L(
        'Uchlik kesishmani oxirida qo\'shishni unutish: uchala to\'garakka qatnashuvchilar avval uch marta qo\'shilib, uch marta ayriladi.',
        'Забыть прибавить тройное пересечение: участники всех трёх кружков трижды прибавлены и трижды вычтены.',
        'Úshlik kesilisiwdi aqırında qosıwdı umıtıw: úsh úyirmege de qatnasıwshılar úsh ret qosılıp, úsh ret ayırıladı.',
        'Forgetting to add back the triple intersection: those in all three clubs are added three times and subtracted three times.',
      ),
    };
  },
);

// --- 94: uchta to'plam (L3): roppa-rosa ikkita ---
y1T<RegionsP>(
  'sd-venn-exactly',
  94,
  'L3',
  200,
  (r) => sampleRegions(r),
  (v) => {
    const s = regionTotals(v);
    const N = s.union + v.none;
    const sizes = s.X + s.Y + s.Z;
    const exactlyTwo = v.ab + v.ac + v.bc;
    need(sizes - s.union - 2 * v.abc === exactlyTwo);
    const c = ['A', 'B', 'C'];
    void c;
    const a = CLUBS[v.c1!]!;
    const b = CLUBS[v.c2!]!;
    const d = CLUBS[v.c3!]!;
    const wrong = [sizes - s.union, sizes - s.union - v.abc, exactlyTwo + v.abc, s.P + s.Q + s.R];
    const full = s.union;
    return {
      stem: L(
        `Guruhdagi ${full} nafar o'quvchining har biri kamida bitta to'garakka qatnashadi: ${s.X} tasi ${a.uz}, ${s.Y} tasi ${b.uz}, ${s.Z} tasi ${d.uz} to'garagiga. Uchala to'garakka ${v.abc} ta o'quvchi qatnashadi. Roppa-rosa ikkita to'garakka qatnashadigan o'quvchilar nechta?`,
        `Каждый из ${full} учеников группы ходит хотя бы в один кружок: ${s.X} — в «${a.ru}», ${s.Y} — в «${b.ru}», ${s.Z} — в «${d.ru}». Во все три кружка ходят ${v.abc} учеников. Сколько учеников ходят ровно в два кружка?`,
        `Toparda ${full} oqıwshınıń hár biri keminde bir úyirmege qatnasadı: ${s.X} i «${a.kaa}», ${s.Y} i «${b.kaa}», ${s.Z} i «${d.kaa}» úyirmesine. Úsh úyirmege de ${v.abc} oqıwshı qatnasadı. Tap eki úyirmege qatnasatuǵın oqıwshılar neshe?`, // kaa: tekshirilsin
        `Each of the ${full} students in a group attends at least one club: ${s.X} the ${a.en} club, ${s.Y} the ${b.en} club, ${s.Z} the ${d.en} club. ${v.abc} students attend all three. How many students attend exactly two clubs?`,
      ),
      correct: mi(exactlyTwo),
      wrong: intWrong(exactlyTwo, wrong),
      sol: L(
        T`Bitta, ikkita, uchta to'garakka qatnashuvchilar soni $n_1,n_2,n_3$ bo'lsin. $n_1+n_2+n_3=${full}$ va $n_1+2n_2+3n_3=${sizes}$ (har kim o'z to'garaklari sonicha sanaladi). Ayiramiz: $n_2+2n_3=${sizes - full}$, $n_3=${v.abc}$, demak $n_2=${sizes - full}-2\cdot ${v.abc}=${exactlyTwo}$.`,
        T`Пусть $n_1,n_2,n_3$ — числа учеников, посещающих один, два, три кружка. $n_1+n_2+n_3=${full}$ и $n_1+2n_2+3n_3=${sizes}$ (каждый считается по числу своих кружков). Вычитая, $n_2+2n_3=${sizes - full}$, $n_3=${v.abc}$, значит $n_2=${sizes - full}-2\cdot ${v.abc}=${exactlyTwo}$.`,
        T`Bir, eki, úsh úyirmege qatnasıwshılar sanı $n_1,n_2,n_3$ bolsın. $n_1+n_2+n_3=${full}$ hám $n_1+2n_2+3n_3=${sizes}$. Ayıramız: $n_2+2n_3=${sizes - full}$, $n_3=${v.abc}$, demek $n_2=${sizes - full}-2\cdot ${v.abc}=${exactlyTwo}$.`,
        T`Let $n_1,n_2,n_3$ be the numbers of students attending one, two, three clubs. $n_1+n_2+n_3=${full}$ and $n_1+2n_2+3n_3=${sizes}$ (each student is counted once per club). Subtracting, $n_2+2n_3=${sizes - full}$, $n_3=${v.abc}$, so $n_2=${sizes - full}-2\cdot ${v.abc}=${exactlyTwo}$.`,
      ),
      mis: L(
        "$|A|+|B|+|C|-N$ ni darhol javob qilib olish: bu farq uchlik kesishmani ikki marta ($n_2+2n_3$) o'z ichiga oladi.",
        'Взять $|A|+|B|+|C|-N$ за ответ: эта разность содержит тройное пересечение дважды ($n_2+2n_3$).',
        '$|A|+|B|+|C|-N$ di tuwrıdan-tuwrı juwap dep alıw: bul ayırma úshlik kesilisiwdi eki ret ($n_2+2n_3$) óz ishine aladı.',
        'Taking $|A|+|B|+|C|-N$ as the answer: this difference contains the triple intersection twice ($n_2+2n_3$).',
      ),
    };
  },
);

// --- 94: ro'yxat bilan berilgan to'plamlar (L1) ---
interface ListedP {
  A: number[];
  B: number[];
  op: 'cap' | 'cup' | 'AB' | 'BA';
}
const setKey = (xs: readonly number[]): string => sortedUnique(xs).join(',');
y1T<ListedP>(
  'sd-set-listed',
  94,
  'L1',
  80,
  (r) => {
    const pool = range(1, 14);
    const A = sortedUnique(r.shuffle(pool).slice(0, r.int(4, 6)));
    const common = r.shuffle(A).slice(0, r.int(1, 3));
    const B = sortedUnique([...common, ...r.shuffle(pool.filter((x) => !A.includes(x))).slice(0, r.int(2, 4))]);
    return { A, B, op: r.pick(['cap', 'cup', 'AB', 'BA'] as const) };
  },
  (p) => {
    const inB = new Set(p.B);
    const inA = new Set(p.A);
    const res = {
      cap: p.A.filter((x) => inB.has(x)),
      cup: [...p.A, ...p.B],
      AB: p.A.filter((x) => !inB.has(x)),
      BA: p.B.filter((x) => !inA.has(x)),
    };
    const sym = [...p.A.filter((x) => !inB.has(x)), ...p.B.filter((x) => !inA.has(x))];
    const all = { cap: sortedUnique(res.cap), cup: sortedUnique(res.cup), AB: sortedUnique(res.AB), BA: sortedUnique(res.BA), sym: sortedUnique(sym) };
    const correctSet = all[p.op];
    need(correctSet.length >= 1);
    const others = (['cap', 'cup', 'AB', 'BA', 'sym'] as const).filter((k) => k !== p.op).map((k) => all[k]);
    const distinct: number[][] = [];
    const seen = new Set<string>([setKey(correctSet)]);
    for (const s of others) {
      if (s.length && !seen.has(setKey(s))) {
        seen.add(setKey(s));
        distinct.push(s);
      }
    }
    need(distinct.length >= 3);
    const ans = setTex(correctSet);
    return {
      stem: L(
        T`$A=${setTex(p.A)}$ va $B=${setTex(p.B)}$ to'plamlar berilgan. $${OP_TEX[p.op]}$ to'plamni toping.`,
        T`Даны множества $A=${setTex(p.A)}$ и $B=${setTex(p.B)}$. Найдите множество $${OP_TEX[p.op]}$.`,
        T`$A=${setTex(p.A)}$ hám $B=${setTex(p.B)}$ úyirmeleri berilgen. $${OP_TEX[p.op]}$ úyirmesin tabıń.`, // kaa: tekshirilsin
        T`Sets $A=${setTex(p.A)}$ and $B=${setTex(p.B)}$ are given. Find the set $${OP_TEX[p.op]}$.`,
      ),
      correct: M(ans),
      wrong: distinct.map((s) => M(setTex(s))),
      sol: L(
        T`$${OP_TEX[p.op]}=${ans}$: ${p.op === 'cap' ? 'ikkala to\'plamda ham bor elementlar' : p.op === 'cup' ? 'kamida bitta to\'plamdagi elementlar (takrorsiz)' : p.op === 'AB' ? "A da bor, B da yo'q elementlar" : "B da bor, A da yo'q elementlar"}.`,
        T`$${OP_TEX[p.op]}=${ans}$: ${p.op === 'cap' ? 'элементы, входящие в оба множества' : p.op === 'cup' ? 'элементы хотя бы одного множества (без повторов)' : p.op === 'AB' ? 'элементы A, которых нет в B' : 'элементы B, которых нет в A'}.`,
        T`$${OP_TEX[p.op]}=${ans}$: ${p.op === 'cap' ? 'eki úyirmede de bar elementler' : p.op === 'cup' ? 'keminde bir úyirmedegi elementler (qaytalanbaytuǵın)' : p.op === 'AB' ? 'A da bar, B da joq elementler' : 'B da bar, A da joq elementler'}.`,
        T`$${OP_TEX[p.op]}=${ans}$: ${p.op === 'cap' ? 'elements belonging to both sets' : p.op === 'cup' ? 'elements of at least one set (no repeats)' : p.op === 'AB' ? 'elements of A that are not in B' : 'elements of B that are not in A'}.`,
      ),
      mis: L(
        "Birlashma va kesishmani, yoki $A\\setminus B$ bilan $B\\setminus A$ ni adashtirish; birlashmada umumiy elementni ikki marta yozish.",
        'Путать объединение и пересечение, а также $A\\setminus B$ и $B\\setminus A$; записывать общий элемент дважды.',
        'Birlespe menen kesilisiwdi, yamasa $A\\setminus B$ menen $B\\setminus A$ nı shatastırıw; ulıwma elementti eki ret jazıw.',
        'Mixing up union and intersection, or $A\\setminus B$ and $B\\setminus A$; writing a common element twice.',
      ),
    };
  },
);

// --- 94: qism to'plamlar soni (L2) ---
type SubsetKind = 'all' | 'proper' | 'nonemptyProper' | 'withElem' | 'withoutElem';
interface SubsetP {
  form: 'natLess' | 'absLe' | 'divisors' | 'squareLe';
  v: number;
  kind: SubsetKind;
}
function subsetSet(form: SubsetP['form'], v: number): number[] {
  const out: number[] = [];
  if (form === 'natLess') for (let x = 1; x < v; x++) out.push(x);
  else if (form === 'absLe') for (let x = -v; x <= v; x++) out.push(x);
  else if (form === 'divisors') for (let x = 1; x <= v; x++) if (v % x === 0) out.push(x);
  else for (let x = -v; x <= v; x++) if (x * x <= v * v - v) out.push(x);
  return out;
}
y1T<SubsetP>(
  'sd-set-subsets',
  94,
  'L2',
  110,
  (r) => {
    const form = r.pick(['natLess', 'absLe', 'divisors', 'squareLe'] as const);
    const v = form === 'natLess' ? r.int(5, 9) : form === 'absLe' ? r.int(1, 3) : form === 'divisors' ? r.pick([12, 18, 20, 24, 28, 30, 36, 42]) : r.int(3, 6);
    return { form, v, kind: r.pick(['all', 'proper', 'nonemptyProper', 'withElem', 'withoutElem'] as const) };
  },
  (p) => {
    const n = subsetSet(p.form, p.v).length;
    need(n >= 3 && n <= 9);
    const ans = p.kind === 'all' ? 2 ** n : p.kind === 'proper' ? 2 ** n - 1 : p.kind === 'nonemptyProper' ? 2 ** n - 2 : 2 ** (n - 1);
    const wrong = [n * n, 2 * n, 2 ** n - (p.kind === 'all' ? 1 : 0), 2 ** (n - 1) + 1, 2 ** n - 2, 2 ** (n - 1) - 1, fact(n)];
    const set =
      p.form === 'natLess'
        ? T`\{x\in\mathbb{N}\mid x<${p.v}\}`
        : p.form === 'absLe'
          ? T`\{x\in\mathbb{Z}\mid |x|\le ${p.v}\}`
          : p.form === 'divisors'
            ? T`\{x\in\mathbb{N}\mid ${p.v}\ \text{soni}\ x\ \text{ga bo'linadi}\}`
            : T`\{x\in\mathbb{Z}\mid x^2\le ${p.v * p.v - p.v}\}`;
    const setRu = p.form === 'divisors' ? T`\{x\in\mathbb{N}\mid ${p.v}\ \text{делится на}\ x\}` : set;
    const setKaa = p.form === 'divisors' ? T`\{x\in\mathbb{N}\mid ${p.v}\ \text{sanı}\ x\ \text{ke bólinedi}\}` : set;
    const setEn = p.form === 'divisors' ? T`\{x\in\mathbb{N}\mid x\ \text{divides}\ ${p.v}\}` : set;
    const kindTxt = {
      all: L("barcha qism to'plamlari", 'всех подмножеств', 'barlıq ishki úyirmeleri', 'all subsets'),
      proper: L("xos qism to'plamlari (o'ziga teng emas)", 'собственных подмножеств (не равных самому множеству)', 'óz-ózine teń bolmaǵan ishki úyirmeleri', 'proper subsets (not equal to the set itself)'),
      nonemptyProper: L("bo'sh bo'lmagan xos qism to'plamlari", 'непустых собственных подмножеств', 'bos emes óz-ózine teń bolmaǵan ishki úyirmeleri', 'non-empty proper subsets'),
      withElem: L(`$${subsetSet(p.form, p.v)[0]}$ elementni o'z ichiga olgan qism to'plamlari`, `подмножеств, содержащих элемент $${subsetSet(p.form, p.v)[0]}$`, `$${subsetSet(p.form, p.v)[0]}$ elementin óz ishine alǵan ishki úyirmeleri`, `subsets containing the element $${subsetSet(p.form, p.v)[0]}$`),
      withoutElem: L(`$${subsetSet(p.form, p.v)[0]}$ elementni o'z ichiga olmagan qism to'plamlari`, `подмножеств, не содержащих элемент $${subsetSet(p.form, p.v)[0]}$`, `$${subsetSet(p.form, p.v)[0]}$ elementin óz ishine almaǵan ishki úyirmeleri`, `subsets not containing the element $${subsetSet(p.form, p.v)[0]}$`),
    }[p.kind];
    const calc = p.kind === 'all' ? T`2^{${n}}=${ans}` : p.kind === 'proper' ? T`2^{${n}}-1=${ans}` : p.kind === 'nonemptyProper' ? T`2^{${n}}-2=${ans}` : T`2^{${n - 1}}=${ans}`;
    return {
      stem: L(
        T`$A=${set}$ to'plamning ${kindTxt.uz} nechta?`,
        T`Сколько существует ${kindTxt.ru} множества $A=${setRu}$?`,
        T`$A=${setKaa}$ úyirmesiniń ${kindTxt.kaa} neshe?`, // kaa: tekshirilsin
        T`How many ${kindTxt.en} does the set $A=${setEn}$ have?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`Avval elementlar sonini topamiz: $|A|=${n}$. ${p.kind === 'withElem' || p.kind === 'withoutElem' ? "Bitta element qat'iy belgilanadi (kirsin yoki kirmasin), qolgan $" + (n - 1) + "$ tasi har biri ikki xil" : "Har bir element qism to'plamga kiradi yoki kirmaydi"}: $${calc}$.`,
        T`Число элементов: $|A|=${n}$. ${p.kind === 'withElem' || p.kind === 'withoutElem' ? 'Один элемент зафиксирован (входит или не входит), каждый из остальных $' + (n - 1) + '$ — два варианта' : 'Каждый элемент либо входит в подмножество, либо нет'}: $${calc}$.`,
        T`Elementler sanı: $|A|=${n}$. ${p.kind === 'withElem' || p.kind === 'withoutElem' ? 'Bir element belgilenedi (kiredi yamasa kirmeydi), qalǵan $' + (n - 1) + '$ i hár biri eki túrli' : 'Hár bir element ishki úyirmege kiredi yamasa kirmeydi'}: $${calc}$.`,
        T`The number of elements is $|A|=${n}$. ${p.kind === 'withElem' || p.kind === 'withoutElem' ? 'One element is fixed (in or out); each of the other $' + (n - 1) + '$ has two options' : 'Each element is either in or out of a subset'}: $${calc}$.`,
      ),
      mis: L(
        "Qism to'plamlar soni $2^n$ ekanini unutib, $n$ yoki $n^2$ deb olish; bo'sh to'plam va to'plamning o'zini hisobga olmaslik.",
        'Забыть, что число подмножеств равно $2^n$ (брать $n$ или $n^2$); не учесть пустое множество и само множество.',
        'Ishki úyirmeler sanı $2^n$ ekenin umıtıp, $n$ yamasa $n^2$ dep alıw; bos úyirme hám úyirmeniń ózin esapqa almaw.',
        'Forgetting that the number of subsets is $2^n$ (using $n$ or $n^2$); mishandling the empty set and the set itself.',
      ),
    };
  },
);

// --- 94: karrali sonlar va Eyler-Venn (L2) ---
interface MultiplesP {
  n: number;
  p: number;
  q: number;
  ask: 'either' | 'both' | 'neither' | 'onlyP';
}
y1T<MultiplesP>(
  'sd-set-multiples',
  94,
  'L2',
  130,
  (r) => {
    const p = r.pick([2, 3, 4, 5, 6, 7, 8, 9]);
    let q = r.pick([2, 3, 4, 5, 6, 7, 9, 10]);
    if (q === p) q += 1;
    return { n: r.int(5, 12) * 10, p, q, ask: r.pick(['either', 'both', 'neither', 'onlyP'] as const) };
  },
  (v) => {
    const U = range(1, v.n);
    const cp = U.filter((x) => x % v.p === 0).length;
    const cq = U.filter((x) => x % v.q === 0).length;
    const both = U.filter((x) => x % v.p === 0 && x % v.q === 0).length;
    need(both >= 1 && both < cp && both < cq);
    const either = cp + cq - both;
    const ans = v.ask === 'either' ? either : v.ask === 'both' ? both : v.ask === 'neither' ? v.n - either : cp - both;
    const wrong =
      v.ask === 'either'
        ? [cp + cq, either + 1, either - 1, either - both]
        : v.ask === 'both'
          ? [Math.floor(v.n / (v.p * v.q)), Math.min(cp, cq), cp + cq - v.n, both + 1]
          : v.ask === 'neither'
            ? [v.n - cp - cq, v.n - either + both, v.n - either + 1, either]
            : [cp, cp - both + 1, cp - both - 1, cq - both];
    const what = L(
      { either: `$${v.p}$ ga yoki $${v.q}$ ga bo'linadigan`, both: `ham $${v.p}$ ga, ham $${v.q}$ ga bo'linadigan`, neither: `na $${v.p}$ ga, na $${v.q}$ ga bo'linadigan`, onlyP: `$${v.p}$ ga bo'linadigan, lekin $${v.q}$ ga bo'linmaydigan` }[v.ask],
      { either: `делящихся на $${v.p}$ или на $${v.q}$`, both: `делящихся и на $${v.p}$, и на $${v.q}$`, neither: `не делящихся ни на $${v.p}$, ни на $${v.q}$`, onlyP: `делящихся на $${v.p}$, но не делящихся на $${v.q}$` }[v.ask],
      { either: `$${v.p}$ ge yamasa $${v.q}$ ge bólinetuǵın`, both: `$${v.p}$ ge de, $${v.q}$ ge de bólinetuǵın`, neither: `$${v.p}$ ge de, $${v.q}$ ge de bólinbeytuǵın`, onlyP: `$${v.p}$ ge bólinetuǵın, biraq $${v.q}$ ge bólinbeytuǵın` }[v.ask],
      { either: `divisible by $${v.p}$ or by $${v.q}$`, both: `divisible by both $${v.p}$ and $${v.q}$`, neither: `divisible by neither $${v.p}$ nor $${v.q}$`, onlyP: `divisible by $${v.p}$ but not by $${v.q}$` }[v.ask],
    );
    const lcmv = (v.p * v.q) / gcdInt(v.p, v.q);
    const calc =
      v.ask === 'either'
        ? T`${cp}+${cq}-${both}=${ans}`
        : v.ask === 'both'
          ? T`\left[\frac{${v.n}}{${lcmv}}\right]=${both}`
          : v.ask === 'neither'
            ? T`${v.n}-(${cp}+${cq}-${both})=${ans}`
            : T`${cp}-${both}=${ans}`;
    return {
      stem: L(
        `1 dan ${v.n} gacha bo'lgan natural sonlar orasida ${what.uz} sonlar nechta?`,
        `Сколько среди натуральных чисел от 1 до ${v.n} чисел, ${what.ru}?`,
        `1 den ${v.n} ge shekem natural sanlar arasında ${what.kaa} sanlar neshe?`, // kaa: tekshirilsin
        `How many natural numbers from 1 to ${v.n} are ${what.en}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        T`$${v.p}$ ga karralilar $\left[\frac{${v.n}}{${v.p}}\right]=${cp}$ ta, $${v.q}$ ga karralilar $${cq}$ ta, ikkalasiga karralilar (EKUK $=${lcmv}$) $${both}$ ta. $${calc}$.`,
        T`Кратных $${v.p}$ — $\left[\frac{${v.n}}{${v.p}}\right]=${cp}$, кратных $${v.q}$ — $${cq}$, кратных обоим (НОК $=${lcmv}$) — $${both}$. $${calc}$.`,
        T`$${v.p}$ ge eselikler $\left[\frac{${v.n}}{${v.p}}\right]=${cp}$ ta, $${v.q}$ ge eselikler $${cq}$ ta, ekewine de eselikler (EKEK $=${lcmv}$) $${both}$ ta. $${calc}$.`,
        T`Multiples of $${v.p}$: $\left[\frac{${v.n}}{${v.p}}\right]=${cp}$; multiples of $${v.q}$: $${cq}$; multiples of both (LCM $=${lcmv}$): $${both}$. $${calc}$.`,
      ),
      mis: L(
        "Ikkalasiga karrali sonlarni ikki marta sanash yoki ularning soni $n/(pq)$ deb olish (u EKUK bo'yicha hisoblanadi).",
        'Посчитать числа, кратные обоим, дважды, или взять их число равным $n/(pq)$ (нужно делить на НОК).',
        'Ekewine de eselik sanlardı eki ret sanaw yamasa olardıń sanın $n/(pq)$ dep alıw (ol EKEK boyınsha esaplanadı).',
        'Counting numbers divisible by both twice, or taking their count as $n/(pq)$ (one must divide by the LCM).',
      ),
    };
  },
);
function gcdInt(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcdInt(b, a % b);
}

// =====================================================================================================
// 5.2 Ma'lumotlar tahlili (101, 102, 112), 5.3 Kombinatorika (96, 97, 98), 5.4 Ehtimol (99, 100), 5.5 Modellashtirish (103, 113)
// =====================================================================================================

const fInt = (n: number): Frac => frac(n, 1);
const ANSW = L('Javob', 'Ответ', 'Juwap', 'Answer');
const finS = (x: string): L10n => L(`${ANSW.uz}: ${x}.`, `${ANSW.ru}: ${x}.`, `${ANSW.kaa}: ${x}.`, `${ANSW.en}: ${x}.`);
const jn = (...parts: (L10n | string)[]): L10n => {
  const g = (l: keyof L10n) => parts.map((q) => (typeof q === 'string' ? q : q[l])).join(' ');
  return { uz: g('uz'), ru: g('ru'), kaa: g('kaa'), en: g('en') };
};
const sFind = (e: string): L10n => L(`${e} ni toping.`, `Найдите ${e}.`, `${e} tabıń.`, `Find ${e}.`); // kaa: tekshirilsin
const numList = (xs: readonly number[]): string => xs.map(String).join(';\\ ');
const shuffled = <T>(r: Rng, xs: readonly T[]): T[] => r.shuffle([...xs]);
const arrTable = (head: string, xs: readonly number[], sub: string, ys: readonly (number | string)[]): string =>
  `\\begin{array}{c|${'c'.repeat(xs.length)}} ${head} & ${xs.join(' & ')} \\\\ \\hline ${sub} & ${ys.join(' & ')} \\end{array}`;

// --- 101: o'rtacha: yetishmayotgan son (L1) ---
interface MeanMissP {
  vals: number[];
  m: number;
}
y1T<MeanMissP>(
  'da-mean-missing',
  101,
  'L1',
  100,
  (r) => ({ vals: Array.from({ length: r.int(3, 5) }, () => r.int(3, 30)), m: r.int(8, 25) }),
  (p) => {
    const k = p.vals.length + 1;
    const x = p.m * k - sum(p.vals);
    need(x >= 1 && x <= 45 && !p.vals.includes(x));
    const wrong = intWrong(x, [p.m, p.m * (k - 1) - sum(p.vals), Math.abs(sum(p.vals) - p.m * k), Math.round(sum(p.vals) / p.vals.length)], { min: 1 });
    return {
      stem: L(
        `${mi(k)} ta sonning arifmetik o'rtachasi ${mi(p.m)}. Ulardan ${mi(k - 1)} tasi: ${M(numList(p.vals))}. Qolgan sonni toping.`,
        `Среднее арифметическое ${mi(k)} чисел равно ${mi(p.m)}. Известны ${mi(k - 1)} из них: ${M(numList(p.vals))}. Найдите оставшееся число.`,
        `${mi(k)} sannıń arifmetikalıq ortashası ${mi(p.m)}. Olardan ${mi(k - 1)} i: ${M(numList(p.vals))}. Qalǵan sandı tabıń.`, // kaa: tekshirilsin
        `The arithmetic mean of ${mi(k)} numbers is ${mi(p.m)}. ${mi(k - 1)} of them are ${M(numList(p.vals))}. Find the remaining number.`,
      ),
      correct: mi(x),
      wrong,
      sol: jn(M(`${k}\\cdot ${p.m}-(${p.vals.join('+')})=${x}`), finS(mi(x))),
      mis: L(
        "O'rtachani sonlar soniga ($k$ ga) ko'paytirmasdan, ma'lum sonlar yig'indisiga bo'lib yuborish.",
        'Не умножают среднее на количество чисел, а делят сумму известных чисел.',
        "Ortashanı sanlar sanına ($k$ ǵa) kóbeytpey, belgili sanlar qosındısına bóliw.", // kaa: tekshirilsin
        'Not multiplying the mean by the count of numbers and instead dividing the sum of the known numbers.',
      ),
    };
  },
);

// --- 101: median, moda, o'zgarish kengligi (L2) ---
interface MedModeP {
  vals: number[];
  ask: 'median' | 'mode' | 'range' | 'medPlusMode';
}
y1T<MedModeP>(
  'da-median-mode',
  101,
  'L2',
  130,
  (r) => {
    const n = r.pick([7, 9]);
    const base = Array.from({ length: n - 2 }, () => r.int(1, 20));
    const mode = r.int(1, 20);
    return { vals: shuffled(r, [...base, mode, mode]), ask: r.pick(['median', 'mode', 'range', 'medPlusMode'] as const) };
  },
  (p) => {
    const cnt = new Map<number, number>();
    for (const v of p.vals) cnt.set(v, (cnt.get(v) ?? 0) + 1);
    const top = Math.max(...cnt.values());
    const modes = [...cnt].filter(([, c]) => c === top).map(([v]) => v);
    need(top >= 2 && modes.length === 1);
    const sorted = [...p.vals].sort((a, b) => a - b);
    const median = sorted[(sorted.length - 1) / 2]!;
    const range = sorted[sorted.length - 1]! - sorted[0]!;
    const mode = modes[0]!;
    need(new Set([median, mode, range, median + mode]).size === 4);
    const ans = p.ask === 'median' ? median : p.ask === 'mode' ? mode : p.ask === 'range' ? range : median + mode;
    const wrong = intWrong(ans, [median, mode, range, Math.round(sum(p.vals) / p.vals.length), sorted[Math.floor(sorted.length / 2) - 1]!, median + mode + 1], { min: 0 });
    const what = {
      median: L('medianasini', 'медиану', 'medianasın', 'the median'),
      mode: L('modasini', 'моду', 'modasın', 'the mode'),
      range: L("o'zgarish kengligini (eng katta va eng kichik qiymatlar ayirmasi)", 'размах (разность наибольшего и наименьшего значений)', 'ózgeris keńligin (eń úlken hám eń kishi mánisler ayırması)', 'the range (largest minus smallest value)'),
      medPlusMode: L("medianasi va modasining yig'indisini", 'сумму медианы и моды', 'mediana hám modasınıń qosındısın', 'the sum of the median and the mode'),
    }[p.ask];
    return {
      stem: L(
        `${M(numList(p.vals))} ma'lumotlar to'plamining ${what.uz} toping.`,
        `Найдите ${what.ru} набора данных ${M(numList(p.vals))}.`,
        `${M(numList(p.vals))} maǵlıwmatlar toplamınıń ${what.kaa} tabıń.`, // kaa: tekshirilsin
        `Find ${what.en} of the data set ${M(numList(p.vals))}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(L(`Tartiblangan qator: ${M(numList(sorted))}. Mediana ${mi(median)}, moda ${mi(mode)}, kenglik ${mi(range)}.`, `Упорядоченный ряд: ${M(numList(sorted))}. Медиана ${mi(median)}, мода ${mi(mode)}, размах ${mi(range)}.`, `Tártiplengen qatar: ${M(numList(sorted))}. Mediana ${mi(median)}, moda ${mi(mode)}, keńlik ${mi(range)}.`, `Sorted list: ${M(numList(sorted))}. Median ${mi(median)}, mode ${mi(mode)}, range ${mi(range)}.`), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Medianani qatorni tartiblamasdan o'rtadagi son deb olish.",
        'Берут медиану как число в середине неупорядоченного ряда.',
        "Medianı qatardı tártiplemey ortadaǵı san dep alıw.", // kaa: tekshirilsin
        'Taking the middle number of the unsorted list as the median.',
      ),
    };
  },
);

// --- 101: o'rtachaning o'zgarishi: bitta son chiqarildi yoki qo'shildi (L2) ---
interface MeanChangeP {
  n: number;
  x: number;
  m2: number;
  kind: 'remove' | 'add';
}
y1T<MeanChangeP>(
  'da-mean-change',
  101,
  'L2',
  150,
  (r) => ({ n: r.int(4, 9), x: r.int(1, 50), m2: r.int(5, 30), kind: r.pick(['remove', 'add'] as const) }),
  (p) => {
    // remove: n ta son, o'rtacha m; bittasi (x) olib tashlanganda qolgan n-1 tasining o'rtachasi m2
    // add: n ta son, o'rtacha m; x qo'shilganda n+1 tasining o'rtachasi m2
    const total = p.kind === 'remove' ? p.x + (p.n - 1) * p.m2 : p.m2 * (p.n + 1) - p.x;
    need(total % p.n === 0);
    const m = total / p.n;
    need(m >= 3 && m <= 40 && m !== p.m2);
    const wrong = intWrong(p.x, [m, p.m2, Math.abs(p.m2 - m), p.kind === 'remove' ? p.n * m - p.n * p.m2 : p.m2 * p.n - m * p.n].map((v) => Math.abs(v)), { min: 1 });
    return {
      stem: p.kind === 'remove'
        ? L(`${mi(p.n)} ta sonning o'rtachasi ${mi(m)}. Ulardan bittasi chiqarib tashlansa, qolganlarning o'rtachasi ${mi(p.m2)} bo'ldi. Chiqarib tashlangan sonni toping.`, `Среднее ${mi(p.n)} чисел равно ${mi(m)}. После удаления одного из них среднее оставшихся стало ${mi(p.m2)}. Найдите удалённое число.`, `${mi(p.n)} sannıń ortashası ${mi(m)}. Olardan biri alıp taslansa, qalǵanlarınıń ortashası ${mi(p.m2)} boldı. Alıp taslanǵan sandı tabıń.`, `The mean of ${mi(p.n)} numbers is ${mi(m)}. After one of them is removed, the mean of the rest becomes ${mi(p.m2)}. Find the removed number.`) // kaa: tekshirilsin
        : L(`${mi(p.n)} ta sonning o'rtachasi ${mi(m)}. Yana bitta son qo'shilsa, o'rtacha ${mi(p.m2)} bo'ldi. Qo'shilgan sonni toping.`, `Среднее ${mi(p.n)} чисел равно ${mi(m)}. После добавления ещё одного числа среднее стало ${mi(p.m2)}. Найдите добавленное число.`, `${mi(p.n)} sannıń ortashası ${mi(m)}. Taǵı bir san qosılsa, ortasha ${mi(p.m2)} boldı. Qosılǵan sandı tabıń.`, `The mean of ${mi(p.n)} numbers is ${mi(m)}. After another number is added, the mean becomes ${mi(p.m2)}. Find the added number.`), // kaa: tekshirilsin
      correct: mi(p.x),
      wrong,
      sol: jn(p.kind === 'remove' ? M(`x=${p.n}\\cdot ${m}-${p.n - 1}\\cdot ${p.m2}=${p.x}`) : M(`x=${p.n + 1}\\cdot ${p.m2}-${p.n}\\cdot ${m}=${p.x}`), finS(mi(p.x))),
      mis: L(
        "Yig'indilarni ayirishda sonlar sonini ($n$ va $n\\pm 1$) adashtirish.",
        'Путают количество чисел ($n$ и $n\\pm 1$) при вычитании сумм.',
        "Qosındılardı ayırǵanda sanlar sanın ($n$ hám $n\\pm 1$) shatastırıw.", // kaa: tekshirilsin
        'Mixing up the counts ($n$ and $n\\pm 1$) when subtracting the sums.',
      ),
    };
  },
);

// --- 102: chastotalar jadvali: o'rtacha (L2) ---
interface FreqMeanP {
  xs: number[];
  fs: number[];
}
y1T<FreqMeanP>(
  'da-freq-mean',
  102,
  'L2',
  150,
  (r) => {
    const start = r.int(1, 6);
    const xs = [start, start + 1, start + 2, start + 3, start + 4].slice(0, r.int(4, 5));
    return { xs, fs: xs.map(() => r.int(1, 9)) };
  },
  (p) => {
    const n = sum(p.fs);
    const tot = sum(p.xs.map((x, i) => x * p.fs[i]!));
    const ans = frac(tot, n);
    need(ans.d <= 6 && n <= 30 && new Set(p.fs).size >= 3);
    const plain = frac(sum(p.xs), p.xs.length);
    const wrong = fracWrong(ans, [plain, frac(tot, sum(p.xs)), fInt(p.xs[p.fs.indexOf(Math.max(...p.fs))]!), frac(sum(p.fs), p.fs.length)], { lo: 0, hi: 20 });
    return {
      stem: L(
        `Jadvalda ${M('x')} qiymatlarning chastotalari ${M('f')} berilgan: ${M(arrTable('x', p.xs, 'f', p.fs))}. O'rtacha qiymatni toping.`,
        `В таблице даны частоты ${M('f')} значений ${M('x')}: ${M(arrTable('x', p.xs, 'f', p.fs))}. Найдите среднее значение.`,
        `Kestede ${M('x')} mánislerdiń chastotaları ${M('f')} berilgen: ${M(arrTable('x', p.xs, 'f', p.fs))}. Ortasha mánisti tabıń.`, // kaa: tekshirilsin
        `The table shows the frequencies ${M('f')} of the values ${M('x')}: ${M(arrTable('x', p.xs, 'f', p.fs))}. Find the mean.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(L("Vaznli o'rtacha $\\frac{\\sum x f}{\\sum f}$:", 'Взвешенное среднее $\\frac{\\sum x f}{\\sum f}$:', "Salmaqlı ortasha $\\frac{\\sum x f}{\\sum f}$:", 'Weighted mean $\\frac{\\sum x f}{\\sum f}$:'), M(`\\frac{${tot}}{${n}}=${texFrac(ans)}`), finS(mf(ans))), // kaa: tekshirilsin
      mis: L(
        "Chastotalarni hisobga olmay qiymatlarning oddiy o'rtachasini olish.",
        'Берут простое среднее значений, не учитывая частоты.',
        "Chastotalardı esapqa almay mánisleriń ápiwayı ortashasın alıw.", // kaa: tekshirilsin
        'Taking the plain mean of the values and ignoring the frequencies.',
      ),
    };
  },
);

// --- 102: doiraviy diagramma: sektor burchagi va soni (L1) ---
interface PieP {
  N: number;
  deg: number;
  ask: 'count' | 'angle';
}
y1T<PieP>(
  'da-pie-sector',
  102,
  'L1',
  110,
  (r) => ({ N: r.pick([60, 72, 90, 120, 180, 240, 360, 450, 600]), deg: r.pick([20, 30, 36, 45, 60, 72, 90, 108, 120, 144]), ask: r.pick(['count', 'angle'] as const) }),
  (p) => {
    const cnt = frac(p.N * p.deg, 360);
    need(cnt.d === 1 && cnt.n >= 3 && cnt.n < p.N);
    const ans = p.ask === 'count' ? cnt.n : p.deg;
    const wrong = intWrong(ans, p.ask === 'count' ? [Math.round(p.N * p.deg / 100), p.deg, Math.round(p.N / p.deg), Math.round((p.deg / 360) * 100)] : [Math.round((cnt.n / p.N) * 100), Math.round(cnt.n * 3.6) === p.deg ? 0 : Math.round(cnt.n * 3.6) + 10, cnt.n, 2 * p.deg], { min: 1 });
    return {
      stem: p.ask === 'count'
        ? L(`Doiraviy diagrammada ${mi(p.N)} ta respondentning javoblari ko'rsatilgan. Bir javobga mos sektorning markaziy burchagi ${M(`${p.deg}^\\circ`)}. Bu javobni tanlagan respondentlar nechta?`, `На круговой диаграмме показаны ответы ${mi(p.N)} респондентов. Центральный угол сектора одного ответа равен ${M(`${p.deg}^\\circ`)}. Сколько респондентов выбрали этот ответ?`, `Dóńgelek diagrammada ${mi(p.N)} respondenttiń juwapları kórsetilgen. Bir juwapqa sáykes sektordıń orayılıq múyeshi ${M(`${p.deg}^\\circ`)}. Bul juwapty tańlaǵan respondentler neshe?`, `A pie chart shows the answers of ${mi(p.N)} respondents. The central angle of the sector for one answer is ${M(`${p.deg}^\\circ`)}. How many respondents chose this answer?`) // kaa: tekshirilsin
        : L(`Doiraviy diagrammada ${mi(p.N)} ta respondentning javoblari ko'rsatilgan. Bir javobni ${mi(cnt.n)} ta respondent tanlagan. Unga mos sektorning markaziy burchagi necha gradus?`, `На круговой диаграмме показаны ответы ${mi(p.N)} респондентов. Один ответ выбрали ${mi(cnt.n)} респондентов. Чему равен центральный угол соответствующего сектора (в градусах)?`, `Dóńgelek diagrammada ${mi(p.N)} respondenttiń juwapları kórsetilgen. Bir juwapty ${mi(cnt.n)} respondent tańlaǵan. Oǵan sáykes sektordıń orayılıq múyeshi neshe gradus?`, `A pie chart shows the answers of ${mi(p.N)} respondents. ${mi(cnt.n)} respondents chose one answer. What is the central angle of its sector (in degrees)?`), // kaa: tekshirilsin
      correct: mi(ans),
      wrong,
      sol: jn(M(`\\frac{${p.deg}}{360}\\cdot ${p.N}=${cnt.n}`), finS(mi(ans))),
      mis: L(
        "To'liq doira $360^\\circ$ ekanini $100^\\circ$ deb olish (foiz bilan adashtirish).",
        'Принимают полный круг за $100^\\circ$ (путают с процентами).',
        "Tolıq dóńgelekti $100^\\circ$ dep alıw (procent penen shatastırıw).", // kaa: tekshirilsin
        'Taking the full circle as $100^\\circ$ (confusing it with percent).',
      ),
    };
  },
);

// --- 112: standart chetlanish (L2) ---
interface StdDevP {
  mu: number;
  a: number;
  b: number;
}
y1T<StdDevP>(
  'da-std-dev',
  112,
  'L2',
  170,
  (r) => ({ mu: r.int(8, 30), a: r.int(1, 12), b: r.int(1, 12) }),
  (p) => {
    const v2 = (p.a * p.a + p.b * p.b) / 2;
    const s = Math.sqrt(v2);
    need(Number.isInteger(v2) && Number.isInteger(s) && s >= 2 && p.a !== p.b);
    const vals = [p.mu - p.a, p.mu + p.a, p.mu - p.b, p.mu + p.b].sort((x, y) => x - y);
    need(vals[0]! >= 1);
    const wrong = intWrong(s, [v2, p.mu, Math.round((p.a + p.b) / 2), Math.round(Math.sqrt(p.a * p.a + p.b * p.b)), s * 2].filter((v) => Number.isInteger(v)), { min: 1 });
    return {
      stem: L(
        `${M(numList(vals))} ma'lumotlar to'plamining standart chetlanishini (dispersiyadan olingan kvadrat ildiz) toping.`,
        `Найдите стандартное отклонение (корень из дисперсии) набора данных ${M(numList(vals))}.`,
        `${M(numList(vals))} maǵlıwmatlar toplamınıń standart awısıwın (dispersiyadan alınǵan kvadrat túbir) tabıń.`, // kaa: tekshirilsin
        `Find the standard deviation (square root of the variance) of the data set ${M(numList(vals))}.`,
      ),
      correct: mi(s),
      wrong,
      sol: jn(M(`\\bar{x}=${p.mu}`), M(`\\sigma^{2}=\\frac{${2 * p.a * p.a + 2 * p.b * p.b}}{4}=${v2},\\ \\sigma=\\sqrt{${v2}}=${s}`), finS(mi(s))),
      mis: L(
        "Dispersiyani standart chetlanish deb olish (ildiz chiqarmaslik) yoki chetlanishlarni kvadratga ko'tarmay qo'shish.",
        'Принимают дисперсию за стандартное отклонение (не извлекают корень) либо складывают отклонения без возведения в квадрат.',
        "Dispersiyanı standart awısıw dep alıw (túbir shıǵarmaw) yamasa awısıwlardı kvadratqa kótermey qosıw.", // kaa: tekshirilsin
        'Taking the variance as the standard deviation (no square root), or adding deviations without squaring.',
      ),
    };
  },
);

// --- 112: dispersiya (L2), ochiq javobli emas: kasr javob ---
interface VarianceP {
  mu: number;
  devs: number[];
}
y1T<VarianceP>(
  'da-variance',
  112,
  'L2',
  170,
  (r) => {
    const devs = [r.int(-6, 6), r.int(-6, 6), r.int(-6, 6), r.int(-6, 6)];
    devs.push(-sum(devs));
    return { mu: r.int(10, 30), devs };
  },
  (p) => {
    const n = p.devs.length;
    need(p.devs.every((d) => Math.abs(d) <= 8) && new Set(p.devs).size >= 4 && p.devs.some((d) => d !== 0));
    const vals = p.devs.map((d) => p.mu + d).sort((a, b) => a - b);
    const ssq = sum(p.devs.map((d) => d * d));
    const ans = frac(ssq, n);
    need(ans.d <= 5 && ans.n / ans.d >= 3 && ans.n / ans.d <= 30);
    const wrong = fracWrong(ans, [frac(ssq, n - 1), fInt(Math.round(Math.sqrt(ssq / n))), frac(sum(p.devs.map(Math.abs)), n), frac(ssq, n * n)], { lo: 0, hi: 60 });
    return {
      stem: L(
        `${M(numList(vals))} ma'lumotlar to'plamining dispersiyasini toping (dispersiya — chetlanishlar kvadratlarining o'rtachasi).`,
        `Найдите дисперсию набора данных ${M(numList(vals))} (дисперсия — среднее квадратов отклонений от среднего).`,
        `${M(numList(vals))} maǵlıwmatlar toplamınıń dispersiyasın tabıń (dispersiya — awısıwlar kvadratlarınıń ortashası).`, // kaa: tekshirilsin
        `Find the variance of the data set ${M(numList(vals))} (the mean of the squared deviations from the mean).`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(M(`\\bar{x}=${p.mu}`), M(`\\sigma^{2}=\\frac{${p.devs.map((d) => `(${d})^{2}`).join('+')}}{${n}}=\\frac{${ssq}}{${n}}=${texFrac(ans)}`), finS(mf(ans))),
      mis: L(
        "$n$ o'rniga $n-1$ ga bo'lish (tanlanma dispersiyasi) yoki chetlanishlarning modullarini o'rtachalash.",
        'Делят на $n-1$ вместо $n$ (выборочная дисперсия) либо усредняют модули отклонений.',
        "$n$ ornına $n-1$ ge bóliw (tańlanba dispersiyası) yamasa awısıwlar modulların ortalaw.", // kaa: tekshirilsin
        'Dividing by $n-1$ instead of $n$ (sample variance), or averaging the absolute deviations.',
      ),
    };
  },
);

// --- 102: jadvaldan o'qish (L1) ---
interface TableReadP {
  vals: number[];
  ask: 'range' | 'twoLargest' | 'aboveAvg';
}
const MONTHS: L10n[] = [
  L('Yanvar', 'январь', 'Yanvar', 'January'),
  L('Fevral', 'февраль', 'Fevral', 'February'),
  L('Mart', 'март', 'Mart', 'March'),
  L('Aprel', 'апрель', 'Aprel', 'April'),
  L('May', 'май', 'May', 'May'),
  L('Iyun', 'июнь', 'Iyun', 'June'),
];
y1T<TableReadP>(
  'da-table-read',
  102,
  'L1',
  110,
  (r) => ({ vals: Array.from({ length: 6 }, () => r.int(20, 95)), ask: r.pick(['range', 'twoLargest', 'aboveAvg'] as const) }),
  (p) => {
    need(new Set(p.vals).size === 6);
    const sorted = [...p.vals].sort((a, b) => b - a);
    const avg = sum(p.vals) / 6;
    const ans = p.ask === 'range' ? sorted[0]! - sorted[5]! : p.ask === 'twoLargest' ? sorted[0]! + sorted[1]! : p.vals.filter((v) => v > avg).length;
    need(p.ask !== 'aboveAvg' || (ans >= 2 && ans <= 4 && Math.abs(p.vals.reduce((m, v) => Math.min(m, Math.abs(v - avg)), 99)) > 0.4));
    const wrong = intWrong(ans, p.ask === 'range' ? [sorted[0]!, sorted[0]! - sorted[1]!, sorted[0]! + sorted[5]!] : p.ask === 'twoLargest' ? [sorted[0]!, sorted[0]! + sorted[2]!, sorted[1]! + sorted[2]!] : [3, 2, 4, 5], { min: 0 });
    const tab = arrTable('m', [1, 2, 3, 4, 5, 6], 'S', p.vals);
    const ask = {
      range: L("eng ko'p va eng kam sotuv oylari orasidagi farqni", 'разность между наибольшей и наименьшей продажами', 'eń kóp hám eń kem satıw aylar arasındaǵı ayırmanı', 'the difference between the highest and lowest sales'),
      twoLargest: L("eng ko'p sotilgan ikki oy sotuvlari yig'indisini", 'сумму продаж двух самых успешных месяцев', 'eń kóp satılǵan eki ay satıwları qosındısın', 'the total sales of the two best months'),
      aboveAvg: L("oylik o'rtachadan ko'p sotilgan oylar sonini", 'число месяцев с продажами выше среднего', 'aylıq ortashadan kóp satılǵan aylar sanın', 'the number of months with above-average sales'),
    }[p.ask];
    return {
      stem: L(
        `Do'konning yarim yillik sotuvi (dona) jadvalda berilgan (1-6 — oy raqami): ${M(tab)}. ${askUz(ask)}`,
        `Продажи магазина за полгода (в штуках) даны в таблице (1-6 — номер месяца): ${M(tab)}. Найдите ${ask.ru}.`,
        `Dúkannıń yarım jıllıq satıwı (dana) kestede berilgen (1-6 — ay nomeri): ${M(tab)}. ${ask.kaa} tabıń.`, // kaa: tekshirilsin
        `A shop's half-year sales (units) are given in the table (1-6 is the month number): ${M(tab)}. Find ${ask.en}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(L(`Kamayish tartibida: ${M(numList(sorted))}.`, `По убыванию: ${M(numList(sorted))}.`, `Kemeyiw tártibinde: ${M(numList(sorted))}.`, `In decreasing order: ${M(numList(sorted))}.`), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Jadvaldagi eng katta va eng kichik qiymatni adashtirish yoki o'rtachadan farq qilmaydigan oyni sanash.",
        'Путают наибольшее и наименьшее значения либо относят к «выше среднего» месяцы, равные среднему.',
        "Kestedegi eń úlken hám eń kishi mánisti shatastırıw yamasa ortashadan parqlanbaytuǵın aydı sanaw.", // kaa: tekshirilsin
        'Mixing up the largest and smallest values, or counting months equal to the average.',
      ),
    };
  },
);
const askUz = (a: L10n): string => `${a.uz.charAt(0).toUpperCase()}${a.uz.slice(1)} toping.`;

// --- 96: raqamlardan sonlar yasash (qaytarilmaydi) (L2) ---
interface DigitsP {
  digits: number[];
  len: 3 | 4;
  cond: 'all' | 'even' | 'div5';
}
y1T<DigitsP>(
  'cb-digit-numbers',
  96,
  'L2',
  170,
  (r) => ({ digits: r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, r.int(5, 6)).sort((a, b) => a - b), len: r.pick([3, 4] as const), cond: r.pick(['all', 'even', 'div5'] as const) }),
  (p) => {
    const count = (cond: string): number => {
      let c = 0;
      const used: boolean[] = p.digits.map(() => false);
      const rec = (pos: number, val: number, last: number): void => {
        if (pos === p.len) {
          if (cond === 'all' || (cond === 'even' && last % 2 === 0) || (cond === 'div5' && last % 5 === 0)) c++;
          return;
        }
        for (let i = 0; i < p.digits.length; i++) {
          if (used[i] || (pos === 0 && p.digits[i] === 0)) continue;
          used[i] = true;
          rec(pos + 1, val * 10 + p.digits[i]!, p.digits[i]!);
          used[i] = false;
        }
      };
      rec(0, 0, 0);
      return c;
    };
    const ans = count(p.cond);
    const all = count('all');
    const withZero = p.digits.includes(0);
    need(ans >= 6 && ans <= 400 && (p.cond === 'all' ? withZero : true) && all !== ans);
    const n = p.digits.length;
    const naive = (() => {
      let v = 1;
      for (let i = 0; i < p.len; i++) v *= n - i;
      return v;
    })();
    const wrong = intWrong(ans, [all, naive, n ** p.len, Math.round(all / 2), naive / 2].map((v) => Math.round(v)), { min: 1 });
    const condT = {
      all: L("", '', '', ''),
      even: L(' juft', ' чётных', ' jup', ' even'),
      div5: L(" 5 ga bo'linadigan", ', делящихся на 5,', " 5 ke bólinetuǵın", ' divisible by 5'),
    }[p.cond];
    return {
      stem: L(
        `${M(numList(p.digits))} raqamlardan (har bir raqam bir martadan ishlatiladi) nechta ${mi(p.len)} xonali${condT.uz} son tuzish mumkin?`,
        `Сколько ${mi(p.len)}-значных${condT.ru} чисел можно составить из цифр ${M(numList(p.digits))} (каждая цифра используется не более одного раза)?`,
        `${M(numList(p.digits))} sanlarınan (hár bir cifr bir retten qollanıladı) neshe ${mi(p.len)} xonalı${condT.kaa} san dúziw múmkin?`, // kaa: tekshirilsin
        `How many ${mi(p.len)}-digit${condT.en} numbers can be formed from the digits ${M(numList(p.digits))} (each digit used at most once)?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(L("Oxirgi raqam sharti bo'yicha avval oxirgi o'rinni, keyin birinchisini (0 bo'lmasligi shart) tanlaymiz va ko'paytirish qoidasini qo'llaymiz.", 'Сначала выбираем последнюю цифру по условию, затем первую (она не 0) и применяем правило произведения.', "Aqırǵı cifrdı shárt boyınsha, soń birinshisin (0 bolmawı shárt) tańlap, kóbeytiw qaǵıydasın qollanamız.", 'Choose the last digit by the condition, then the first (non-zero), and apply the product rule.'), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Birinchi o'rinda 0 raqamini ham hisobga olish yoki oxirgi raqam shartini inobatga olmaslik.",
        'Допускают цифру 0 на первом месте или не учитывают условие на последнюю цифру.',
        "Birinshi orında 0 cifrın da esapqa alıw yamasa aqırǵı cifr shártin esapqa almaw.", // kaa: tekshirilsin
        'Allowing 0 in the first place, or ignoring the condition on the last digit.',
      ),
    };
  },
);

// --- 97: qatorga o'tqazish: ikki kishi yonma-yon yoki yonma-yon emas (L2) ---
interface AdjP {
  n: number;
  kind: 'together' | 'apart';
}
y1T<AdjP>(
  'cb-arrange-adjacent',
  97,
  'L2',
  140,
  (r) => ({ n: r.int(5, 8), kind: r.pick(['together', 'apart'] as const) }),
  (p) => {
    const together = 2 * fact(p.n - 1);
    const ans = p.kind === 'together' ? together : fact(p.n) - together;
    const wrong = intWrong(ans, [fact(p.n), fact(p.n - 1), together, fact(p.n) - fact(p.n - 1), fact(p.n - 2) * 2], { min: 1 });
    return {
      stem: L(
        `${mi(p.n)} kishi bir qatorga o'tiradi. Ikki tanlangan kishi ${p.kind === 'together' ? 'yonma-yon' : 'yonma-yon emas'} o'tiradigan o'tqazishlar soni nechta?`,
        `${mi(p.n)} человек садятся в ряд. Сколькими способами можно их рассадить так, чтобы двое выбранных ${p.kind === 'together' ? 'сидели рядом' : 'не сидели рядом'}?`,
        `${mi(p.n)} adam bir qatarǵa otıradı. Eki tańlanǵan adam ${p.kind === 'together' ? 'janbasında' : 'janbasında emes'} otıratuǵın otırǵızıwlar sanı neshe?`, // kaa: tekshirilsin
        `${mi(p.n)} people sit in a row. In how many ways can they sit so that two chosen people ${p.kind === 'together' ? 'sit next to each other' : 'do not sit next to each other'}?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(L(`Yonma-yon o'tirganlarni bitta "blok" deb olamiz: ${M(`2\\cdot ${p.n - 1}!=${together}`)}.${p.kind === 'apart' ? ` Yonma-yon emas: ${M(`${p.n}!-${together}=${ans}`)}.` : ''}`, `Считаем двоих рядом одним «блоком»: ${M(`2\\cdot ${p.n - 1}!=${together}`)}.${p.kind === 'apart' ? ` Не рядом: ${M(`${p.n}!-${together}=${ans}`)}.` : ''}`, `Janbaslap otırǵanlardı bir «blok» dep alamız: ${M(`2\\cdot ${p.n - 1}!=${together}`)}.${p.kind === 'apart' ? ` Janbasında emes: ${M(`${p.n}!-${together}=${ans}`)}.` : ''}`, `Treat the pair as one block: ${M(`2\\cdot ${p.n - 1}!=${together}`)}.${p.kind === 'apart' ? ` Not adjacent: ${M(`${p.n}!-${together}=${ans}`)}.` : ''}`), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Blok ichidagi ikki kishining o'rin almashtirishini ($2$ ga ko'paytirishni) unutish.",
        'Забывают умножить на $2$ за перестановку двоих внутри блока.',
        "Blok ishindegi eki adamnıń orın almasıwın ($2$ ge kóbeytiwdi) umıtıw.", // kaa: tekshirilsin
        'Forgetting the factor $2$ for swapping the two people inside the block.',
      ),
    };
  },
);

// --- 97: guruhlash: qo'mita tanlash (L2) ---
interface CommitteeP {
  m: number;
  w: number;
  k: number;
  kind: 'atLeastOneW' | 'exactW';
  j: number;
}
y1T<CommitteeP>(
  'cb-committee',
  97,
  'L2',
  170,
  (r) => ({ m: r.int(4, 8), w: r.int(3, 6), k: r.int(3, 4), kind: r.pick(['atLeastOneW', 'exactW'] as const), j: r.int(1, 2) }),
  (p) => {
    need(p.k < p.m + p.w && p.j < p.k && p.j <= p.w && p.k - p.j <= p.m);
    const ans = p.kind === 'atLeastOneW' ? choose(p.m + p.w, p.k) - choose(p.m, p.k) : choose(p.w, p.j) * choose(p.m, p.k - p.j);
    need(ans >= 10 && ans <= 800);
    const wrong = intWrong(ans, [choose(p.m + p.w, p.k), p.kind === 'atLeastOneW' ? p.w * choose(p.m + p.w - 1, p.k - 1) : choose(p.w, p.j) + choose(p.m, p.k - p.j), choose(p.m, p.k), p.w * p.m * (p.k - 1)], { min: 1 });
    return {
      stem: L(
        `${mi(p.m)} ta yigit va ${mi(p.w)} ta qizdan ${mi(p.k)} kishilik guruh tuziladi. ${p.kind === 'atLeastOneW' ? 'Guruhda kamida bitta qiz bo\'lsa' : `Guruhda roppa-rosa ${mi(p.j)} ta qiz bo'lsa`}, guruhni necha usul bilan tuzish mumkin?`,
        `Из ${mi(p.m)} юношей и ${mi(p.w)} девушек составляют группу из ${mi(p.k)} человек. Сколько существует способов, если ${p.kind === 'atLeastOneW' ? 'в группе есть хотя бы одна девушка' : `в группе ровно ${mi(p.j)} девушек`}?`,
        `${mi(p.m)} jigit hám ${mi(p.w)} qızdan ${mi(p.k)} adamlıq toparlar dúziledi. ${p.kind === 'atLeastOneW' ? 'Toparda keminde bir qız bolsa' : `Toparda dál ${mi(p.j)} qız bolsa`}, toparlardı neshe usıl menen dúziw múmkin?`, // kaa: tekshirilsin
        `A group of ${mi(p.k)} is formed from ${mi(p.m)} boys and ${mi(p.w)} girls. In how many ways if ${p.kind === 'atLeastOneW' ? 'the group has at least one girl' : `the group has exactly ${mi(p.j)} girls`}?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(p.kind === 'atLeastOneW' ? M(`C_{${p.m + p.w}}^{${p.k}}-C_{${p.m}}^{${p.k}}=${choose(p.m + p.w, p.k)}-${choose(p.m, p.k)}=${ans}`) : M(`C_{${p.w}}^{${p.j}}\\cdot C_{${p.m}}^{${p.k - p.j}}=${choose(p.w, p.j)}\\cdot ${choose(p.m, p.k - p.j)}=${ans}`), finS(mi(ans))),
      mis: L(
        "\"Kamida bitta\" shartini bitta qizni tanlab qolganlarini ixtiyoriy tanlash deb hisoblash (takrorlar paydo bo'ladi): to'ldiruvchi usul ishonchli.",
        'Считают «хотя бы одна» как выбор одной девушки и произвольных остальных (появляются повторы): надёжнее метод дополнения.',
        "«Keminde bir» shártin bir qızdı tańlap qalǵanların erkin tańlaw dep esaplaw (qaytalanıwlar payda boladı): tolıqtırıwshı usıl isenimli.", // kaa: tekshirilsin
        'Treating "at least one" as picking one girl and anyone else (creates repeats): the complement method is safer.',
      ),
    };
  },
);

// --- 97: aylana stol atrofida o'tqazish (L3) ---
interface CircleP {
  n: number;
  kind: 'plain' | 'together';
}
y1T<CircleP>(
  'cb-circular',
  97,
  'L3',
  170,
  (r) => ({ n: r.int(5, 8), kind: r.pick(['plain', 'together'] as const) }),
  (p) => {
    const ans = p.kind === 'plain' ? fact(p.n - 1) : 2 * fact(p.n - 2);
    const wrong = intWrong(ans, [fact(p.n), fact(p.n - 2), 2 * fact(p.n - 1), fact(p.n - 1) / 2, 2 * fact(p.n - 3)].map(Math.round), { min: 1 });
    return {
      stem: L(
        `${mi(p.n)} kishi aylana stol atrofiga o'tiradi (aylantirib hosil qilingan o'tqazishlar bir xil hisoblanadi). ${p.kind === 'plain' ? "O'tqazishlar soni nechta?" : "Ikki tanlangan kishi yonma-yon o'tirsa, o'tqazishlar soni nechta?"}`,
        `${mi(p.n)} человек садятся за круглый стол (рассадки, совпадающие при повороте, считаются одинаковыми). ${p.kind === 'plain' ? 'Сколько существует рассадок?' : 'Сколько существует рассадок, если двое выбранных сидят рядом?'}`,
        `${mi(p.n)} adam aylana stol átirapına otıradı (aylandırıp alınǵan otırǵızıwlar birdey esaplanadı). ${p.kind === 'plain' ? 'Otırǵızıwlar sanı neshe?' : 'Eki tańlanǵan adam janbasında otırsa, otırǵızıwlar sanı neshe?'}`, // kaa: tekshirilsin
        `${mi(p.n)} people sit at a round table (seatings that differ by a rotation are the same). ${p.kind === 'plain' ? 'How many seatings are there?' : 'How many seatings are there if two chosen people sit next to each other?'}`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(L(`Bir kishini o'rnatib qo'yamiz: qolgan ${mi(p.n - 1)} kishi ${M(`${p.n - 1}!`)} usulda. ${p.kind === 'together' ? `Yonma-yon juftlik bitta blok: ${M(`2\\cdot ${p.n - 2}!`)}.` : ''}`, `Фиксируем одного человека: остальные ${mi(p.n - 1)} — ${M(`${p.n - 1}!`)} способами. ${p.kind === 'together' ? `Пара рядом как один блок: ${M(`2\\cdot ${p.n - 2}!`)}.` : ''}`, `Bir adamdı bekitemiz: qalǵan ${mi(p.n - 1)} adam ${M(`${p.n - 1}!`)} usılda. ${p.kind === 'together' ? `Janbasındaǵı jup bir blok: ${M(`2\\cdot ${p.n - 2}!`)}.` : ''}`, `Fix one person: the other ${mi(p.n - 1)} can be arranged in ${M(`${p.n - 1}!`)} ways. ${p.kind === 'together' ? `The adjacent pair is one block: ${M(`2\\cdot ${p.n - 2}!`)}.` : ''}`), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Aylanma o'tqazishlarni to'g'ri qator o'tqazishlari ($n!$) bilan adashtirish.",
        'Путают круговые рассадки с линейными ($n!$).',
        "Aylanba otırǵızıwlardı tuwrı qatar otırǵızıwları ($n!$) menen shatastırıw.", // kaa: tekshirilsin
        'Confusing circular seatings with linear arrangements ($n!$).',
      ),
    };
  },
);

// --- 97: harflarning o'rin almashtirishlari (takrorli) (L2) ---
const WORDS = ['MATEMATIKA', 'ARIFMETIKA', 'SAMARQAND', 'TOSHKENT', 'ANDIJON', 'BUXORO', 'NAMANGAN', 'ALGEBRA', 'GEOMETRIYA', 'KOMBINATORIKA'];
interface WordP {
  w: string;
}
y1T<WordP>(
  'cb-letter-perm',
  97,
  'L2',
  150,
  (r) => ({ w: r.pick(WORDS) }),
  (p) => {
    const cnt = new Map<string, number>();
    for (const ch of p.w) cnt.set(ch, (cnt.get(ch) ?? 0) + 1);
    let denom = 1;
    for (const c of cnt.values()) denom *= fact(c);
    const ans = fact(p.w.length) / denom;
    need(Number.isInteger(ans) && ans <= 1000000 && denom > 1);
    const wrong = intWrong(ans, [fact(p.w.length), fact(p.w.length) / (denom === 2 ? 1 : 2), ans * 2, ans / 2, fact(p.w.length - 1)].map(Math.round), { min: 1 });
    return {
      stem: L(
        `«${p.w}» so'zidagi harflarni o'rin almashtirib, nechta turli harflar ketma-ketligi hosil qilish mumkin?`,
        `Сколько различных последовательностей букв можно получить перестановкой букв слова «${p.w}»?`,
        `«${p.w}» sózindegi háriplerdi orın almastırıp, neshe túrli háripler izbe-izligin payda etiw múmkin?`, // kaa: tekshirilsin
        `How many different letter sequences can be made by rearranging the letters of «${p.w}»?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(M(`\\frac{${p.w.length}!}{${[...cnt.values()].filter((c) => c > 1).map((c) => `${c}!`).join('\\cdot ')}}=${ans}`), finS(mi(ans))),
      mis: L(
        "Takrorlanuvchi harflar uchun bo'lishni unutish ($n!$ ni to'g'ridan-to'g'ri olish).",
        'Забывают делить на факториалы повторяющихся букв (берут просто $n!$).',
        "Qaytalanıwshı háripler ushın bóliwdi umıtıw ($n!$ di tuwrıdan-tuwrı alıw).", // kaa: tekshirilsin
        'Forgetting to divide for repeated letters (taking just $n!$).',
      ),
    };
  },
);

// --- 98: Nyuton binomi: x^k oldidagi koeffitsiyent (L2) ---
interface BinomP {
  a: number;
  b: number;
  n: number;
  k: number;
}
y1T<BinomP>(
  'cb-binomial-coef',
  98,
  'L2',
  170,
  (r) => ({ a: r.pick([1, 2, 3]), b: r.pick([-3, -2, -1, 1, 2, 3]), n: r.int(4, 8), k: r.int(2, 6) }),
  (p) => {
    need(p.k <= p.n - 1 && p.k >= 2);
    const ans = choose(p.n, p.k) * p.a ** p.k * p.b ** (p.n - p.k);
    need(Math.abs(ans) >= 6 && Math.abs(ans) <= 30000);
    const wrong = intWrong(ans, [choose(p.n, p.k), choose(p.n, p.k) * p.a ** p.k, -ans, choose(p.n, p.k) * p.b ** (p.n - p.k), choose(p.n, p.k - 1) * p.a ** (p.k - 1) * p.b ** (p.n - p.k + 1)], { min: -40000 });
    const base = `${p.a === 1 ? '' : p.a}x${p.b < 0 ? '-' : '+'}${Math.abs(p.b)}`;
    return {
      stem: L(
        `${M(`(${base})^{${p.n}}`)} ifoda ochilganda ${M(`x^{${p.k}}`)} oldidagi koeffitsiyentni toping.`,
        `Найдите коэффициент при ${M(`x^{${p.k}}`)} в разложении ${M(`(${base})^{${p.n}}`)}.`,
        `${M(`(${base})^{${p.n}}`)} aańlatpası ashılǵanda ${M(`x^{${p.k}}`)} aldındaǵı koefficientti tabıń.`, // kaa: tekshirilsin
        `Find the coefficient of ${M(`x^{${p.k}}`)} in the expansion of ${M(`(${base})^{${p.n}}`)}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(M(`C_{${p.n}}^{${p.k}}\\cdot ${p.a}^{${p.k}}\\cdot (${p.b})^{${p.n - p.k}}=${choose(p.n, p.k)}\\cdot ${p.a ** p.k}\\cdot ${p.b ** (p.n - p.k)}=${ans}`), finS(mi(ans))),
      mis: L(
        "Binomial koeffitsiyentni ko'paytirib, $a^{k}$ va $b^{n-k}$ darajalarini (ishorali) hisobga olmaslik.",
        'Берут только биномиальный коэффициент, не учитывая $a^{k}$ и $b^{n-k}$ (с учётом знака).',
        "Binomial koefficientti alıp, $a^{k}$ hám $b^{n-k}$ dárejelerin (belgisi menen) esapqa almaw.", // kaa: tekshirilsin
        'Taking only the binomial coefficient and ignoring $a^{k}$ and $b^{n-k}$ (with sign).',
      ),
    };
  },
);

// --- 98: Nyuton binomi: ochiq javobli (a: koeffitsiyentlar yig'indisi, b: x^k oldidagi koeffitsiyent) (L3) ---
interface BinomOP {
  a: number;
  b: number;
  n: number;
  k: number;
}
oT<BinomOP>(
  'cb-binomial-o',
  98,
  'L3',
  230,
  (r) => ({ a: r.pick([1, 2, 3]), b: r.pick([-2, -1, 1, 2, 3]), n: r.int(4, 7), k: r.int(2, 5) }),
  (p) => {
    need(p.k < p.n && Math.abs(p.a + p.b) >= 1);
    const total = (p.a + p.b) ** p.n;
    const coef = choose(p.n, p.k) * p.a ** p.k * p.b ** (p.n - p.k);
    need(Math.abs(total) <= 3000 && Math.abs(coef) <= 3000 && coef !== total && total !== 0);
    const base = `${p.a === 1 ? '' : p.a}x${p.b < 0 ? '-' : '+'}${Math.abs(p.b)}`;
    return {
      stem: L(
        `${M(`(${base})^{${p.n}}`)} ifoda ochib chiqilgan.`,
        `Выражение ${M(`(${base})^{${p.n}}`)} разложено по формуле бинома.`,
        `${M(`(${base})^{${p.n}}`)} aańlatpası ashıp shıǵılǵan.`, // kaa: tekshirilsin
        `The expression ${M(`(${base})^{${p.n}}`)} is expanded using the binomial theorem.`,
      ),
      a: { prompt: L("Barcha koeffitsiyentlar yig'indisini toping.", 'Найдите сумму всех коэффициентов.', 'Barlıq koefficientler qosındısın tabıń.', 'Find the sum of all the coefficients.'), key: fInt(total) }, // kaa: tekshirilsin
      b: { prompt: L(`${M(`x^{${p.k}}`)} oldidagi koeffitsiyentni toping.`, `Найдите коэффициент при ${M(`x^{${p.k}}`)}.`, `${M(`x^{${p.k}}`)} aldındaǵı koefficientti tabıń.`, `Find the coefficient of ${M(`x^{${p.k}}`)}.`), key: fInt(coef) }, // kaa: tekshirilsin
      sol: jn(M(`x=1:\\ (${p.a}+${p.b})^{${p.n}}=${total}`), M(`C_{${p.n}}^{${p.k}}\\cdot ${p.a}^{${p.k}}\\cdot (${p.b})^{${p.n - p.k}}=${coef}`)),
      mis: L(
        "Koeffitsiyentlar yig'indisi uchun $x=1$ ni qo'yish o'rniga binomial koeffitsiyentlar yig'indisini ($2^{n}$) olish.",
        'Берут сумму биномиальных коэффициентов ($2^{n}$) вместо подстановки $x=1$.',
        "Koefficientler qosındısı ushın $x=1$ di qoyıw ornına binomial koefficientler qosındısın ($2^{n}$) alıw.", // kaa: tekshirilsin
        'Taking the sum of binomial coefficients ($2^{n}$) instead of substituting $x=1$.',
      ),
    };
  },
);

// --- 99: ikki o'yin kubigi (L1) ---
interface DiceP {
  kind: 'sumEq' | 'sumGe' | 'prodEven' | 'prodEq';
  v: number;
}
y1T<DiceP>(
  'pr-two-dice',
  99,
  'L1',
  120,
  (r) => {
    const kind = r.pick(['sumEq', 'sumGe', 'prodEven', 'prodEq'] as const);
    return { kind, v: kind === 'sumEq' ? r.int(3, 11) : kind === 'sumGe' ? r.int(7, 11) : kind === 'prodEq' ? r.pick([6, 8, 12, 4, 9]) : 0 };
  },
  (p) => {
    let c = 0;
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++) {
        const ok = p.kind === 'sumEq' ? a + b === p.v : p.kind === 'sumGe' ? a + b >= p.v : p.kind === 'prodEven' ? (a * b) % 2 === 0 : a * b === p.v;
        if (ok) c++;
      }
    need(c >= 2 && c < 36);
    const ans = frac(c, 36);
    const wrong = fracWrong(ans, [frac(c, 21), frac(c, 12), frac(c - 1, 36), frac(c + 1, 36), frac(c, 6)]);
    const cond = {
      sumEq: L(`ochkolar yig'indisi ${mi(p.v)} ga teng`, `сумма очков равна ${mi(p.v)}`, `kózler qosındısı ${mi(p.v)} ge teń`, `the sum of the points is ${mi(p.v)}`),
      sumGe: L(`ochkolar yig'indisi kamida ${mi(p.v)}`, `сумма очков не меньше ${mi(p.v)}`, `kózler qosındısı keminde ${mi(p.v)}`, `the sum of the points is at least ${mi(p.v)}`),
      prodEven: L("ochkolar ko'paytmasi juft", 'произведение очков чётно', 'kózler kóbeymesi jup', 'the product of the points is even'),
      prodEq: L(`ochkolar ko'paytmasi ${mi(p.v)} ga teng`, `произведение очков равно ${mi(p.v)}`, `kózler kóbeymesi ${mi(p.v)} ge teń`, `the product of the points is ${mi(p.v)}`),
    }[p.kind];
    return {
      stem: L(
        `Ikkita o'yin kubigi birga tashlanadi. ${cond.uz.charAt(0).toUpperCase()}${cond.uz.slice(1)} bo'lish ehtimolini toping.`,
        `Бросают два игральных кубика. Найдите вероятность того, что ${cond.ru}.`,
        `Eki oyın kubigi birge taslanadı. ${cond.kaa.charAt(0).toUpperCase()}${cond.kaa.slice(1)} bolıw itimallıǵın tabıń.`, // kaa: tekshirilsin
        `Two dice are rolled. Find the probability that ${cond.en}.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(L(`Qulay holatlar ${mi(c)} ta, barcha holatlar ${M('6\\cdot 6=36')}.`, `Благоприятных исходов ${mi(c)}, всех исходов ${M('6\\cdot 6=36')}.`, `Qolaylı jaǵdaylar ${mi(c)} dana, barlıq jaǵdaylar ${M('6\\cdot 6=36')}.`, `Favourable outcomes: ${mi(c)}, all outcomes: ${M('6\\cdot 6=36')}.`), M(`P=\\frac{${c}}{36}=${texFrac(ans)}`), finS(mf(ans))), // kaa: tekshirilsin
      mis: L(
        "Barcha holatlar soni sifatida $21$ ni (tartibsiz juftliklar) olish: kubiklar farqlanadi, jami $36$ ta.",
        'Берут 21 (неупорядоченные пары) вместо 36: кубики различимы.',
        "Barlıq jaǵdaylar sanı retinde $21$ di (tártipsiz juplar) alıw: kubikler parıqlanadı, jámi $36$ dana.", // kaa: tekshirilsin
        'Using 21 (unordered pairs) instead of 36: the dice are distinguishable.',
      ),
    };
  },
);

// --- 99: qaytarilmaydigan ikkita shar (L2) ---
interface BallsP {
  r: number;
  b: number;
  kind: 'same' | 'diff' | 'bothRed';
}
y1T<BallsP>(
  'pr-balls-two',
  99,
  'L2',
  160,
  (r) => ({ r: r.int(3, 9), b: r.int(3, 9), kind: r.pick(['same', 'diff', 'bothRed'] as const) }),
  (p) => {
    const n = p.r + p.b;
    const tot = choose(n, 2);
    const fav = p.kind === 'same' ? choose(p.r, 2) + choose(p.b, 2) : p.kind === 'diff' ? p.r * p.b : choose(p.r, 2);
    const ans = frac(fav, tot);
    need(ans.d <= 60 && fav >= 3);
    const withRepl = p.kind === 'same' ? frac(p.r * p.r + p.b * p.b, n * n) : p.kind === 'diff' ? frac(2 * p.r * p.b, n * n) : frac(p.r * p.r, n * n);
    const wrong = fracWrong(ans, [withRepl, frac(fav, n * n), frac(fav, n * (n - 1)), p.kind === 'diff' ? frac(p.r * p.b, tot * 2) : frac(choose(p.r, 2) + choose(p.b, 2) + p.r * p.b, tot)]);
    const ask = {
      same: L('ikkalasi bir xil rangda', 'оба шара одного цвета', 'ekewi de bir túsli', 'both are the same colour'),
      diff: L('turli rangda', 'шары разного цвета', 'túrli túste', 'they are of different colours'),
      bothRed: L('ikkalasi ham qizil', 'оба шара красные', 'ekewi de qızıl', 'both are red'),
    }[p.kind];
    return {
      stem: L(
        `Qutida ${mi(p.r)} ta qizil va ${mi(p.b)} ta ko'k shar bor. Tavakkaliga bir vaqtda ikkita shar olinadi. ${ask.uz.charAt(0).toUpperCase()}${ask.uz.slice(1)} bo'lish ehtimolini toping.`,
        `В коробке ${mi(p.r)} красных и ${mi(p.b)} синих шаров. Наугад одновременно берут два шара. Найдите вероятность того, что ${ask.ru}.`,
        `Qutıda ${mi(p.r)} qızıl hám ${mi(p.b)} kók shar bar. Tosattan bir waqıtta eki shar alınadı. ${ask.kaa.charAt(0).toUpperCase()}${ask.kaa.slice(1)} bolıw itimallıǵın tabıń.`, // kaa: tekshirilsin
        `A box holds ${mi(p.r)} red and ${mi(p.b)} blue balls. Two balls are drawn at random at once. Find the probability that ${ask.en}.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(M(`P=\\frac{${fav}}{C_{${n}}^{2}}=\\frac{${fav}}{${tot}}=${texFrac(ans)}`), finS(mf(ans))),
      mis: L(
        "Sharlar qaytarilmasligini hisobga olmay ehtimollarni $n^{2}$ ga bo'lish.",
        'Делят на $n^{2}$, не учитывая, что шары не возвращаются.',
        "Sharlar qaytarılmaytuǵının esapqa almay itimallıqlardı $n^{2}$ qa bóliw.", // kaa: tekshirilsin
        'Dividing by $n^{2}$ and ignoring that the balls are not returned.',
      ),
    };
  },
);

// --- 100: mustaqil hodisalar: ikki o'qchi (L2) ---
interface ShootersP {
  a: number;
  b: number;
  kind: 'both' | 'atLeastOne' | 'exactlyOne' | 'none';
}
y1T<ShootersP>(
  'pr-shooters',
  100,
  'L2',
  150,
  (r) => ({ a: r.int(2, 9), b: r.int(2, 9), kind: r.pick(['both', 'atLeastOne', 'exactlyOne', 'none'] as const) }),
  (p) => {
    need(p.a !== p.b);
    const pa = frac(p.a, 10);
    const pb = frac(p.b, 10);
    const both = p.a * p.b;
    const none = (10 - p.a) * (10 - p.b);
    const ans = frac(p.kind === 'both' ? both : p.kind === 'none' ? none : p.kind === 'atLeastOne' ? 100 - none : p.a * (10 - p.b) + p.b * (10 - p.a), 100);
    const wrong = fracWrong(ans, [frac(p.a + p.b, 20), frac(p.a + p.b, 10), frac(both, 100), frac(100 - none, 100), frac(p.a * (10 - p.b) + p.b * (10 - p.a) + both, 100), frac(none, 100)].filter((f) => f.n / f.d <= 1));
    const ask = {
      both: L('ikkalasi ham nishonga uradi', 'попадут оба', 'ekewi de nıshanǵa uradı', 'both hit the target'),
      atLeastOne: L('kamida biri nishonga uradi', 'попадёт хотя бы один', 'keminde biri nıshanǵa uradı', 'at least one hits the target'),
      exactlyOne: L('faqat bittasi nishonga uradi', 'попадёт ровно один', 'tek bireui nıshanǵa uradı', 'exactly one hits the target'),
      none: L('hech biri nishonga urmaydi', 'не попадёт ни один', 'hesh biri nıshanǵa urmaydı', 'neither hits the target'),
    }[p.kind];
    return {
      stem: L(
        `Ikki o'qchi bir-biriga bog'liq bo'lmagan holda nishonga o'q uzadi. Ularning nishonga urish ehtimollari ${md(pa)} va ${md(pb)}. ${ask.uz.charAt(0).toUpperCase()}${ask.uz.slice(1)} ehtimolini toping.`,
        `Два стрелка стреляют по мишени независимо друг от друга. Вероятности попадания равны ${md(pa)} и ${md(pb)}. Найдите вероятность того, что ${ask.ru}.`,
        `Eki oqshı bir-birine baylanıssız túrde nıshanǵa atadı. Olardıń nıshanǵa uruw itimallıqları ${md(pa)} hám ${md(pb)}. ${ask.kaa.charAt(0).toUpperCase()}${ask.kaa.slice(1)} itimallıǵın tabıń.`, // kaa: tekshirilsin
        `Two shooters fire at a target independently. Their hit probabilities are ${md(pa)} and ${md(pb)}. Find the probability that ${ask.en}.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(L("Mustaqil hodisalar ehtimollari ko'paytiriladi; \"kamida bittasi\" = 1 − \"hech biri\".", 'Вероятности независимых событий перемножаются; «хотя бы один» = 1 − «ни один».', "Baylanıssız hádiyseler itimallıqları kóbeytiledi; «keminde biri» = 1 − «hesh biri».", 'Probabilities of independent events multiply; "at least one" = 1 − "none".'), M(`P=${texFrac(ans)}`), finS(mf(ans))), // kaa: tekshirilsin
      mis: L(
        "Mustaqil hodisalar ehtimollarini qo'shish ($p_{1}+p_{2}$) yoki ko'paytirish o'rniga o'rtacha olish.",
        'Складывают вероятности независимых событий ($p_{1}+p_{2}$) или берут среднее вместо произведения.',
        "Baylanıssız hádiyseler itimallıqların qosıw ($p_{1}+p_{2}$) yamasa kóbeytiw ornına ortasha alıw.", // kaa: tekshirilsin
        'Adding probabilities of independent events ($p_{1}+p_{2}$), or averaging instead of multiplying.',
      ),
    };
  },
);

// --- 100: to'la ehtimollik formulasi (L3) ---
interface TotalProbP {
  share: number;
  pa: number;
  pb: number;
}
y1T<TotalProbP>(
  'pr-total-prob',
  100,
  'L3',
  200,
  (r) => ({ share: r.pick([20, 30, 40, 60, 70]), pa: r.int(1, 6), pb: r.int(1, 6) }),
  (p) => {
    need(p.pa !== p.pb);
    const ans = frac(p.share * p.pa + (100 - p.share) * p.pb, 10000);
    const wrong = fracWrong(ans, [frac(p.pa + p.pb, 200), frac(p.pa * p.pb, 100), frac(p.share * p.pa, 10000), frac(p.pa + p.pb, 100), frac((100 - p.share) * p.pb, 10000)], { lo: 0, hi: 0.2 });
    return {
      stem: L(
        `Zavod mahsulotining ${mi(p.share)}% i birinchi stanokda, qolgani ikkinchi stanokda ishlab chiqariladi. Birinchi stanok mahsulotining ${mi(p.pa)}% i, ikkinchisiniki ${mi(p.pb)}% i nuqsonli. Tavakkaliga olingan mahsulot nuqsonli bo'lish ehtimolini toping.`,
        `${mi(p.share)}% продукции завода производит первый станок, остальное — второй. Брак составляет ${mi(p.pa)}% продукции первого станка и ${mi(p.pb)}% второго. Найдите вероятность того, что случайно выбранное изделие бракованное.`,
        `Zavod ónimleriniń ${mi(p.share)}% i birinshi stanokta, qalǵanı ekinshi stanokta islep shıǵarıladı. Birinshi stanok ónimleriniń ${mi(p.pa)}% i, ekinshisiniki ${mi(p.pb)}% i nuqsanlı. Tosattan alınǵan ónimniń nuqsanlı bolıw itimallıǵın tabıń.`, // kaa: tekshirilsin
        `${mi(p.share)}% of a factory's output comes from the first machine, the rest from the second. ${mi(p.pa)}% of the first machine's items and ${mi(p.pb)}% of the second's are defective. Find the probability that a randomly chosen item is defective.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(M(`P=${texFrac(frac(p.share, 100))}\\cdot ${texFrac(frac(p.pa, 100))}+${texFrac(frac(100 - p.share, 100))}\\cdot ${texFrac(frac(p.pb, 100))}=${texFrac(ans)}`), finS(mf(ans))),
      mis: L(
        "Nuqson foizlarining oddiy o'rtachasini olish (stanoklar ulushlarini hisobga olmaslik).",
        'Берут простое среднее процентов брака, не учитывая доли станков.',
        "Nuqsan procentleriniń ápiwayı ortashasın alıw (stanoklar úleslerin esapqa almaw).", // kaa: tekshirilsin
        'Taking the plain average of the defect rates and ignoring the machine shares.',
      ),
    };
  },
);

// --- 99: tanga tashlash: ochiq javobli (a: roppa-rosa k ta gerb, b: kamida bitta gerb) (L2) ---
interface CoinsOP {
  n: number;
  k: number;
}
oT<CoinsOP>(
  'pr-coins-o',
  99,
  'L2',
  190,
  (r) => ({ n: r.int(3, 5), k: r.int(1, 3) }),
  (p) => {
    need(p.k < p.n);
    const a = frac(choose(p.n, p.k), 2 ** p.n);
    const b = frac(2 ** p.n - 1, 2 ** p.n);
    return {
      stem: L(
        `Simmetrik tanga ${mi(p.n)} marta tashlanadi.`,
        `Симметричную монету бросают ${mi(p.n)} раз.`,
        `Simmetriyalı tıyın ${mi(p.n)} ret taslanadı.`, // kaa: tekshirilsin
        `A fair coin is tossed ${mi(p.n)} times.`,
      ),
      a: { prompt: L(`Roppa-rosa ${mi(p.k)} marta gerb (bosh tomon) tushish ehtimolini toping.`, `Найдите вероятность того, что орёл выпадет ровно ${mi(p.k)} раз.`, `Dál ${mi(p.k)} ret gerb túsiw itimallıǵın tabıń.`, `Find the probability of exactly ${mi(p.k)} heads.`), key: a, hint: true }, // kaa: tekshirilsin
      b: { prompt: L('Kamida bir marta gerb tushish ehtimolini toping.', 'Найдите вероятность того, что орёл выпадет хотя бы один раз.', 'Keminde bir ret gerb túsiw itimallıǵın tabıń.', 'Find the probability of at least one head.'), key: b, hint: true }, // kaa: tekshirilsin
      sol: jn(M(`P_{a}=\\frac{C_{${p.n}}^{${p.k}}}{2^{${p.n}}}=${texFrac(a)}`), M(`P_{b}=1-\\frac{1}{2^{${p.n}}}=${texFrac(b)}`)),
      mis: L(
        "Roppa-rosa $k$ ta gerb uchun qulay holatlar sonini $C_{n}^{k}$ o'rniga $1$ deb olish.",
        'Берут число благоприятных исходов равным $1$ вместо $C_{n}^{k}$.',
        "Dál $k$ gerb ushın qolaylı jaǵdaylar sanın $C_{n}^{k}$ ornına $1$ dep alıw.", // kaa: tekshirilsin
        'Taking the number of favourable outcomes as $1$ instead of $C_{n}^{k}$.',
      ),
    };
  },
);

// --- 103: tarif rejalarini solishtirish (L2) ---
interface PlansP {
  a0: number;
  a1: number;
  b0: number;
  b1: number;
}
y1T<PlansP>(
  'md-plans',
  103,
  'L2',
  170,
  (r) => ({ a0: r.int(5, 30) * 100, a1: r.int(8, 20) * 100, b0: r.int(20, 80) * 100, b1: r.int(3, 7) * 100 }),
  (p) => {
    need(p.b0 > p.a0 && p.a1 > p.b1);
    const x = (p.b0 - p.a0) / (p.a1 - p.b1);
    const ans = Math.floor(x) + 1;
    need(Number.isFinite(x) && x >= 2 && x <= 40 && ans >= 3);
    const wrong = intWrong(ans, [Math.floor(x), Math.ceil(x) === ans ? ans - 1 : Math.ceil(x), Math.round(x) === ans ? ans + 1 : Math.round(x), ans + 1], { min: 1 });
    return {
      stem: L(
        `Birinchi tarifda abonent to'lovi ${mi(p.a0)} so'm va har bir minut uchun ${mi(p.a1)} so'm; ikkinchi tarifda ${mi(p.b0)} so'm va har bir minut uchun ${mi(p.b1)} so'm. Ikkinchi tarif birinchisidan arzonga tushishi uchun oyiga kamida necha butun minut gaplashish kerak?`,
        `По первому тарифу абонентская плата ${mi(p.a0)} сумов и ${mi(p.a1)} сумов за минуту; по второму — ${mi(p.b0)} сумов и ${mi(p.b1)} сумов за минуту. Сколько целых минут в месяц нужно говорить, чтобы второй тариф стал выгоднее первого?`,
        `Birinshi tarifte abonent tólewi ${mi(p.a0)} swm hám hár bir minut ushın ${mi(p.a1)} swm; ekinshi tarifte ${mi(p.b0)} swm hám hár bir minut ushın ${mi(p.b1)} swm. Ekinshi tarif birinshisinen arzanǵa túsiwi ushın aynda keminde neshe pútin minut sóylesiw kerek?`, // kaa: tekshirilsin
        `Plan 1 costs ${mi(p.a0)} soums plus ${mi(p.a1)} soums per minute; plan 2 costs ${mi(p.b0)} soums plus ${mi(p.b1)} soums per minute. What is the smallest whole number of minutes per month for which plan 2 is cheaper than plan 1?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(M(`${p.a0}+${p.a1}x>${p.b0}+${p.b1}x\\Rightarrow x>\\frac{${p.b0 - p.a0}}{${p.a1 - p.b1}}=${texFrac(frac(p.b0 - p.a0, p.a1 - p.b1))}`), L(`Eng kichik butun ${M('x')}: ${mi(ans)}.`, `Наименьшее целое ${M('x')}: ${mi(ans)}.`, `Eń kishi pútin ${M('x')}: ${mi(ans)}.`, `The smallest integer ${M('x')}: ${mi(ans)}.`), finS(mi(ans))), // kaa: tekshirilsin
      mis: L(
        "Tenglik nuqtasini javob deb olish: qat'iy tengsizlik uchun keyingi butun son kerak.",
        'Берут точку равенства как ответ: для строгого неравенства нужно следующее целое число.',
        "Teńlik noqatın juwap dep alıw: qatań teńsizlik ushın keyingi pútin san kerek.", // kaa: tekshirilsin
        'Taking the break-even point as the answer: a strict inequality needs the next integer.',
      ),
    };
  },
);

// --- 113: kvadratik model: daromad yoki balandlikning eng katta qiymati (L2) ---
interface QuadModelP {
  pStar: number;
  k: number;
  ask: 'price' | 'revenue';
}
y1T<QuadModelP>(
  'md-quad-revenue',
  113,
  'L2',
  190,
  (r) => ({ pStar: r.int(5, 30), k: r.int(2, 8), ask: r.pick(['price', 'revenue'] as const) }),
  (p) => {
    const q0 = 2 * p.k * p.pStar;
    const rev = p.k * p.pStar * p.pStar;
    need(q0 <= 600 && rev <= 12000);
    const ans = p.ask === 'price' ? p.pStar : rev;
    const wrong = intWrong(ans, p.ask === 'price' ? [q0, p.pStar * 2, Math.round(q0 / p.k), p.pStar + p.k] : [p.pStar * q0, p.pStar * p.pStar, q0 * p.pStar - rev * 2, rev * 2], { min: 1 });
    return {
      stem: L(
        `Narx ${M('p')} (ming so'm) bo'lganda kuniga ${M(`q=${q0}-${p.k}p`)} dona mahsulot sotiladi. ${p.ask === 'price' ? "Kunlik tushum eng katta bo'ladigan narxni" : 'Kunlik eng katta tushumni (ming so\'m)'} toping.`,
        `При цене ${M('p')} (тыс. сумов) в день продаётся ${M(`q=${q0}-${p.k}p`)} единиц товара. Найдите ${p.ask === 'price' ? 'цену, при которой дневная выручка наибольшая' : 'наибольшую дневную выручку (тыс. сумов)'}.`,
        `Baha ${M('p')} (mıń swm) bolǵanda kúnine ${M(`q=${q0}-${p.k}p`)} dana ónim satıladı. ${p.ask === 'price' ? 'Kúnlik túsim eń úlken bolatuǵın bahanı' : 'Kúnlik eń úlken túsimdi (mıń swm)'} tabıń.`, // kaa: tekshirilsin
        `At price ${M('p')} (thousand soums) ${M(`q=${q0}-${p.k}p`)} items are sold per day. Find ${p.ask === 'price' ? 'the price that maximises daily revenue' : 'the maximum daily revenue (thousand soums)'}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(M(`R(p)=p(${q0}-${p.k}p)=-${p.k}p^{2}+${q0}p`), M(`p^{*}=\\frac{${q0}}{2\\cdot ${p.k}}=${p.pStar},\\ R_{max}=${rev}`), finS(mi(ans))),
      mis: L(
        "Tushumni $q$ (sotilgan soni) deb olish yoki parabola uchi o'rniga nollarini ($p=0$ va $p=\\frac{q_0}{k}$) javob deb olish.",
        'Берут за выручку количество проданного $q$ либо принимают за ответ нули параболы вместо вершины.',
        "Túsimdi $q$ (satılǵan sanı) dep alıw yamasa parabola shıńı ornına nollerin juwap dep alıw.", // kaa: tekshirilsin
        'Taking the quantity sold $q$ as revenue, or the zeros of the parabola instead of the vertex.',
      ),
    };
  },
);

// --- 113: ko'rsatkichli model: ko'payish yoki yarim yemirilish (L2) ---
interface ExpModelP {
  N0: number;
  T: number;
  steps: number;
  kind: 'grow' | 'decay' | 'time';
}
y1T<ExpModelP>(
  'md-exp-growth',
  113,
  'L2',
  170,
  (r) => ({ N0: r.pick([5, 10, 20, 40, 50, 100, 200]), T: r.pick([2, 3, 4, 5, 6]), steps: r.int(2, 5), kind: r.pick(['grow', 'decay', 'time'] as const) }),
  (p) => {
    const grown = p.N0 * 2 ** p.steps;
    need(grown <= 8000);
    const t = p.T * p.steps;
    const ans = p.kind === 'grow' ? grown : p.kind === 'decay' ? frac(p.N0 * 64, 2 ** p.steps).n : t;
    const decayVal = (p.N0 * 64) / 2 ** p.steps;
    need(p.kind !== 'decay' || (Number.isInteger(decayVal) && decayVal >= 1));
    const final = p.kind === 'decay' ? decayVal : ans;
    const wrong = intWrong(final, p.kind === 'grow' ? [p.N0 * t, p.N0 * 2 * p.steps, p.N0 * 2 ** t, p.N0 + p.steps * p.N0] : p.kind === 'decay' ? [Math.round(p.N0 * 64 / t), Math.round(p.N0 * 64 - t * p.N0), Math.round((p.N0 * 64) / 2 ** t) || 1, p.N0 * 32] : [Math.round(grown / p.N0), p.T * 2 ** p.steps, p.steps, p.T + p.steps], { min: 1 });
    return {
      stem: p.kind === 'grow'
        ? L(`Bakteriyalar soni har ${mi(p.T)} soatda ikki baravar ko'payadi. Boshida ${mi(p.N0)} ta bakteriya bo'lsa, ${mi(t)} soatdan keyin nechta bo'ladi?`, `Число бактерий удваивается каждые ${mi(p.T)} ч. Если вначале было ${mi(p.N0)} бактерий, сколько их будет через ${mi(t)} ч?`, `Bakteriyalar sanı hár ${mi(p.T)} saatta eki ese kóbeyedi. Baslanıwda ${mi(p.N0)} bakteriya bolsa, ${mi(t)} saattan keyin neshe boladı?`, `The number of bacteria doubles every ${mi(p.T)} hours. If there were ${mi(p.N0)} at the start, how many will there be after ${mi(t)} hours?`) // kaa: tekshirilsin
        : p.kind === 'decay'
          ? L(`Radioaktiv moddaning massasi har ${mi(p.T)} kunda ikki baravar kamayadi. Boshida ${mi(p.N0 * 64)} mg bo'lsa, ${mi(t)} kundan keyin necha mg qoladi?`, `Масса радиоактивного вещества уменьшается вдвое каждые ${mi(p.T)} дней. Если вначале было ${mi(p.N0 * 64)} мг, сколько миллиграммов останется через ${mi(t)} дней?`, `Radioaktiv zattıń massası hár ${mi(p.T)} kúnde eki ese kemeyedi. Baslanıwda ${mi(p.N0 * 64)} mg bolsa, ${mi(t)} kúnnen keyin neshe mg qaladı?`, `A radioactive substance halves in mass every ${mi(p.T)} days. If it starts at ${mi(p.N0 * 64)} mg, how many mg remain after ${mi(t)} days?`) // kaa: tekshirilsin
          : L(`Bakteriyalar soni har ${mi(p.T)} soatda ikki baravar ko'payadi. Boshida ${mi(p.N0)} ta bo'lgan bakteriyalar soni ${mi(grown)} ga yetishi uchun necha soat kerak?`, `Число бактерий удваивается каждые ${mi(p.T)} ч. Через сколько часов их число вырастет с ${mi(p.N0)} до ${mi(grown)}?`, `Bakteriyalar sanı hár ${mi(p.T)} saatta eki ese kóbeyedi. Baslanıwda ${mi(p.N0)} bolǵan bakteriyalar sanı ${mi(grown)} ǵa jetiwi ushın neshe saat kerek?`, `The number of bacteria doubles every ${mi(p.T)} hours. How many hours are needed for ${mi(p.N0)} bacteria to grow to ${mi(grown)}?`), // kaa: tekshirilsin
      correct: mi(final),
      wrong,
      sol: jn(p.kind === 'time' ? M(`2^{n}=\\frac{${grown}}{${p.N0}}=2^{${p.steps}},\\ t=${p.steps}\\cdot ${p.T}=${t}`) : M(`${p.kind === 'grow' ? `${p.N0}\\cdot 2^{${p.steps}}` : `${p.N0 * 64}:2^{${p.steps}}`}=${final}`), finS(mi(final))),
      mis: L(
        "Ko'rsatkichli o'sishni chiziqli deb olish (qo'shish yoki vaqtga ko'paytirish).",
        'Считают рост линейным (прибавление или умножение на время), а не показательным.',
        "Kórsetkishli ósiwdi sızıqlı dep alıw (qosıw yamasa waqıtqa kóbeytiw).", // kaa: tekshirilsin
        'Treating exponential change as linear (adding, or multiplying by time).',
      ),
    };
  },
);

// --- 113: trigonometrik model: davriy jarayon (L2) ---
const SIN_T: readonly { t: number; v: Frac }[] = [
  { t: 0, v: frac(0, 1) },
  { t: 1, v: frac(1, 2) },
  { t: 3, v: frac(1, 1) },
  { t: 5, v: frac(1, 2) },
  { t: 6, v: frac(0, 1) },
  { t: 7, v: frac(-1, 2) },
  { t: 9, v: frac(-1, 1) },
  { t: 11, v: frac(-1, 2) },
];
interface TrigModelP {
  C: number;
  A: number;
  idx: number;
  ask: 'value' | 'max' | 'swing';
}
y1T<TrigModelP>(
  'md-trig-model',
  113,
  'L2',
  190,
  (r) => ({ C: r.int(8, 20), A: r.int(2, 8), idx: r.int(0, 7), ask: r.pick(['value', 'max', 'swing'] as const) }),
  (p) => {
    const s = SIN_T[p.idx]!;
    need(p.A <= p.C - 2);
    const val = fAdd(fInt(p.C), fMul(fInt(p.A), s.v));
    const ans = p.ask === 'value' ? val : p.ask === 'max' ? fInt(p.C + p.A) : fInt(2 * p.A);
    need(p.ask !== 'value' || (s.v.n !== 0 && val.d <= 2));
    const wrong = fracWrong(ans, [fInt(p.C), fInt(p.A), fInt(p.C - p.A), fAdd(fInt(p.C), fInt(p.A)), p.ask === 'value' ? fAdd(fInt(p.C), fMul(fInt(p.A), fNeg(s.v))) : fInt(p.C + 2 * p.A)], { lo: 0, hi: 60 });
    return {
      stem: L(
        `Dengiz sathining ${M('t')} soatdagi balandligi (m) ${M(`h(t)=${p.C}+${p.A}\\sin\\frac{\\pi t}{6}`)} formula bilan modellashtirilgan. ${p.ask === 'value' ? `${M(`t=${SIN_T[p.idx]!.t}`)} soatdagi balandlikni` : p.ask === 'max' ? 'Eng katta balandlikni' : 'Eng katta va eng kichik balandliklar ayirmasini'} toping.`,
        `Высота уровня воды (м) в момент ${M('t')} ч моделируется формулой ${M(`h(t)=${p.C}+${p.A}\\sin\\frac{\\pi t}{6}`)}. Найдите ${p.ask === 'value' ? `высоту в момент ${M(`t=${SIN_T[p.idx]!.t}`)} ч` : p.ask === 'max' ? 'наибольшую высоту' : 'разность наибольшей и наименьшей высот'}.`,
        `Teńiz betiniń ${M('t')} saattaǵı biyikligi (m) ${M(`h(t)=${p.C}+${p.A}\\sin\\frac{\\pi t}{6}`)} formulası menen modellestirilgen. ${p.ask === 'value' ? `${M(`t=${SIN_T[p.idx]!.t}`)} saattaǵı biyiklikti` : p.ask === 'max' ? 'Eń úlken biyiklikti' : 'Eń úlken hám eń kishi biyiklikler ayırmasın'} tabıń.`, // kaa: tekshirilsin
        `The water level height (m) at time ${M('t')} hours is modelled by ${M(`h(t)=${p.C}+${p.A}\\sin\\frac{\\pi t}{6}`)}. Find ${p.ask === 'value' ? `the height at ${M(`t=${SIN_T[p.idx]!.t}`)} h` : p.ask === 'max' ? 'the maximum height' : 'the difference between the maximum and minimum heights'}.`,
      ),
      correct: mf(ans),
      wrong,
      sol: jn(L(`${M('-1\\le\\sin\\le 1')}: eng katta ${M(`${p.C}+${p.A}`)}, eng kichik ${M(`${p.C}-${p.A}`)}.`, `${M('-1\\le\\sin\\le 1')}: наибольшее ${M(`${p.C}+${p.A}`)}, наименьшее ${M(`${p.C}-${p.A}`)}.`, `${M('-1\\le\\sin\\le 1')}: eń úlken ${M(`${p.C}+${p.A}`)}, eń kishi ${M(`${p.C}-${p.A}`)}.`, `${M('-1\\le\\sin\\le 1')}: maximum ${M(`${p.C}+${p.A}`)}, minimum ${M(`${p.C}-${p.A}`)}.`), p.ask === 'value' ? M(`h(${s.t})=${p.C}+${p.A}\\cdot ${texFrac(s.v)}=${texFrac(val)}`) : '', finS(mf(ans))), // kaa: tekshirilsin
      mis: L(
        "Amplitudani (o'zgarish kengligi $2A$) eng katta qiymat bilan adashtirish yoki sinus argumentini ($\\frac{\\pi t}{6}$) noto'g'ri qo'yish.",
        'Путают амплитуду (размах $2A$) с наибольшим значением либо неверно подставляют аргумент синуса ($\\frac{\\pi t}{6}$).',
        "Amplitudanı (ózgeris keńligi $2A$) eń úlken mánis penen shatastırıw yamasa sinus argumentin ($\\frac{\\pi t}{6}$) qáte qoyıw.", // kaa: tekshirilsin
        'Confusing amplitude (range $2A$) with the maximum, or substituting the sine argument ($\\frac{\\pi t}{6}$) incorrectly.',
      ),
    };
  },
);
const fNeg = (f: Frac): Frac => frac(-f.n, f.d);

// --- 103: murakkab foiz (L2) ---
interface CompoundP {
  P: number;
  r: number;
  n: number;
  ask: 'final' | 'interest';
}
y1T<CompoundP>(
  'md-compound',
  103,
  'L2',
  160,
  (r) => ({ P: r.pick([1000, 2000, 5000, 10000, 20000]), r: r.pick([10, 20, 25, 50]), n: r.int(2, 3), ask: r.pick(['final', 'interest'] as const) }),
  (p) => {
    const fin = frac(p.P * (100 + p.r) ** p.n, 100 ** p.n);
    need(fin.d === 1 && fin.n <= 200000);
    const ans = p.ask === 'final' ? fin.n : fin.n - p.P;
    const simple = p.P + (p.P * p.r * p.n) / 100;
    const wrong = intWrong(ans, p.ask === 'final' ? [simple, p.P * p.r * p.n / 100, fin.n - p.P, p.P * (1 + p.r / 100) * p.n].map(Math.round) : [p.P * p.r * p.n / 100, fin.n, simple, p.P * p.r / 100].map(Math.round), { min: 1 });
    return {
      stem: L(
        `Omonatga ${mi(p.P)} so'm qo'yildi, yillik foiz stavkasi ${mi(p.r)}% (foiz har yili qo'shiladi). ${mi(p.n)} yildan keyin ${p.ask === 'final' ? 'hisobdagi summa' : 'olingan foiz daromadi'} necha so'm bo'ladi?`,
        `На вклад внесли ${mi(p.P)} сумов под ${mi(p.r)}% годовых (проценты капитализируются каждый год). Чему равна ${p.ask === 'final' ? 'сумма на счёте' : 'сумма начисленных процентов'} через ${mi(p.n)} года (лет)?`,
        `Omanatqa ${mi(p.P)} swm qoyıldı, jıllıq procent stavkası ${mi(p.r)}% (procent hár jılı qosıladı). ${mi(p.n)} jıldan keyin ${p.ask === 'final' ? 'esapdaǵı summa' : 'alınǵan procent dáramatı'} neshe swm boladı?`, // kaa: tekshirilsin
        `${mi(p.P)} soums are deposited at ${mi(p.r)}% per year (interest is compounded yearly). After ${mi(p.n)} years, what is the ${p.ask === 'final' ? 'amount in the account' : 'interest earned'}?`,
      ),
      correct: mi(ans),
      wrong,
      sol: jn(M(`${p.P}\\cdot ${texFrac(frac(100 + p.r, 100))}^{${p.n}}=${fin.n}`), p.ask === 'interest' ? M(`${fin.n}-${p.P}=${ans}`) : '', finS(mi(ans))),
      mis: L(
        "Murakkab foizni oddiy foiz ($P\\cdot r\\cdot n$) deb hisoblash.",
        'Считают сложные проценты как простые ($P\\cdot r\\cdot n$).',
        "Quramalı procentti ápiwayı procent ($P\\cdot r\\cdot n$) dep esaplaw.", // kaa: tekshirilsin
        'Computing compound interest as simple interest ($P\\cdot r\\cdot n$).',
      ),
    };
  },
);

// --- 113: chiziqli model: ochiq javobli (a: o'zgarish tezligi, b: berilgan paytdagi qiymat) (L2) ---
interface LinModelP {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
}
oT<LinModelP>(
  'md-linear-o',
  113,
  'L2',
  190,
  (r) => ({ x1: r.int(0, 3), y1: r.int(-4, 20), x2: r.int(4, 9), y2: r.int(-4, 30), x3: r.int(10, 16) }),
  (p) => {
    const slope = frac(p.y2 - p.y1, p.x2 - p.x1);
    need(slope.n !== 0 && slope.d <= 5 && p.y1 !== p.y2);
    const val = fAdd(fInt(p.y1), fMul(slope, fInt(p.x3 - p.x1)));
    need(val.d <= 5 && Math.abs(val.n / val.d) <= 90);
    return {
      stem: L(
        `Havo harorati (°C) ${M('t')} soat davomida chiziqli o'zgardi: ${mi(p.x1)} soatda ${mi(p.y1)}°, ${mi(p.x2)} soatda ${mi(p.y2)}°.`,
        `Температура воздуха (°C) менялась линейно в течение ${M('t')} часов: в момент ${mi(p.x1)} ч она была ${mi(p.y1)}°, в момент ${mi(p.x2)} ч — ${mi(p.y2)}°.`,
        `Hawa temperaturası (°C) ${M('t')} saat dawamında sızıqlı ózgerdi: ${mi(p.x1)} saatta ${mi(p.y1)}°, ${mi(p.x2)} saatta ${mi(p.y2)}°.`, // kaa: tekshirilsin
        `The air temperature (°C) changed linearly with time ${M('t')} hours: ${mi(p.y1)}° at ${mi(p.x1)} h and ${mi(p.y2)}° at ${mi(p.x2)} h.`,
      ),
      a: { prompt: L("Haroratning bir soatdagi o'zgarishini (°C/soat) toping.", 'Найдите изменение температуры за один час (°C/ч).', "Temperaturanıń bir saattaǵı ózgerisin (°C/saat) tabıń.", 'Find the temperature change per hour (°C/h).'), key: slope, hint: true }, // kaa: tekshirilsin
      b: { prompt: L(`${mi(p.x3)} soatda harorat qancha bo'ladi?`, `Какой будет температура в момент ${mi(p.x3)} ч?`, `${mi(p.x3)} saatta temperatura qansha boladı?`, `What is the temperature at ${mi(p.x3)} h?`), key: val, hint: true }, // kaa: tekshirilsin
      sol: jn(M(`k=\\frac{${p.y2}-(${p.y1})}{${p.x2}-${p.x1}}=${texFrac(slope)}`), M(`T(${p.x3})=${p.y1}+${texFrac(slope)}\\cdot ${p.x3 - p.x1}=${texFrac(val)}`)),
      mis: L(
        "O'zgarish tezligini vaqtlar ayirmasiga bo'lmasdan harorat ayirmasini olish.",
        'Берут разность температур, не деля на разность моментов времени.',
        "Ózgeris tezligin waqıtlar ayırmasına bólmey temperatura ayırmasın alıw.", // kaa: tekshirilsin
        'Taking the temperature difference without dividing by the time difference.',
      ),
    };
  },
);

export const SETS_DATA_TEMPLATES: ExtraTemplate[] = ALL;
