import { frac, keyForms, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng } from '../helpers';
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

export const SETS_DATA_TEMPLATES: ExtraTemplate[] = ALL;
