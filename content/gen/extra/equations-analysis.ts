import { fAdd, fDiv, fMul, fSub, frac, keyForms, lcm, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng } from '../helpers';
import type { Level, QuestionSpec } from '../types';
import type { ExtraTemplate } from './types';

// 3-4, 6 bo'limlar uchun qo'shimcha (mashq zaxirasi) shablonlari. Rasmiy mazmun elementlari (config/elements.ts):
//   3.1 Tenglamalar (mavzular 28, 29, 31-35, 37-39, 41, 109), 3.2 Tengsizliklar (28, 30, 32-34, 36-38, 40, 108, 109),
//   4.1 Funksiyalar (43-55, 59, 121), 6.1 Hosila (60-64, 110), 6.2 Boshlang'ich funksiya va integral (65, 66).
// Mavjud mock generatorlari (tenglama.ts, funksiyalar.ts, analiz.ts) qamrab olgan turlar (Viyet kvadratlar yig'indisi, begona ildiz,
// |x-p|+|x-q|, kesmadagi ekstremum, urinma tenglamasi va h.k.) takrorlanmaydi: bu yerda boshqa ko'rinish va turlar.
// Har shablon: draw(rng) parametrlarni tanlaydi (rad etilsa qayta urinadi), build(p) javobni KOD bilan hisoblaydi.
// Parametrlar content() dan tashqarida bir marta hisoblanadi: tillar o'rtasida raqamlar, harflar va kalit bir xil.
// Parametrlar MATNDA CHIQARILGAN kattaliklar sifatida saqlanadi: tests/content/extra-equations-analysis-math.test.ts
// ularni equationsAnalysisParams(id, seed) orqali olib, javobni boshqa usul bilan (sanash, sonli ildiz, sonli integral) qayta hisoblaydi.
// kaa (qoraqalpoq lotin): hamma kaa matnlar "// kaa: tekshirilsin".

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
const sg = (n: number): string => (n < 0 ? `-${-n}` : `+${n}`);
const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);
const isqrt = (n: number): number | null => {
  if (n < 0) return null;
  const r = Math.round(Math.sqrt(n));
  return r * r === n ? r : null;
};
const fNum = (f: Frac): number => f.n / f.d;
const fNeg = (f: Frac): Frac => frac(-f.n, f.d);
const fInt = (n: number): Frac => frac(n, 1);
const fPow = (f: Frac, k: number): Frac => {
  let r = fInt(1);
  for (let i = 0; i < k; i++) r = fMul(r, f);
  return r;
};

/** Ko'phad (c[k] — x^k oldidagi koeffitsiyent): [6,-5,1] -> x^{2}-5x+6 */
function polyTex(c: readonly number[], v = 'x'): string {
  let s = '';
  for (let k = c.length - 1; k >= 0; k--) {
    const a = c[k]!;
    if (a === 0) continue;
    const mag = Math.abs(a);
    const body = k === 0 ? String(mag) : `${mag === 1 ? '' : mag}${v}${k === 1 ? '' : `^{${k}}`}`;
    s += s === '' ? (a < 0 ? `-${body}` : body) : a < 0 ? `-${body}` : `+${body}`;
  }
  return s || '0';
}
const lin = (a: number, b: number, v = 'x'): string => polyTex([b, a], v);
/** x-r ko'paytuvchi: r=3 -> (x-3), r=-2 -> (x+2) */
const fac = (r: number, v = 'x'): string => `(${r === 0 ? v : r > 0 ? `${v}-${r}` : `${v}+${-r}`})`;
/** k*(ifoda): k=1 bo'lsa faqat qavs */
const mul = (k: number, e: string): string => (k === 1 ? `(${e})` : `${k}(${e})`);
/** Ko'rinish: son/kasr, TeX */
const texF = (f: Frac): string => texFrac(f);
/** Koordinatalar juftligi */
const pairTex = (a: string, b: string): string => `(${a};\\ ${b})`;

const ANS = L('Javob', 'Ответ', 'Juwap', 'Answer');
const fin = (x: string): L10n => L(`${ANS.uz}: ${M(x)}.`, `${ANS.ru}: ${M(x)}.`, `${ANS.kaa}: ${M(x)}.`, `${ANS.en}: ${M(x)}.`);
const J = (...parts: (L10n | string)[]): L10n => {
  const g = (l: keyof L10n) => parts.map((p) => (typeof p === 'string' ? p : p[l])).join(' ');
  return { uz: g('uz'), ru: g('ru'), kaa: g('kaa'), en: g('en') };
};

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
    if (Number.isInteger(n) && n >= (o.min ?? -Infinity) && n <= (o.max ?? Infinity) && !seen.has(n)) {
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

/** Kasr/butun javob uchun: tipik xatolar, keyin qo'shni qiymatlar. */
function fracWrong(correct: Frac, mistakes: readonly Frac[], fmt: (f: Frac) => string = mf): string[] {
  const out: string[] = [];
  const seen = new Set<string>([`${correct.n}/${correct.d}`]);
  const push = (f: Frac) => {
    if (!Number.isFinite(f.n) || !Number.isFinite(f.d) || f.d <= 0) return;
    const k = `${f.n}/${f.d}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(fmt(f));
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 40; k++) {
    push(frac(correct.n + k * correct.d, correct.d));
    push(frac(correct.n - k * correct.d, correct.d));
    push(frac(correct.n + k, correct.d));
    push(frac(correct.n - k, correct.d));
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
  hint?: L10n;
}
interface OOut {
  stem: L10n;
  a: OPart;
  b?: OPart;
  sol: L10n;
  mis: L10n;
}

const ALL: ExtraTemplate[] = [];
const PARAMS = new Map<string, (seed: number) => unknown>();

/** Testlar uchun: shablonning shu seeddagi (qabul qilingan) parametrlari. */
export function equationsAnalysisParams(id: string, seed: number): unknown {
  const f = PARAMS.get(id);
  if (!f) throw new Error(`shablon yo'q: ${id}`);
  return f(seed);
}

/** Rad etilgan parametrlar uchun qayta urinish (deterministik: har urinish o'z rng i bilan). */
function attempt<R>(id: string, seed: number, fn: (base: string) => R): R {
  let last: unknown;
  for (let i = 0; i < 600; i++) {
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
const HINT_PI = L(
  "Javobni $\\pi$ oldidagi koeffitsiyent ko'rinishida yozing (masalan, $\\frac{3}{4}\\pi$ uchun 3/4).",
  'Запишите коэффициент при $\\pi$ (например, для $\\frac{3}{4}\\pi$ ответ 3/4).',
  'Juwaptı $\\pi$ aldındaǵı koefficient kórinisinde jazıń (mısalı, $\\frac{3}{4}\\pi$ ushın 3/4).', // kaa: tekshirilsin
  'Write the coefficient of $\\pi$ (e.g. 3/4 for $\\frac{3}{4}\\pi$).',
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
  const part = (x: OPart, lang: keyof L10n) => (x.hint ? { prompt_md: x.prompt[lang], hint: x.hint[lang] } : { prompt_md: x.prompt[lang] });
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
        key: out.b ? { a: keyForms(out.a.key), b: keyForms(out.b.key) } : { a: keyForms(out.a.key) },
        content: (lang) => ({
          stem_md: out.stem[lang],
          payload: { parts: out.b ? { a: part(out.a, lang), b: part(out.b, lang) } : { a: part(out.a, lang) } },
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
// 3.1 Tenglamalar (mavzular 28, 29, 31, 32, 33, 34, 35, 37, 38, 39, 41)
// =====================================================================================================

// --- 28: kasrli chiziqli tenglama (L1) ---
interface LinFracP {
  a1: number;
  b1: number;
  d1: number;
  a2: number;
  b2: number;
  d2: number;
  c: number;
}
y1T<LinFracP>(
  'eq-lin-frac',
  28,
  'L1',
  120,
  (r) => ({ a1: r.int(1, 7), b1: r.int(-9, 9), d1: r.pick([2, 3, 4, 5, 6]), a2: r.int(1, 7), b2: r.int(-9, 9), d2: r.pick([2, 3, 4, 5, 6]), c: r.int(-5, 5) }),
  (p) => {
    need(p.c !== 0 && p.b1 !== 0 && p.b2 !== 0 && p.d1 !== p.d2);
    const m = lcm(p.d1, p.d2);
    const k1 = m / p.d1;
    const k2 = m / p.d2;
    const ca = k1 * p.a1 - k2 * p.a2;
    const cb = k2 * p.b2 + m * p.c - k1 * p.b1;
    need(ca !== 0 && cb !== 0);
    const x = frac(cb, ca);
    need(x.d <= 6 && Math.abs(x.n) <= 40);
    const eq = T`\frac{${lin(p.a1, p.b1)}}{${p.d1}}=\frac{${lin(p.a2, p.b2)}}{${p.d2}}${sg(p.c)}`;
    const step = T`${mul(k1, lin(p.a1, p.b1))}=${mul(k2, lin(p.a2, p.b2))}${sg(m * p.c)}`;
    const mistakeX = frac(k2 * p.b2 + p.c - k1 * p.b1, ca);
    return {
      stem: L(
        `${M(eq)} tenglamani yeching.`,
        `Решите уравнение ${M(eq)}.`,
        `${M(eq)} teńlemesin sheshiń.`, // kaa: tekshirilsin
        `Solve the equation ${M(eq)}.`,
      ),
      correct: mf(x),
      wrong: fracWrong(x, [fNeg(x), mistakeX, frac(ca, cb)]),
      sol: J(
        L(`Ikkala tomonni ${mi(m)} ga ko'paytiramiz:`, `Умножим обе части на ${mi(m)}:`, `Eki tárepti ${mi(m)} ke kóbeytemiz:`, `Multiply both sides by ${mi(m)}:`),
        M(step),
        L('Qavslarni ochamiz:', 'Раскроем скобки:', 'Qawıslardı ashamız:', 'Expand:'),
        M(`${lin(ca, 0)}=${cb}`),
        L('bundan', 'откуда', 'bunnan', 'so'),
        M(`x=${texF(x)}`) + '.',
      ),
      mis: L(
        "Butun songa ko'paytirganda ozod hadni (masalan, qo'shiluvchi sonni) ko'paytirishni unutish yoki $ax=b$ dan $x=a/b$ deb yozish.",
        'При умножении на общий знаменатель забывают умножить слагаемое без дроби либо из $ax=b$ пишут $x=a/b$.',
        "Pútin sanǵa kóbeytkende erkin hádtı kóbeytiwdi umıtıw yamasa $ax=b$ dan $x=a/b$ dep jazıw.", // kaa: tekshirilsin
        'Forgetting to multiply the standalone term by the common denominator, or writing $x=a/b$ from $ax=b$.',
      ),
    };
  },
);

// --- 29: parametrli kvadrat tenglama: ildizlar kvadratlari yig'indisi eng kichik bo'ladigan m (L3) ---
interface VietMinP {
  a: number;
  k: number;
  c: number;
  ask: 'm' | 'min';
}
y1T<VietMinP>(
  'eq-viet-min',
  29,
  'L3',
  200,
  (r) => ({ a: r.int(-4, 4), k: r.int(-3, 3), c: r.int(-8, 8), ask: r.pick(['m', 'min'] as const) }),
  (p) => {
    need(p.a !== 0 && p.k !== 0 && p.c !== 0);
    const ms = p.k - p.a;
    const disc = (ms + p.a) ** 2 - 4 * (p.k * ms + p.c);
    need(disc > 0);
    const minVal = ms * ms + (2 * p.a - 2 * p.k) * ms + p.a * p.a - 2 * p.c;
    const eq = T`x^2-(m${sg(p.a)})x+${polyTex([p.c, p.k], 'm')}=0`;
    const sOfM = T`x_1^2+x_2^2=(x_1+x_2)^2-2x_1x_2=(m${sg(p.a)})^2-2(${polyTex([p.c, p.k], 'm')})=m^2${sg(2 * p.a - 2 * p.k)}m${sg(p.a * p.a - 2 * p.c)}`;
    const ans = p.ask === 'm' ? ms : minVal;
    const wrongs = p.ask === 'm' ? [-ms, p.k + p.a, ms + 1, ms - 1, p.a - p.k] : [minVal + 2 * p.c, minVal - 2 * p.c, p.a * p.a - 2 * p.c, minVal + 1, -minVal];
    return {
      stem: L(
        p.ask === 'm'
          ? `${M(eq)} tenglamaning ildizlari ${M('x_1')} va ${M('x_2')} bo'lsin. ${M('x_1^2+x_2^2')} yig'indi eng kichik bo'ladigan ${M('m')} ning qiymatini toping.`
          : `${M(eq)} tenglamaning ildizlari ${M('x_1')} va ${M('x_2')} bo'lsin. ${M('x_1^2+x_2^2')} yig'indining ${M('m')} bo'yicha eng kichik qiymatini toping.`,
        p.ask === 'm'
          ? `Пусть ${M('x_1')} и ${M('x_2')} — корни уравнения ${M(eq)}. Найдите значение ${M('m')}, при котором сумма ${M('x_1^2+x_2^2')} наименьшая.`
          : `Пусть ${M('x_1')} и ${M('x_2')} — корни уравнения ${M(eq)}. Найдите наименьшее по ${M('m')} значение суммы ${M('x_1^2+x_2^2')}.`,
        p.ask === 'm'
          ? `${M(eq)} teńlemesiniń túbirleri ${M('x_1')} hám ${M('x_2')} bolsın. ${M('x_1^2+x_2^2')} qosındısı eń kishi bolatuǵın ${M('m')} niń mánisin tabıń.` // kaa: tekshirilsin
          : `${M(eq)} teńlemesiniń túbirleri ${M('x_1')} hám ${M('x_2')} bolsın. ${M('x_1^2+x_2^2')} qosındısınıń ${M('m')} boyınsha eń kishi mánisin tabıń.`, // kaa: tekshirilsin
        p.ask === 'm'
          ? `Let ${M('x_1')} and ${M('x_2')} be the roots of ${M(eq)}. Find the value of ${M('m')} for which ${M('x_1^2+x_2^2')} is smallest.`
          : `Let ${M('x_1')} and ${M('x_2')} be the roots of ${M(eq)}. Find the smallest value (over ${M('m')}) of ${M('x_1^2+x_2^2')}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrongs),
      sol: J(
        L('Viyet teoremasi:', 'По теореме Виета:', 'Vyet teoreması:', "Vieta's formulas:"),
        M(sOfM) + '.',
        L(
          `Kvadrat uchhad ${M('m')} bo'yicha uchi ${M(`m=${ms}`)} da minimumga erishadi; bu qiymatda diskriminant ${M(`D=${disc}>0`)}, ya'ni ildizlar haqiqiy.`,
          `Квадратный трёхчлен по ${M('m')} принимает наименьшее значение в вершине ${M(`m=${ms}`)}; при этом ${M(`D=${disc}>0`)}, корни действительные.`,
          `Kvadrat úshhad ${M('m')} boyınsha ushında ${M(`m=${ms}`)} de eń kishi mánisti aladı; bunda ${M(`D=${disc}>0`)}, yaǵnıy túbirler haqıyqıy.`, // kaa: tekshirilsin
          `The quadratic in ${M('m')} is smallest at its vertex ${M(`m=${ms}`)}; there ${M(`D=${disc}>0`)}, so the roots are real.`,
        ),
        p.ask === 'm' ? fin(`m=${ms}`) : fin(`${minVal}`),
      ),
      mis: L(
        "Yig'indini $(x_1+x_2)^2-2x_1x_2$ o'rniga $(x_1+x_2)^2-x_1x_2$ deb yozish yoki parabola uchining abssissasini $-b/(2a)$ da ishorasiz olish.",
        'Записывают $x_1^2+x_2^2=(x_1+x_2)^2-x_1x_2$ вместо $-2x_1x_2$ либо теряют знак в абсциссе вершины $-b/(2a)$.',
        "Qosındını $(x_1+x_2)^2-2x_1x_2$ ornına $(x_1+x_2)^2-x_1x_2$ dep jazıw yamasa parabola ushınıń abscissasın $-b/(2a)$ de belgisiz alıw.", // kaa: tekshirilsin
        'Writing $(x_1+x_2)^2-x_1x_2$ instead of $-2x_1x_2$, or losing the sign in the vertex abscissa $-b/(2a)$.',
      ),
    };
  },
);

// --- 29: diskriminant: parametrning butun qiymatlari soni (L3) ---
interface DiscCountP {
  t: number;
  w: number;
  n: number;
  kind: 'two' | 'none' | 'any';
}
y1T<DiscCountP>(
  'eq-disc-count',
  29,
  'L3',
  200,
  (r) => {
    const m1 = r.int(-6, 3);
    const m2 = m1 + r.int(2, 8);
    return { t: m1 + m2, w: -m1 * m2, n: r.int(9, 14), kind: r.pick(['two', 'none', 'any'] as const) };
  },
  (p) => {
    need(p.t !== 0 && p.w !== 0);
    // D/4 = m^2 - t m - w = (m - m1)(m - m2): m1 + m2 = t, m1 m2 = -w
    const dd = p.t * p.t + 4 * p.w;
    const sq = isqrt(dd);
    need(sq !== null && sq > 0);
    const m1 = (p.t - sq) / 2;
    const m2 = (p.t + sq) / 2;
    need(Number.isInteger(m1) && Number.isInteger(m2) && Math.abs(m1) < p.n && Math.abs(m2) < p.n);
    const total = 2 * p.n + 1;
    const nTwo = total - (m2 - m1 + 1);
    const nNone = m2 - m1 - 1;
    const nAny = total - nNone;
    const ans = p.kind === 'two' ? nTwo : p.kind === 'none' ? nNone : nAny;
    need(ans > 1);
    const eq = T`x^2-2mx+${polyTex([p.w, p.t], 'm')}=0`;
    const rng = `[-${p.n};\\ ${p.n}]`;
    const cond = p.kind === 'two' ? 'D>0' : p.kind === 'none' ? 'D<0' : 'D\\ge 0';
    const qty = {
      two: L('ikki xil haqiqiy ildizga ega', "ikki xil haqiqiy ildizga ega", "eki túrli haqıyqıy túbirge iye", 'two distinct real roots'),
      none: L("haqiqiy ildizga ega emas", "haqiqiy ildizga ega emas", "haqıyqıy túbirge iye emes", 'no real roots'),
      any: L("kamida bitta haqiqiy ildizga ega", "kamida bitta haqiqiy ildizga ega", "keminde bir haqıyqıy túbirge iye", 'at least one real root'),
    }[p.kind];
    const qtyRu = { two: 'имеет два различных действительных корня', none: 'не имеет действительных корней', any: 'имеет хотя бы один действительный корень' }[p.kind];
    return {
      stem: L(
        `${M(rng)} kesmadagi ${M('m')} butun sonlarning nechtasi uchun ${M(eq)} tenglama ${qty.uz}?`,
        `Для скольких целых значений ${M('m')} из отрезка ${M(rng)} уравнение ${M(eq)} ${qtyRu}?`,
        `${M(rng)} kesindisindegi ${M('m')} pútin sanlarınıń neshesi ushın ${M(eq)} teńlemesi ${qty.kaa}?`, // kaa: tekshirilsin
        `For how many integers ${M('m')} in ${M(rng)} does the equation ${M(eq)} have ${qty.en}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, p.kind === 'two' ? [nNone, nTwo + 1, nTwo - 1, total - (m2 - m1)] : p.kind === 'none' ? [m2 - m1, m2 - m1 + 1, nNone - 1, total - nNone] : [nAny - 1, nAny + 1, total - (m2 - m1), nTwo], { min: 0 }),
      sol: J(
        M(T`\frac{D}{4}=m^2${sg(-p.t)}m${sg(-p.w)}=(m${sg(-m1)})(m${sg(-m2)})`) + '.',
        L(
          `Shart: ${M(cond)}, ya'ni ${p.kind === 'two' ? `${M(`m<${m1}`)} yoki ${M(`m>${m2}`)}` : p.kind === 'none' ? M(`${m1}<m<${m2}`) : `${M(`m\\le ${m1}`)} yoki ${M(`m\\ge ${m2}`)}`}.`,
          `Условие: ${M(cond)}, то есть ${p.kind === 'two' ? `${M(`m<${m1}`)} или ${M(`m>${m2}`)}` : p.kind === 'none' ? M(`${m1}<m<${m2}`) : `${M(`m\\le ${m1}`)} или ${M(`m\\ge ${m2}`)}`}.`,
          `Shárt: ${M(cond)}, yaǵnıy ${p.kind === 'two' ? `${M(`m<${m1}`)} yamasa ${M(`m>${m2}`)}` : p.kind === 'none' ? M(`${m1}<m<${m2}`) : `${M(`m\\le ${m1}`)} yamasa ${M(`m\\ge ${m2}`)}`}.`, // kaa: tekshirilsin
          `Condition: ${M(cond)}, i.e. ${p.kind === 'two' ? `${M(`m<${m1}`)} or ${M(`m>${m2}`)}` : p.kind === 'none' ? M(`${m1}<m<${m2}`) : `${M(`m\\le ${m1}`)} or ${M(`m\\ge ${m2}`)}`}.`,
        ),
        L(`Kesmada ${mi(total)} ta butun son bor.`, `На отрезке ${mi(total)} целых чисел.`, `Kesindide ${mi(total)} pútin san bar.`, `The segment has ${mi(total)} integers.`), // kaa: tekshirilsin
        fin(String(ans)),
      ),
      mis: L(
        "Chegaraviy qiymatlarni ($D=0$) noto'g'ri hisoblash: qat'iy tengsizlikda chegara kirmaydi, noqat'iyda kiradi.",
        'Неверно учитывают граничные значения ($D=0$): при строгом неравенстве границы не входят, при нестрогом — входят.',
        "Shegaralıq mánislerdi ($D=0$) qáte esaplaw: qatań teńsizlikte shegara kirmeydi, qatań emeste kiredi.", // kaa: tekshirilsin
        'Mishandling the boundary values ($D=0$): they are excluded for a strict inequality and included for a non-strict one.',
      ),
    };
  },
);

// --- 32: kasr-ratsional tenglama: surat ildizlari, maxrajda begona ildiz (L2) ---
interface FracCancelP {
  r1: number;
  r2: number;
  d: number;
}
y1T<FracCancelP>(
  'eq-frac-cancel',
  32,
  'L2',
  150,
  (r) => {
    const r1 = r.int(-7, 7);
    const r2 = r.int(-7, 7);
    const d = r.chance(0.6) ? Math.abs(r.pick([r1, r2])) : r.int(1, 7);
    return { r1, r2, d };
  },
  (p) => {
    need(p.r1 !== p.r2 && p.d >= 1);
    const roots = [p.r1, p.r2].filter((x) => x * x !== p.d * p.d);
    need(roots.length >= 1);
    const ans = sum(roots);
    const num = polyTex([p.r1 * p.r2, -(p.r1 + p.r2), 1]);
    const den = polyTex([-p.d * p.d, 0, 1]);
    const eq = T`\frac{${num}}{${den}}=0`;
    const mistakeAll = p.r1 + p.r2;
    return {
      stem: L(
        `${M(eq)} tenglama ildizlarining yig'indisini toping.`,
        `Найдите сумму корней уравнения ${M(eq)}.`,
        `${M(eq)} teńlemesi túbirleriniń qosındısın tabıń.`, // kaa: tekshirilsin
        `Find the sum of the roots of the equation ${M(eq)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [mistakeAll, p.r1 * p.r2, p.r1, p.r2, -ans]),
      sol: J(
        L("Kasr nolga teng: surat nolga teng, maxraj nolga teng emas.", 'Дробь равна нулю: числитель равен нулю, знаменатель не равен нулю.', "Bólshek nolge teń: alım nolge teń, bólim nolge teń emes.", 'A fraction is zero when its numerator is zero and its denominator is not.'), // kaa: tekshirilsin
        M(T`${num}=0\Rightarrow x=${p.r1},\ x=${p.r2}`) + ';',
        M(T`x^2\ne ${p.d * p.d}\Rightarrow x\ne\pm ${p.d}`) + '.',
        roots.length === 2
          ? L(`Ikkala ildiz ham maxrajni nolga aylantirmaydi.`, 'Оба корня подходят.', 'Eki túbir de bólimdi nolge aylandırmaydı.', 'Both roots are admissible.') // kaa: tekshirilsin
          : L(`${mi(p.r1 * p.r1 === p.d * p.d ? p.r1 : p.r2)} begona ildiz (maxraj nolga teng).`, `${mi(p.r1 * p.r1 === p.d * p.d ? p.r1 : p.r2)} — посторонний корень (знаменатель равен нулю).`, `${mi(p.r1 * p.r1 === p.d * p.d ? p.r1 : p.r2)} artıqsha túbir (bólim nolge teń).`, `${mi(p.r1 * p.r1 === p.d * p.d ? p.r1 : p.r2)} is extraneous (the denominator vanishes).`), // kaa: tekshirilsin
        fin(String(ans)),
      ),
      mis: L(
        "Suratning ikkala ildizini yig'ib, maxrajni nolga aylantiradigan begona ildizni tashlab yubormaslik.",
        'Складывают оба корня числителя, не исключая корень, обращающий знаменатель в нуль.',
        "Alımnıń eki túbirin qosıp, bólimdi nolge aylandıratuǵın artıqsha túbirdi taslap jibermew.", // kaa: tekshirilsin
        'Adding both roots of the numerator without discarding the one that makes the denominator zero.',
      ),
    };
  },
);

// --- 33: |ax+b| = cx+d (L2) ---
interface AbsLinP {
  a: number;
  b: number;
  c: number;
  d: number;
}
y1T<AbsLinP>(
  'eq-abs-linear',
  33,
  'L2',
  170,
  (r) => {
    const a = r.int(2, 6);
    return { a, b: r.int(-8, 8), c: r.int(1, a - 1), d: r.int(-8, 8) };
  },
  (p) => {
    need(p.b !== 0 && p.d !== 0 && p.a > p.c && p.c >= 1);
    const x1 = frac(p.d - p.b, p.a - p.c); // ax+b = cx+d
    const x2 = frac(-(p.b + p.d), p.a + p.c); // -(ax+b) = cx+d
    const ok = (x: Frac) => fAdd(fMul(fInt(p.c), x), fInt(p.d)).n >= 0;
    const valid = [x1, x2].filter(ok);
    need(valid.length >= 1);
    const distinct = valid.filter((v, i) => valid.findIndex((u) => u.n === v.n && u.d === v.d) === i);
    const ans = distinct.reduce((s, v) => fAdd(s, v), fInt(0));
    need(ans.d <= 12 && Math.abs(ans.n) <= 60);
    const eq = T`|${lin(p.a, p.b)}|=${lin(p.c, p.d)}`;
    return {
      stem: L(
        `${M(eq)} tenglamaning ildizlari yig'indisini toping.`,
        `Найдите сумму корней уравнения ${M(eq)}.`,
        `${M(eq)} teńlemesiniń túbirleriniń qosındısın tabıń.`, // kaa: tekshirilsin
        `Find the sum of the roots of the equation ${M(eq)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, [fAdd(x1, x2), x1, x2, fNeg(ans)]),
      sol: J(
        L(`O'ng tomon manfiy bo'lmasligi kerak: ${M(`${lin(p.c, p.d)}\\ge 0`)}.`, `Правая часть неотрицательна: ${M(`${lin(p.c, p.d)}\\ge 0`)}.`, `Oń tárep teris bolmawı kerek: ${M(`${lin(p.c, p.d)}\\ge 0`)}.`, `The right side must be non-negative: ${M(`${lin(p.c, p.d)}\\ge 0`)}.`), // kaa: tekshirilsin
        M(T`${lin(p.a, p.b)}=${lin(p.c, p.d)}\Rightarrow x=${texF(x1)}`) + ';',
        M(T`-(${lin(p.a, p.b)})=${lin(p.c, p.d)}\Rightarrow x=${texF(x2)}`) + '.',
        L(
          `${valid.length === 2 ? 'Ikkala' : "Faqat bitta"} ildiz shartni qanoatlantiradi.`,
          valid.length === 2 ? 'Оба корня удовлетворяют условию.' : 'Условию удовлетворяет только один корень.',
          `${valid.length === 2 ? 'Eki' : 'Tek bir'} túbir shártti qanaatlandıradı.`, // kaa: tekshirilsin
          valid.length === 2 ? 'Both roots satisfy the condition.' : 'Only one root satisfies the condition.',
        ),
        fin(texF(ans)),
      ),
      mis: L(
        "$cx+d\\ge 0$ shartini tekshirmaslik: ikkala holatdan chiqqan ildizlarni sharsiz qo'shib yuborish.",
        'Не проверяют условие $cx+d\\ge 0$ и складывают корни обоих случаев.',
        "$cx+d\\ge 0$ shártin tekspew: eki jaǵdaydan shıqqan túbirlerdi shártsiz qosıp jiberiw.", // kaa: tekshirilsin
        'Not checking $cx+d\\ge 0$ and adding the roots of both cases.',
      ),
    };
  },
);

const xs = (n: number): string => (n === 0 ? 'x' : `x${sg(n)}`);
const absX = (a: number): string => `|${xs(-a)}|`;
const par = (n: number): string => (n < 0 ? `(${n})` : String(n));

// --- 33: ikki qavatli modul (L3) ---
interface AbsNestP {
  a: number;
  b: number;
  c: number;
}
y1T<AbsNestP>(
  'eq-abs-nested',
  33,
  'L3',
  200,
  (r) => ({ a: r.int(-6, 6), b: r.int(1, 9), c: r.int(1, 9) }),
  (p) => {
    const hi = p.b + p.c;
    const lo = p.b - p.c;
    const roots = [...new Set([p.a + hi, p.a - hi, ...(lo >= 0 ? [p.a + lo, p.a - lo] : [])])].sort((x, y) => x - y);
    const prod = roots.reduce((s, x) => s * x, 1);
    need(prod !== 0 && Math.abs(prod) <= 4000);
    const outer = (p.a + hi) * (p.a - hi);
    const eq = T`\left|\,${absX(p.a)}-${p.b}\,\right|=${p.c}`;
    const first = `${absX(p.a)}=${hi}`;
    const second = lo >= 0 ? `${absX(p.a)}=${lo}` : '';
    return {
      stem: L(
        `${M(eq)} tenglamaning barcha ildizlari ko'paytmasini toping.`,
        `Найдите произведение всех корней уравнения ${M(eq)}.`,
        `${M(eq)} teńlemesiniń barlıq túbirleriniń kóbeymesin tabıń.`, // kaa: tekshirilsin
        `Find the product of all roots of the equation ${M(eq)}.`,
      ),
      correct: mi(prod),
      wrong: intWrong(prod, [outer, -prod, sum(roots), lo >= 0 ? outer * (p.a + lo) : (p.a + lo) * (p.a - lo) * outer, roots[0]! * roots[roots.length - 1]! * 2]),
      sol: J(
        L(
          `Tashqi modul: ${M(`${absX(p.a)}-${p.b}=\\pm ${p.c}`)}, ya'ni ${M(first)}${lo >= 0 ? ` yoki ${M(second)}` : ''}.`,
          `Внешний модуль: ${M(`${absX(p.a)}-${p.b}=\\pm ${p.c}`)}, то есть ${M(first)}${lo >= 0 ? ` или ${M(second)}` : ''}.`,
          `Sırtqı modul: ${M(`${absX(p.a)}-${p.b}=\\pm ${p.c}`)}, yaǵnıy ${M(first)}${lo >= 0 ? ` yamasa ${M(second)}` : ''}.`, // kaa: tekshirilsin
          `Outer modulus: ${M(`${absX(p.a)}-${p.b}=\\pm ${p.c}`)}, that is ${M(first)}${lo >= 0 ? ` or ${M(second)}` : ''}.`,
        ),
        L(
          lo >= 0 ? 'Har bir tenglama ikkitadan ildiz beradi' : `${mi(lo)} manfiy, shuning uchun faqat birinchi tenglama ildiz beradi`,
          lo >= 0 ? 'Каждое уравнение даёт два корня' : `${mi(lo)} отрицательно, поэтому корни даёт только первое уравнение`,
          lo >= 0 ? 'Hár bir teńleme eki túbir beredi' : `${mi(lo)} teris, sonlıqtan tek birinshi teńleme túbir beredi`, // kaa: tekshirilsin
          lo >= 0 ? 'Each equation gives two roots' : `${mi(lo)} is negative, so only the first equation gives roots`,
        ),
        M(roots.join(',\\ ')) + '.',
        fin(String(prod)),
      ),
      mis: L(
        "$|x-a|=b-c$ tenglamasini manfiy $b-c$ da ham yechishga urinish yoki ildizlarning bir qismini tashlab yuborish.",
        'Решают $|x-a|=b-c$ и при отрицательном $b-c$ либо теряют часть корней.',
        "$|x-a|=b-c$ teńlemesin teris $b-c$ de de sheshiwge urınıw yamasa túbirlerdiń bir bólegin taslap jiberiw.", // kaa: tekshirilsin
        'Solving $|x-a|=b-c$ even when $b-c$ is negative, or losing some of the roots.',
      ),
    };
  },
);

// --- 34: ikki ildizli irratsional tenglama (L2) ---
interface IrrTwoP {
  p: number;
  q: number;
  s: number;
}
y1T<IrrTwoP>(
  'eq-irr-two',
  34,
  'L2',
  180,
  (r) => {
    const x0 = r.int(-5, 10);
    const u = r.int(0, 6);
    const v = r.int(0, 6);
    return { p: u * u - x0, q: v * v - x0, s: u + v };
  },
  (p) => {
    need(p.s >= 2 && p.p !== p.q);
    const diff = p.p - p.q;
    need(diff % p.s === 0);
    const uMinusV = diff / p.s;
    need((p.s + uMinusV) % 2 === 0);
    const u = (p.s + uMinusV) / 2;
    const v = p.s - u;
    need(u >= 0 && v >= 0);
    const x0 = u * u - p.p;
    const uDef = T`u=\sqrt{${xs(p.p)}}`;
    const vDef = T`v=\sqrt{${xs(p.q)}}`;
    const eq = T`\sqrt{${xs(p.p)}}+\sqrt{${xs(p.q)}}=${p.s}`;
    const rel = T`u+v=${p.s},\quad u^2-v^2=${diff}`;
    const res = T`u-v=\frac{${diff}}{${p.s}}=${uMinusV},\quad u=${u}`;
    return {
      stem: L(
        `${M(eq)} tenglamani yeching.`,
        `Решите уравнение ${M(eq)}.`,
        `${M(eq)} teńlemesin sheshiń.`, // kaa: tekshirilsin
        `Solve the equation ${M(eq)}.`,
      ),
      correct: mi(x0),
      wrong: intWrong(x0, [u * u, v * v, x0 + 1, x0 - 1, p.s * p.s - p.p - p.q]),
      sol: L(
        `${M(uDef)}, ${M(vDef)} deymiz: ${M(rel)}. Bundan ${M(res)}. Demak ${M(T`x${sg(p.p)}=${u * u}`)}, ${M(`x=${x0}`)}. ${ANS.uz}: ${M(`${x0}`)}.`,
        `Пусть ${M(uDef)}, ${M(vDef)}: ${M(rel)}. Отсюда ${M(res)}. Значит ${M(T`x${sg(p.p)}=${u * u}`)}, ${M(`x=${x0}`)}. ${ANS.ru}: ${M(`${x0}`)}.`,
        `${M(uDef)}, ${M(vDef)} dep alamız: ${M(rel)}. Bunnan ${M(res)}. Demek ${M(T`x${sg(p.p)}=${u * u}`)}, ${M(`x=${x0}`)}. ${ANS.kaa}: ${M(`${x0}`)}.`, // kaa: tekshirilsin
        `Let ${M(uDef)}, ${M(vDef)}: ${M(rel)}. Hence ${M(res)}. So ${M(T`x${sg(p.p)}=${u * u}`)}, ${M(`x=${x0}`)}. ${ANS.en}: ${M(`${x0}`)}.`,
      ),
      mis: L(
        "Tenglamaning ikkala tomonini kvadratga ko'targanda $(a+b)^2=a^2+b^2$ deb yozish yoki topilgan ildizni tekshirmaslik.",
        'Возводят в квадрат с ошибкой $(a+b)^2=a^2+b^2$ либо не проверяют найденный корень.',
        "Teńlemeniń eki tárepin kvadratqa kóterip, $(a+b)^2=a^2+b^2$ dep jazıw yamasa tabılǵan túbirdi tekspew.", // kaa: tekshirilsin
        'Squaring with the error $(a+b)^2=a^2+b^2$, or not checking the root found.',
      ),
    };
  },
);

// --- 34: almashtirish bilan irratsional tenglama: ildizlar ko'paytmasi (L3) ---
interface IrrSubP {
  p: number;
  m: number;
  w: number;
}
y1T<IrrSubP>(
  'eq-irr-sub',
  34,
  'L3',
  220,
  (r) => {
    const t0 = r.int(1, 4);
    const m = r.int(-5, 5);
    return { p: r.int(-6, 6), m, w: t0 * (t0 + 1) - m };
  },
  (p) => {
    need(p.p !== 0 && p.m !== 0);
    // t = sqrt(u+m), u = x^2+px:  t^2 + t - (w+m) = 0
    const k = p.w + p.m;
    const t0 = (-1 + Math.sqrt(1 + 4 * k)) / 2;
    need(Number.isInteger(t0) && t0 >= 1);
    const u = t0 * t0 - p.m;
    const disc = p.p * p.p + 4 * u;
    need(disc > 0);
    const prod = -u;
    const rad = polyTex([p.m, p.p, 1]);
    const base = polyTex([0, p.p, 1]);
    const eq = T`${base}+\sqrt{${rad}}=${p.w}`;
    const wrongU = (t0 + 1) * (t0 + 1) - p.m;
    const defT = T`t=\sqrt{${rad}}\ge 0,\quad ${base}=t^2${sg(-p.m)}`;
    const quad = T`t^2+t-${k}=0\Rightarrow t=${t0}`;
    const back = T`${base}=${u}\Rightarrow ${polyTex([-u, p.p, 1])}=0`;
    return {
      stem: L(
        `${M(eq)} tenglamaning ildizlari ko'paytmasini toping.`,
        `Найдите произведение корней уравнения ${M(eq)}.`,
        `${M(eq)} teńlemesiniń túbirleriniń kóbeymesin tabıń.`, // kaa: tekshirilsin
        `Find the product of the roots of the equation ${M(eq)}.`,
      ),
      correct: mi(prod),
      wrong: intWrong(prod, [u, -wrongU, -p.p, prod + p.m, p.m - 1 - t0 * t0, u * 2]),
      sol: L(
        `Almashtirish: ${M(defT)}. Tenglama ${M(quad)} (${mi(-(t0 + 1))} manfiy, mos emas). Keyin ${M(back)}; ${M(`D=${disc}>0`)}, Viyet bo'yicha ko'paytma ${mi(prod)}. ${ANS.uz}: ${mi(prod)}.`,
        `Замена: ${M(defT)}. Уравнение ${M(quad)} (${mi(-(t0 + 1))} отрицательно, не подходит). Далее ${M(back)}; ${M(`D=${disc}>0`)}, по Виету произведение ${mi(prod)}. ${ANS.ru}: ${mi(prod)}.`,
        `Almastırıw: ${M(defT)}. Teńleme ${M(quad)} (${mi(-(t0 + 1))} teris, jaramaydı). Keyin ${M(back)}; ${M(`D=${disc}>0`)}, Vyet boyınsha kóbeyme ${mi(prod)}. ${ANS.kaa}: ${mi(prod)}.`, // kaa: tekshirilsin
        `Substitution: ${M(defT)}. The equation gives ${M(quad)} (${mi(-(t0 + 1))} is negative, rejected). Then ${M(back)}; ${M(`D=${disc}>0`)}, so by Vieta the product is ${mi(prod)}. ${ANS.en}: ${mi(prod)}.`,
      ),
      mis: L(
        "$t$ ning manfiy qiymatini ham olish (u $t=\\sqrt{\\cdot}\\ge 0$ shartiga zid) yoki ildizlar ko'paytmasining ishorasini noto'g'ri olish.",
        'Берут и отрицательное значение $t$ (оно противоречит $t=\\sqrt{\\cdot}\\ge 0$) либо теряют знак у произведения корней.',
        "$t$ niń teris mánisin de alıw (ol $t=\\sqrt{\\cdot}\\ge 0$ shártine qarama-qarsı) yamasa túbirler kóbeymesiniń belgisin qáte alıw.", // kaa: tekshirilsin
        'Taking the negative value of $t$ (it contradicts $t=\\sqrt{\\cdot}\\ge 0$) or losing the sign of the product of roots.',
      ),
    };
  },
);

// --- 35: ikki noma'lumli chiziqli sistema (L1) ---
const lin2 = (a: number, b: number): string => `${a === 1 ? '' : a === -1 ? '-' : a}x${b < 0 ? '-' : '+'}${Math.abs(b) === 1 ? '' : Math.abs(b)}y`;
const COEF = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5] as const;
interface Sys2P {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  ask: 'sum' | 'diff' | 'prod';
}
y1T<Sys2P>(
  'eq-sys-lin2',
  35,
  'L1',
  120,
  (r) => {
    const x0 = r.int(-7, 7);
    const y0 = r.int(-7, 7);
    const a = r.pick(COEF);
    const b = r.pick(COEF);
    const d = r.pick(COEF);
    const e = r.pick(COEF);
    return { a, b, c: a * x0 + b * y0, d, e, f: d * x0 + e * y0, ask: r.pick(['sum', 'diff', 'prod'] as const) };
  },
  (p) => {
    const det = p.a * p.e - p.b * p.d;
    need(det !== 0);
    const dx = p.c * p.e - p.b * p.f;
    const dy = p.a * p.f - p.c * p.d;
    need(dx % det === 0 && dy % det === 0);
    const x0 = dx / det;
    const y0 = dy / det;
    need(x0 !== 0 && y0 !== 0 && x0 !== y0);
    const ans = p.ask === 'sum' ? x0 + y0 : p.ask === 'diff' ? x0 - y0 : x0 * y0;
    const expr = p.ask === 'sum' ? 'x+y' : p.ask === 'diff' ? 'x-y' : 'xy';
    const sys = T`\begin{cases}${lin2(p.a, p.b)}=${p.c}\\${lin2(p.d, p.e)}=${p.f}\end{cases}`;
    const alt = p.ask === 'sum' ? [x0 - y0, x0 * y0, -x0 - y0] : p.ask === 'diff' ? [x0 + y0, y0 - x0, x0 * y0] : [x0 + y0, x0 - y0, -x0 * y0];
    const detTex = `\\Delta=${p.a}\\cdot ${par(p.e)}-${par(p.b)}\\cdot ${par(p.d)}=${det}`;
    const resTex = `x=\\frac{${dx}}{${det}}=${x0},\\quad y=\\frac{${dy}}{${det}}=${y0}`;
    return {
      stem: L(
        `${M(sys)} sistemaning yechimi ${M('(x;\\ y)')} bo'lsa, ${M(expr)} ning qiymatini toping.`,
        `Если ${M('(x;\\ y)')} — решение системы ${M(sys)}, найдите значение ${M(expr)}.`,
        `${M(sys)} sistemasınıń sheshimi ${M('(x;\\ y)')} bolsa, ${M(expr)} tiń mánisin tabıń.`, // kaa: tekshirilsin
        `If ${M('(x;\\ y)')} solves the system ${M(sys)}, find the value of ${M(expr)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [...alt, ans + 1]),
      sol: L(
        `Aniqlovchi: ${M(detTex)}. Kramer formulalari: ${M(resTex)}. ${ANS.uz}: ${M(`${expr}=${ans}`)}.`,
        `Определитель: ${M(detTex)}. Формулы Крамера: ${M(resTex)}. ${ANS.ru}: ${M(`${expr}=${ans}`)}.`,
        `Anıqlawısh: ${M(detTex)}. Kramer formulaları: ${M(resTex)}. ${ANS.kaa}: ${M(`${expr}=${ans}`)}.`, // kaa: tekshirilsin
        `Determinant: ${M(detTex)}. Cramer's rule: ${M(resTex)}. ${ANS.en}: ${M(`${expr}=${ans}`)}.`,
      ),
      mis: L(
        "Tenglamalarni qo'shib-ayirishda ishora xatosi yoki $x$ va $y$ ni almashtirib qo'yish.",
        'Ошибка знака при сложении или вычитании уравнений либо перепутанные $x$ и $y$.',
        "Teńlemelerdi qosıp-ayırıwda belgi qátesi yamasa $x$ hám $y$ ti almastırıp qoyıw.", // kaa: tekshirilsin
        'A sign error when adding or subtracting the equations, or swapping $x$ and $y$.',
      ),
    };
  },
);

// --- 37: bir xil asosga keltiriladigan ko'rsatkichli tenglama (L1) ---
interface ExpSameP {
  base: number;
  e1: number;
  e2: number;
  a1: number;
  b1: number;
  a2: number;
  b2: number;
}
y1T<ExpSameP>(
  'eq-exp-same',
  37,
  'L1',
  140,
  (r) => {
    const base = r.pick([2, 3, 5]);
    return { base, e1: r.int(1, base === 2 ? 4 : 2), e2: r.int(1, base === 2 ? 4 : 2), a1: r.int(1, 5), b1: r.int(-4, 4), a2: r.int(-4, 3), b2: r.int(-4, 4) };
  },
  (p) => {
    need(p.e1 !== p.e2 && p.a2 !== 0 && p.b1 !== 0 && p.b2 !== 0);
    const ca = p.e1 * p.a1 - p.e2 * p.a2;
    const cb = p.e2 * p.b2 - p.e1 * p.b1;
    need(ca !== 0 && cb !== 0);
    const x = frac(cb, ca);
    need(x.d <= 8 && Math.abs(x.n) <= 30);
    const B1 = p.base ** p.e1;
    const B2 = p.base ** p.e2;
    const eq = T`${B1}^{${lin(p.a1, p.b1)}}=${B2}^{${lin(p.a2, p.b2)}}`;
    const naive = p.a1 === p.a2 ? frac(0, 1) : frac(p.b2 - p.b1, p.a1 - p.a2);
    const step1 = T`${p.base}^{${mul(p.e1, lin(p.a1, p.b1))}}=${p.base}^{${mul(p.e2, lin(p.a2, p.b2))}}`;
    const step2 = T`${mul(p.e1, lin(p.a1, p.b1))}=${mul(p.e2, lin(p.a2, p.b2))}`;
    const step3 = T`${lin(ca, 0)}=${cb}\Rightarrow x=${texF(x)}`;
    return {
      stem: L(
        `${M(eq)} tenglamani yeching.`,
        `Решите уравнение ${M(eq)}.`,
        `${M(eq)} teńlemesin sheshiń.`, // kaa: tekshirilsin
        `Solve the equation ${M(eq)}.`,
      ),
      correct: mf(x),
      wrong: fracWrong(x, [naive, fNeg(x), frac(ca, cb), frac(p.e2 * p.b2 + p.e1 * p.b1, ca)]),
      sol: L(
        `Ikkala tomonni ${mi(p.base)} asosga keltiramiz: ${M(step1)}. Ko'rsatkichlarni tenglaymiz: ${M(step2)}. Bundan ${M(step3)}. ${ANS.uz}: ${M(`x=${texF(x)}`)}.`,
        `Приведём обе части к основанию ${mi(p.base)}: ${M(step1)}. Приравниваем показатели: ${M(step2)}. Отсюда ${M(step3)}. ${ANS.ru}: ${M(`x=${texF(x)}`)}.`,
        `Eki tárepti ${mi(p.base)} tiykarına keltiremiz: ${M(step1)}. Kórsetkishlerdi teńlestiremiz: ${M(step2)}. Bunnan ${M(step3)}. ${ANS.kaa}: ${M(`x=${texF(x)}`)}.`, // kaa: tekshirilsin
        `Rewrite both sides with base ${mi(p.base)}: ${M(step1)}. Equate the exponents: ${M(step2)}. Hence ${M(step3)}. ${ANS.en}: ${M(`x=${texF(x)}`)}.`,
      ),
      mis: L(
        "Asoslar turlicha bo'lganda ko'rsatkichlarni to'g'ridan-to'g'ri tenglash (asosni umumiy darajaga keltirmasdan).",
        'Приравнивают показатели сразу, не приведя числа к одному основанию.',
        "Tiykarlar túrli bolǵanda kórsetkishlerdi tuwrıdan-tuwrı teńlestiriw (tiykardı ulıwma dárejege keltirmesten).", // kaa: tekshirilsin
        'Equating the exponents directly without bringing both sides to a common base.',
      ),
    };
  },
);

// --- 37: umumiy ko'paytuvchini qavsdan chiqarish (L2) ---
const powF = (b: number, i: number): Frac => (i >= 0 ? frac(b ** i, 1) : frac(1, b ** -i));
interface ExpFactorP {
  base: number;
  A: number;
  i1: number;
  B: number;
  i2: number;
  N: number;
}
y1T<ExpFactorP>(
  'eq-exp-factor',
  37,
  'L2',
  150,
  (r) => {
    const base = r.pick([2, 3, 5]);
    const x0 = r.int(1, base === 5 ? 3 : 5);
    const A = r.int(1, 3);
    const B = r.pick([-3, -2, -1, 1, 2, 3]);
    const i1 = r.int(-1, 3);
    const i2 = r.int(-1, 3);
    need(i1 !== i2 && x0 + i1 >= 0 && x0 + i2 >= 0);
    return { base, A, i1, B, i2, N: A * base ** (x0 + i1) + B * base ** (x0 + i2) };
  },
  (p) => {
    need(p.N > 0 && p.N <= 4000);
    const f = fAdd(fMul(fInt(p.A), powF(p.base, p.i1)), fMul(fInt(p.B), powF(p.base, p.i2)));
    need(f.n > 0);
    const pwF = fDiv(fInt(p.N), f);
    need(pwF.d === 1);
    const pw = pwF.n;
    let x0 = 0;
    let v = 1;
    while (v < pw) {
      v *= p.base;
      x0++;
    }
    need(v === pw);
    const t1 = `${p.A === 1 ? '' : `${p.A}\\cdot `}${p.base}^{${xs(p.i1)}}`;
    const t2 = `${Math.abs(p.B) === 1 ? '' : `${Math.abs(p.B)}\\cdot `}${p.base}^{${xs(p.i2)}}`;
    const eq = T`${t1}${p.B < 0 ? '-' : '+'}${t2}=${p.N}`;
    const fact = T`${p.base}^{x}\left(${p.A}\cdot ${p.base}^{${p.i1}}${sg(p.B)}\cdot ${p.base}^{${p.i2}}\right)=${p.N}`;
    const fact2 = T`${p.base}^{x}\cdot ${texF(f)}=${p.N},\quad ${p.base}^{x}=${pw}=${p.base}^{${x0}}`;
    return {
      stem: L(
        `${M(eq)} tenglamani yeching.`,
        `Решите уравнение ${M(eq)}.`,
        `${M(eq)} teńlemesin sheshiń.`, // kaa: tekshirilsin
        `Solve the equation ${M(eq)}.`,
      ),
      correct: mi(x0),
      wrong: intWrong(x0, [x0 + 1, x0 - 1, x0 + p.i1, x0 + p.i2, pw]),
      sol: L(
        `${M(`${p.base}^{x}`)} ni qavsdan chiqaramiz: ${M(fact)}. Bundan ${M(fact2)}. ${ANS.uz}: ${M(`x=${x0}`)}.`,
        `Вынесем ${M(`${p.base}^{x}`)} за скобки: ${M(fact)}. Отсюда ${M(fact2)}. ${ANS.ru}: ${M(`x=${x0}`)}.`,
        `${M(`${p.base}^{x}`)} tı qawıstan shıǵaramız: ${M(fact)}. Bunnan ${M(fact2)}. ${ANS.kaa}: ${M(`x=${x0}`)}.`, // kaa: tekshirilsin
        `Factor out ${M(`${p.base}^{x}`)}: ${M(fact)}. Hence ${M(fact2)}. ${ANS.en}: ${M(`x=${x0}`)}.`,
      ),
      mis: L(
        "$a^{x+k}=a^x+a^k$ deb yozish: to'g'risi $a^{x+k}=a^x\\cdot a^k$.",
        'Записывают $a^{x+k}=a^x+a^k$; верно $a^{x+k}=a^x\\cdot a^k$.',
        "$a^{x+k}=a^x+a^k$ dep jazıw: durısı $a^{x+k}=a^x\\cdot a^k$.", // kaa: tekshirilsin
        'Writing $a^{x+k}=a^x+a^k$; the correct rule is $a^{x+k}=a^x\\cdot a^k$.',
      ),
    };
  },
);

// --- 38: logarifmik tenglama: aniqlanish sohasi va begona ildiz (L2) ---
interface LogDomP {
  b: number;
  i: number;
  j: number;
  p: number;
  q: number;
}
y1T<LogDomP>(
  'eq-log-domain',
  38,
  'L2',
  180,
  (r) => {
    const b = r.pick([2, 3, 5]);
    const i = r.int(0, 3);
    const j = r.int(0, 3);
    const x0 = r.int(-4, 8);
    return { b, i, j, p: b ** i - x0, q: b ** j - x0 };
  },
  (p) => {
    need(p.i !== p.j && p.b ** (p.i + p.j) <= 1500);
    const prodN = p.b ** (p.i + p.j);
    const n = p.i + p.j;
    // ildizlar: x0 (a'zo >0) va x' = -(p+q) - x0 (begona)
    const x0 = p.b ** p.i - p.p;
    const other = -(p.p + p.q) - x0;
    need(other !== x0);
    const eq = T`\log_{${p.b}}(${xs(p.p)})+\log_{${p.b}}(${xs(p.q)})=${n}`;
    const dom = Math.max(-p.p, -p.q);
    const quad = `${polyTex([p.p * p.q - prodN, p.p + p.q, 1])}=0`;
    const domTex = `x>${dom}`;
    const roots = `x_1=${x0},\\ x_2=${other}`;
    return {
      stem: L(
        `${M(eq)} tenglamani yeching.`,
        `Решите уравнение ${M(eq)}.`,
        `${M(eq)} teńlemesin sheshiń.`, // kaa: tekshirilsin
        `Solve the equation ${M(eq)}.`,
      ),
      correct: mi(x0),
      wrong: intWrong(x0, [other, -x0, prodN, x0 + 1, x0 - 1]),
      sol: L(
        `Aniqlanish sohasi: ${M(domTex)}. Logarifmlar yig'indisi ko'paytma logarifmi: ${M(T`(${xs(p.p)})(${xs(p.q)})=${p.b}^{${n}}=${prodN}`)}, ya'ni ${M(quad)}. Ildizlar: ${M(roots)}. ${M(`x=${other}`)} sohaga kirmaydi (${M(`${other}\\le ${dom}`)}). ${ANS.uz}: ${M(`x=${x0}`)}.`,
        `ОДЗ: ${M(domTex)}. Сумма логарифмов равна логарифму произведения: ${M(T`(${xs(p.p)})(${xs(p.q)})=${p.b}^{${n}}=${prodN}`)}, то есть ${M(quad)}. Корни: ${M(roots)}. ${M(`x=${other}`)} не входит в ОДЗ (${M(`${other}\\le ${dom}`)}). ${ANS.ru}: ${M(`x=${x0}`)}.`,
        `Anıqlanıw oblastı: ${M(domTex)}. Logarifmler qosındısı kóbeyme logarifmi: ${M(T`(${xs(p.p)})(${xs(p.q)})=${p.b}^{${n}}=${prodN}`)}, yaǵnıy ${M(quad)}. Túbirler: ${M(roots)}. ${M(`x=${other}`)} oblastqa kirmeydi (${M(`${other}\\le ${dom}`)}). ${ANS.kaa}: ${M(`x=${x0}`)}.`, // kaa: tekshirilsin
        `Domain: ${M(domTex)}. A sum of logarithms is the logarithm of the product: ${M(T`(${xs(p.p)})(${xs(p.q)})=${p.b}^{${n}}=${prodN}`)}, i.e. ${M(quad)}. Roots: ${M(roots)}. ${M(`x=${other}`)} is outside the domain (${M(`${other}\\le ${dom}`)}). ${ANS.en}: ${M(`x=${x0}`)}.`,
      ),
      mis: L(
        "Aniqlanish sohasini tekshirmasdan ikkala ildizni qabul qilish (begona ildiz logarifm ostini manfiy qiladi).",
        'Принимают оба корня, не проверив ОДЗ (посторонний корень делает аргумент логарифма отрицательным).',
        "Anıqlanıw oblastın tekspey eki túbirdi de qabıllaw (artıqsha túbir logarifm astın teris qıladı).", // kaa: tekshirilsin
        'Accepting both roots without checking the domain (the extraneous root makes a logarithm argument negative).',
      ),
    };
  },
);

// --- 39: sin(kx)=c, cos(kx)=c tenglamalar ildizlari soni [0; n*pi] oraliqda (L2) ---
export const TRIG_C: readonly { tex: string; v: number }[] = [
  { tex: '\\frac{1}{2}', v: 0.5 },
  { tex: '-\\frac{1}{2}', v: -0.5 },
  { tex: '\\frac{\\sqrt{2}}{2}', v: Math.SQRT1_2 },
  { tex: '-\\frac{\\sqrt{2}}{2}', v: -Math.SQRT1_2 },
  { tex: '\\frac{\\sqrt{3}}{2}', v: Math.sqrt(3) / 2 },
  { tex: '-\\frac{\\sqrt{3}}{2}', v: -Math.sqrt(3) / 2 },
];
interface TrigCountP {
  fn: 'sin' | 'cos';
  k: number;
  ci: number;
  n: number;
}
y1T<TrigCountP>(
  'eq-trig-count',
  39,
  'L2',
  150,
  (r) => ({ fn: r.pick(['sin', 'cos'] as const), k: r.int(1, 4), ci: r.int(0, 5), n: r.int(1, 6) }),
  (p) => {
    const c = TRIG_C[p.ci]!;
    const kn = p.k * p.n;
    const q = Math.floor(kn / 2);
    const rem = kn % 2;
    const count = 2 * q + (rem ? (p.fn === 'cos' ? 1 : c.v > 0 ? 2 : 0) : 0);
    need(count >= 2);
    const arg = p.k === 1 ? 'x' : `${p.k}x`;
    const eq = `\\${p.fn}\\,${arg}=${c.tex}`;
    const seg = T`[0;\ ${p.n === 1 ? '' : p.n}\pi]`;
    const yRange = T`y=${arg}\in[0;\ ${kn === 1 ? '' : kn}\pi]`;
    return {
      stem: L(
        `${M(eq)} tenglama ${M(seg)} kesmada nechta ildizga ega?`,
        `Сколько корней имеет уравнение ${M(eq)} на отрезке ${M(seg)}?`,
        `${M(eq)} teńlemesi ${M(seg)} kesindisinde neshe túbirge iye?`, // kaa: tekshirilsin
        `How many roots does the equation ${M(eq)} have on the segment ${M(seg)}?`,
      ),
      correct: mi(count),
      wrong: intWrong(count, [kn, 2 * kn, count + 1, count - 1, kn + 1], { min: 0 }),
      sol: L(
        `${M(`y=${arg}`)} deymiz, ${M(yRange)}. ${M(`${p.fn}\\,y=${c.tex}`)} tenglama har bir ${M('2\\pi')} davrda ${mi(2)} ta ildizga ega; ${q > 0 ? `${mi(q)} ta to'liq davr ${mi(2 * q)} ta ildiz beradi` : "to'liq davr yo'q"}${rem ? `, qolgan ${M('[0;\\ \\pi]')} bo'lakda ${mi(count - 2 * q)} ta ildiz` : ''}. ${ANS.uz}: ${mi(count)}.`,
        `Пусть ${M(`y=${arg}`)}, ${M(yRange)}. Уравнение ${M(`${p.fn}\\,y=${c.tex}`)} имеет ${mi(2)} корня на каждом периоде ${M('2\\pi')}; ${q > 0 ? `${mi(q)} полных периодов дают ${mi(2 * q)} корней` : 'полных периодов нет'}${rem ? `, на оставшемся промежутке ${M('[0;\\ \\pi]')} — ${mi(count - 2 * q)}` : ''}. ${ANS.ru}: ${mi(count)}.`,
        `${M(`y=${arg}`)} dep alamız, ${M(yRange)}. ${M(`${p.fn}\\,y=${c.tex}`)} teńlemesi hár ${M('2\\pi')} dáwirde ${mi(2)} túbirge iye; ${q > 0 ? `${mi(q)} tolıq dáwir ${mi(2 * q)} túbir beredi` : 'tolıq dáwir joq'}${rem ? `, qalǵan ${M('[0;\\ \\pi]')} bólekte ${mi(count - 2 * q)} túbir` : ''}. ${ANS.kaa}: ${mi(count)}.`, // kaa: tekshirilsin
        `Let ${M(`y=${arg}`)}, ${M(yRange)}. The equation ${M(`${p.fn}\\,y=${c.tex}`)} has ${mi(2)} roots on each period ${M('2\\pi')}; ${q > 0 ? `${mi(q)} full periods give ${mi(2 * q)} roots` : 'there is no full period'}${rem ? `, and the remaining piece ${M('[0;\\ \\pi]')} gives ${mi(count - 2 * q)}` : ''}. ${ANS.en}: ${mi(count)}.`,
      ),
      mis: L(
        "Argument oralig'i $k$ marta kengayishini ($x\\in[0;n\\pi]$ da $kx\\in[0;kn\\pi]$) hisobga olmaslik; $\\sin y=c$ ning $[0;\\pi]$ dagi ildizlar sonini $c$ ishorasiga qarab aniqlamaslik.",
        'Не учитывают, что промежуток для $kx$ в $k$ раз длиннее; не учитывают знак $c$ при подсчёте корней $\\sin y=c$ на $[0;\\pi]$.',
        "Argument aralıǵı $k$ ese keńeyiwin esapqa almaw; $\\sin y=c$ niń $[0;\\pi]$ daǵı túbirler sanın $c$ niń belgisine qarap anıqlamaw.", // kaa: tekshirilsin
        'Ignoring that the interval for $kx$ is $k$ times longer, or ignoring the sign of $c$ when counting roots of $\\sin y=c$ on $[0;\\pi]$.',
      ),
    };
  },
);

// --- 41: parametrli chiziqli tenglama: ildizsiz va cheksiz ildizli qiymatlar (L3, O) ---
interface ParamNoneP {
  s1: number;
  p1: number;
  s2: number;
  p2: number;
}
oT<ParamNoneP>(
  'eq-param-none',
  41,
  'L3',
  240,
  (r) => {
    const p = r.int(-6, 6);
    const q = r.int(-6, 6);
    const rr = r.int(-6, 6);
    need(p !== q && rr !== q);
    return { s1: p + q, p1: p * q, s2: p + rr, p2: p * rr };
  },
  (p) => {
    // (m-P)(m-Q) = m^2 - s1 m + p1;  (m-P)(m-R) = m^2 - s2 m + p2
    const dd = p.s1 * p.s1 - 4 * p.p1;
    const sq = isqrt(dd);
    need(sq !== null);
    const roots1 = [(p.s1 - sq) / 2, (p.s1 + sq) / 2];
    const dd2 = p.s2 * p.s2 - 4 * p.p2;
    const sq2 = isqrt(dd2);
    need(sq2 !== null);
    const roots2 = [(p.s2 - sq2) / 2, (p.s2 + sq2) / 2];
    // umumiy ildiz: cheksiz; faqat birinchi koeffitsiyent ildizi: ildiz yo'q
    const common = roots1.filter((x) => roots2.includes(x));
    const onlyFirst = roots1.filter((x) => !roots2.includes(x));
    need(common.length === 1 && onlyFirst.length === 1);
    const eq = T`(${polyTex([p.p1, -p.s1, 1], 'm')})x=${polyTex([p.p2, -p.s2, 1], 'm')}`;
    const none = onlyFirst[0]!;
    const inf = common[0]!;
    return {
      stem: L(
        `${M('x')} ga nisbatan ${M(eq)} tenglama berilgan (${M('m')} — parametr).`,
        `Дано уравнение ${M(eq)} относительно ${M('x')} (${M('m')} — параметр).`,
        `${M('x')} ke qarata ${M(eq)} teńlemesi berilgen (${M('m')} — parametr).`, // kaa: tekshirilsin
        `The equation ${M(eq)} in ${M('x')} is given (${M('m')} is a parameter).`,
      ),
      a: {
        prompt: L(
          `${M('m')} ning qaysi qiymatida tenglama ildizga ega emas?`,
          `При каком значении ${M('m')} уравнение не имеет корней?`,
          `${M('m')} niń qanday mánisinde teńleme túbirge iye emes?`, // kaa: tekshirilsin
          `For which value of ${M('m')} does the equation have no roots?`,
        ),
        key: fInt(none),
      },
      b: {
        prompt: L(
          `${M('m')} ning qaysi qiymatida tenglama cheksiz ko'p ildizga ega?`,
          `При каком значении ${M('m')} уравнение имеет бесконечно много корней?`,
          `${M('m')} niń qanday mánisinde teńleme sheksiz kóp túbirge iye?`, // kaa: tekshirilsin
          `For which value of ${M('m')} does the equation have infinitely many roots?`,
        ),
        key: fInt(inf),
      },
      sol: L(
        `${M(`${polyTex([p.p1, -p.s1, 1], 'm')}=0`)} dan ${M(`m=${roots1[0]}`)} yoki ${M(`m=${roots1[1]}`)}. O'ng tomon ${M(`m=${inf}`)} da ham nolga teng (cheksiz ko'p ildiz), ${M(`m=${none}`)} da esa nolga teng emas (ildiz yo'q).`,
        `Из ${M(`${polyTex([p.p1, -p.s1, 1], 'm')}=0`)} получаем ${M(`m=${roots1[0]}`)} или ${M(`m=${roots1[1]}`)}. При ${M(`m=${inf}`)} правая часть тоже равна нулю (бесконечно много корней), а при ${M(`m=${none}`)} не равна нулю (корней нет).`,
        `${M(`${polyTex([p.p1, -p.s1, 1], 'm')}=0`)} dan ${M(`m=${roots1[0]}`)} yamasa ${M(`m=${roots1[1]}`)}. Oń tárep ${M(`m=${inf}`)} de de nolge teń (sheksiz kóp túbir), ${M(`m=${none}`)} de bolsa nolge teń emes (túbir joq).`, // kaa: tekshirilsin
        `From ${M(`${polyTex([p.p1, -p.s1, 1], 'm')}=0`)} we get ${M(`m=${roots1[0]}`)} or ${M(`m=${roots1[1]}`)}. At ${M(`m=${inf}`)} the right side is also zero (infinitely many roots); at ${M(`m=${none}`)} it is not zero (no roots).`,
      ),
      mis: L(
        "Koeffitsiyent nolga teng bo'lganda o'ng tomonni tekshirmaslik: ikkala tomon nolga teng bo'lsa cheksiz ko'p ildiz, faqat chap tomon nolga teng bo'lsa ildiz yo'q.",
        'Не проверяют правую часть, когда коэффициент равен нулю: если нулю равны обе части — бесконечно много корней, если только левая — корней нет.',
        "Koefficient nolge teń bolǵanda oń tárepti tekspew: eki tárep de nolge teń bolsa sheksiz kóp túbir, tek shep tárep nolge teń bolsa túbir joq.", // kaa: tekshirilsin
        'Not checking the right side when the coefficient is zero: if both sides vanish there are infinitely many roots, if only the left one does there are none.',
      ),
    };
  },
);

// --- 35: to'g'ri chiziq va aylana sistemasi (L2, O) ---
interface LineCircleP {
  a: number;
  b: number;
  c: number;
}
oT<LineCircleP>(
  'eq-line-circle',
  35,
  'L2',
  240,
  (r) => {
    const a = r.pick([-3, -2, -1, 1, 2, 3]);
    const b = r.int(-10, 10);
    const x1 = r.int(-6, 6);
    const s = (-2 * a * b) / (1 + a * a);
    need(Number.isInteger(s) && b !== 0);
    const x2 = s - x1;
    need(x2 !== x1 && Math.abs(x2) <= 8);
    return { a, b, c: x1 * x1 + (a * x1 + b) ** 2 };
  },
  (p) => {
    const A = 1 + p.a * p.a;
    const B = 2 * p.a * p.b;
    const C = p.b * p.b - p.c;
    const dd = B * B - 4 * A * C;
    const sq = isqrt(dd);
    need(sq !== null && sq > 0);
    const xa = (-B - sq) / (2 * A);
    const xb = (-B + sq) / (2 * A);
    need(Number.isInteger(xa) && Number.isInteger(xb));
    const ys = [p.a * xa + p.b, p.a * xb + p.b];
    const maxY = Math.max(...ys);
    const sumX = xa + xb;
    const sys = T`\begin{cases}y=${lin(p.a, p.b)}\\x^2+y^2=${p.c}\end{cases}`;
    const quad = T`x^2+(${lin(p.a, p.b)})^2=${p.c}\Rightarrow ${polyTex([C, B, A])}=0`;
    return {
      stem: L(
        `${M(sys)} sistemaning ikkita yechimi ${M('(x_1;\\ y_1)')} va ${M('(x_2;\\ y_2)')} bor.`,
        `Система ${M(sys)} имеет два решения ${M('(x_1;\\ y_1)')} и ${M('(x_2;\\ y_2)')}.`,
        `${M(sys)} sistemasınıń eki sheshimi ${M('(x_1;\\ y_1)')} hám ${M('(x_2;\\ y_2)')} bar.`, // kaa: tekshirilsin
        `The system ${M(sys)} has two solutions ${M('(x_1;\\ y_1)')} and ${M('(x_2;\\ y_2)')}.`,
      ),
      a: {
        prompt: L(`${M('x_1+x_2')} ni toping.`, `Найдите ${M('x_1+x_2')}.`, `${M('x_1+x_2')} di tabıń.`, `Find ${M('x_1+x_2')}.`), // kaa: tekshirilsin
        key: fInt(sumX),
      },
      b: {
        prompt: L(`${M('y')} ning katta qiymatini toping.`, `Найдите большее из значений ${M('y')}.`, `${M('y')} tiń úlken mánisin tabıń.`, `Find the larger value of ${M('y')}.`), // kaa: tekshirilsin
        key: fInt(maxY),
      },
      sol: L(
        `${M('y')} ni qo'yamiz: ${M(quad)}. Ildizlar: ${M(`x_1=${xa},\\ x_2=${xb}`)}; ${M(`x_1+x_2=${sumX}`)}. ${M(`y_1=${ys[0]}`)}, ${M(`y_2=${ys[1]}`)}, katta qiymat ${mi(maxY)}.`,
        `Подставляем ${M('y')}: ${M(quad)}. Корни: ${M(`x_1=${xa},\\ x_2=${xb}`)}; ${M(`x_1+x_2=${sumX}`)}. ${M(`y_1=${ys[0]}`)}, ${M(`y_2=${ys[1]}`)}, большее значение ${mi(maxY)}.`,
        `${M('y')} ti qoyamız: ${M(quad)}. Túbirler: ${M(`x_1=${xa},\\ x_2=${xb}`)}; ${M(`x_1+x_2=${sumX}`)}. ${M(`y_1=${ys[0]}`)}, ${M(`y_2=${ys[1]}`)}, úlken mánis ${mi(maxY)}.`, // kaa: tekshirilsin
        `Substitute ${M('y')}: ${M(quad)}. Roots: ${M(`x_1=${xa},\\ x_2=${xb}`)}; ${M(`x_1+x_2=${sumX}`)}. ${M(`y_1=${ys[0]}`)}, ${M(`y_2=${ys[1]}`)}, the larger value is ${mi(maxY)}.`,
      ),
      mis: L(
        "$y=ax+b$ ni qo'yganda qavsni kvadratga ko'tarishda o'rta hadni ($2abx$) tashlab yuborish.",
        'При подстановке $y=ax+b$ теряют удвоенное произведение $2abx$ в квадрате суммы.',
        "$y=ax+b$ ti qoyǵanda qawıstı kvadratqa kóterikte orta hádti ($2abx$) taslap jiberiw.", // kaa: tekshirilsin
        'Dropping the middle term $2abx$ when squaring $(ax+b)$ after substitution.',
      ),
    };
  },
);

// =====================================================================================================
// 3.2 Tengsizliklar (mavzular 28, 30, 32, 33, 34, 36, 37, 38, 40) va yangi 108 (ikki o'zgaruvchili), 109 (grafik usul)
// =====================================================================================================

const REL = { lt: '<', le: '\\le', gt: '>', ge: '\\ge' } as const;
type RelKey = keyof typeof REL;
const piTex = (f: Frac): string => (f.d === 1 ? (f.n === 1 ? '\\pi' : `${f.n}\\pi`) : `\\frac{${f.n}}{${f.d}}\\pi`);
const mpi = (f: Frac): string => M(piTex(f));
/** Oraliq: lo/hi null bo'lsa cheksizlik */
const ivl = (lo: number | null, hi: number | null, lc: boolean, rc: boolean): string =>
  `${lo === null ? '(-\\infty' : `${lc ? '[' : '('}${lo}`};\\ ${hi === null ? '+\\infty)' : `${hi}${rc ? ']' : ')'}`}`;
const sumRange = (lo: number, hi: number): number => ((lo + hi) * (hi - lo + 1)) / 2;

// --- 36: chiziqli tengsizliklar sistemasi: butun yechimlar soni/yig'indisi (L1) ---
interface IneqSysP {
  a1: number;
  b1: number;
  u: number;
  s1: boolean;
  a2: number;
  b2: number;
  l: number;
  s2: boolean;
  ask: 'count' | 'sum';
}
y1T<IneqSysP>(
  'ineq-sys-lin',
  36,
  'L1',
  140,
  (r) => ({ a1: r.int(2, 5), b1: r.int(-9, 9), u: r.int(2, 9), s1: r.chance(0.5), a2: r.int(2, 5), b2: r.int(-9, 9), l: r.int(-8, 1), s2: r.chance(0.5), ask: r.pick(['count', 'sum'] as const) }),
  (p) => {
    need(p.b1 !== 0 && p.b2 !== 0);
    const hi = p.s1 ? p.u - 1 : p.u;
    const lo = p.s2 ? p.l + 1 : p.l;
    need(hi - lo >= 3 && hi - lo <= 14);
    const c1 = p.a1 * p.u + p.b1;
    const c2 = p.a2 * p.l + p.b2;
    const n = hi - lo + 1;
    const total = sumRange(lo, hi);
    const ans = p.ask === 'count' ? n : total;
    const r1 = p.s1 ? REL.lt : REL.le;
    const r2 = p.s2 ? REL.gt : REL.ge;
    const sys = T`\begin{cases}${lin(p.a1, p.b1)}${r1}${c1}\\${lin(p.a2, p.b2)}${r2}${c2}\end{cases}`;
    const ineq1 = T`x${r1}${p.u}`;
    const ineq2 = T`x${r2}${p.l}`;
    const alt = p.ask === 'count' ? [n + 1, n - 1, n + 2, hi - lo] : [sumRange(lo - 1, hi), sumRange(lo, hi + 1), sumRange(lo + 1, hi - 1), sumRange(lo, hi - 1), sumRange(lo + 1, hi)];
    return {
      stem: L(
        p.ask === 'count' ? `${M(sys)} tengsizliklar sistemasining butun yechimlari nechta?` : `${M(sys)} tengsizliklar sistemasining barcha butun yechimlari yig'indisini toping.`,
        p.ask === 'count' ? `Сколько целых решений имеет система неравенств ${M(sys)}?` : `Найдите сумму всех целых решений системы неравенств ${M(sys)}.`,
        p.ask === 'count' ? `${M(sys)} teńsizlikler sistemasınıń neshe pútin sheshimi bar?` : `${M(sys)} teńsizlikler sistemasınıń barlıq pútin sheshimleri qosındısın tabıń.`, // kaa: tekshirilsin
        p.ask === 'count' ? `How many integer solutions does the system ${M(sys)} have?` : `Find the sum of all integer solutions of the system ${M(sys)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, alt),
      sol: L(
        `Birinchisidan ${M(ineq1)}, ikkinchisidan ${M(ineq2)}. Butun yechimlar: ${M(`${lo},\\ldots,${hi}`)} (${mi(n)} ta). ${p.ask === 'count' ? '' : `Yig'indi ${M(`\\frac{(${lo}${sg(hi)})\\cdot ${n}}{2}=${total}`)}. `}${ANS.uz}: ${mi(ans)}.`,
        `Из первого ${M(ineq1)}, из второго ${M(ineq2)}. Целые решения: ${M(`${lo},\\ldots,${hi}`)} (${mi(n)} шт.). ${p.ask === 'count' ? '' : `Сумма ${M(`\\frac{(${lo}${sg(hi)})\\cdot ${n}}{2}=${total}`)}. `}${ANS.ru}: ${mi(ans)}.`,
        `Birinshisinen ${M(ineq1)}, ekinshisinen ${M(ineq2)}. Pútin sheshimler: ${M(`${lo},\\ldots,${hi}`)} (${mi(n)} dana). ${p.ask === 'count' ? '' : `Qosındı ${M(`\\frac{(${lo}${sg(hi)})\\cdot ${n}}{2}=${total}`)}. `}${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `From the first ${M(ineq1)}, from the second ${M(ineq2)}. Integer solutions: ${M(`${lo},\\ldots,${hi}`)} (${mi(n)} of them). ${p.ask === 'count' ? '' : `Sum ${M(`\\frac{(${lo}${sg(hi)})\\cdot ${n}}{2}=${total}`)}. `}${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Qat'iy tengsizlikda chegaraviy butun sonni qo'shib yuborish yoki noqat'iy tengsizlikda tashlab yuborish.",
        'Включают граничное целое число при строгом неравенстве или теряют его при нестрогом.',
        "Qatań teńsizlikte shegaralıq pútin sandı qosıp jiberiw yamasa qatań emes teńsizlikte taslap jiberiw.", // kaa: tekshirilsin
        'Including the boundary integer for a strict inequality, or dropping it for a non-strict one.',
      ),
    };
  },
);

// --- 30: kvadrat tengsizlik barcha x uchun bajariladigan parametr qiymatlari (L3) ---
interface QuadAllP {
  a: number;
  k: number;
  strict: boolean;
}
y1T<QuadAllP>(
  'ineq-quad-all',
  30,
  'L3',
  200,
  (r) => {
    const a = r.int(1, 3);
    const t = r.int(1, 4);
    return { a, k: r.chance(0.45) ? a * t * t : r.int(1, 12), strict: r.chance(0.5) };
  },
  (p) => {
    need(p.k >= 1);
    let cnt = 0;
    const f = (m: number) => (p.strict ? m * m - 4 * p.a * p.k < 0 : m * m - 4 * p.a * p.k <= 0);
    for (let m = -80; m <= 80; m++) if (f(m)) cnt++;
    need(cnt >= 5 && cnt <= 40);
    const edge = 4 * p.a * p.k;
    const sq = isqrt(edge);
    const lhs = `${p.a === 1 ? '' : p.a}x^{2}+mx${sg(p.k)}`;
    const ineq = `${lhs}${p.strict ? '>' : '\\ge'}0`;
    const dcond = p.strict ? `D=m^2-${edge}<0` : `D=m^2-${edge}\\le 0`;
    const flipped = !p.strict ? [...Array(161)].filter((_, i) => (i - 80) ** 2 - edge < 0).length : [...Array(161)].filter((_, i) => (i - 80) ** 2 - edge <= 0).length;
    const root = sq !== null ? `${sq === 0 ? '0' : `|m|${p.strict ? '<' : '\\le'}${sq}`}` : `|m|<\\sqrt{${edge}}\\approx ${(Math.sqrt(edge)).toFixed(2)}`;
    return {
      stem: L(
        `${M('m')} ning nechta butun qiymatida ${M(ineq)} tengsizlik barcha ${M('x')} lar uchun bajariladi?`,
        `При скольких целых значениях ${M('m')} неравенство ${M(ineq)} выполняется для всех ${M('x')}?`,
        `${M('m')} niń neshe pútin mánisinde ${M(ineq)} teńsizligi barlıq ${M('x')} ler ushın orınlanadı?`, // kaa: tekshirilsin
        `For how many integer values of ${M('m')} does the inequality ${M(ineq)} hold for all ${M('x')}?`,
      ),
      correct: mi(cnt),
      wrong: intWrong(cnt, [flipped, cnt + 1, cnt - 1, cnt + 2, cnt - 2], { min: 1 }),
      sol: L(
        `Parabola shoxlari yuqoriga qaragan (${M(`a=${p.a}>0`)}), shuning uchun tengsizlik barcha ${M('x')} uchun bajarilishi uchun ${M(dcond)} kerak. Bundan ${M(root)}; butun ${M('m')} lar soni ${mi(cnt)}. ${ANS.uz}: ${mi(cnt)}.`,
        `Ветви параболы направлены вверх (${M(`a=${p.a}>0`)}), поэтому для всех ${M('x')} нужно ${M(dcond)}. Отсюда ${M(root)}; целых ${M('m')} ровно ${mi(cnt)}. ${ANS.ru}: ${mi(cnt)}.`,
        `Parabola shaqaları joqarıǵa qaraǵan (${M(`a=${p.a}>0`)}), sonlıqtan barlıq ${M('x')} ushın ${M(dcond)} kerek. Bunnan ${M(root)}; pútin ${M('m')} ler sanı ${mi(cnt)}. ${ANS.kaa}: ${mi(cnt)}.`, // kaa: tekshirilsin
        `The parabola opens upward (${M(`a=${p.a}>0`)}), so the inequality holds for all ${M('x')} iff ${M(dcond)}. Hence ${M(root)}; there are ${mi(cnt)} integers ${M('m')}. ${ANS.en}: ${mi(cnt)}.`,
      ),
      mis: L(
        "Qat'iy tengsizlikda $D<0$, noqat'iyda $D\\le 0$ ekanini aralashtirib yuborish (chegaraviy $m$ lar kiradimi yoki yo'q).",
        'Путают $D<0$ (строгое) и $D\\le 0$ (нестрогое): граничные значения $m$ входят или нет.',
        "Qatań teńsizlikte $D<0$, qatań emeste $D\\le 0$ ekenin aralastırıp jiberiw (shegaralıq $m$ ler kiredi me yamasa joq).", // kaa: tekshirilsin
        'Mixing up $D<0$ (strict) and $D\\le 0$ (non-strict): whether the boundary values of $m$ are included.',
      ),
    };
  },
);

// --- 32: kasr-ratsional tengsizlik: butun yechimlar soni (L2) ---
interface FracIneqP {
  a: number;
  b: number;
  c: number;
  d: number;
  strict: boolean;
}
y1T<FracIneqP>(
  'ineq-frac',
  32,
  'L2',
  170,
  (r) => ({ a: r.int(-8, 8), b: r.int(-8, 8), c: r.int(-8, 8), d: r.int(-8, 8), strict: r.chance(0.4) }),
  (p) => {
    const all = [p.a, p.b, p.c, p.d];
    need(new Set(all).size === 4);
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    let cnt = 0;
    for (let x = lo; x <= hi; x++) {
      if (x === p.c || x === p.d) continue;
      if (x === p.a || x === p.b) {
        if (!p.strict) cnt++;
        continue;
      }
      const above = all.filter((rt) => rt > x).length;
      if (above % 2 === 1) cnt++;
    }
    need(cnt >= 3 && cnt <= 12);
    const eq = T`\frac{${fac(p.a)}${fac(p.b)}}{${fac(p.c)}${fac(p.d)}}${p.strict ? '<' : '\\le'}0`;
    const sorted = [...all].sort((x, y) => x - y);
    // belgilar qatori: o'ngdan boshlab "+", har bir ildizda almashadi
    const total = hi - lo + 1;
    const wrongIgnoreDen = (() => {
      let k = 0;
      for (let x = lo; x <= hi; x++) {
        if (x === p.a || x === p.b) {
          if (!p.strict) k++;
          continue;
        }
        if (all.filter((rt) => rt > x).length % 2 === 1) k++;
      }
      return k;
    })();
    return {
      stem: L(
        `${M(eq)} tengsizlikning butun yechimlari nechta?`,
        `Сколько целых решений имеет неравенство ${M(eq)}?`,
        `${M(eq)} teńsizliginiń neshe pútin sheshimi bar?`, // kaa: tekshirilsin
        `How many integer solutions does the inequality ${M(eq)} have?`,
      ),
      correct: mi(cnt),
      wrong: intWrong(cnt, [wrongIgnoreDen, cnt + 1, cnt - 1, total - cnt, cnt + 2], { min: 0 }),
      sol: L(
        `Kritik nuqtalar: ${M(sorted.join(',\\ '))}. Oraliqlar usuli: o'ngdan boshlab ishora ${M('+')}, har bir nuqtada almashadi; maxrajning nollari (${M(`x=${p.c}`)}, ${M(`x=${p.d}`)}) har doim chiqarib tashlanadi, suratning nollari ${p.strict ? "qat'iy tengsizlikda kirmaydi" : 'kiradi'}. Butun yechimlar soni ${mi(cnt)}. ${ANS.uz}: ${mi(cnt)}.`,
        `Критические точки: ${M(sorted.join(',\\ '))}. Метод интервалов: справа знак ${M('+')}, меняется в каждой точке; нули знаменателя (${M(`x=${p.c}`)}, ${M(`x=${p.d}`)}) всегда выколоты, нули числителя ${p.strict ? 'не входят (строгое неравенство)' : 'входят'}. Целых решений ${mi(cnt)}. ${ANS.ru}: ${mi(cnt)}.`,
        `Kritikalıq noqatlar: ${M(sorted.join(',\\ '))}. Aralıqlar usılı: ońnan baslap belgi ${M('+')}, hár bir noqatta almasadı; bólimniń nolleri (${M(`x=${p.c}`)}, ${M(`x=${p.d}`)}) hámme waqıt shıǵarıp taslanadı, alımnıń nolleri ${p.strict ? 'qatań teńsizlikte kirmeydi' : 'kiredi'}. Pútin sheshimler sanı ${mi(cnt)}. ${ANS.kaa}: ${mi(cnt)}.`, // kaa: tekshirilsin
        `Critical points: ${M(sorted.join(',\\ '))}. Interval method: the sign is ${M('+')} on the right and changes at every point; zeros of the denominator (${M(`x=${p.c}`)}, ${M(`x=${p.d}`)}) are always excluded, zeros of the numerator are ${p.strict ? 'excluded (strict inequality)' : 'included'}. There are ${mi(cnt)} integer solutions. ${ANS.en}: ${mi(cnt)}.`,
      ),
      mis: L(
        "Maxrajning nollarini ham yechimga qo'shib yuborish yoki ishorani o'ngdan boshlamasdan oraliqlarni noto'g'ri tanlash.",
        'Включают нули знаменателя в ответ либо неверно расставляют знаки на интервалах.',
        "Bólimniń nollerin de sheshimge qosıp jiberiw yamasa belgilerdi aralıqlarǵa qáte qoyıw.", // kaa: tekshirilsin
        'Including zeros of the denominator in the answer, or misplacing the signs on the intervals.',
      ),
    };
  },
);

// --- 33: ||x-a|-b| <= c : butun yechimlar soni (L3) ---
interface AbsIneqP {
  a: number;
  b: number;
  c: number;
  strict: boolean;
}
y1T<AbsIneqP>(
  'ineq-abs-two',
  33,
  'L3',
  190,
  (r) => ({ a: r.int(-6, 6), b: r.int(2, 9), c: r.int(1, 8), strict: r.chance(0.4) }),
  (p) => {
    // d = |x-a| ning ruxsat etilgan butun qiymatlari
    const dLo = p.strict ? p.b - p.c + 1 : p.b - p.c;
    const dHi = p.strict ? p.b + p.c - 1 : p.b + p.c;
    let cnt = 0;
    for (let d = Math.max(0, dLo); d <= dHi; d++) cnt += d === 0 ? 1 : 2;
    need(cnt >= 4 && cnt <= 40);
    const eq = T`\left|\,${absX(p.a)}-${p.b}\,\right|${p.strict ? '<' : '\\le'}${p.c}`;
    const dRange = `${p.strict ? '' : ''}${Math.max(0, dLo)}\\le |${xs(-p.a)}|\\le ${dHi}`;
    return {
      stem: L(
        `${M(eq)} tengsizlikning butun yechimlari nechta?`,
        `Сколько целых решений имеет неравенство ${M(eq)}?`,
        `${M(eq)} teńsizliginiń neshe pútin sheshimi bar?`, // kaa: tekshirilsin
        `How many integer solutions does the inequality ${M(eq)} have?`,
      ),
      correct: mi(cnt),
      wrong: intWrong(cnt, [dHi * 2 + 1, dHi * 2 - 1, cnt + 2, cnt - 2, 2 * (dHi - dLo + 1)], { min: 1 }),
      sol: L(
        `${M(`${p.b - p.c}${p.strict ? '<' : '\\le'}|${xs(-p.a)}|${p.strict ? '<' : '\\le'}${p.b + p.c}`)}, lekin modul manfiy emas: ${M(dRange)}. Har bir ${M('d>0')} uchun ikkitadan, ${M('d=0')} uchun bitta ${M('x')}. Jami ${mi(cnt)}. ${ANS.uz}: ${mi(cnt)}.`,
        `${M(`${p.b - p.c}${p.strict ? '<' : '\\le'}|${xs(-p.a)}|${p.strict ? '<' : '\\le'}${p.b + p.c}`)}, но модуль неотрицателен: ${M(dRange)}. Для каждого ${M('d>0')} по два значения ${M('x')}, для ${M('d=0')} одно. Всего ${mi(cnt)}. ${ANS.ru}: ${mi(cnt)}.`,
        `${M(`${p.b - p.c}${p.strict ? '<' : '\\le'}|${xs(-p.a)}|${p.strict ? '<' : '\\le'}${p.b + p.c}`)}, biraq modul teris emes: ${M(dRange)}. Hár bir ${M('d>0')} ushın ekewden, ${M('d=0')} ushın bir ${M('x')}. Jámi ${mi(cnt)}. ${ANS.kaa}: ${mi(cnt)}.`, // kaa: tekshirilsin
        `${M(`${p.b - p.c}${p.strict ? '<' : '\\le'}|${xs(-p.a)}|${p.strict ? '<' : '\\le'}${p.b + p.c}`)}, but a modulus is non-negative: ${M(dRange)}. Each ${M('d>0')} gives two values of ${M('x')}, ${M('d=0')} gives one. Total ${mi(cnt)}. ${ANS.en}: ${mi(cnt)}.`,
      ),
      mis: L(
        "Modulning manfiy bo'lmasligini hisobga olmay, $b-c<0$ bo'lganda ham chap chegarani saqlash; $x=a$ nuqtasini ikki marta sanash.",
        'Не учитывают неотрицательность модуля при $b-c<0$; считают точку $x=a$ дважды.',
        "Moduldiń teris emesligin esapqa almay, $b-c<0$ bolǵanda da shep shegarasın saqlaw; $x=a$ noqatın eki ret sanaw.", // kaa: tekshirilsin
        'Ignoring that a modulus is non-negative when $b-c<0$, or counting the point $x=a$ twice.',
      ),
    };
  },
);

// --- 34: irratsional tengsizlik sqrt(x+p) > x-s (L2) ---
interface IrrIneqP {
  p: number;
  s: number;
  ask: 'count' | 'sum' | 'max';
}
y1T<IrrIneqP>(
  'ineq-irr',
  34,
  'L2',
  200,
  (r) => {
    const s = r.int(-3, 5);
    const w = r.pick([3, 5, 7, 9]);
    return { p: (w * w - 4 * s - 1) / 4, s, ask: r.pick(['count', 'sum', 'max'] as const) };
  },
  (p) => {
    need(Number.isInteger(p.p) && -p.p < p.s);
    const w = Math.sqrt(4 * p.s + 4 * p.p + 1);
    need(Number.isInteger(w) && w >= 3);
    const r1 = (2 * p.s + 1 - w) / 2;
    const r2 = (2 * p.s + 1 + w) / 2;
    const lo = -p.p;
    const hi = r2 - 1;
    const n = hi - lo + 1;
    need(n >= 3 && n <= 16);
    const ans = p.ask === 'count' ? n : p.ask === 'sum' ? sumRange(lo, hi) : hi;
    const ineq = T`\sqrt{${xs(p.p)}}>${lin(1, -p.s)}`;
    const alt = p.ask === 'count' ? [n + 1, n - 1, hi - r1, n - (p.s - lo)] : p.ask === 'sum' ? [sumRange(lo, hi + 1), sumRange(lo, hi - 1), sumRange(lo + 1, hi), sumRange(Math.ceil(r1) + 1, hi)] : [r2, hi - 1, hi + 1, r2 + 1];
    const qs = p.ask === 'count' ? ['nechta butun yechimga ega', 'Сколько целых решений имеет', 'neshe pútin sheshimge iye', 'How many integer solutions does'] : p.ask === 'sum' ? ["butun yechimlari yig'indisini toping", 'Найдите сумму целых решений', 'pútin sheshimleri qosındısın tabıń', 'Find the sum of the integer solutions of'] : ['eng katta butun yechimini toping', 'Найдите наибольшее целое решение', 'eń úlken pútin sheshimin tabıń', 'Find the largest integer solution of'];
    return {
      stem: L(
        p.ask === 'count' ? `${M(ineq)} tengsizlik ${qs[0]}?` : `${M(ineq)} tengsizlikning ${qs[0]}.`,
        p.ask === 'count' ? `${qs[1]} неравенство ${M(ineq)}?` : `${qs[1]} неравенства ${M(ineq)}.`,
        p.ask === 'count' ? `${M(ineq)} teńsizligi ${qs[2]}?` : `${M(ineq)} teńsizliginiń ${qs[2]}.`, // kaa: tekshirilsin
        p.ask === 'count' ? `${qs[3]} the inequality ${M(ineq)} have?` : `${qs[3]} the inequality ${M(ineq)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, alt),
      sol: L(
        `Aniqlanish sohasi ${M(`x\\ge ${lo}`)}. ${M(`x<${p.s}`)} da o'ng tomon manfiy: tengsizlik bajariladi. ${M(`x\\ge ${p.s}`)} da kvadratga ko'taramiz: ${M(T`${xs(p.p)}>(${lin(1, -p.s)})^2`)}, ya'ni ${M(`(x-${r1 < 0 ? `(${r1})` : r1})(x-${r2})<0`)}. Birlashtirib: ${M(`${lo}\\le x<${r2}`)}, butun yechimlar ${M(`${lo},\\ldots,${hi}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `ОДЗ ${M(`x\\ge ${lo}`)}. При ${M(`x<${p.s}`)} правая часть отрицательна: неравенство выполнено. При ${M(`x\\ge ${p.s}`)} возводим в квадрат: ${M(T`${xs(p.p)}>(${lin(1, -p.s)})^2`)}, то есть ${M(`(x-${r1 < 0 ? `(${r1})` : r1})(x-${r2})<0`)}. Вместе: ${M(`${lo}\\le x<${r2}`)}, целые решения ${M(`${lo},\\ldots,${hi}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `Anıqlanıw oblastı ${M(`x\\ge ${lo}`)}. ${M(`x<${p.s}`)} de oń tárep teris: teńsizlik orınlanadı. ${M(`x\\ge ${p.s}`)} de kvadratqa kóteremiz: ${M(T`${xs(p.p)}>(${lin(1, -p.s)})^2`)}, yaǵnıy ${M(`(x-${r1 < 0 ? `(${r1})` : r1})(x-${r2})<0`)}. Birlestirsek: ${M(`${lo}\\le x<${r2}`)}, pútin sheshimler ${M(`${lo},\\ldots,${hi}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Domain ${M(`x\\ge ${lo}`)}. For ${M(`x<${p.s}`)} the right side is negative, so the inequality holds. For ${M(`x\\ge ${p.s}`)} square both sides: ${M(T`${xs(p.p)}>(${lin(1, -p.s)})^2`)}, i.e. ${M(`(x-${r1 < 0 ? `(${r1})` : r1})(x-${r2})<0`)}. Together: ${M(`${lo}\\le x<${r2}`)}, integer solutions ${M(`${lo},\\ldots,${hi}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "O'ng tomon manfiy bo'lgan holni (u yechimga kiradi) tashlab yuborish yoki aniqlanish sohasini hisobga olmaslik.",
        'Теряют случай, когда правая часть отрицательна (он входит в решение), либо не учитывают ОДЗ.',
        "Oń tárep teris bolǵan jaǵdaydı (ol sheshimge kiredi) taslap jiberiw yamasa anıqlanıw oblastın esapqa almaw.", // kaa: tekshirilsin
        'Dropping the case of a negative right side (it belongs to the solution) or ignoring the domain.',
      ),
    };
  },
);

// --- 37: ko'rsatkichli tengsizlik b^(x^2+px) ? b^n (L2) ---
interface ExpIneqP {
  bnum: number;
  bden: number;
  p: number;
  n: number;
  strict: boolean;
  ask: 'count' | 'sum';
}
y1T<ExpIneqP>(
  'ineq-exp',
  37,
  'L2',
  180,
  (r) => {
    const r1 = r.int(-6, 2);
    const r2 = r1 + r.int(2, 8);
    const small = r.chance(0.5);
    return { bnum: small ? 1 : r.pick([2, 3, 5]), bden: small ? r.pick([2, 3]) : 1, p: -(r1 + r2), n: -r1 * r2, strict: r.chance(0.4), ask: r.pick(['count', 'sum'] as const) };
  },
  (p) => {
    need(p.p !== 0 && p.n !== 0);
    const dd = p.p * p.p + 4 * p.n;
    const sq = isqrt(dd);
    need(sq !== null && sq >= 2);
    const r1 = (-p.p - sq) / 2;
    const r2 = (-p.p + sq) / 2;
    need(Number.isInteger(r1) && Number.isInteger(r2));
    const lo = p.strict ? r1 + 1 : r1;
    const hi = p.strict ? r2 - 1 : r2;
    const cnt = hi - lo + 1;
    need(cnt >= 3 && cnt <= 14);
    const ans = p.ask === 'count' ? cnt : sumRange(lo, hi);
    const less = p.bden === 1; // asos > 1: ko'rsatkich <= ; asos < 1: >=
    const rel = less ? (p.strict ? '<' : '\\le') : p.strict ? '>' : '\\ge';
    const baseTex = p.bden === 1 ? String(p.bnum) : `\\left(\\frac{${p.bnum}}{${p.bden}}\\right)`;
    const ineq = T`${baseTex}^{${polyTex([0, p.p, 1])}}${rel}${baseTex}^{${p.n}}`;
    const exp = T`${polyTex([0, p.p, 1])}${p.strict ? '<' : '\\le'}${p.n}`;
    const quad = T`${polyTex([-p.n, p.p, 1])}${p.strict ? '<' : '\\le'}0`;
    const flipCnt = (p.strict ? r2 - r1 + 1 : r2 - r1 - 1);
    const alt = p.ask === 'count' ? [flipCnt, cnt + 1, cnt - 1, cnt + 2] : [sumRange(r1, r2), sumRange(r1 + 1, r2 - 1), sumRange(lo, hi + 1), sumRange(lo - 1, hi)];
    return {
      stem: L(
        p.ask === 'count' ? `${M(ineq)} tengsizlikning butun yechimlari nechta?` : `${M(ineq)} tengsizlikning butun yechimlari yig'indisini toping.`,
        p.ask === 'count' ? `Сколько целых решений имеет неравенство ${M(ineq)}?` : `Найдите сумму целых решений неравенства ${M(ineq)}.`,
        p.ask === 'count' ? `${M(ineq)} teńsizliginiń neshe pútin sheshimi bar?` : `${M(ineq)} teńsizliginiń pútin sheshimleri qosındısın tabıń.`, // kaa: tekshirilsin
        p.ask === 'count' ? `How many integer solutions does the inequality ${M(ineq)} have?` : `Find the sum of the integer solutions of the inequality ${M(ineq)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, alt, { min: p.ask === 'count' ? 1 : -1000 }),
      sol: L(
        `Asos ${less ? M(`${p.bnum}>1`) : M(`0<\\frac{${p.bnum}}{${p.bden}}<1`)}, shuning uchun ${less ? 'tengsizlik belgisi saqlanadi' : "tengsizlik belgisi teskariga o'zgaradi"}: ${M(exp)}, ya'ni ${M(quad)}. Ildizlar ${M(`${r1}`)} va ${M(`${r2}`)}, butun yechimlar ${M(`${lo},\\ldots,${hi}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `Основание ${less ? M(`${p.bnum}>1`) : M(`0<\\frac{${p.bnum}}{${p.bden}}<1`)}, поэтому ${less ? 'знак неравенства сохраняется' : 'знак неравенства меняется на противоположный'}: ${M(exp)}, то есть ${M(quad)}. Корни ${M(`${r1}`)} и ${M(`${r2}`)}, целые решения ${M(`${lo},\\ldots,${hi}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `Tiykar ${less ? M(`${p.bnum}>1`) : M(`0<\\frac{${p.bnum}}{${p.bden}}<1`)}, sonlıqtan ${less ? 'teńsizlik belgisi saqlanadı' : 'teńsizlik belgisi keri tárepke ózgeredi'}: ${M(exp)}, yaǵnıy ${M(quad)}. Túbirler ${M(`${r1}`)} hám ${M(`${r2}`)}, pútin sheshimler ${M(`${lo},\\ldots,${hi}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `The base is ${less ? M(`${p.bnum}>1`) : M(`0<\\frac{${p.bnum}}{${p.bden}}<1`)}, so the inequality sign ${less ? 'is kept' : 'is reversed'}: ${M(exp)}, i.e. ${M(quad)}. Roots ${M(`${r1}`)} and ${M(`${r2}`)}, integer solutions ${M(`${lo},\\ldots,${hi}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Asos 1 dan kichik bo'lganda tengsizlik belgisini teskariga o'zgartirishni unutish (yoki aksincha, asos 1 dan katta bo'lganda o'zgartirish).",
        'Забывают менять знак неравенства при основании меньше 1 (или меняют его при основании больше 1).',
        "Tiykar 1 den kishi bolǵanda teńsizlik belgisin keri ózgertiwdi umıtıw (yamasa kerisinshe, tiykar 1 den úlken bolǵanda ózgertiw).", // kaa: tekshirilsin
        'Forgetting to reverse the sign when the base is less than 1 (or reversing it when the base is greater than 1).',
      ),
    };
  },
);

// --- 38: logarifmik tengsizlik (L2) ---
interface LogIneqP {
  b: number;
  i: number;
  j: number;
  p: number;
  q: number;
  le: boolean;
  ask: 'count' | 'sum';
}
y1T<LogIneqP>(
  'ineq-log',
  38,
  'L2',
  190,
  (r) => {
    const b = r.pick([2, 3, 5]);
    const i = r.int(0, 3);
    const j = r.int(0, 3);
    const x0 = r.int(2, 12);
    return { b, i, j, p: x0 - b ** i, q: x0 - b ** j, le: r.chance(0.7), ask: r.pick(['count', 'sum'] as const) };
  },
  (p) => {
    need(p.i !== p.j && p.b ** (p.i + p.j) <= 700 && p.p !== p.q);
    const x0 = p.p + p.b ** p.i;
    const m = Math.max(p.p, p.q);
    const n = p.i + p.j;
    const prodN = p.b ** n;
    const cnt = x0 - m;
    need(cnt >= 3 && cnt <= 16);
    const ask: 'count' | 'sum' | 'min' = p.le ? p.ask : 'min';
    const ans = ask === 'count' ? cnt : ask === 'sum' ? sumRange(m + 1, x0) : x0;
    const ineq = T`\log_{${p.b}}(${xs(-p.p)})+\log_{${p.b}}(${xs(-p.q)})${p.le ? '\\le' : '\\ge'}${n}`;
    const alt = ask === 'count' ? [cnt + 1, cnt - 1, x0, cnt + 2] : ask === 'sum' ? [sumRange(m, x0), sumRange(m + 1, x0 - 1), sumRange(m + 2, x0), sumRange(m + 1, x0 + 1)] : [x0 + 1, x0 - 1, m + 1, prodN];
    const dom = `x>${m}`;
    const prodTex = T`(${xs(-p.p)})(${xs(-p.q)})${p.le ? '\\le' : '\\ge'}${prodN}`;
    const sets = p.le ? `${m}<x\\le ${x0}` : `x\\ge ${x0}`;
    return {
      stem: L(
        ask === 'count' ? `${M(ineq)} tengsizlikning butun yechimlari nechta?` : ask === 'sum' ? `${M(ineq)} tengsizlikning butun yechimlari yig'indisini toping.` : `${M(ineq)} tengsizlikning eng kichik butun yechimini toping.`,
        ask === 'count' ? `Сколько целых решений имеет неравенство ${M(ineq)}?` : ask === 'sum' ? `Найдите сумму целых решений неравенства ${M(ineq)}.` : `Найдите наименьшее целое решение неравенства ${M(ineq)}.`,
        ask === 'count' ? `${M(ineq)} teńsizliginiń neshe pútin sheshimi bar?` : ask === 'sum' ? `${M(ineq)} teńsizliginiń pútin sheshimleri qosındısın tabıń.` : `${M(ineq)} teńsizliginiń eń kishi pútin sheshimin tabıń.`, // kaa: tekshirilsin
        ask === 'count' ? `How many integer solutions does the inequality ${M(ineq)} have?` : ask === 'sum' ? `Find the sum of the integer solutions of the inequality ${M(ineq)}.` : `Find the smallest integer solution of the inequality ${M(ineq)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, alt),
      sol: L(
        `Aniqlanish sohasi ${M(dom)}. Asos ${mi(p.b)}>1, ko'paytma logarifmi: ${M(prodTex)}. ${M(`x=${x0}`)} da tenglik (${M(`${p.b ** p.i}\\cdot ${p.b ** p.j}=${prodN}`)}); ko'paytma ${M(dom)} da o'sadi. Yechim ${M(sets)}. ${ANS.uz}: ${mi(ans)}.`,
        `ОДЗ ${M(dom)}. Основание ${mi(p.b)}>1, логарифм произведения: ${M(prodTex)}. При ${M(`x=${x0}`)} равенство (${M(`${p.b ** p.i}\\cdot ${p.b ** p.j}=${prodN}`)}); произведение возрастает при ${M(dom)}. Решение ${M(sets)}. ${ANS.ru}: ${mi(ans)}.`,
        `Anıqlanıw oblastı ${M(dom)}. Tiykar ${mi(p.b)}>1, kóbeyme logarifmi: ${M(prodTex)}. ${M(`x=${x0}`)} de teńlik (${M(`${p.b ** p.i}\\cdot ${p.b ** p.j}=${prodN}`)}); kóbeyme ${M(dom)} de ósedi. Sheshim ${M(sets)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Domain ${M(dom)}. The base ${mi(p.b)}>1, so ${M(prodTex)}. At ${M(`x=${x0}`)} there is equality (${M(`${p.b ** p.i}\\cdot ${p.b ** p.j}=${prodN}`)}); the product increases on ${M(dom)}. Solution ${M(sets)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Aniqlanish sohasini (ikkala logarifm ostidagi ifoda musbat) hisobga olmaslik yoki tengsizlik belgisini noto'g'ri qo'llash.",
        'Не учитывают ОДЗ (оба аргумента логарифмов положительны) либо неверно переходят к неравенству без логарифмов.',
        "Anıqlanıw oblastın (eki logarifm astındaǵı ańlatpa oń) esapqa almaw yamasa teńsizlik belgisin qáte qollanıw.", // kaa: tekshirilsin
        'Ignoring the domain (both logarithm arguments must be positive) or misapplying the inequality sign.',
      ),
    };
  },
);

// --- 40: trigonometrik tengsizlik: yechim to'plami uzunligi [0; 2pi] da (L2) ---
const SIN_TAB: readonly { tex: string; f: Frac }[] = [
  { tex: '-\\frac{\\sqrt{3}}{2}', f: frac(-1, 3) },
  { tex: '-\\frac{\\sqrt{2}}{2}', f: frac(-1, 4) },
  { tex: '-\\frac{1}{2}', f: frac(-1, 6) },
  { tex: '0', f: frac(0, 1) },
  { tex: '\\frac{1}{2}', f: frac(1, 6) },
  { tex: '\\frac{\\sqrt{2}}{2}', f: frac(1, 4) },
  { tex: '\\frac{\\sqrt{3}}{2}', f: frac(1, 3) },
];
const COS_TAB: readonly { tex: string; f: Frac }[] = [
  { tex: '\\frac{\\sqrt{3}}{2}', f: frac(1, 6) },
  { tex: '\\frac{\\sqrt{2}}{2}', f: frac(1, 4) },
  { tex: '\\frac{1}{2}', f: frac(1, 3) },
  { tex: '0', f: frac(1, 2) },
  { tex: '-\\frac{1}{2}', f: frac(2, 3) },
  { tex: '-\\frac{\\sqrt{2}}{2}', f: frac(3, 4) },
  { tex: '-\\frac{\\sqrt{3}}{2}', f: frac(5, 6) },
];
interface TrigIneqP {
  fn: 'sin' | 'cos';
  gt: boolean;
  idx: number;
}
y1T<TrigIneqP>(
  'ineq-trig-len',
  40,
  'L2',
  170,
  (r) => ({ fn: r.pick(['sin', 'cos'] as const), gt: r.chance(0.5), idx: r.int(0, 6) }),
  (p) => {
    const e = (p.fn === 'sin' ? SIN_TAB : COS_TAB)[p.idx]!;
    // sin: beta = e.f; sin x > c: pi - 2 beta, < c: pi + 2 beta.  cos: alpha = e.f; cos x > c: 2 alpha, < c: 2pi - 2 alpha
    const len = p.fn === 'sin' ? (p.gt ? fSub(fInt(1), fMul(fInt(2), e.f)) : fAdd(fInt(1), fMul(fInt(2), e.f))) : p.gt ? fMul(fInt(2), e.f) : fSub(fInt(2), fMul(fInt(2), e.f));
    need(len.n > 0 && fNum(len) < 2);
    const other = fSub(fInt(2), len);
    const ineqOk = `\\${p.fn}\\,x${p.gt ? '>' : '<'}${e.tex}`;
    const wrongs = [other, fMul(len, frac(1, 2)), fMul(len, fInt(2)), fSub(fInt(1), fMul(len, frac(1, 2))), fAdd(len, frac(1, 6)), fSub(len, frac(1, 6))].filter((f) => f.n > 0 && fNum(f) <= 2.0001);
    return {
      stem: L(
        `${M('[0;\\ 2\\pi]')} kesmada ${M(ineqOk)} tengsizlik yechimlari to'plamining uzunligini toping.`,
        `Найдите длину множества решений неравенства ${M(ineqOk)} на отрезке ${M('[0;\\ 2\\pi]')}.`,
        `${M('[0;\\ 2\\pi]')} kesindisinde ${M(ineqOk)} teńsizligi sheshimleri kópliginiń uzınlıǵın tabıń.`, // kaa: tekshirilsin
        `Find the length of the solution set of the inequality ${M(ineqOk)} on the segment ${M('[0;\\ 2\\pi]')}.`,
      ),
      correct: mpi(len),
      wrong: fracWrong(len, wrongs, mpi),
      sol: L(
        `Birlik aylanada ${p.fn === 'sin' ? 'ordinata' : 'abssissa'} ${M(`${p.gt ? '>' : '<'}${e.tex}`)} bo'lgan yoy: ${p.fn === 'sin' ? M(T`\arcsin ${e.tex}=${piTex(e.f)}`) : M(T`\arccos ${e.tex}=${piTex(e.f)}`)}. Uzunlik ${mpi(len)}. ${ANS.uz}: ${mpi(len)}.`,
        `Дуга единичной окружности, где ${p.fn === 'sin' ? 'ордината' : 'абсцисса'} ${M(`${p.gt ? '>' : '<'}${e.tex}`)}: ${p.fn === 'sin' ? M(T`\arcsin ${e.tex}=${piTex(e.f)}`) : M(T`\arccos ${e.tex}=${piTex(e.f)}`)}. Длина ${mpi(len)}. ${ANS.ru}: ${mpi(len)}.`,
        `Birlik aylanada ${p.fn === 'sin' ? 'ordinata' : 'abscissa'} ${M(`${p.gt ? '>' : '<'}${e.tex}`)} bolǵan jay: ${p.fn === 'sin' ? M(T`\arcsin ${e.tex}=${piTex(e.f)}`) : M(T`\arccos ${e.tex}=${piTex(e.f)}`)}. Uzınlıq ${mpi(len)}. ${ANS.kaa}: ${mpi(len)}.`, // kaa: tekshirilsin
        `On the unit circle, the arc where the ${p.fn === 'sin' ? 'ordinate' : 'abscissa'} is ${M(`${p.gt ? '>' : '<'}${e.tex}`)}: ${p.fn === 'sin' ? M(T`\arcsin ${e.tex}=${piTex(e.f)}`) : M(T`\arccos ${e.tex}=${piTex(e.f)}`)}. Its length is ${mpi(len)}. ${ANS.en}: ${mpi(len)}.`,
      ),
      mis: L(
        "Yechim yoyini faqat bitta oraliq deb olish (yoki $[0;2\\pi]$ da ikkita yoy borligini unutish) hamda to'ldiruvchi yoyni olish.",
        'Берут дополнительную дугу вместо искомой либо забывают, что на $[0;2\\pi]$ решение может состоять из двух частей.',
        "Sheshim doǵasın tek bir aralıq dep alıw (yamasa $[0;2\\pi]$ de eki doǵa bolıwı múmkinligin umıtıw) hám tolıqtırıwshı doǵanı alıw.", // kaa: tekshirilsin
        'Taking the complementary arc instead of the required one, or forgetting that on $[0;2\\pi]$ the solution may consist of two pieces.',
      ),
    };
  },
);

// --- 30: kubik tengsizlik: oraliqlar birlashmasi (L2) ---
interface CubicUnionP {
  roots: [number, number, number];
  pos: boolean;
  strict: boolean;
}
y1T<CubicUnionP>(
  'ineq-cubic-union',
  30,
  'L2',
  160,
  (r) => {
    const a = r.int(-7, 7);
    const b = r.int(-7, 7);
    const c = r.int(-7, 7);
    return { roots: [a, b, c], pos: r.chance(0.5), strict: r.chance(0.5) };
  },
  (p) => {
    need(new Set(p.roots).size === 3);
    const [r1, r2, r3] = [...p.roots].sort((x, y) => x - y) as [number, number, number];
    const build = (pos: boolean, strict: boolean): string => {
      const lc = !strict;
      const parts = pos
        ? [ivl(r1, r2, lc, lc), ivl(r3, null, lc, false)]
        : [ivl(null, r1, false, lc), ivl(r2, r3, lc, lc)];
      return M(parts.join('\\cup '));
    };
    const ineq = T`${p.roots.map((rt) => fac(rt)).join('')}${p.pos ? (p.strict ? '>' : '\\ge') : p.strict ? '<' : '\\le'}0`;
    const correct = build(p.pos, p.strict);
    const wrong = [build(!p.pos, p.strict), build(p.pos, !p.strict), build(!p.pos, !p.strict)];
    return {
      stem: L(
        `${M(ineq)} tengsizlikni yeching.`,
        `Решите неравенство ${M(ineq)}.`,
        `${M(ineq)} teńsizligin sheshiń.`, // kaa: tekshirilsin
        `Solve the inequality ${M(ineq)}.`,
      ),
      correct,
      wrong,
      sol: L(
        `Ildizlar: ${M(`${r1},\\ ${r2},\\ ${r3}`)}. Oraliqlar usuli: o'ngdan boshlab ishora ${M('+')}, ${M('-')}, ${M('+')}, ${M('-')} (har bir oddiy ildizda almashadi). ${p.pos ? M('f(x)' + (p.strict ? '>0' : '\\ge 0')) : M('f(x)' + (p.strict ? '<0' : '\\le 0'))}: ${correct}. ${ANS.uz}: ${correct}.`,
        `Корни: ${M(`${r1},\\ ${r2},\\ ${r3}`)}. Метод интервалов: справа знаки ${M('+')}, ${M('-')}, ${M('+')}, ${M('-')} (меняются в каждом простом корне). ${p.pos ? M('f(x)' + (p.strict ? '>0' : '\\ge 0')) : M('f(x)' + (p.strict ? '<0' : '\\le 0'))}: ${correct}. ${ANS.ru}: ${correct}.`,
        `Túbirler: ${M(`${r1},\\ ${r2},\\ ${r3}`)}. Aralıqlar usılı: ońnan baslap belgiler ${M('+')}, ${M('-')}, ${M('+')}, ${M('-')} (hár bir ápiwayı túbirde almasadı). ${p.pos ? M('f(x)' + (p.strict ? '>0' : '\\ge 0')) : M('f(x)' + (p.strict ? '<0' : '\\le 0'))}: ${correct}. ${ANS.kaa}: ${correct}.`, // kaa: tekshirilsin
        `Roots: ${M(`${r1},\\ ${r2},\\ ${r3}`)}. Interval method: the signs from the right are ${M('+')}, ${M('-')}, ${M('+')}, ${M('-')} (they change at every simple root). ${p.pos ? M('f(x)' + (p.strict ? '>0' : '\\ge 0')) : M('f(x)' + (p.strict ? '<0' : '\\le 0'))}: ${correct}. ${ANS.en}: ${correct}.`,
      ),
      mis: L(
        "Ishoralar qatorini o'ngdan emas, chapdan musbat deb boshlash (kubik ko'phad uchun chap tomonda manfiy) yoki chegaralarni qat'iy/noqat'iy aralashtirish.",
        'Начинают знаки слева как «+» (для кубического многочлена слева «−») либо путают строгие и нестрогие скобки.',
        "Belgiler qatarın shepten oń dep baslaw (úshinshi dárejeli kópmúshe ushın shep tárepte teris) yamasa shegaralardı qatań/qatań emes dep aralastırıw.", // kaa: tekshirilsin
        'Starting the sign chart as "+" on the left (for a cubic it is "-" on the left), or mixing strict and non-strict brackets.',
      ),
    };
  },
);

// --- 33: |ax+b| <= c: eng kichik va eng katta butun yechim (L1, O) ---
interface AbsOP {
  a: number;
  b: number;
  c: number;
  strict: boolean;
}
oT<AbsOP>(
  'ineq-o-abs',
  33,
  'L1',
  170,
  (r) => ({ a: r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b: r.int(-9, 9), c: r.int(3, 20), strict: r.chance(0.4) }),
  (p) => {
    need(p.b !== 0);
    // |ax+b| <= c  <=>  -c <= ax+b <= c
    const lower = frac(-p.c - p.b, p.a);
    const upper = frac(p.c - p.b, p.a);
    const lo = fNum(lower) < fNum(upper) ? lower : upper;
    const hi = fNum(lower) < fNum(upper) ? upper : lower;
    const minInt = p.strict ? Math.floor(fNum(lo)) + 1 : Math.ceil(fNum(lo) - 1e-12);
    const maxInt = p.strict ? Math.ceil(fNum(hi)) - 1 : Math.floor(fNum(hi) + 1e-12);
    need(maxInt - minInt >= 3);
    const ineq = T`|${lin(p.a, p.b)}|${p.strict ? '<' : '\\le'}${p.c}`;
    const step = T`-${p.c}${p.strict ? '<' : '\\le'}${lin(p.a, p.b)}${p.strict ? '<' : '\\le'}${p.c}`;
    const res = T`${texF(lo)}${p.strict ? '<' : '\\le'} x ${p.strict ? '<' : '\\le'} ${texF(hi)}`;
    return {
      stem: L(
        `${M(ineq)} tengsizlik berilgan.`,
        `Дано неравенство ${M(ineq)}.`,
        `${M(ineq)} teńsizligi berilgen.`, // kaa: tekshirilsin
        `The inequality ${M(ineq)} is given.`,
      ),
      a: {
        prompt: L('Eng kichik butun yechimini toping.', 'Найдите наименьшее целое решение.', 'Eń kishi pútin sheshimin tabıń.', 'Find the smallest integer solution.'), // kaa: tekshirilsin
        key: fInt(minInt),
      },
      b: {
        prompt: L('Eng katta butun yechimini toping.', 'Найдите наибольшее целое решение.', 'Eń úlken pútin sheshimin tabıń.', 'Find the largest integer solution.'), // kaa: tekshirilsin
        key: fInt(maxInt),
      },
      sol: L(
        `${M(step)}. ${p.a < 0 ? `${M(p.a + '<0')} bo'lgani uchun bo'lishda belgilar teskariga o'zgaradi. ` : ''}Bundan ${M(res)}. Eng kichik butun ${mi(minInt)}, eng katta butun ${mi(maxInt)}.`,
        `${M(step)}. ${p.a < 0 ? `Так как ${M(p.a + '<0')}, при делении знаки неравенства меняются. ` : ''}Отсюда ${M(res)}. Наименьшее целое ${mi(minInt)}, наибольшее целое ${mi(maxInt)}.`,
        `${M(step)}. ${p.a < 0 ? `${M(p.a + '<0')} bolǵanlıqtan bóliwde belgiler keri ózgeredi. ` : ''}Bunnan ${M(res)}. Eń kishi pútin ${mi(minInt)}, eń úlken pútin ${mi(maxInt)}.`, // kaa: tekshirilsin
        `${M(step)}. ${p.a < 0 ? `Since ${M(p.a + '<0')}, the signs reverse when dividing. ` : ''}Hence ${M(res)}. The smallest integer is ${mi(minInt)}, the largest is ${mi(maxInt)}.`,
      ),
      mis: L(
        "Manfiy songa bo'lganda tengsizlik belgilarini almashtirishni unutish yoki kasr chegaralarni noto'g'ri yaxlitlash (eng kichik butunni pastga, eng kattasini yuqoriga olish).",
        'Забывают менять знаки при делении на отрицательное число либо неверно округляют дробные границы (наименьшее целое — вниз, наибольшее — вверх).',
        "Teris sanǵa bóliwde teńsizlik belgilerin almastırıwdı umıtıw yamasa bólshek shegaralardı qáte jaqınlastırıw.", // kaa: tekshirilsin
        'Forgetting to reverse the signs when dividing by a negative number, or rounding fractional bounds the wrong way.',
      ),
    };
  },
);

// --- 36: kvadrat tengsizlik va modulli tengsizlik sistemasi (L3, O) ---
interface QuadAbsSysP {
  s: number;
  pr: number;
  a: number;
  b: number;
}
oT<QuadAbsSysP>(
  'ineq-o-quad-abs',
  36,
  'L3',
  260,
  (r) => {
    const r1 = r.int(-8, 0);
    const r2 = r1 + r.int(5, 13);
    return { s: r1 + r2, pr: r1 * r2, a: r.int(r1, r2), b: r.int(1, 4) };
  },
  (p) => {
    need(p.s !== 0 && p.pr !== 0);
    const dd = p.s * p.s - 4 * p.pr;
    const sq = isqrt(dd);
    need(sq !== null && sq > 0);
    const r1 = (p.s - sq) / 2;
    const r2 = (p.s + sq) / 2;
    need(Number.isInteger(r1) && Number.isInteger(r2));
    // [r1, r2] dan [a-b, a+b] ni (yopiq) chiqarib tashlaymiz
    const cutLo = Math.max(r1, p.a - p.b);
    const cutHi = Math.min(r2, p.a + p.b);
    const cutN = Math.max(0, cutHi - cutLo + 1);
    const cutSum = cutN > 0 ? sumRange(cutLo, cutHi) : 0;
    const cnt = r2 - r1 + 1 - cutN;
    const tot = sumRange(r1, r2) - cutSum;
    need(cnt >= 4 && cutN >= 1 && cnt <= 14);
    const sys = T`\begin{cases}${polyTex([p.pr, -p.s, 1])}\le 0\\|${xs(-p.a)}|>${p.b}\end{cases}`;
    return {
      stem: L(
        `${M(sys)} tengsizliklar sistemasi berilgan.`,
        `Дана система неравенств ${M(sys)}.`,
        `${M(sys)} teńsizlikler sistemasi berilgen.`, // kaa: tekshirilsin
        `The system of inequalities ${M(sys)} is given.`,
      ),
      a: {
        prompt: L('Butun yechimlari sonini toping.', 'Найдите число целых решений.', 'Pútin sheshimleri sanın tabıń.', 'Find the number of integer solutions.'), // kaa: tekshirilsin
        key: fInt(cnt),
      },
      b: {
        prompt: L("Butun yechimlari yig'indisini toping.", 'Найдите сумму целых решений.', 'Pútin sheshimleri qosındısın tabıń.', 'Find the sum of the integer solutions.'), // kaa: tekshirilsin
        key: fInt(tot),
      },
      sol: L(
        `Birinchisidan ${M(`${r1}\\le x\\le ${r2}`)}. Ikkinchisidan ${M(`x<${p.a - p.b}`)} yoki ${M(`x>${p.a + p.b}`)}, ya'ni ${M(`${p.a - p.b}\\le x\\le ${p.a + p.b}`)} chiqarib tashlanadi. Butun sonlar: ${mi(r2 - r1 + 1)} ta, chiqarib tashlanadi ${mi(cutN)} ta. Soni ${mi(cnt)}, yig'indisi ${mi(tot)}.`,
        `Из первого ${M(`${r1}\\le x\\le ${r2}`)}. Из второго ${M(`x<${p.a - p.b}`)} или ${M(`x>${p.a + p.b}`)}, то есть отрезок ${M(`${p.a - p.b}\\le x\\le ${p.a + p.b}`)} исключается. Целых чисел ${mi(r2 - r1 + 1)}, исключается ${mi(cutN)}. Число решений ${mi(cnt)}, сумма ${mi(tot)}.`,
        `Birinshisinen ${M(`${r1}\\le x\\le ${r2}`)}. Ekinshisinen ${M(`x<${p.a - p.b}`)} yamasa ${M(`x>${p.a + p.b}`)}, yaǵnıy ${M(`${p.a - p.b}\\le x\\le ${p.a + p.b}`)} shıǵarıp taslanadı. Pútin sanlar ${mi(r2 - r1 + 1)} dana, shıǵarıladı ${mi(cutN)} dana. Sanı ${mi(cnt)}, qosındısı ${mi(tot)}.`, // kaa: tekshirilsin
        `From the first ${M(`${r1}\\le x\\le ${r2}`)}. From the second ${M(`x<${p.a - p.b}`)} or ${M(`x>${p.a + p.b}`)}, i.e. the segment ${M(`${p.a - p.b}\\le x\\le ${p.a + p.b}`)} is excluded. There are ${mi(r2 - r1 + 1)} integers, ${mi(cutN)} are excluded. Count ${mi(cnt)}, sum ${mi(tot)}.`,
      ),
      mis: L(
        "$|x-a|>b$ ni $|x-a|<b$ bilan almashtirib yuborish (tashqi qismlar o'rniga ichki oraliqni olish) yoki chegara nuqtalarini noto'g'ri hisoblash.",
        'Путают $|x-a|>b$ с $|x-a|<b$ (берут внутренний промежуток вместо внешних частей) либо неверно учитывают граничные точки.',
        "$|x-a|>b$ ni $|x-a|<b$ penen almastırıp jiberiw (sırtqı bólekler ornına ishki aralıqtı alıw) yamasa shegara noqatların qáte esaplaw.", // kaa: tekshirilsin
        'Confusing $|x-a|>b$ with $|x-a|<b$ (taking the inner interval instead of the outer parts), or miscounting the boundary points.',
      ),
    };
  },
);

// --- 108: ikki o'zgaruvchili tengsizliklar sistemasi: butun nuqtalar soni (L1) ---
const ysf = (n: number): string => (n === 0 ? 'y' : `y${sg(n)}`);
interface TriLatticeP {
  a: number;
  b: number;
  c: number;
}
y1T<TriLatticeP>(
  'sys2-tri-lattice',
  108,
  'L1',
  180,
  (r) => ({ a: r.int(1, 4), b: r.int(1, 5), c: r.int(8, 26) }),
  (p) => {
    let cnt = 0;
    let onLine = 0;
    let noAxes = 0;
    for (let x = 0; p.a * x <= p.c; x++) {
      const ymax = Math.floor((p.c - p.a * x) / p.b);
      cnt += ymax + 1;
      if ((p.c - p.a * x) % p.b === 0) onLine++;
      if (x > 0) noAxes += ymax;
    }
    need(cnt >= 12 && cnt <= 90);
    const sys = T`\begin{cases}x\ge 0\\y\ge 0\\${lin2(p.a, p.b)}\le ${p.c}\end{cases}`;
    const rect = (Math.floor(p.c / p.a) + 1) * (Math.floor(p.c / p.b) + 1);
    const area = Math.round((p.c * p.c) / (2 * p.a * p.b));
    const cols = Array.from({ length: Math.floor(p.c / p.a) + 1 }, (_, x) => `${Math.floor((p.c - p.a * x) / p.b) + 1}`).join('+');
    return {
      stem: L(
        `${M(sys)} tengsizliklar sistemasini qanoatlantiruvchi koordinatalari butun bo'lgan ${M('(x;\\ y)')} nuqtalar nechta?`,
        `Сколько точек ${M('(x;\\ y)')} с целыми координатами удовлетворяют системе неравенств ${M(sys)}?`,
        `${M(sys)} teńsizlikler sistemasın qanaatlandırıwshı koordinataları pútin bolǵan ${M('(x;\\ y)')} noqatlar neshe?`, // kaa: tekshirilsin
        `How many points ${M('(x;\\ y)')} with integer coordinates satisfy the system ${M(sys)}?`,
      ),
      correct: mi(cnt),
      wrong: intWrong(cnt, [cnt - onLine, noAxes, rect, area, cnt + 1], { min: 1 }),
      sol: L(
        `Har bir butun ${M('x')} (${M(`0\\le x\\le ${Math.floor(p.c / p.a)}`)}) uchun ${M('y')} qiymati ${M(`0`)} dan${M(`\\left\\lfloor\\frac{${p.c}${sg(-p.a)}x}{${p.b}}\\right\\rfloor`)} gacha. Nuqtalar soni: ${M(`${cols}=${cnt}`)}. ${ANS.uz}: ${mi(cnt)}.`,
        `Для каждого целого ${M('x')} (${M(`0\\le x\\le ${Math.floor(p.c / p.a)}`)}) значение ${M('y')} от ${M('0')} до ${M(`\\left\\lfloor\\frac{${p.c}${sg(-p.a)}x}{${p.b}}\\right\\rfloor`)}. Число точек: ${M(`${cols}=${cnt}`)}. ${ANS.ru}: ${mi(cnt)}.`,
        `Hár bir pútin ${M('x')} (${M(`0\\le x\\le ${Math.floor(p.c / p.a)}`)}) ushın ${M('y')} mánisi ${M('0')} den${M(`\\left\\lfloor\\frac{${p.c}${sg(-p.a)}x}{${p.b}}\\right\\rfloor`)} ge shekem. Noqatlar sanı: ${M(`${cols}=${cnt}`)}. ${ANS.kaa}: ${mi(cnt)}.`, // kaa: tekshirilsin
        `For each integer ${M('x')} (${M(`0\\le x\\le ${Math.floor(p.c / p.a)}`)}) the value ${M('y')} runs from ${M('0')} to ${M(`\\left\\lfloor\\frac{${p.c}${sg(-p.a)}x}{${p.b}}\\right\\rfloor`)}. Number of points: ${M(`${cols}=${cnt}`)}. ${ANS.en}: ${mi(cnt)}.`,
      ),
      mis: L(
        "Koordinata o'qlaridagi nuqtalarni ($x=0$ yoki $y=0$) tashlab yuborish yoki nuqtalar sonini yuza bilan almashtirish.",
        'Теряют точки на осях координат ($x=0$ или $y=0$) либо подменяют число точек площадью.',
        "Koordinata kósherlerindegi noqatlardı ($x=0$ yamasa $y=0$) taslap jiberiw yamasa noqatlar sanın maydan menen almastırıw.", // kaa: tekshirilsin
        'Dropping the points on the coordinate axes ($x=0$ or $y=0$), or replacing the point count by the area.',
      ),
    };
  },
);

// --- 108: ikki o'zgaruvchili tengsizliklar sistemasi: soha yuzi (L2) ---
type AreaKind = 'v' | 'd' | 't';
interface Sys2AreaP {
  kind: AreaKind;
  a: number;
  b: number;
  h: number;
  pq: [number, number, number];
}
y1T<Sys2AreaP>(
  'sys2-area',
  108,
  'L2',
  200,
  (r) => ({ kind: r.pick(['v', 'd', 't'] as const), a: r.int(-4, 4), b: r.int(-4, 4), h: r.int(2, 8), pq: [r.int(1, 4), r.int(1, 4), r.int(6, 20)] }),
  (p) => {
    let area: Frac;
    let sys: string;
    let how: L10n;
    let wrong: Frac[];
    if (p.kind === 'v') {
      need(p.h >= 3 && Math.abs(p.a) + p.h <= 11);
      area = fInt(p.h * p.h);
      sys = T`\begin{cases}y\ge |${xs(-p.a)}|\\y\le ${p.h}\end{cases}`;
      wrong = [fInt(2 * p.h * p.h), fInt(p.h * p.h * 2 - p.h), frac(p.h * p.h, 2), fInt(4 * p.h * p.h)];
      how = L(
        `Uchburchak: uchlari ${M(`(${p.a - p.h};\\ ${p.h})`)}, ${M(`(${p.a + p.h};\\ ${p.h})`)}, ${M(`(${p.a};\\ 0)`)}; asosi ${mi(2 * p.h)}, balandligi ${mi(p.h)}: ${M(`S=\\frac{1}{2}\\cdot ${2 * p.h}\\cdot ${p.h}=${p.h * p.h}`)}.`,
        `Треугольник с вершинами ${M(`(${p.a - p.h};\\ ${p.h})`)}, ${M(`(${p.a + p.h};\\ ${p.h})`)}, ${M(`(${p.a};\\ 0)`)}: основание ${mi(2 * p.h)}, высота ${mi(p.h)}, ${M(`S=\\frac{1}{2}\\cdot ${2 * p.h}\\cdot ${p.h}=${p.h * p.h}`)}.`,
        `Úshmúyeshlik: ushları ${M(`(${p.a - p.h};\\ ${p.h})`)}, ${M(`(${p.a + p.h};\\ ${p.h})`)}, ${M(`(${p.a};\\ 0)`)}; ultanı ${mi(2 * p.h)}, biyiklik ${mi(p.h)}: ${M(`S=\\frac{1}{2}\\cdot ${2 * p.h}\\cdot ${p.h}=${p.h * p.h}`)}.`, // kaa: tekshirilsin
        `A triangle with vertices ${M(`(${p.a - p.h};\\ ${p.h})`)}, ${M(`(${p.a + p.h};\\ ${p.h})`)}, ${M(`(${p.a};\\ 0)`)}: base ${mi(2 * p.h)}, height ${mi(p.h)}, ${M(`S=\\frac{1}{2}\\cdot ${2 * p.h}\\cdot ${p.h}=${p.h * p.h}`)}.`,
      );
    } else if (p.kind === 'd') {
      const n = Math.max(2, p.h - 2);
      need(n <= 6 && Math.abs(p.a) + n <= 10 && Math.abs(p.b) + n <= 10);
      area = fInt(2 * n * n);
      sys = T`|${xs(-p.a)}|+|${ysf(-p.b)}|\le ${n}`;
      wrong = [fInt(n * n), fInt(4 * n * n), fInt(2 * n), fInt(4 * n)];
      how = L(
        `Soha — diagonallari ${mi(2 * n)} bo'lgan kvadrat (romb): ${M(`S=\\frac{d_1d_2}{2}=\\frac{${2 * n}\\cdot ${2 * n}}{2}=${2 * n * n}`)}.`,
        `Область — квадрат (ромб) с диагоналями ${mi(2 * n)}: ${M(`S=\\frac{d_1d_2}{2}=\\frac{${2 * n}\\cdot ${2 * n}}{2}=${2 * n * n}`)}.`,
        `Oblast — diagonalları ${mi(2 * n)} bolǵan kvadrat (romb): ${M(`S=\\frac{d_1d_2}{2}=\\frac{${2 * n}\\cdot ${2 * n}}{2}=${2 * n * n}`)}.`, // kaa: tekshirilsin
        `The region is a square (rhombus) with diagonals ${mi(2 * n)}: ${M(`S=\\frac{d_1d_2}{2}=\\frac{${2 * n}\\cdot ${2 * n}}{2}=${2 * n * n}`)}.`,
      );
    } else {
      const [pp, qq, rr] = p.pq;
      need(rr / pp <= 11 && rr / qq <= 11 && rr / pp >= 3 && rr / qq >= 3);
      area = frac(rr * rr, 2 * pp * qq);
      sys = T`\begin{cases}x\ge 0\\y\ge 0\\${lin2(pp, qq)}\le ${rr}\end{cases}`;
      wrong = [frac(rr * rr, pp * qq), frac(rr * rr, 4 * pp * qq), frac(rr, pp * qq), frac(rr * rr, 2)];
      how = L(
        `Soha — to'g'ri burchakli uchburchak: katetlari ${M(`\\frac{${rr}}{${pp}}`)} va ${M(`\\frac{${rr}}{${qq}}`)}: ${M(`S=\\frac{1}{2}\\cdot\\frac{${rr}}{${pp}}\\cdot\\frac{${rr}}{${qq}}=${texF(area)}`)}.`,
        `Область — прямоугольный треугольник с катетами ${M(`\\frac{${rr}}{${pp}}`)} и ${M(`\\frac{${rr}}{${qq}}`)}: ${M(`S=\\frac{1}{2}\\cdot\\frac{${rr}}{${pp}}\\cdot\\frac{${rr}}{${qq}}=${texF(area)}`)}.`,
        `Oblast — tuwrı müyeshli úshmúyeshlik: katetleri ${M(`\\frac{${rr}}{${pp}}`)} hám ${M(`\\frac{${rr}}{${qq}}`)}: ${M(`S=\\frac{1}{2}\\cdot\\frac{${rr}}{${pp}}\\cdot\\frac{${rr}}{${qq}}=${texF(area)}`)}.`, // kaa: tekshirilsin
        `The region is a right triangle with legs ${M(`\\frac{${rr}}{${pp}}`)} and ${M(`\\frac{${rr}}{${qq}}`)}: ${M(`S=\\frac{1}{2}\\cdot\\frac{${rr}}{${pp}}\\cdot\\frac{${rr}}{${qq}}=${texF(area)}`)}.`,
      );
    }
    need(fNum(area) >= 6 && area.d <= 40 && area.n <= 400);
    return {
      stem: L(
        `${M(sys)} ${sys.includes('begin') ? 'tengsizliklar sistemasi' : 'tengsizlik'} bilan aniqlangan shaklning yuzini toping.`,
        `Найдите площадь фигуры, заданной ${sys.includes('begin') ? 'системой неравенств' : 'неравенством'} ${M(sys)}.`,
        `${M(sys)} ${sys.includes('begin') ? 'teńsizlikler sisteması' : 'teńsizligi'} menen anıqlanǵan figuranıń maydanın tabıń.`, // kaa: tekshirilsin
        `Find the area of the figure defined by ${sys.includes('begin') ? 'the system of inequalities' : 'the inequality'} ${M(sys)}.`,
      ),
      correct: mf(area),
      wrong: fracWrong(area, wrong),
      sol: J(how, fin(texF(area))),
      mis: L(
        "Uchburchak yuzidagi $\\frac{1}{2}$ ko'paytuvchisini tashlab ketish yoki sohaning uchlarini noto'g'ri topish.",
        'Теряют множитель $\\frac{1}{2}$ в площади треугольника либо неверно находят вершины области.',
        "Úshmúyeshlik maydanındaǵı $\\frac{1}{2}$ kóbeytiwshisin taslap ketiw yamasa oblasttıń ushların qáte tabıw.", // kaa: tekshirilsin
        'Dropping the factor $\\frac{1}{2}$ in the triangle area, or finding the vertices of the region wrongly.',
      ),
    };
  },
);

// --- 108: chiziqli maqsad funksiyasi: butun nuqtalarda eng katta qiymat (L3) ---
interface LpP {
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  p: number;
  q: number;
}
y1T<LpP>(
  'sys2-lp',
  108,
  'L3',
  240,
  (r) => {
    const x0 = r.int(2, 7);
    const y0 = r.int(2, 7);
    const a1 = r.int(1, 4);
    const b1 = r.int(1, 4);
    const a2 = r.int(1, 4);
    const b2 = r.int(1, 4);
    return { a1, b1, c1: a1 * x0 + b1 * y0, a2, b2, c2: a2 * x0 + b2 * y0, p: r.int(1, 5), q: r.int(1, 5) };
  },
  (p) => {
    need(p.a1 * p.b2 !== p.a2 * p.b1);
    // chegaraviy to'g'ri chiziqlar: x=0, y=0, L1, L2  (A x + B y = C)
    const lines: [number, number, number][] = [
      [1, 0, 0],
      [0, 1, 0],
      [p.a1, p.b1, p.c1],
      [p.a2, p.b2, p.c2],
    ];
    const feasible = (x: Frac, y: Frac): boolean => x.n >= 0 && y.n >= 0 && fNum(x) * p.a1 + fNum(y) * p.b1 <= p.c1 + 1e-9 && fNum(x) * p.a2 + fNum(y) * p.b2 <= p.c2 + 1e-9;
    const verts: [Frac, Frac][] = [];
    for (let i = 0; i < 4; i++)
      for (let j = i + 1; j < 4; j++) {
        const [A1, B1, C1] = lines[i]!;
        const [A2, B2, C2] = lines[j]!;
        const det = A1 * B2 - A2 * B1;
        if (det === 0) continue;
        const x = frac(C1 * B2 - C2 * B1, det);
        const y = frac(A1 * C2 - A2 * C1, det);
        if (feasible(x, y) && !verts.some(([vx, vy]) => vx.n === x.n && vx.d === x.d && vy.n === y.n && vy.d === y.d)) verts.push([x, y]);
      }
    need(verts.length >= 4 && verts.every(([x, y]) => x.d === 1 && y.d === 1));
    const vals = verts.map(([x, y]) => p.p * x.n + p.q * y.n);
    const best = Math.max(...vals);
    need(vals.filter((v) => v === best).length === 1 && best <= 120);
    const sys = T`\begin{cases}x\ge 0\\y\ge 0\\${lin2(p.a1, p.b1)}\le ${p.c1}\\${lin2(p.a2, p.b2)}\le ${p.c2}\end{cases}`;
    const F = lin2(p.p, p.q);
    const vtex = verts.map(([x, y], i) => `(${x.n};\\ ${y.n})\\to ${vals[i]}`).join(',\\quad ');
    const wrongs = [...new Set(vals.filter((v) => v !== best))];
    return {
      stem: L(
        `${M(sys)} sistemani qanoatlantiruvchi ${M('(x;\\ y)')} nuqtalarda ${M(`F=${F}`)} ifodaning eng katta qiymatini toping.`,
        `Найдите наибольшее значение выражения ${M(`F=${F}`)} в точках ${M('(x;\\ y)')}, удовлетворяющих системе ${M(sys)}.`,
        `${M(sys)} sistemasın qanaatlandırıwshı ${M('(x;\\ y)')} noqatlarda ${M(`F=${F}`)} ańlatpasınıń eń úlken mánisin tabıń.`, // kaa: tekshirilsin
        `Find the largest value of ${M(`F=${F}`)} over the points ${M('(x;\\ y)')} satisfying the system ${M(sys)}.`,
      ),
      correct: mi(best),
      wrong: intWrong(best, [...wrongs, best + p.p, best - p.q], { min: 0 }),
      sol: L(
        `Soha qavariq ko'pburchak; ${M('F')} chiziqli, shuning uchun eng katta qiymat uchlardan birida. Uchlar va ${M('F')} qiymatlari: ${M(vtex)}. Eng kattasi ${mi(best)}. ${ANS.uz}: ${mi(best)}.`,
        `Область — выпуклый многоугольник; ${M('F')} линейна, поэтому наибольшее значение достигается в одной из вершин. Вершины и значения ${M('F')}: ${M(vtex)}. Наибольшее ${mi(best)}. ${ANS.ru}: ${mi(best)}.`,
        `Oblast — dóńes kóp múyeshlik; ${M('F')} sızıqlı, sonlıqtan eń úlken mánis ushlardıń birinde. Ushlar hám ${M('F')} mánisleri: ${M(vtex)}. Eń úlkeni ${mi(best)}. ${ANS.kaa}: ${mi(best)}.`, // kaa: tekshirilsin
        `The region is a convex polygon and ${M('F')} is linear, so the maximum is at a vertex. Vertices and values of ${M('F')}: ${M(vtex)}. The largest is ${mi(best)}. ${ANS.en}: ${mi(best)}.`,
      ),
      mis: L(
        "Barcha uchlarni topmaslik (ayniqsa ikki chegaraviy chiziqning kesishish nuqtasini) yoki $F$ ni faqat bitta uchda hisoblash.",
        'Находят не все вершины (особенно точку пересечения двух граничных прямых) либо считают $F$ только в одной вершине.',
        "Barlıq ushlardı tappaw (ásirese eki shegaralıq sızıqtıń kesilisiw noqatın) yamasa $F$ ti tek bir ushta esaplaw.", // kaa: tekshirilsin
        'Not finding all the vertices (especially the intersection of the two boundary lines), or evaluating $F$ at one vertex only.',
      ),
    };
  },
);

// --- 108: |x-a|+|y-b| <= n : butun nuqtalar soni va yuzi (L2, O) ---
interface DiamondP {
  a: number;
  b: number;
  n: number;
}
oT<DiamondP>(
  'sys2-diamond',
  108,
  'L2',
  200,
  (r) => ({ a: r.int(-5, 5), b: r.int(-5, 5), n: r.int(2, 7) }),
  (p) => {
    need(Math.abs(p.a) + p.n <= 10 && Math.abs(p.b) + p.n <= 10);
    const pts = 2 * p.n * p.n + 2 * p.n + 1;
    const area = 2 * p.n * p.n;
    const ineq = T`|${xs(-p.a)}|+|${ysf(-p.b)}|\le ${p.n}`;
    return {
      stem: L(
        `${M(ineq)} tengsizlik bilan aniqlangan shakl berilgan.`,
        `Дана фигура, заданная неравенством ${M(ineq)}.`,
        `${M(ineq)} teńsizligi menen anıqlanǵan figura berilgen.`, // kaa: tekshirilsin
        `A figure defined by the inequality ${M(ineq)} is given.`,
      ),
      a: {
        prompt: L(`Shaklda yotuvchi koordinatalari butun bo'lgan nuqtalar sonini toping.`, 'Найдите число точек фигуры с целыми координатами.', 'Figurada jatıwshı koordinataları pútin bolǵan noqatlar sanın tabıń.', 'Find the number of points of the figure with integer coordinates.'), // kaa: tekshirilsin
        key: fInt(pts),
      },
      b: {
        prompt: L('Shaklning yuzini toping.', 'Найдите площадь фигуры.', 'Figuranıń maydanın tabıń.', 'Find the area of the figure.'), // kaa: tekshirilsin
        key: fInt(area),
      },
      sol: L(
        `Markaz ${M(`(${p.a};\\ ${p.b})`)}, ${M(`|u|+|v|\\le ${p.n}`)} — romb (diagonallari ${mi(2 * p.n)}). Yuza ${M(`\\frac{${2 * p.n}\\cdot ${2 * p.n}}{2}=${area}`)}. Butun nuqtalar: ${M(`u=-${p.n},\\ldots,${p.n}`)} uchun ${M(`2(${p.n}-|u|)+1`)} ta, jami ${M(`${2 * p.n * p.n}+${2 * p.n}+1=${pts}`)}.`,
        `Центр ${M(`(${p.a};\\ ${p.b})`)}, ${M(`|u|+|v|\\le ${p.n}`)} — ромб с диагоналями ${mi(2 * p.n)}. Площадь ${M(`\\frac{${2 * p.n}\\cdot ${2 * p.n}}{2}=${area}`)}. Целые точки: при ${M(`u=-${p.n},\\ldots,${p.n}`)} по ${M(`2(${p.n}-|u|)+1`)} точек, всего ${M(`${2 * p.n * p.n}+${2 * p.n}+1=${pts}`)}.`,
        `Orayı ${M(`(${p.a};\\ ${p.b})`)}, ${M(`|u|+|v|\\le ${p.n}`)} — romb (diagonalları ${mi(2 * p.n)}). Maydan ${M(`\\frac{${2 * p.n}\\cdot ${2 * p.n}}{2}=${area}`)}. Pútin noqatlar: ${M(`u=-${p.n},\\ldots,${p.n}`)} ushın ${M(`2(${p.n}-|u|)+1`)} dana, jámi ${M(`${2 * p.n * p.n}+${2 * p.n}+1=${pts}`)}.`, // kaa: tekshirilsin
        `Centre ${M(`(${p.a};\\ ${p.b})`)}, ${M(`|u|+|v|\\le ${p.n}`)} is a rhombus with diagonals ${mi(2 * p.n)}. Area ${M(`\\frac{${2 * p.n}\\cdot ${2 * p.n}}{2}=${area}`)}. Integer points: for ${M(`u=-${p.n},\\ldots,${p.n}`)} there are ${M(`2(${p.n}-|u|)+1`)}, total ${M(`${2 * p.n * p.n}+${2 * p.n}+1=${pts}`)}.`,
      ),
      mis: L(
        "Butun nuqtalar sonini yuzaga tenglashtirish (chegaradagi nuqtalarni va markaziy nuqtani hisobga olmaslik).",
        'Приравнивают число целых точек к площади (не учитывая граничные точки и центр).',
        "Pútin noqatlar sanın maydanǵa teńlestiriw (shegaradaǵı noqatlardı hám orayıy noqattı esapqa almaw).", // kaa: tekshirilsin
        'Equating the number of integer points with the area (ignoring boundary points and the centre).',
      ),
    };
  },
);

// --- 109: |x^2-2px-q| = m: ildizlar soni (grafik usul) (L2) ---
interface AbsQuadCountP {
  p: number;
  q: number;
  m: number;
}
y1T<AbsQuadCountP>(
  'gr-abs-quad-count',
  109,
  'L2',
  150,
  (r) => ({ p: r.int(-4, 4), q: r.int(-8, 8), m: r.int(1, 14) }),
  (p) => {
    need(p.p !== 0 && p.q !== 0);
    const h = p.p * p.p + p.q;
    need(h >= 2 && p.m !== h);
    const ans = p.m < h ? 4 : 2;
    const eq = T`|${polyTex([-p.q, -2 * p.p, 1])}|=${p.m}`;
    return {
      stem: L(
        `Grafik usuldan foydalanib, ${M(eq)} tenglama nechta ildizga ega ekanini aniqlang.`,
        `Используя графический метод, определите, сколько корней имеет уравнение ${M(eq)}.`,
        `Grafik usıldan paydalanıp, ${M(eq)} teńlemesi neshe túbirge iye ekenin anıqlań.`, // kaa: tekshirilsin
        `Using the graphical method, determine how many roots the equation ${M(eq)} has.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [1, 2, 3, 4], { min: 1, max: 4 }),
      sol: L(
        `${M(T`y=${polyTex([-p.q, -2 * p.p, 1])}`)} parabolaning uchi ${M(`(${p.p};\\ ${-h})`)}; modul ostida pastki qism yuqoriga akslanadi, uchi ${M(`(${p.p};\\ ${h})`)} ga o'tadi. ${M(`y=${p.m}`)} to'g'ri chiziq ${p.m < h ? `${M(`${p.m}<${h}`)} bo'lgani uchun grafikni 4 nuqtada` : `${M(`${p.m}>${h}`)} bo'lgani uchun grafikni 2 nuqtada`} kesadi. ${ANS.uz}: ${mi(ans)}.`,
        `Вершина параболы ${M(T`y=${polyTex([-p.q, -2 * p.p, 1])}`)} — ${M(`(${p.p};\\ ${-h})`)}; под модулем нижняя часть отражается вверх, вершина переходит в ${M(`(${p.p};\\ ${h})`)}. Прямая ${M(`y=${p.m}`)} ${p.m < h ? `при ${M(`${p.m}<${h}`)} пересекает график в 4 точках` : `при ${M(`${p.m}>${h}`)} пересекает график в 2 точках`}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(T`y=${polyTex([-p.q, -2 * p.p, 1])}`)} parabolasınıń ushı ${M(`(${p.p};\\ ${-h})`)}; modul astında tómengi bólim joqarıǵa sáwlelenedi, ush ${M(`(${p.p};\\ ${h})`)} ge ótedi. ${M(`y=${p.m}`)} tuwrı sızıǵı ${p.m < h ? `${M(`${p.m}<${h}`)} bolǵanlıqtan grafikti 4 noqatta` : `${M(`${p.m}>${h}`)} bolǵanlıqtan grafikti 2 noqatta`} kesedi. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `The parabola ${M(T`y=${polyTex([-p.q, -2 * p.p, 1])}`)} has vertex ${M(`(${p.p};\\ ${-h})`)}; under the modulus the lower part is reflected up and the vertex moves to ${M(`(${p.p};\\ ${h})`)}. The line ${M(`y=${p.m}`)} ${p.m < h ? `meets the graph at 4 points since ${M(`${p.m}<${h}`)}` : `meets the graph at 2 points since ${M(`${p.m}>${h}`)}`}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Modul ostidagi parabolaning pastki qismi yuqoriga akslanishini va uning cho'qqisi balandligini ($m$ bilan solishtiriladigan qiymat) e'tiborga olmaslik.",
        'Не учитывают, что нижняя часть параболы под модулем отражается вверх, и не сравнивают $m$ с высотой новой вершины.',
        "Modul astındaǵı parabolanıń tómengi bólimi joqarıǵa sáwlelenetuǵının hám onıń ushı biyikligin ($m$ menen salıstırılatuǵın mánis) esapqa almaw.", // kaa: tekshirilsin
        'Not noticing that the lower part of the parabola is reflected upward under the modulus, and not comparing $m$ with the height of the new vertex.',
      ),
    };
  },
);

// --- 109: parametr qiymatlari soni (L3) ---
interface AbsQuadParamP {
  p: number;
  q: number;
}
y1T<AbsQuadParamP>(
  'gr-abs-param',
  109,
  'L3',
  200,
  (r) => ({ p: r.int(-4, 4), q: r.int(-12, 12) }),
  (p) => {
    need(p.p !== 0 && p.q !== 0);
    const h = p.p * p.p + p.q;
    need(h >= 3 && h <= 22);
    const ans = h - 1;
    const eq = T`|${polyTex([-p.q, -2 * p.p, 1])}|=m`;
    return {
      stem: L(
        `${M('m')} ning nechta butun qiymatida ${M(eq)} tenglama aniq 4 ta turli ildizga ega?`,
        `При скольких целых значениях ${M('m')} уравнение ${M(eq)} имеет ровно 4 различных корня?`,
        `${M('m')} niń neshe pútin mánisinde ${M(eq)} teńlemesiniń dál 4 túrli túbiri bar?`, // kaa: tekshirilsin
        `For how many integer values of ${M('m')} does the equation ${M(eq)} have exactly 4 distinct roots?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [h, h - 2, h + 1, 2 * (h - 1), h - 3], { min: 1 }),
      sol: L(
        `${M(T`y=|${polyTex([-p.q, -2 * p.p, 1])}|`)} grafigi ${M(`(${p.p};\\ ${h})`)} nuqtada mahalliy maksimumga ega, ${M('y=m')} to'g'ri chiziq grafikni 4 nuqtada kesishi uchun ${M(`0<m<${h}`)}. Butun ${M('m')} lar: ${M(`1,\\ldots,${h - 1}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `График ${M(T`y=|${polyTex([-p.q, -2 * p.p, 1])}|`)} имеет локальный максимум в точке ${M(`(${p.p};\\ ${h})`)}; прямая ${M('y=m')} пересекает его в 4 точках при ${M(`0<m<${h}`)}. Целые ${M('m')}: ${M(`1,\\ldots,${h - 1}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(T`y=|${polyTex([-p.q, -2 * p.p, 1])}|`)} grafiginiń ${M(`(${p.p};\\ ${h})`)} noqatında jergilikli maksimumı bar, ${M('y=m')} tuwrı sızıǵı grafikti 4 noqatta kesiwi ushın ${M(`0<m<${h}`)}. Pútin ${M('m')} ler: ${M(`1,\\ldots,${h - 1}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `The graph of ${M(T`y=|${polyTex([-p.q, -2 * p.p, 1])}|`)} has a local maximum at ${M(`(${p.p};\\ ${h})`)}; the line ${M('y=m')} meets it at 4 points iff ${M(`0<m<${h}`)}. Integers ${M('m')}: ${M(`1,\\ldots,${h - 1}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Chegaraviy qiymatlarni ($m=0$ da 2 ta, $m=h$ da 3 ta ildiz) sanab, 4 ta ildiz sharti qat'iy tengsizlik ekanini e'tiborga olmaslik.",
        'Считают граничные значения ($m=0$ даёт 2 корня, $m=h$ — 3 корня), не замечая, что условие «ровно 4» — строгое неравенство.',
        "Shegaralıq mánislerdi ($m=0$ de 2, $m=h$ de 3 túbir) sanap, 4 túbir sharti qatań teńsizlik ekenin esapqa almaw.", // kaa: tekshirilsin
        'Counting boundary values ($m=0$ gives 2 roots, $m=h$ gives 3) and missing that "exactly 4" is a strict inequality.',
      ),
    };
  },
);

// --- 109: b^x = kx + m: ildizlar soni (L2) ---
interface ExpLineP {
  bnum: number;
  bden: number;
  k: number;
  m: number;
}
y1T<ExpLineP>(
  'gr-exp-line',
  109,
  'L2',
  170,
  (r) => {
    const small = r.chance(0.5);
    return { bnum: small ? 1 : r.pick([2, 3]), bden: small ? r.pick([2, 3]) : 1, k: r.pick([-4, -3, -2, -1, 1, 2, 3, 4]), m: r.int(-8, 8) };
  },
  (p) => {
    const { bnum, bden } = p;
    need(p.m !== 0);
    const lnb = Math.log(bnum / bden);
    let ans: number;
    if (p.k * lnb <= 0) ans = 1;
    else {
      const xs0 = Math.log(p.k / lnb) / lnb;
      const gmin = p.k / lnb - p.k * xs0 - p.m;
      need(Math.abs(gmin) > 0.1);
      ans = gmin < 0 ? 2 : 0;
    }
    const baseTex = bden === 1 ? String(bnum) : `\\left(\\frac{${bnum}}{${bden}}\\right)`;
    const eq = T`${baseTex}^{x}=${lin(p.k, p.m)}`;
    return {
      stem: L(
        `${M(eq)} tenglama nechta ildizga ega? Grafik usuldan foydalaning.`,
        `Сколько корней имеет уравнение ${M(eq)}? Используйте графический метод.`,
        `${M(eq)} teńlemesi neshe túbirge iye? Grafik usıldan paydalanıń.`, // kaa: tekshirilsin
        `How many roots does the equation ${M(eq)} have? Use the graphical method.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [0, 1, 2, 3], { min: 0, max: 3 }),
      sol: L(
        `${M(T`y=${baseTex}^{x}`)} ko'rsatkichli funksiya (qavariq) va ${M(`y=${lin(p.k, p.m)}`)} to'g'ri chiziq grafiklarini chizamiz. ${ans === 1 ? "To'g'ri chiziqning burchak koeffitsiyenti va funksiyaning monotonligi tufayli grafiklar aniq bir nuqtada kesishadi" : ans === 2 ? "To'g'ri chiziq qavariq egri chiziqni ikki nuqtada kesadi (chiziq egri chiziqning \"ichida\" o'tadi)" : "To'g'ri chiziq egri chiziqdan pastda o'tadi: kesishish yo'q"}. ${ANS.uz}: ${mi(ans)}.`,
        `Строим графики показательной функции ${M(T`y=${baseTex}^{x}`)} (выпуклой) и прямой ${M(`y=${lin(p.k, p.m)}`)}. ${ans === 1 ? 'Из-за знака углового коэффициента и монотонности функции графики пересекаются ровно в одной точке' : ans === 2 ? 'Прямая пересекает выпуклую кривую в двух точках' : 'Прямая проходит ниже кривой: пересечений нет'}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(T`y=${baseTex}^{x}`)} kórsetkishli funkciya (dóńes) hám ${M(`y=${lin(p.k, p.m)}`)} tuwrı sızıq grafiklerin sızamız. ${ans === 1 ? "Tuwrı sızıqtıń mıyıq koefficienti hám funkciyanıń monotonlıǵı sebepli grafikler dál bir noqatta kesilisedi" : ans === 2 ? "Tuwrı sızıq dóńes iymek sızıqtı eki noqatta kesedi" : "Tuwrı sızıq iymek sızıqtan tómende ótedi: kesilisiw joq"}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Sketch the exponential ${M(T`y=${baseTex}^{x}`)} (convex) and the line ${M(`y=${lin(p.k, p.m)}`)}. ${ans === 1 ? 'Because of the sign of the slope and the monotonicity of the function, the graphs meet at exactly one point' : ans === 2 ? 'The line meets the convex curve at two points' : 'The line stays below the curve: no intersection'}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Ko'rsatkichli funksiya grafigi to'g'ri chiziq bilan har doim aniq bir nuqtada kesishadi deb o'ylash: qavariq egri chiziq to'g'ri chiziq bilan 0, 1 yoki 2 nuqtada kesishishi mumkin.",
        'Считают, что показательная кривая всегда пересекает прямую ровно один раз: выпуклая кривая и прямая могут иметь 0, 1 или 2 общих точки.',
        "Kórsetkishli funkciya grafigi tuwrı sızıq penen hámme waqıt dál bir noqatta kesilisedi dep oylaw: dóńes iymek sızıq tuwrı sızıq penen 0, 1 yamasa 2 noqatta kesilisiwi múmkin.", // kaa: tekshirilsin
        'Assuming an exponential curve always meets a line exactly once: a convex curve and a line can share 0, 1 or 2 points.',
      ),
    };
  },
);

// --- 109: kubik funksiya grafigi va gorizontal to'g'ri chiziq: parametr qiymatlari (L3) ---
interface CubicParamP {
  p: number;
  c0: number;
}
y1T<CubicParamP>(
  'gr-cubic-param',
  109,
  'L3',
  200,
  (r) => ({ p: r.pick([1, 1, 2]), c0: r.int(-6, 6) }),
  (p) => {
    need(p.c0 !== 0);
    const ans = 4 * p.p ** 3 - 1;
    const eq = T`${polyTex([p.c0, -3 * p.p * p.p, 0, 1])}=m`;
    const top = p.c0 + 2 * p.p ** 3;
    const bot = p.c0 - 2 * p.p ** 3;
    return {
      stem: L(
        `${M('m')} ning nechta butun qiymatida ${M(eq)} tenglama uchta turli haqiqiy ildizga ega?`,
        `При скольких целых значениях ${M('m')} уравнение ${M(eq)} имеет три различных действительных корня?`,
        `${M('m')} niń neshe pútin mánisinde ${M(eq)} teńlemesi úsh túrli haqıyqıy túbirge iye?`, // kaa: tekshirilsin
        `For how many integer values of ${M('m')} does the equation ${M(eq)} have three distinct real roots?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [ans + 1, ans + 2, ans - 1, 2 * p.p ** 3 - 1, 4 * p.p ** 3 + 3], { min: 1 }),
      sol: L(
        `${M(T`f(x)=${polyTex([p.c0, -3 * p.p * p.p, 0, 1])}`)}, ${M(T`f^{\prime}(x)=3x^2-${3 * p.p * p.p}=0`)} dan ${M(`x=\\pm ${p.p}`)}: mahalliy maksimum ${M(`f(${-p.p})=${top}`)}, minimum ${M(`f(${p.p})=${bot}`)}. ${M('y=m')} uch nuqtada kesishi uchun ${M(`${bot}<m<${top}`)}. Butun ${M('m')} lar soni ${mi(ans)}. ${ANS.uz}: ${mi(ans)}.`,
        `${M(T`f(x)=${polyTex([p.c0, -3 * p.p * p.p, 0, 1])}`)}, из ${M(T`f^{\prime}(x)=3x^2-${3 * p.p * p.p}=0`)} получаем ${M(`x=\\pm ${p.p}`)}: локальный максимум ${M(`f(${-p.p})=${top}`)}, минимум ${M(`f(${p.p})=${bot}`)}. Прямая ${M('y=m')} пересекает график в трёх точках при ${M(`${bot}<m<${top}`)}. Целых ${M('m')} ${mi(ans)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(T`f(x)=${polyTex([p.c0, -3 * p.p * p.p, 0, 1])}`)}, ${M(T`f^{\prime}(x)=3x^2-${3 * p.p * p.p}=0`)} den ${M(`x=\\pm ${p.p}`)}: jergilikli maksimum ${M(`f(${-p.p})=${top}`)}, minimum ${M(`f(${p.p})=${bot}`)}. ${M('y=m')} úsh noqatta kesilisiwi ushın ${M(`${bot}<m<${top}`)}. Pútin ${M('m')} ler sanı ${mi(ans)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `${M(T`f(x)=${polyTex([p.c0, -3 * p.p * p.p, 0, 1])}`)}, from ${M(T`f^{\prime}(x)=3x^2-${3 * p.p * p.p}=0`)} we get ${M(`x=\\pm ${p.p}`)}: local maximum ${M(`f(${-p.p})=${top}`)}, local minimum ${M(`f(${p.p})=${bot}`)}. The line ${M('y=m')} meets the graph three times iff ${M(`${bot}<m<${top}`)}. There are ${mi(ans)} integers ${M('m')}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Ekstremum qiymatlariga teng $m$ larni ham qo'shib yuborish (u holda ildizlardan biri karrali bo'lib, turli ildizlar ikkita bo'ladi).",
        'Включают значения $m$, равные экстремумам: тогда один корень кратный и различных корней только два.',
        "Ekstremum mánislerine teń $m$ lerdi de qosıp jiberiw (onda túbirlerdiń biri kóbeymeli bolıp, túrli túbirler tek ekew boladı).", // kaa: tekshirilsin
        'Including the values of $m$ equal to the extrema: then one root is double and there are only two distinct roots.',
      ),
    };
  },
);

// =====================================================================================================
// 4.1 Funksiyalar (mavzular 43-55, 59) va yangi 121 (funksional bog'liqlik: jadval, grafik, formula)
// =====================================================================================================

const piS = (f: Frac): string => (f.n === 0 ? '0' : f.n < 0 ? `-${piTex(frac(-f.n, f.d))}` : piTex(f));
const mpiS = (f: Frac): string => M(piS(f));
/** Jadval (KaTeX array): birinchi qator x, ikkinchi qator y; null — "?" */
function tableTex(xs: readonly number[], ys: readonly (number | null)[], xName = 'x', yName = 'y'): string {
  const cols = 'c|' + 'c'.repeat(xs.length);
  return T`\begin{array}{${cols}} ${xName} & ${xs.join(' & ')} \\ \hline ${yName} & ${ys.map((v) => (v === null ? '?' : String(v))).join(' & ')} \end{array}`;
}

// --- 43: aniqlanish sohasi: oraliqlar birlashmasi (L2) ---
interface DomUnionP {
  kind: 'ratio' | 'prod' | 'inv';
  p: number;
  q: number;
}
y1T<DomUnionP>(
  'fn-domain-union',
  43,
  'L2',
  150,
  (r) => ({ kind: r.pick(['ratio', 'prod', 'inv'] as const), p: r.int(-8, 8), q: r.int(-8, 8) }),
  (p) => {
    need(p.p !== p.q);
    const lo = Math.min(p.p, p.q);
    const hi = Math.max(p.p, p.q);
    let correct: string;
    let fx: string;
    let cond: string;
    if (p.kind === 'ratio') {
      fx = T`\sqrt{\frac{${xs(-p.p)}}{${xs(-p.q)}}}`;
      // (x-p)/(x-q) >= 0, x != q
      correct = p.p < p.q ? `${ivl(null, p.p, false, true)}\\cup ${ivl(p.q, null, false, false)}` : `${ivl(null, p.q, false, false)}\\cup ${ivl(p.p, null, true, false)}`;
      cond = T`\frac{${xs(-p.p)}}{${xs(-p.q)}}\ge 0,\ x\ne ${p.q}`;
    } else if (p.kind === 'prod') {
      fx = T`\sqrt{${fac(p.p)}${fac(p.q)}}`;
      correct = `${ivl(null, lo, false, true)}\\cup ${ivl(hi, null, true, false)}`;
      cond = T`${fac(p.p)}${fac(p.q)}\ge 0`;
    } else {
      fx = T`\frac{1}{\sqrt{${fac(p.p)}${fac(p.q)}}}`;
      correct = `${ivl(null, lo, false, false)}\\cup ${ivl(hi, null, false, false)}`;
      cond = T`${fac(p.p)}${fac(p.q)}>0`;
    }
    const wrongs = [
      ivl(lo, hi, true, true),
      ivl(lo, hi, false, false),
      `${ivl(null, lo, false, true)}\\cup ${ivl(hi, null, true, false)}`,
      `${ivl(null, lo, false, false)}\\cup ${ivl(hi, null, false, false)}`,
      `${ivl(null, lo, false, true)}\\cup ${ivl(hi, null, false, true)}`,
      `${ivl(null, hi, false, true)}\\cup ${ivl(lo, null, false, false)}`,
    ].filter((w) => w !== correct);
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiyaning aniqlanish sohasini toping.`,
        `Найдите область определения функции ${M(`f(x)=${fx}`)}.`,
        `${M(`f(x)=${fx}`)} funkciyasınıń anıqlanıw oblastın tabıń.`, // kaa: tekshirilsin
        `Find the domain of the function ${M(`f(x)=${fx}`)}.`,
      ),
      correct: M(correct),
      wrong: wrongs.map(M),
      sol: L(
        `Shart: ${M(cond)}. Oraliqlar usuli: ildizlar ${M(`${lo}`)} va ${M(`${hi}`)}. ${ANS.uz}: ${M(correct)}.`,
        `Условие: ${M(cond)}. Метод интервалов: корни ${M(`${lo}`)} и ${M(`${hi}`)}. ${ANS.ru}: ${M(correct)}.`,
        `Shárt: ${M(cond)}. Aralıqlar usılı: túbirler ${M(`${lo}`)} hám ${M(`${hi}`)}. ${ANS.kaa}: ${M(correct)}.`, // kaa: tekshirilsin
        `Condition: ${M(cond)}. Interval method: the critical points are ${M(`${lo}`)} and ${M(`${hi}`)}. ${ANS.en}: ${M(correct)}.`,
      ),
      mis: L(
        "Maxraj nolga teng bo'lgan nuqtani (kvadrat ildiz ostidagi kasrda) kiritib yuborish yoki qavslar turini (yumaloq/kvadrat) aralashtirish.",
        'Включают точку, где знаменатель равен нулю, либо путают круглые и квадратные скобки.',
        "Bólim nolge teń bolǵan noqatqa kirgizip jiberiw yamasa qawıs túrlerin (domalaq/kvadrat) aralastırıw.", // kaa: tekshirilsin
        'Including the point where the denominator is zero, or mixing round and square brackets.',
      ),
    };
  },
);

// --- 44: juft/toq funksiya: parametr (L2) ---
interface ParityP {
  kind: 'even' | 'odd';
  p: number;
  q: number;
  k: number;
  s: number;
}
y1T<ParityP>(
  'fn-parity-param',
  44,
  'L2',
  160,
  (r) => ({ kind: r.pick(['even', 'odd'] as const), p: r.int(-6, 6), q: r.int(-5, 5), k: r.int(-4, 4), s: r.int(-6, 6) }),
  (p) => {
    need(p.p !== 0 && p.q !== 0 && p.k !== 0 && p.s !== 0);
    let fx: string;
    let ans: number;
    if (p.kind === 'even') {
      fx = T`x^{4}+(m${sg(-p.p)})x^{3}${sg(p.q)}x^{2}+(${polyTex([-p.k * p.p, p.k], 'm')})x${sg(p.s)}`;
      ans = p.p;
    } else {
      fx = T`(m^{2}-${p.p * p.p})x^{4}+x^{3}+(m${sg(p.p)})x^{2}${sg(-p.k)}x`;
      ans = -p.p;
    }
    const kindTxt = {
      even: L('juft', 'чётной', 'jup', 'even'),
      odd: L('toq', 'нечётной', 'taq', 'odd'),
    }[p.kind];
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya ${kindTxt.uz} bo'ladigan ${M('m')} ning qiymatini toping.`,
        `Найдите значение ${M('m')}, при котором функция ${M(`f(x)=${fx}`)} является ${kindTxt.ru}.`,
        `${M(`f(x)=${fx}`)} funkciyası ${kindTxt.kaa} bolatuǵın ${M('m')} niń mánisin tabıń.`, // kaa: tekshirilsin
        `Find the value of ${M('m')} for which ${M(`f(x)=${fx}`)} is an ${kindTxt.en} function.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [-ans, p.k, p.p * p.p, ans + 1, ans - 1]),
      sol: L(
        p.kind === 'even'
          ? `${M('f(-x)=f(x)')} bo'lishi uchun toq darajali hadlar koeffitsiyentlari nolga teng: ${M(`m${sg(-p.p)}=0`)} va ${M(`${polyTex([-p.k * p.p, p.k], 'm')}=0`)}. Ikkalasidan ham ${M(`m=${p.p}`)}. ${ANS.uz}: ${mi(ans)}.`
          : `${M('f(-x)=-f(x)')} bo'lishi uchun juft darajali hadlar koeffitsiyentlari nolga teng: ${M(`m^{2}-${p.p * p.p}=0`)} va ${M(`m${sg(p.p)}=0`)}. Ikkinchisidan ${M(`m=${-p.p}`)}, u birinchisini ham qanoatlantiradi. ${ANS.uz}: ${mi(ans)}.`,
        p.kind === 'even'
          ? `Для ${M('f(-x)=f(x)')} коэффициенты при нечётных степенях равны нулю: ${M(`m${sg(-p.p)}=0`)} и ${M(`${polyTex([-p.k * p.p, p.k], 'm')}=0`)}. Из обоих ${M(`m=${p.p}`)}. ${ANS.ru}: ${mi(ans)}.`
          : `Для ${M('f(-x)=-f(x)')} коэффициенты при чётных степенях равны нулю: ${M(`m^{2}-${p.p * p.p}=0`)} и ${M(`m${sg(p.p)}=0`)}. Из второго ${M(`m=${-p.p}`)}, оно удовлетворяет и первому. ${ANS.ru}: ${mi(ans)}.`,
        p.kind === 'even'
          ? `${M('f(-x)=f(x)')} bolıwı ushın taq dárejeli hádlerdiń koefficientleri nolge teń: ${M(`m${sg(-p.p)}=0`)} hám ${M(`${polyTex([-p.k * p.p, p.k], 'm')}=0`)}. Ekewinen de ${M(`m=${p.p}`)}. ${ANS.kaa}: ${mi(ans)}.` // kaa: tekshirilsin
          : `${M('f(-x)=-f(x)')} bolıwı ushın jup dárejeli hádlerdiń koefficientleri nolge teń: ${M(`m^{2}-${p.p * p.p}=0`)} hám ${M(`m${sg(p.p)}=0`)}. Ekinshisinen ${M(`m=${-p.p}`)}, ol birinshisin de qanaatlandıradı. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        p.kind === 'even'
          ? `For ${M('f(-x)=f(x)')} the coefficients of odd powers vanish: ${M(`m${sg(-p.p)}=0`)} and ${M(`${polyTex([-p.k * p.p, p.k], 'm')}=0`)}. Both give ${M(`m=${p.p}`)}. ${ANS.en}: ${mi(ans)}.`
          : `For ${M('f(-x)=-f(x)')} the coefficients of even powers vanish: ${M(`m^{2}-${p.p * p.p}=0`)} and ${M(`m${sg(p.p)}=0`)}. The second gives ${M(`m=${-p.p}`)}, which also satisfies the first. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Juft funksiyada juft darajali, toq funksiyada toq darajali hadlarni nolga tenglash (aksincha bo'lishi kerak) yoki ildizlardan faqat bittasini tekshirmaslik.",
        'Приравнивают к нулю не те степени (для чётной функции — нечётные, для нечётной — чётные) либо не проверяют второе условие.',
        "Jup funkciyada jup dárejeli, taq funkciyada taq dárejeli hádlerdi nolge teńlestiriw (kerisinshe bolıwı kerek) yamasa ekinshi shártti tekspew.", // kaa: tekshirilsin
        'Zeroing the wrong powers (odd ones for an even function, even ones for an odd function), or not checking the second condition.',
      ),
    };
  },
);

// --- 44: davriy funksiyalar yig'indisining eng kichik musbat davri (L2) ---
interface PeriodP {
  f1: 'sin' | 'cos' | 'tan';
  p1: number;
  q1: number;
  f2: 'sin' | 'cos' | 'tan';
  p2: number;
  q2: number;
}
const lcmInt = (a: number, b: number): number => {
  let x = a;
  let y = b;
  while (y) [x, y] = [y, x % y];
  return (a * b) / x;
};
const gcdInt = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdInt(b, a % b));
y1T<PeriodP>(
  'fn-period-sum',
  44,
  'L2',
  190,
  (r) => ({ f1: r.pick(['sin', 'cos', 'tan'] as const), p1: r.int(1, 4), q1: r.int(1, 4), f2: r.pick(['sin', 'cos', 'tan'] as const), p2: r.int(1, 4), q2: r.int(1, 4) }),
  (p) => {
    need(p.f1 !== p.f2 && !(p.p1 === p.p2 && p.q1 === p.q2));
    // davr (pi birligida): sin, cos -> 2*q/p; tan -> q/p
    const per = (f: string, pp: number, qq: number): Frac => frac((f === 'tan' ? 1 : 2) * qq, pp);
    const t1 = per(p.f1, p.p1, p.q1);
    const t2 = per(p.f2, p.p2, p.q2);
    // ikki kasrning EKUK: lcm(suratlar) / gcd(maxrajlar)
    const T12 = frac(lcmInt(t1.n, t2.n), gcdInt(t1.d, t2.d));
    need(fNum(T12) <= 24 && fNum(T12) > fNum(t1) && fNum(T12) > fNum(t2));
    const arg = (pp: number, qq: number) => (qq === 1 ? (pp === 1 ? 'x' : `${pp}x`) : `\\frac{${pp === 1 ? '' : pp}x}{${qq}}`);
    const fx = `\\${p.f1}\\left(${arg(p.p1, p.q1)}\\right)+\\${p.f2}\\left(${arg(p.p2, p.q2)}\\right)`;
    const wrongs = [fMul(t1, t2), fAdd(t1, t2), frac(Math.max(t1.n * t2.d, t2.n * t1.d), Math.min(t1.d, t2.d)), frac(lcmInt(t1.n, t2.n), 1)];
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiyaning eng kichik musbat davrini toping.`,
        `Найдите наименьший положительный период функции ${M(`f(x)=${fx}`)}.`,
        `${M(`f(x)=${fx}`)} funkciyasınıń eń kishi oń dáwirin tabıń.`, // kaa: tekshirilsin
        `Find the smallest positive period of the function ${M(`f(x)=${fx}`)}.`,
      ),
      correct: mpi(T12),
      wrong: fracWrong(T12, wrongs, mpi),
      sol: L(
        `Davrlar: ${M(`T_1=${piTex(t1)}`)} va ${M(`T_2=${piTex(t2)}`)} (${M('\\sin,\\cos')} uchun ${M('2\\pi/k')}, ${M('\\tan')} uchun ${M('\\pi/k')}). Yig'indining davri — ularning eng kichik umumiy karralisi: ${mpi(T12)}. ${ANS.uz}: ${mpi(T12)}.`,
        `Периоды: ${M(`T_1=${piTex(t1)}`)} и ${M(`T_2=${piTex(t2)}`)} (${M('2\\pi/k')} для ${M('\\sin,\\cos')}, ${M('\\pi/k')} для ${M('\\tan')}). Период суммы — наименьшее общее кратное: ${mpi(T12)}. ${ANS.ru}: ${mpi(T12)}.`,
        `Dáwirler: ${M(`T_1=${piTex(t1)}`)} hám ${M(`T_2=${piTex(t2)}`)} (${M('\\sin,\\cos')} ushın ${M('2\\pi/k')}, ${M('\\tan')} ushın ${M('\\pi/k')}). Qosındınıń dáwiri — olardıń eń kishi ulıwma eselengeni: ${mpi(T12)}. ${ANS.kaa}: ${mpi(T12)}.`, // kaa: tekshirilsin
        `Periods: ${M(`T_1=${piTex(t1)}`)} and ${M(`T_2=${piTex(t2)}`)} (${M('2\\pi/k')} for ${M('\\sin,\\cos')}, ${M('\\pi/k')} for ${M('\\tan')}). The period of the sum is their least common multiple: ${mpi(T12)}. ${ANS.en}: ${mpi(T12)}.`,
      ),
      mis: L(
        "Davrlarning eng katta umumiy bo'luvchisi yoki ko'paytmasini olish (to'g'risi — eng kichik umumiy karralisi), $\\tan$ ning davrini $2\\pi$ deb olish.",
        'Берут НОД или произведение периодов (нужно НОК), либо считают период $\\tan$ равным $2\\pi$.',
        "Dáwirlerdiń eń úlken ulıwma bóliwshisin yamasa kóbeymesin alıw (durısı — eń kishi ulıwma eselengeni), $\\tan$ dıń dáwirin $2\\pi$ dep alıw.", // kaa: tekshirilsin
        'Taking the GCD or the product of the periods instead of the LCM, or taking the period of $\\tan$ as $2\\pi$.',
      ),
    };
  },
);

// --- 45: kvadrat funksiyaning o'sish/kamayish oralig'i (L1) ---
interface MonoP {
  a: number;
  b: number;
  c: number;
  inc: boolean;
}
y1T<MonoP>(
  'fn-mono-quad',
  45,
  'L1',
  120,
  (r) => ({ a: r.pick([-4, -3, -2, -1, 1, 2, 3, 4]), b: r.int(-12, 12), c: r.int(-9, 9), inc: r.chance(0.5) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0);
    const x0 = frac(-p.b, 2 * p.a);
    need(x0.d <= 4);
    const x0t = texF(x0);
    const ray = (toRight: boolean, x: string, closed: boolean) => (toRight ? `${closed ? '[' : '('}${x};\\ +\\infty)` : `(-\\infty;\\ ${x}${closed ? ']' : ')'}`);
    const toRight = p.a > 0 === p.inc; // a>0: o'sish o'ngda; kamayish chapda; a<0: aksincha
    const correct = M(ray(toRight, x0t, true));
    const nx = texF(fNeg(x0));
    const wrongs = [ray(!toRight, x0t, true), ray(toRight, nx, true), ray(!toRight, nx, true), ray(toRight, x0t, false)];
    const fx = `${polyTex([p.c, p.b, p.a])}`;
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya qaysi oraliqda ${p.inc ? "o'sadi" : 'kamayadi'}?`,
        `На каком промежутке функция ${M(`f(x)=${fx}`)} ${p.inc ? 'возрастает' : 'убывает'}?`,
        `${M(`f(x)=${fx}`)} funkciyası qanday aralıqta ${p.inc ? 'óssedi' : 'kemeyedi'}?`, // kaa: tekshirilsin
        `On which interval is the function ${M(`f(x)=${fx}`)} ${p.inc ? 'increasing' : 'decreasing'}?`,
      ),
      correct,
      wrong: wrongs.map(M),
      sol: L(
        `Parabola uchi ${M(T`x_0=-\frac{b}{2a}=${x0t}`)}. ${M(`a=${p.a}${p.a > 0 ? '>0' : '<0'}`)}: ${p.a > 0 ? 'shoxlar yuqoriga' : 'shoxlar pastga'}, shuning uchun ${p.inc ? "o'sish" : 'kamayish'} oralig'i ${correct}. ${ANS.uz}: ${correct}.`,
        `Вершина параболы ${M(T`x_0=-\frac{b}{2a}=${x0t}`)}. ${M(`a=${p.a}${p.a > 0 ? '>0' : '<0'}`)}: ${p.a > 0 ? 'ветви вверх' : 'ветви вниз'}, поэтому промежуток ${p.inc ? 'возрастания' : 'убывания'} ${correct}. ${ANS.ru}: ${correct}.`,
        `Parabola ushı ${M(T`x_0=-\frac{b}{2a}=${x0t}`)}. ${M(`a=${p.a}${p.a > 0 ? '>0' : '<0'}`)}: ${p.a > 0 ? 'shaqalar joqarıǵa' : 'shaqalar tómenge'}, sonlıqtan ${p.inc ? 'ósiw' : 'kemeyiw'} aralıǵı ${correct}. ${ANS.kaa}: ${correct}.`, // kaa: tekshirilsin
        `The vertex is ${M(T`x_0=-\frac{b}{2a}=${x0t}`)}. ${M(`a=${p.a}${p.a > 0 ? '>0' : '<0'}`)}: the parabola opens ${p.a > 0 ? 'upward' : 'downward'}, so the ${p.inc ? 'increasing' : 'decreasing'} interval is ${correct}. ${ANS.en}: ${correct}.`,
      ),
      mis: L(
        "Uchning absissasini $-\\frac{b}{2a}$ o'rniga $\\frac{b}{2a}$ deb olish yoki $a$ ning ishorasiga qarab o'sish/kamayish tomonini aralashtirish.",
        'Берут абсциссу вершины $\\frac{b}{2a}$ вместо $-\\frac{b}{2a}$ либо путают направление возрастания и убывания при разных знаках $a$.',
        "Ushtıń abscissasın $-\\frac{b}{2a}$ ornına $\\frac{b}{2a}$ dep alıw yamasa $a$ nıń belgisine qarap ósiw/kemeyiw tárepin aralastırıw.", // kaa: tekshirilsin
        'Using $\\frac{b}{2a}$ instead of $-\\frac{b}{2a}$ for the vertex, or mixing up the direction of increase/decrease for different signs of $a$.',
      ),
    };
  },
);

// --- 46: ikki nuqtadan o'tuvchi chiziqli funksiya qiymati (L1) ---
interface TwoPtsP {
  x1: number;
  x2: number;
  k: number;
  b: number;
  x3: number;
}
y1T<TwoPtsP>(
  'fn-linear-2pts',
  46,
  'L1',
  110,
  (r) => ({ x1: r.int(-6, 4), x2: r.int(-3, 8), k: r.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), b: r.int(-9, 9), x3: r.int(-9, 12) }),
  (p) => {
    need(p.x1 !== p.x2 && p.x3 !== p.x1 && p.x3 !== p.x2 && p.b !== 0);
    const y1 = p.k * p.x1 + p.b;
    const y2 = p.k * p.x2 + p.b;
    const ans = p.k * p.x3 + p.b;
    const kk = frac(y2 - y1, p.x2 - p.x1);
    return {
      stem: L(
        `Chiziqli ${M('f(x)=kx+b')} funksiyaning grafigi ${M(`A(${p.x1};\\ ${y1})`)} va ${M(`B(${p.x2};\\ ${y2})`)} nuqtalardan o'tadi. ${M(`f(${p.x3})`)} ni toping.`,
        `График линейной функции ${M('f(x)=kx+b')} проходит через точки ${M(`A(${p.x1};\\ ${y1})`)} и ${M(`B(${p.x2};\\ ${y2})`)}. Найдите ${M(`f(${p.x3})`)}.`,
        `${M('f(x)=kx+b')} sızıqlı funkciyasınıń grafigi ${M(`A(${p.x1};\\ ${y1})`)} hám ${M(`B(${p.x2};\\ ${y2})`)} noqatlarınan ótedi. ${M(`f(${p.x3})`)} tı tabıń.`, // kaa: tekshirilsin
        `The graph of the linear function ${M('f(x)=kx+b')} passes through ${M(`A(${p.x1};\\ ${y1})`)} and ${M(`B(${p.x2};\\ ${y2})`)}. Find ${M(`f(${p.x3})`)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [-ans, y1 + (p.x3 - p.x1), p.k * p.x3, ans + p.k, ans - p.k, y2 + (p.x3 - p.x2)]),
      sol: L(
        `${M(T`k=\frac{${y2}${sg(-y1)}}{${p.x2}${sg(-p.x1)}}=${texF(kk)}`)}, ${M(`b=${y1}${sg(-p.k * p.x1)}=${p.b}`)}. ${M(`f(x)=${lin(p.k, p.b)}`)}, ${M(`f(${p.x3})=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `${M(T`k=\frac{${y2}${sg(-y1)}}{${p.x2}${sg(-p.x1)}}=${texF(kk)}`)}, ${M(`b=${y1}${sg(-p.k * p.x1)}=${p.b}`)}. ${M(`f(x)=${lin(p.k, p.b)}`)}, ${M(`f(${p.x3})=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(T`k=\frac{${y2}${sg(-y1)}}{${p.x2}${sg(-p.x1)}}=${texF(kk)}`)}, ${M(`b=${y1}${sg(-p.k * p.x1)}=${p.b}`)}. ${M(`f(x)=${lin(p.k, p.b)}`)}, ${M(`f(${p.x3})=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `${M(T`k=\frac{${y2}${sg(-y1)}}{${p.x2}${sg(-p.x1)}}=${texF(kk)}`)}, ${M(`b=${y1}${sg(-p.k * p.x1)}=${p.b}`)}. ${M(`f(x)=${lin(p.k, p.b)}`)}, ${M(`f(${p.x3})=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Burchak koeffitsiyentini $\\frac{x_2-x_1}{y_2-y_1}$ deb teskari olish yoki $b$ ni topishda ishorani almashtirish.",
        'Берут угловой коэффициент перевёрнутым, $\\frac{x_2-x_1}{y_2-y_1}$, либо ошибаются в знаке при нахождении $b$.',
        "Mıyıq koefficientin $\\frac{x_2-x_1}{y_2-y_1}$ dep keri alıw yamasa $b$ nı tabıwda belgini qáte qoyıw.", // kaa: tekshirilsin
        'Inverting the slope as $\\frac{x_2-x_1}{y_2-y_1}$, or making a sign error when finding $b$.',
      ),
    };
  },
);

// --- 47: uch nuqtadan o'tuvchi kvadrat funksiya (L2) ---
interface Quad3P {
  a: number;
  b: number;
  c: number;
  xs: [number, number, number];
  x4: number;
}
y1T<Quad3P>(
  'fn-quad-3pts',
  47,
  'L2',
  190,
  (r) => {
    const pool = [-3, -2, -1, 0, 1, 2, 3];
    const pick3 = r.shuffle(pool).slice(0, 3).sort((x, y) => x - y) as [number, number, number];
    return { a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-6, 6), c: r.int(-8, 8), xs: pick3, x4: r.pick([4, 5, 6, -4, -5]) };
  },
  (p) => {
    need(p.b !== 0 && p.c !== 0);
    const f = (x: number) => p.a * x * x + p.b * x + p.c;
    const ans = f(p.x4);
    const pts = p.xs.map((x) => `(${x};\\ ${f(x)})`);
    const [xa, xb, xc] = p.xs;
    // Nyuton bo'lingan ayirmalari
    const d1 = frac(f(xb) - f(xa), xb - xa);
    const d2 = frac(f(xc) - f(xb), xc - xb);
    const lead = fDiv(fSub(d2, d1), fInt(xc - xa));
    need(lead.d === 1 && lead.n === p.a);
    const wrongs = [f(p.x4 + 1), f(p.x4 - 1), 2 * f(p.x4 - 1) - f(p.x4 - 2), p.a * p.x4 * p.x4 + p.c, f(-p.x4)];
    return {
      stem: L(
        `${M('f(x)=ax^2+bx+c')} funksiyaning grafigi ${M(`A${pts[0]}`)}, ${M(`B${pts[1]}`)} va ${M(`C${pts[2]}`)} nuqtalardan o'tadi. ${M(`f(${p.x4})`)} ni toping.`,
        `График функции ${M('f(x)=ax^2+bx+c')} проходит через точки ${M(`A${pts[0]}`)}, ${M(`B${pts[1]}`)} и ${M(`C${pts[2]}`)}. Найдите ${M(`f(${p.x4})`)}.`,
        `${M('f(x)=ax^2+bx+c')} funkciyasınıń grafigi ${M(`A${pts[0]}`)}, ${M(`B${pts[1]}`)} hám ${M(`C${pts[2]}`)} noqatlarınan ótedi. ${M(`f(${p.x4})`)} tı tabıń.`, // kaa: tekshirilsin
        `The graph of ${M('f(x)=ax^2+bx+c')} passes through ${M(`A${pts[0]}`)}, ${M(`B${pts[1]}`)} and ${M(`C${pts[2]}`)}. Find ${M(`f(${p.x4})`)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrongs),
      sol: L(
        `Uch tenglama tuzamiz va ayirib ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}, ${M(`c=${p.c}`)} ni topamiz: ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)}. ${M(`f(${p.x4})=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `Составляем три уравнения и находим ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}, ${M(`c=${p.c}`)}: ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)}. ${M(`f(${p.x4})=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `Úsh teńleme dúzip ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}, ${M(`c=${p.c}`)} di tabamız: ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)}. ${M(`f(${p.x4})=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Form three equations and find ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}, ${M(`c=${p.c}`)}: ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)}. ${M(`f(${p.x4})=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Uch nuqta orqali o'tuvchi parabolani chiziqli funksiya sifatida davom ettirish (ikki nuqta bo'yicha ekstrapolyatsiya).",
        'Продолжают параболу как прямую (линейная экстраполяция по двум точкам).',
        "Úsh noqat arqalı ótetuǵın parabolanı sızıqlı funkciya retinde dawam ettiriw (eki noqat boyınsha ekstrapolyaciya).", // kaa: tekshirilsin
        'Extending the parabola as a straight line (linear extrapolation from two points).',
      ),
    };
  },
);

// --- 47: kvadrat funksiya: nollari orqali uchi, ildizlar orasidagi masofa (L1) ---
interface QuadRootsP {
  a: number;
  r1: number;
  r2: number;
  ask: 'yv' | 'dist' | 'xv';
}
y1T<QuadRootsP>(
  'fn-quad-roots',
  47,
  'L1',
  140,
  (r) => ({ a: r.pick([-3, -2, -1, 1, 2, 3]), r1: r.int(-7, 3), r2: r.int(-2, 8), ask: r.pick(['yv', 'dist', 'xv'] as const) }),
  (p) => {
    need(p.r2 - p.r1 >= 2);
    const bcoef = -p.a * (p.r1 + p.r2);
    const ccoef = p.a * p.r1 * p.r2;
    need(bcoef !== 0 && ccoef !== 0);
    const fx = polyTex([ccoef, bcoef, p.a]);
    const dist = p.r2 - p.r1;
    const xv = frac(p.r1 + p.r2, 2);
    const yv = frac(-p.a * dist * dist, 4);
    const ans = p.ask === 'yv' ? yv : p.ask === 'dist' ? fInt(dist) : xv;
    need(ans.d <= 4 && Math.abs(ans.n) <= 60);
    const wrongs = p.ask === 'yv' ? [fNeg(yv), frac(p.a * dist * dist, 2), frac(-dist * dist, 4), frac(-p.a * dist, 2)] : p.ask === 'dist' ? [fInt(p.r1 + p.r2), fInt(dist + 1), fInt(dist - 1), fInt(dist * Math.abs(p.a))] : [fNeg(xv), fInt(p.r2), fInt(p.r1), frac(dist, 2)];
    const askTxt = {
      yv: L("parabola uchining ordinatasini toping", 'Найдите ординату вершины параболы', 'parabola ushınıń ordinatasın tabıń', 'find the ordinate of the vertex of the parabola'),
      dist: L("parabolaning Ox o'qi bilan kesishish nuqtalari orasidagi masofani toping", 'Найдите расстояние между точками пересечения параболы с осью Ox', 'parabolanıń Ox kósheri menen kesilisiw noqatları arasındaǵı aralıqtı tabıń', 'find the distance between the points where the parabola meets the Ox axis'),
      xv: L("parabola uchining absissasini toping", 'Найдите абсциссу вершины параболы', 'parabola ushınıń abscissasın tabıń', 'find the abscissa of the vertex of the parabola'),
    }[p.ask];
    const how =
      p.ask === 'yv'
        ? T`y_v=f\left(${texF(xv)}\right)=${texF(yv)}`
        : p.ask === 'dist'
          ? T`x_{1,2}=${p.r1},\ ${p.r2}\Rightarrow |x_2-x_1|=${dist}`
          : T`x_v=\frac{x_1+x_2}{2}=\frac{${p.r1}${sg(p.r2)}}{2}=${texF(xv)}`;
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya berilgan: ${askTxt.uz}.`,
        `Дана функция ${M(`f(x)=${fx}`)}: ${askTxt.ru.toLowerCase()}.`,
        `${M(`f(x)=${fx}`)} funkciyası berilgen: ${askTxt.kaa}.`, // kaa: tekshirilsin
        `The function ${M(`f(x)=${fx}`)} is given: ${askTxt.en}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: L(
        `${M(T`${fx}=${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}${fac(p.r1)}${fac(p.r2)}`)}, nollar ${M(`x=${p.r1}`)} va ${M(`x=${p.r2}`)}. ${M(how)}. ${ANS.uz}: ${mf(ans)}.`,
        `${M(T`${fx}=${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}${fac(p.r1)}${fac(p.r2)}`)}, нули ${M(`x=${p.r1}`)} и ${M(`x=${p.r2}`)}. ${M(how)}. ${ANS.ru}: ${mf(ans)}.`,
        `${M(T`${fx}=${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}${fac(p.r1)}${fac(p.r2)}`)}, nollar ${M(`x=${p.r1}`)} hám ${M(`x=${p.r2}`)}. ${M(how)}. ${ANS.kaa}: ${mf(ans)}.`, // kaa: tekshirilsin
        `${M(T`${fx}=${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}${fac(p.r1)}${fac(p.r2)}`)}, zeros ${M(`x=${p.r1}`)} and ${M(`x=${p.r2}`)}. ${M(how)}. ${ANS.en}: ${mf(ans)}.`,
      ),
      mis: L(
        "Parabola uchi nollarning o'rtasida ekanini unutish yoki $a$ koeffitsiyentini hisobga olmaslik.",
        'Забывают, что вершина лежит посередине между нулями, либо не учитывают коэффициент $a$.',
        "Parabola ushı nollerdiń ortasında ekenin umıtıw yamasa $a$ koefficientin esapqa almaw.", // kaa: tekshirilsin
        'Forgetting that the vertex lies midway between the zeros, or ignoring the coefficient $a$.',
      ),
    };
  },
);

// --- 49: darajali ifodalarni taqqoslash (L1) ---
interface PowItem {
  k: 'pow' | 'sqrt' | 'inv';
  a: number;
  e: number;
}
interface PowCmpP {
  items: PowItem[];
  max: boolean;
}
const powVal = (it: PowItem): number => (it.k === 'pow' ? it.a ** it.e : it.k === 'sqrt' ? Math.sqrt(it.a) : (1 / it.a) ** it.e);
const powTex = (it: PowItem): string => (it.k === 'pow' ? `${it.a}^{${it.e}}` : it.k === 'sqrt' ? `\\sqrt{${it.a}}` : `\\left(\\frac{1}{${it.a}}\\right)^{${it.e}}`);
y1T<PowCmpP>(
  'fn-power-compare',
  49,
  'L1',
  120,
  (r) => ({
    items: Array.from({ length: 4 }, () => {
      const k = r.pick(['pow', 'sqrt', 'inv'] as const);
      return k === 'pow' ? { k, a: r.int(2, 9), e: r.pick([-3, -2, -1, 2, 3]) } : k === 'sqrt' ? { k, a: r.int(2, 80), e: 0 } : { k, a: r.int(2, 5), e: r.pick([-3, -2, -1, 2, 3]) };
    }),
    max: r.chance(0.5),
  }),
  (p) => {
    const vals = p.items.map(powVal);
    need(vals.every((v) => v >= 0.002 && v <= 700));
    const sorted = [...vals].sort((a, b) => a - b);
    for (let i = 1; i < 4; i++) need(sorted[i]! / sorted[i - 1]! > 1.04);
    need(new Set(p.items.map(powTex)).size === 4);
    const idx = p.max ? vals.indexOf(sorted[3]!) : vals.indexOf(sorted[0]!);
    const tex = p.items.map(powTex);
    const approx = vals.map((v, i) => `${tex[i]}\\approx ${Number(v.toPrecision(3))}`).join(',\\ ');
    return {
      stem: L(
        `Quyidagi sonlardan qaysi biri eng ${p.max ? 'katta' : 'kichik'}?`,
        `Какое из следующих чисел ${p.max ? 'наибольшее' : 'наименьшее'}?`,
        `Tómendegi sanlardan qaysısı eń ${p.max ? 'úlken' : 'kishi'}?`, // kaa: tekshirilsin
        `Which of the following numbers is the ${p.max ? 'largest' : 'smallest'}?`,
      ),
      correct: M(tex[idx]!),
      wrong: tex.filter((_, i) => i !== idx).map(M),
      sol: L(
        `Qiymatlarni solishtiramiz (manfiy daraja kasrni teskariga aylantiradi): ${M(approx)}. Eng ${p.max ? 'katta' : 'kichik'}i ${M(tex[idx]!)}. ${ANS.uz}: ${M(tex[idx]!)}.`,
        `Сравним значения (отрицательная степень переворачивает дробь): ${M(approx)}. ${p.max ? 'Наибольшее' : 'Наименьшее'} — ${M(tex[idx]!)}. ${ANS.ru}: ${M(tex[idx]!)}.`,
        `Mánislerdi salıstıramız (teris dáreje bólshekti keri aylandıradı): ${M(approx)}. Eń ${p.max ? 'úlkeni' : 'kishisi'} ${M(tex[idx]!)}. ${ANS.kaa}: ${M(tex[idx]!)}.`, // kaa: tekshirilsin
        `Compare the values (a negative exponent inverts the fraction): ${M(approx)}. The ${p.max ? 'largest' : 'smallest'} is ${M(tex[idx]!)}. ${ANS.en}: ${M(tex[idx]!)}.`,
      ),
      mis: L(
        "Manfiy darajani manfiy son deb hisoblash ($a^{-n}=-a^n$ deb) yoki $\\left(\\frac{1}{a}\\right)^{-n}$ ni kichraytirib yuborish.",
        'Считают отрицательную степень отрицательным числом ($a^{-n}=-a^n$) либо неверно обращают $\\left(\\frac{1}{a}\\right)^{-n}$.',
        "Teris dárejeni teris san dep esaplaw ($a^{-n}=-a^n$ dep) yamasa $\\left(\\frac{1}{a}\\right)^{-n}$ di qáte aylandırıw.", // kaa: tekshirilsin
        'Treating a negative exponent as a negative number ($a^{-n}=-a^n$), or inverting $\\left(\\frac{1}{a}\\right)^{-n}$ incorrectly.',
      ),
    };
  },
);

// --- 50: ko'rsatkichli funksiyaning kesmadagi eng katta/kichik qiymati (L2) ---
interface ExpRangeP {
  k: number;
  bnum: number;
  bden: number;
  c: number;
  d: number;
  m: number;
  n: number;
  max: boolean;
}
y1T<ExpRangeP>(
  'fn-exp-range',
  50,
  'L2',
  170,
  (r) => {
    const small = r.chance(0.5);
    const c = r.int(-3, 3);
    const m = c + r.int(-3, 0);
    return { k: r.pick([-2, -1, 1, 2, 3]), bnum: small ? 1 : r.pick([2, 3]), bden: small ? r.pick([2, 3]) : 1, c, d: r.pick([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]), m, n: m + r.int(2, 5), max: r.chance(0.5) };
  },
  (p) => {
    need(p.n - p.c <= 4 && p.m - p.c >= -4 && p.n > p.m);
    const base = frac(p.bnum, p.bden);
    const pw = (e: number): Frac => (e >= 0 ? fPow(base, e) : fPow(frac(p.bden, p.bnum), -e));
    const val = (x: number): Frac => fAdd(fMul(fInt(p.k), pw(x - p.c)), fInt(p.d));
    const vals = [val(p.m), val(p.n)];
    const hi = fNum(vals[0]!) > fNum(vals[1]!) ? vals[0]! : vals[1]!;
    const lo = fNum(vals[0]!) > fNum(vals[1]!) ? vals[1]! : vals[0]!;
    const ans = p.max ? hi : lo;
    need(ans.d <= 100 && Math.abs(ans.n) <= 400 && hi.n !== lo.n * 0);
    const baseTex = p.bden === 1 ? String(p.bnum) : `\\left(\\frac{${p.bnum}}{${p.bden}}\\right)`;
    const fx = `${p.k === 1 ? '' : p.k === -1 ? '-' : `${p.k}\\cdot `}${baseTex}^{${xs(-p.c)}}${sg(p.d)}`;
    const seg = `[${p.m};\\ ${p.n}]`;
    const inc = (p.bden === 1) === (p.k > 0);
    const other = p.max ? lo : hi;
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiyaning ${M(seg)} kesmadagi eng ${p.max ? 'katta' : 'kichik'} qiymatini toping.`,
        `Найдите ${p.max ? 'наибольшее' : 'наименьшее'} значение функции ${M(`f(x)=${fx}`)} на отрезке ${M(seg)}.`,
        `${M(`f(x)=${fx}`)} funkciyasınıń ${M(seg)} kesindisindegi eń ${p.max ? 'úlken' : 'kishi'} mánisin tabıń.`, // kaa: tekshirilsin
        `Find the ${p.max ? 'largest' : 'smallest'} value of ${M(`f(x)=${fx}`)} on the segment ${M(seg)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, [other, val(p.c), fNeg(ans), fAdd(ans, fInt(1))]),
      sol: L(
        `Funksiya ${inc ? "o'sadi" : 'kamayadi'} (${p.bden === 1 ? M(`${p.bnum}>1`) : M('0<a<1')} va ${M(`k=${p.k}${p.k > 0 ? '>0' : '<0'}`)}), shuning uchun ekstremumlar kesma uchlarida: ${M(`f(${p.m})=${texF(val(p.m))}`)}, ${M(`f(${p.n})=${texF(val(p.n))}`)}. ${ANS.uz}: ${mf(ans)}.`,
        `Функция ${inc ? 'возрастает' : 'убывает'} (${p.bden === 1 ? M(`${p.bnum}>1`) : M('0<a<1')} и ${M(`k=${p.k}${p.k > 0 ? '>0' : '<0'}`)}), поэтому экстремумы на концах отрезка: ${M(`f(${p.m})=${texF(val(p.m))}`)}, ${M(`f(${p.n})=${texF(val(p.n))}`)}. ${ANS.ru}: ${mf(ans)}.`,
        `Funkciya ${inc ? 'óssedi' : 'kemeyedi'} (${p.bden === 1 ? M(`${p.bnum}>1`) : M('0<a<1')} hám ${M(`k=${p.k}${p.k > 0 ? '>0' : '<0'}`)}), sonlıqtan ekstremumlar kesindi ushlarında: ${M(`f(${p.m})=${texF(val(p.m))}`)}, ${M(`f(${p.n})=${texF(val(p.n))}`)}. ${ANS.kaa}: ${mf(ans)}.`, // kaa: tekshirilsin
        `The function is ${inc ? 'increasing' : 'decreasing'} (${p.bden === 1 ? M(`${p.bnum}>1`) : M('0<a<1')} and ${M(`k=${p.k}${p.k > 0 ? '>0' : '<0'}`)}), so the extrema are at the ends of the segment: ${M(`f(${p.m})=${texF(val(p.m))}`)}, ${M(`f(${p.n})=${texF(val(p.n))}`)}. ${ANS.en}: ${mf(ans)}.`,
      ),
      mis: L(
        "Asos 1 dan kichik yoki $k<0$ bo'lganda monotonlik yo'nalishini aralashtirish (eng katta qiymatni noto'g'ri uchda hisoblash).",
        'Путают направление монотонности при основании меньше 1 или при $k<0$ (наибольшее значение считают не на том конце).',
        "Tiykar 1 den kishi yamasa $k<0$ bolǵanda monotonlıq baǵıtın aralastırıw (eń úlken mánisti qáte ushta esaplaw).", // kaa: tekshirilsin
        'Mixing up the direction of monotonicity when the base is below 1 or $k<0$ (evaluating the maximum at the wrong end).',
      ),
    };
  },
);

// --- 51: logarifmik funksiyaning aniqlanish sohasi (L2) ---
interface LogDomainP {
  kind: 'ratio' | 'sum2' | 'conc' | 'rootlog';
  b: number;
  p: number;
  q: number;
}
const negX = (q: number): string => (q === 0 ? '-x' : `${q}-x`);
y1T<LogDomainP>(
  'fn-log-domain',
  51,
  'L2',
  160,
  (r) => ({ kind: r.pick(['ratio', 'sum2', 'conc', 'rootlog'] as const), b: r.pick([2, 3, 5, 10]), p: r.int(-7, 7), q: r.int(-7, 7) }),
  (p) => {
    need(p.p !== p.q);
    const lo = Math.min(p.p, p.q);
    const hi = Math.max(p.p, p.q);
    let fx: string;
    let correct: string;
    let sol: string;
    if (p.kind === 'ratio') {
      fx = T`\log_{${p.b}}\left(\frac{${xs(-p.p)}}{${xs(-p.q)}}\right)`;
      correct = `${ivl(null, lo, false, false)}\\cup ${ivl(hi, null, false, false)}`;
      sol = T`\frac{${xs(-p.p)}}{${xs(-p.q)}}>0`;
    } else if (p.kind === 'sum2') {
      fx = T`\log_{${p.b}}(${xs(-p.p)})+\log_{${p.b}}(${xs(-p.q)})`;
      correct = ivl(hi, null, false, false);
      sol = T`x>${p.p}\ \text{va}\ x>${p.q}`;
    } else if (p.kind === 'conc') {
      need(p.p < p.q);
      fx = T`\log_{${p.b}}(${xs(-p.p)})+\log_{${p.b}}(${negX(p.q)})`;
      correct = ivl(p.p, p.q, false, false);
      sol = T`x>${p.p}\ \text{va}\ x<${p.q}`;
    } else {
      need(p.p < p.q);
      fx = T`\log_{${p.b}}(${negX(p.q)})+\sqrt{${xs(-p.p)}}`;
      correct = ivl(p.p, p.q, true, false);
      sol = T`x<${p.q}\ \text{va}\ x\ge ${p.p}`;
    }
    const cand = [ivl(lo, hi, false, false), ivl(lo, hi, true, true), `${ivl(null, lo, false, false)}\\cup ${ivl(hi, null, false, false)}`, ivl(hi, null, false, false), ivl(lo, hi, true, false), `${ivl(null, lo, false, true)}\\cup ${ivl(hi, null, true, false)}`, ivl(lo, null, false, false)].filter((c) => c !== correct);
    const solRu = sol.replace('\\text{va}', '\\text{и}');
    const solEn = sol.replace('\\text{va}', '\\text{and}');
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiyaning aniqlanish sohasini toping.`,
        `Найдите область определения функции ${M(`f(x)=${fx}`)}.`,
        `${M(`f(x)=${fx}`)} funkciyasınıń anıqlanıw oblastın tabıń.`, // kaa: tekshirilsin
        `Find the domain of the function ${M(`f(x)=${fx}`)}.`,
      ),
      correct: M(correct),
      wrong: cand.map(M),
      sol: L(
        `Logarifm ostidagi ifoda musbat bo'lishi kerak: ${M(sol)}${p.kind === 'rootlog' ? ", ildiz ostida esa manfiy bo'lmagan ifoda" : ''}. ${ANS.uz}: ${M(correct)}.`,
        `Выражение под логарифмом должно быть положительным: ${M(solRu)}${p.kind === 'rootlog' ? ', а под корнем — неотрицательным' : ''}. ${ANS.ru}: ${M(correct)}.`,
        `Logarifm astındaǵı ańlatpa oń bolıwı kerek: ${M(sol.replace('\\text{va}', '\\text{hám}'))}${p.kind === 'rootlog' ? ', túbir astında bolsa teris emes ańlatpa' : ''}. ${ANS.kaa}: ${M(correct)}.`, // kaa: tekshirilsin
        `The expression under a logarithm must be positive: ${M(solEn)}${p.kind === 'rootlog' ? ', and under a root non-negative' : ''}. ${ANS.en}: ${M(correct)}.`,
      ),
      mis: L(
        "Logarifmlar yig'indisida har bir logarifm ostidagi shartni alohida emas, bir-biridan mustaqil olish (kesishmani emas, birlashmani olish) yoki chegaralarni qavs turini aralashtirish.",
        'Берут объединение вместо пересечения условий для каждого логарифма либо путают скобки на границах (под логарифмом строго больше нуля, под корнем нестрого).',
        "Logarifmler qosındısında hár bir logarifm astındaǵı shártlerdiń kesilisiwin emes, birlespesin alıw yamasa shegaralardaǵı qawıs túrlerin aralastırıw.", // kaa: tekshirilsin
        'Taking the union instead of the intersection of the conditions for each logarithm, or mixing up the brackets at the ends (strict under a log, non-strict under a root).',
      ),
    };
  },
);

// --- 53: teskari trigonometrik funksiyalar qiymatlarining yig'indisi (L2) ---
type InvFn = 'asin' | 'acos' | 'atan';
const INV_TAB: Record<InvFn, readonly { tex: string; f: Frac }[]> = {
  asin: [
    { tex: '-1', f: frac(-1, 2) },
    { tex: '-\\frac{\\sqrt{3}}{2}', f: frac(-1, 3) },
    { tex: '-\\frac{\\sqrt{2}}{2}', f: frac(-1, 4) },
    { tex: '-\\frac{1}{2}', f: frac(-1, 6) },
    { tex: '0', f: frac(0, 1) },
    { tex: '\\frac{1}{2}', f: frac(1, 6) },
    { tex: '\\frac{\\sqrt{2}}{2}', f: frac(1, 4) },
    { tex: '\\frac{\\sqrt{3}}{2}', f: frac(1, 3) },
    { tex: '1', f: frac(1, 2) },
  ],
  acos: [
    { tex: '-1', f: frac(1, 1) },
    { tex: '-\\frac{\\sqrt{3}}{2}', f: frac(5, 6) },
    { tex: '-\\frac{\\sqrt{2}}{2}', f: frac(3, 4) },
    { tex: '-\\frac{1}{2}', f: frac(2, 3) },
    { tex: '0', f: frac(1, 2) },
    { tex: '\\frac{1}{2}', f: frac(1, 3) },
    { tex: '\\frac{\\sqrt{2}}{2}', f: frac(1, 4) },
    { tex: '\\frac{\\sqrt{3}}{2}', f: frac(1, 6) },
    { tex: '1', f: frac(0, 1) },
  ],
  atan: [
    { tex: '-\\sqrt{3}', f: frac(-1, 3) },
    { tex: '-1', f: frac(-1, 4) },
    { tex: '-\\frac{\\sqrt{3}}{3}', f: frac(-1, 6) },
    { tex: '0', f: frac(0, 1) },
    { tex: '\\frac{\\sqrt{3}}{3}', f: frac(1, 6) },
    { tex: '1', f: frac(1, 4) },
    { tex: '\\sqrt{3}', f: frac(1, 3) },
  ],
};
const INV_NAME: Record<InvFn, string> = { asin: '\\arcsin', acos: '\\arccos', atan: '\\arctan' };
interface InvSumP {
  fa: InvFn;
  ia: number;
  fb: InvFn;
  ib: number;
  k: 1 | 2;
  s: 1 | -1;
}
y1T<InvSumP>(
  'fn-invtrig-sum',
  53,
  'L2',
  170,
  (r) => {
    const fns = ['asin', 'acos', 'atan'] as const;
    const fa = r.pick(fns);
    const fb = r.pick(fns);
    return { fa, ia: r.int(0, INV_TAB[fa].length - 1), fb, ib: r.int(0, INV_TAB[fb].length - 1), k: r.pick([1, 2] as const), s: r.pick([1, -1] as const) };
  },
  (p) => {
    need(p.fa !== p.fb);
    const A = INV_TAB[p.fa][p.ia]!;
    const B = INV_TAB[p.fb][p.ib]!;
    const val = fAdd(fMul(fInt(p.k), A.f), fMul(fInt(p.s), B.f));
    need(val.n !== 0 && Math.abs(fNum(val)) <= 2);
    // tipik xato: arccos o'rniga arcsin qiymati (va aksincha)
    const swap = (fn: InvFn, i: number): Frac => {
      const tex = INV_TAB[fn][i]!.tex;
      const other = fn === 'asin' ? 'acos' : fn === 'acos' ? 'asin' : 'atan';
      return INV_TAB[other].find((e) => e.tex === tex)?.f ?? INV_TAB[fn][i]!.f;
    };
    const wrongVal = fAdd(fMul(fInt(p.k), swap(p.fa, p.ia)), fMul(fInt(p.s), swap(p.fb, p.ib)));
    const expr = `${p.k === 2 ? '2' : ''}${INV_NAME[p.fa]}\\left(${A.tex}\\right)${p.s === 1 ? '+' : '-'}${INV_NAME[p.fb]}\\left(${B.tex}\\right)`;
    const part = (fn: InvFn, t: string, f: Frac) => `${INV_NAME[fn]}\\left(${t}\\right)=${piS(f)}`;
    const calc = `${part(p.fa, A.tex, A.f)},\\quad ${part(p.fb, B.tex, B.f)}`;
    return {
      stem: L(
        `${M(expr)} ifodaning qiymatini toping.`,
        `Найдите значение выражения ${M(expr)}.`,
        `${M(expr)} ańlatpasınıń mánisin tabıń.`, // kaa: tekshirilsin
        `Find the value of the expression ${M(expr)}.`,
      ),
      correct: mpiS(val),
      wrong: fracWrongS(val, [wrongVal, fNeg(val), fAdd(val, frac(1, 6)), fSub(val, frac(1, 3))]),
      sol: L(
        `Qiymatlar: ${M(calc)}. Demak ${M(`${p.k === 2 ? '2\\cdot ' : ''}${piS(A.f).includes('\\') || piS(A.f) === '0' ? `(${piS(A.f)})` : `(${piS(A.f)})`}${p.s === 1 ? '+' : '-'}(${piS(B.f)})=${piS(val)}`)}. ${ANS.uz}: ${mpiS(val)}.`,
        `Значения: ${M(calc)}. Значит ${M(`${p.k === 2 ? '2\\cdot ' : ''}(${piS(A.f)})${p.s === 1 ? '+' : '-'}(${piS(B.f)})=${piS(val)}`)}. ${ANS.ru}: ${mpiS(val)}.`,
        `Mánisler: ${M(calc)}. Demek ${M(`${p.k === 2 ? '2\\cdot ' : ''}(${piS(A.f)})${p.s === 1 ? '+' : '-'}(${piS(B.f)})=${piS(val)}`)}. ${ANS.kaa}: ${mpiS(val)}.`, // kaa: tekshirilsin
        `Values: ${M(calc)}. So ${M(`${p.k === 2 ? '2\\cdot ' : ''}(${piS(A.f)})${p.s === 1 ? '+' : '-'}(${piS(B.f)})=${piS(val)}`)}. ${ANS.en}: ${mpiS(val)}.`,
      ),
      mis: L(
        "$\\arccos$ ning qiymatlar oralig'i $[0;\\pi]$, $\\arcsin$ niki $\\left[-\\frac{\\pi}{2};\\frac{\\pi}{2}\\right]$ ekanini aralashtirish (masalan, $\\arccos\\left(-\\frac{1}{2}\\right)=-\\frac{\\pi}{3}$ deb yozish).",
        'Путают области значений: $\\arccos$ — $[0;\\pi]$, $\\arcsin$ — $\\left[-\\frac{\\pi}{2};\\frac{\\pi}{2}\\right]$ (например, пишут $\\arccos\\left(-\\frac{1}{2}\\right)=-\\frac{\\pi}{3}$).',
        "$\\arccos$ tıń mánisler aralıǵı $[0;\\pi]$, $\\arcsin$ nikı $\\left[-\\frac{\\pi}{2};\\frac{\\pi}{2}\\right]$ ekenin aralastırıw (mısalı, $\\arccos\\left(-\\frac{1}{2}\\right)=-\\frac{\\pi}{3}$ dep jazıw).", // kaa: tekshirilsin
        'Mixing up the ranges: $\\arccos$ takes values in $[0;\\pi]$, $\\arcsin$ in $\\left[-\\frac{\\pi}{2};\\frac{\\pi}{2}\\right]$ (e.g. writing $\\arccos\\left(-\\frac{1}{2}\\right)=-\\frac{\\pi}{3}$).',
      ),
    };
  },
);
/** Ishorali pi-kasr uchun fracWrong (manfiylar ham qabul qilinadi) */
function fracWrongS(correct: Frac, mistakes: readonly Frac[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>([`${correct.n}/${correct.d}`]);
  const push = (f: Frac) => {
    const k = `${f.n}/${f.d}`;
    if (f.n === 0 || seen.has(k) || Math.abs(fNum(f)) > 2.5) return;
    seen.add(k);
    out.push(mpiS(f));
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 24; k++) {
    push(fAdd(correct, frac(k, 12)));
    push(fSub(correct, frac(k, 12)));
  }
  return out;
}

// --- 53: teskari trigonometrik funksiyalar kompozitsiyasi (L2) ---
interface InvEvalP {
  kind: 'sin_acos' | 'cos_asin' | 'tan_asin' | 'tan_acos' | 'cos2_asin' | 'sin2_acos';
  t: number;
  a: number;
  b: number;
  c: number;
}
const TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [7, 24, 25],
];
y1T<InvEvalP>(
  'fn-invtrig-eval',
  53,
  'L2',
  170,
  (r) => {
    const [a, b, c] = r.pick(TRIPLES);
    return { kind: r.pick(['sin_acos', 'cos_asin', 'tan_asin', 'tan_acos', 'cos2_asin', 'sin2_acos'] as const), t: r.pick([-1, 1]), a, b, c };
  },
  (p) => {
    const t = frac(p.t * p.a, p.c);
    const co = frac(p.b, p.c); // sqrt(1 - t^2) > 0
    const tt = texF(t);
    const arg = `\\left(${tt.startsWith('-') ? '-' : ''}\\frac{${p.a}}{${p.c}}\\right)`;
    let expr: string;
    let ans: Frac;
    let wrong: Frac[];
    switch (p.kind) {
      case 'sin_acos':
        expr = `\\sin\\left(\\arccos${arg}\\right)`;
        ans = co;
        wrong = [fNeg(co), t, fNeg(t), frac(p.a, p.b)];
        break;
      case 'cos_asin':
        expr = `\\cos\\left(\\arcsin${arg}\\right)`;
        ans = co;
        wrong = [fNeg(co), t, frac(p.b, p.a), fNeg(t)];
        break;
      case 'tan_asin':
        expr = `\\tan\\left(\\arcsin${arg}\\right)`;
        ans = fDiv(t, co);
        wrong = [fNeg(ans), fDiv(co, t), frac(p.a, p.c), fMul(t, co)];
        break;
      case 'tan_acos':
        expr = `\\tan\\left(\\arccos${arg}\\right)`;
        ans = fDiv(co, t);
        wrong = [fNeg(ans), fDiv(t, co), frac(p.b, p.c), fMul(t, co)];
        break;
      case 'cos2_asin':
        expr = `\\cos\\left(2\\arcsin${arg}\\right)`;
        ans = fSub(fInt(1), fMul(fInt(2), fMul(t, t)));
        wrong = [fSub(fMul(fInt(2), fMul(t, t)), fInt(1)), fMul(fInt(2), co), fSub(fInt(1), fMul(t, t)), fMul(fInt(2), t)];
        break;
      default:
        expr = `\\sin\\left(2\\arccos${arg}\\right)`;
        ans = fMul(fInt(2), fMul(t, co));
        wrong = [fNeg(ans), fMul(fInt(2), t), fMul(t, co), fMul(fInt(2), co)];
    }
    need(ans.n !== 0);
    const how = {
      sin_acos: T`\sin\theta=\sqrt{1-\cos^2\theta}\ (\theta\in[0;\pi])`,
      cos_asin: T`\cos\theta=\sqrt{1-\sin^2\theta}\ (\theta\in[-\frac{\pi}{2};\frac{\pi}{2}])`,
      tan_asin: T`\tan\theta=\frac{\sin\theta}{\cos\theta}`,
      tan_acos: T`\tan\theta=\frac{\sin\theta}{\cos\theta}`,
      cos2_asin: T`\cos 2\theta=1-2\sin^2\theta`,
      sin2_acos: T`\sin 2\theta=2\sin\theta\cos\theta`,
    }[p.kind];
    return {
      stem: L(
        `${M(expr)} ifodaning qiymatini toping.`,
        `Найдите значение выражения ${M(expr)}.`,
        `${M(expr)} ańlatpasınıń mánisin tabıń.`, // kaa: tekshirilsin
        `Find the value of the expression ${M(expr)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${M('\\theta')} — ichki teskari funksiya qiymati: ${M(how)}. Bunda ${M(`\\sqrt{1-\\left(${texF(t)}\\right)^2}=${texF(co)}`)}. Natija: ${mf(ans)}. ${ANS.uz}: ${mf(ans)}.`,
        `${M('\\theta')} — значение внутренней обратной функции: ${M(how)}. Здесь ${M(`\\sqrt{1-\\left(${texF(t)}\\right)^2}=${texF(co)}`)}. Результат: ${mf(ans)}. ${ANS.ru}: ${mf(ans)}.`,
        `${M('\\theta')} — ishki keri funkciya mánisi: ${M(how)}. Bunda ${M(`\\sqrt{1-\\left(${texF(t)}\\right)^2}=${texF(co)}`)}. Nátiyje: ${mf(ans)}. ${ANS.kaa}: ${mf(ans)}.`, // kaa: tekshirilsin
        `${M('\\theta')} is the value of the inner inverse function: ${M(how)}. Here ${M(`\\sqrt{1-\\left(${texF(t)}\\right)^2}=${texF(co)}`)}. Result: ${mf(ans)}. ${ANS.en}: ${mf(ans)}.`,
      ),
      mis: L(
        "Teskari trigonometrik funksiya burchagining chorakni (ishorasini) hisobga olmaslik: masalan, $\\arccos$ ning sinusi doim musbat, $\\arcsin$ ning kosinusi doim musbat.",
        'Не учитывают четверть угла: синус от $\\arccos$ и косинус от $\\arcsin$ всегда неотрицательны.',
        "Keri trigonometriyalıq funkciya müyeshiniń shereginiń (belgisin) esapqa almaw: mısalı, $\\arccos$ tıń sinusı hám $\\arcsin$ niń kosinusı hámme waqıt oń.", // kaa: tekshirilsin
        'Ignoring the quadrant of the angle: the sine of an $\\arccos$ and the cosine of an $\\arcsin$ are always non-negative.',
      ),
    };
  },
);

// --- 54: grafikni almashtirish: nuqtaning tasviri (L2) ---
interface TransPtP {
  m: number;
  n: number;
  A: number;
  B: number;
  C: number;
  D: number;
}
y1T<TransPtP>(
  'fn-transform-point',
  54,
  'L2',
  170,
  (r) => {
    const B = r.pick([-2, -1, 1, 2]);
    const C = r.int(-5, 5);
    const xp = r.int(-6, 6);
    return { m: B * xp + C, n: r.int(-6, 6), A: r.pick([-3, -2, -1, 2, 3]), B, C, D: r.pick([-4, -3, -2, -1, 1, 2, 3, 4]) };
  },
  (p) => {
    need(p.C !== 0 && p.n !== 0);
    const xp = (p.m - p.C) / p.B;
    const yp = p.A * p.n + p.D;
    need(Number.isInteger(xp) && Math.abs(xp) <= 8 && Math.abs(yp) <= 25);
    const gx = `g(x)=${p.A === 1 ? '' : p.A === -1 ? '-' : p.A}f(${lin(p.B, p.C)})${sg(p.D)}`;
    const correct = M(pairTex(String(xp), String(yp)));
    const cands: [number, number][] = [
      [p.m - p.C, yp],
      [(p.m + p.C) / p.B, yp],
      [xp, p.A * (p.n + p.D)],
      [xp, p.A * p.n - p.D],
      [p.B * p.m + p.C, yp],
      [-xp, yp],
    ];
    const wrong = cands.filter(([a, b]) => Number.isInteger(a) && (a !== xp || b !== yp)).map(([a, b]) => M(pairTex(String(a), String(b))));
    return {
      stem: L(
        `${M('y=f(x)')} funksiyaning grafigi ${M(`(${p.m};\\ ${p.n})`)} nuqtadan o'tadi. ${M(gx)} funksiyaning grafigi qaysi nuqtadan o'tadi?`,
        `График функции ${M('y=f(x)')} проходит через точку ${M(`(${p.m};\\ ${p.n})`)}. Через какую точку проходит график функции ${M(gx)}?`,
        `${M('y=f(x)')} funkciyasınıń grafigi ${M(`(${p.m};\\ ${p.n})`)} noqatınan ótedi. ${M(gx)} funkciyasınıń grafigi qaysı noqattan ótedi?`, // kaa: tekshirilsin
        `The graph of ${M('y=f(x)')} passes through ${M(`(${p.m};\\ ${p.n})`)}. Through which point does the graph of ${M(gx)} pass?`,
      ),
      correct,
      wrong,
      sol: L(
        `Argument ${M(`${lin(p.B, p.C)}=${p.m}`)} bo'lishi kerak: ${M(`x=${xp}`)}. Shunda ${M(`g(${xp})=${p.A}\\cdot ${par(p.n)}${sg(p.D)}=${yp}`)}. ${ANS.uz}: ${correct}.`,
        `Аргумент должен равняться ${M(`${lin(p.B, p.C)}=${p.m}`)}: ${M(`x=${xp}`)}. Тогда ${M(`g(${xp})=${p.A}\\cdot ${par(p.n)}${sg(p.D)}=${yp}`)}. ${ANS.ru}: ${correct}.`,
        `Argument ${M(`${lin(p.B, p.C)}=${p.m}`)} bolıwı kerek: ${M(`x=${xp}`)}. Sonda ${M(`g(${xp})=${p.A}\\cdot ${par(p.n)}${sg(p.D)}=${yp}`)}. ${ANS.kaa}: ${correct}.`, // kaa: tekshirilsin
        `The argument must equal ${M(`${lin(p.B, p.C)}=${p.m}`)}: ${M(`x=${xp}`)}. Then ${M(`g(${xp})=${p.A}\\cdot ${par(p.n)}${sg(p.D)}=${yp}`)}. ${ANS.en}: ${correct}.`,
      ),
      mis: L(
        "Argumentdagi o'zgartirishni teskari bajarish: $x$ ni topishda $Bx+C=m$ ni yechish o'rniga $m$ ga $C$ ni qo'shish yoki $B$ ga bo'lmaslik.",
        'Выполняют преобразование аргумента в обратную сторону: вместо решения $Bx+C=m$ прибавляют $C$ к $m$ или не делят на $B$.',
        "Argumenttegi ózgertiwdi keri orınlaw: $x$ ti tabıwda $Bx+C=m$ di sheshiw ornına $m$ ge $C$ ni qosıw yamasa $B$ ǵa bólmew.", // kaa: tekshirilsin
        'Applying the argument change in the wrong direction: instead of solving $Bx+C=m$, adding $C$ to $m$ or not dividing by $B$.',
      ),
    };
  },
);

// --- 55: f(ax+b) = g(x) bo'yicha f(k) (L2) ---
interface ComposeSubstP {
  a: number;
  b: number;
  g: [number, number, number];
  x0: number;
}
y1T<ComposeSubstP>(
  'fn-compose-subst',
  55,
  'L2',
  170,
  (r) => ({ a: r.pick([-3, -2, 2, 3, 4]), b: r.int(-7, 7), g: [r.int(-9, 9), r.int(-6, 6), r.pick([-3, -2, -1, 1, 2, 3])], x0: r.int(-4, 5) }),
  (p) => {
    need(p.b !== 0 && p.g[0] !== 0 && p.g[1] !== 0);
    const k = p.a * p.x0 + p.b;
    const gv = (x: number) => p.g[0] + p.g[1] * x + p.g[2] * x * x;
    const ans = gv(p.x0);
    need(k !== p.x0 && Math.abs(k) <= 30 && Math.abs(ans) <= 200);
    const gx = polyTex([p.g[0], p.g[1], p.g[2]]);
    const eq = `f(${lin(p.a, p.b)})=${gx}`;
    return {
      stem: L(
        `${M(eq)} bo'lsa, ${M(`f(${k})`)} ni toping.`,
        `Если ${M(eq)}, найдите ${M(`f(${k})`)}.`,
        `${M(eq)} bolsa, ${M(`f(${k})`)} tı tabıń.`, // kaa: tekshirilsin
        `If ${M(eq)}, find ${M(`f(${k})`)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [gv(k), gv(-p.x0), gv(p.x0 + 1), gv(p.x0 - 1), gv(Math.round((k - p.b) / p.a) + p.b)]),
      sol: L(
        `${M(`${lin(p.a, p.b)}=${k}`)} dan ${M(`x=${p.x0}`)}. Shunda ${M(`f(${k})=${polyTex([p.g[0], p.g[1], p.g[2]]).replace(/x/g, `(${p.x0})`)}=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `Из ${M(`${lin(p.a, p.b)}=${k}`)} получаем ${M(`x=${p.x0}`)}. Тогда ${M(`f(${k})=${polyTex([p.g[0], p.g[1], p.g[2]]).replace(/x/g, `(${p.x0})`)}=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(`${lin(p.a, p.b)}=${k}`)} den ${M(`x=${p.x0}`)}. Sonda ${M(`f(${k})=${polyTex([p.g[0], p.g[1], p.g[2]]).replace(/x/g, `(${p.x0})`)}=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `From ${M(`${lin(p.a, p.b)}=${k}`)} we get ${M(`x=${p.x0}`)}. Then ${M(`f(${k})=${polyTex([p.g[0], p.g[1], p.g[2]]).replace(/x/g, `(${p.x0})`)}=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "$f(k)$ ni topishda $x$ ni $k$ ga tenglashtirish ($g(k)$ ni hisoblash) — avval argument $ax+b=k$ dan $x$ ni topish kerak.",
        'Подставляют $x=k$ (считают $g(k)$); сначала нужно найти $x$ из $ax+b=k$.',
        "$f(k)$ ti tabıwda $x$ ti $k$ ǵa teńlestiriw ($g(k)$ ni esaplaw) — aldın argument $ax+b=k$ dan $x$ ti tabıw kerek.", // kaa: tekshirilsin
        'Substituting $x=k$ (computing $g(k)$); one must first find $x$ from $ax+b=k$.',
      ),
    };
  },
);

// --- 59: x -> oo da kasr-ratsional funksiyaning limiti (L1) ---
interface LimRatP {
  num: number[];
  den: number[];
}
y1T<LimRatP>(
  'fn-limit-rat',
  59,
  'L1',
  120,
  (r) => {
    const n = r.pick([2, 2, 3]);
    const mk = () => Array.from({ length: n + 1 }, (_, i) => (i === n ? r.pick([-6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6]) : r.int(-7, 7)));
    return { num: mk(), den: mk() };
  },
  (p) => {
    const n = p.num.length - 1;
    const a = p.num[n]!;
    const d = p.den[n]!;
    need(p.num[n - 1] !== 0 && p.den[n - 1] !== 0 && p.num[0] !== 0 && p.den[0] !== 0);
    const ans = frac(a, d);
    const expr = `\\lim_{x\\to\\infty}\\frac{${polyTex(p.num)}}{${polyTex(p.den)}}`;
    const xn = n === 2 ? 'x^{2}' : 'x^{3}';
    const lowRatio = frac(p.num[n - 1]!, p.den[n - 1]!);
    return {
      stem: L(
        `${M(expr)} limitni hisoblang.`,
        `Вычислите предел ${M(expr)}.`,
        `${M(expr)} limitin esaplań.`, // kaa: tekshirilsin
        `Evaluate the limit ${M(expr)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, [frac(d, a), lowRatio, fNeg(ans), frac(a - d, 1), frac(a * d, 1)]),
      sol: L(
        `Surat va maxrajni ${M(xn)} ga bo'lamiz: kichik darajali hadlar ${M('\\frac{c}{x^k}\\to 0')}. Limit ${M(`\\frac{${a}}{${d}}=${texF(ans)}`)}. ${ANS.uz}: ${mf(ans)}.`,
        `Разделим числитель и знаменатель на ${M(xn)}: слагаемые ${M('\\frac{c}{x^k}\\to 0')}. Предел ${M(`\\frac{${a}}{${d}}=${texF(ans)}`)}. ${ANS.ru}: ${mf(ans)}.`,
        `Alım hám bólimdi ${M(xn)} qa bólemiz: kishi dárejeli hádler ${M('\\frac{c}{x^k}\\to 0')}. Limit ${M(`\\frac{${a}}{${d}}=${texF(ans)}`)}. ${ANS.kaa}: ${mf(ans)}.`, // kaa: tekshirilsin
        `Divide the numerator and the denominator by ${M(xn)}: the terms ${M('\\frac{c}{x^k}\\to 0'.replace('c', 'c'))} vanish. The limit is ${M(`\\frac{${a}}{${d}}=${texF(ans)}`)}. ${ANS.en}: ${mf(ans)}.`,
      ),
      mis: L(
        "Limitni oldingi (kichik darajali) koeffitsiyentlar nisbati deb olish yoki surat va maxrajni almashtirib yozish.",
        'Берут отношение коэффициентов при младших степенях либо переворачивают дробь.',
        "Limitti kishi dárejeli koefficientler qatnası dep alıw yamasa alım hám bólimdi almastırıp jazıw.", // kaa: tekshirilsin
        'Taking the ratio of the lower-order coefficients, or inverting the fraction.',
      ),
    };
  },
);

// --- 59: sqrt farqining limiti (L2) ---
interface LimSqrtP {
  kind: 'one' | 'two';
  p: number;
  q: number;
  r: number;
  s: number;
}
y1T<LimSqrtP>(
  'fn-limit-sqrt',
  59,
  'L2',
  170,
  (r) => ({ kind: r.pick(['one', 'two'] as const), p: r.int(-9, 9), q: r.int(-6, 6), r: r.int(-9, 9), s: r.int(-6, 6) }),
  (p) => {
    need(p.p !== 0 && p.q !== 0);
    if (p.kind === 'two') need(p.r !== 0 && p.s !== 0 && p.p !== p.r);
    const ans = p.kind === 'one' ? frac(p.p, 2) : frac(p.p - p.r, 2);
    const rad1 = polyTex([p.q, p.p, 1]);
    const rad2 = polyTex([p.s, p.r, 1]);
    const expr = p.kind === 'one' ? T`\lim_{x\to+\infty}\left(\sqrt{${rad1}}-x\right)` : T`\lim_{x\to+\infty}\left(\sqrt{${rad1}}-\sqrt{${rad2}}\right)`;
    const conj = p.kind === 'one' ? T`\frac{${polyTex([p.q, p.p])}}{\sqrt{${rad1}}+x}` : T`\frac{${polyTex([p.q - p.s, p.p - p.r])}}{\sqrt{${rad1}}+\sqrt{${rad2}}}`;
    const lead = p.kind === 'one' ? p.p : p.p - p.r;
    const wrongs = p.kind === 'one' ? [frac(p.p, 1), frac(-p.p, 2), frac(p.p, 4), frac(0, 1)] : [frac(p.p - p.r, 1), frac(p.p + p.r, 2), frac(r0(p), 1), frac(0, 1)];
    return {
      stem: L(
        `${M(expr)} limitni hisoblang.`,
        `Вычислите предел ${M(expr)}.`,
        `${M(expr)} limitin esaplań.`, // kaa: tekshirilsin
        `Evaluate the limit ${M(expr)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: L(
        `Qo'shma ifodaga ko'paytiramiz va bo'lamiz: ${M(conj)}. Surat va maxrajni ${M('x')} ga bo'lsak, maxrajda ${M(p.kind === 'one' ? '1+1=2' : '1+1=2')}, suratda ${M(`${lead}`)} qoladi. Limit ${M(`\\frac{${lead}}{2}=${texF(ans)}`)}. ${ANS.uz}: ${mf(ans)}.`,
        `Умножим и разделим на сопряжённое: ${M(conj)}. Разделив числитель и знаменатель на ${M('x')}, в знаменателе получим ${M('1+1=2')}, в числителе ${M(`${lead}`)}. Предел ${M(`\\frac{${lead}}{2}=${texF(ans)}`)}. ${ANS.ru}: ${mf(ans)}.`,
        `Qospalı ańlatpaǵa kóbeytip hám bólemiz: ${M(conj)}. Alım hám bólimdi ${M('x')} qa bólsek, bólimde ${M('1+1=2')}, alımda ${M(`${lead}`)} qaladı. Limit ${M(`\\frac{${lead}}{2}=${texF(ans)}`)}. ${ANS.kaa}: ${mf(ans)}.`, // kaa: tekshirilsin
        `Multiply and divide by the conjugate: ${M(conj)}. Dividing the numerator and the denominator by ${M('x')} gives ${M('1+1=2')} in the denominator and ${M(`${lead}`)} in the numerator. The limit is ${M(`\\frac{${lead}}{2}=${texF(ans)}`)}. ${ANS.en}: ${mf(ans)}.`,
      ),
      mis: L(
        "$\\infty-\\infty$ ko'rinishdagi noaniqlikni to'g'ridan-to'g'ri nolga tenglash yoki qo'shma ifodaga ko'paytirib, maxrajdagi $2$ ni unutish.",
        'Считают неопределённость $\\infty-\\infty$ равной нулю либо теряют двойку в знаменателе после умножения на сопряжённое.',
        "$\\infty-\\infty$ kórinisindegi anıqsızlıqtı tuwrıdan-tuwrı nolge teńlew yamasa qospalı ańlatpaǵa kóbeytip, bólimdegi $2$ ni umıtıw.", // kaa: tekshirilsin
        'Treating the indeterminate form $\\infty-\\infty$ as zero, or losing the $2$ in the denominator after multiplying by the conjugate.',
      ),
    };
  },
);
function r0(p: { p: number; r: number }): number {
  return p.p * p.r;
}

// --- 59: bo'lakli funksiyaning uzluksizligi: parametr (L2) ---
interface ContinuityP {
  r: number;
  s: number;
}
y1T<ContinuityP>(
  'fn-continuity',
  59,
  'L2',
  170,
  (r) => ({ r: r.int(-6, 6), s: r.int(-6, 6) }),
  (p) => {
    need(p.r !== p.s && p.r !== 0 && p.s !== 0);
    const b = -(p.r + p.s);
    const c = p.r * p.s;
    const ans = p.r - p.s;
    const num = polyTex([c, b, 1]);
    const den = xs(-p.r);
    const fx = T`f(x)=\begin{cases}\frac{${num}}{${den}}, & x\ne ${p.r}\\ m, & x=${p.r}\end{cases}`;
    return {
      stem: L(
        `${M(fx)} funksiya ${M(`x=${p.r}`)} nuqtada uzluksiz bo'ladigan ${M('m')} ning qiymatini toping.`,
        `Найдите значение ${M('m')}, при котором функция ${M(fx)} непрерывна в точке ${M(`x=${p.r}`)}.`,
        `${M(fx)} funkciyası ${M(`x=${p.r}`)} noqatında úzliksiz bolatuǵın ${M('m')} niń mánisin tabıń.`, // kaa: tekshirilsin
        `Find the value of ${M('m')} for which the function ${M(fx)} is continuous at ${M(`x=${p.r}`)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [p.s - p.r, p.r + p.s, p.r * p.s, b, p.r]),
      sol: L(
        `Uzluksizlik: ${M(T`m=\lim_{x\to ${p.r}}\frac{${num}}{${den}}`)}. Suratni ko'paytuvchilarga ajratamiz: ${M(`${num}=${fac(p.r)}${fac(p.s)}`)}, qisqartirgach ${M(`\\lim (${xs(-p.s)})=${p.r}${sg(-p.s)}=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `Непрерывность: ${M(T`m=\lim_{x\to ${p.r}}\frac{${num}}{${den}}`)}. Раскладываем числитель: ${M(`${num}=${fac(p.r)}${fac(p.s)}`)}, после сокращения ${M(`\\lim (${xs(-p.s)})=${p.r}${sg(-p.s)}=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `Úzliksizlik: ${M(T`m=\lim_{x\to ${p.r}}\frac{${num}}{${den}}`)}. Alımdı kóbeytiwshilerge jikleymiz: ${M(`${num}=${fac(p.r)}${fac(p.s)}`)}, qısqartqannan keyin ${M(`\\lim (${xs(-p.s)})=${p.r}${sg(-p.s)}=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Continuity: ${M(T`m=\lim_{x\to ${p.r}}\frac{${num}}{${den}}`)}. Factor the numerator: ${M(`${num}=${fac(p.r)}${fac(p.s)}`)}; after cancelling ${M(`\\lim (${xs(-p.s)})=${p.r}${sg(-p.s)}=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Funksiyaning nuqtadagi qiymatini $0/0$ deb qoldirish yoki suratdagi ikkinchi ildizni noto'g'ri ishora bilan olish.",
        'Оставляют значение $0/0$ вместо предела либо теряют знак у второго корня числителя.',
        "Funkciyanıń noqattaǵı mánisin $0/0$ dep qaldırıw yamasa alımdaǵı ekinshi túbirdi qáte belgi menen alıw.", // kaa: tekshirilsin
        'Leaving the value $0/0$ instead of the limit, or losing the sign of the second root of the numerator.',
      ),
    };
  },
);

// --- 121: jadvaldan formulani tanlash (chiziqli) (L1) ---
interface TabFormP {
  x0: number;
  k: number;
  b: number;
}
y1T<TabFormP>(
  'fn-table-formula',
  121,
  'L1',
  120,
  (r) => ({ x0: r.int(-1, 3), k: r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b: r.pick([-9, -7, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 7, 9]) }),
  (p) => {
    const xs4 = [0, 1, 2, 3].map((i) => p.x0 + i);
    const ys4 = xs4.map((x) => p.k * x + p.b);
    const tab = tableTex(xs4, ys4);
    const fm = (k: number, b: number) => M(`y=${lin(k, b)}`);
    const correct = fm(p.k, p.b);
    const wrong = [fm(p.k, -p.b), fm(p.b, p.k), fm(p.k + 1, p.b), fm(p.k, p.b + p.k), fm(-p.k, p.b)].filter((w) => w !== correct);
    return {
      stem: L(
        `${M('y')} ning ${M('x')} ga bog'liqligi jadvalda berilgan: ${M(tab)}. Qaysi formula bu bog'liqlikni ifodalaydi?`,
        `Зависимость ${M('y')} от ${M('x')} задана таблицей: ${M(tab)}. Какая формула выражает эту зависимость?`,
        `${M('y')} tiń ${M('x')} ke baylanıslıǵı kestede berilgen: ${M(tab)}. Qaysı formula bul baylanıslıqtı ańlatadı?`, // kaa: tekshirilsin
        `The dependence of ${M('y')} on ${M('x')} is given by the table ${M(tab)}. Which formula expresses it?`,
      ),
      correct,
      wrong,
      sol: L(
        `${M('x')} har safar 1 ga oshganda ${M('y')} ${M(`${p.k > 0 ? '+' : ''}${p.k}`)} ga o'zgaradi, demak ${M(`k=${p.k}`)}. ${M(`x=${xs4[0]}`)} da ${M(`y=${ys4[0]}`)}: ${M(`b=${ys4[0]}${sg(-p.k * xs4[0]!)}=${p.b}`)}. Formula ${correct}. Tekshiruv: barcha ustunlarda mos. ${ANS.uz}: ${correct}.`,
        `При увеличении ${M('x')} на 1 значение ${M('y')} меняется на ${M(`${p.k > 0 ? '+' : ''}${p.k}`)}, значит ${M(`k=${p.k}`)}. При ${M(`x=${xs4[0]}`)} ${M(`y=${ys4[0]}`)}: ${M(`b=${ys4[0]}${sg(-p.k * xs4[0]!)}=${p.b}`)}. Формула ${correct}. Проверка: подходит ко всем столбцам. ${ANS.ru}: ${correct}.`,
        `${M('x')} hár ret 1 ge artqanda ${M('y')} ${M(`${p.k > 0 ? '+' : ''}${p.k}`)} ge ózgeredi, demek ${M(`k=${p.k}`)}. ${M(`x=${xs4[0]}`)} de ${M(`y=${ys4[0]}`)}: ${M(`b=${ys4[0]}${sg(-p.k * xs4[0]!)}=${p.b}`)}. Formula ${correct}. Tekseriw: barlıq bağanalarda sáykes. ${ANS.kaa}: ${correct}.`, // kaa: tekshirilsin
        `Each time ${M('x')} grows by 1, ${M('y')} changes by ${M(`${p.k > 0 ? '+' : ''}${p.k}`)}, so ${M(`k=${p.k}`)}. At ${M(`x=${xs4[0]}`)} we have ${M(`y=${ys4[0]}`)}: ${M(`b=${ys4[0]}${sg(-p.k * xs4[0]!)}=${p.b}`)}. The formula is ${correct}; it fits every column. ${ANS.en}: ${correct}.`,
      ),
      mis: L(
        "Formulani faqat bitta ustun bo'yicha tanlash: boshqa ustunlar bilan tekshirmaslik yoki $k$ va $b$ ni almashtirib qo'yish.",
        'Выбирают формулу по одному столбцу, не проверяя остальные, либо путают $k$ и $b$.',
        "Formulanı tek bir bağana boyınsha tańlaw: basqa bağanalar menen tekspew yamasa $k$ hám $b$ nı almastırıp qoyıw.", // kaa: tekshirilsin
        'Choosing the formula from a single column without checking the others, or swapping $k$ and $b$.',
      ),
    };
  },
);

// --- 121: jadvalda yetishmayotgan qiymat (chiziqli) (L1) ---
interface TabMissP {
  x0: number;
  d: number;
  k: number;
  b: number;
  hole: number;
}
y1T<TabMissP>(
  'fn-table-missing',
  121,
  'L1',
  120,
  (r) => ({ x0: r.int(-3, 2), d: r.pick([1, 2, 3]), k: r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b: r.int(-9, 9), hole: r.int(1, 3) }),
  (p) => {
    need(p.b !== 0);
    const xs5 = [0, 1, 2, 3, 4].map((i) => p.x0 + p.d * i);
    const ys5 = xs5.map((x) => p.k * x + p.b);
    const ans = ys5[p.hole]!;
    const shown = ys5.map((y, i) => (i === p.hole ? null : y));
    const tab = tableTex(xs5, shown);
    const step = p.k * p.d;
    return {
      stem: L(
        `Chiziqli bog'liqlik jadvalda berilgan: ${M(tab)}. Jadvaldagi ${M('?')} o'rniga qanday son turishi kerak?`,
        `Линейная зависимость задана таблицей: ${M(tab)}. Какое число должно стоять вместо ${M('?')}?`,
        `Sızıqlı baylanıslıq kestede berilgen: ${M(tab)}. Kestedegi ${M('?')} ornına qanday san turıwı kerek?`, // kaa: tekshirilsin
        `A linear dependence is given by the table ${M(tab)}. What number should replace ${M('?')}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [ans + p.k, ans - p.k, ans + step, ans - step, ans + p.d, (ys5[p.hole - 1]! + ys5[p.hole + 1]!) / 2 + 1]),
      sol: L(
        `${M('x')} har gal ${mi(p.d)} ga oshganda ${M('y')} ${M(`${step > 0 ? '+' : ''}${step}`)} ga o'zgaradi. ${M('?')}: ${M(`${ys5[p.hole - 1]}${sg(step)}=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `При увеличении ${M('x')} на ${mi(p.d)} значение ${M('y')} меняется на ${M(`${step > 0 ? '+' : ''}${step}`)}. ${M('?')}: ${M(`${ys5[p.hole - 1]}${sg(step)}=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M('x')} hár ret ${mi(p.d)} ge artqanda ${M('y')} ${M(`${step > 0 ? '+' : ''}${step}`)} ge ózgeredi. ${M('?')}: ${M(`${ys5[p.hole - 1]}${sg(step)}=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Each time ${M('x')} grows by ${mi(p.d)}, ${M('y')} changes by ${M(`${step > 0 ? '+' : ''}${step}`)}. ${M('?')}: ${M(`${ys5[p.hole - 1]}${sg(step)}=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "$x$ ning qadami 1 dan farq qilganda $y$ ning o'zgarishini $k$ ga teng deb olish (to'g'risi $k\\cdot\\Delta x$).",
        'Считают, что $y$ меняется на $k$ при шаге $x$, отличном от 1 (верно $k\\cdot\\Delta x$).',
        "$x$ tiń qádemi 1 den parıqlı bolǵanda $y$ tiń ózgerisin $k$ ǵa teń dep alıw (durısı $k\\cdot\\Delta x$).", // kaa: tekshirilsin
        'Assuming $y$ changes by $k$ when the step of $x$ differs from 1 (it changes by $k\\cdot\\Delta x$).',
      ),
    };
  },
);

// --- 121: kvadrat bog'liqlik jadvalida yetishmayotgan qiymat (L2) ---
interface TabQuadP {
  x0: number;
  a: number;
  b: number;
  c: number;
  hole: number;
}
y1T<TabQuadP>(
  'fn-table-quad',
  121,
  'L2',
  170,
  (r) => ({ x0: r.int(-3, 1), a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-6, 6), c: r.int(-8, 8), hole: r.int(1, 3) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0);
    const xs5 = [0, 1, 2, 3, 4].map((i) => p.x0 + i);
    const ys5 = xs5.map((x) => p.a * x * x + p.b * x + p.c);
    const ans = ys5[p.hole]!;
    const tab = tableTex(
      xs5,
      ys5.map((y, i) => (i === p.hole ? null : y)),
    );
    const d1 = ys5.slice(1).map((y, i) => y - ys5[i]!);
    const lin1 = (ys5[p.hole - 1]! + ys5[p.hole + 1]!) / 2;
    return {
      stem: L(
        `${M('y')} ning ${M('x')} ga kvadrat bog'liqligi jadvalda berilgan: ${M(tab)}. ${M('?')} o'rniga qanday son turishi kerak?`,
        `Квадратичная зависимость ${M('y')} от ${M('x')} задана таблицей: ${M(tab)}. Какое число должно стоять вместо ${M('?')}?`,
        `${M('y')} tiń ${M('x')} ke kvadrat baylanıslıǵı kestede berilgen: ${M(tab)}. ${M('?')} ornına qanday san turıwı kerek?`, // kaa: tekshirilsin
        `A quadratic dependence of ${M('y')} on ${M('x')} is given by the table ${M(tab)}. What number should replace ${M('?')}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [lin1, lin1 + 1, ans + 2 * p.a, ans - 2 * p.a, ans + p.a]),
      sol: L(
        `Kvadrat bog'liqlikda ikkinchi ayirmalar bir xil (${M(`2a=${2 * p.a}`)}). Ketma-ket ayirmalar: ${M(d1.map((v, i) => (i === p.hole - 1 || i === p.hole ? '?' : v)).join(',\\ '))}; ikkinchi ayirma ${M(`${2 * p.a}`)}. Demak ${M('?')}: ${M(`${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `Для квадратичной зависимости вторые разности постоянны (${M(`2a=${2 * p.a}`)}). Первые разности: ${M(d1.map((v, i) => (i === p.hole - 1 || i === p.hole ? '?' : v)).join(',\\ '))}; вторая разность ${M(`${2 * p.a}`)}. Значит ${M('?')}: ${M(`${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `Kvadrat baylanıslıqta ekinshi ayırmalar birdey (${M(`2a=${2 * p.a}`)}). Izbe-iz ayırmalar: ${M(d1.map((v, i) => (i === p.hole - 1 || i === p.hole ? '?' : v)).join(',\\ '))}; ekinshi ayırma ${M(`${2 * p.a}`)}. Demek ${M('?')}: ${M(`${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `For a quadratic dependence the second differences are constant (${M(`2a=${2 * p.a}`)}). First differences: ${M(d1.map((v, i) => (i === p.hole - 1 || i === p.hole ? '?' : v)).join(',\\ '))}; the second difference is ${M(`${2 * p.a}`)}. Hence ${M('?')}: ${M(`${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Kvadrat bog'liqlikni chiziqli deb hisoblash (qo'shni qiymatlarning o'rtachasini olish) — parabolada bu noto'g'ri.",
        'Считают зависимость линейной (берут среднее соседних значений) — для параболы это неверно.',
        "Kvadrat baylanıslıqtı sızıqlı dep esaplaw (qońsı mánislerdiń ortashasın alıw) — parabolada bul qáte.", // kaa: tekshirilsin
        'Treating the dependence as linear (taking the average of the neighbouring values), which is wrong for a parabola.',
      ),
    };
  },
);

// --- 121: tarif formulasi (bo'lakli chiziqli bog'liqlik) (L2) ---
interface TariffP {
  A: number;
  B: number;
  T: number;
  C: number;
  d: number;
}
y1T<TariffP>(
  'fn-word-model',
  121,
  'L2',
  170,
  (r) => {
    const B = r.int(1, 4);
    const T0 = r.int(3, 8);
    return { A: r.int(2, 8), B, T: T0, C: B + r.int(1, 3), d: T0 + r.int(2, 9) };
  },
  (p) => {
    const ans = p.A + p.B * p.T + p.C * (p.d - p.T);
    need(p.d > p.T);
    const S = T`S(x)=\begin{cases}${p.A}+${p.B}x, & 0\le x\le ${p.T}\\ ${p.A + p.B * p.T}+${p.C}(x-${p.T}), & x>${p.T}\end{cases}`;
    return {
      stem: L(
        `Taksi yo'l haqi (ming so'mda) masofa ${M('x')} (km) ga bog'liq: ${M(S)}. ${M(`${p.d}`)} km masofa uchun to'lovni toping.`,
        `Стоимость поездки на такси (в тысячах сумов) зависит от расстояния ${M('x')} (км): ${M(S)}. Найдите стоимость поездки на ${M(`${p.d}`)} км.`,
        `Taksi jol haqısı (mıń swmda) aralıq ${M('x')} (km) ǵa baylanıslı: ${M(S)}. ${M(`${p.d}`)} km aralıq ushın tólewdi tabıń.`, // kaa: tekshirilsin
        `The taxi fare (in thousand soums) depends on the distance ${M('x')} (km): ${M(S)}. Find the fare for ${M(`${p.d}`)} km.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [p.A + p.B * p.d, p.A + p.C * p.d, p.B * p.T + p.C * (p.d - p.T), p.A + p.B * p.T + p.C * p.d, p.A + p.B * p.T + p.B * (p.d - p.T)], { min: 1 }),
      sol: L(
        `${M(`${p.d}>${p.T}`)}, shuning uchun ikkinchi formula: ${M(`S(${p.d})=${p.A + p.B * p.T}+${p.C}\\cdot ${p.d - p.T}=${ans}`)}. ${ANS.uz}: ${mi(ans)}.`,
        `${M(`${p.d}>${p.T}`)}, поэтому берём вторую формулу: ${M(`S(${p.d})=${p.A + p.B * p.T}+${p.C}\\cdot ${p.d - p.T}=${ans}`)}. ${ANS.ru}: ${mi(ans)}.`,
        `${M(`${p.d}>${p.T}`)}, sonlıqtan ekinshi formula: ${M(`S(${p.d})=${p.A + p.B * p.T}+${p.C}\\cdot ${p.d - p.T}=${ans}`)}. ${ANS.kaa}: ${mi(ans)}.`, // kaa: tekshirilsin
        `Since ${M(`${p.d}>${p.T}`)}, use the second formula: ${M(`S(${p.d})=${p.A + p.B * p.T}+${p.C}\\cdot ${p.d - p.T}=${ans}`)}. ${ANS.en}: ${mi(ans)}.`,
      ),
      mis: L(
        "Noto'g'ri bo'lakdagi formulani qo'llash yoki ikkinchi bo'lakda $(x-T)$ o'rniga $x$ ni qo'yish.",
        'Применяют формулу не из того промежутка либо подставляют $x$ вместо $(x-T)$ во втором случае.',
        "Qáte bólektegi formulanı qollanıw yamasa ekinshi bólekte $(x-T)$ ornına $x$ ti qoyıw.", // kaa: tekshirilsin
        'Using the formula of the wrong piece, or substituting $x$ instead of $(x-T)$ in the second case.',
      ),
    };
  },
);

// --- 121: kvadrat bog'liqlik jadvali: koeffitsiyent va qiymat (L2, O) ---
interface TabOP {
  a: number;
  b: number;
  c: number;
}
oT<TabOP>(
  'fn-table-o',
  121,
  'L2',
  200,
  (r) => ({ a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-6, 6), c: r.int(-8, 8) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0);
    const xs4 = [-1, 0, 1, 2];
    const f = (x: number) => p.a * x * x + p.b * x + p.c;
    const tab = tableTex(xs4, xs4.map(f));
    const f5 = f(5);
    return {
      stem: L(
        `${M('y=ax^2+bx+c')} bog'liqlik jadvalda berilgan: ${M(tab)}.`,
        `Зависимость ${M('y=ax^2+bx+c')} задана таблицей: ${M(tab)}.`,
        `${M('y=ax^2+bx+c')} baylanıslıǵı kestede berilgen: ${M(tab)}.`, // kaa: tekshirilsin
        `The dependence ${M('y=ax^2+bx+c')} is given by the table ${M(tab)}.`,
      ),
      a: {
        prompt: L(`${M('a')} koeffitsiyentni toping.`, `Найдите коэффициент ${M('a')}.`, `${M('a')} koefficientin tabıń.`, `Find the coefficient ${M('a')}.`), // kaa: tekshirilsin
        key: fInt(p.a),
      },
      b: {
        prompt: L(`${M('x=5')} dagi ${M('y')} ning qiymatini toping.`, `Найдите значение ${M('y')} при ${M('x=5')}.`, `${M('x=5')} tegi ${M('y')} tiń mánisin tabıń.`, `Find the value of ${M('y')} at ${M('x=5')}.`), // kaa: tekshirilsin
        key: fInt(f5),
      },
      sol: L(
        `${M('x=0')} dan ${M(`c=${p.c}`)}. ${M('x=1')} va ${M('x=-1')} dan ${M(`a+b=${f(1) - p.c}`)}, ${M(`a-b=${f(-1) - p.c}`)}; qo'shsak ${M(`2a=${f(1) + f(-1) - 2 * p.c}`)}, ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}. ${M(`y(5)=${polyTex([p.c, p.b, p.a]).replace(/x/g, '(5)')}=${f5}`)}.`,
        `Из ${M('x=0')}: ${M(`c=${p.c}`)}. Из ${M('x=1')} и ${M('x=-1')}: ${M(`a+b=${f(1) - p.c}`)}, ${M(`a-b=${f(-1) - p.c}`)}; сложив, ${M(`2a=${f(1) + f(-1) - 2 * p.c}`)}, ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}. ${M(`y(5)=${polyTex([p.c, p.b, p.a]).replace(/x/g, '(5)')}=${f5}`)}.`,
        `${M('x=0')} den ${M(`c=${p.c}`)}. ${M('x=1')} hám ${M('x=-1')} den ${M(`a+b=${f(1) - p.c}`)}, ${M(`a-b=${f(-1) - p.c}`)}; qossaq ${M(`2a=${f(1) + f(-1) - 2 * p.c}`)}, ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}. ${M(`y(5)=${polyTex([p.c, p.b, p.a]).replace(/x/g, '(5)')}=${f5}`)}.`, // kaa: tekshirilsin
        `From ${M('x=0')}: ${M(`c=${p.c}`)}. From ${M('x=1')} and ${M('x=-1')}: ${M(`a+b=${f(1) - p.c}`)}, ${M(`a-b=${f(-1) - p.c}`)}; adding gives ${M(`2a=${f(1) + f(-1) - 2 * p.c}`)}, ${M(`a=${p.a}`)}, ${M(`b=${p.b}`)}. ${M(`y(5)=${polyTex([p.c, p.b, p.a]).replace(/x/g, '(5)')}=${f5}`)}.`,
      ),
      mis: L(
        "Jadvaldagi bog'liqlikni chiziqli deb olish (oxirgi ayirmani davom ettirish) yoki $c$ ni $x=0$ dagi qiymat ekanini unutish.",
        'Считают зависимость линейной (продолжают последнюю разность) либо забывают, что $c$ — значение при $x=0$.',
        "Kestedegi baylanıslıqtı sızıqlı dep alıw (sońǵı ayırmanı dawam ettiriw) yamasa $c$ nıń $x=0$ degi mánis ekenin umıtıw.", // kaa: tekshirilsin
        'Treating the dependence as linear (extending the last difference), or forgetting that $c$ is the value at $x=0$.',
      ),
    };
  },
);

// =====================================================================================================
// 6.1 Hosila (mavzular 60-64) va yangi 110 (hosilaning fizik ma'nosi; normal tenglamasi);
// 6.2 Boshlang'ich funksiya va integral (65, 66)
// =====================================================================================================

const findL = (e: string): L10n => L(`${e} ni toping.`, `Найдите ${e}.`, `${e} tabıń.`, `Find ${e}.`); // kaa: tekshirilsin
const calcL = (e: string): L10n => L(`${e} ni hisoblang.`, `Вычислите ${e}.`, `${e} di esaplań.`, `Evaluate ${e}.`); // kaa: tekshirilsin
const dAt = (x0: string): string => M(`f'(${x0})`);
const DER = L('Hosila:', 'Производная:', 'Tuwındı:', 'The derivative:'); // kaa: tekshirilsin
const piAt = (f: Frac): string => (f.n === 0 ? '0' : f.n < 0 ? `-${piTex(frac(-f.n, f.d))}` : piTex(f));
const fracChk = (f: Frac): boolean => f.d <= 60 && Math.abs(f.n) <= 4000;

// --- 60: ko'phad hosilasi nuqtada (L1) ---
interface DerPolyP {
  c: [number, number, number, number];
  x0: number;
}
y1T<DerPolyP>(
  'der-poly-point',
  60,
  'L1',
  100,
  (r) => ({ c: [r.int(-9, 9), r.int(-9, 9), r.int(-6, 6), r.int(1, 4)], x0: r.pick([-4, -3, -2, -1, 1, 2, 3, 4]) }),
  (p) => {
    const [d, c1, b, a] = p.c;
    need(b !== 0 && c1 !== 0 && d !== 0);
    const x0 = p.x0;
    const ans = 3 * a * x0 * x0 + 2 * b * x0 + c1;
    need(Math.abs(ans) <= 300 && ans !== 0);
    const f0 = a * x0 ** 3 + b * x0 * x0 + c1 * x0 + d;
    const wrong = intWrong(ans, [f0, 3 * a * x0 * x0 + 2 * b * x0, 3 * a * x0 * x0 + b * x0 + c1, ans + d, -ans]);
    const der = `f'(x)=${polyTex([c1, 2 * b, 3 * a])},\\ f'(${x0})=${ans}`;
    return {
      stem: J(L(`${M(`f(x)=${polyTex(p.c)}`)} bo'lsa,`, `Если ${M(`f(x)=${polyTex(p.c)}`)}, то`, `${M(`f(x)=${polyTex(p.c)}`)} bolsa,`, `If ${M(`f(x)=${polyTex(p.c)}`)}, then`), findL(dAt(String(x0)))), // kaa: tekshirilsin
      correct: mi(ans),
      wrong,
      sol: J(DER, M(der), fin(String(ans))),
      mis: L(
        "Hosila o'rniga funksiyaning qiymatini hisoblash yoki $x^{2}$ hosilasida koeffitsiyentni ($2b$) kamaytirib olish.",
        'Вычисляют значение функции вместо производной либо теряют множитель при производной степени.',
        "Tuwındı ornına funkciyanıń mánisin esaplaw yamasa dárejeniń tuwındısında koefficientti qáte alıw.", // kaa: tekshirilsin
        'Computing the function value instead of the derivative, or mishandling the coefficient when differentiating a power.',
      ),
    };
  },
);

// --- 60: ko'paytma hosilasi nuqtada (L2) ---
interface DerProdP {
  p: number;
  q: number;
  r: number;
  s: number;
  x0: number;
}
y1T<DerProdP>(
  'der-prod-point',
  60,
  'L2',
  150,
  (r) => ({ p: r.int(-5, 5), q: r.int(-6, 6), r: r.pick([-3, -2, -1, 2, 3, 4]), s: r.int(-7, 7), x0: r.pick([-3, -2, -1, 1, 2, 3]) }),
  (p) => {
    need(p.p !== 0 && p.q !== 0 && p.s !== 0);
    const u = p.x0 * p.x0 + p.p * p.x0 + p.q;
    const v = p.r * p.x0 + p.s;
    const du = 2 * p.x0 + p.p;
    const ans = du * v + u * p.r;
    need(Math.abs(ans) <= 400 && ans !== 0 && u !== 0 && v !== 0);
    const wrong = intWrong(ans, [du * p.r, u * v, du * v, u * p.r, du * v - u * p.r]);
    const fx = `(${polyTex([p.q, p.p, 1])})(${polyTex([p.s, p.r])})`;
    const der = `f'(x)=(2x${sg(p.p)})(${polyTex([p.s, p.r])})+(${polyTex([p.q, p.p, 1])})\\cdot ${p.r},\\ f'(${p.x0})=${du}\\cdot ${v}+${u}\\cdot ${p.r}=${ans}`;
    return {
      stem: J(L(`${M(`f(x)=${fx}`)} bo'lsa,`, `Если ${M(`f(x)=${fx}`)}, то`, `${M(`f(x)=${fx}`)} bolsa,`, `If ${M(`f(x)=${fx}`)}, then`), findL(dAt(String(p.x0)))), // kaa: tekshirilsin
      correct: mi(ans),
      wrong,
      sol: J(L("Ko'paytma hosilasi $(uv)'=u'v+uv'$:", 'Производная произведения $(uv)\'=u\'v+uv\'$:', "Kóbeyme tuwındısı $(uv)'=u'v+uv'$:", 'Product rule $(uv)\'=u\'v+uv\'$:'), M(der), fin(String(ans))), // kaa: tekshirilsin
      mis: L(
        "Ko'paytmaning hosilasini hosilalar ko'paytmasi ($u'v'$) deb olish.",
        'Берут производную произведения как произведение производных ($u\'v\'$).',
        "Kóbeymeniń tuwındısın tuwındılar kóbeymesi ($u'v'$) dep alıw.", // kaa: tekshirilsin
        'Taking the derivative of a product as the product of derivatives ($u\'v\'$).',
      ),
    };
  },
);

// --- 60: bo'linma hosilasi nuqtada, kasr javob (L2) ---
interface DerQuotP {
  a: number;
  b: number;
  c: number;
  d: number;
  x0: number;
}
y1T<DerQuotP>(
  'der-quot-point',
  60,
  'L2',
  150,
  (r) => ({ a: r.int(-5, 5), b: r.int(-6, 6), c: r.pick([-3, -2, -1, 1, 2, 3]), d: r.int(-6, 6), x0: r.int(-4, 4) }),
  (p) => {
    need(p.a !== 0 && p.b !== 0 && p.d !== 0);
    const den = p.c * p.x0 + p.d;
    const det = p.a * p.d - p.b * p.c;
    need(den !== 0 && det !== 0);
    const ans = frac(det, den * den);
    need(fracChk(ans));
    const wrong = fracWrong(ans, [frac(p.a * p.d + p.b * p.c, den * den), frac(det, den), frac(p.a, p.c), frac(-det, den * den), frac(p.a * p.c, den * den)]);
    const fx = `\\frac{${polyTex([p.b, p.a])}}{${polyTex([p.d, p.c])}}`;
    const der = `f'(x)=\\frac{${p.a}(${polyTex([p.d, p.c])})-(${polyTex([p.b, p.a])})\\cdot ${p.c}}{(${polyTex([p.d, p.c])})^{2}}=\\frac{${det}}{(${polyTex([p.d, p.c])})^{2}},\\ f'(${p.x0})=${texFrac(ans)}`;
    return {
      stem: J(L(`${M(`f(x)=${fx}`)} bo'lsa,`, `Если ${M(`f(x)=${fx}`)}, то`, `${M(`f(x)=${fx}`)} bolsa,`, `If ${M(`f(x)=${fx}`)}, then`), findL(dAt(String(p.x0)))), // kaa: tekshirilsin
      correct: mf(ans),
      wrong,
      sol: J(L("Bo'linma hosilasi $\\left(\\frac{u}{v}\\right)'=\\frac{u'v-uv'}{v^{2}}$:", 'Производная частного $\\left(\\frac{u}{v}\\right)\'=\\frac{u\'v-uv\'}{v^{2}}$:', "Bóliwshi tuwındısı $\\left(\\frac{u}{v}\\right)'=\\frac{u'v-uv'}{v^{2}}$:", 'Quotient rule $\\left(\\frac{u}{v}\\right)\'=\\frac{u\'v-uv\'}{v^{2}}$:'), M(der), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "Suratdagi ayirmada hadlar tartibini almashtirish ($uv'-u'v$) yoki maxrajni kvadratga ko'tarishni unutish.",
        'Меняют порядок членов числителя ($uv\'-u\'v$) либо забывают возвести знаменатель в квадрат.',
        "Alımdaǵı ayırmada hádlerdiń tártibin almastırıw ($uv'-u'v$) yamasa bólimdi kvadratqa kóteriwdi umıtıw.", // kaa: tekshirilsin
        'Swapping the order of terms in the numerator ($uv\'-u\'v$), or forgetting to square the denominator.',
      ),
    };
  },
);

// --- 61: murakkab funksiya: (ax+b)^n yoki sqrt(ax+b) hosilasi (L2) ---
interface DerPowP {
  kind: 'pow' | 'sqrt';
  a: number;
  b: number;
  n: number;
  x0: number;
  s: number;
}
y1T<DerPowP>(
  'der-pow-point',
  61,
  'L2',
  140,
  (r) => ({ kind: r.pick(['pow', 'sqrt'] as const), a: r.pick([-3, -2, -1, 1, 2, 3, 4, 5, 6]), b: r.int(-7, 7), n: r.pick([3, 4, 5]), x0: r.int(-3, 4), s: r.int(1, 6) }),
  (p) => {
    let fx: string;
    let ans: Frac;
    let wrongs: Frac[];
    let der: string;
    if (p.kind === 'pow') {
      need(p.b !== 0);
      const u = p.a * p.x0 + p.b;
      need(u !== 0 && Math.abs(u) <= 6);
      fx = `(${polyTex([p.b, p.a])})^{${p.n}}`;
      ans = fInt(p.n * p.a * u ** (p.n - 1));
      need(Math.abs(ans.n) <= 4000 && ans.n !== 0);
      wrongs = [fInt(p.n * u ** (p.n - 1)), fInt(p.a * u ** (p.n - 1)), fInt(p.n * p.a * u ** p.n), fInt(p.n * p.a * u ** (p.n - 2))];
      der = `f'(x)=${p.n}(${polyTex([p.b, p.a])})^{${p.n - 1}}\\cdot ${p.a},\\ f'(${p.x0})=${p.n}\\cdot ${u}^{${p.n - 1}}\\cdot ${p.a}=${ans.n}`;
    } else {
      need(p.a > 0);
      const b = p.s * p.s - p.a * p.x0;
      need(b !== 0);
      fx = `\\sqrt{${polyTex([b, p.a])}}`;
      ans = frac(p.a, 2 * p.s);
      wrongs = [frac(p.a, p.s), frac(1, 2 * p.s), frac(p.a, 2 * p.s * p.s), frac(p.a, 4 * p.s)];
      der = `f'(x)=\\frac{${p.a}}{2\\sqrt{${polyTex([b, p.a])}}},\\ f'(${p.x0})=\\frac{${p.a}}{2\\cdot ${p.s}}=${texFrac(ans)}`;
    }
    return {
      stem: J(L(`${M(`f(x)=${fx}`)} bo'lsa,`, `Если ${M(`f(x)=${fx}`)}, то`, `${M(`f(x)=${fx}`)} bolsa,`, `If ${M(`f(x)=${fx}`)}, then`), findL(dAt(String(p.x0)))), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: J(L('Murakkab funksiya hosilasi $(g(u))\'=g\'(u)\\cdot u\'$:', 'Производная сложной функции $(g(u))\'=g\'(u)\\cdot u\'$:', "Quramalı funkciya tuwındısı $(g(u))'=g'(u)\\cdot u'$:", 'Chain rule $(g(u))\'=g\'(u)\\cdot u\'$:'), M(der), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "Ichki funksiyaning hosilasini ($a$ ko'paytuvchisini) qo'shishni unutish.",
        'Забывают умножить на производную внутренней функции (множитель $a$).',
        "Ishki funkciyanıń tuwındısın ($a$ kóbeytiwshisin) kóbeytiwdi umıtıw.", // kaa: tekshirilsin
        'Forgetting to multiply by the derivative of the inner function (the factor $a$).',
      ),
    };
  },
);

// --- 61: trigonometrik funksiya hosilasi nuqtada: k sin(mx)+cx yoki k cos(mx)+cx (L2) ---
const COS_RATIONAL: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 1, 1],
  [1, 3, 1, 2],
  [1, 2, 0, 1],
  [2, 3, -1, 2],
  [1, 1, -1, 1],
  [4, 3, -1, 2],
  [3, 2, 0, 1],
  [5, 3, 1, 2],
];
const SIN_RATIONAL: readonly (readonly [number, number, number, number])[] = [
  [0, 1, 0, 1],
  [1, 6, 1, 2],
  [1, 2, 1, 1],
  [5, 6, 1, 2],
  [1, 1, 0, 1],
  [7, 6, -1, 2],
  [3, 2, -1, 1],
  [11, 6, -1, 2],
];
interface DerTrigP {
  fn: 'sin' | 'cos';
  k: number;
  m: number;
  c: number;
  idx: number;
}
y1T<DerTrigP>(
  'der-trig-point',
  61,
  'L2',
  160,
  (r) => ({ fn: r.pick(['sin', 'cos'] as const), k: r.pick([-4, -3, -2, 2, 3, 4, 5]), m: r.pick([1, 2, 3, 4]), c: r.int(-5, 5), idx: r.int(0, 7) }),
  (p) => {
    const row = (p.fn === 'sin' ? COS_RATIONAL : SIN_RATIONAL)[p.idx]!;
    const trig = frac(row[2], row[3]);
    const theta = frac(row[0], row[1]);
    const x0 = fDiv(theta, fInt(p.m));
    const base = fMul(fInt(p.k * p.m * (p.fn === 'sin' ? 1 : -1)), trig);
    const ans = fAdd(base, fInt(p.c));
    need(ans.n !== 0 && fracChk(ans) && p.c !== 0);
    const arg = p.m === 1 ? 'x' : `${p.m}x`;
    const fx = `${p.k === 1 ? '' : p.k === -1 ? '-' : p.k}\\${p.fn}(${arg})${p.c === 0 ? '' : p.c < 0 ? `-${-p.c === 1 ? '' : -p.c}x` : `+${p.c === 1 ? '' : p.c}x`}`;
    const wrongs = [fAdd(fMul(fInt(p.k), trig), fInt(p.c)), fAdd(fMul(fInt(-p.k * p.m * (p.fn === 'sin' ? 1 : -1)), trig), fInt(p.c)), base, fAdd(fMul(fInt(p.k * p.m * (p.fn === 'sin' ? 1 : -1)), frac(1, 2)), fInt(p.c))];
    const x0t = M(`f'\\left(${piAt(x0)}\\right)`);
    const der = `f'(x)=${p.fn === 'sin' ? '' : '-'}${p.k * p.m}\\${p.fn === 'sin' ? 'cos' : 'sin'}(${arg})${sg(p.c)}`;
    return {
      stem: J(L(`${M(`f(x)=${fx}`)} bo'lsa,`, `Если ${M(`f(x)=${fx}`)}, то`, `${M(`f(x)=${fx}`)} bolsa,`, `If ${M(`f(x)=${fx}`)}, then`), findL(x0t)), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: J(DER, M(der), L(`Qiymat: ${mf(ans)}.`, `Значение: ${mf(ans)}.`, `Mánis: ${mf(ans)}.`, `Value: ${mf(ans)}.`), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "Ichki funksiya ($mx$) hosilasi — $m$ ko'paytuvchisini yo'qotish yoki $\\cos$ hosilasining ishorasini ($-\\sin$) unutish.",
        'Теряют множитель $m$ от производной внутренней функции либо знак в $(\\cos)\'=-\\sin$.',
        "Ishki funkciya ($mx$) tuwındısı — $m$ kóbeytiwshisin joǵaltıw yamasa $(\\cos)'=-\\sin$ belgisin umıtıw.", // kaa: tekshirilsin
        'Dropping the factor $m$ from the inner derivative, or the sign in $(\\cos)\'=-\\sin$.',
      ),
    };
  },
);

// --- 62: berilgan to'g'ri chiziqqa parallel urinma: urinish nuqtasi abssissasi (L1) ---
interface TanParP {
  a: number;
  b: number;
  c: number;
  x0: number;
  m: number;
}
y1T<TanParP>(
  'der-tangent-parallel',
  62,
  'L1',
  120,
  (r) => ({ a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-8, 8), c: r.int(-9, 9), x0: r.int(-6, 6), m: r.int(-9, 9) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0 && p.x0 !== 0);
    const k = 2 * p.a * p.x0 + p.b;
    need(k !== 0 && Math.abs(k) <= 30);
    const wrong = intWrong(p.x0, [-p.x0, Math.round(k / p.a), (k + p.b) / (2 * p.a), (k - p.b) / p.a, k, 2 * p.a * p.x0].filter((v) => Number.isInteger(v)));
    const fx = polyTex([p.c, p.b, p.a]);
    const line = `y=${polyTex([p.m, k])}`;
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya grafigiga o'tkazilgan urinma ${M(line)} to'g'ri chiziqqa parallel. Urinish nuqtasining abssissasini toping.`,
        `Касательная к графику функции ${M(`f(x)=${fx}`)} параллельна прямой ${M(line)}. Найдите абсциссу точки касания.`,
        `${M(`f(x)=${fx}`)} funkciya grafigine ótkerilgen urınba ${M(line)} tuwrısına parallel. Urınıw noqatınıń abscissasın tabıń.`, // kaa: tekshirilsin
        `The tangent to the graph of ${M(`f(x)=${fx}`)} is parallel to the line ${M(line)}. Find the abscissa of the point of tangency.`,
      ),
      correct: mi(p.x0),
      wrong,
      sol: J(L('Parallel chiziqlarning burchak koeffitsiyentlari teng: $f\'(x_0)=k$.', 'Угловые коэффициенты параллельных прямых равны: $f\'(x_0)=k$.', "Parallel tuwrılardıń múyeshlik koefficientleri teń: $f'(x_0)=k$.", 'Parallel lines have equal slopes: $f\'(x_0)=k$.'), M(`f'(x)=${polyTex([p.b, 2 * p.a])}=${k}\\Rightarrow x_0=${p.x0}`), fin(String(p.x0))), // kaa: tekshirilsin
      mis: L(
        "$f'(x_0)=k$ o'rniga $f(x_0)=k$ deb yechish yoki hosiladagi $2a$ koeffitsiyentini unutish.",
        'Решают $f(x_0)=k$ вместо $f\'(x_0)=k$ либо теряют множитель $2a$ в производной.',
        "$f'(x_0)=k$ ornına $f(x_0)=k$ dep sheshiw yamasa tuwındıdaǵı $2a$ koefficientin umıtıw.", // kaa: tekshirilsin
        'Solving $f(x_0)=k$ instead of $f\'(x_0)=k$, or dropping the factor $2a$ in the derivative.',
      ),
    };
  },
);

// --- 62: Ox o'qi bilan 45 yoki 135 gradus burchak tashkil etuvchi urinmalar: abssissalar yig'indisi (L2) ---
interface TanAngP {
  p: number;
  q: number;
  ang: 45 | 135;
}
y1T<TanAngP>(
  'der-tangent-angle',
  62,
  'L2',
  170,
  (r) => ({ p: r.pick([-9, -6, -3, 3, 6, 9]), q: r.int(-12, 6), ang: r.pick([45, 135] as const) }),
  (p) => {
    const k = p.ang === 45 ? 1 : -1;
    need(4 * p.p * p.p - 12 * (p.q - k) > 0);
    const ans = -(2 * p.p) / 3;
    need(Number.isInteger(ans) && ans !== 0 && p.q !== 0);
    const wrong = intWrong(ans, [-ans, 2 * p.p, p.p, ans + 1, -2 * p.p / 3 * 2].filter((v) => Number.isInteger(v)));
    const fx = `x^{3}${sg(p.p)}x^{2}${sg(p.q)}x`;
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya grafigiga o'tkazilgan va ${M('Ox')} o'qining musbat yo'nalishi bilan ${M(`${p.ang}^\\circ`)} burchak hosil qiluvchi urinmalarning urinish nuqtalari abssissalari yig'indisini toping.`,
        `Найдите сумму абсцисс точек касания касательных к графику функции ${M(`f(x)=${fx}`)}, образующих с положительным направлением оси ${M('Ox')} угол ${M(`${p.ang}^\\circ`)}.`,
        `${M(`f(x)=${fx}`)} funkciya grafigine ótkerilgen hám ${M('Ox')} kósheriniń oń baǵıtı menen ${M(`${p.ang}^\\circ`)} múyesh jasaytuǵın urınbalardıń urınıw noqatları abscissaları qosındısın tabıń.`, // kaa: tekshirilsin
        `Find the sum of the abscissas of the points of tangency of the tangents to the graph of ${M(`f(x)=${fx}`)} that make an angle of ${M(`${p.ang}^\\circ`)} with the positive direction of the ${M('Ox')}-axis.`,
      ),
      correct: mi(ans),
      wrong,
      sol: J(L(`${M(`\\tan ${p.ang}^\\circ=${k}`)}, shuning uchun ${M(`f'(x)=${k}`)}:`, `${M(`\\tan ${p.ang}^\\circ=${k}`)}, поэтому ${M(`f'(x)=${k}`)}:`, `${M(`\\tan ${p.ang}^\\circ=${k}`)}, sonlıqtan ${M(`f'(x)=${k}`)}:`, `${M(`\\tan ${p.ang}^\\circ=${k}`)}, so ${M(`f'(x)=${k}`)}:`), M(`${polyTex([p.q - k, 2 * p.p, 3])}=0`), L(`Viyet: ${M(`x_1+x_2=-\\frac{${2 * p.p}}{3}=${ans}`)}.`, `Виет: ${M(`x_1+x_2=-\\frac{${2 * p.p}}{3}=${ans}`)}.`, `Viyet: ${M(`x_1+x_2=-\\frac{${2 * p.p}}{3}=${ans}`)}.`, `Vieta: ${M(`x_1+x_2=-\\frac{${2 * p.p}}{3}=${ans}`)}.`), fin(String(ans))), // kaa: tekshirilsin
      mis: L(
        "$135^\\circ$ uchun $\\tan=1$ deb olish (ishorani unutish) yoki yig'indini $\\frac{b}{a}$ (minussiz) olish.",
        'Берут $\\tan 135^\\circ=1$ (теряют знак) либо сумму корней как $\\frac{b}{a}$ без минуса.',
        "$135^\\circ$ ushın $\\tan=1$ dep alıw (belgini umıtıw) yamasa qosındını $\\frac{b}{a}$ (minussiz) alıw.", // kaa: tekshirilsin
        'Taking $\\tan 135^\\circ=1$ (losing the sign), or the root sum as $\\frac{b}{a}$ without the minus.',
      ),
    };
  },
);

// --- 63: kamayish oralig'idagi butun sonlar soni (L2) ---
interface DecIntP {
  r1: number;
  r2: number;
}
y1T<DecIntP>(
  'der-decreasing-int',
  63,
  'L2',
  170,
  (r) => ({ r1: r.int(-6, 2), r2: r.int(-2, 8) }),
  (p) => {
    need(p.r2 - p.r1 >= 2 && p.r2 - p.r1 <= 10 && (p.r1 + p.r2) % 2 === 0 && p.r1 * p.r2 !== 0);
    const ans = p.r2 - p.r1 + 1;
    const s = (p.r1 + p.r2) / 2;
    const fx = polyTex([0, 3 * p.r1 * p.r2, -3 * s, 1]);
    const wrong = intWrong(ans, [ans - 1, ans - 2, ans + 1, p.r2 - p.r1 + 2, p.r2, 2 * ans], { min: 1 });
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiya kamayadigan oraliqdagi butun sonlar nechta?`,
        `Сколько целых чисел содержит промежуток убывания функции ${M(`f(x)=${fx}`)}?`,
        `${M(`f(x)=${fx}`)} funkciya kemeyetuǵın aralıqtaǵı pútin sanlar neshe?`, // kaa: tekshirilsin
        `How many integers lie in the interval where ${M(`f(x)=${fx}`)} is decreasing?`,
      ),
      correct: mi(ans),
      wrong,
      sol: J(DER, M(`f'(x)=3(${fac(p.r1).slice(1, -1)})(${fac(p.r2).slice(1, -1)})`), L(`${M(`f'(x)\\le 0`)}: ${M(`[${p.r1};\\ ${p.r2}]`)}. Butun sonlar: ${mi(ans)} ta.`, `${M(`f'(x)\\le 0`)}: ${M(`[${p.r1};\\ ${p.r2}]`)}. Целых чисел: ${mi(ans)}.`, `${M(`f'(x)\\le 0`)}: ${M(`[${p.r1};\\ ${p.r2}]`)}. Pútin sanlar: ${mi(ans)} dana.`, `${M(`f'(x)\\le 0`)}: ${M(`[${p.r1};\\ ${p.r2}]`)}. Integers: ${mi(ans)}.`), fin(String(ans))), // kaa: tekshirilsin
      mis: L(
        "Oraliq uchlarini hisobga olmaslik (funksiya uchlarda ham kamayadi) yoki $r_2-r_1$ ni sonlar soni deb olish.",
        'Не учитывают концы промежутка (функция убывает и в концах) либо берут $r_2-r_1$ как количество чисел.',
        "Aralıq ushların esapqa almaw (funkciya ushlarda da kemeydi) yamasa $r_2-r_1$ di sanlar sanı dep alıw.", // kaa: tekshirilsin
        'Excluding the endpoints (the function is decreasing on the closed interval), or taking $r_2-r_1$ as the count.',
      ),
    };
  },
);

// --- 63: kubik funksiyaning lokal maksimum/minimum qiymati (L3) ---
interface ExtrValP {
  r1: number;
  r2: number;
  d: number;
  ask: 'max' | 'min' | 'diff';
}
y1T<ExtrValP>(
  'der-extremum-value',
  63,
  'L3',
  230,
  (r) => ({ r1: r.int(-4, 3), r2: r.int(-2, 5), d: r.int(-9, 9), ask: r.pick(['max', 'min', 'diff'] as const) }),
  (p) => {
    need(p.r2 - p.r1 >= 1 && p.r2 - p.r1 <= 6 && p.r1 * p.r2 !== 0 && p.d !== 0);
    const f = (x: number) => 2 * x ** 3 - 3 * (p.r1 + p.r2) * x * x + 6 * p.r1 * p.r2 * x + p.d;
    const fmax = f(p.r1);
    const fmin = f(p.r2);
    const ans = p.ask === 'max' ? fmax : p.ask === 'min' ? fmin : fmax - fmin;
    need(Math.abs(ans) <= 400 && ans !== 0);
    const wrong = intWrong(ans, p.ask === 'max' ? [fmin, fmax - p.d, -fmax] : p.ask === 'min' ? [fmax, fmin - p.d, -fmin] : [fmin - fmax, fmax + fmin, p.r2 - p.r1]);
    const fx = polyTex([p.d, 6 * p.r1 * p.r2, -3 * (p.r1 + p.r2), 2]);
    const askL = {
      max: L('lokal maksimum nuqtasidagi qiymatini', 'значение в точке локального максимума', 'lokal maksimum noqatındaǵı mánisin', 'the value at the local maximum point'),
      min: L('lokal minimum nuqtasidagi qiymatini', 'значение в точке локального минимума', 'lokal minimum noqatındaǵı mánisin', 'the value at the local minimum point'),
      diff: L('lokal maksimum va lokal minimum qiymatlari ayirmasini (maksimum minus minimum)', 'разность значений в точках локального максимума и локального минимума (максимум минус минимум)', 'lokal maksimum hám lokal minimum mánisleri ayırmasın (maksimum minus minimum)', 'the difference of the local maximum and local minimum values (maximum minus minimum)'),
    }[p.ask];
    return {
      stem: L(
        `${M(`f(x)=${fx}`)} funksiyaning ${askL.uz} toping.`,
        `Найдите ${askL.ru} функции ${M(`f(x)=${fx}`)}.`,
        `${M(`f(x)=${fx}`)} funkciyanıń ${askL.kaa} tabıń.`, // kaa: tekshirilsin
        `For ${M(`f(x)=${fx}`)}, find ${askL.en}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: J(DER, M(`f'(x)=6(${fac(p.r1).slice(1, -1)})(${fac(p.r2).slice(1, -1)})`), L(`${M(`x=${p.r1}`)} da ishora $+\\to-$ (maksimum), ${M(`x=${p.r2}`)} da $-\\to+$ (minimum). ${M(`f(${p.r1})=${fmax}`)}, ${M(`f(${p.r2})=${fmin}`)}.`, `В ${M(`x=${p.r1}`)} знак $+\\to-$ (максимум), в ${M(`x=${p.r2}`)} $-\\to+$ (минимум). ${M(`f(${p.r1})=${fmax}`)}, ${M(`f(${p.r2})=${fmin}`)}.`, `${M(`x=${p.r1}`)} de belgi $+\\to-$ (maksimum), ${M(`x=${p.r2}`)} de $-\\to+$ (minimum). ${M(`f(${p.r1})=${fmax}`)}, ${M(`f(${p.r2})=${fmin}`)}.`, `At ${M(`x=${p.r1}`)} the sign goes $+\\to-$ (maximum), at ${M(`x=${p.r2}`)} $-\\to+$ (minimum). ${M(`f(${p.r1})=${fmax}`)}, ${M(`f(${p.r2})=${fmin}`)}.`), fin(String(ans))), // kaa: tekshirilsin
      mis: L(
        "Maksimum va minimum nuqtalarini almashtirib yuborish (bosh koeffitsiyent musbat bo'lsa, kichik ildiz — maksimum).",
        'Путают точки максимума и минимума (при положительном старшем коэффициенте меньший корень — максимум).',
        "Maksimum hám minimum noqatların almastırıp jiberiw (bas koefficient oń bolsa, kishi túbir — maksimum).", // kaa: tekshirilsin
        'Swapping the maximum and minimum points (for a positive leading coefficient the smaller root is the maximum).',
      ),
    };
  },
);

// --- 64: yig'indi berilgan bo'lganda ko'paytmaning eng katta qiymati (L3) ---
interface OptProdP {
  t: number;
  shape: 'x2y' | 'xy2';
  ask: 'x' | 'max';
}
y1T<OptProdP>(
  'der-optim-product',
  64,
  'L3',
  200,
  (r) => ({ t: r.int(2, 9), shape: r.pick(['x2y', 'xy2'] as const), ask: r.pick(['x', 'max'] as const) }),
  (p) => {
    const S = 3 * p.t;
    const xOpt = p.shape === 'x2y' ? 2 * p.t : p.t;
    const best = 4 * p.t ** 3;
    const ans = p.ask === 'x' ? xOpt : best;
    const wrong = intWrong(ans, p.ask === 'x' ? [S - xOpt, S / 2, p.t * 3 - 1, 2 * S / 3 === xOpt ? S / 3 : 2 * S / 3] : [(S / 2) ** 3 / 1, (S / 2) ** 2 * (S / 2), 2 * p.t * p.t * S, best * 2, p.t * S].map((v) => Math.round(v)), { min: 1 });
    const prod = p.shape === 'x2y' ? 'x^{2}y' : 'xy^{2}';
    return {
      stem: L(
        `${M(`x+y=${S}`)} shartni qanoatlantiruvchi musbat ${M('x')} va ${M('y')} sonlar uchun ${M(prod)} ko'paytma eng katta bo'ladi. ${p.ask === 'x' ? `${M('x')} ning shu qiymatini` : "Ko'paytmaning eng katta qiymatini"} toping.`,
        `Для положительных ${M('x')} и ${M('y')} с условием ${M(`x+y=${S}`)} произведение ${M(prod)} принимает наибольшее значение. Найдите ${p.ask === 'x' ? `соответствующее значение ${M('x')}` : 'наибольшее значение произведения'}.`,
        `${M(`x+y=${S}`)} shártin qanaatlandırıwshı oń ${M('x')} hám ${M('y')} sanları ushın ${M(prod)} kóbeyme eń úlken boladı. ${p.ask === 'x' ? `${M('x')} tiń usı mánisin` : 'Kóbeymeniń eń úlken mánisin'} tabıń.`, // kaa: tekshirilsin
        `For positive ${M('x')} and ${M('y')} with ${M(`x+y=${S}`)}, the product ${M(prod)} is maximal. Find ${p.ask === 'x' ? `the corresponding value of ${M('x')}` : 'the maximum value of the product'}.`,
      ),
      correct: mi(ans),
      wrong,
      sol: J(
        L(
          `${M(p.shape === 'x2y' ? `y=${S}-x` : `x=${S}-y`)}; ${p.shape === 'x2y' ? M(`g(x)=x^{2}(${S}-x)`) : M(`g(y)=(${S}-y)y^{2}`)}. ${M(`g'=0`)} dan ${M(`${p.shape === 'x2y' ? 'x' : 'y'}=${2 * p.t}`)}, ${M(`${p.shape === 'x2y' ? 'y' : 'x'}=${p.t}`)}. Eng katta qiymat ${mi(best)}.`,
          `${M(p.shape === 'x2y' ? `y=${S}-x` : `x=${S}-y`)}; ${p.shape === 'x2y' ? M(`g(x)=x^{2}(${S}-x)`) : M(`g(y)=(${S}-y)y^{2}`)}. Из ${M(`g'=0`)}: ${M(`${p.shape === 'x2y' ? 'x' : 'y'}=${2 * p.t}`)}, ${M(`${p.shape === 'x2y' ? 'y' : 'x'}=${p.t}`)}. Наибольшее значение ${mi(best)}.`,
          `${M(p.shape === 'x2y' ? `y=${S}-x` : `x=${S}-y`)}; ${p.shape === 'x2y' ? M(`g(x)=x^{2}(${S}-x)`) : M(`g(y)=(${S}-y)y^{2}`)}. ${M(`g'=0`)} den ${M(`${p.shape === 'x2y' ? 'x' : 'y'}=${2 * p.t}`)}, ${M(`${p.shape === 'x2y' ? 'y' : 'x'}=${p.t}`)}. Eń úlken mánis ${mi(best)}.`, // kaa: tekshirilsin
          `${M(p.shape === 'x2y' ? `y=${S}-x` : `x=${S}-y`)}; ${p.shape === 'x2y' ? M(`g(x)=x^{2}(${S}-x)`) : M(`g(y)=(${S}-y)y^{2}`)}. From ${M(`g'=0`)}: ${M(`${p.shape === 'x2y' ? 'x' : 'y'}=${2 * p.t}`)}, ${M(`${p.shape === 'x2y' ? 'y' : 'x'}=${p.t}`)}. The maximum is ${mi(best)}.`,
        ),
        fin(String(ans)),
      ),
      mis: L(
        "Ko'paytma eng katta bo'lishi uchun sonlarni teng ($x=y$) deb olish: darajali ko'paytmada bu to'g'ri emas.",
        'Берут $x=y$ для наибольшего произведения: при степенном множителе это неверно.',
        "Kóbeyme eń úlken bolıwı ushın sanlardı teń ($x=y$) dep alıw: dárejeli kóbeymede bul durıs emes.", // kaa: tekshirilsin
        'Taking $x=y$ for the maximal product: this is wrong when one factor is squared.',
      ),
    };
  },
);

// --- 110: harakat qonuni: tezlik va tezlanish (L1) ---
interface VelP {
  c: [number, number, number, number];
  t0: number;
  ask: 'v' | 'a';
}
y1T<VelP>(
  'der-velocity',
  110,
  'L1',
  120,
  (r) => ({ c: [r.int(-9, 9), r.int(-9, 9), r.int(-6, 6), r.int(1, 3)], t0: r.int(1, 6), ask: r.pick(['v', 'a'] as const) }),
  (p) => {
    const [d, c1, b, a] = p.c;
    need(b !== 0 && c1 !== 0 && d !== 0);
    const v = 3 * a * p.t0 * p.t0 + 2 * b * p.t0 + c1;
    const acc = 6 * a * p.t0 + 2 * b;
    const ans = p.ask === 'v' ? v : acc;
    need(Math.abs(ans) <= 300 && ans !== 0 && Math.abs(v) <= 300 && v !== acc);
    const s0 = a * p.t0 ** 3 + b * p.t0 * p.t0 + c1 * p.t0 + d;
    const wrong = intWrong(ans, p.ask === 'v' ? [s0, acc, 3 * a * p.t0 * p.t0 + 2 * b * p.t0] : [v, 6 * a * p.t0, 3 * a * p.t0 + 2 * b]);
    const st = `s(t)=${polyTex(p.c, 't')}`;
    const askL = p.ask === 'v' ? L('tezligini', 'скорость', 'tezligin', 'the velocity') : L('tezlanishini', 'ускорение', 'tezleniwin', 'the acceleration');
    return {
      stem: L(
        `Moddiy nuqta ${M(st)} qonun bo'yicha harakatlanadi (${M('s')} — metr, ${M('t')} — sekund). ${M(`t=${p.t0}`)} s dagi ${askL.uz} (m/s${p.ask === 'a' ? '$^{2}$' : ''}) toping.`,
        `Материальная точка движется по закону ${M(st)} (${M('s')} — в метрах, ${M('t')} — в секундах). Найдите ${askL.ru} (м/с${p.ask === 'a' ? '$^{2}$' : ''}) в момент ${M(`t=${p.t0}`)} с.`,
        `Materiallıq noqat ${M(st)} nızamı boyınsha háreketlenedi (${M('s')} — metr, ${M('t')} — sekund). ${M(`t=${p.t0}`)} s tegi ${askL.kaa} (m/s${p.ask === 'a' ? '$^{2}$' : ''}) tabıń.`, // kaa: tekshirilsin
        `A point moves according to ${M(st)} (${M('s')} in metres, ${M('t')} in seconds). Find ${askL.en} (m/s${p.ask === 'a' ? '$^{2}$' : ''}) at ${M(`t=${p.t0}`)} s.`,
      ),
      correct: mi(ans),
      wrong,
      sol: J(L("Tezlik — yo'lning hosilasi, tezlanish — tezlikning hosilasi:", 'Скорость — производная пути, ускорение — производная скорости:', "Tezlik — jol tuwındısı, tezleniw — tezlik tuwındısı:", 'Velocity is the derivative of position, acceleration is the derivative of velocity:'), M(`v(t)=${polyTex([c1, 2 * b, 3 * a], 't')},\\ a(t)=${polyTex([2 * b, 6 * a], 't')}`), fin(String(ans))), // kaa: tekshirilsin
      mis: L(
        "Tezlanish o'rniga tezlikni topish (yoki aksincha) yoki yo'lning qiymatini hisoblash.",
        'Находят скорость вместо ускорения (или наоборот) либо считают значение пути.',
        "Tezleniw ornına tezlikti tabıw (yamasa kerisinshe) yamasa jol mánisin esaplaw.", // kaa: tekshirilsin
        'Finding the velocity instead of the acceleration (or vice versa), or computing the position value.',
      ),
    };
  },
);

// --- 110: harakat qonuni: ochiq javobli (a: tezlik, b: tezlanish nolga teng bo'ladigan payt) (L2) ---
interface VelOP {
  a: number;
  tStar: number;
  c1: number;
  d: number;
  t0: number;
}
oT<VelOP>(
  'der-velocity-o',
  110,
  'L2',
  200,
  (r) => ({ a: r.pick([1, 2]), tStar: r.int(1, 5), c1: r.int(-9, 9), d: r.int(-5, 5), t0: r.int(1, 6) }),
  (p) => {
    need(p.c1 !== 0 && p.d !== 0);
    const b = -3 * p.a * p.tStar;
    const c = [p.d, p.c1, b, p.a];
    const v = 3 * p.a * p.t0 * p.t0 + 2 * b * p.t0 + p.c1;
    const st = `s(t)=${polyTex(c, 't')}`;
    return {
      stem: L(
        `Moddiy nuqta ${M(st)} qonun bo'yicha harakatlanadi (${M('s')} — metr, ${M('t')} — sekund).`,
        `Материальная точка движется по закону ${M(st)} (${M('s')} — в метрах, ${M('t')} — в секундах).`,
        `Materiallıq noqat ${M(st)} nızamı boyınsha háreketlenedi (${M('s')} — metr, ${M('t')} — sekund).`, // kaa: tekshirilsin
        `A point moves according to ${M(st)} (${M('s')} in metres, ${M('t')} in seconds).`,
      ),
      a: {
        prompt: L(`${M(`t=${p.t0}`)} s dagi tezlikni (m/s) toping.`, `Найдите скорость (м/с) в момент ${M(`t=${p.t0}`)} с.`, `${M(`t=${p.t0}`)} s tegi tezlikti (m/s) tabıń.`, `Find the velocity (m/s) at ${M(`t=${p.t0}`)} s.`), // kaa: tekshirilsin
        key: fInt(v),
      },
      b: {
        prompt: L('Tezlanish nolga teng bo\'ladigan paytni (s) toping.', 'Найдите момент (с), когда ускорение равно нулю.', 'Tezleniw nolge teń bolatuǵın waqıttı (s) tabıń.', 'Find the moment (s) when the acceleration is zero.'), // kaa: tekshirilsin
        key: fInt(p.tStar),
      },
      sol: J(L('Tezlik $v=s\'$, tezlanish $a=v\'$:', 'Скорость $v=s\'$, ускорение $a=v\'$:', "Tezlik $v=s'$, tezleniw $a=v'$:", 'Velocity $v=s\'$, acceleration $a=v\'$:'), M(`v(t)=${polyTex([p.c1, 2 * b, 3 * p.a], 't')},\\ a(t)=${polyTex([2 * b, 6 * p.a], 't')}`), L(`${M(`v(${p.t0})=${v}`)}; ${M(`a(t)=0`)} dan ${M(`t=${p.tStar}`)}.`, `${M(`v(${p.t0})=${v}`)}; из ${M(`a(t)=0`)}: ${M(`t=${p.tStar}`)}.`, `${M(`v(${p.t0})=${v}`)}; ${M(`a(t)=0`)} den ${M(`t=${p.tStar}`)}.`, `${M(`v(${p.t0})=${v}`)}; from ${M(`a(t)=0`)}: ${M(`t=${p.tStar}`)}.`)), // kaa: tekshirilsin
      mis: L(
        "Tezlanish nolga teng bo'ladigan payt uchun tezlikni nolga tenglash (ekstremum payti bilan adashtirish).",
        'Приравнивают к нулю скорость вместо ускорения (путают с моментом остановки).',
        "Tezleniw nolge teń bolatuǵın waqıt ushın tezlikti nolge teńlew (toqtaw waqtı menen shatastırıw).", // kaa: tekshirilsin
        'Setting the velocity to zero instead of the acceleration (confusing with the moment of stopping).',
      ),
    };
  },
);

// --- 110: normalning burchak koeffitsiyenti (L2) ---
interface NormSlopeP {
  a: number;
  b: number;
  c: number;
  x0: number;
}
y1T<NormSlopeP>(
  'der-normal-slope',
  110,
  'L2',
  150,
  (r) => ({ a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-8, 8), c: r.int(-9, 9), x0: r.int(-4, 4) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0 && p.x0 !== 0);
    const k = 2 * p.a * p.x0 + p.b;
    need(k !== 0 && Math.abs(k) !== 1 && Math.abs(k) <= 20);
    const ans = frac(-1, k);
    const wrong = fracWrong(ans, [frac(1, k), fInt(k), fInt(-k), frac(1, -k * 2), frac(-1, 2 * k)]);
    return {
      stem: L(
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funksiya grafigiga ${M(`x_0=${p.x0}`)} nuqtada o'tkazilgan normalning burchak koeffitsiyentini toping.`,
        `Найдите угловой коэффициент нормали к графику функции ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} в точке ${M(`x_0=${p.x0}`)}.`,
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funkciya grafigine ${M(`x_0=${p.x0}`)} noqatında ótkerilgen normalıń múyeshlik koefficientin tabıń.`, // kaa: tekshirilsin
        `Find the slope of the normal to the graph of ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} at ${M(`x_0=${p.x0}`)}.`,
      ),
      correct: mf(ans),
      wrong,
      sol: J(L("Normal urinmaga perpendikulyar: $k_n=-\\frac{1}{f'(x_0)}$.", 'Нормаль перпендикулярна касательной: $k_n=-\\frac{1}{f\'(x_0)}$.', "Normal urınbaǵa perpendikulyar: $k_n=-\\frac{1}{f'(x_0)}$.", 'The normal is perpendicular to the tangent: $k_n=-\\frac{1}{f\'(x_0)}$.'), M(`f'(x)=${polyTex([p.b, 2 * p.a], 'x')},\\ f'(${p.x0})=${k},\\ k_n=${texFrac(ans)}`), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "Urinmaning burchak koeffitsiyentini ($f'(x_0)$) normalniki deb olish yoki ishorani o'zgartirmay teskari son olish.",
        'Берут угловой коэффициент касательной вместо нормали либо обратное число без смены знака.',
        "Urınbanıń múyeshlik koefficientin normalǵa alıw yamasa belgisin almastırmay keri sandı alıw.", // kaa: tekshirilsin
        'Taking the tangent slope for the normal, or the reciprocal without changing the sign.',
      ),
    };
  },
);

// --- 110: normal tenglamasi: ochiq javobli (a: burchak koeffitsiyenti, b: Oy bilan kesishish ordinatasi) (L3) ---
interface NormOP {
  a: number;
  b: number;
  c: number;
  x0: number;
}
oT<NormOP>(
  'der-normal-o',
  110,
  'L3',
  240,
  (r) => ({ a: r.pick([-2, -1, 1, 2, 3]), b: r.int(-8, 8), c: r.int(-9, 9), x0: r.int(-4, 4) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0 && p.x0 !== 0);
    const k = 2 * p.a * p.x0 + p.b;
    need(k !== 0 && Math.abs(k) <= 12);
    const f0 = p.a * p.x0 * p.x0 + p.b * p.x0 + p.c;
    const kn = frac(-1, k);
    const yInt = fAdd(fInt(f0), frac(p.x0, k));
    need(Math.abs(yInt.n) <= 400 && yInt.d <= 12);
    return {
      stem: L(
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funksiya grafigiga ${M(`x_0=${p.x0}`)} nuqtada normal o'tkazilgan.`,
        `К графику функции ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} в точке ${M(`x_0=${p.x0}`)} проведена нормаль.`,
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funkciya grafigine ${M(`x_0=${p.x0}`)} noqatında normal ótkerilgen.`, // kaa: tekshirilsin
        `A normal is drawn to the graph of ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} at ${M(`x_0=${p.x0}`)}.`,
      ),
      a: { prompt: L("Normalning burchak koeffitsiyentini toping.", 'Найдите угловой коэффициент нормали.', 'Normalıń múyeshlik koefficientin tabıń.', 'Find the slope of the normal.'), key: kn, hint: HINT_FRAC }, // kaa: tekshirilsin
      b: { prompt: L("Normalning $Oy$ o'qi bilan kesishish nuqtasi ordinatasini toping.", 'Найдите ординату точки пересечения нормали с осью $Oy$.', 'Normalıń $Oy$ kósheri menen kesilisiw noqatınıń ordinatasın tabıń.', 'Find the ordinate of the point where the normal meets the $Oy$-axis.'), key: yInt, hint: HINT_FRAC }, // kaa: tekshirilsin
      sol: J(
        M(`f'(${p.x0})=${k},\\ f(${p.x0})=${f0}`),
        L(`Normal: ${M(`y-${f0}=${texFrac(kn)}(x-${p.x0})`)}. ${M('x=0')} da ${M(`y=${f0}+\\frac{${p.x0}}{${k}}=${texFrac(yInt)}`)}.`, `Нормаль: ${M(`y-${f0}=${texFrac(kn)}(x-${p.x0})`)}. При ${M('x=0')}: ${M(`y=${f0}+\\frac{${p.x0}}{${k}}=${texFrac(yInt)}`)}.`, `Normal: ${M(`y-${f0}=${texFrac(kn)}(x-${p.x0})`)}. ${M('x=0')} de ${M(`y=${f0}+\\frac{${p.x0}}{${k}}=${texFrac(yInt)}`)}.`, `Normal: ${M(`y-${f0}=${texFrac(kn)}(x-${p.x0})`)}. At ${M('x=0')}: ${M(`y=${f0}+\\frac{${p.x0}}{${k}}=${texFrac(yInt)}`)}.`), // kaa: tekshirilsin
      ),
      mis: L(
        "Normal tenglamasida urinma burchak koeffitsiyentini ishlatish yoki $x=0$ ni qo'yishda ishorani adashtirish.",
        'Используют в уравнении нормали угловой коэффициент касательной либо путают знак при подстановке $x=0$.',
        "Normal teńlemesinde urınba múyeshlik koefficientin qollanıw yamasa $x=0$ di qoyıwda belgini shatastırıw.", // kaa: tekshirilsin
        'Using the tangent slope in the normal equation, or mixing up the sign when substituting $x=0$.',
      ),
    };
  },
);

// --- 65: boshlang'ich funksiya shakli (L1) ---
const fracTerm = (f: Frac, pw: number, first: boolean): string => {
  if (f.n === 0) return '';
  const mag = f.n < 0 ? frac(-f.n, f.d) : f;
  const body = mag.d === 1 ? (mag.n === 1 && pw > 0 ? '' : String(mag.n)) : `\\frac{${mag.n}}{${mag.d}}`;
  const v = pw === 0 ? '' : pw === 1 ? 'x' : `x^{${pw}}`;
  const sgn = f.n < 0 ? '-' : first ? '' : '+';
  return `${sgn}${body}${v}`;
};
/** Ko'phad koeffitsiyentlari (c[k] — x^k) kasr bo'lishi mumkin */
const fracPoly = (c: readonly Frac[]): string => {
  let s = '';
  for (let k = c.length - 1; k >= 0; k--) s += fracTerm(c[k]!, k, s === '');
  return s || '0';
};
interface AntiFormP {
  c: [number, number, number, number];
}
y1T<AntiFormP>(
  'int-antider-form',
  65,
  'L1',
  130,
  (r) => ({ c: [r.int(-7, 7), r.int(-8, 8), r.int(-6, 6), r.int(1, 8)] }),
  (p) => {
    const [d, c1, b, a] = p.c;
    need(d !== 0 && c1 !== 0 && b !== 0);
    const good = [fInt(0), fInt(d), frac(c1, 2), frac(b, 3), frac(a, 4)];
    const noDiv = [fInt(0), fInt(d), fInt(c1), fInt(b), fInt(a)];
    const byK = [fInt(0), fInt(d), fInt(c1), frac(b, 2), frac(a, 3)];
    const diff = [fInt(c1), fInt(2 * b), fInt(3 * a), fInt(0), fInt(0)];
    const flip = [fInt(0), fInt(d), frac(-c1, 2), frac(b, 3), frac(a, 4)];
    const fmt = (cs: Frac[]) => M(`F(x)=${fracPoly(cs)}+C`);
    const correct = fmt(good);
    const wrongAll = [noDiv, byK, diff, flip].map(fmt).filter((t) => t !== correct);
    need(new Set(wrongAll).size >= 3);
    return {
      stem: L(
        `${M(`f(x)=${polyTex(p.c)}`)} funksiyaning boshlang'ich funksiyalari umumiy ko'rinishini toping.`,
        `Найдите общий вид первообразных функции ${M(`f(x)=${polyTex(p.c)}`)}.`,
        `${M(`f(x)=${polyTex(p.c)}`)} funkciyanıń dáslepki funkciyaları uliwma kórinisin tabıń.`, // kaa: tekshirilsin
        `Find the general form of the antiderivatives of ${M(`f(x)=${polyTex(p.c)}`)}.`,
      ),
      correct,
      wrong: [...new Set(wrongAll)],
      sol: J(L("Har bir hadda daraja bittaga ortadi va yangi daraja ko'rsatkichiga bo'linadi:", 'Показатель каждой степени увеличивается на единицу, и делим на новый показатель:', "Hár bir hádde dáreje birge artadı hám jańa dáreje kórsetkishine bólinedi:", 'Each exponent increases by one and we divide by the new exponent:'), M(`F(x)=${fracPoly(good)}+C`), fin(`F(x)=${fracPoly(good)}+C`)), // kaa: tekshirilsin
      mis: L(
        "Yangi daraja ko'rsatkichiga bo'lishni unutish, hosila olib qo'yish yoki $+C$ ni tushirib qoldirish.",
        'Забывают делить на новый показатель, берут производную вместо первообразной либо опускают $+C$.',
        "Jańa dáreje kórsetkishine bóliwdi umıtıw, tuwındı alıp qoyıw yamasa $+C$ di taslap ketiw.", // kaa: tekshirilsin
        'Forgetting to divide by the new exponent, differentiating instead, or omitting $+C$.',
      ),
    };
  },
);

// --- 65: boshlang'ich funksiya qiymati: F(x0)=v berilgan, F(x1) (L2) ---
interface AntiValP {
  a: number;
  b: number;
  c: number;
  x0: number;
  v: number;
  x1: number;
}
y1T<AntiValP>(
  'int-antider-value',
  65,
  'L2',
  200,
  (r) => ({ a: r.pick([-3, -1, 1, 2, 3, 6]), b: r.int(-6, 6), c: r.int(-8, 8), x0: r.int(-2, 2), v: r.int(-9, 9), x1: r.int(-3, 4) }),
  (p) => {
    need(p.b !== 0 && p.c !== 0 && p.x1 !== p.x0 && p.x1 !== 0 && p.x0 !== 0);
    const G = (x: number): Frac => fAdd(fAdd(frac(p.a * x ** 3, 3), frac(p.b * x * x, 2)), fInt(p.c * x));
    const ans = fAdd(fInt(p.v), fSub(G(p.x1), G(p.x0)));
    need(fracChk(ans) && ans.d <= 12);
    const wrongs = [G(p.x1), fSub(G(p.x1), G(p.x0)), fAdd(fInt(p.v), G(p.x1)), fAdd(fInt(p.v), fNeg(fSub(G(p.x1), G(p.x0)))), fInt(p.a * p.x1 * p.x1 + p.b * p.x1 + p.c)];
    return {
      stem: L(
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funksiyaning boshlang'ich funksiyalaridan biri ${M('F')} uchun ${M(`F(${p.x0})=${p.v}`)}. ${M(`F(${p.x1})`)} ni toping.`,
        `Для одной из первообразных ${M('F')} функции ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} выполнено ${M(`F(${p.x0})=${p.v}`)}. Найдите ${M(`F(${p.x1})`)}.`,
        `${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} funkciyanıń dáslepki funkciyalarınan biri ${M('F')} ushın ${M(`F(${p.x0})=${p.v}`)}. ${M(`F(${p.x1})`)} di tabıń.`, // kaa: tekshirilsin
        `For an antiderivative ${M('F')} of ${M(`f(x)=${polyTex([p.c, p.b, p.a])}`)} we have ${M(`F(${p.x0})=${p.v}`)}. Find ${M(`F(${p.x1})`)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: J(L(`${M(`F(x)=${fracPoly([fInt(0), fInt(p.c), frac(p.b, 2), frac(p.a, 3)])}+C`)}; ${M('C')} ni ${M(`F(${p.x0})=${p.v}`)} dan topamiz, so'ng ${M(`F(${p.x1})=${texFrac(ans)}`)}.`, `${M(`F(x)=${fracPoly([fInt(0), fInt(p.c), frac(p.b, 2), frac(p.a, 3)])}+C`)}; ${M('C')} находим из ${M(`F(${p.x0})=${p.v}`)}, затем ${M(`F(${p.x1})=${texFrac(ans)}`)}.`, `${M(`F(x)=${fracPoly([fInt(0), fInt(p.c), frac(p.b, 2), frac(p.a, 3)])}+C`)}; ${M('C')} ni ${M(`F(${p.x0})=${p.v}`)} den tabamız, sońınan ${M(`F(${p.x1})=${texFrac(ans)}`)}.`, `${M(`F(x)=${fracPoly([fInt(0), fInt(p.c), frac(p.b, 2), frac(p.a, 3)])}+C`)}; find ${M('C')} from ${M(`F(${p.x0})=${p.v}`)}, then ${M(`F(${p.x1})=${texFrac(ans)}`)}.`), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "$C$ ni topmasdan $C=0$ deb olish yoki $F(x_1)$ o'rniga $f(x_1)$ ni hisoblash.",
        'Берут $C=0$, не определяя константу, либо вычисляют $f(x_1)$ вместо $F(x_1)$.',
        "$C$ ni tabıwsız $C=0$ dep alıw yamasa $F(x_1)$ ornına $f(x_1)$ di esaplaw.", // kaa: tekshirilsin
        'Taking $C=0$ without determining the constant, or computing $f(x_1)$ instead of $F(x_1)$.',
      ),
    };
  },
);

// --- 66: ko'phadning aniq integrali (L1) ---
interface IntPolyP {
  a: number;
  b: number;
  c: number;
  lo: number;
  hi: number;
}
y1T<IntPolyP>(
  'int-def-poly',
  66,
  'L1',
  150,
  (r) => ({ a: r.pick([-3, -2, -1, 1, 2, 3]), b: r.int(-6, 6), c: r.int(-8, 8), lo: r.int(-3, 1), hi: r.int(1, 4) }),
  (p) => {
    need(p.hi > p.lo && p.b !== 0 && p.c !== 0);
    const G = (x: number): Frac => fAdd(fAdd(frac(p.a * x ** 3, 3), frac(p.b * x * x, 2)), fInt(p.c * x));
    const ans = fSub(G(p.hi), G(p.lo));
    need(ans.n !== 0 && fracChk(ans) && ans.d <= 12);
    const wrongs = [fSub(G(p.lo), G(p.hi)), fAdd(G(p.hi), G(p.lo)), fInt(p.a * p.hi * p.hi + p.b * p.hi + p.c), fSub(fInt(p.a * p.hi ** 3 + p.b * p.hi * p.hi + p.c * p.hi), fInt(p.a * p.lo ** 3 + p.b * p.lo * p.lo + p.c * p.lo))];
    const ig = `\\int_{${p.lo}}^{${p.hi}}\\left(${polyTex([p.c, p.b, p.a])}\\right)dx`;
    return {
      stem: calcL(M(ig)),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: J(L('Nyuton-Leybnits: $\\int_a^b f=F(b)-F(a)$.', 'Формула Ньютона-Лейбница: $\\int_a^b f=F(b)-F(a)$.', 'Nyuton-Leybnic: $\\int_a^b f=F(b)-F(a)$.', 'Newton-Leibniz: $\\int_a^b f=F(b)-F(a)$.'), M(`F(x)=${fracPoly([fInt(0), fInt(p.c), frac(p.b, 2), frac(p.a, 3)])}`), M(`F(${p.hi})-F(${p.lo})=${texFrac(ans)}`), fin(texFrac(ans))), // kaa: tekshirilsin
      mis: L(
        "Yuqori va quyi chegaralar o'rnini almashtirish ($F(a)-F(b)$) yoki integral o'rniga integral ostidagi funksiya qiymatini hisoblash.",
        'Меняют местами пределы ($F(a)-F(b)$) либо считают значение подынтегральной функции вместо интеграла.',
        "Joqarǵı hám tómengi shegaralardı almastırıw ($F(a)-F(b)$) yamasa integral ornına integral astındaǵı funkciya mánisin esaplaw.", // kaa: tekshirilsin
        'Swapping the limits ($F(a)-F(b)$), or evaluating the integrand instead of the integral.',
      ),
    };
  },
);

// --- 66: (ax+b)^n aniq integrali (L2) ---
interface IntPowP {
  a: number;
  b: number;
  n: number;
  lo: number;
  hi: number;
}
y1T<IntPowP>(
  'int-def-pow',
  66,
  'L2',
  190,
  (r) => ({ a: r.pick([-2, -1, 1, 2, 3]), b: r.int(-4, 4), n: r.pick([2, 3, 4]), lo: r.int(-3, 1), hi: r.int(0, 3) }),
  (p) => {
    need(p.hi > p.lo && p.b !== 0);
    const u = (x: number) => p.a * x + p.b;
    const ans = frac(u(p.hi) ** (p.n + 1) - u(p.lo) ** (p.n + 1), p.a * (p.n + 1));
    need(ans.n !== 0 && fracChk(ans) && ans.d <= 12);
    const wrongs = [frac(u(p.hi) ** (p.n + 1) - u(p.lo) ** (p.n + 1), p.n + 1), frac(u(p.hi) ** (p.n + 1) - u(p.lo) ** (p.n + 1), p.a * p.n), fInt(u(p.hi) ** p.n - u(p.lo) ** p.n), fNeg(ans), frac(u(p.hi) ** p.n - u(p.lo) ** p.n, p.a * p.n)];
    const ig = `\\int_{${p.lo}}^{${p.hi}}(${polyTex([p.b, p.a])})^{${p.n}}dx`;
    return {
      stem: calcL(M(ig)),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs),
      sol: J(L(`${M(`\\int (ax+b)^{n}dx=\\frac{(ax+b)^{n+1}}{a(n+1)}`)}:`, `${M(`\\int (ax+b)^{n}dx=\\frac{(ax+b)^{n+1}}{a(n+1)}`)}:`, `${M(`\\int (ax+b)^{n}dx=\\frac{(ax+b)^{n+1}}{a(n+1)}`)}:`, `${M(`\\int (ax+b)^{n}dx=\\frac{(ax+b)^{n+1}}{a(n+1)}`)}:`), M(`\\frac{(${polyTex([p.b, p.a])})^{${p.n + 1}}}{${p.a * (p.n + 1)}}\\Big|_{${p.lo}}^{${p.hi}}=${texFrac(ans)}`), fin(texFrac(ans))),
      mis: L(
        "Ichki funksiya hosilasiga ($a$ ga) bo'lishni unutish.",
        'Забывают разделить на производную внутренней функции (на $a$).',
        "Ishki funkciya tuwındısına ($a$ ǵa) bóliwdi umıtıw.", // kaa: tekshirilsin
        'Forgetting to divide by the derivative of the inner function (by $a$).',
      ),
    };
  },
);

// --- 66: sin va cos aniq integrali (L2) ---
interface IntTrigP {
  fn: 'sin' | 'cos';
  k: number;
  i: number;
  j: number;
}
y1T<IntTrigP>(
  'int-def-trig',
  66,
  'L2',
  170,
  (r) => ({ fn: r.pick(['sin', 'cos'] as const), k: r.pick([-4, -3, -2, 2, 3, 4, 6]), i: r.int(0, 7), j: r.int(0, 7) }),
  (p) => {
    const tab = p.fn === 'sin' ? COS_RATIONAL : SIN_RATIONAL;
    need(p.i < p.j);
    const A = tab[p.i]!;
    const B = tab[p.j]!;
    const va = frac(A[2], A[3]);
    const vb = frac(B[2], B[3]);
    const core = p.fn === 'sin' ? fSub(va, vb) : fSub(vb, va);
    const ans = fMul(fInt(p.k), core);
    need(ans.n !== 0 && fracChk(ans));
    const wrongs = [fNeg(ans), fMul(fInt(p.k), p.fn === 'sin' ? fSub(vb, va) : fSub(va, vb)), fMul(fInt(p.k), fAdd(va, vb)), core];
    const lo = piAt(frac(A[0], A[1]));
    const hi = piAt(frac(B[0], B[1]));
    const ig = `\\int_{${lo}}^{${hi}}${p.k === 1 ? '' : p.k === -1 ? '-' : p.k}\\${p.fn}\\,x\\,dx`;
    return {
      stem: calcL(M(ig)),
      correct: mf(ans),
      wrong: fracWrong(ans, wrongs, mf),
      sol: J(L(`${p.fn === 'sin' ? M("\\int\\sin x\\,dx=-\\cos x") : M("\\int\\cos x\\,dx=\\sin x")}:`, `${p.fn === 'sin' ? M("\\int\\sin x\\,dx=-\\cos x") : M("\\int\\cos x\\,dx=\\sin x")}:`, `${p.fn === 'sin' ? M("\\int\\sin x\\,dx=-\\cos x") : M("\\int\\cos x\\,dx=\\sin x")}:`, `${p.fn === 'sin' ? M("\\int\\sin x\\,dx=-\\cos x") : M("\\int\\cos x\\,dx=\\sin x")}:`), M(`${p.k}\\cdot ${p.fn === 'sin' ? `(\\cos ${lo}-\\cos ${hi})` : `(\\sin ${hi}-\\sin ${lo})`}=${texFrac(ans)}`), fin(texFrac(ans))),
      mis: L(
        "$\\int\\sin x\\,dx=-\\cos x$ dagi minusni unutish yoki chegaralar ayirmasini teskari olish.",
        'Теряют минус в $\\int\\sin x\\,dx=-\\cos x$ либо берут разность пределов в обратном порядке.',
        "$\\int\\sin x\\,dx=-\\cos x$ degi minusti umıtıw yamasa shegaralar ayırmasın keri alıw.", // kaa: tekshirilsin
        'Losing the minus in $\\int\\sin x\\,dx=-\\cos x$, or taking the difference of limits in the wrong order.',
      ),
    };
  },
);

// --- 66: integralning yuqori chegarasini topish (L3) ---
interface IntBoundP {
  p: number;
  b: number;
}
y1T<IntBoundP>(
  'int-find-bound',
  66,
  'L3',
  200,
  (r) => ({ p: r.int(-8, 8), b: r.int(1, 9) }),
  (p) => {
    need(p.p !== 0);
    const V = p.b * p.b + p.p * p.b;
    need(V > 0 && V <= 130);
    const other = -(p.p + p.b);
    const wrong = intWrong(p.b, [other, V, V / p.p, Math.abs(p.p), p.b + 1].filter((v) => Number.isInteger(v)), { min: -40, max: 200 }).filter((t) => t !== mi(p.b));
    const ig = `\\int_{0}^{b}(2x${p.p < 0 ? '-' : '+'}${Math.abs(p.p)})\\,dx=${V}`;
    return {
      stem: L(
        `${M(ig)} tenglikni qanoatlantiruvchi musbat ${M('b')} ni toping.`,
        `Найдите положительное ${M('b')}, при котором ${M(ig)}.`,
        `${M(ig)} teńligin qanaatlandırıwshı oń ${M('b')} di tabıń.`, // kaa: tekshirilsin
        `Find the positive ${M('b')} for which ${M(ig)}.`,
      ),
      correct: mi(p.b),
      wrong,
      sol: J(M(`\\int_{0}^{b}(2x${sg(p.p)})\\,dx=b^{2}${sg(p.p)}b=${V}`), L(`${M(`b^{2}${sg(p.p)}b-${V}=0`)}: ildizlar ${M(`${p.b}`)} va ${M(`${other}`)}; musbati ${mi(p.b)}.`, `${M(`b^{2}${sg(p.p)}b-${V}=0`)}: корни ${M(`${p.b}`)} и ${M(`${other}`)}; положительный ${mi(p.b)}.`, `${M(`b^{2}${sg(p.p)}b-${V}=0`)}: túbirler ${M(`${p.b}`)} hám ${M(`${other}`)}; oń ${mi(p.b)}.`, `${M(`b^{2}${sg(p.p)}b-${V}=0`)}: roots ${M(`${p.b}`)} and ${M(`${other}`)}; the positive one is ${mi(p.b)}.`), fin(String(p.b))), // kaa: tekshirilsin
      mis: L(
        "Kvadrat tenglamaning ikkala ildizini yozib, musbatligi shartini tekshirmaslik.",
        'Записывают оба корня квадратного уравнения, не проверяя условие положительности.',
        "Kvadrat teńlemeniń eki túbirin jazıp, oń bolıw shártin tekspew.", // kaa: tekshirilsin
        'Writing both roots of the quadratic without checking the positivity condition.',
      ),
    };
  },
);

// @@PART@@

export const EQUATIONS_ANALYSIS_TEMPLATES: ExtraTemplate[] = ALL;
