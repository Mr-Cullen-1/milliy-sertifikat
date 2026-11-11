import { fAdd, fDiv, fMul, fSub, frac, gcd, keyForms, lcm, makeRng, texFrac, y1Options, type Frac, type L10n, type Rng } from '../helpers';
import type { Level, QuestionSpec } from '../types';
import type { ExtraTemplate } from './types';

// 1-2 bo'limlar (Sonlar; Algebraik shakl almashtirishlar) uchun qo'shimcha shablonlar. Shartnoma: content/gen/extra/types.ts
// Rasmiy mazmun elementlari: 1.1 (mavzu 1-3), 1.2 (4, 5, 6, 9, 10, 11, 104), 2.1 (12, 13, 14, 19, 20, 106), 2.2 (22-26, 52, 107),
// 2.3 (21, 50, 51), 2.4 (7, 8, 15-18, 27, 42, 56-58, 105). config/elements.ts.
// Har shablon: draw(rng) parametrlarni tanlaydi (rad etilsa qayta urinadi), build(p) javobni KOD bilan hisoblaydi.
// Parametrlar content() dan tashqarida bir marta hisoblanadi: tillar o'rtasida raqamlar, harflar va kalit bir xil.
// Mustaqil tekshiruv: tests/content/extra-numbers-algebra-math.test.ts (numbersAlgebraParams orqali parametrlarni oladi).
// Mavjud generatorlar (sonlar.ts, algebra.ts, mock-templates.ts) qamrovi: EKUB/EKUK oddiy, kasr amallari, proporsiya/nisbat/foiz oddiy,
// yaxlitlash, standart shakl, daraja xossalari, ildizlar, qisqa ko'paytirish, logarifm yig'indisi, asosiy trig. formulalar, AP/GP/masshtab oddiy.
// Bu yerda boshqa ko'rinishdagi masalalar: sanash/qidiruv, so'zli va ko'p bosqichli, taqqoslash, kompleks sonlar, burish, grafik xossalari.
// kaa (qoraqalpoq lotin): hamma kaa matnlar "// kaa: tekshirilsin"; atamalar mutaxassis tekshiruvini kutadi.
// Jadval kerak bo'lsa KaTeX array (Markdown jadvali ishlamaydi); literal "$" ishlatilmaydi.

export const NUMBERS_ALGEBRA_TEMPLATES: ExtraTemplate[] = [];
const ALL = NUMBERS_ALGEBRA_TEMPLATES;
const PARAMS = new Map<string, (seed: number) => unknown>();

/** Testlar uchun: shablonning shu seeddagi (qabul qilingan) parametrlari. */
export function numbersAlgebraParams(id: string, seed: number): unknown {
  const f = PARAMS.get(id);
  if (!f) throw new Error(`shablon yo'q: ${id}`);
  return f(seed);
}

const T = String.raw;
const L = (uz: string, ru: string, kaa: string, en: string): L10n => ({ uz, ru, kaa, en });

class Retry extends Error {}
/** Shart bajarilmasa parametrlarni qayta tanlaydi. */
function need(ok: boolean): asserts ok {
  if (!ok) throw new Retry('qayta');
}

// --- Matn yordamchilari ---

const M = (s: string): string => `$${s}$`;
const mi = (n: number): string => M(String(n));
const mf = (f: Frac): string => M(texFrac(f));
/** Qavsli manfiy: -3 -> (-3) */
const par = (n: number): string => (n < 0 ? `(${n})` : String(n));
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
const sgn = (n: number): string => (n < 0 ? `-${-n}` : `+${n}`);
/** a x^k ko'rinishidagi had: coef, daraja */
function tTerm(c: number, v: string, k: number, first: boolean): string {
  if (c === 0) return '';
  const sign = c < 0 ? '-' : first ? '' : '+';
  const a = Math.abs(c);
  const coef = a === 1 && k > 0 ? '' : String(a);
  const vv = k === 0 ? '' : k === 1 ? v : `${v}^{${k}}`;
  return `${sign}${coef}${vv}`;
}
/** coefs[k] = x^k oldidagi koeffitsiyent; yuqori darajadan pastga yoziladi */
function polyTex(coefs: readonly number[], v = 'x'): string {
  let out = '';
  for (let k = coefs.length - 1; k >= 0; k--) out += tTerm(coefs[k]!, v, k, out === '');
  return out || '0';
}
/** a + bi: kompleks son yozuvi (Frac komponentlar) */
function complexTex(re: Frac, im: Frac): string {
  const imAbs = frac(Math.abs(im.n), im.d);
  const imBody = im.n === 0 ? '' : imAbs.n === 1 && imAbs.d === 1 ? 'i' : `${texFrac(imAbs)}i`;
  if (im.n === 0) return texFrac(re);
  if (re.n === 0) return `${im.n < 0 ? '-' : ''}${imBody}`;
  return `${texFrac(re)}${im.n < 0 ? '-' : '+'}${imBody}`;
}

const range = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);
const isPrime = (n: number): boolean => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};
const modPow = (b: number, e: number, m: number): number => {
  let r = 1 % m;
  let x = b % m;
  let k = e;
  while (k > 0) {
    if (k & 1) r = (r * x) % m;
    x = (x * x) % m;
    k = Math.floor(k / 2);
  }
  return r;
};
const fracVal = (f: Frac): number => f.n / f.d;
const fPow = (f: Frac, n: number): Frac => (n >= 0 ? frac(f.n ** n, f.d ** n) : frac(f.d ** -n, f.n ** -n));
const eqF = (a: Frac, b: Frac): boolean => a.n === b.n && a.d === b.d;

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

/** Kasr javob uchun: tipik xatolar, keyin qo'shni kasrlar. */
function fracWrong(correct: Frac, mistakes: readonly (Frac | null)[], o: { fmt?: (f: Frac) => string } = {}): string[] {
  const fmt = o.fmt ?? mf;
  const out: string[] = [];
  const seen = new Set<string>([`${correct.n}/${correct.d}`]);
  const push = (f: Frac | null) => {
    if (!f || !Number.isFinite(f.n) || !Number.isFinite(f.d) || f.d <= 0) return;
    const key = `${f.n}/${f.d}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(fmt(f));
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 30; k++) {
    push(frac(correct.n + k, correct.d));
    push(frac(correct.n - k, correct.d));
    push(frac(correct.n, correct.d + k));
    if (correct.d - k > 0) push(frac(correct.n, correct.d - k));
  }
  return out;
}
const safeFrac = (n: number, d: number): Frac | null => (d === 0 || !Number.isFinite(n) || !Number.isFinite(d) ? null : frac(n, d));

/** Ixtiyoriy matn variantlari (nuqtalar, ifodalar): takrorlar tashlanadi (y1Options o'zi ham tekshiradi). */
const uniq = (xs: readonly string[]): string[] => [...new Set(xs)];

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
// 1.1 Natural sonlar (mavzular 1, 2, 3)
// =====================================================================================================

const KWORD: Record<number, L10n> = {
  3: L('uch xonali', 'трёхзначное', 'úsh xonalı', 'three-digit'), // kaa: tekshirilsin
  4: L("to'rt xonali", 'четырёхзначное', 'tórt xonalı', 'four-digit'), // kaa: tekshirilsin
  5: L('besh xonali', 'пятизначное', 'bes xonalı', 'five-digit'), // kaa: tekshirilsin
};

// --- 1: raqamlari yig'indisi berilgan eng katta/eng kichik son (L1) ---
interface DigExtP {
  k: number;
  S: number;
  mode: 'min' | 'max';
  par: 'any' | 'even' | 'odd';
}
/** Raqamlari yig'indisi S bo'lgan k xonali son (juftlik sharti bilan): DFS, birinchi topilgani min yoki max. */
function digitExtreme(k: number, S: number, mode: 'min' | 'max', parity: 'any' | 'even' | 'odd'): number | null {
  const digs = mode === 'min' ? range(0, 9) : range(0, 9).reverse();
  const rec = (pos: number, left: number, acc: number): number | null => {
    if (pos === k) return left === 0 ? acc : null;
    const remain = k - pos - 1;
    for (const d of digs) {
      if (pos === 0 && d === 0) continue;
      if (pos === k - 1 && ((parity === 'even' && d % 2 !== 0) || (parity === 'odd' && d % 2 === 0))) continue;
      if (d > left || left - d > 9 * remain) continue;
      const r = rec(pos + 1, left - d, acc * 10 + d);
      if (r !== null) return r;
    }
    return null;
  };
  return rec(0, S, 0);
}
const PARITY: Record<DigExtP['par'], L10n> = {
  any: L('', '', '', ''),
  even: L('juft', 'чётное', 'jup', 'even'), // kaa: tekshirilsin
  odd: L('toq', 'нечётное', 'taq', 'odd'), // kaa: tekshirilsin
};
const joinWords = (...w: string[]): string => w.filter(Boolean).join(' ');
y1T<DigExtP>(
  'na-digit-ext',
  1,
  'L1',
  80,
  (r) => {
    const k = r.int(3, 5);
    return { k, S: r.int(4, 9 * k - 3), mode: r.pick(['min', 'max'] as const), par: r.pick(['any', 'any', 'even', 'odd'] as const) };
  },
  (p) => {
    const ans = digitExtreme(p.k, p.S, p.mode, p.par);
    need(ans !== null);
    const other = digitExtreme(p.k, p.S, p.mode === 'min' ? 'max' : 'min', p.par);
    const noPar = digitExtreme(p.k, p.S, p.mode, 'any');
    const ds = String(ans).split('').map(Number);
    const swapped = Number([...ds.slice(0, -2), ds[ds.length - 1]!, ds[ds.length - 2]!].join(''));
    const check = `${ds.join('+')}=${p.S}`;
    const mw = p.mode === 'max' ? L('katta', 'наибольшее', 'úlken', 'largest') : L('kichik', 'наименьшее', 'kishi', 'smallest'); // kaa: tekshirilsin
    const why = p.mode === 'max' ? L('chapdagi raqamlarni imkon qadar katta (9)', 'старшие разряды берём как можно больше (9)', 'shep tárepindegi sanlardı mümkin qádar úlken (9)', 'take the leading digits as large as possible (9)') : L('chapdagi raqamlarni imkon qadar kichik (birinchisi 1 dan kam emas)', 'старшие разряды берём как можно меньше (первая цифра не меньше 1)', 'shep tárepindegi sanlardı mümkin qádar kishi (birinshisi 1 den kem emes)', 'take the leading digits as small as possible (the first is at least 1)'); // kaa: tekshirilsin
    return {
      stem: L(
        `Raqamlari yig'indisi ${mi(p.S)} ga teng bo'lgan eng ${joinWords(mw.uz, PARITY[p.par].uz, KWORD[p.k]!.uz)} natural sonni toping.`,
        `Найдите ${joinWords(mw.ru, PARITY[p.par].ru, KWORD[p.k]!.ru)} натуральное число с суммой цифр ${mi(p.S)}.`,
        `Sanlarınıń qosındısı ${mi(p.S)} ge teń bolǵan eń ${joinWords(mw.kaa, PARITY[p.par].kaa, KWORD[p.k]!.kaa)} natural sandı tabıń.`, // kaa: tekshirilsin
        `Find the ${joinWords(mw.en, PARITY[p.par].en, KWORD[p.k]!.en)} natural number whose digits sum to ${mi(p.S)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [other ?? 0, noPar ?? 0, swapped], { min: 1 }),
      sol: L(
        `Raqamlar yig'indisi ${p.S} bo'lishi kerak: ${why.uz}${p.par === 'any' ? '' : ', oxirgi raqam juftlik shartiga mos'} tanlanadi. Natija ${mi(ans)}; tekshiruv: ${M(check)}.`,
        `Сумма цифр должна быть ${p.S}: ${why.ru}${p.par === 'any' ? '' : ', последняя цифра выбирается по условию чётности'}. Получаем ${mi(ans)}; проверка: ${M(check)}.`,
        `Sanlar qosındısı ${p.S} bolıwı kerek: ${why.kaa}${p.par === 'any' ? '' : ', sońǵı san jup-taqlıq shártine say saylanadı'}. Nátiyje ${mi(ans)}; tekseriw: ${M(check)}.`, // kaa: tekshirilsin
        `The digit sum must be ${p.S}: ${why.en}${p.par === 'any' ? '' : ', the last digit is chosen by the parity condition'}. We get ${mi(ans)}; check: ${M(check)}.`,
      ),
      mis: L(
        "Birinchi raqam $0$ bo'la olmaydi; juftlik/toqlik sharti oxirgi raqamga tegishli. Eng katta va eng kichikni adashtirish ham tez-tez uchraydi.",
        'Первая цифра не может быть $0$; чётность определяется последней цифрой. Часто путают наибольшее и наименьшее.',
        'Birinshi san $0$ bola almaydı; jup-taqlıq sharti sońǵı sanǵa tiyisli. Eń úlken hám eń kishini shatastırıw da kóp ushırasadı.', // kaa: tekshirilsin
        'The first digit cannot be $0$; parity concerns the last digit. Mixing up largest and smallest is also common.',
      ),
    };
  },
);

// --- 1: [lo, hi] da m ga bo'linadigan, n ga bo'linmaydigan sonlar (L2) ---
interface CountDivP {
  lo: number;
  hi: number;
  m: number;
  n: number;
}
y1T<CountDivP>(
  'na-count-div',
  1,
  'L2',
  110,
  (r) => {
    const lo = r.int(1, 60);
    return { lo, hi: lo + r.int(150, 700), m: r.int(3, 11), n: r.int(2, 12) };
  },
  (p) => {
    need(p.m !== p.n && p.m % p.n !== 0);
    const cnt = (d: number) => Math.floor(p.hi / d) - Math.floor((p.lo - 1) / d);
    const L2 = lcm(p.m, p.n);
    const ans = cnt(p.m) - cnt(L2);
    const wrong = [cnt(p.m), cnt(p.m) - cnt(p.n), cnt(p.m) - cnt(p.m * p.n), cnt(p.m) + cnt(p.n) - cnt(L2), Math.floor(p.hi / p.m) - Math.floor(p.hi / L2)];
    return {
      stem: L(
        `${mi(p.lo)} dan ${mi(p.hi)} gacha (chegaralari bilan) bo'lgan natural sonlar orasida nechtasi ${mi(p.m)} ga bo'linadi, lekin ${mi(p.n)} ga bo'linmaydi?`,
        `Сколько натуральных чисел от ${mi(p.lo)} до ${mi(p.hi)} (включительно) делятся на ${mi(p.m)}, но не делятся на ${mi(p.n)}?`,
        `${mi(p.lo)} den ${mi(p.hi)} ge shekemgi (shegaraları menen) natural sanlar arasında neshewi ${mi(p.m)} ge bólinedi, biraq ${mi(p.n)} ge bólinbeydi?`, // kaa: tekshirilsin
        `How many natural numbers from ${mi(p.lo)} to ${mi(p.hi)} (inclusive) are divisible by ${mi(p.m)} but not by ${mi(p.n)}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 0 }),
      sol: L(
        `${mi(p.m)} ga bo'linadiganlar: ${M(`\\lfloor ${p.hi}/${p.m}\\rfloor-\\lfloor ${p.lo - 1}/${p.m}\\rfloor=${cnt(p.m)}`)}. Ham ${p.m} ga, ham ${p.n} ga bo'linadiganlar ${p.m} va ${p.n} ning EKUK i ${L2} ga bo'linadi: ${cnt(L2)} ta. Javob: ${M(`${cnt(p.m)}-${cnt(L2)}=${ans}`)}.`,
        `Делятся на ${mi(p.m)}: ${M(`\\lfloor ${p.hi}/${p.m}\\rfloor-\\lfloor ${p.lo - 1}/${p.m}\\rfloor=${cnt(p.m)}`)}. Делятся и на ${p.m}, и на ${p.n} те, что делятся на НОК ${L2}: ${cnt(L2)} шт. Ответ: ${M(`${cnt(p.m)}-${cnt(L2)}=${ans}`)}.`,
        `${mi(p.m)} ge bólinetuǵınlar: ${M(`\\lfloor ${p.hi}/${p.m}\\rfloor-\\lfloor ${p.lo - 1}/${p.m}\\rfloor=${cnt(p.m)}`)}. ${p.m} ge de, ${p.n} ge de bólinetuǵınlar EKUK ${L2} ge bólinedi: ${cnt(L2)} dana. Juwap: ${M(`${cnt(p.m)}-${cnt(L2)}=${ans}`)}.`, // kaa: tekshirilsin
        `Divisible by ${p.m}: ${M(`\\lfloor ${p.hi}/${p.m}\\rfloor-\\lfloor ${p.lo - 1}/${p.m}\\rfloor=${cnt(p.m)}`)}. Divisible by both ${p.m} and ${p.n} means divisible by the LCM ${L2}: ${cnt(L2)} numbers. Answer: ${M(`${cnt(p.m)}-${cnt(L2)}=${ans}`)}.`,
      ),
      mis: L(
        "Ikkala songa bo'linadiganlarni $m\\cdot n$ ga bo'linish deb olish (to'g'risi EKUK). Quyi chegarani hisobga olmaslik.",
        'Считать общие кратные как кратные $m\\cdot n$ (верно — НОК); не учесть нижнюю границу.',
        "Eki sanǵa da bólinetuǵınlardı $m\\cdot n$ ge bólinedi dep alıw (durısı EKUK); tómengi shegarasın esapqa almaw.", // kaa: tekshirilsin
        'Treating common multiples as multiples of $m\\cdot n$ (it is the LCM), or ignoring the lower bound.',
      ),
    };
  },
);

// --- 1: nol raqami 1..N da (L3) ---
y1T<{ N: number }>(
  'na-digit-zero',
  1,
  'L3',
  140,
  (r) => ({ N: r.int(110, 2600) }),
  ({ N }) => {
    // har xona bo'yicha: h = yuqori qism, c = joriy raqam, l = pastki qism; h >= 1 bo'lgan xonalarda
    let ans = 0;
    for (let e = 1; e <= N; e *= 10) {
      const h = Math.floor(N / (e * 10));
      const c = Math.floor(N / e) % 10;
      const lo = N % e;
      if (h >= 1) ans += (h - 1) * e + (c > 0 ? e : lo + 1);
    }
    const trailing = Math.floor(N / 10);
    return {
      stem: L(
        `${mi(1)} dan ${mi(N)} gacha barcha natural sonlar ketma-ket yozilganda ${mi(0)} raqami necha marta ishlatiladi?`,
        `Сколько раз встретится цифра ${mi(0)}, если подряд записать все натуральные числа от ${mi(1)} до ${mi(N)}?`,
        `${mi(1)} den ${mi(N)} ge shekem barlıq natural sanlar izbe-iz jazılǵanda ${mi(0)} sanı neshe ret qollanıladı?`, // kaa: tekshirilsin
        `How many times does the digit ${mi(0)} appear when all natural numbers from ${mi(1)} to ${mi(N)} are written one after another?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [trailing, ans + 1, ans - 1, ans + Math.floor(N / 100)], { min: 1 }),
      sol: L(
        `Nollarni xonalar bo'yicha sanaymiz: har bir xona uchun yuqori qism, joriy raqam va pastki qismga qarab hisoblanadi. Jami ${M(String(ans))} ta nol.`,
        `Считаем нули по разрядам: для каждого разряда учитываем старшую часть, текущую цифру и младшую часть. Всего ${M(String(ans))} нулей.`,
        `Nollerdi razryadlar boyınsha sanaymız: hár bir razryad ushın joqarǵı bólim, házirgi san hám tómengi bólimge qaray esaplanadı. Jámi ${M(String(ans))} nol.`, // kaa: tekshirilsin
        `Count zeros position by position, using the higher part, the current digit and the lower part. Total ${M(String(ans))} zeros.`,
      ),
      mis: L(
        "Faqat $10$ ga tugaydigan sonlarni sanash ($100$, $1000$ larda bir nechta nol bor) yoki boshidagi nolni hisoblash.",
        'Считать только числа, оканчивающиеся на $0$ ($100$, $1000$ содержат несколько нулей); учитывать ведущий ноль.',
        "Tek $10$ ǵa tamamlanatuǵın sanlardı sanaw ($100$, $1000$ larda bir neshe nol bar) yamasa baslawshı nolge itibar beriw.", // kaa: tekshirilsin
        'Counting only numbers ending in $0$ ($100$, $1000$ have several zeros) or counting a leading zero.',
      ),
    };
  },
);

// --- 1: 1..N yozuvida raqamlar soni va R raqami (O, L2) ---
oT<{ N: number; R: number }>(
  'na-o-digits',
  1,
  'L2',
  150,
  (r) => ({ N: r.int(60, 999), R: r.int(1, 9) }),
  ({ N, R }) => {
    const total = N <= 9 ? N : N <= 99 ? 9 + 2 * (N - 9) : 189 + 3 * (N - 99);
    let cnt = 0;
    for (let e = 1; e <= N; e *= 10) {
      const h = Math.floor(N / (e * 10));
      const c = Math.floor(N / e) % 10;
      const lo = N % e;
      cnt += h * e + (c > R ? e : c === R ? lo + 1 : 0);
    }
    return {
      stem: L(
        `${mi(1)} dan ${mi(N)} gacha (${N} ham kiradi) barcha natural sonlar ketma-ket yozildi.`,
        `Все натуральные числа от ${mi(1)} до ${mi(N)} (включительно) записаны подряд.`,
        `${mi(1)} den ${mi(N)} ge shekem (${N} de kiredi) barlıq natural sanlar izbe-iz jazıldı.`, // kaa: tekshirilsin
        `All natural numbers from ${mi(1)} to ${mi(N)} (inclusive) are written one after another.`,
      ),
      a: { prompt: L('Jami nechta raqam yozildi?', 'Сколько всего цифр записано?', 'Jámi neshe san jazıldı?', 'How many digits were written in total?'), key: frac(total) }, // kaa: tekshirilsin
      b: {
        prompt: L(`Shundan ${R} raqami necha marta yozildi?`, `Сколько раз среди них встретилась цифра ${R}?`, `Sonnan ${R} sanı neshe ret jazıldı?`, `How many times does the digit ${R} appear?`), // kaa: tekshirilsin
        key: frac(cnt),
      },
      sol: L(
        `a) Bir xonali: $9$ ta, ikki xonali: $2\\cdot 90$, uch xonali sonlar $${N > 99 ? N - 99 : 0}$ ta: jami ${M(String(total))}. b) ${R} raqamini har xonada alohida sanaymiz: ${M(String(cnt))}.`,
        `а) Однозначных: $9$, двузначных: $2\\cdot 90$, трёхзначных: $${N > 99 ? N - 99 : 0}$: всего ${M(String(total))}. б) Цифру ${R} считаем по разрядам отдельно: ${M(String(cnt))}.`,
        `a) Bir xonalı: $9$ dana, eki xonalı: $2\\cdot 90$, úsh xonalı sanlar $${N > 99 ? N - 99 : 0}$ dana: jámi ${M(String(total))}. b) ${R} sanın hár bir razryadta bólek sanaymız: ${M(String(cnt))}.`, // kaa: tekshirilsin
        `a) One-digit: $9$, two-digit: $2\\cdot 90$, three-digit: $${N > 99 ? N - 99 : 0}$ numbers: total ${M(String(total))}. b) Count the digit ${R} separately in each position: ${M(String(cnt))}.`,
      ),
      mis: L(
        "Raqamlar sonini sonlar soni bilan adashtirish; $R$ raqamini faqat birlar xonasida sanash.",
        'Путать количество цифр с количеством чисел; считать цифру только в разряде единиц.',
        'Sanlar sanın sanlar sanı menen shatastırıw; sandı tek birlikler razryadında sanaw.', // kaa: tekshirilsin
        'Confusing the number of digits with the number of numbers; counting the digit only in the units place.',
      ),
    };
  },
);

// --- 2: nuqtalarli son va bo'linish (L2) ---
interface TwoUnkP {
  pat: string;
  d: number;
}
y1T<TwoUnkP>(
  'na-two-unk',
  2,
  'L2',
  120,
  (r) => {
    const pos = r.shuffle([0, 1, 2, 3]).slice(0, 2).sort((x, y) => x - y);
    const chars: string[] = [];
    let star = 0;
    for (let i = 0; i < 4; i++) chars.push(pos.includes(i) ? 'ab'[star++]! : String(i === 0 ? r.int(1, 9) : r.int(0, 9)));
    return { pat: chars.join(''), d: r.pick([3, 4, 6, 7, 8, 9, 11, 12, 15, 18, 25, 36]) };
  },
  (p) => {
    let ans = 0;
    for (let a = p.pat[0] === 'a' ? 1 : 0; a <= 9; a++) {
      for (let b = 0; b <= 9; b++) {
        const num = Number(p.pat.replace('a', String(a)).replace('b', String(b)));
        if (num % p.d === 0) ans++;
      }
    }
    need(ans >= 2 && ans <= 12);
    const pat = `\\overline{${p.pat}}`;
    return {
      stem: L(
        `${M(pat)} to'rt xonali sonda ${mi(0)} dan ${mi(9)} gacha bo'lgan ${M('a')} va ${M('b')} raqamlarining nechta (${M('a')}; ${M('b')}) juftligida son ${mi(p.d)} ga bo'linadi?`,
        `В четырёхзначном числе ${M(pat)} цифры ${M('a')} и ${M('b')} принимают значения от ${mi(0)} до ${mi(9)}. Для скольких пар (${M('a')}; ${M('b')}) число делится на ${mi(p.d)}?`,
        `${M(pat)} tórt xonalı sanda ${mi(0)} den ${mi(9)} ǵa shekemgi ${M('a')} hám ${M('b')} sanlarınıń neshe (${M('a')}; ${M('b')}) jubında san ${mi(p.d)} ge bólinedi?`, // kaa: tekshirilsin
        `In the four-digit number ${M(pat)} the digits ${M('a')} and ${M('b')} range from ${mi(0)} to ${mi(9)}. For how many pairs (${M('a')}; ${M('b')}) is the number divisible by ${mi(p.d)}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [ans + 1, ans - 1, ans + 2, Math.max(1, ans - 2)], { min: 0 }),
      sol: L(
        `${p.d} ga bo'linish belgisini ishlatib har bir ${M('a')} (${p.pat[0] === 'a' ? '1 dan 9 gacha' : '0 dan 9 gacha'}) uchun mos ${M('b')} larni tekshiramiz. Mos juftliklar soni: ${M(String(ans))}.`,
        `Используя признак делимости на ${p.d}, для каждого ${M('a')} (${p.pat[0] === 'a' ? 'от 1 до 9' : 'от 0 до 9'}) подбираем подходящие ${M('b')}. Число пар: ${M(String(ans))}.`,
        `${p.d} ge bóliniw belgisin paydalanıp hár bir ${M('a')} (${p.pat[0] === 'a' ? '1 den 9 ǵa shekem' : '0 den 9 ǵa shekem'}) ushın sáykes ${M('b')} lerdi tekseremiz. Sáykes jublar sanı: ${M(String(ans))}.`, // kaa: tekshirilsin
        `Using the divisibility test for ${p.d}, check the suitable ${M('b')} for every ${M('a')} (${p.pat[0] === 'a' ? 'from 1 to 9' : 'from 0 to 9'}). Number of pairs: ${M(String(ans))}.`,
      ),
      mis: L(
        "Birinchi raqam $0$ bo'la olmasligini unutish; ikkala noma'lumni bir vaqtda emas, ketma-ket tekshirish kerak.",
        'Забыть, что первая цифра не может быть $0$; неизвестные удобнее перебирать последовательно.',
        'Birinshi san $0$ bola almasın umıtıw; eki belgisizdi bir waqıtta emes, izbe-iz tekseriw kerek.', // kaa: tekshirilsin
        'Forgetting that the first digit cannot be $0$; check the unknowns one after another.',
      ),
    };
  },
);

// --- 2: oraliqdagi tub sonlar (L1) ---
interface PrimesP {
  a: number;
  b: number;
  mode: 'count' | 'sum';
}
y1T<PrimesP>(
  'na-primes',
  2,
  'L1',
  80,
  (r) => {
    const a = r.int(2, 60);
    return { a, b: a + r.int(14, 55), mode: r.pick(['count', 'sum'] as const) };
  },
  (p) => {
    const primes = range(p.a, p.b).filter(isPrime);
    need(primes.length >= 4);
    const ans = p.mode === 'count' ? primes.length : sum(primes);
    const odd = range(p.a, p.b).filter((x) => x % 2 === 1);
    const wrong =
      p.mode === 'count'
        ? [primes.length - 1, primes.length + 1, odd.length, primes.length + 2]
        : [ans - primes[0]!, ans + primes[primes.length - 1]! + 2, ans - primes[primes.length - 1]!, ans + 1];
    return {
      stem: L(
        `${mi(p.a)} dan ${mi(p.b)} gacha (chegaralari bilan) bo'lgan tub sonlar ${p.mode === 'count' ? 'nechta' : "yig'indisini toping"}${p.mode === 'count' ? '?' : '.'}`,
        `${p.mode === 'count' ? 'Сколько простых чисел' : 'Найдите сумму простых чисел'} от ${mi(p.a)} до ${mi(p.b)} (включительно)${p.mode === 'count' ? '?' : '.'}`,
        `${mi(p.a)} den ${mi(p.b)} ge shekemgi (shegaraları menen) tub sanlar ${p.mode === 'count' ? 'neshe?' : 'qosındısın tabıń.'}`, // kaa: tekshirilsin
        `${p.mode === 'count' ? 'How many primes are there' : 'Find the sum of the primes'} from ${mi(p.a)} to ${mi(p.b)} (inclusive)${p.mode === 'count' ? '?' : '.'}`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 0 }),
      sol: L(
        `Tub sonlar: ${M(primes.join(',\\ '))}. ${p.mode === 'count' ? `Ularning soni ${M(String(ans))}.` : `Yig'indisi ${M(String(ans))}.`}`,
        `Простые числа: ${M(primes.join(',\\ '))}. ${p.mode === 'count' ? `Их количество ${M(String(ans))}.` : `Их сумма ${M(String(ans))}.`}`,
        `Tub sanlar: ${M(primes.join(',\\ '))}. ${p.mode === 'count' ? `Olardıń sanı ${M(String(ans))}.` : `Qosındısı ${M(String(ans))}.`}`, // kaa: tekshirilsin
        `The primes are ${M(primes.join(',\\ '))}. ${p.mode === 'count' ? `Their count is ${M(String(ans))}.` : `Their sum is ${M(String(ans))}.`}`,
      ),
      mis: L(
        "Toq sonlarning hammasini tub deb olish (masalan $9$, $15$, $21$ tub emas).",
        'Считать все нечётные числа простыми (например, $9$, $15$, $21$ не простые).',
        'Barlıq taq sanlardı tub dep alıw (mısalı $9$, $15$, $21$ tub emes).', // kaa: tekshirilsin
        'Treating every odd number as prime (for example $9$, $15$, $21$ are not).',
      ),
    };
  },
);

// --- 2: bo'luvchilar (L2 y1; L3 o) ---
type DivAsk = 'tau' | 'sigma' | 'odd' | 'sq';
interface DivisorsP {
  pf: [number, number][];
  ask: DivAsk;
}
function divisorsDraw(r: Rng, forceTwo: boolean): DivisorsP {
  const primes = r.shuffle([2, 3, 5, 7]).slice(0, r.int(2, 3));
  if (forceTwo && !primes.includes(2)) primes[0] = 2;
  return { pf: primes.map((q) => [q, r.int(1, 4)] as [number, number]), ask: r.pick(['tau', 'sigma', 'odd', 'sq'] as const) };
}
const divN = (pf: [number, number][]): number => pf.reduce((n, [q, e]) => n * q ** e, 1);
function divStat(pf: [number, number][]) {
  const tau = pf.reduce((t, [, e]) => t * (e + 1), 1);
  const sigma = pf.reduce((s, [q, e]) => s * (q ** (e + 1) - 1) / (q - 1), 1);
  const odd = pf.filter(([q]) => q !== 2).reduce((t, [, e]) => t * (e + 1), 1);
  const sq = pf.reduce((t, [, e]) => t * (Math.floor(e / 2) + 1), 1);
  return { tau, sigma, odd, sq };
}
const DIV_ASK: Record<DivAsk, L10n> = {
  tau: L("nechta natural bo'luvchisi bor", 'сколько натуральных делителей', 'neshe natural bóliwshisi bar', 'how many natural divisors'), // kaa: tekshirilsin
  sigma: L("barcha natural bo'luvchilari yig'indisini toping", 'найдите сумму всех натуральных делителей', 'barlıq natural bóliwshileri qosındısın tabıń', 'find the sum of all natural divisors'), // kaa: tekshirilsin
  odd: L("nechta toq natural bo'luvchisi bor", 'сколько нечётных натуральных делителей', 'neshe taq natural bóliwshisi bar', 'how many odd natural divisors'), // kaa: tekshirilsin
  sq: L("nechta bo'luvchisi to'liq kvadrat", 'сколько делителей являются полными квадратами', 'neshe bóliwshisi tolıq kvadrat', 'how many divisors are perfect squares'), // kaa: tekshirilsin
};
y1T<DivisorsP>(
  'na-divisors',
  2,
  'L2',
  120,
  (r) => divisorsDraw(r, true),
  (p) => {
    const N = divN(p.pf);
    need(N <= 20000 && N >= 24);
    const st = divStat(p.pf);
    const ans = st[p.ask];
    const sumExp = sum(p.pf.map(([, e]) => e));
    const wrong =
      p.ask === 'tau' ? [st.tau - 1, sumExp, st.tau + 2, p.pf.reduce((t, [, e]) => t * e, 1)] : p.ask === 'sigma' ? [st.sigma - N, st.sigma + 1, st.sigma - 1, N + 1] : p.ask === 'odd' ? [st.tau, st.odd + 1, st.odd - 1, st.tau - st.odd] : [st.sq + 1, st.sq - 1, st.tau, Math.floor(st.tau / 2)];
    const fac = p.pf.map(([q, e]) => (e === 1 ? String(q) : `${q}^{${e}}`)).join('\\cdot ');
    return {
      stem: L(
        `${mi(N)} sonining ${DIV_ASK[p.ask].uz}?`.replace('toping?', 'toping.'),
        `Для числа ${mi(N)}: ${DIV_ASK[p.ask].ru}?`.replace('найдите сумму всех натуральных делителей?', 'найдите сумму всех натуральных делителей.'),
        `${mi(N)} sanınıń ${DIV_ASK[p.ask].kaa}?`.replace('tabıń?', 'tabıń.'), // kaa: tekshirilsin
        `For the number ${mi(N)}: ${DIV_ASK[p.ask].en}?`.replace('find the sum of all natural divisors?', 'find the sum of all natural divisors.'),
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 1 }),
      sol: L(
        `${M(`${N}=${fac}`)}. ${p.ask === 'tau' ? "Bo'luvchilar soni (daraja ko'rsatkichlari+1) ko'paytmasi" : p.ask === 'sigma' ? "Har tub son uchun geometrik yig'indi ko'paytmasi" : p.ask === 'odd' ? "Toq bo'luvchilar: $2$ ning darajasini tashlab (daraja+1) ko'paytmasi" : "Kvadrat bo'luvchilar: juft ko'rsatkichli darajalar, ya'ni ($\\lfloor e/2\\rfloor+1$) ko'paytmasi"}: ${M(String(ans))}.`,
        `${M(`${N}=${fac}`)}. ${p.ask === 'tau' ? 'Число делителей — произведение (показатель+1)' : p.ask === 'sigma' ? 'Произведение сумм геометрических прогрессий по каждому простому' : p.ask === 'odd' ? 'Нечётные делители: отбрасываем степень $2$ и берём произведение (показатель+1)' : 'Квадратные делители: чётные показатели, т.е. произведение ($\\lfloor e/2\\rfloor+1$)'}: ${M(String(ans))}.`,
        `${M(`${N}=${fac}`)}. ${p.ask === 'tau' ? "Bóliwshiler sanı (dáreje kórsetkishleri+1) kóbeymesi" : p.ask === 'sigma' ? "Hár tub san ushın geometriyalıq qosındılar kóbeymesi" : p.ask === 'odd' ? "Taq bóliwshiler: $2$ niń dárejesin taslap (dáreje+1) kóbeymesi" : "Kvadrat bóliwshiler: jup kórsetkishli dárejeler, yaǵnıy ($\\lfloor e/2\\rfloor+1$) kóbeymesi"}: ${M(String(ans))}.`, // kaa: tekshirilsin
        `${M(`${N}=${fac}`)}. ${p.ask === 'tau' ? 'The number of divisors is the product of (exponent+1)' : p.ask === 'sigma' ? 'The product of geometric sums over each prime' : p.ask === 'odd' ? 'Odd divisors: drop the power of $2$ and take the product of (exponent+1)' : 'Square divisors: even exponents, i.e. the product of ($\\lfloor e/2\\rfloor+1$)'}: ${M(String(ans))}.`,
      ),
      mis: L(
        "Daraja ko'rsatkichlariga $1$ qo'shishni unutish; $1$ va sonning o'zini bo'luvchilar sirasidan chiqarib tashlash.",
        'Забыть прибавить $1$ к показателям степеней; не учесть делители $1$ и само число.',
        'Dáreje kórsetkishlerine $1$ qosıwdı umıtıw; $1$ hám sannıń ózin bóliwshiler qatarınan shıǵarıp taslaw.', // kaa: tekshirilsin
        'Forgetting to add $1$ to the exponents; leaving out the divisors $1$ and the number itself.',
      ),
    };
  },
);

oT<DivisorsP>(
  'na-o-divisors',
  2,
  'L3',
  150,
  (r) => divisorsDraw(r, false),
  (p) => {
    const N = divN(p.pf);
    need(N <= 20000 && N >= 24);
    const st = divStat(p.pf);
    need(st.tau !== st.sigma);
    return {
      stem: L(`Natural son ${mi(N)} berilgan.`, `Дано натуральное число ${mi(N)}.`, `${mi(N)} natural sanı berilgen.`, `Consider the natural number ${mi(N)}.`), // kaa: tekshirilsin
      a: { prompt: L("Uning nechta natural bo'luvchisi bor?", 'Сколько у него натуральных делителей?', 'Onıń neshe natural bóliwshisi bar?', 'How many natural divisors does it have?'), key: frac(st.tau) }, // kaa: tekshirilsin
      b: { prompt: L("Barcha natural bo'luvchilari yig'indisini toping.", 'Найдите сумму всех его натуральных делителей.', 'Barlıq natural bóliwshileri qosındısın tabıń.', 'Find the sum of all its natural divisors.'), key: frac(st.sigma) }, // kaa: tekshirilsin
      sol: L(
        `${M(`${N}=${p.pf.map(([q, e]) => (e === 1 ? String(q) : `${q}^{${e}}`)).join('\\cdot ')}`)}. a) ${M(p.pf.map(([, e]) => `(${e}+1)`).join('\\cdot ') + `=${st.tau}`)}. b) ${M(p.pf.map(([q, e]) => `(${range(0, e).map((k) => q ** k).join('+')})`).join('\\cdot ') + `=${st.sigma}`)}.`,
        `${M(`${N}=${p.pf.map(([q, e]) => (e === 1 ? String(q) : `${q}^{${e}}`)).join('\\cdot ')}`)}. а) ${M(p.pf.map(([, e]) => `(${e}+1)`).join('\\cdot ') + `=${st.tau}`)}. б) ${M(p.pf.map(([q, e]) => `(${range(0, e).map((k) => q ** k).join('+')})`).join('\\cdot ') + `=${st.sigma}`)}.`,
        `${M(`${N}=${p.pf.map(([q, e]) => (e === 1 ? String(q) : `${q}^{${e}}`)).join('\\cdot ')}`)}. a) ${M(p.pf.map(([, e]) => `(${e}+1)`).join('\\cdot ') + `=${st.tau}`)}. b) ${M(p.pf.map(([q, e]) => `(${range(0, e).map((k) => q ** k).join('+')})`).join('\\cdot ') + `=${st.sigma}`)}.`,
        `${M(`${N}=${p.pf.map(([q, e]) => (e === 1 ? String(q) : `${q}^{${e}}`)).join('\\cdot ')}`)}. a) ${M(p.pf.map(([, e]) => `(${e}+1)`).join('\\cdot ') + `=${st.tau}`)}. b) ${M(p.pf.map(([q, e]) => `(${range(0, e).map((k) => q ** k).join('+')})`).join('\\cdot ') + `=${st.sigma}`)}.`,
      ),
      mis: L(
        "Bo'luvchilar yig'indisini ularning sonidan ajrata olmaslik; $1$ va sonning o'zini hisobga olmaslik.",
        'Путать сумму делителей с их количеством; не учитывать $1$ и само число.',
        "Bóliwshiler qosındısın olardıń sanınan ajıratpaw; $1$ hám sannıń ózin esapqa almaw.", // kaa: tekshirilsin
        'Mixing up the sum of divisors with their number; leaving out $1$ and the number itself.',
      ),
    };
  },
);

// --- 2: a^n oxirgi raqami (L2) ---
interface LastDigitP {
  terms: { a: number; n: number }[];
}
y1T<LastDigitP>(
  'na-last-digit',
  2,
  'L2',
  90,
  (r) => {
    const bases = [2, 3, 4, 6, 7, 8, 9, 12, 13, 14, 17, 18, 19, 22, 23, 27, 28, 29];
    const k = r.pick([1, 2]);
    return { terms: Array.from({ length: k }, () => ({ a: r.pick(bases), n: r.int(15, 2030) })) };
  },
  (p) => {
    const ans = sum(p.terms.map((t) => modPow(t.a, t.n, 10))) % 10;
    // tipik xatolar: sikl uzunligini noto'g'ri qo'llash
    const m1 = sum(p.terms.map((t) => modPow(t.a, t.n % 4 === 0 ? 0 : t.n % 4, 10))) % 10;
    const m2 = sum(p.terms.map((t) => t.a % 10)) % 10;
    const m3 = sum(p.terms.map((t) => modPow(t.a, t.n + 1, 10))) % 10;
    const m4 = sum(p.terms.map((t) => modPow(t.a, t.n - 1, 10))) % 10;
    const expr = p.terms.map((t) => `${t.a}^{${t.n}}`).join('+');
    return {
      stem: L(
        `${M(expr)} ${p.terms.length === 1 ? 'sonining' : 'yig\'indisining'} oxirgi raqamini toping.`,
        `Найдите последнюю цифру ${p.terms.length === 1 ? 'числа' : 'суммы'} ${M(expr)}.`,
        `${M(expr)} ${p.terms.length === 1 ? 'sanınıń' : 'qosındısınıń'} sońǵı sanın tabıń.`, // kaa: tekshirilsin
        `Find the last digit of ${p.terms.length === 1 ? 'the number' : 'the sum'} ${M(expr)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [m1, m2, m3, m4], { min: 0, max: 9 }),
      sol: L(
        `Oxirgi raqamlar davriy takrorlanadi (davr $4$ yoki undan kichik). Daraja ko'rsatkichini davr bo'yicha qoldiqqa keltirib: ${p.terms.map((t) => `${M(`${t.a}^{${t.n}}\\to ${modPow(t.a, t.n, 10)}`)}`).join(', ')}. Javob: ${mi(ans)}.`,
        `Последние цифры степеней повторяются периодически (период не больше $4$). Приводя показатель по периоду: ${p.terms.map((t) => `${M(`${t.a}^{${t.n}}\\to ${modPow(t.a, t.n, 10)}`)}`).join(', ')}. Ответ: ${mi(ans)}.`,
        `Dárejelerdiń sońǵı sanları dawırlı tákirarlanadı (dáwir $4$ ten aspaydı). Kórsetkishti dáwir boyınsha qaldıqqa keltirip: ${p.terms.map((t) => `${M(`${t.a}^{${t.n}}\\to ${modPow(t.a, t.n, 10)}`)}`).join(', ')}. Juwap: ${mi(ans)}.`, // kaa: tekshirilsin
        `The last digits of powers repeat periodically (period at most $4$). Reducing the exponent by the period: ${p.terms.map((t) => `${M(`${t.a}^{${t.n}}\\to ${modPow(t.a, t.n, 10)}`)}`).join(', ')}. Answer: ${mi(ans)}.`,
      ),
      mis: L(
        "Qoldiq $0$ chiqqanda daraja ko'rsatkichini $0$ deb olish (to'g'risi davrning oxirgi hadi, ya'ni $4$-daraja).",
        'При остатке $0$ брать показатель $0$ (верно — последний член периода, то есть показатель $4$).',
        "Qaldıq $0$ shıqqanda dáreje kórsetkishin $0$ dep alıw (durısı dáwirdiń sońǵı aǵzası, yaǵnıy $4$-dáreje).", // kaa: tekshirilsin
        'Taking exponent $0$ when the remainder is $0$ (it should be the last term of the cycle, exponent $4$).',
      ),
    };
  },
);

// --- 2: ikki shartli qoldiq (L3) ---
interface ModSysP {
  d1: number;
  r1: number;
  d2: number;
  r2: number;
  M: number;
}
y1T<ModSysP>(
  'na-mod-system',
  2,
  'L3',
  130,
  (r) => {
    const d1 = r.int(4, 13);
    const d2 = r.int(5, 17);
    const N0 = r.int(20, 300);
    return { d1, r1: N0 % d1, d2, r2: N0 % d2, M: r.int(60, 420) };
  },
  (p) => {
    need(p.d1 !== p.d2 && p.r1 > 0 && p.r2 > 0 && lcm(p.d1, p.d2) <= 160);
    const Lc = lcm(p.d1, p.d2);
    // N0: shartni qanoatlantiruvchi eng kichik natural son (1..Lc ichida)
    let base = -1;
    for (let x = 1; x <= Lc; x++) if (x % p.d1 === p.r1 && x % p.d2 === p.r2) base = x;
    need(base > 0);
    let ans = base;
    while (ans <= p.M) ans += Lc;
    const wrong = [ans - Lc, ans + Lc, base, p.d1 * p.d2 + base, ans + p.d1];
    return {
      stem: L(
        `Natural son ${mi(p.d1)} ga bo'linganda ${mi(p.r1)} qoldiq, ${mi(p.d2)} ga bo'linganda ${mi(p.r2)} qoldiq qoladi. ${mi(p.M)} dan katta bunday sonlarning eng kichigini toping.`,
        `Натуральное число при делении на ${mi(p.d1)} даёт остаток ${mi(p.r1)}, а при делении на ${mi(p.d2)} — остаток ${mi(p.r2)}. Найдите наименьшее такое число, большее ${mi(p.M)}.`,
        `Natural san ${mi(p.d1)} ge bólingende ${mi(p.r1)} qaldıq, ${mi(p.d2)} ge bólingende ${mi(p.r2)} qaldıq qaladı. ${mi(p.M)} den úlken bunday sanlardıń eń kishisin tabıń.`, // kaa: tekshirilsin
        `A natural number leaves remainder ${mi(p.r1)} when divided by ${mi(p.d1)} and remainder ${mi(p.r2)} when divided by ${mi(p.d2)}. Find the smallest such number greater than ${mi(p.M)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 1 }),
      sol: L(
        `Shartni qanoatlantiruvchi eng kichik son ${base}; boshqalari ${p.d1} va ${p.d2} ning EKUK i ${Lc} qadam bilan: ${M(`${base},\\ ${base + Lc},\\ ${base + 2 * Lc},\\ \\ldots`)} ${p.M} dan kattasi: ${mi(ans)}.`,
        `Наименьшее число, подходящее по условию, ${base}; остальные получаются шагом НОК(${p.d1}, ${p.d2}) $=${Lc}$: ${M(`${base},\\ ${base + Lc},\\ ${base + 2 * Lc},\\ \\ldots`)} Первое больше ${p.M}: ${mi(ans)}.`,
        `Shártti qanaatlandıratuǵın eń kishi san ${base}; basqaları ${p.d1} hám ${p.d2} niń EKUK i ${Lc} qádem menen: ${M(`${base},\\ ${base + Lc},\\ ${base + 2 * Lc},\\ \\ldots`)} ${p.M} den úlkeni: ${mi(ans)}.`, // kaa: tekshirilsin
        `The smallest suitable number is ${base}; the others follow with step LCM(${p.d1}, ${p.d2}) $=${Lc}$: ${M(`${base},\\ ${base + Lc},\\ ${base + 2 * Lc},\\ \\ldots`)} The first one above ${p.M} is ${mi(ans)}.`,
      ),
      mis: L(
        "Qadam sifatida $m\\cdot n$ ni olish (to'g'risi EKUK) yoki $M$ dan kichik/teng sonni tanlash.",
        'Брать шаг $m\\cdot n$ (верно — НОК) или выбрать число, не большее $M$.',
        "Qádem retinde $m\\cdot n$ di alıw (durısı EKUK) yamasa $M$ den kishi/teń sandı saylaw.", // kaa: tekshirilsin
        'Using step $m\\cdot n$ (it is the LCM) or choosing a number not greater than $M$.',
      ),
    };
  },
);

// --- 3: EKUB, EKUK va ko'paytma (L1) ---
interface GcdMissP {
  g: number;
  u: number;
  v: number;
  mode: 'other' | 'lcm';
}
y1T<GcdMissP>(
  'na-gcd-missing',
  3,
  'L1',
  80,
  (r) => ({ g: r.int(2, 12), u: r.int(2, 9), v: r.int(2, 9), mode: r.pick(['other', 'lcm'] as const) }),
  (p) => {
    need(p.u < p.v && gcd(p.u, p.v) === 1);
    const a = p.g * p.u;
    const b = p.g * p.v;
    const l = lcm(a, b);
    const ans = p.mode === 'other' ? b : l;
    const stem =
      p.mode === 'other'
        ? L(
            `Ikki natural sonning EKUB i ${mi(p.g)}, EKUK i ${mi(l)}. Sonlardan biri ${mi(a)} ga teng. Ikkinchi sonni toping.`,
            `НОД двух натуральных чисел равен ${mi(p.g)}, НОК равен ${mi(l)}. Одно из чисел равно ${mi(a)}. Найдите другое число.`,
            `Eki natural sannıń EKUB ${mi(p.g)}, EKUK ${mi(l)}. Sanlardıń biri ${mi(a)} ge teń. Ekinshi sandı tabıń.`, // kaa: tekshirilsin
            `Two natural numbers have GCD ${mi(p.g)} and LCM ${mi(l)}. One of them is ${mi(a)}. Find the other.`,
          )
        : L(
            `Ikki natural sonning ko'paytmasi ${mi(a * b)}, EKUB i ${mi(p.g)}. Ularning EKUK ini toping.`,
            `Произведение двух натуральных чисел равно ${mi(a * b)}, их НОД равен ${mi(p.g)}. Найдите их НОК.`,
            `Eki natural sannıń kóbeymesi ${mi(a * b)}, EKUB ${mi(p.g)}. Olardıń EKUK in tabıń.`, // kaa: tekshirilsin
            `The product of two natural numbers is ${mi(a * b)} and their GCD is ${mi(p.g)}. Find their LCM.`,
          );
    return {
      stem,
      correct: mi(ans),
      wrong: intWrong(ans, p.mode === 'other' ? [l / a, l - a, p.g * p.v + p.g, a + p.g] : [a * b, a * b * p.g, p.g * (a + b), Math.floor((a * b) / (p.g * p.g))], { min: 1 }),
      sol: L(
        `Har doim ${M('\\gcd(a,b)\\cdot\\operatorname{lcm}(a,b)=a\\cdot b')}. ${p.mode === 'other' ? M(`b=\\frac{${p.g}\\cdot ${l}}{${a}}=${b}`) : M(`\\operatorname{lcm}=\\frac{${a * b}}{${p.g}}=${l}`)}.`,
        `Всегда ${M('\\gcd(a,b)\\cdot\\operatorname{lcm}(a,b)=a\\cdot b')}. ${p.mode === 'other' ? M(`b=\\frac{${p.g}\\cdot ${l}}{${a}}=${b}`) : M(`\\operatorname{lcm}=\\frac{${a * b}}{${p.g}}=${l}`)}.`,
        `Ámeldegi ${M('\\gcd(a,b)\\cdot\\operatorname{lcm}(a,b)=a\\cdot b')}. ${p.mode === 'other' ? M(`b=\\frac{${p.g}\\cdot ${l}}{${a}}=${b}`) : M(`\\operatorname{lcm}=\\frac{${a * b}}{${p.g}}=${l}`)}.`, // kaa: tekshirilsin
        `Always ${M('\\gcd(a,b)\\cdot\\operatorname{lcm}(a,b)=a\\cdot b')}. ${p.mode === 'other' ? M(`b=\\frac{${p.g}\\cdot ${l}}{${a}}=${b}`) : M(`\\operatorname{lcm}=\\frac{${a * b}}{${p.g}}=${l}`)}.`,
      ),
      mis: L(
        "EKUB va EKUKni qo'shib yoki ayirib hisoblash; ko'paytma formulasini unutish.",
        'Складывать или вычитать НОД и НОК; забыть формулу произведения.',
        'EKUB hám EKUK ti qosıp yamasa ayırıp esaplaw; kóbeyme formulasın umıtıw.', // kaa: tekshirilsin
        'Adding or subtracting the GCD and LCM; forgetting the product formula.',
      ),
    };
  },
);

// --- 3: yig'indisi va EKUB i berilgan juftliklar (L3) ---
interface GcdPairsP {
  g: number;
  m: number;
  ordered: boolean;
}
const totient = (n: number): number => range(1, n).filter((k) => gcd(k, n) === 1).length;
y1T<GcdPairsP>(
  'na-gcd-pairs',
  3,
  'L3',
  130,
  (r) => ({ g: r.int(2, 9), m: r.int(7, 60), ordered: r.chance(0.4) }),
  (p) => {
    const phi = totient(p.m);
    const ans = p.ordered ? phi : phi / 2;
    need(Number.isInteger(ans) && ans >= 2);
    const S = p.g * p.m;
    return {
      stem: L(
        p.ordered
          ? `Yig'indisi ${mi(S)}, EKUB i ${mi(p.g)} bo'lgan natural sonlarning (${M('a')}; ${M('b')}) tartiblangan juftliklari nechta?`
          : `Yig'indisi ${mi(S)}, EKUB i ${mi(p.g)} bo'lgan ${M('a<b')} natural sonlar juftliklari nechta?`,
        p.ordered
          ? `Сколько существует упорядоченных пар натуральных чисел (${M('a')}; ${M('b')}) с суммой ${mi(S)} и НОД ${mi(p.g)}?`
          : `Сколько существует пар натуральных чисел ${M('a<b')} с суммой ${mi(S)} и НОД ${mi(p.g)}?`,
        p.ordered
          ? `Qosındısı ${mi(S)}, EKUB ${mi(p.g)} bolǵan natural sanlardıń (${M('a')}; ${M('b')}) tártiplengen jubı neshe?` // kaa: tekshirilsin
          : `Qosındısı ${mi(S)}, EKUB ${mi(p.g)} bolǵan ${M('a<b')} natural sanlar jubı neshe?`, // kaa: tekshirilsin
        p.ordered ? `How many ordered pairs of natural numbers (${M('a')}; ${M('b')}) have sum ${mi(S)} and GCD ${mi(p.g)}?` : `How many pairs of natural numbers ${M('a<b')} have sum ${mi(S)} and GCD ${mi(p.g)}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [p.m - 1, phi, p.ordered ? phi / 2 : phi, Math.floor((p.m - 1) / 2)], { min: 1 }),
      sol: L(
        `${M(`a=${p.g}x,\\ b=${p.g}y,\\ x+y=${p.m}`)}, ${M('\\gcd(x,y)=1')} bo'lishi kerak, bu ${M(`\\gcd(x,${p.m})=1`)} ga teng. Bunday ${M('x')} lar soni ${M(`\\varphi(${p.m})=${phi}`)}${p.ordered ? '' : '; juftliklar tartibsiz, shuning uchun ikkiga bo\'linadi'}. Javob ${mi(ans)}.`,
        `${M(`a=${p.g}x,\\ b=${p.g}y,\\ x+y=${p.m}`)}, нужно ${M('\\gcd(x,y)=1')}, что равносильно ${M(`\\gcd(x,${p.m})=1`)}. Количество таких ${M('x')} равно ${M(`\\varphi(${p.m})=${phi}`)}${p.ordered ? '' : '; пары неупорядоченные, делим на два'}. Ответ ${mi(ans)}.`,
        `${M(`a=${p.g}x,\\ b=${p.g}y,\\ x+y=${p.m}`)}, ${M('\\gcd(x,y)=1')} bolıwı kerek, bul ${M(`\\gcd(x,${p.m})=1`)} ge teń. Bunday ${M('x')} ler sanı ${M(`\\varphi(${p.m})=${phi}`)}${p.ordered ? '' : '; jublar tártipsiz, sonıń ushın ekige bólinedi'}. Juwap ${mi(ans)}.`, // kaa: tekshirilsin
        `${M(`a=${p.g}x,\\ b=${p.g}y,\\ x+y=${p.m}`)}, we need ${M('\\gcd(x,y)=1')}, which is equivalent to ${M(`\\gcd(x,${p.m})=1`)}. There are ${M(`\\varphi(${p.m})=${phi}`)} such ${M('x')}${p.ordered ? '' : '; the pairs are unordered, so divide by two'}. Answer ${mi(ans)}.`,
      ),
      mis: L(
        "Barcha $x=1,\\ldots,m-1$ qiymatlarni sanash (o'zaro tub shartini unutish) yoki tartibsiz juftliklarni ikki marta sanash.",
        'Считать все $x=1,\\ldots,m-1$ (забыть о взаимной простоте) или дважды считать неупорядоченные пары.',
        "Barlıq $x=1,\\ldots,m-1$ mánislerdi sanaw (óz-ara tublıq shártin umıtıw) yamasa tártipsiz jublardı eki ret sanaw.", // kaa: tekshirilsin
        'Counting all $x=1,\\ldots,m-1$ (forgetting coprimality) or counting unordered pairs twice.',
      ),
    };
  },
);

// --- 3: davriy hodisalar, EKUK (L2) ---
interface CycleP {
  periods: number[];
  mode: 'first' | 'count';
  T: number;
}
y1T<CycleP>(
  'na-cycle',
  3,
  'L2',
  100,
  (r) => {
    const pool = [4, 6, 8, 9, 10, 12, 14, 15, 18, 20, 21, 24, 30];
    return { periods: r.shuffle(pool).slice(0, 3), mode: r.pick(['first', 'count'] as const), T: r.int(10, 90) };
  },
  (p) => {
    const Lc = p.periods.reduce((a, b) => lcm(a, b));
    need(Lc <= 360);
    const ans = p.mode === 'first' ? Lc : Math.floor((p.T * 60) / Lc);
    need(ans >= 2);
    const wrongF = [Lc * 2, Lc / 2, p.periods[0]! * p.periods[1]! * p.periods[2]!, sum(p.periods)];
    const wrongC = [ans + 1, ans - 1, Math.floor((p.T * 60) / lcm(p.periods[0]!, p.periods[1]!)), ans + 2];
    const [x, y, z] = p.periods as [number, number, number];
    return {
      stem: L(
        p.mode === 'first'
          ? `Uchta chiroq mos ravishda har ${mi(x)}, ${mi(y)} va ${mi(z)} soniyada bir marta yonadi. Ular bir vaqtda yonganidan keyin yana birga yonishi uchun eng kamida necha soniya o'tadi?`
          : `Uchta chiroq mos ravishda har ${mi(x)}, ${mi(y)} va ${mi(z)} soniyada bir marta yonadi. Ular boshida birga yondi. ${mi(p.T)} daqiqa ichida (boshlang'ich yonishdan keyin) yana necha marta birga yonadi?`,
        p.mode === 'first'
          ? `Три лампы мигают с периодами ${mi(x)}, ${mi(y)} и ${mi(z)} секунд. Через какое наименьшее число секунд после одновременной вспышки они снова вспыхнут вместе?`
          : `Три лампы мигают с периодами ${mi(x)}, ${mi(y)} и ${mi(z)} секунд. В начале они вспыхнули вместе. Сколько ещё раз они вспыхнут одновременно в течение ${mi(p.T)} минут (не считая начальной вспышки)?`,
        p.mode === 'first'
          ? `Úsh shıraq sáykes túrde hár ${mi(x)}, ${mi(y)} hám ${mi(z)} sekundta bir ret janadı. Olar bir waqıtta janǵannan keyin qaytadan birge janıwı ushın eń keminde neshe sekund ótedi?` // kaa: tekshirilsin
          : `Úsh shıraq sáykes túrde hár ${mi(x)}, ${mi(y)} hám ${mi(z)} sekundta bir ret janadı. Olar baslanıwında birge jandı. ${mi(p.T)} minut ishinde (baslanǵısh janıwdan keyin) taǵı neshe ret birge janadı?`, // kaa: tekshirilsin
        p.mode === 'first'
          ? `Three lamps flash every ${mi(x)}, ${mi(y)} and ${mi(z)} seconds. After flashing together, what is the least number of seconds until they flash together again?`
          : `Three lamps flash every ${mi(x)}, ${mi(y)} and ${mi(z)} seconds. They flash together at the start. How many more times do they flash together within ${mi(p.T)} minutes (not counting the start)?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, p.mode === 'first' ? wrongF : wrongC, { min: 1 }),
      sol: L(
        `Birga yonish orasidagi vaqt — ${x}, ${y}, ${z} larning EKUK i: ${M(`\\operatorname{lcm}=${Lc}`)} soniya.${p.mode === 'count' ? ` ${p.T} daqiqa $=${p.T * 60}$ soniya: ${M(`\\lfloor ${p.T * 60}/${Lc}\\rfloor=${ans}`)}.` : ''}`,
        `Время между совместными вспышками — НОК чисел ${x}, ${y}, ${z}: ${M(`\\operatorname{lcm}=${Lc}`)} секунд.${p.mode === 'count' ? ` ${p.T} мин $=${p.T * 60}$ с: ${M(`\\lfloor ${p.T * 60}/${Lc}\\rfloor=${ans}`)}.` : ''}`,
        `Birge janıw aralıǵı — ${x}, ${y}, ${z} niń EKUK i: ${M(`\\operatorname{lcm}=${Lc}`)} sekund.${p.mode === 'count' ? ` ${p.T} minut $=${p.T * 60}$ sekund: ${M(`\\lfloor ${p.T * 60}/${Lc}\\rfloor=${ans}`)}.` : ''}`, // kaa: tekshirilsin
        `The time between joint flashes is the LCM of ${x}, ${y}, ${z}: ${M(`\\operatorname{lcm}=${Lc}`)} seconds.${p.mode === 'count' ? ` ${p.T} min $=${p.T * 60}$ s: ${M(`\\lfloor ${p.T * 60}/${Lc}\\rfloor=${ans}`)}.` : ''}`,
      ),
      mis: L(
        "Davrlar ko'paytmasini olish (to'g'risi EKUK); daqiqani soniyaga o'tkazishni unutish.",
        'Брать произведение периодов (верно — НОК); забыть перевести минуты в секунды.',
        "Dáwirler kóbeymesin alıw (durısı EKUK); minutti sekundqa ótkeriwdi umıtıw.", // kaa: tekshirilsin
        'Taking the product of the periods (it is the LCM); forgetting to convert minutes to seconds.',
      ),
    };
  },
);

// --- 3: plitkalar, EKUB (L1) ---
interface TilesP {
  a: number;
  b: number;
  ask: 'side' | 'count';
}
y1T<TilesP>(
  'na-tiles',
  3,
  'L1',
  80,
  (r) => ({ a: r.int(24, 240), b: r.int(24, 240), ask: r.pick(['side', 'count'] as const) }),
  (p) => {
    need(p.a < p.b && gcd(p.a, p.b) >= 4 && gcd(p.a, p.b) < p.a);
    const g = gcd(p.a, p.b);
    const ans = p.ask === 'side' ? g : (p.a / g) * (p.b / g);
    const wrong = p.ask === 'side' ? [lcm(p.a, p.b), p.b - p.a, g / 2, g * 2] : [p.a * p.b, p.a + p.b, (p.a / g) + (p.b / g), (p.a * p.b) / (g * 2)];
    return {
      stem: L(
        `${mi(p.a)} sm $\\times$ ${mi(p.b)} sm o'lchamli to'g'ri to'rtburchak shaklidagi taxtani butun kvadrat plitkalar bilan, kesmasdan va ortiqcha qoldirmasdan qoplash kerak. ${p.ask === 'side' ? 'Eng katta plitka tomoni necha sm bo\'ladi?' : 'Eng katta plitkalar ishlatilsa, nechta plitka kerak?'}`,
        `Прямоугольную доску ${mi(p.a)} см $\\times$ ${mi(p.b)} см нужно без остатка и без разрезания покрыть квадратными плитками. ${p.ask === 'side' ? 'Какова наибольшая возможная сторона плитки (в см)?' : 'Сколько плиток потребуется, если брать самые большие?'}`,
        `${mi(p.a)} sm $\\times$ ${mi(p.b)} sm ólshemli tuwrı tórtmúyeshli taxtanı pútin kvadrat plitkalar menen kesmesten hám artıqsha qaldırmastan qaplaw kerek. ${p.ask === 'side' ? 'Eń úlken plitka tárepi neshe sm boladı?' : 'Eń úlken plitkalar paydalanılsa, neshe plitka kerek?'}`, // kaa: tekshirilsin
        `A rectangular board ${mi(p.a)} cm $\\times$ ${mi(p.b)} cm must be covered exactly with whole square tiles. ${p.ask === 'side' ? 'What is the largest possible tile side (in cm)?' : 'How many tiles are needed if the largest ones are used?'}`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 1 }),
      sol: L(
        `Plitka tomoni ${p.a} va ${p.b} ning umumiy bo'luvchisi, eng kattasi — EKUB: ${M(`\\gcd(${p.a},${p.b})=${g}`)}.${p.ask === 'count' ? ` Plitkalar soni: ${M(`\\frac{${p.a}}{${g}}\\cdot\\frac{${p.b}}{${g}}=${ans}`)}.` : ''}`,
        `Сторона плитки — общий делитель ${p.a} и ${p.b}, наибольшая — НОД: ${M(`\\gcd(${p.a},${p.b})=${g}`)}.${p.ask === 'count' ? ` Число плиток: ${M(`\\frac{${p.a}}{${g}}\\cdot\\frac{${p.b}}{${g}}=${ans}`)}.` : ''}`,
        `Plitka tárepi ${p.a} hám ${p.b} niń ulıwma bóliwshisi, eń úlkeni — EKUB: ${M(`\\gcd(${p.a},${p.b})=${g}`)}.${p.ask === 'count' ? ` Plitkalar sanı: ${M(`\\frac{${p.a}}{${g}}\\cdot\\frac{${p.b}}{${g}}=${ans}`)}.` : ''}`, // kaa: tekshirilsin
        `The tile side is a common divisor of ${p.a} and ${p.b}; the largest is the GCD: ${M(`\\gcd(${p.a},${p.b})=${g}`)}.${p.ask === 'count' ? ` Number of tiles: ${M(`\\frac{${p.a}}{${g}}\\cdot\\frac{${p.b}}{${g}}=${ans}`)}.` : ''}`,
      ),
      mis: L(
        "EKUB o'rniga EKUKni olish; plitkalar sonini yuzalar nisbati bilan emas, tomonlar bo'yicha hisoblash.",
        'Брать НОК вместо НОД; число плиток считать не по площадям, а лишь по одной стороне.',
        "EKUB ornına EKUK tı alıw; plitkalar sanın jaylar qatnası menen emes, tek bir tárep boyınsha esaplaw.", // kaa: tekshirilsin
        'Using the LCM instead of the GCD; counting tiles along one side only instead of by areas.',
      ),
    };
  },
);

// =====================================================================================================
// 1.2 Sonlar ustida amallar (mavzular 4, 5, 6, 9, 10, 11 va 104 Kompleks sonlar)
// =====================================================================================================

/** Aralash son yozuvi: 17/5 -> 3\frac{2}{5}; manfiy bo'lsa belgisi oldida. */
function mixedTex(f: Frac): string {
  if (f.n < 0) return `-${mixedTex(frac(-f.n, f.d))}`;
  if (f.d === 1) return String(f.n);
  const whole = Math.floor(f.n / f.d);
  const rem = f.n - whole * f.d;
  return whole === 0 ? `\\frac{${rem}}{${f.d}}` : `${whole}\\frac{${rem}}{${f.d}}`;
}
const mm = (f: Frac): string => M(mixedTex(f));
const mixedIn = (w: number, n: number, d: number): string => `${w}\\frac{${n}}{${d}}`;
/** O'nli javob uchun chalg'ituvchilar: tipik xatolar, keyin +-0,1 qadamlar. */
function decWrong(correct: Frac, mistakes: readonly (Frac | null)[], step = frac(1, 10)): string[] {
  const out: string[] = [];
  const seen = new Set<string>([`${correct.n}/${correct.d}`]);
  const push = (f: Frac | null) => {
    if (!f) return;
    const key = `${f.n}/${f.d}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(md(f));
  };
  mistakes.forEach(push);
  for (let k = 1; out.length < 5 && k < 40; k++) {
    push(fAdd(correct, frac(k * step.n, step.d)));
    push(fSub(correct, frac(k * step.n, step.d)));
  }
  return out;
}
const isTerminating = (f: Frac): boolean => {
  let d = f.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
};

// --- 4: aralash sonlar (L1) ---
interface MixedP {
  A: number;
  b: number;
  c: number;
  D: number;
  e: number;
  f: number;
  op: '+' | '-' | '*' | '/';
}
y1T<MixedP>(
  'ar-mixed',
  4,
  'L1',
  90,
  (r) => {
    const c = r.int(2, 9);
    const f = r.int(2, 9);
    return { A: r.int(1, 6), b: r.int(1, c - 1), c, D: r.int(1, 5), e: r.int(1, f - 1), f, op: r.pick(['+', '-', '*', '/'] as const) };
  },
  (p) => {
    need(gcd(p.b, p.c) === 1 && gcd(p.e, p.f) === 1 && p.c !== p.f);
    const x = fAdd(frac(p.A), frac(p.b, p.c));
    const y = fAdd(frac(p.D), frac(p.e, p.f));
    const sym = { '+': '+', '-': '-', '*': '\\cdot ', '/': ':' }[p.op];
    let ans: Frac;
    let wrong: (Frac | null)[];
    if (p.op === '+') {
      ans = fAdd(x, y);
      wrong = [fAdd(frac(p.A + p.D), frac(p.b + p.e, p.c + p.f)), fAdd(ans, frac(1)), fAdd(frac(p.A + p.D), fMul(frac(p.b, p.c), frac(p.e, p.f)))];
    } else if (p.op === '-') {
      need(fracVal(x) > fracVal(y) && p.A > p.D);
      ans = fSub(x, y);
      const df = fSub(frac(p.b, p.c), frac(p.e, p.f));
      wrong = [fAdd(frac(p.A - p.D), frac(Math.abs(df.n), df.d)), fSub(ans, frac(1)), fAdd(x, y)];
    } else if (p.op === '*') {
      ans = fMul(x, y);
      wrong = [fAdd(frac(p.A * p.D), fMul(frac(p.b, p.c), frac(p.e, p.f))), fAdd(x, y), fMul(frac(p.A * p.D), fAdd(frac(1), frac(1)))];
    } else {
      ans = fDiv(x, y);
      wrong = [fMul(x, y), fDiv(y, x), fAdd(frac(Math.floor(p.A / p.D)), fDiv(frac(p.b, p.c), frac(p.e, p.f)))];
    }
    const expr = `${mixedIn(p.A, p.b, p.c)}${sym}${mixedIn(p.D, p.e, p.f)}`;
    const impr = `\\frac{${x.n}}{${x.d}}${sym}\\frac{${y.n}}{${y.d}}`;
    const res = M(texFrac(ans) === mixedTex(ans) ? texFrac(ans) : `${texFrac(ans)}=${mixedTex(ans)}`);
    return {
      stem: L(`${M(expr)} ni hisoblang.`, `Вычислите: ${M(expr)}.`, `${M(expr)} di esaplań.`, `Evaluate ${M(expr)}.`), // kaa: tekshirilsin
      correct: mm(ans),
      wrong: fracWrong(ans, wrong, { fmt: mm }),
      sol: L(
        `Aralash sonlarni noto'g'ri kasrga aylantiramiz: ${M(impr)}. Amalni bajaramiz: ${res}.`,
        `Переводим смешанные числа в неправильные дроби: ${M(impr)}. Выполняем действие: ${res}.`,
        `Aralas sanlardı nadurıs bólshekke aylandıramız: ${M(impr)}. Ámeldi orınlaymız: ${res}.`, // kaa: tekshirilsin
        `Convert the mixed numbers to improper fractions: ${M(impr)}. Then compute: ${res}.`,
      ),
      mis: L(
        "Butun va kasr qismlarini alohida hisoblash (ayirishda qarz olishni, ko'paytirishda o'zaro ta'sirni unutish).",
        'Считать целые и дробные части отдельно (забыть про заём при вычитании и про перекрёстные произведения при умножении).',
        "Pútin hám bólshek bólimlerin bólek esaplaw (ayırıwda qarız alıwdı, kóbeytiwde óz-ara tásirdi umıtıw).", // kaa: tekshirilsin
        'Handling whole and fractional parts separately (forgetting borrowing in subtraction and cross terms in multiplication).',
      ),
    };
  },
);

// --- 4: kasr ichida kasr (L2) ---
interface CFracP {
  v: 0 | 1 | 2;
  n: number[];
  d: number[];
}
y1T<CFracP>(
  'ar-cfrac',
  4,
  'L2',
  120,
  (r) => {
    const d = range(0, 3).map(() => r.int(2, 9));
    const n = d.map((q) => r.int(1, q + 3));
    return { v: r.pick([0, 1, 2] as const), n, d };
  },
  (p) => {
    const f = (k: number) => frac(p.n[k]!, p.d[k]!);
    need([0, 1, 2, 3].every((k) => gcd(p.n[k]!, p.d[k]!) === 1 && p.d[k]! > 1));
    const t = (k: number) => `\\dfrac{${p.n[k]}}{${p.d[k]}}`;
    let ans: Frac;
    let expr: string;
    let wrong: (Frac | null)[];
    if (p.v === 0) {
      const top = fAdd(f(0), f(1));
      const bot = fSub(f(2), f(3));
      need(bot.n > 0);
      ans = fDiv(top, bot);
      expr = `\\dfrac{${t(0)}+${t(1)}}{${t(2)}-${t(3)}}`;
      wrong = [fMul(top, bot), fDiv(bot, top), fSub(fDiv(top, f(2)), f(3)), fAdd(fDiv(top, f(2)), f(3))];
    } else if (p.v === 1) {
      ans = fSub(fDiv(f(0), f(1)), fDiv(f(2), f(3)));
      need(ans.n > 0);
      expr = `\\dfrac{${t(0)}}{${t(1)}}-\\dfrac{${t(2)}}{${t(3)}}`;
      wrong = [fSub(fMul(f(0), f(1)), fMul(f(2), f(3))), fSub(fDiv(f(1), f(0)), fDiv(f(3), f(2)))];
    } else {
      const left = fSub(f(0), f(1));
      const right = fAdd(f(2), f(3));
      need(left.n > 0);
      ans = fDiv(left, right);
      expr = `\\left(${t(0)}-${t(1)}\\right):\\left(${t(2)}+${t(3)}\\right)`;
      wrong = [fMul(left, right), fDiv(right, left), fSub(fDiv(f(0), right), f(1))];
    }
    need(ans.d <= 400 && ans.n <= 400);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Avval qavs va kasr chiziqlaridagi amallarni umumiy maxrajga keltirib bajaramiz, so'ng bo'lamiz. Natija ${mf(ans)}.`,
        `Сначала выполняем действия в скобках и в числителе/знаменателе (общий знаменатель), затем делим. Результат ${mf(ans)}.`,
        `Aldın qawıslar hám bólshek sızıqlarındaǵı ámellerdi ulıwma bólimge keltirip orınlaymız, sońınan bólemiz. Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `First carry out the operations in the brackets and in the numerator and denominator (common denominator), then divide. Result ${mf(ans)}.`,
      ),
      mis: L(
        "Kasrni kasrga bo'lishda ikkinchi kasrni ag'darmaslik; suratni maxrajga ko'paytirib yuborish.",
        'Не перевернуть вторую дробь при делении; умножить числитель на знаменатель вместо деления.',
        "Bólshekti bólshekke bólgende ekinshi bólshekti awdarmaw; alımdı bólimge kóbeytip jiberiw.", // kaa: tekshirilsin
        'Not inverting the second fraction when dividing; multiplying instead of dividing.',
      ),
    };
  },
);

// --- 4: yo'lning qismlari (L2) ---
interface FracPartP {
  n1: number;
  d1: number;
  n2: number;
  d2: number;
  k: number;
  mode: 'total' | 'second';
}
y1T<FracPartP>(
  'ar-frac-part',
  4,
  'L2',
  120,
  (r) => {
    const d1 = r.int(3, 8);
    const d2 = r.int(3, 8);
    return { n1: r.int(1, d1 - 1), d1, n2: r.int(1, d2 - 1), d2, k: r.int(1, 5), mode: r.pick(['total', 'second'] as const) };
  },
  (p) => {
    need(gcd(p.n1, p.d1) === 1 && gcd(p.n2, p.d2) === 1);
    const total = p.d1 * p.d2 * p.k;
    need(total <= 700);
    const day1 = (total * p.n1) / p.d1;
    const rest1 = total - day1;
    const day2 = (rest1 * p.n2) / p.d2;
    const rest2 = rest1 - day2;
    need(Number.isInteger(day1) && Number.isInteger(day2) && rest2 >= 2);
    const ans = p.mode === 'total' ? total : day2;
    const f1 = frac(p.n1, p.d1);
    const f2 = frac(p.n2, p.d2);
    const naive = fSub(frac(1), fAdd(f1, f2));
    const wrongTotal = [naive.n > 0 ? Math.round(rest2 / fracVal(naive)) : 0, Math.round(rest2 / fracVal(fSub(frac(1), f1))), rest2 + day1 + day2 + p.k, total + day1, rest1];
    const wrongSecond = [(total * p.n2) / p.d2, rest2, day1, rest1 - rest2 + p.k];
    const tf = (n: number, d: number) => `\\frac{${n}}{${d}}`;
    const common = (n1: string, n2: string) => `${n1}${mi(rest2)}`;
    void common;
    return {
      stem: L(
        `Turist butun yo'lning ${M(tf(p.n1, p.d1))} qismini birinchi kuni, qolgan yo'lning ${M(tf(p.n2, p.d2))} qismini ikkinchi kuni bosib o'tdi. Uchinchi kuni qolgan ${mi(rest2)} km ni o'tdi. ${p.mode === 'total' ? "Butun yo'l necha km?" : 'Ikkinchi kuni necha km yurgan?'}`,
        `Турист в первый день прошёл ${M(tf(p.n1, p.d1))} всего пути, во второй день — ${M(tf(p.n2, p.d2))} оставшегося пути, а в третий день — оставшиеся ${mi(rest2)} км. ${p.mode === 'total' ? 'Сколько километров весь путь?' : 'Сколько километров он прошёл во второй день?'}`,
        `Turist pútkil joldıń ${M(tf(p.n1, p.d1))} bólegin birinshi kúni, qalǵan joldıń ${M(tf(p.n2, p.d2))} bólegin ekinshi kúni ótti. Úshinshi kúni qalǵan ${mi(rest2)} km di ótti. ${p.mode === 'total' ? 'Pútkil jol neshe km?' : 'Ekinshi kúni neshe km júrdi?'}`, // kaa: tekshirilsin
        `A tourist covered ${M(tf(p.n1, p.d1))} of the whole route on day one, ${M(tf(p.n2, p.d2))} of the remaining route on day two, and the remaining ${mi(rest2)} km on day three. ${p.mode === 'total' ? 'How many km is the whole route?' : 'How many km did the tourist cover on day two?'}`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, p.mode === 'total' ? wrongTotal : wrongSecond, { min: 1 }),
      sol: L(
        `Birinchi kundan keyin ${M(tf(p.d1 - p.n1, p.d1))} qoladi, ikkinchi kundan keyin esa ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.d2 - p.n2, p.d2)}`)} qismi. Bu ${rest2} km ga teng. Butun yo'l ${mi(total)} km${p.mode === 'second' ? `, ikkinchi kuni ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.n2, p.d2)}\\cdot ${total}=${day2}`)} km` : ''}.`,
        `После первого дня остаётся ${M(tf(p.d1 - p.n1, p.d1))}, после второго — ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.d2 - p.n2, p.d2)}`)} всего пути. Это ${rest2} км. Весь путь ${mi(total)} км${p.mode === 'second' ? `, во второй день ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.n2, p.d2)}\\cdot ${total}=${day2}`)} км` : ''}.`,
        `Birinshi kúnnen keyin ${M(tf(p.d1 - p.n1, p.d1))} qaladı, ekinshi kúnnen keyin ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.d2 - p.n2, p.d2)}`)} bólegi. Bul ${rest2} km ge teń. Pútkil jol ${mi(total)} km${p.mode === 'second' ? `, ekinshi kúni ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.n2, p.d2)}\\cdot ${total}=${day2}`)} km` : ''}.`, // kaa: tekshirilsin
        `After day one ${M(tf(p.d1 - p.n1, p.d1))} remains, after day two ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.d2 - p.n2, p.d2)}`)} of the route. That is ${rest2} km. The whole route is ${mi(total)} km${p.mode === 'second' ? `, on day two ${M(`${tf(p.d1 - p.n1, p.d1)}\\cdot ${tf(p.n2, p.d2)}\\cdot ${total}=${day2}`)} km` : ''}.`,
      ),
      mis: L(
        "Ikkinchi kasrni butun yo'ldan olish (u qolgan yo'ldan olinadi); kasrlarni qo'shib, $1$ dan ayirish.",
        'Брать вторую дробь от всего пути (она берётся от остатка); складывать дроби и вычитать из $1$.',
        "Ekinshi bólshekti pútkil joldan alıw (ol qalǵan joldan alınadı); bólshekterdi qosıp, $1$ den ayırıw.", // kaa: tekshirilsin
        'Taking the second fraction of the whole route (it is of the remainder); adding the fractions and subtracting from $1$.',
      ),
    };
  },
);

// --- 5: o'nli kasrlar bilan amallar tartibi (L1) ---
interface DecOpP {
  A: number;
  B: number;
  D: number;
  Q: number;
  sign: 1 | -1;
}
y1T<DecOpP>(
  'ar-decimal',
  5,
  'L1',
  90,
  (r) => ({ A: r.int(3, 59), B: r.int(3, 59), D: r.pick([2, 4, 5, 8, 12, 15, 25]), Q: r.int(3, 40), sign: r.pick([1, -1] as const) }),
  (p) => {
    // (A/10)(B/10) +- C : D, bunda D = p.D/10 va C = D * (Q/10)
    const x = frac(p.A, 10);
    const y = frac(p.B, 10);
    const Dd = frac(p.D, 10);
    const q = frac(p.Q, 10);
    const C = fMul(Dd, q);
    const prod = fMul(x, y);
    const ans = p.sign === 1 ? fAdd(prod, q) : fSub(prod, q);
    need(ans.n > 0 && isTerminating(C));
    const leftToRight = p.sign === 1 ? fDiv(fAdd(prod, C), Dd) : fDiv(fSub(prod, C), Dd);
    const wrong = [fMul(ans, frac(10)), fMul(ans, frac(1, 10)), leftToRight, p.sign === 1 ? fAdd(prod, C) : fSub(prod, C), p.sign === 1 ? fSub(prod, q) : fAdd(prod, q)];
    const dd = (f: Frac) => texDec(f);
    const sg = p.sign === 1 ? '+' : '-';
    const expr = `${dd(x)}\\cdot ${dd(y)}${sg}${dd(C)}:${dd(Dd)}`;
    return {
      stem: L(`${M(expr)} ni hisoblang.`, `Вычислите: ${M(expr)}.`, `${M(expr)} di esaplań.`, `Evaluate ${M(expr)}.`), // kaa: tekshirilsin
      correct: md(ans),
      wrong: decWrong(ans, wrong),
      sol: L(
        `Amallar tartibi: avval ko'paytirish va bo'lish. ${M(`${dd(x)}\\cdot ${dd(y)}=${dd(prod)}`)}, ${M(`${dd(C)}:${dd(Dd)}=${dd(q)}`)}. Natija: ${M(`${dd(prod)}${sg}${dd(q)}=${dd(ans)}`)}.`,
        `Порядок действий: сначала умножение и деление. ${M(`${dd(x)}\\cdot ${dd(y)}=${dd(prod)}`)}, ${M(`${dd(C)}:${dd(Dd)}=${dd(q)}`)}. Итог: ${M(`${dd(prod)}${sg}${dd(q)}=${dd(ans)}`)}.`,
        `Ámeller tártibi: aldın kóbeytiw hám bóliw. ${M(`${dd(x)}\\cdot ${dd(y)}=${dd(prod)}`)}, ${M(`${dd(C)}:${dd(Dd)}=${dd(q)}`)}. Nátiyje: ${M(`${dd(prod)}${sg}${dd(q)}=${dd(ans)}`)}.`, // kaa: tekshirilsin
        `Order of operations: multiplication and division first. ${M(`${dd(x)}\\cdot ${dd(y)}=${dd(prod)}`)}, ${M(`${dd(C)}:${dd(Dd)}=${dd(q)}`)}. Result: ${M(`${dd(prod)}${sg}${dd(q)}=${dd(ans)}`)}.`,
      ),
      mis: L(
        "Amallarni chapdan o'ngga tartib bilan bajarish (ko'paytirish/bo'lish qo'shish/ayirishdan oldin); vergulni noto'g'ri joyga qo'yish.",
        'Выполнять действия слева направо (умножение и деление выполняются раньше сложения и вычитания); неверно ставить запятую.',
        "Ámelerdi shepten ońǵa tártip penen orınlaw (kóbeytiw/bóliw qosıw/ayırıwdan burın); útirdi qate jerge qoyıw.", // kaa: tekshirilsin
        'Going strictly left to right (multiplication and division come before addition and subtraction); misplacing the decimal comma.',
      ),
    };
  },
);

// --- 5: davriy o'nli kasrlar bilan amal (L2) ---
interface Per {
  pre: string;
  rep: string;
}
interface PeriodicP {
  x: Per;
  y: Per;
  op: '+' | '-' | '*';
}
const perFrac = (s: Per): Frac => frac(Number(s.pre + s.rep) - (s.pre ? Number(s.pre) : 0), 10 ** s.pre.length * (10 ** s.rep.length - 1));
const perTex = (s: Per): string => `0{,}${s.pre}(${s.rep})`;
/** davrni tashlab (tipik xato): 0,(3) -> 0,3 */
const perTrunc = (s: Per): Frac => frac(Number(s.pre + s.rep), 10 ** (s.pre.length + s.rep.length));
y1T<PeriodicP>(
  'ar-periodic',
  5,
  'L2',
  120,
  (r) => {
    const mk = (): Per => ({ pre: r.chance(0.4) ? String(r.int(0, 9)) : '', rep: String(r.int(1, 99)).padStart(r.pick([1, 2]), '0') });
    return { x: mk(), y: mk(), op: r.pick(['+', '-', '*'] as const) };
  },
  (p) => {
    need(!/^9+$/.test(p.x.rep) && !/^9+$/.test(p.y.rep) && !/^0+$/.test(p.x.rep) && !/^0+$/.test(p.y.rep));
    need(p.x.pre + p.x.rep !== p.y.pre + p.y.rep);
    const fx = perFrac(p.x);
    const fy = perFrac(p.y);
    const ans = p.op === '+' ? fAdd(fx, fy) : p.op === '-' ? fSub(fx, fy) : fMul(fx, fy);
    need(ans.n > 0 && ans.d <= 3000);
    const tx = perTrunc(p.x);
    const ty = perTrunc(p.y);
    const trunc = p.op === '+' ? fAdd(tx, ty) : p.op === '-' ? fSub(tx, ty) : fMul(tx, ty);
    const tenth = (s: Per) => frac(Number(s.pre + s.rep), 10 ** s.rep.length * 10 ** s.pre.length);
    const w2 = p.op === '+' ? fAdd(tenth(p.x), tenth(p.y)) : p.op === '-' ? fSub(tenth(p.x), tenth(p.y)) : fMul(tenth(p.x), tenth(p.y));
    const sym = p.op === '*' ? '\\cdot ' : p.op;
    const expr = `${perTex(p.x)}${sym}${perTex(p.y)}`;
    const ft = (s: Per) => texFrac(perFrac(s));
    return {
      stem: L(
        `${M(expr)} ni oddiy kasr ko'rinishida yozing.`,
        `Запишите ${M(expr)} в виде обыкновенной дроби.`,
        `${M(expr)} di ápiwayı bólshek kórinisinde jazıń.`, // kaa: tekshirilsin
        `Write ${M(expr)} as a common fraction.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, [trunc, w2, safeFrac(fx.n + fy.n, fx.d + fy.d)]),
      sol: L(
        `Davriy kasrlarni oddiy kasrga aylantiramiz: ${M(`${perTex(p.x)}=${ft(p.x)}`)}, ${M(`${perTex(p.y)}=${ft(p.y)}`)}. Amal: ${M(`${ft(p.x)}${sym}${ft(p.y)}=${texFrac(ans)}`)}.`,
        `Переводим периодические дроби в обыкновенные: ${M(`${perTex(p.x)}=${ft(p.x)}`)}, ${M(`${perTex(p.y)}=${ft(p.y)}`)}. Действие: ${M(`${ft(p.x)}${sym}${ft(p.y)}=${texFrac(ans)}`)}.`,
        `Dáwirli bólshekterdi ápiwayı bólshekke aylandıramız: ${M(`${perTex(p.x)}=${ft(p.x)}`)}, ${M(`${perTex(p.y)}=${ft(p.y)}`)}. Ámel: ${M(`${ft(p.x)}${sym}${ft(p.y)}=${texFrac(ans)}`)}.`, // kaa: tekshirilsin
        `Convert the repeating decimals to fractions: ${M(`${perTex(p.x)}=${ft(p.x)}`)}, ${M(`${perTex(p.y)}=${ft(p.y)}`)}. Operation: ${M(`${ft(p.x)}${sym}${ft(p.y)}=${texFrac(ans)}`)}.`,
      ),
      mis: L(
        "Davrni tashlab yuborib, kasrni oddiy o'nli kasr deb hisoblash; maxrajda $10^k$ o'rniga $10^k-1$ ni olishni unutish.",
        'Отбросить период и считать дробь обычной десятичной; в знаменателе брать $10^k$ вместо $10^k-1$.',
        "Dáwirdi taslap, bólshekti ápiwayı onlıq bólshek dep esaplaw; bólimde $10^k-1$ ornına $10^k$ nı alıw.", // kaa: tekshirilsin
        'Dropping the period and treating the number as an ordinary decimal; using $10^k$ instead of $10^k-1$ in the denominator.',
      ),
    };
  },
);

// --- 6: modulli sonli ifoda (L1) ---
interface AbsExprP {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}
y1T<AbsExprP>(
  'ar-abs',
  6,
  'L1',
  80,
  (r) => ({ a: r.int(-12, 12), b: r.int(-9, 9), c: r.int(-9, 9), d: r.int(-6, 6), e: r.int(-9, 9), f: r.int(-9, 9) }),
  (p) => {
    need(p.a !== 0 && p.d !== 0 && p.b !== p.c && p.e + p.f !== 0 && Math.abs(p.e + p.f) !== 1 && (p.a < 0 || p.b < p.c || p.e + p.f < 0 || p.d < 0));
    const ans = Math.abs(p.a) - Math.abs(p.b - p.c) + Math.abs(p.d) * Math.abs(p.e + p.f);
    const noAbs = p.a - (p.b - p.c) + p.d * (p.e + p.f);
    const ltr = (Math.abs(p.a) - Math.abs(p.b - p.c) + Math.abs(p.d)) * Math.abs(p.e + p.f);
    const lastOnly = p.a - Math.abs(p.b - p.c) + p.d * Math.abs(p.e + p.f);
    const expr = `|${p.a}|-|${p.b}${p.c <= 0 ? '+' : '-'}${Math.abs(p.c)}|+|${p.d}|\\cdot|${p.e}${p.f < 0 ? '-' : '+'}${Math.abs(p.f)}|`;
    const opened = `${Math.abs(p.a)}-${Math.abs(p.b - p.c)}+${Math.abs(p.d)}\\cdot ${Math.abs(p.e + p.f)}`;
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mi(ans),
      wrong: intWrong(ans, [noAbs, ltr, lastOnly, -ans]),
      sol: L(
        `Har bir modulni alohida ochamiz: ${M(opened)}. Ko'paytirishni birinchi bajaramiz: ${mi(ans)}.`,
        `Раскрываем каждый модуль отдельно: ${M(opened)}. Сначала умножение: ${mi(ans)}.`,
        `Hár bir moduldı bólek ashamız: ${M(opened)}. Kóbeytiwdi birinshi orınlaymız: ${mi(ans)}.`, // kaa: tekshirilsin
        `Evaluate each absolute value separately: ${M(opened)}. Multiply first: ${mi(ans)}.`,
      ),
      mis: L(
        "Modul ichidagi amalni bajargach, belgisini tashlashni unutish yoki modulsiz hisoblash.",
        'Забыть отбросить знак после вычисления в модуле; считать без модуля.',
        'Modul ishindegi ámeldi orınlap bolǵannan keyin belgisin taslawdı umıtıw yamasa modulsiz esaplaw.', // kaa: tekshirilsin
        'Forgetting to drop the sign after evaluating inside the absolute value, or ignoring the bars.',
      ),
    };
  },
);

// --- 6: sonlarni taqqoslash (L2) ---
interface OrderP {
  vals: Frac[];
  dec: boolean[];
  mode: 'max' | 'min';
}
const showNum = (f: Frac, dec: boolean): string => {
  const neg = f.n < 0;
  const a = frac(Math.abs(f.n), f.d);
  const body = dec && isTerminating(a) && a.d <= 100 ? texDec(a) : texFrac(a);
  return neg ? `-${body}` : body;
};
y1T<OrderP>(
  'ar-order',
  6,
  'L2',
  90,
  (r) => {
    const sign = r.pick([-1, 1, 0]);
    const vals: Frac[] = [];
    while (vals.length < 4) {
      const d = r.pick([3, 4, 5, 6, 7, 8, 9, 10, 12, 20]);
      const n = r.int(1, d + Math.floor(d / 2));
      const s = sign === 0 ? r.pick([-1, 1]) : sign;
      vals.push(frac(s * n, d));
    }
    return { vals, dec: vals.map(() => r.chance(0.5)), mode: r.pick(['max', 'min'] as const) };
  },
  (p) => {
    const v = p.vals.map(fracVal);
    need(new Set(v.map((x) => Math.round(x * 1e6))).size === 4);
    const sorted = [...v].sort((a, b) => a - b);
    need(sorted[1]! - sorted[0]! > 0.01 && sorted[2]! - sorted[1]! > 0.01 && sorted[3]! - sorted[2]! > 0.01);
    const texts = p.vals.map((f, i) => showNum(f, p.dec[i]!));
    need(new Set(texts).size === 4);
    const idx = p.mode === 'max' ? v.indexOf(sorted[3]!) : v.indexOf(sorted[0]!);
    const ord = [...texts.keys()].sort((a, b) => v[a]! - v[b]!).map((i) => texts[i]!).join('<');
    return {
      stem: L(
        `Quyidagi sonlardan qaysi biri eng ${p.mode === 'max' ? 'katta' : 'kichik'}?`,
        `Какое из чисел ${p.mode === 'max' ? 'наибольшее' : 'наименьшее'}?`,
        `Tómendegi sanlardan qaysısı eń ${p.mode === 'max' ? 'úlken' : 'kishi'}?`, // kaa: tekshirilsin
        `Which of the following numbers is the ${p.mode === 'max' ? 'largest' : 'smallest'}?`,
      ),
      correct: M(texts[idx]!),
      wrong: texts.filter((_, i) => i !== idx).map(M),
      sol: L(
        `Sonlarni o'nli kasrga aylantirib taqqoslaymiz: ${M(ord)}. Eng ${p.mode === 'max' ? 'katta' : 'kichik'}: ${M(texts[idx]!)}.`,
        `Сравним числа, записав их в виде десятичных дробей: ${M(ord)}. ${p.mode === 'max' ? 'Наибольшее' : 'Наименьшее'}: ${M(texts[idx]!)}.`,
        `Sanlardı onlıq bólshekke aylandırıp salıstıramız: ${M(ord)}. Eń ${p.mode === 'max' ? 'úlkeni' : 'kishisi'}: ${M(texts[idx]!)}.`, // kaa: tekshirilsin
        `Compare the numbers as decimals: ${M(ord)}. The ${p.mode === 'max' ? 'largest' : 'smallest'} is ${M(texts[idx]!)}.`,
      ),
      mis: L(
        "Manfiy sonlarda moduli kattasi kichik bo'lishini unutish; maxraji kattaroq kasrni kattaroq deb o'ylash.",
        'Забыть, что среди отрицательных чисел меньше то, у которого модуль больше; считать дробь с большим знаменателем большей.',
        "Teris sanlarda moduli úlkeni kishi bolıwın umıtıw; bólimi úlkenirek bólshekti úlkenirek dep oylaw.", // kaa: tekshirilsin
        'Forgetting that among negative numbers the one with the larger modulus is smaller; assuming a larger denominator means a larger fraction.',
      ),
    };
  },
);

// --- 9: teleskopik yig'indi (L2) ---
interface TeleP {
  c: number;
  a: number;
  d: number;
  n: number;
}
y1T<TeleP>(
  'ar-telescope',
  9,
  'L2',
  120,
  (r) => ({ c: r.int(1, 6), a: r.int(1, 6), d: r.int(1, 4), n: r.int(5, 40) }),
  (p) => {
    const q = (k: number) => p.a + k * p.d;
    // yopiq formula: S = (c/d)(1/a - 1/(a+nd))
    const ans = fMul(frac(p.c, p.d), fSub(frac(1, p.a), frac(1, q(p.n))));
    need(ans.d <= 2000);
    const term = (k: number) => `\\frac{${p.c}}{${q(k)}\\cdot ${q(k + 1)}}`;
    const expr = `${term(0)}+${term(1)}+${term(2)}+\\ldots+${term(p.n - 1)}`;
    const wrong = [
      fMul(frac(p.c, p.d), frac(1, p.a)),
      fSub(frac(p.c, p.a), frac(p.c, q(p.n))),
      fMul(frac(p.c, p.d), fAdd(frac(1, p.a), frac(1, q(p.n)))),
      frac(p.n * p.c, q(0) * q(1)),
    ];
    const gen = M(`\\frac{c}{x(x+d)}=\\frac{c}{d}\\left(\\frac{1}{x}-\\frac{1}{x+d}\\right)`);
    const fin = M(`S=\\frac{${p.c}}{${p.d}}\\left(\\frac{1}{${q(0)}}-\\frac{1}{${q(p.n)}}\\right)=${texFrac(ans)}`);
    return {
      stem: L(
        `${M(expr)} yig'indini hisoblang (yig'indida ${mi(p.n)} ta qo'shiluvchi bor).`,
        `Вычислите сумму ${M(expr)} (всего ${mi(p.n)} слагаемых).`,
        `${M(expr)} qosındısın esaplań (qosındıda ${mi(p.n)} qosılıwshı bar).`, // kaa: tekshirilsin
        `Evaluate the sum ${M(expr)} (there are ${mi(p.n)} terms).`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Har bir hadni ${gen} ko'rinishda yozamiz: oraliq hadlar qisqaradi. ${fin}.`,
        `Представим каждое слагаемое как ${gen}: средние члены сокращаются. ${fin}.`,
        `Hár bir aǵzanı ${gen} kórinisinde jazamız: aralıq aǵzalar qısqaradı. ${fin}.`, // kaa: tekshirilsin
        `Write each term as ${gen}: the middle terms cancel. ${fin}.`,
      ),
      mis: L(
        "Ayirma $d$ ga bo'lishni unutish; qisqarishdan keyin faqat birinchi qoldig'ini olish yoki oxirgi had ishorasini adashtirish.",
        'Забыть делить на $d$; после сокращения оставить только первое слагаемое или перепутать знак последнего.',
        "Ayırma $d$ ǵa bóliwdi umıtıw; qısqarıwdan keyin tek birinshi qaldıqtı alıw yamasa sońǵı aǵza belgisin shatastırıw.", // kaa: tekshirilsin
        'Forgetting to divide by $d$; keeping only the first term after cancellation or mixing up the sign of the last term.',
      ),
    };
  },
);

// --- 10: standart shakldagi sonlar ko'paytmasi/bo'linmasi (L2) ---
interface SciP {
  m1: number;
  e1: number;
  m2: number;
  e2: number;
  op: 'mul' | 'div';
}
const sciTex = (mant: Frac, e: number): string => `${texDec(mant)}\\cdot 10^{${e}}`;
y1T<SciP>(
  'ar-sci',
  10,
  'L2',
  100,
  (r) => ({ m1: r.int(11, 99), e1: r.int(-6, 9), m2: r.int(11, 99), e2: r.int(-6, 9), op: r.pick(['mul', 'div'] as const) }),
  (p) => {
    // mantissalar m/10 (1 <= m/10 < 10)
    let M0 = p.op === 'mul' ? frac(p.m1 * p.m2, 100) : frac(p.m1, p.m2);
    let E = p.op === 'mul' ? p.e1 + p.e2 : p.e1 - p.e2;
    while (fracVal(M0) >= 10) {
      M0 = fDiv(M0, frac(10));
      E += 1;
    }
    while (fracVal(M0) < 1) {
      M0 = fMul(M0, frac(10));
      E -= 1;
    }
    need(isTerminating(M0) && M0.d <= 100 && M0.d !== 1 && Math.abs(E) <= 14 && p.e1 !== p.e2);
    const a = frac(p.m1, 10);
    const b = frac(p.m2, 10);
    const raw = p.op === 'mul' ? p.e1 + p.e2 : p.e1 - p.e2;
    const other = p.op === 'mul' ? fAdd(a, b) : fSub(a, b);
    const wrong = [
      sciTex(M0, E + 1),
      sciTex(M0, E - 1),
      sciTex(M0, p.op === 'mul' ? p.e1 * p.e2 : p.e1 + p.e2),
      isTerminating(other) && fracVal(other) >= 1 && fracVal(other) < 10 ? sciTex(other, raw) : sciTex(M0, E + 2),
    ];
    const x = `(${texDec(a)}\\cdot 10^{${p.e1}})`;
    const y = `(${texDec(b)}\\cdot 10^{${p.e2}})`;
    const expr = `${x}${p.op === 'mul' ? '\\cdot ' : ':'}${y}`;
    const std = M('a\\cdot 10^{n},\\ 1\\le a<10');
    const mant = p.op === 'mul' ? M(`${texDec(a)}\\cdot ${texDec(b)}=${texDec(fMul(a, b))}`) : M(`${texDec(a)}:${texDec(b)}=${texDec(fDiv(a, b))}`);
    const expo = M(`${p.e1}${p.op === 'mul' ? '+' : '-'}(${p.e2})=${raw}`);
    return {
      stem: L(
        `${M(expr)} ifodaning qiymatini standart shaklda (${std}) yozing.`,
        `Запишите значение выражения ${M(expr)} в стандартном виде (${std}).`,
        `${M(expr)} ańlatpanıń mánisin standart kórinisinde (${std}) jazıń.`, // kaa: tekshirilsin
        `Write the value of ${M(expr)} in standard form (${std}).`,
      ),
      correct: M(sciTex(M0, E)),
      wrong: uniq(wrong).map(M),
      sol: L(
        `Mantissalar va darajalarni alohida hisoblaymiz: ${mant}; daraja ko'rsatkichlari ${p.op === 'mul' ? "qo'shiladi" : 'ayriladi'}: ${expo}. Natijani standart shaklga keltiramiz: ${M(sciTex(M0, E))}.`,
        `Отдельно считаем мантиссы и степени: ${mant}; показатели ${p.op === 'mul' ? 'складываются' : 'вычитаются'}: ${expo}. Приводим к стандартному виду: ${M(sciTex(M0, E))}.`,
        `Mantissalar hám dárejelerdi bólek esaplaymız: ${mant}; dáreje kórsetkishleri ${p.op === 'mul' ? 'qosıladı' : 'ayırıladı'}: ${expo}. Nátiyjeni standart kórinisine keltiremiz: ${M(sciTex(M0, E))}.`, // kaa: tekshirilsin
        `Handle mantissas and powers separately: ${mant}; the exponents ${p.op === 'mul' ? 'add' : 'subtract'}: ${expo}. Normalise to standard form: ${M(sciTex(M0, E))}.`,
      ),
      mis: L(
        "Mantissa $10$ dan katta yoki $1$ dan kichik chiqsa, daraja ko'rsatkichini moslashtirishni unutish; ko'rsatkichlarni ko'paytirish.",
        'Не скорректировать показатель степени, когда мантисса получилась не меньше $10$ или меньше $1$; перемножать показатели.',
        "Mantissa $10$ nan úlken yamasa $1$ den kishi shıqsa, dáreje kórsetkishin sáykeslestiriwdi umıtıw; kórsetkishlerdi kóbeytiw.", // kaa: tekshirilsin
        'Not adjusting the exponent when the mantissa is at least $10$ or below $1$; multiplying the exponents.',
      ),
    };
  },
);

// --- 10: mutlaq va nisbiy xatolik (O, L2) ---
interface RelErrP {
  X: number;
  delta: Frac;
  sign: 1 | -1;
}
oT<RelErrP>(
  'ar-relerr',
  10,
  'L2',
  120,
  (r) => ({ X: r.pick([20, 25, 40, 50, 80, 125, 200, 250, 400, 500, 800]), delta: frac(r.int(1, 12), r.pick([1, 2, 2, 4])), sign: r.pick([1, -1] as const) }),
  (p) => {
    const meas = p.sign === 1 ? fAdd(frac(p.X), p.delta) : fSub(frac(p.X), p.delta);
    need(fracVal(p.delta) <= p.X / 10 && isTerminating(meas) && fracVal(p.delta) >= 0.5);
    const rel = fMul(fDiv(p.delta, frac(p.X)), frac(100));
    need(isTerminating(rel));
    const dl = texDec(p.delta);
    const calcA = M(`|${texDec(meas)}-${p.X}|=${dl}`);
    const calcB = M(`\\frac{${dl}}{${p.X}}\\cdot 100\\%=${texDec(rel)}\\%`);
    return {
      stem: L(
        `Detalning haqiqiy uzunligi ${mi(p.X)} mm, o'lchash natijasi esa ${md(meas)} mm.`,
        `Истинная длина детали ${mi(p.X)} мм, а результат измерения ${md(meas)} мм.`,
        `Detaldıń haqıyqıy uzınlıǵı ${mi(p.X)} mm, al ólshew nátiyjesi ${md(meas)} mm.`, // kaa: tekshirilsin
        `The true length of a part is ${mi(p.X)} mm and the measurement gives ${md(meas)} mm.`,
      ),
      a: { prompt: L('Mutlaq xatolikni (mm) toping.', 'Найдите абсолютную погрешность (в мм).', 'Absolyut qátelikti (mm) tabıń.', 'Find the absolute error (in mm).'), key: p.delta, hint: true }, // kaa: tekshirilsin
      b: { prompt: L('Nisbiy xatolikni foizda toping.', 'Найдите относительную погрешность в процентах.', 'Salıstırmalı qátelikti procentte tabıń.', 'Find the relative error as a percentage.'), key: rel, hint: true }, // kaa: tekshirilsin
      sol: L(
        `a) Mutlaq xatolik ${calcA} mm. b) Nisbiy xatolik ${calcB}.`,
        `а) Абсолютная погрешность ${calcA} мм. б) Относительная погрешность ${calcB}.`,
        `a) Absolyut qátelik ${calcA} mm. b) Salıstırmalı qátelik ${calcB}.`, // kaa: tekshirilsin
        `a) Absolute error ${calcA} mm. b) Relative error ${calcB}.`,
      ),
      mis: L(
        "Nisbiy xatolikni o'lchangan qiymatga bo'lish (haqiqiy qiymatga bo'linadi) yoki foizga o'tkazishni unutish.",
        'Делить на измеренное значение (нужно делить на истинное) или забыть перевести в проценты.',
        "Salıstırmalı qátelikti ólshengen mániske bóliw (haqıyqıy mániske bólinedi) yamasa procentke ótkeriwdi umıtıw.", // kaa: tekshirilsin
        'Dividing by the measured value (one divides by the true value) or forgetting to convert to percent.',
      ),
    };
  },
);

// --- 11: ikki ildiz orasidagi butun sonlar (L1) ---
interface BetweenP {
  a: number;
  b: number;
  kind: 'sqrt' | 'cbrt';
}
y1T<BetweenP>(
  'ar-between',
  11,
  'L1',
  80,
  (r) => {
    const kind = r.pick(['sqrt', 'cbrt'] as const);
    const a = r.int(3, kind === 'sqrt' ? 60 : 80);
    return { a, b: a + (kind === 'sqrt' ? r.int(25, 220) : r.int(90, 900)), kind };
  },
  (p) => {
    const e = p.kind === 'sqrt' ? 2 : 3;
    const ints = range(1, 40).filter((k) => k ** e > p.a && k ** e < p.b);
    need(ints.length >= 3);
    const ans = ints.length;
    const lo = Math.floor(Math.pow(p.a, 1 / e));
    const hi = Math.floor(Math.pow(p.b, 1 / e));
    const rt = p.kind === 'sqrt' ? '\\sqrt' : '\\sqrt[3]';
    const rA = `${rt}{${p.a}}`;
    const rB = `${rt}{${p.b}}`;
    const ineq = M(`${lo}<${rA}<${lo + 1}`);
    const ineq2 = M(`${hi}<${rB}<${hi + 1}`);
    const lst = M(`${ints[0]},\\ldots,${ints[ints.length - 1]}`);
    return {
      stem: L(
        `${M(rA)} va ${M(rB)} sonlari orasida nechta butun son bor?`,
        `Сколько целых чисел расположено между числами ${M(rA)} и ${M(rB)}?`,
        `${M(rA)} hám ${M(rB)} sanları arasında neshe pútin san bar?`, // kaa: tekshirilsin
        `How many integers lie between ${M(rA)} and ${M(rB)}?`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, [hi - lo, hi - lo + 1, hi, ans - 1], { min: 0 }),
      sol: L(
        `${ineq} va ${ineq2}, demak butun sonlar ${lst}: ${mi(ans)} ta.`,
        `${ineq} и ${ineq2}, значит целые числа ${lst}: ${mi(ans)} шт.`,
        `${ineq} hám ${ineq2}, demek pútin sanlar ${lst}: ${mi(ans)} dana.`, // kaa: tekshirilsin
        `${ineq} and ${ineq2}, so the integers are ${lst}: ${mi(ans)} of them.`,
      ),
      mis: L(
        "Ildiz ostidagi sonlar orasidagi butun sonlarni sanash (ildizlarning o'zi orasida sanash kerak); chegaralarni xato yaxlitlash.",
        'Считать целые числа между подкоренными выражениями (нужно — между самими корнями); неверно округлять границы.',
        "Tamır astındaǵı sanlar arasındaǵı pútin sanlardı sanaw (tamırlardıń ózi arasında sanaw kerek); shegaralardı qate jýiklew.", // kaa: tekshirilsin
        'Counting integers between the radicands (one must count between the roots themselves); rounding the bounds incorrectly.',
      ),
    };
  },
);

// --- 11: eng yaqin butun son (L2) ---
interface NearestP {
  kind: 'sum' | 'mix' | 'cbrt';
  a: number;
  b: number;
}
const isSquare = (n: number): boolean => Number.isInteger(Math.sqrt(n));
const isCube = (n: number): boolean => Math.round(Math.cbrt(n)) ** 3 === n;
y1T<NearestP>(
  'ar-nearest',
  11,
  'L2',
  100,
  (r) => ({ kind: r.pick(['sum', 'mix', 'cbrt'] as const), a: r.int(2, 90), b: r.int(2, 90) }),
  (p) => {
    let val: number;
    let expr: string;
    if (p.kind === 'sum') {
      need(!isSquare(p.a) && !isSquare(p.b) && p.a !== p.b);
      val = Math.sqrt(p.a) + Math.sqrt(p.b);
      expr = `\\sqrt{${p.a}}+\\sqrt{${p.b}}`;
    } else if (p.kind === 'mix') {
      need(!isSquare(p.a) && !isCube(p.b) && p.b > 3 && p.a > 3);
      val = Math.sqrt(p.a) * Math.cbrt(p.b);
      expr = `\\sqrt{${p.a}}\\cdot\\sqrt[3]{${p.b}}`;
    } else {
      const N = p.a * 7 + p.b;
      need(!isCube(N) && N > 9);
      val = Math.cbrt(N);
      expr = `\\sqrt[3]{${N}}`;
    }
    need(Math.abs(val - Math.floor(val) - 0.5) > 0.07);
    const ans = Math.round(val);
    const approx = M(String(Math.round(val * 100) / 100));
    return {
      stem: L(`${M(expr)} ga eng yaqin butun sonni toping.`, `Найдите целое число, ближайшее к ${M(expr)}.`, `${M(expr)} ge eń jaqın pútin sandı tabıń.`, `Find the integer nearest to ${M(expr)}.`), // kaa: tekshirilsin
      correct: mi(ans),
      wrong: intWrong(ans, [Math.floor(val) === ans ? ans + 1 : Math.floor(val), ans - 1, ans + 2, ans + 1], { min: 1 }),
      sol: L(
        `Ildizlarni butun sonlar orasiga joylab baholaymiz: ifoda taxminan ${approx} ga teng. Eng yaqin butun son ${mi(ans)}.`,
        `Оцениваем корни, помещая их между целыми числами: значение выражения примерно ${approx}. Ближайшее целое — ${mi(ans)}.`,
        `Tamırlardı pútin sanlar arasına jaylastırıp bahalaymız: ańlatpanıń mánisi shama menen ${approx} ge teń. Eń jaqın pútin san ${mi(ans)}.`, // kaa: tekshirilsin
        `Estimate the roots by placing them between integers: the value is about ${approx}. The nearest integer is ${mi(ans)}.`,
      ),
      mis: L(
        "Ildizlarni butun qismigacha qisqartirib, ularni qo'shish (kasr qismlarni hisobga olmaslik); yuqoriga/pastga yaxlitlashda adashish.",
        'Отбросить дробные части корней и сложить целые части; ошибиться при округлении вверх/вниз.',
        "Tamırlardıń bólshek bólimlerin taslap, pútin bólimlerin qosıw; joqarı/tómen jýiklewde adasıw.", // kaa: tekshirilsin
        'Dropping the fractional parts of the roots and adding only the integer parts; rounding the wrong way.',
      ),
    };
  },
);

// --- 104: kompleks sonlar ---
const cx = (a: number, b: number): string => complexTex(frac(a), frac(b));
const cmul = (a: number, b: number, c: number, d: number): [number, number] => [a * c - b * d, a * d + b * c];
const cxPar = (a: number, b: number): string => `(${cx(a, b)})`;
const cxMis = L(
  "$i^2=-1$ ni unutish (yoki $i^2=+1$ deb olish); ishoralarni adashtirish.",
  'Забыть, что $i^2=-1$ (или считать $i^2=+1$); ошибиться в знаках.',
  '$i^2=-1$ di umıtıw (yamasa $i^2=+1$ dep alıw); belgilerdi shatastırıw.', // kaa: tekshirilsin
  'Forgetting $i^2=-1$ (or using $i^2=+1$); sign errors.',
);

// --- 104: kompleks sonlar ko'paytmasi (L1) ---
y1T<{ a: number; b: number; c: number; d: number }>(
  'cx-mul',
  104,
  'L1',
  80,
  (r) => ({ a: r.int(-6, 6), b: r.int(-6, 6), c: r.int(-6, 6), d: r.int(-6, 6) }),
  ({ a, b, c, d }) => {
    need(a !== 0 && b !== 0 && c !== 0 && d !== 0 && Math.abs(a) !== 1 && Math.abs(c) !== 1);
    const [re, im] = cmul(a, b, c, d);
    need(re !== 0 && im !== 0);
    const wrong = [cx(a * c + b * d, a * d + b * c), cx(a * c - b * d, a * d - b * c), cx(a * c, b * d), cx(re, -im), cx(a * c - b * d, a * c + b * d)];
    const prod = `${cxPar(a, b)}${cxPar(c, d)}`;
    const calc = M(`(${a}\\cdot ${par(c)}-${par(b)}\\cdot ${par(d)})+(${a}\\cdot ${par(d)}+${par(b)}\\cdot ${par(c)})i=${cx(re, im)}`);
    return {
      stem: L(`${M(prod)} ko'paytmani ${M('x+yi')} ko'rinishda yozing.`, `Запишите произведение ${M(prod)} в виде ${M('x+yi')}.`, `${M(prod)} kóbeymesin ${M('x+yi')} kórinisinde jazıń.`, `Write the product ${M(prod)} in the form ${M('x+yi')}.`), // kaa: tekshirilsin
      correct: M(cx(re, im)),
      wrong: uniq(wrong).map(M),
      sol: L(
        `Qavslarni ochamiz va $i^2=-1$ ni qo'llaymiz: ${calc}.`,
        `Раскрываем скобки и применяем $i^2=-1$: ${calc}.`,
        `Qawıslardı ashamız hám $i^2=-1$ di qollanamız: ${calc}.`, // kaa: tekshirilsin
        `Expand and use $i^2=-1$: ${calc}.`,
      ),
      mis: cxMis,
    };
  },
);

// --- 104: i ning darajalari (L1) ---
y1T<{ exps: number[] }>(
  'cx-ipow',
  104,
  'L1',
  80,
  (r) => ({ exps: Array.from({ length: r.int(3, 4) }, () => r.int(5, 2030)) }),
  ({ exps }) => {
    const val = (n: number): [number, number] => [[1, 0], [0, 1], [-1, 0], [0, -1]][((n % 4) + 4) % 4] as [number, number];
    const total = (shift: number): [number, number] => exps.map((n) => val(n + shift)).reduce((s, v) => [s[0] + v[0], s[1] + v[1]] as [number, number], [0, 0] as [number, number]);
    const [re, im] = total(0);
    need(!(re === 0 && im === 0) && new Set(exps.map((n) => n % 4)).size >= 3);
    const wrong = [total(1), total(-1), [re, -im], [-re, -im], [re + 1, im]] as [number, number][];
    const expr = exps.map((n) => `i^{${n}}`).join('+');
    const cyc = M('i^1=i,\\ i^2=-1,\\ i^3=-i,\\ i^4=1');
    const parts = exps.map((n) => M(`i^{${n}}=${cx(val(n)[0], val(n)[1])}`)).join(', ');
    return {
      stem: L(`${M(expr)} yig'indini ${M('x+yi')} ko'rinishda yozing.`, `Запишите сумму ${M(expr)} в виде ${M('x+yi')}.`, `${M(expr)} qosındısın ${M('x+yi')} kórinisinde jazıń.`, `Write the sum ${M(expr)} in the form ${M('x+yi')}.`), // kaa: tekshirilsin
      correct: M(cx(re, im)),
      wrong: uniq(wrong.map(([a, b]) => cx(a, b))).map(M),
      sol: L(
        `${cyc}: davri $4$ ga teng; daraja ko'rsatkichini $4$ ga bo'lgandagi qoldiq bo'yicha topamiz: ${parts}. Yig'indi: ${M(cx(re, im))}.`,
        `${cyc}: период равен $4$; берём остаток показателя при делении на $4$: ${parts}. Сумма: ${M(cx(re, im))}.`,
        `${cyc}: dáwiri $4$ ke teń; dáreje kórsetkishin $4$ ke bólgendegi qaldıq boyınsha tabamız: ${parts}. Qosındı: ${M(cx(re, im))}.`, // kaa: tekshirilsin
        `${cyc}: the period is $4$; use the remainder of the exponent modulo $4$: ${parts}. Sum: ${M(cx(re, im))}.`,
      ),
      mis: L(
        "Qoldiq $0$ bo'lganda $i^0$ ni $0$ yoki $i$ deb olish ($i^4=1$); daraja ko'rsatkichining o'zini $4$ ga bo'lishni unutish.",
        'При остатке $0$ считать $i^0$ равным $0$ или $i$ (на самом деле $i^4=1$); забыть брать остаток от деления показателя на $4$.',
        "Qaldıq $0$ bolǵanda $i^0$ di $0$ yamasa $i$ dep alıw ($i^4=1$); dáreje kórsetkishin $4$ ke bóliwdi umıtıw.", // kaa: tekshirilsin
        'Taking $i^0$ as $0$ or $i$ when the remainder is $0$ ($i^4=1$); forgetting to reduce the exponent modulo $4$.',
      ),
    };
  },
);

// --- 104: modul (L2) ---
const TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29], [12, 16, 20], [10, 24, 26], [15, 8, 17]];
interface CxModP {
  kind: 'mul' | 'div' | 'pow';
  z1: [number, number];
  z2: [number, number];
  n: number;
}
y1T<CxModP>(
  'cx-mod',
  104,
  'L2',
  100,
  (r) => {
    const pick = (): [number, number] => {
      const [x, y] = r.pick(TRIPLES);
      const [u, v] = r.chance(0.5) ? [x, y] : [y, x];
      return [r.pick([-1, 1]) * u, r.pick([-1, 1]) * v];
    };
    return { kind: r.pick(['mul', 'div', 'pow'] as const), z1: pick(), z2: pick(), n: r.int(2, 3) };
  },
  (p) => {
    const r1 = Math.round(Math.hypot(p.z1[0], p.z1[1]));
    const r2 = Math.round(Math.hypot(p.z2[0], p.z2[1]));
    need(r1 !== r2);
    let ans: Frac;
    let expr: string;
    let wrong: (Frac | null)[];
    const A = cxPar(p.z1[0], p.z1[1]);
    const B = cxPar(p.z2[0], p.z2[1]);
    if (p.kind === 'mul') {
      ans = frac(r1 * r2);
      expr = `\\left|${A}${B}\\right|`;
      wrong = [frac(r1 + r2), frac(r1 * r2 * r2), frac(r1 * r2 - 1), frac(r1 * r1 * r2 * r2)];
    } else if (p.kind === 'div') {
      ans = frac(r1, r2);
      expr = `\\left|\\frac{${cx(p.z1[0], p.z1[1])}}{${cx(p.z2[0], p.z2[1])}}\\right|`;
      wrong = [frac(r2, r1), frac(r1 * r1, r2 * r2), frac(r1 - r2), safeFrac(r1, r2 * r2)];
    } else {
      ans = frac(r1 ** p.n);
      expr = `\\left|${A}^{${p.n}}\\right|`;
      wrong = [frac(r1 * p.n), frac(r1 ** (p.n + 1)), frac(r1 ** (p.n - 1)), frac((p.z1[0] ** 2 + p.z1[1] ** 2) * p.n)];
    }
    const rule = M('|z_1z_2|=|z_1|\\cdot|z_2|,\\ |z_1/z_2|=|z_1|/|z_2|,\\ |z^n|=|z|^n');
    const m1 = M(`|${cx(p.z1[0], p.z1[1])}|=\\sqrt{${p.z1[0] ** 2}+${p.z1[1] ** 2}}=${r1}`);
    const m2 = p.kind === 'pow' ? '' : `, ${M(`|${cx(p.z2[0], p.z2[1])}|=${r2}`)}`;
    return {
      stem: L(`${M(expr)} ni hisoblang.`, `Вычислите ${M(expr)}.`, `${M(expr)} di esaplań.`, `Evaluate ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${rule}. ${m1}${m2}. Javob: ${mf(ans)}.`,
        `${rule}. ${m1}${m2}. Ответ: ${mf(ans)}.`,
        `${rule}. ${m1}${m2}. Juwap: ${mf(ans)}.`, // kaa: tekshirilsin
        `${rule}. ${m1}${m2}. Answer: ${mf(ans)}.`,
      ),
      mis: L(
        "Modulni kvadrat ildizsiz ($a^2+b^2$) qoldirish; ko'paytma modulini qo'shish.",
        'Оставить модуль без корня ($a^2+b^2$); складывать модули вместо перемножения.',
        "Moduldı kvadrat tamırsız ($a^2+b^2$) qaldırıw; kóbeyme modulin qosıw.", // kaa: tekshirilsin
        'Leaving the modulus without the square root ($a^2+b^2$); adding moduli instead of multiplying.',
      ),
    };
  },
);

// --- 104: kompleks sonlarni bo'lish (L2) ---
y1T<{ a: number; b: number; c: number; d: number }>(
  'cx-div',
  104,
  'L2',
  120,
  (r) => ({ a: r.int(-9, 9), b: r.int(-9, 9), c: r.int(-5, 5), d: r.int(-5, 5) }),
  ({ a, b, c, d }) => {
    need(c !== 0 && d !== 0 && a !== 0 && b !== 0);
    const den = c * c + d * d;
    const re = frac(a * c + b * d, den);
    const im = frac(b * c - a * d, den);
    need(den <= 34 && re.n !== 0 && im.n !== 0);
    const ans = complexTex(re, im);
    const w1 = complexTex(frac(a * c - b * d, den), frac(b * c + a * d, den));
    const w2 = complexTex(re, frac(a * d - b * c, den));
    const w3 = complexTex(frac(a * c + b * d), frac(b * c - a * d));
    const dd = c * c - d * d === 0 ? 1 : Math.abs(c * c - d * d);
    const w4 = complexTex(frac(a * c + b * d, dd), frac(b * c - a * d, dd));
    const quo = `\\dfrac{${cx(a, b)}}{${cx(c, d)}}`;
    const calc = M(`(${cx(a, b)})(${cx(c, -d)})=${cx(a * c + b * d, b * c - a * d)}`);
    const dcalc = M(`${par(c)}^2+${par(d)}^2=${den}`);
    return {
      stem: L(`${M(quo)} ni ${M('x+yi')} ko'rinishda yozing.`, `Запишите ${M(quo)} в виде ${M('x+yi')}.`, `${M(quo)} di ${M('x+yi')} kórinisinde jazıń.`, `Write ${M(quo)} in the form ${M('x+yi')}.`), // kaa: tekshirilsin
      correct: M(ans),
      wrong: uniq([w1, w2, w3, w4]).map(M),
      sol: L(
        `Surat va maxrajni maxrajning qo'shmasiga ${M(cx(c, -d))} ko'paytiramiz: maxraj ${dcalc}, surat ${calc}. Natija ${M(ans)}.`,
        `Умножим числитель и знаменатель на сопряжённое ${M(cx(c, -d))}: знаменатель ${dcalc}, числитель ${calc}. Результат ${M(ans)}.`,
        `Alım hám bólimdi bólimniń tuwrı qosıwshısına ${M(cx(c, -d))} kóbeytemiz: bólim ${dcalc}, alım ${calc}. Nátiyje ${M(ans)}.`, // kaa: tekshirilsin
        `Multiply numerator and denominator by the conjugate ${M(cx(c, -d))}: denominator ${dcalc}, numerator ${calc}. Result ${M(ans)}.`,
      ),
      mis: L(
        "Maxrajni qo'shmasiga emas, o'ziga ko'paytirish; maxrajda $c^2-d^2$ olish (to'g'risi $c^2+d^2$).",
        'Умножать не на сопряжённое, а на само число; брать в знаменателе $c^2-d^2$ (верно $c^2+d^2$).',
        "Bólimdi tuwrı qosıwshısına emes, ózine kóbeytiw; bólimde $c^2-d^2$ alıw (durısı $c^2+d^2$).", // kaa: tekshirilsin
        'Multiplying by the number itself instead of its conjugate; using $c^2-d^2$ in the denominator (it is $c^2+d^2$).',
      ),
    };
  },
);

// --- 104: kompleks son kvadrati va bo'linma (O, L3) ---
oT<{ c: number; d: number; p: number; q: number }>(
  'cx-o',
  104,
  'L3',
  170,
  (r) => ({ c: r.int(-3, 3), d: r.int(-3, 3), p: r.int(-3, 3), q: r.int(-3, 3) }),
  ({ c, d, p, q }) => {
    need(c !== 0 && d !== 0 && p !== 0 && q !== 0);
    // g = (c+di)(p+qi) = a+bi;  z = g^2 / (c+di) = (c+di)(p+qi)^2
    const [a, b] = cmul(c, d, p, q);
    const [u, v] = cmul(p, q, p, q);
    const [re, im] = cmul(c, d, u, v);
    need(Math.abs(re) <= 60 && Math.abs(im) <= 60 && re !== 0 && im !== 0 && Math.abs(a) + Math.abs(b) <= 12);
    const zdef = M(`z=\\dfrac{(${cx(a, b)})^{2}}{${cx(c, d)}}`);
    const sq = M(`(${cx(a, b)})^2=${cx(...cmul(a, b, a, b))}`);
    return {
      stem: L(`${zdef} kompleks son berilgan.`, `Дано комплексное число ${zdef}.`, `${zdef} kompleks sanı berilgen.`, `The complex number ${zdef} is given.`), // kaa: tekshirilsin
      a: { prompt: L(`${M('\\operatorname{Re} z')} (haqiqiy qism) ni toping.`, `Найдите ${M('\\operatorname{Re} z')} (действительную часть).`, `${M('\\operatorname{Re} z')} (haqıyqıy bólim) ti tabıń.`, `Find ${M('\\operatorname{Re} z')} (the real part).`), key: frac(re) }, // kaa: tekshirilsin
      b: { prompt: L(`${M('\\operatorname{Im} z')} (mavhum qism koeffitsiyenti) ni toping.`, `Найдите ${M('\\operatorname{Im} z')} (коэффициент при мнимой части).`, `${M('\\operatorname{Im} z')} (kemis bólim koefficienti) di tabıń.`, `Find ${M('\\operatorname{Im} z')} (the coefficient of the imaginary part).`), key: frac(im) }, // kaa: tekshirilsin
      sol: L(
        `Surat: ${sq}. Maxraj qo'shmasiga ko'paytirib, bo'lamiz: ${M(`z=${cx(re, im)}`)}.`,
        `Числитель: ${sq}. Умножаем на сопряжённое знаменателя и делим: ${M(`z=${cx(re, im)}`)}.`,
        `Alım: ${sq}. Bólimniń tuwrı qosıwshısına kóbeytip bólemiz: ${M(`z=${cx(re, im)}`)}.`, // kaa: tekshirilsin
        `Numerator: ${sq}. Multiply by the conjugate of the denominator and divide: ${M(`z=${cx(re, im)}`)}.`,
      ),
      mis: cxMis,
    };
  },
);

// =====================================================================================================
// 2.1 Daraja va ildiz (mavzular 12, 13, 14, 19, 20 va 106 Sonli tengsizliklar)
// =====================================================================================================

/** n^2 * r shaklida r kvadratsiz: [n, r] */
function squareSplit(x: number): [number, number] {
  let k = 1;
  let r = x;
  for (let d = 2; d * d <= r; d++) {
    while (r % (d * d) === 0) {
      r /= d * d;
      k *= d;
    }
  }
  return [k, r];
}
/** coef * sqrt(n), soddalashtirilgan: sqrtTerm(3, 12) = "6\sqrt{3}", sqrtTerm(2, 9) = "6" */
function sqrtTerm(coef: number, n: number): string {
  const [k, r] = squareSplit(n);
  const c = coef * k;
  if (c === 0) return '0';
  if (r === 1) return String(c);
  return `${c === 1 ? '' : c === -1 ? '-' : c}\\sqrt{${r}}`;
}
/** Hadlarni belgilari bilan qo'shib yozish: ["3", "-2\sqrt{5}"] -> "3-2\sqrt{5}" */
const joinTerms = (parts: readonly string[]): string => parts.filter((t) => t !== '0').reduce((s, t, i) => (i === 0 ? t : t.startsWith('-') ? `${s}${t}` : `${s}+${t}`), '') || '0';
const rootTex = (n: number, x: string | number): string => (n === 2 ? `\\sqrt{${x}}` : `\\sqrt[${n}]{${x}}`);

// --- 12: manfiy ko'rsatkichli darajalar (L1) ---
interface NegExpP {
  a: number;
  b: number;
  m: number;
  c: number;
  n: number;
  op: '+' | '-';
}
y1T<NegExpP>(
  'pw-neg',
  12,
  'L1',
  90,
  (r) => ({ a: r.int(1, 5), b: r.int(2, 5), m: r.int(1, 3), c: r.int(2, 5), n: r.int(1, 3), op: r.pick(['+', '-'] as const) }),
  (p) => {
    need(gcd(p.a, p.b) === 1);
    const t1 = fPow(frac(p.a, p.b), -p.m);
    const t2 = fPow(frac(p.c), -p.n);
    const ans = p.op === '+' ? fAdd(t1, t2) : fSub(t1, t2);
    need(ans.n > 0 && ans.d <= 200 && ans.n <= 400);
    const u1 = fPow(frac(p.a, p.b), p.m);
    const u2 = fPow(frac(p.c), p.n);
    const wrong = [p.op === '+' ? fAdd(u1, u2) : fSub(u1, u2), p.op === '+' ? fAdd(t1, u2) : fSub(t1, u2), fMul(ans, frac(-1)).n > 0 ? fMul(ans, frac(-1)) : null, p.op === '+' ? fAdd(fPow(frac(p.a, p.b), -1), fPow(frac(p.c), -1)) : fSub(fPow(frac(p.b, p.a), 1), fPow(frac(p.c), -1))];
    const expr = `\\left(\\frac{${p.a}}{${p.b}}\\right)^{-${p.m}}${p.op}${p.c}^{-${p.n}}`;
    const step = M(`\\left(\\frac{${p.b}}{${p.a}}\\right)^{${p.m}}${p.op}\\frac{1}{${p.c}^{${p.n}}}=${texFrac(t1)}${p.op}${texFrac(t2)}=${texFrac(ans)}`);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${M('a^{-n}=\\frac{1}{a^n}')} va ${M('\\left(\\frac{x}{y}\\right)^{-n}=\\left(\\frac{y}{x}\\right)^n')}: ${step}.`,
        `${M('a^{-n}=\\frac{1}{a^n}')} и ${M('\\left(\\frac{x}{y}\\right)^{-n}=\\left(\\frac{y}{x}\\right)^n')}: ${step}.`,
        `${M('a^{-n}=\\frac{1}{a^n}')} hám ${M('\\left(\\frac{x}{y}\\right)^{-n}=\\left(\\frac{y}{x}\\right)^n')}: ${step}.`, // kaa: tekshirilsin
        `${M('a^{-n}=\\frac{1}{a^n}')} and ${M('\\left(\\frac{x}{y}\\right)^{-n}=\\left(\\frac{y}{x}\\right)^n')}: ${step}.`,
      ),
      mis: L(
        "Manfiy ko'rsatkichni natijaning manfiy ishorasi deb olish; kasrni ag'darmaslik.",
        'Считать отрицательный показатель знаком минус у результата; не переворачивать дробь.',
        "Teris kórsetkishti nátiyjeniń teris belgisi dep alıw; bólshekti awdarmaw.", // kaa: tekshirilsin
        'Treating a negative exponent as a minus sign on the result; not flipping the fraction.',
      ),
    };
  },
);

// --- 12: bir asosli darajalar (L2) ---
interface SameBaseP {
  p: number;
  i: number;
  j: number;
  k: number;
  x: number;
  y: number;
  z: number;
}
y1T<SameBaseP>(
  'pw-same',
  12,
  'L2',
  100,
  (r) => ({ p: r.pick([2, 2, 3, 5]), i: r.int(1, 4), j: r.int(1, 4), k: r.int(1, 4), x: r.int(-3, 5), y: r.int(-3, 5), z: r.int(-3, 5) }),
  (p) => {
    const E = p.i * p.x + p.j * p.y - p.k * p.z;
    const lim = { 2: 10, 3: 6, 5: 4 }[p.p as 2 | 3 | 5];
    need(Math.abs(E) <= lim && p.x !== 0 && p.y !== 0 && p.z !== 0 && new Set([p.i, p.j, p.k]).size >= 2);
    need(p.i * p.x !== 0 && [p.i, p.j, p.k].every((e) => p.p ** e <= 125) && E !== 0 && Math.abs(p.x) + Math.abs(p.y) + Math.abs(p.z) >= 4);
    const ans = fPow(frac(p.p), E);
    const base = (e: number) => String(p.p ** e);
    const wrongE = [p.i * p.x + p.j * p.y + p.k * p.z, (p.i + p.j - p.k) * (p.x + p.y - p.z), p.x + p.y - p.z, p.i * p.x * p.j * p.y - p.k * p.z, -E, E + 1];
    const expr = `\\frac{${base(p.i)}^{${p.x}}\\cdot ${base(p.j)}^{${p.y}}}{${base(p.k)}^{${p.z}}}`;
    const calc = M(`${p.p}^{${p.i}\\cdot ${par(p.x)}+${p.j}\\cdot ${par(p.y)}-${p.k}\\cdot ${par(p.z)}}=${p.p}^{${E}}=${texFrac(ans)}`);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrongE.map((e) => (Math.abs(e) <= 14 ? fPow(frac(p.p), e) : null))),
      sol: L(
        `Hammasini bitta asosga keltiramiz: ${M(`${base(p.i)}=${p.p}^{${p.i}}`)} va hokazo. ${calc}.`,
        `Приводим всё к одному основанию: ${M(`${base(p.i)}=${p.p}^{${p.i}}`)} и т.д. ${calc}.`,
        `Barlıǵın bir tiykarǵa keltiremiz: ${M(`${base(p.i)}=${p.p}^{${p.i}}`)} h.t.b. ${calc}.`, // kaa: tekshirilsin
        `Reduce everything to one base: ${M(`${base(p.i)}=${p.p}^{${p.i}}`)} etc. ${calc}.`,
      ),
      mis: L(
        "Darajaning darajasida ko'rsatkichlarni qo'shish (to'g'risi ko'paytirish); bo'lishda ko'rsatkichlarni ayirishni unutish.",
        'Складывать показатели при возведении степени в степень (нужно умножать); забыть вычитать показатели при делении.',
        "Dárejeniń dárejesinde kórsetkishlerdi qosıw (durısı kóbeytiw); bóliwde kórsetkishlerdi ayırıwdı umıtıw.", // kaa: tekshirilsin
        'Adding exponents for a power of a power (they multiply); forgetting to subtract exponents when dividing.',
      ),
    };
  },
);

// --- 12: darajalarni taqqoslash (L3) ---
interface PowCmpP {
  g: number;
  items: { a: number; m: number }[];
  mode: 'max' | 'min';
}
y1T<PowCmpP>(
  'pw-compare',
  12,
  'L3',
  130,
  (r) => {
    const bases = r.shuffle([2, 3, 5, 6, 7, 10, 11, 12]).slice(0, 4);
    return { g: r.pick([10, 20, 25, 30, 50, 100]), items: bases.map((a) => ({ a, m: r.int(1, 7) })), mode: r.pick(['max', 'min'] as const) };
  },
  (p) => {
    const vals = p.items.map((it) => it.a ** it.m);
    need(new Set(vals).size === 4 && p.items.every((it) => it.a ** it.m <= 2000) && new Set(p.items.map((it) => it.m)).size >= 3);
    const sorted = [...vals].sort((x, y) => x - y);
    const idx = vals.indexOf(p.mode === 'max' ? sorted[3]! : sorted[0]!);
    // juda yaqin qiymatlar (ayniqsa max/min bilan 2-o'rin) bo'lmasin
    need(p.mode === 'max' ? sorted[3]! > sorted[2]! * 1.05 : sorted[1]! > sorted[0]! * 1.05);
    const texts = p.items.map((it) => `${it.a}^{${it.m * p.g}}`);
    const reduced = p.items.map((it) => `${it.a}^{${it.m}}=${it.a ** it.m}`).join(',\\ ');
    return {
      stem: L(
        `Quyidagi sonlardan qaysi biri eng ${p.mode === 'max' ? 'katta' : 'kichik'}?`,
        `Какое из чисел ${p.mode === 'max' ? 'наибольшее' : 'наименьшее'}?`,
        `Tómendegi sanlardan qaysısı eń ${p.mode === 'max' ? 'úlken' : 'kishi'}?`, // kaa: tekshirilsin
        `Which of the following numbers is the ${p.mode === 'max' ? 'largest' : 'smallest'}?`,
      ),
      correct: M(texts[idx]!),
      wrong: texts.filter((_, i) => i !== idx).map(M),
      sol: L(
        `Barcha ko'rsatkichlar ${p.g} ga bo'linadi: ${M(`a^{${p.g}m}=(a^m)^{${p.g}}`)}. Shuning uchun ${M(`a^m`)} larni taqqoslaymiz: ${M(reduced)}. Eng ${p.mode === 'max' ? 'katta' : 'kichik'}: ${M(texts[idx]!)}.`,
        `Все показатели делятся на ${p.g}: ${M(`a^{${p.g}m}=(a^m)^{${p.g}}`)}. Поэтому сравниваем ${M(`a^m`)}: ${M(reduced)}. ${p.mode === 'max' ? 'Наибольшее' : 'Наименьшее'}: ${M(texts[idx]!)}.`,
        `Barlıq kórsetkishler ${p.g} ge bólinedi: ${M(`a^{${p.g}m}=(a^m)^{${p.g}}`)}. Sonıń ushın ${M(`a^m`)} lerdi salıstıramız: ${M(reduced)}. Eń ${p.mode === 'max' ? 'úlkeni' : 'kishisi'}: ${M(texts[idx]!)}.`, // kaa: tekshirilsin
        `All exponents are divisible by ${p.g}: ${M(`a^{${p.g}m}=(a^m)^{${p.g}}`)}. So compare ${M(`a^m`)}: ${M(reduced)}. The ${p.mode === 'max' ? 'largest' : 'smallest'} is ${M(texts[idx]!)}.`,
      ),
      mis: L(
        "Faqat asosni yoki faqat ko'rsatkichni taqqoslash; umumiy ko'paytuvchini (ko'rsatkichlarning EKUB i) chiqarishni bilmaslik.",
        'Сравнивать только основания или только показатели; не вынести общий множитель показателей (НОД).',
        "Tek tiykardı yamasa tek kórsetkishti salıstırıw; ulıwma kóbeytiwshini (kórsetkishlerdiń EKUB ı) shıǵarıwdı bilmew.", // kaa: tekshirilsin
        'Comparing only the bases or only the exponents; not factoring out the common divisor of the exponents.',
      ),
    };
  },
);

// --- 12: n ga bog'liq bo'lmagan ifoda (L2) ---
interface PowFactorP {
  a: number;
  p: number;
  q: number;
  r: number;
  k: number;
  s: 1 | -1;
}
const nExp = (e: number): string => (e === 0 ? 'n' : e > 0 ? `n+${e}` : `n-${-e}`);
y1T<PowFactorP>(
  'pw-factor',
  12,
  'L2',
  110,
  (r) => ({ a: r.pick([2, 3, 5]), p: r.int(-1, 4), q: r.int(-1, 3), r: r.int(-2, 2), k: r.int(1, 6), s: r.pick([1, -1] as const) }),
  (p) => {
    need(p.p !== p.q && p.p !== p.r && p.q !== p.r);
    const ans = fAdd(fPow(frac(p.a), p.p - p.r), p.s === 1 ? fMul(frac(p.k), fPow(frac(p.a), p.q - p.r)) : fMul(frac(-p.k), fPow(frac(p.a), p.q - p.r)));
    need(ans.n > 0 && ans.d <= 30 && ans.n <= 400);
    const wrong = [
      fAdd(fPow(frac(p.a), p.p - p.r), p.s === 1 ? frac(p.k) : frac(-p.k)),
      fMul(ans, frac(p.a)),
      safeFrac(ans.n, ans.d * p.a),
      fSub(fPow(frac(p.a), p.p - p.r), p.s === 1 ? fMul(frac(p.k), fPow(frac(p.a), p.q - p.r)) : fMul(frac(-p.k), fPow(frac(p.a), p.q - p.r))),
    ];
    const kk = p.k === 1 ? '' : `${p.k}\\cdot `;
    const expr = `\\frac{${p.a}^{${nExp(p.p)}}${p.s === 1 ? '+' : '-'}${kk}${p.a}^{${nExp(p.q)}}}{${p.a}^{${nExp(p.r)}}}`;
    const calc = M(`${p.a}^{${p.p - p.r}}${p.s === 1 ? '+' : '-'}${kk}${p.a}^{${p.q - p.r}}=${texFrac(ans)}`);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Har bir hadni ${M(`${p.a}^{n}`)} ga bo'lamiz: ${M(`${p.a}^{n+m}:${p.a}^{n+r}=${p.a}^{m-r}`)}. ${calc} ($n$ ga bog'liq emas).`,
        `Делим каждое слагаемое на ${M(`${p.a}^{n}`)}: ${M(`${p.a}^{n+m}:${p.a}^{n+r}=${p.a}^{m-r}`)}. ${calc} (не зависит от $n$).`,
        `Hár bir aǵzanı ${M(`${p.a}^{n}`)} ge bólemiz: ${M(`${p.a}^{n+m}:${p.a}^{n+r}=${p.a}^{m-r}`)}. ${calc} ($n$ ge baylanıslı emes).`, // kaa: tekshirilsin
        `Divide every term by ${M(`${p.a}^{n}`)}: ${M(`${p.a}^{n+m}:${p.a}^{n+r}=${p.a}^{m-r}`)}. ${calc} (independent of $n$).`,
      ),
      mis: L(
        "Yig'indining darajasini darajalar yig'indisi deb olish; ko'rsatkichlarni bo'lish o'rniga qo'shish.",
        'Считать степень суммы суммой степеней; складывать показатели вместо вычитания при делении.',
        "Qosındınıń dárejesin dárejeler qosındısı dep alıw; bóliwde kórsetkishlerdi ayırıw ornına qosıw.", // kaa: tekshirilsin
        'Treating the power of a sum as a sum of powers; adding exponents instead of subtracting when dividing.',
      ),
    };
  },
);

// --- 13: ichma-ich ildiz (L2) ---
interface DenestP {
  m: number;
  n: number;
  minus: boolean;
}
const radOrInt = (k: number): string => sqrtTerm(1, k);
y1T<DenestP>(
  'rt-denest',
  13,
  'L2',
  120,
  (r) => ({ m: r.int(2, 16), n: r.int(1, 12), minus: r.chance(0.5) }),
  (p) => {
    need(p.m > p.n && !isSquare(p.m * p.n) && (!isSquare(p.m) || !isSquare(p.n)) && p.m + p.n <= 28);
    const A = p.m + p.n;
    const [kk, rr] = squareSplit(p.m * p.n);
    // 2*sqrt(mn) = 2kk*sqrt(rr): ichkarida "2\sqrt{mn}" ko'rinishida beramiz
    const inner = `${A}${p.minus ? '-' : '+'}2\\sqrt{${p.m * p.n}}`;
    void kk;
    void rr;
    const good = p.minus ? joinTerms([radOrInt(p.m), `-${radOrInt(p.n)}`.replace('--', '-')]) : joinTerms([radOrInt(p.m), radOrInt(p.n)]);
    const sqrtM = radOrInt(p.m);
    const sqrtN = radOrInt(p.n);
    const wrong = uniq([
      p.minus ? joinTerms([sqrtM, sqrtN]) : joinTerms([sqrtM, `-${sqrtN}`]),
      sqrtTerm(1, A),
      String(A),
      p.minus ? sqrtTerm(1, p.m - p.n) : joinTerms([sqrtTerm(1, p.m + p.n), '1']),
      joinTerms([String(p.m), sqrtN]),
    ]);
    const sq = M(`(\\sqrt{${p.m}}${p.minus ? '-' : '+'}\\sqrt{${p.n}})^2=${p.m}+${p.n}${p.minus ? '-' : '+'}2\\sqrt{${p.m * p.n}}=${inner}`);
    return {
      stem: L(`${M(`\\sqrt{${inner}}`)} ni soddalashtiring.`, `Упростите ${M(`\\sqrt{${inner}}`)}.`, `${M(`\\sqrt{${inner}}`)} di ápiwayılastırıń.`, `Simplify ${M(`\\sqrt{${inner}}`)}.`), // kaa: tekshirilsin
      correct: M(good),
      wrong: wrong.map(M),
      sol: L(
        `To'liq kvadratni ajratamiz: ${sq}. Demak ildiz ${M(good)} (ikkala ifoda ham musbat).`,
        `Выделяем полный квадрат: ${sq}. Значит, корень равен ${M(good)} (выражение положительно).`,
        `Tolıq kvadratti ajıratamız: ${sq}. Demek tamır ${M(good)} (ańlatpa oń).`, // kaa: tekshirilsin
        `Complete the square: ${sq}. So the root equals ${M(good)} (the value is positive).`,
      ),
      mis: L(
        "Ildiz ostida $a+b\\sqrt{c}$ ni $\\sqrt{a}+\\sqrt{b\\sqrt{c}}$ deb ajratish; ayirmali holda ishorani teskari olish (natija musbat bo'lishi kerak).",
        'Разделять корень суммы на сумму корней; в случае разности брать результат с неверным знаком (он должен быть положительным).',
        "Tamır astındaǵı $a+b\\sqrt{c}$ di tamırlar qosındısı dep ajıratıw; ayırmalı jaǵdayda belgini teris alıw (nátiyje oń bolıwı kerek).", // kaa: tekshirilsin
        'Splitting the root of a sum into a sum of roots; taking the wrong sign in the difference case (the result must be positive).',
      ),
    };
  },
);

// --- 13: kub ildizlar (L1) ---
y1T<{ k: number[] }>(
  'rt-cube',
  13,
  'L1',
  80,
  (r) => ({ k: [r.int(-8, 8), r.int(-8, 8), r.int(-8, 8)] }),
  ({ k }) => {
    need(k.every((x) => Math.abs(x) >= 2) && new Set(k.map(Math.abs)).size === 3 && k.some((x) => x < 0));
    const ans = k[0]! + k[1]! - k[2]!;
    need(ans !== 0 && Math.abs(ans) <= 20);
    const wrong = [k[0]! + k[1]! + k[2]!, -ans, Math.abs(k[0]!) + Math.abs(k[1]!) - Math.abs(k[2]!), k[0]! - k[1]! - k[2]!, ans + 1];
    const cube = (x: number) => x ** 3;
    const expr = `\\sqrt[3]{${cube(k[0]!)}}+\\sqrt[3]{${cube(k[1]!)}}-\\sqrt[3]{${cube(k[2]!)}}`;
    const step = M(`${k[0]}+${par(k[1]!)}-${par(k[2]!)}=${ans}`);
    return {
      stem: L(`${M(expr)} ni hisoblang.`, `Вычислите ${M(expr)}.`, `${M(expr)} di esaplań.`, `Evaluate ${M(expr)}.`), // kaa: tekshirilsin
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        `Kub ildiz manfiy sondan ham mavjud: ${M(`\\sqrt[3]{${cube(k[0]!)}}=${k[0]}`)}, ${M(`\\sqrt[3]{${cube(k[1]!)}}=${k[1]}`)}, ${M(`\\sqrt[3]{${cube(k[2]!)}}=${k[2]}`)}. ${step}.`,
        `Кубический корень существует и из отрицательного числа: ${M(`\\sqrt[3]{${cube(k[0]!)}}=${k[0]}`)}, ${M(`\\sqrt[3]{${cube(k[1]!)}}=${k[1]}`)}, ${M(`\\sqrt[3]{${cube(k[2]!)}}=${k[2]}`)}. ${step}.`,
        `Kub tamır teris sannan da bar: ${M(`\\sqrt[3]{${cube(k[0]!)}}=${k[0]}`)}, ${M(`\\sqrt[3]{${cube(k[1]!)}}=${k[1]}`)}, ${M(`\\sqrt[3]{${cube(k[2]!)}}=${k[2]}`)}. ${step}.`, // kaa: tekshirilsin
        `A cube root exists for negative numbers too: ${M(`\\sqrt[3]{${cube(k[0]!)}}=${k[0]}`)}, ${M(`\\sqrt[3]{${cube(k[1]!)}}=${k[1]}`)}, ${M(`\\sqrt[3]{${cube(k[2]!)}}=${k[2]}`)}. ${step}.`,
      ),
      mis: L(
        "Manfiy sondan kub ildizni musbat deb olish (yoki mavjud emas deb hisoblash); ayirish ishorasini adashtirish.",
        'Считать кубический корень из отрицательного числа положительным (или несуществующим); путать знак вычитания.',
        "Teris sannan kub tamırdı oń dep alıw (yamasa joq dep esaplaw); ayırıw belgisin shatastırıw.", // kaa: tekshirilsin
        'Treating the cube root of a negative number as positive (or nonexistent); mixing up the subtraction sign.',
      ),
    };
  },
);

// --- 13: bir xil ko'rsatkichli ildizlar ko'paytmasi/bo'linmasi (L2) ---
interface RootProdP {
  n: number;
  c: number;
  d: number;
  mode: 'mul' | 'div';
}
y1T<RootProdP>(
  'rt-prod',
  13,
  'L2',
  90,
  (r) => {
    const n = r.pick([2, 3, 3, 4]);
    return { n, c: r.int(2, n === 2 ? 9 : n === 3 ? 6 : 4), d: r.int(2, 12), mode: r.pick(['mul', 'div'] as const) };
  },
  (p) => {
    const N = p.c ** p.n;
    let a: number;
    let b: number;
    if (p.mode === 'mul') {
      need(p.d < N && N % p.d === 0);
      a = p.d;
      b = N / p.d;
      need(a !== b && !isPerfect(a, p.n) && !isPerfect(b, p.n));
    } else {
      b = p.d;
      a = b * N;
      need(a <= 9000);
    }
    const expr = p.mode === 'mul' ? `${rootTex(p.n, a)}\\cdot ${rootTex(p.n, b)}` : `${rootTex(p.n, a)}:${rootTex(p.n, b)}`;
    const wrong = [p.c + 1, p.c * p.n, N, p.c - 1, p.mode === 'mul' ? a + b : a - b];
    const calc = p.mode === 'mul' ? M(`${rootTex(p.n, `${a}\\cdot ${b}`)}=${rootTex(p.n, N)}=${p.c}`) : M(`${rootTex(p.n, `${a}:${b}`)}=${rootTex(p.n, N)}=${p.c}`);
    return {
      stem: L(`${M(expr)} ni hisoblang.`, `Вычислите ${M(expr)}.`, `${M(expr)} di esaplań.`, `Evaluate ${M(expr)}.`), // kaa: tekshirilsin
      correct: mi(p.c),
      wrong: intWrong(p.c, wrong, { min: 1 }),
      sol: L(
        `Ko'rsatkichlari bir xil ildizlarni bitta ildiz ostiga olamiz: ${calc}.`,
        `Корни с одинаковыми показателями объединяем под одним корнем: ${calc}.`,
        `Kórsetkishleri birdey tamırlardı bir tamır astına alamız: ${calc}.`, // kaa: tekshirilsin
        `Combine roots with the same index under one root: ${calc}.`,
      ),
      mis: L(
        "Ildiz ostidagi sonlarni qo'shish yoki ildizni ko'paytmasiga ajratmaslik; ildiz ko'rsatkichini hisobga olmaslik.",
        'Складывать подкоренные числа или игнорировать показатель корня.',
        "Tamır astındaǵı sanlardı qosıw yamasa tamır kórsetkishin esapqa almaw.", // kaa: tekshirilsin
        'Adding the radicands or ignoring the index of the root.',
      ),
    };
  },
);
const isPerfect = (a: number, n: number): boolean => Math.round(Math.pow(a, 1 / n)) ** n === a;

// --- 14: kasr ko'rsatkichli darajalar (L1) ---
interface FracExpP {
  q: number;
  r1: number;
  pe: number;
  r2: number;
  pe2: number;
  q2: number;
  op: '+' | '-';
}
y1T<FracExpP>(
  'rt-frac',
  14,
  'L1',
  90,
  (r) => {
    const q = r.pick([2, 3, 4]);
    const q2 = r.pick([2, 3, 4]);
    return { q, r1: r.int(2, q === 2 ? 9 : q === 3 ? 4 : 3), pe: r.pick([-3, -2, -1, 1, 2, 3]), q2, r2: r.int(2, q2 === 2 ? 9 : q2 === 3 ? 4 : 3), pe2: r.pick([-2, -1, 1, 2, 3]), op: r.pick(['+', '-'] as const) };
  },
  (p) => {
    need(gcd(Math.abs(p.pe), p.q) === 1 && gcd(Math.abs(p.pe2), p.q2) === 1 && !(p.q === p.q2 && p.r1 === p.r2));
    const b1 = p.r1 ** p.q;
    const b2 = p.r2 ** p.q2;
    need(b1 <= 400 && b2 <= 400);
    const t1 = fPow(frac(p.r1), p.pe);
    const t2 = fPow(frac(p.r2), p.pe2);
    const ans = p.op === '+' ? fAdd(t1, t2) : fSub(t1, t2);
    need(ans.n > 0 && ans.d <= 100 && ans.n <= 500);
    const wrong = [
      p.op === '+' ? fAdd(fPow(frac(p.r1), Math.abs(p.pe)), fPow(frac(p.r2), Math.abs(p.pe2))) : fSub(fPow(frac(p.r1), Math.abs(p.pe)), fPow(frac(p.r2), Math.abs(p.pe2))),
      p.op === '+' ? fSub(t1, t2) : fAdd(t1, t2),
      fAdd(frac(b1 * p.pe > 0 ? p.pe : 1), frac(b2)),
    ];
    const fe = (a: number, b: number) => `\\frac{${Math.abs(a)}}{${b}}`;
    const expr = `${b1}^{${p.pe < 0 ? '-' : ''}${fe(p.pe, p.q)}}${p.op}${b2}^{${p.pe2 < 0 ? '-' : ''}${fe(p.pe2, p.q2)}}`;
    const step = M(`${b1}^{${p.pe < 0 ? '-' : ''}${fe(p.pe, p.q)}}=(${p.r1}^{${p.q}})^{${p.pe < 0 ? '-' : ''}${fe(p.pe, p.q)}}=${p.r1}^{${p.pe}}=${texFrac(t1)}`);
    const step2 = M(`${b2}^{${p.pe2 < 0 ? '-' : ''}${fe(p.pe2, p.q2)}}=${p.r2}^{${p.pe2}}=${texFrac(t2)}`);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Asosni daraja ko'rinishida yozamiz: ${step}; ${step2}. Natija ${mf(ans)}.`,
        `Записываем основание как степень: ${step}; ${step2}. Итог ${mf(ans)}.`,
        `Tiykardı dáreje kórinisinde jazamız: ${step}; ${step2}. Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `Write the base as a power: ${step}; ${step2}. Result ${mf(ans)}.`,
      ),
      mis: L(
        "Kasr ko'rsatkichning surati va maxrajini adashtirish (maxraj — ildiz ko'rsatkichi); manfiy ko'rsatkichni e'tiborsiz qoldirish.",
        'Путать числитель и знаменатель показателя (знаменатель — показатель корня); игнорировать отрицательный показатель.',
        "Bólshek kórsetkishtiń alımı hám bólimin shatastırıw (bólim — tamır kórsetkishi); teris kórsetkishti itibarsız qaldırıw.", // kaa: tekshirilsin
        'Confusing numerator and denominator of the exponent (the denominator is the root index); ignoring a negative exponent.',
      ),
    };
  },
);

// --- 14: kasr ko'rsatkichli ko'paytma/bo'linma (L2) ---
interface FracMixP {
  p: number;
  i: number[];
  t: number[];
}
y1T<FracMixP>(
  'rt-frac-mix',
  14,
  'L2',
  110,
  (r) => ({ p: r.pick([2, 2, 3]), i: [r.int(2, 6), r.int(2, 6), r.int(2, 6)], t: [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)] }),
  (p) => {
    const E = p.t[0]! + p.t[1]! - p.t[2]!;
    need(p.t.every((t, k) => t !== 0 && t % p.i[k]! !== 0) && p.i.every((e) => p.p ** e <= 400) && Math.abs(E) <= (p.p === 2 ? 8 : 5) && E !== 0);
    const ans = fPow(frac(p.p), E);
    const bs = p.i.map((e) => p.p ** e);
    const ex = p.t.map((t, k) => {
      const f = frac(t, p.i[k]!);
      return `${f.n < 0 ? '-' : ''}\\frac{${Math.abs(f.n)}}{${f.d}}`;
    });
    const expr = `\\frac{${bs[0]}^{${ex[0]}}\\cdot ${bs[1]}^{${ex[1]}}}{${bs[2]}^{${ex[2]}}}`;
    const wrongE = [p.t[0]! + p.t[1]! + p.t[2]!, -E, E + 1, E - 1, p.t[0]! * p.t[1]! - p.t[2]!];
    const calc = M(`${p.p}^{${p.t[0]}}\\cdot ${p.p}^{${p.t[1]}}:${p.p}^{${p.t[2]}}=${p.p}^{${E}}=${texFrac(ans)}`);
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrongE.map((e) => (Math.abs(e) <= 12 ? fPow(frac(p.p), e) : null))),
      sol: L(
        `Asoslarni ${p.p} ning darajasi qilib yozamiz: ${bs.map((b, k) => M(`${b}=${p.p}^{${p.i[k]}}`)).join(', ')}. Ko'rsatkichlarni ko'paytiramiz: ${calc}.`,
        `Записываем основания как степени ${p.p}: ${bs.map((b, k) => M(`${b}=${p.p}^{${p.i[k]}}`)).join(', ')}. Умножаем показатели: ${calc}.`,
        `Tiykarlardı ${p.p} niń dárejesi etip jazamız: ${bs.map((b, k) => M(`${b}=${p.p}^{${p.i[k]}}`)).join(', ')}. Kórsetkishlerdi kóbeytemiz: ${calc}.`, // kaa: tekshirilsin
        `Write the bases as powers of ${p.p}: ${bs.map((b, k) => M(`${b}=${p.p}^{${p.i[k]}}`)).join(', ')}. Multiply the exponents: ${calc}.`,
      ),
      mis: L(
        "Darajaning darajasida ko'rsatkichlarni qo'shish; bo'lishda ayirish o'rniga qo'shish.",
        'Складывать показатели при возведении степени в степень; при делении складывать вместо вычитания.',
        "Dárejeniń dárejesinde kórsetkishlerdi qosıw; bóliwde ayırıw ornına qosıw.", // kaa: tekshirilsin
        'Adding exponents for a power of a power; adding instead of subtracting when dividing.',
      ),
    };
  },
);

// --- 19: maxrajni irratsionallikdan qutqarish (L2) ---
interface RationalizeP {
  m: number;
  n: number;
  c: number;
  plus: boolean;
}
y1T<RationalizeP>(
  'rt-rationalize',
  19,
  'L2',
  100,
  (r) => ({ m: r.int(3, 20), n: r.int(1, 14), c: r.int(1, 6), plus: r.chance(0.5) }),
  (p) => {
    const d = p.m - p.n;
    need(d >= 1 && d <= 6 && !(isSquare(p.m) && isSquare(p.n)) && p.c * d <= 36);
    const k = p.c * d;
    // k / (sqrt m -+ sqrt n) = c (sqrt m +- sqrt n)
    const sM = sqrtTerm(1, p.m);
    const sN = sqrtTerm(1, p.n);
    const cM_ = sqrtTerm(p.c, p.m);
    const cN = sqrtTerm(p.c, p.n);
    const good = p.plus ? joinTerms([cM_, `-${cN}`.replace('--', '-')]) : joinTerms([cM_, cN]);
    const bad = p.plus ? joinTerms([cM_, cN]) : joinTerms([cM_, `-${cN}`.replace('--', '-')]);
    const wrong = uniq([bad, p.plus ? joinTerms([sqrtTerm(k, p.m), `-${sqrtTerm(k, p.n)}`]) : joinTerms([sqrtTerm(k, p.m), sqrtTerm(k, p.n)]), sqrtTerm(p.c, d), joinTerms([sqrtTerm(1, p.m), p.plus ? `-${sN}` : sN]).replace('--', '-')]);
    const den = p.plus ? `${sM}+${sN}` : `${sM}-${sN}`;
    const conj = p.plus ? `${sM}-${sN}` : `${sM}+${sN}`;
    const denExpr = `\\frac{${k}}{${den}}`;
    const step = M(`\\frac{${k}\\left(${conj}\\right)}{${p.m}-${p.n}}=\\frac{${k}\\left(${conj}\\right)}{${d}}=${good}`);
    return {
      stem: L(`${M(denExpr)} ifodaning maxrajini irratsionallikdan qutqaring va soddalashtiring.`, `Избавьтесь от иррациональности в знаменателе и упростите ${M(denExpr)}.`, `${M(denExpr)} ańlatpanıń bólimin irracionallıqtan qutqarıń hám ápiwayılastırıń.`, `Rationalise the denominator and simplify ${M(denExpr)}.`), // kaa: tekshirilsin
      correct: M(good),
      wrong: wrong.map(M),
      sol: L(
        `Surat va maxrajni qo'shma ifodaga ${M(conj)} ko'paytiramiz (kvadratlar ayirmasi): ${step}.`,
        `Умножаем числитель и знаменатель на сопряжённое ${M(conj)} (разность квадратов): ${step}.`,
        `Alım hám bólimdi tuwrı qosıwshı ${M(conj)} ge kóbeytemiz (kvadratlar ayırması): ${step}.`, // kaa: tekshirilsin
        `Multiply numerator and denominator by the conjugate ${M(conj)} (difference of squares): ${step}.`,
      ),
      mis: L(
        "Qo'shma ifodada ishorani o'zgartirmay qoldirish yoki maxrajda ildizlarning ayirmasini $\\sqrt{m-n}$ deb olish.",
        'Не изменить знак в сопряжённом выражении или считать разность корней равной $\\sqrt{m-n}$.',
        "Tuwrı qosıwshı ańlatpada belgini ózgertpey qaldırıw yamasa bólimde tamırlar ayırmasın $\\sqrt{m-n}$ dep alıw.", // kaa: tekshirilsin
        'Not changing the sign in the conjugate, or treating the difference of roots as $\\sqrt{m-n}$.',
      ),
    };
  },
);

// --- 19: teleskopik irratsional yig'indi (L3) ---
interface RatTeleP {
  s: number;
  t: number;
  d: number;
}
y1T<RatTeleP>(
  'rt-rat-tele',
  19,
  'L3',
  150,
  (r) => ({ s: r.int(1, 4), t: r.int(3, 12), d: r.int(1, 4) }),
  (p) => {
    const diff = p.t * p.t - p.s * p.s;
    need(p.t > p.s + 1 && diff % p.d === 0 && diff / p.d >= 5 && diff / p.d <= 70);
    const n = diff / p.d;
    const a = p.s * p.s;
    const ans = frac(p.t - p.s, p.d);
    const term = (k: number) => `\\frac{1}{\\sqrt{${a + k * p.d}}+\\sqrt{${a + (k + 1) * p.d}}}`;
    const expr = `${term(0)}+${term(1)}+\\ldots+${term(n - 1)}`;
    const wrong = [frac(p.t - p.s), frac(p.t + p.s, p.d), frac(n), safeFrac(p.t - p.s, n), frac(p.t - p.s - 1, p.d)];
    const gen = M(`\\frac{1}{\\sqrt{x}+\\sqrt{x+${p.d}}}=\\frac{\\sqrt{x+${p.d}}-\\sqrt{x}}{${p.d}}`);
    const fin = M(`S=\\frac{\\sqrt{${a + n * p.d}}-\\sqrt{${a}}}{${p.d}}=\\frac{${p.t}-${p.s}}{${p.d}}=${texFrac(ans)}`);
    return {
      stem: L(
        `${M(expr)} yig'indini hisoblang (${mi(n)} ta qo'shiluvchi).`,
        `Вычислите сумму ${M(expr)} (${mi(n)} слагаемых).`,
        `${M(expr)} qosındısın esaplań (${mi(n)} qosılıwshı).`, // kaa: tekshirilsin
        `Evaluate the sum ${M(expr)} (${mi(n)} terms).`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Har bir kasrning maxrajini irratsionallikdan qutqaramiz: ${gen}. Oraliq hadlar qisqaradi: ${fin}.`,
        `Избавляемся от иррациональности в каждой дроби: ${gen}. Средние члены сокращаются: ${fin}.`,
        `Hár bir bólshektiń bólimin irracionallıqtan qutqaramız: ${gen}. Aralıq aǵzalar qısqaradı: ${fin}.`, // kaa: tekshirilsin
        `Rationalise each fraction: ${gen}. The middle terms cancel: ${fin}.`,
      ),
      mis: L(
        "Oxirida $d$ ga bo'lishni unutish; qisqarishdan keyin birinchi va oxirgi ildizlarni noto'g'ri ishora bilan olish.",
        'Забыть в конце разделить на $d$; после сокращения взять первый и последний корни с неверными знаками.',
        "Aqırında $d$ ǵa bóliwdi umıtıw; qısqarıwdan keyin birinshi hám sońǵı tamırlardı qate belgi menen alıw.", // kaa: tekshirilsin
        'Forgetting to divide by $d$ at the end; using the wrong signs for the first and last roots after cancellation.',
      ),
    };
  },
);

// --- 20: ildizli ifodani soddalashtirish (L1) ---
interface SimpRootP {
  c: number;
  k: number[];
  sg: number[];
}
y1T<SimpRootP>(
  'rt-simp',
  20,
  'L1',
  80,
  (r) => ({ c: r.pick([2, 3, 5, 6, 7]), k: [r.int(1, 7), r.int(1, 7), r.int(1, 7)], sg: [1, r.pick([1, -1]), r.pick([1, -1])] }),
  (p) => {
    need(new Set(p.k).size === 3);
    const m = p.k.reduce((s, kk, i) => s + p.sg[i]! * kk, 0);
    need(m !== 0 && Math.abs(m) <= 14 && p.k.every((kk) => kk * kk * p.c <= 400));
    const ans = sqrtTerm(m, p.c);
    const radicands = p.k.map((kk) => kk * kk * p.c);
    const sgnTex2 = (i: number) => (i === 0 ? '' : p.sg[i]! > 0 ? '+' : '-');
    const expr = radicands.map((v, i) => `${sgnTex2(i)}\\sqrt{${v}}`).join('');
    const wrong = uniq([
      sqrtTerm(p.k.reduce((s, kk, i) => s + p.sg[i]! * kk * kk, 0), p.c),
      sqrtTerm(m, p.c * p.c).replace(/\\sqrt\{(\d+)\}/, (_, x) => `\\sqrt{${x}}`),
      sqrtTerm(1, radicands.reduce((s, v, i) => s + p.sg[i]! * v, 0) > 0 ? radicands.reduce((s, v, i) => s + p.sg[i]! * v, 0) : 1),
      sqrtTerm(m + 1, p.c),
      sqrtTerm(m - 1, p.c),
      sqrtTerm(-m, p.c),
    ]);
    const parts = p.k.map((kk, i) => `${sgnTex2(i)}${kk === 1 ? '' : kk}\\sqrt{${p.c}}`).join('');
    const parts0 = radicands.map((v, i) => `${sgnTex2(i)}${p.k[i]}\\sqrt{${p.c}}`).join('');
    void parts;
    return {
      stem: L(`${M(expr)} ifodani soddalashtiring.`, `Упростите выражение ${M(expr)}.`, `${M(expr)} ańlatpanı ápiwayılastırıń.`, `Simplify ${M(expr)}.`), // kaa: tekshirilsin
      correct: M(ans),
      wrong: wrong.map(M),
      sol: L(
        `Ko'paytuvchini ildiz ostidan chiqaramiz: ${radicands.map((v, i) => M(`\\sqrt{${v}}=${sqrtTerm(p.k[i]!, p.c)}`)).join(', ')}. Yig'indi: ${M(`(${p.k.map((kk, i) => `${i === 0 ? '' : p.sg[i]! > 0 ? '+' : '-'}${kk}`).join('')})\\sqrt{${p.c}}=${ans}`)}.`,
        `Выносим множитель из-под корня: ${radicands.map((v, i) => M(`\\sqrt{${v}}=${sqrtTerm(p.k[i]!, p.c)}`)).join(', ')}. Сумма: ${M(`(${p.k.map((kk, i) => `${i === 0 ? '' : p.sg[i]! > 0 ? '+' : '-'}${kk}`).join('')})\\sqrt{${p.c}}=${ans}`)}.`,
        `Kóbeytiwshini tamır astınan shıǵaramız: ${radicands.map((v, i) => M(`\\sqrt{${v}}=${sqrtTerm(p.k[i]!, p.c)}`)).join(', ')}. Qosındı: ${M(`(${p.k.map((kk, i) => `${i === 0 ? '' : p.sg[i]! > 0 ? '+' : '-'}${kk}`).join('')})\\sqrt{${p.c}}=${ans}`)}.`, // kaa: tekshirilsin
        `Take the factor out of the root: ${radicands.map((v, i) => M(`\\sqrt{${v}}=${sqrtTerm(p.k[i]!, p.c)}`)).join(', ')}. Sum: ${M(`(${p.k.map((kk, i) => `${i === 0 ? '' : p.sg[i]! > 0 ? '+' : '-'}${kk}`).join('')})\\sqrt{${p.c}}=${ans}`)}.`,
      ),
      mis: L(
        "Ildiz ostidagi sonlarni bevosita qo'shish/ayirish ($\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$ emas); ko'paytuvchini chiqarishda kvadrat ildizini olishni unutish.",
        'Складывать подкоренные выражения напрямую ($\\sqrt{a}+\\sqrt{b}\\ne\\sqrt{a+b}$); забыть извлечь корень из выносимого множителя.',
        "Tamır astındaǵı sanlardı tikkeley qosıw/ayırıw ($\\sqrt{a}+\\sqrt{b}\\ne\\sqrt{a+b}$); kóbeytiwshini shıǵarǵanda kvadrat tamırın alıwdı umıtıw.", // kaa: tekshirilsin
        'Adding radicands directly ($\\sqrt{a}+\\sqrt{b}\\ne\\sqrt{a+b}$); forgetting to take the root of the factor being extracted.',
      ),
    };
  },
);

// --- 20: qo'shma ifodalar (L2) ---
interface ConjP {
  a: number;
  b: number;
  kind: 'sumsq' | 'cross' | 'rev';
}
y1T<ConjP>(
  'rt-conj',
  20,
  'L2',
  100,
  (r) => ({ a: r.int(3, 30), b: r.int(2, 20), kind: r.pick(['sumsq', 'cross', 'rev'] as const) }),
  (p) => {
    need(p.a > p.b && !isSquare(p.a) && !isSquare(p.b) && !isSquare(p.a * p.b) && p.a - p.b >= 2);
    const A = `\\sqrt{${p.a}}+\\sqrt{${p.b}}`;
    const B = `\\sqrt{${p.a}}-\\sqrt{${p.b}}`;
    let correct: string;
    let wrong: string[];
    let expr: string;
    let sol: string;
    if (p.kind === 'sumsq') {
      expr = `\\left(${A}\\right)^2+\\left(${B}\\right)^2`;
      correct = String(2 * (p.a + p.b));
      wrong = [String(p.a + p.b), String(4 * (p.a + p.b)), sqrtTerm(4, p.a * p.b), String(2 * p.a * p.b)].filter((x) => x !== correct);
      sol = `${M(`(x+y)^2+(x-y)^2=2(x^2+y^2)`)}: ${M(`2(${p.a}+${p.b})=${correct}`)}.`;
    } else if (p.kind === 'cross') {
      expr = `\\left(${A}\\right)^2-\\left(${B}\\right)^2`;
      correct = sqrtTerm(4, p.a * p.b);
      wrong = [String(2 * (p.a + p.b)), sqrtTerm(2, p.a * p.b), String(4 * (p.a + p.b)), String(p.a - p.b)];
      sol = `${M(`(x+y)^2-(x-y)^2=4xy`)}: ${M(`4\\sqrt{${p.a}}\\sqrt{${p.b}}=${correct}`)}.`;
    } else {
      expr = `\\frac{${A}}{${B}}+\\frac{${B}}{${A}}`;
      const f = frac(2 * (p.a + p.b), p.a - p.b);
      correct = texFrac(f);
      wrong = [texFrac(frac(2 * (p.a - p.b), p.a + p.b)), texFrac(frac(p.a + p.b, p.a - p.b)), texFrac(frac(2 * p.a, p.a - p.b)), String(2)];
      sol = `${M(`\\frac{(x+y)^2+(x-y)^2}{(x+y)(x-y)}=\\frac{2(x^2+y^2)}{x^2-y^2}`)}: ${M(`\\frac{2(${p.a}+${p.b})}{${p.a}-${p.b}}=${correct}`)}.`;
    }
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: M(correct),
      wrong: uniq(wrong).map(M),
      sol: L(sol, sol, sol, sol),
      mis: L(
        "Qisqa ko'paytirish formulasida ikkilangan ko'paytmani unutish; ildizlar kvadratini ildiz ostidagi songa teng deb olishda ishorani adashtirish.",
        'Забыть удвоенное произведение в формуле сокращённого умножения; ошибиться в знаке.',
        "Qısqa kóbeytiw formulasında eki ese kóbeymeni umıtıw; belgini shatastırıw.", // kaa: tekshirilsin
        'Forgetting the double product in the identity; sign errors.',
      ),
    };
  },
);

// --- 106: eng katta/eng kichik radikal (L2) ---
interface LargestRootP {
  items: { n: number; x: number }[];
  mode: 'max' | 'min';
}
y1T<LargestRootP>(
  'ni-largest',
  106,
  'L2',
  110,
  (r) => {
    const idx = r.shuffle([2, 3, 4, 6]);
    return { items: idx.map((n) => ({ n, x: r.int(2, n === 2 ? 40 : n === 3 ? 90 : n === 4 ? 200 : 600) })), mode: r.pick(['max', 'min'] as const) };
  },
  (p) => {
    const vals = p.items.map((it) => Math.pow(it.x, 1 / it.n));
    const sorted = [...vals].sort((a, b) => a - b);
    need(sorted[1]! - sorted[0]! > 0.04 && sorted[2]! - sorted[1]! > 0.04 && sorted[3]! - sorted[2]! > 0.04);
    need(p.items.every((it) => !isPerfect(it.x, it.n)));
    const idx = vals.indexOf(p.mode === 'max' ? sorted[3]! : sorted[0]!);
    const texts = p.items.map((it) => rootTex(it.n, it.x));
    const lcmN = 12;
    const powers = p.items.map((it) => `${it.x}^{${lcmN / it.n}}`).join(',\\ ');
    return {
      stem: L(
        `Quyidagi sonlardan qaysi biri eng ${p.mode === 'max' ? 'katta' : 'kichik'}?`,
        `Какое из чисел ${p.mode === 'max' ? 'наибольшее' : 'наименьшее'}?`,
        `Tómendegi sanlardan qaysısı eń ${p.mode === 'max' ? 'úlken' : 'kishi'}?`, // kaa: tekshirilsin
        `Which of the following numbers is the ${p.mode === 'max' ? 'largest' : 'smallest'}?`,
      ),
      correct: M(texts[idx]!),
      wrong: texts.filter((_, i) => i !== idx).map(M),
      sol: L(
        `Hammasini $12$-darajaga ko'taramiz (ildiz ko'rsatkichlarining EKUK i): ${M(powers)}. Bu sonlarning tartibi asl sonlarniki bilan bir xil. Eng ${p.mode === 'max' ? 'katta' : 'kichik'}: ${M(texts[idx]!)}.`,
        `Возведём все числа в $12$-ю степень (НОК показателей корней): ${M(powers)}. Порядок сохраняется. ${p.mode === 'max' ? 'Наибольшее' : 'Наименьшее'}: ${M(texts[idx]!)}.`,
        `Barlıǵın $12$-dárejege kóteremiz (tamır kórsetkishleriniń EKUK i): ${M(powers)}. Tártip saqlanadı. Eń ${p.mode === 'max' ? 'úlkeni' : 'kishisi'}: ${M(texts[idx]!)}.`, // kaa: tekshirilsin
        `Raise all numbers to the $12$th power (the LCM of the root indices): ${M(powers)}. The order is preserved. The ${p.mode === 'max' ? 'largest' : 'smallest'} is ${M(texts[idx]!)}.`,
      ),
      mis: L(
        "Ildiz ostidagi soni kattasini eng katta deb olish (ildiz ko'rsatkichi katta bo'lsa, qiymat kichrayadi); umumiy darajaga keltirmaslik.",
        'Считать наибольшим число с наибольшим подкоренным выражением (чем больше показатель корня, тем меньше значение); не приводить к общей степени.',
        "Tamır astındaǵı sanı úlkenin eń úlken dep alıw (tamır kórsetkishi úlken bolsa, mánis kishireyedi); ulıwma dárejege keltirmew.", // kaa: tekshirilsin
        'Choosing the largest radicand (a larger root index lowers the value); not reducing to a common power.',
      ),
    };
  },
);

// --- 106: qat'iy tengsizliklar, chiziqli ifoda (O, L2) ---
interface BoundsP {
  a: number;
  b: number;
  c: number;
  d: number;
  al: number;
  be: number;
}
oT<BoundsP>(
  'ni-o-bounds',
  106,
  'L2',
  140,
  (r) => ({ a: r.int(-5, 3), b: r.int(-2, 8), c: r.int(-5, 3), d: r.int(-2, 8), al: r.int(1, 5), be: r.pick([-4, -3, -2, 2, 3, 4]) }),
  (p) => {
    need(p.b - p.a >= 2 && p.d - p.c >= 2 && p.b - p.a <= 7 && p.d - p.c <= 7);
    const ys = [p.be * p.c, p.be * p.d];
    const lo = p.al * p.a + Math.min(...ys);
    const hi = p.al * p.b + Math.max(...ys);
    need(hi - lo >= 5);
    const exprE = `${p.al === 1 ? '' : p.al}x${p.be < 0 ? '-' : '+'}${Math.abs(p.be)}y`;
    const cond = M(`${p.a}<x<${p.b},\\quad ${p.c}<y<${p.d}`);
    return {
      stem: L(
        `${cond} bo'lsin. ${M(`E=${exprE}`)} ifodaning qabul qilishi mumkin bo'lgan butun qiymatlari haqida savollar.`,
        `Пусть ${cond}. Вопросы о целых значениях выражения ${M(`E=${exprE}`)}.`,
        `${cond} bolsın. ${M(`E=${exprE}`)} ańlatpanıń qabıl etiwi múmkin bolǵan pútin mánisleri haqqında sorawlar.`, // kaa: tekshirilsin
        `Let ${cond}. Questions about the integer values of ${M(`E=${exprE}`)}.`,
      ),
      a: { prompt: L('Ifodaning eng katta butun qiymatini toping.', 'Найдите наибольшее целое значение выражения.', 'Ańlatpanıń eń úlken pútin mánisin tabıń.', 'Find the greatest integer value of the expression.'), key: frac(hi - 1) }, // kaa: tekshirilsin
      b: { prompt: L('Ifodaning eng kichik butun qiymatini toping.', 'Найдите наименьшее целое значение выражения.', 'Ańlatpanıń eń kishi pútin mánisin tabıń.', 'Find the least integer value of the expression.'), key: frac(lo + 1) }, // kaa: tekshirilsin
      sol: L(
        `Tengsizliklarni ${p.al} ga va ${p.be} ga ko'paytirib (manfiy songa ko'paytirganda ishora o'zgaradi), qo'shamiz: ${M(`${lo}<E<${hi}`)}. Chegaralar kirmaydi: eng katta ${M(String(hi - 1))}, eng kichik ${M(String(lo + 1))}.`,
        `Умножаем неравенства на ${p.al} и на ${p.be} (при умножении на отрицательное число знак меняется) и складываем: ${M(`${lo}<E<${hi}`)}. Границы не включаются: наибольшее ${M(String(hi - 1))}, наименьшее ${M(String(lo + 1))}.`,
        `Teńsizliklerdi ${p.al} ge hám ${p.be} ge kóbeytip (teris sanǵa kóbeytkende belgi ózgeredi), qosamız: ${M(`${lo}<E<${hi}`)}. Shegaralar kirmeydi: eń úlkeni ${M(String(hi - 1))}, eń kishisi ${M(String(lo + 1))}.`, // kaa: tekshirilsin
        `Multiply the inequalities by ${p.al} and ${p.be} (the sign flips for a negative factor) and add: ${M(`${lo}<E<${hi}`)}. The bounds are excluded: greatest ${M(String(hi - 1))}, least ${M(String(lo + 1))}.`,
      ),
      mis: L(
        "Manfiy songa ko'paytirganda tengsizlik ishorasini o'zgartirmaslik; qat'iy tengsizlikda chegaralarni ham qiymat deb olish.",
        'Не поменять знак неравенства при умножении на отрицательное число; включить границы при строгом неравенстве.',
        "Teris sanǵa kóbeytkende teńsizlik belgisin ózgertpew; qatań teńsizlikte shegaralardı da mánis dep alıw.", // kaa: tekshirilsin
        'Not flipping the inequality when multiplying by a negative number; including the bounds in a strict inequality.',
      ),
    };
  },
);

// --- 106: ildiz tengsizligi, natural n lar soni (L1) ---
interface CountNP {
  P: number;
  Q: number;
  kind: 'sqrt' | 'cbrt';
}
y1T<CountNP>(
  'ni-count',
  106,
  'L1',
  90,
  (r) => ({ P: r.int(3, 13), Q: r.int(8, 24), kind: r.pick(['sqrt', 'cbrt'] as const) }),
  (p) => {
    // chegaralar P/2 va Q/2 (yarim butun yoki butun)
    const e = p.kind === 'sqrt' ? 2 : 3;
    need(p.Q > p.P + 2 && (p.kind === 'sqrt' || p.Q <= 12));
    // P/2 < n^(1/e) < Q/2  <=>  P^e < 8^(e-1)... n * 2^e > P^e ... tekshiruv butun sonlar bilan
    const lo = p.P ** e;
    const hi = p.Q ** e;
    const den = 2 ** e;
    let ans = 0;
    for (let n = 1; n * den <= hi; n++) if (n * den > lo && n * den < hi) ans++;
    need(ans >= 5);
    const rt = (x: number | string) => rootTex(e, x);
    const dcm = (x: number) => String(x).replace('.', '{,}');
    const powd = M(`${dcm(lo / den)}<n<${dcm(hi / den)}`);
    const fl = (x: number) => (x % 2 === 0 ? String(x / 2) : `${Math.floor(x / 2)}{,}5`);
    const lowN = Math.floor(lo / den) + 1;
    const highN = Math.ceil(hi / den) - 1;
    const wrong = [ans + 1, ans - 1, highN - lowN + 2, Math.round((p.Q - p.P) / 2) * (e === 2 ? 4 : 5), highN];
    const ineq = `${fl(p.P)}<${rt('n')}<${fl(p.Q)}`;
    return {
      stem: L(`${M(ineq)} tengsizlikni qanoatlantiradigan natural ${M('n')} sonlari nechta?`, `Сколько натуральных чисел ${M('n')} удовлетворяют неравенству ${M(ineq)}?`, `${M(ineq)} teńsizligin qanaatlandıratuǵın natural ${M('n')} sanları neshe?`, `How many natural numbers ${M('n')} satisfy ${M(ineq)}?`), // kaa: tekshirilsin
      correct: mi(ans),
      wrong: intWrong(ans, wrong, { min: 1 }),
      sol: L(
        `Tengsizlikning barcha qismlarini ${e}-darajaga ko'taramiz (hamma qismi musbat): ${powd}. Butun qiymatlar ${M(`${lowN},\\ldots,${highN}`)}: ${mi(ans)} ta.`,
        `Возводим все части неравенства в ${e}-ю степень (все части положительны): ${powd}. Целые значения ${M(`${lowN},\\ldots,${highN}`)}: ${mi(ans)} шт.`,
        `Teńsizliktiń barlıq bólimlerin ${e}-dárejege kóteremiz (barlıǵı oń): ${powd}. Pútin mánisler ${M(`${lowN},\\ldots,${highN}`)}: ${mi(ans)} dana.`, // kaa: tekshirilsin
        `Raise all parts to the power ${e} (all parts are positive): ${powd}. The integers are ${M(`${lowN},\\ldots,${highN}`)}: ${mi(ans)} of them.`,
      ),
      mis: L(
        "Chegaralarni darajaga ko'tarmasdan ildiz ostidagi $n$ ni chegaralar bilan taqqoslash; chegaralarni ham sanash.",
        'Сравнивать $n$ с границами, не возводя их в степень; включать границы.',
        "Shegaralardı dárejege kótermesten tamır astındaǵı $n$ di shegaralar menen salıstırıw; shegaralardı da sanaw.", // kaa: tekshirilsin
        'Comparing $n$ with the bounds without raising them to a power; including the bounds.',
      ),
    };
  },
);

// =====================================================================================================
// 2.2 Trigonometriya asoslari (mavzular 22-26, 52 va 107 Burchakning radian o'lchovi; nuqtani burish)
// =====================================================================================================

const TG = L('\\operatorname{tg}', '\\operatorname{tg}', '\\operatorname{tg}', '\\tan');
const CTG = L('\\operatorname{ctg}', '\\operatorname{ctg}', '\\operatorname{ctg}', '\\cot');
const deg = (d: number): string => `${d}^{\\circ}`;
const ROMAN = ['', 'I', 'II', 'III', 'IV'] as const;

/** c * sqrt(k) ko'rinishidagi aniq qiymat */
interface Rad {
  c: Frac;
  k: number;
}
const SIN_TABLE: Record<number, Rad> = {
  0: { c: frac(0), k: 1 },
  30: { c: frac(1, 2), k: 1 },
  45: { c: frac(1, 2), k: 2 },
  60: { c: frac(1, 2), k: 3 },
  90: { c: frac(1), k: 1 },
};
const negRad = (r: Rad): Rad => ({ c: frac(-r.c.n, r.c.d), k: r.k });
function exactSin(d: number): Rad {
  const a = ((d % 360) + 360) % 360;
  if (a <= 90) return SIN_TABLE[a]!;
  if (a <= 180) return SIN_TABLE[180 - a]!;
  if (a <= 270) return negRad(SIN_TABLE[a - 180]!);
  return negRad(SIN_TABLE[360 - a]!);
}
const exactCos = (d: number): Rad => exactSin(d + 90);
const TAN_TABLE: Record<number, Rad | null> = { 0: { c: frac(0), k: 1 }, 30: { c: frac(1, 3), k: 3 }, 45: { c: frac(1), k: 1 }, 60: { c: frac(1), k: 3 }, 90: null };
function exactTan(d: number): Rad | null {
  const a = ((d % 180) + 180) % 180;
  if (a <= 90) return TAN_TABLE[a]!;
  const t = TAN_TABLE[180 - a];
  return t ? negRad(t) : null;
}
/** c*sqrt(k) TeX yozuvi: 1/2 sqrt3 -> \frac{\sqrt{3}}{2} */
function radTexC(c: Frac, k: number): string {
  if (c.n === 0) return '0';
  if (k === 1) return texFrac(c);
  const sign = c.n < 0 ? '-' : '';
  const a = Math.abs(c.n);
  const body = `${a === 1 ? '' : a}\\sqrt{${k}}`;
  return c.d === 1 ? `${sign}${body}` : `${sign}\\frac{${body}}{${c.d}}`;
}
const radTex = (r: Rad): string => radTexC(r.c, r.k);
/** kasr * pi: 5/6 -> \frac{5\pi}{6}, 2 -> 2\pi, 1 -> \pi */
function piTex(c: Frac): string {
  if (c.n === 0) return '0';
  const sign = c.n < 0 ? '-' : '';
  const a = Math.abs(c.n);
  const num = a === 1 ? '\\pi' : `${a}\\pi`;
  return c.d === 1 ? `${sign}${num}` : `${sign}\\frac{${num}}{${c.d}}`;
}
/** Burchak (daraja) kvadrantda yotadigan chorak 1..4 (chegarada emas) */
const quadrantOf = (d: number): number => {
  const a = ((d % 360) + 360) % 360;
  return a < 90 ? 1 : a < 180 ? 2 : a < 270 ? 3 : 4;
};
const quadWord = (q: number): L10n => L(`${ROMAN[q]} chorakda`, `${ROMAN[q]} четверти`, `${ROMAN[q]} shirekte`, `quadrant ${ROMAN[q]}`); // kaa: tekshirilsin

// --- 22: asosiy ayniyat, chorak ishorasi (L1) ---
interface PythP {
  x: number;
  y: number;
  c: number;
  given: 'sin' | 'cos';
  ask: 'sin' | 'cos' | 'tan' | 'cot';
}
const PY_TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
y1T<PythP>(
  'tr-pyth',
  22,
  'L1',
  90,
  (r) => {
    const [a, b, c] = r.pick(PY_TRIPLES);
    const [u, v] = r.chance(0.5) ? [a, b] : [b, a];
    const given = r.pick(['sin', 'cos'] as const);
    return { x: r.pick([-1, 1]) * v, y: r.pick([-1, 1]) * u, c, given, ask: r.pick(given === 'sin' ? (['cos', 'tan', 'cot'] as const) : (['sin', 'tan', 'cot'] as const)) };
  },
  (p) => {
    const sinV = frac(p.y, p.c);
    const cosV = frac(p.x, p.c);
    const tanV = frac(p.y, p.x);
    const cotV = frac(p.x, p.y);
    const ans = { sin: sinV, cos: cosV, tan: tanV, cot: cotV }[p.ask];
    const givenV = p.given === 'sin' ? sinV : cosV;
    const quad = p.x > 0 ? (p.y > 0 ? 1 : 4) : p.y > 0 ? 2 : 3;
    const neg = (f: Frac) => frac(-f.n, f.d);
    const wrong = [neg(ans), { sin: cosV, cos: sinV, tan: cotV, cot: tanV }[p.ask], p.ask === 'tan' || p.ask === 'cot' ? neg({ tan: cotV, cot: tanV }[p.ask]) : neg({ sin: cosV, cos: sinV }[p.ask]), safeFrac(Math.abs(givenV.n) === 0 ? 1 : Math.abs(ans.n) + 1, ans.d)];
    const nm = (l: 'uz' | 'ru' | 'kaa' | 'en') => (p.ask === 'tan' ? TG[l] : p.ask === 'cot' ? CTG[l] : `\\${p.ask}`);
    const base = `\\${p.given}\\alpha=${texFrac(givenV)}`;
    const other = frac(Math.abs(p.given === 'sin' ? p.x : p.y), p.c);
    const reason = M(`\\${p.given === 'sin' ? 'cos' : 'sin'}^2\\alpha=1-${texFrac(frac(givenV.n ** 2, givenV.d ** 2))}=${texFrac(frac(other.n ** 2, other.d ** 2))}`);
    return {
      stem: L(
        `${M(base)} va ${M('\\alpha')} burchak ${quadWord(quad).uz}. ${M(`${nm('uz')}\\alpha`)} ni toping.`,
        `${M(base)}, угол ${M('\\alpha')} находится в ${quadWord(quad).ru}. Найдите ${M(`${nm('ru')}\\alpha`)}.`,
        `${M(base)} hám ${M('\\alpha')} múyeshi ${quadWord(quad).kaa}. ${M(`${nm('kaa')}\\alpha`)} di tabıń.`, // kaa: tekshirilsin
        `${M(base)} and the angle ${M('\\alpha')} is in ${quadWord(quad).en}. Find ${M(`${nm('en')}\\alpha`)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${reason}, demak moduli ${M(texFrac(other))}; ${ROMAN[quad]} chorakda ishorasini hisobga olamiz. ${M(`${nm('uz')}\\alpha=${texFrac(ans)}`)}.`,
        `${reason}, значит модуль равен ${M(texFrac(other))}; учитываем знак в ${ROMAN[quad]} четверти. ${M(`${nm('ru')}\\alpha=${texFrac(ans)}`)}.`,
        `${reason}, demek moduli ${M(texFrac(other))}; ${ROMAN[quad]} shirekte belgisin esapqa alamız. ${M(`${nm('kaa')}\\alpha=${texFrac(ans)}`)}.`, // kaa: tekshirilsin
        `${reason}, so the modulus is ${M(texFrac(other))}; take the sign of quadrant ${ROMAN[quad]}. ${M(`${nm('en')}\\alpha=${texFrac(ans)}`)}.`,
      ),
      mis: L(
        "Kvadrat ildizdan chiqqan qiymatning ishorasini chorakka qarab aniqlamaslik; $\\operatorname{tg}$ va $\\operatorname{ctg}$ ni bir-biriga almashtirish.",
        'Не определить знак по четверти после извлечения корня; перепутать $\\operatorname{tg}$ и $\\operatorname{ctg}$.',
        "Kvadrat tamırdan shıqqan mánistiń belgisin shirekke qarap anıqlamaw; $\\operatorname{tg}$ hám $\\operatorname{ctg}$ di bir-birine almastırıw.", // kaa: tekshirilsin
        'Not choosing the sign by the quadrant after taking the root; swapping $\\tan$ and $\\cot$.',
      ),
    };
  },
);

// --- 22: tg berilgan, bir jinsli ifoda (L2) ---
interface TanRatioP {
  n: number;
  m: number;
  kind: 'lin' | 'sc' | 's2';
  a: number;
  b: number;
  c: number;
  d: number;
}
y1T<TanRatioP>(
  'tr-tanratio',
  22,
  'L2',
  110,
  (r) => ({ n: r.pick([-1, 1]) * r.int(1, 6), m: r.int(1, 5), kind: r.pick(['lin', 'lin', 'sc', 's2'] as const), a: r.int(-5, 6), b: r.int(-5, 6), c: r.int(-4, 5), d: r.int(-4, 5) }),
  (p) => {
    need(gcd(Math.abs(p.n), p.m) === 1 && !(p.m === 1 && Math.abs(p.n) === 1));
    const t = frac(p.n, p.m);
    let ans: Frac;
    let expr: string;
    let wrong: (Frac | null)[];
    if (p.kind === 'lin') {
      need(p.a !== 0 && p.b !== 0 && p.c !== 0 && p.d !== 0 && Math.abs(p.a * p.d - p.b * p.c) > 0);
      const num = fAdd(fMul(frac(p.a), t), frac(p.b));
      const den = fAdd(fMul(frac(p.c), t), frac(p.d));
      need(den.n !== 0);
      ans = fDiv(num, den);
      const term = (u: number, fn: string, first: boolean) => `${first ? '' : u > 0 ? '+' : '-'}${Math.abs(u) === 1 ? '' : Math.abs(u)}${fn}`;
      expr = `\\dfrac{${term(p.a, '\\sin\\alpha', true)}${term(p.b, '\\cos\\alpha', false)}}{${term(p.c, '\\sin\\alpha', true)}${term(p.d, '\\cos\\alpha', false)}}`;
      wrong = [safeFrac(p.a + p.b, p.c + p.d), fDiv(fAdd(fMul(frac(p.b), t), frac(p.a)), fAdd(fMul(frac(p.d), t), frac(p.c))), fDiv(fAdd(fMul(frac(p.a), t), frac(-p.b)), fAdd(fMul(frac(p.c), t), frac(-p.d))), fMul(ans, frac(-1))];
    } else if (p.kind === 'sc') {
      ans = fDiv(t, fAdd(frac(1), fMul(t, t)));
      expr = '\\sin\\alpha\\cos\\alpha';
      wrong = [fDiv(t, fAdd(frac(1), t)), fDiv(frac(1), fAdd(frac(1), fMul(t, t))), fDiv(fMul(t, t), fAdd(frac(1), fMul(t, t))), fMul(t, t)];
    } else {
      ans = fDiv(fMul(t, t), fAdd(frac(1), fMul(t, t)));
      expr = '\\sin^2\\alpha';
      wrong = [fDiv(frac(1), fAdd(frac(1), fMul(t, t))), fMul(t, t), fDiv(t, fAdd(frac(1), fMul(t, t))), fDiv(fMul(t, t), fAdd(frac(1), t))];
    }
    need(ans.d <= 400 && ans.n !== 0);
    const given = (lang: 'uz' | 'ru' | 'kaa' | 'en') => M(`${TG[lang]}\\alpha=${texFrac(t)}`);
    const hint =
      p.kind === 'lin'
        ? L('Suratni ham maxrajni ham $\\cos\\alpha$ ga bo\'lamiz.', 'Делим числитель и знаменатель на $\\cos\\alpha$.', 'Alım hám bólimdi $\\cos\\alpha$ ge bólemiz.', 'Divide numerator and denominator by $\\cos\\alpha$.') // kaa: tekshirilsin
        : L('$\\sin^2\\alpha=\\dfrac{t^2}{1+t^2}$, $\\sin\\alpha\\cos\\alpha=\\dfrac{t}{1+t^2}$ formulalaridan foydalanamiz.', 'Используем $\\sin^2\\alpha=\\dfrac{t^2}{1+t^2}$, $\\sin\\alpha\\cos\\alpha=\\dfrac{t}{1+t^2}$.', '$\\sin^2\\alpha=\\dfrac{t^2}{1+t^2}$, $\\sin\\alpha\\cos\\alpha=\\dfrac{t}{1+t^2}$ formulalarınan paydalanamız.', 'Use $\\sin^2\\alpha=\\dfrac{t^2}{1+t^2}$ and $\\sin\\alpha\\cos\\alpha=\\dfrac{t}{1+t^2}$.'); // kaa: tekshirilsin
    return {
      stem: L(
        `${given('uz')} bo'lsa, ${M(expr)} ifodaning qiymatini toping.`,
        `Найдите значение ${M(expr)}, если ${given('ru')}.`,
        `${given('kaa')} bolsa, ${M(expr)} ańlatpanıń mánisin tabıń.`, // kaa: tekshirilsin
        `If ${given('en')}, find the value of ${M(expr)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(`${hint.uz} Natija ${mf(ans)}.`, `${hint.ru} Результат ${mf(ans)}.`, `${hint.kaa} Nátiyje ${mf(ans)}.`, `${hint.en} Result ${mf(ans)}.`), // kaa: tekshirilsin
      mis: L(
        "$\\operatorname{tg}\\alpha$ ni $\\sin\\alpha$ yoki $\\cos\\alpha$ ning o'zi deb olish; $\\sin\\alpha$ va $\\cos\\alpha$ ni alohida topishga urinib ishoralarni adashtirish.",
        'Принимать $\\operatorname{tg}\\alpha$ за $\\sin\\alpha$ или $\\cos\\alpha$; искать $\\sin\\alpha$ и $\\cos\\alpha$ по отдельности и путать знаки.',
        "$\\operatorname{tg}\\alpha$ di $\\sin\\alpha$ yamasa $\\cos\\alpha$ dıń ózi dep alıw; $\\sin\\alpha$ hám $\\cos\\alpha$ di bólek tabıwǵa urınıp belgilerdi shatastırıw.", // kaa: tekshirilsin
        'Taking $\\tan\\alpha$ for $\\sin\\alpha$ or $\\cos\\alpha$; finding $\\sin\\alpha$ and $\\cos\\alpha$ separately and mixing up signs.',
      ),
    };
  },
);

// --- 22: sin+cos berilgan (L3) ---
interface SinCosP {
  x: number;
  y: number;
  c: number;
  kind: 'prod' | 'cubes' | 'fourth';
}
y1T<SinCosP>(
  'tr-sincos',
  22,
  'L3',
  130,
  (r) => {
    const [a, b, c] = r.pick(PY_TRIPLES);
    const [u, v] = r.chance(0.5) ? [a, b] : [b, a];
    return { x: r.pick([-1, 1]) * v, y: r.pick([-1, 1]) * u, c, kind: r.pick(['prod', 'cubes', 'fourth'] as const) };
  },
  (p) => {
    const s = frac(p.x + p.y, p.c);
    need(s.n !== 0);
    const sc = fDiv(fSub(fMul(s, s), frac(1)), frac(2));
    need(sc.n !== 0);
    let ans: Frac;
    let expr: string;
    let wrong: (Frac | null)[];
    if (p.kind === 'prod') {
      ans = sc;
      expr = '\\sin\\alpha\\cos\\alpha';
      wrong = [fDiv(fAdd(fMul(s, s), frac(1)), frac(2)), fSub(fMul(s, s), frac(1)), fMul(s, s), fMul(sc, frac(-1))];
    } else if (p.kind === 'cubes') {
      ans = fMul(s, fSub(frac(1), sc));
      expr = '\\sin^3\\alpha+\\cos^3\\alpha';
      wrong = [fMul(s, fAdd(frac(1), sc)), fMul(s, s), fMul(fMul(s, s), s), fSub(frac(1), fMul(frac(2), sc))];
    } else {
      ans = fSub(frac(1), fMul(frac(2), fMul(sc, sc)));
      expr = '\\sin^4\\alpha+\\cos^4\\alpha';
      wrong = [fSub(frac(1), fMul(frac(2), sc)), fAdd(frac(1), fMul(frac(2), fMul(sc, sc))), fSub(frac(1), fMul(sc, sc)), fMul(s, s)];
    }
    need(ans.d <= 20000 && Math.abs(ans.n) <= 40000);
    const sTex = texFrac(s);
    const formula =
      p.kind === 'prod'
        ? ''
        : p.kind === 'cubes'
          ? M(`\\sin^3\\alpha+\\cos^3\\alpha=(\\sin\\alpha+\\cos\\alpha)(1-\\sin\\alpha\\cos\\alpha)`)
          : M(`\\sin^4\\alpha+\\cos^4\\alpha=1-2\\sin^2\\alpha\\cos^2\\alpha`);
    return {
      stem: L(
        `${M(`\\sin\\alpha+\\cos\\alpha=${sTex}`)} bo'lsa, ${M(expr)} ning qiymatini toping.`,
        `Найдите значение ${M(expr)}, если ${M(`\\sin\\alpha+\\cos\\alpha=${sTex}`)}.`,
        `${M(`\\sin\\alpha+\\cos\\alpha=${sTex}`)} bolsa, ${M(expr)} tiń mánisin tabıń.`, // kaa: tekshirilsin
        `If ${M(`\\sin\\alpha+\\cos\\alpha=${sTex}`)}, find the value of ${M(expr)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Avval ${M('\\sin\\alpha\\cos\\alpha')} ni topamiz: ${M(`(\\sin\\alpha+\\cos\\alpha)^2=1+2\\sin\\alpha\\cos\\alpha`)}, ${M(`\\sin\\alpha\\cos\\alpha=\\dfrac{\\left(${sTex}\\right)^2-1}{2}=${texFrac(sc)}`)}.${formula ? ` ${formula}.` : ''} Natija ${mf(ans)}.`,
        `Сначала найдём ${M('\\sin\\alpha\\cos\\alpha')}: ${M(`(\\sin\\alpha+\\cos\\alpha)^2=1+2\\sin\\alpha\\cos\\alpha`)}, ${M(`\\sin\\alpha\\cos\\alpha=\\dfrac{\\left(${sTex}\\right)^2-1}{2}=${texFrac(sc)}`)}.${formula ? ` ${formula}.` : ''} Результат ${mf(ans)}.`,
        `Aldın ${M('\\sin\\alpha\\cos\\alpha')} di tabamız: ${M(`(\\sin\\alpha+\\cos\\alpha)^2=1+2\\sin\\alpha\\cos\\alpha`)}, ${M(`\\sin\\alpha\\cos\\alpha=\\dfrac{\\left(${sTex}\\right)^2-1}{2}=${texFrac(sc)}`)}.${formula ? ` ${formula}.` : ''} Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `First find ${M('\\sin\\alpha\\cos\\alpha')}: ${M(`(\\sin\\alpha+\\cos\\alpha)^2=1+2\\sin\\alpha\\cos\\alpha`)}, ${M(`\\sin\\alpha\\cos\\alpha=\\dfrac{\\left(${sTex}\\right)^2-1}{2}=${texFrac(sc)}`)}.${formula ? ` ${formula}.` : ''} Result ${mf(ans)}.`,
      ),
      mis: L(
        "Yig'indining kvadratida ikkilangan ko'paytmani unutish ($(a+b)^2=a^2+b^2+2ab$); kublar yig'indisi formulasida ishorani adashtirish.",
        'Забыть удвоенное произведение в $(a+b)^2$; перепутать знак в формуле суммы кубов.',
        "Qosındınıń kvadratında eki ese kóbeymeni umıtıw ($(a+b)^2=a^2+b^2+2ab$); kublar qosındısı formulasında belgini shatastırıw.", // kaa: tekshirilsin
        'Forgetting the double product in $(a+b)^2$; sign errors in the sum of cubes formula.',
      ),
    };
  },
);

// --- 23: keltirish, aniq qiymatlar yig'indisi (L2) ---
interface ReduceP {
  terms: { fn: 'sin' | 'cos' | 'tg'; d: number; k: number }[];
}
const REDUCE_BASE: Record<'sin' | 'cos' | 'tg', number[]> = { sin: [30, 150, 210, 330], cos: [60, 120, 240, 300], tg: [45, 135, 225, 315] };
const reduceVal = (fn: 'sin' | 'cos' | 'tg', d: number): Frac => {
  const r = fn === 'sin' ? exactSin(d) : fn === 'cos' ? exactCos(d) : exactTan(d)!;
  return r.c;
};
y1T<ReduceP>(
  'tr-reduce',
  23,
  'L2',
  110,
  (r) => ({
    terms: (['sin', 'cos', 'tg'] as const).map((fn) => ({ fn, d: r.pick(REDUCE_BASE[fn]) + 360 * r.int(-2, 6), k: r.pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6, 8]) })),
  }),
  (p) => {
    const vals = p.terms.map((t) => reduceVal(t.fn, t.d));
    need(vals.every((v) => v.n !== 0) && p.terms.every((t) => t.d > 0));
    const parts = p.terms.map((t, i) => fMul(frac(t.k), vals[i]!));
    const ans = parts.reduce((s, x) => fAdd(s, x), frac(0));
    need(ans.n !== 0 && Math.abs(fracVal(ans)) < 30 && new Set(p.terms.map((t) => Math.floor(t.d / 360))).size >= 2);
    const wrong = parts.map((x) => fSub(ans, fMul(frac(2), x)));
    const ref = p.terms.map((t, i) => fMul(frac(t.k), frac(Math.abs(vals[i]!.n), vals[i]!.d)));
    wrong.push(ref.reduce((s, x) => fAdd(s, x), frac(0)));
    const nameOf = (l: 'uz' | 'ru' | 'kaa' | 'en', fn: 'sin' | 'cos' | 'tg') => (fn === 'tg' ? TG[l] : `\\${fn}`);
    const exprFor = (l: 'uz' | 'ru' | 'kaa' | 'en') =>
      p.terms
        .map((t, i) => `${i === 0 ? (t.k < 0 ? '-' : '') : t.k < 0 ? '-' : '+'}${Math.abs(t.k) === 1 ? '' : Math.abs(t.k)}${nameOf(l, t.fn)}${deg(t.d)}`)
        .join('');
    const redTex = p.terms.map((t, i) => `${nameOf('uz', t.fn)}${deg(t.d)}=${texFrac(vals[i]!)}`).join(',\\ ');
    return {
      stem: L(`${M(exprFor('uz'))} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(exprFor('ru'))}.`, `${M(exprFor('kaa'))} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(exprFor('en'))}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Burchaklarni davr ($360^{\\circ}$ yoki $180^{\\circ}$) va keltirish formulalari bilan soddalashtiramiz: ${M(redTex)}. Yig'indi ${mf(ans)}.`,
        `Приводим углы с помощью периода ($360^{\\circ}$ или $180^{\\circ}$) и формул приведения: ${M(redTex)}. Сумма ${mf(ans)}.`,
        `Múyeshlerdi dáwir ($360^{\\circ}$ yamasa $180^{\\circ}$) hám keltiriw formulaları menen ápiwayılastıramız: ${M(redTex)}. Qosındı ${mf(ans)}.`, // kaa: tekshirilsin
        `Reduce the angles with the period ($360^{\\circ}$ or $180^{\\circ}$) and reduction formulas: ${M(redTex)}. The sum is ${mf(ans)}.`,
      ),
      mis: L(
        "Chorakka qarab ishorani adashtirish; $360^{\\circ}$ ning butun karralisini tashlamaslik.",
        'Ошибиться в знаке по четверти; не отбросить целое число оборотов $360^{\\circ}$.',
        "Shirekke qarap belgini shatastırıw; $360^{\\circ}$ tıń pútin eselerin taslamaw.", // kaa: tekshirilsin
        'Getting the sign wrong for the quadrant; not discarding whole multiples of $360^{\\circ}$.',
      ),
    };
  },
);

// --- 23: radianli katta burchak (L2) ---
interface LargeAngleP {
  fn: 'sin' | 'cos' | 'tan';
  n: number;
  d: number;
}
y1T<LargeAngleP>(
  'tr-large',
  23,
  'L2',
  100,
  (r) => ({ fn: r.pick(['sin', 'cos', 'tan'] as const), n: r.int(7, 61), d: r.pick([3, 4, 6]) }),
  (p) => {
    const dg = (p.n * 180) / p.d;
    need(Number.isInteger(dg) && Math.abs(dg) > 360);
    const val = p.fn === 'sin' ? exactSin(dg) : p.fn === 'cos' ? exactCos(dg) : exactTan(dg);
    need(val !== null && val.c.n !== 0 && gcd(p.n, p.d) === 1);
    const ans = radTex(val);
    // chalg'ituvchilar: ishorasi teskari, boshqa funksiya, boshqa burchak
    const alt = (fnx: 'sin' | 'cos' | 'tan', d2: number): Rad | null => (fnx === 'sin' ? exactSin(d2) : fnx === 'cos' ? exactCos(d2) : exactTan(d2));
    const cands: (Rad | null)[] = [negRad(val), alt(p.fn === 'sin' ? 'cos' : 'sin', dg), alt(p.fn, dg + 90), alt(p.fn, dg + 60), alt(p.fn, -dg), alt(p.fn === 'tan' ? 'sin' : 'tan', dg)];
    const wrong = uniq(cands.filter((c): c is Rad => c !== null).map(radTex)).filter((t) => t !== ans);
    const nm = (l: 'uz' | 'ru' | 'kaa' | 'en') => (p.fn === 'tan' ? TG[l] : `\\${p.fn}`);
    const red = ((dg % (p.fn === 'tan' ? 180 : 360)) + (p.fn === 'tan' ? 180 : 360)) % (p.fn === 'tan' ? 180 : 360);
    const arg = `\\frac{${p.n}\\pi}{${p.d}}`;
    return {
      stem: L(`${M(`${nm('uz')}${arg}`)} ning qiymatini toping.`, `Найдите значение ${M(`${nm('ru')}${arg}`)}.`, `${M(`${nm('kaa')}${arg}`)} tiń mánisin tabıń.`, `Find the value of ${M(`${nm('en')}${arg}`)}.`), // kaa: tekshirilsin
      correct: M(ans),
      wrong: wrong.map(M),
      sol: L(
        `${M(`${arg}=${deg(dg)}`)}. Davrni ($${p.fn === 'tan' ? '180' : '360'}^{\\circ}$) tashlab: ${M(deg(red))}. Natija ${M(ans)}.`,
        `${M(`${arg}=${deg(dg)}`)}. Отбрасываем период ($${p.fn === 'tan' ? '180' : '360'}^{\\circ}$): ${M(deg(red))}. Результат ${M(ans)}.`,
        `${M(`${arg}=${deg(dg)}`)}. Dáwirdi ($${p.fn === 'tan' ? '180' : '360'}^{\\circ}$) taslap: ${M(deg(red))}. Nátiyje ${M(ans)}.`, // kaa: tekshirilsin
        `${M(`${arg}=${deg(dg)}`)}. Discard the period ($${p.fn === 'tan' ? '180' : '360'}^{\\circ}$): ${M(deg(red))}. Result ${M(ans)}.`,
      ),
      mis: L(
        "$\\pi$ ni $180^{\\circ}$ ga aylantirib, davrni (sinus/kosinusda $2\\pi$, tangensda $\\pi$) noto'g'ri tashlash; chorak ishorasini adashtirish.",
        'Неверно отбросить период ($2\\pi$ для синуса/косинуса, $\\pi$ для тангенса); ошибиться в знаке по четверти.',
        "$\\pi$ di $180^{\\circ}$ qa aylandırıp, dáwirdi (sinus/kosinusta $2\\pi$, tangensta $\\pi$) qate taslaw; shirek belgisin shatastırıw.", // kaa: tekshirilsin
        'Dropping the period incorrectly ($2\\pi$ for sine/cosine, $\\pi$ for tangent); getting the quadrant sign wrong.',
      ),
    };
  },
);

// --- 24: ikkilangan burchak formulalari (L2) ---
interface DoubleP {
  x: number;
  y: number;
  c: number;
  ask: 'sin2' | 'cos2' | 'tan2';
  given: 'sin' | 'cos';
}
y1T<DoubleP>(
  'tr-double',
  24,
  'L2',
  110,
  (r) => {
    const [a, b, c] = r.pick(PY_TRIPLES);
    const [u, v] = r.chance(0.5) ? [a, b] : [b, a];
    return { x: r.pick([-1, 1]) * v, y: r.pick([-1, 1]) * u, c, ask: r.pick(['sin2', 'cos2', 'tan2'] as const), given: r.pick(['sin', 'cos'] as const) };
  },
  (p) => {
    const s = frac(p.y, p.c);
    const co = frac(p.x, p.c);
    const sin2 = fMul(frac(2), fMul(s, co));
    const cos2 = fSub(fMul(co, co), fMul(s, s));
    need(cos2.n !== 0 || p.ask !== 'tan2');
    const ans = p.ask === 'sin2' ? sin2 : p.ask === 'cos2' ? cos2 : fDiv(sin2, cos2);
    const quad = p.x > 0 ? (p.y > 0 ? 1 : 4) : p.y > 0 ? 2 : 3;
    const gv = p.given === 'sin' ? s : co;
    const neg = (f: Frac) => frac(-f.n, f.d);
    const wrong = p.ask === 'sin2' ? [neg(sin2), fMul(frac(2), s), fMul(s, co), cos2] : p.ask === 'cos2' ? [neg(cos2), fSub(fMul(frac(2), fMul(s, s)), frac(1)), fMul(frac(2), fMul(co, co)), sin2] : [fDiv(cos2, sin2), neg(ans), fMul(frac(2), fDiv(s, co)), fDiv(frac(2), fDiv(co, s))].map((f) => (f.d === 0 ? null : f));
    const asked = (l: 'uz' | 'ru' | 'kaa' | 'en') => (p.ask === 'sin2' ? '\\sin 2\\alpha' : p.ask === 'cos2' ? '\\cos 2\\alpha' : `${TG[l]}\\,2\\alpha`);
    const giv = `\\${p.given}\\alpha=${texFrac(gv)}`;
    return {
      stem: L(
        `${M(giv)} va ${M('\\alpha')} burchak ${quadWord(quad).uz}. ${M(asked('uz'))} ni toping.`,
        `${M(giv)}, угол ${M('\\alpha')} в ${quadWord(quad).ru}. Найдите ${M(asked('ru'))}.`,
        `${M(giv)} hám ${M('\\alpha')} múyeshi ${quadWord(quad).kaa}. ${M(asked('kaa'))} di tabıń.`, // kaa: tekshirilsin
        `${M(giv)} and ${M('\\alpha')} is in ${quadWord(quad).en}. Find ${M(asked('en'))}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Avval ${M(`\\sin\\alpha=${texFrac(s)}`)}, ${M(`\\cos\\alpha=${texFrac(co)}`)} (ishora chorakdan). ${M('\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha,\\ \\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha')}. Natija ${mf(ans)}.`,
        `Сначала ${M(`\\sin\\alpha=${texFrac(s)}`)}, ${M(`\\cos\\alpha=${texFrac(co)}`)} (знак по четверти). ${M('\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha,\\ \\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha')}. Результат ${mf(ans)}.`,
        `Aldın ${M(`\\sin\\alpha=${texFrac(s)}`)}, ${M(`\\cos\\alpha=${texFrac(co)}`)} (belgi shirekten). ${M('\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha,\\ \\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha')}. Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `First ${M(`\\sin\\alpha=${texFrac(s)}`)}, ${M(`\\cos\\alpha=${texFrac(co)}`)} (sign from the quadrant). ${M('\\sin2\\alpha=2\\sin\\alpha\\cos\\alpha,\\ \\cos2\\alpha=\\cos^2\\alpha-\\sin^2\\alpha')}. Result ${mf(ans)}.`,
      ),
      mis: L(
        "$\\sin2\\alpha$ ni $2\\sin\\alpha$ deb olish; chorak bo'yicha kosinus yoki sinus ishorasini adashtirish.",
        'Считать $\\sin2\\alpha=2\\sin\\alpha$; ошибиться в знаке синуса или косинуса по четверти.',
        "$\\sin2\\alpha$ di $2\\sin\\alpha$ dep alıw; shirek boyınsha kosinus yamasa sinus belgisin shatastırıw.", // kaa: tekshirilsin
        'Writing $\\sin2\\alpha=2\\sin\\alpha$; getting the sign of sine or cosine wrong for the quadrant.',
      ),
    };
  },
);

// --- 24: tangenslar yig'indisi/ayirmasi (L2) ---
interface TanSumP {
  n1: number;
  m1: number;
  n2: number;
  m2: number;
  sign: 1 | -1;
}
y1T<TanSumP>(
  'tr-tansum',
  24,
  'L2',
  100,
  (r) => ({ n1: r.pick([-1, 1]) * r.int(1, 5), m1: r.int(1, 5), n2: r.pick([-1, 1]) * r.int(1, 5), m2: r.int(1, 5), sign: r.pick([1, -1] as const) }),
  (p) => {
    need(gcd(Math.abs(p.n1), p.m1) === 1 && gcd(Math.abs(p.n2), p.m2) === 1);
    const a = frac(p.n1, p.m1);
    const b = frac(p.n2, p.m2);
    const num = p.sign === 1 ? fAdd(a, b) : fSub(a, b);
    const den = p.sign === 1 ? fSub(frac(1), fMul(a, b)) : fAdd(frac(1), fMul(a, b));
    need(den.n !== 0 && num.n !== 0);
    const ans = fDiv(num, den);
    need(ans.d <= 200 && Math.abs(ans.n) <= 200 && !eqF(a, b));
    const wrong = [p.sign === 1 ? fDiv(num, fAdd(frac(1), fMul(a, b))) : fDiv(num, fSub(frac(1), fMul(a, b))), num, fMul(ans, frac(-1)), fDiv(den, num)];
    const op = p.sign === 1 ? '+' : '-';
    const given = (l: 'uz' | 'ru' | 'kaa' | 'en') => M(`${TG[l]}\\alpha=${texFrac(a)},\\quad ${TG[l]}\\beta=${texFrac(b)}`);
    const ask = (l: 'uz' | 'ru' | 'kaa' | 'en') => M(`${TG[l]}(\\alpha${op}\\beta)`);
    const formula = M(`\\operatorname{tg}(\\alpha${op}\\beta)=\\dfrac{\\operatorname{tg}\\alpha${op}\\operatorname{tg}\\beta}{1${p.sign === 1 ? '-' : '+'}\\operatorname{tg}\\alpha\\operatorname{tg}\\beta}`);
    return {
      stem: L(`${given('uz')} bo'lsa, ${ask('uz')} ni toping.`, `Найдите ${ask('ru')}, если ${given('ru')}.`, `${given('kaa')} bolsa, ${ask('kaa')} di tabıń.`, `If ${given('en')}, find ${ask('en')}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${formula}: ${M(`\\dfrac{${texFrac(num)}}{${texFrac(den)}}=${texFrac(ans)}`)}.`,
        `${formula}: ${M(`\\dfrac{${texFrac(num)}}{${texFrac(den)}}=${texFrac(ans)}`)}.`,
        `${formula}: ${M(`\\dfrac{${texFrac(num)}}{${texFrac(den)}}=${texFrac(ans)}`)}.`, // kaa: tekshirilsin
        `${formula}: ${M(`\\dfrac{${texFrac(num)}}{${texFrac(den)}}=${texFrac(ans)}`)}.`,
      ),
      mis: L(
        "Maxrajdagi ishorani adashtirish (yig'indida $1-ab$, ayirmada $1+ab$); suratni maxrajga bo'lishni teskari qilish.",
        'Перепутать знак в знаменателе ($1-ab$ для суммы, $1+ab$ для разности); делить наоборот.',
        "Bólimdegi belgini shatastırıw (qosındıda $1-ab$, ayırmada $1+ab$); alımdı bólimge bóliwdi teris etiw.", // kaa: tekshirilsin
        'Mixing up the sign in the denominator ($1-ab$ for a sum, $1+ab$ for a difference); dividing the wrong way round.',
      ),
    };
  },
);

// --- 25: ko'paytmani yig'indiga keltirish (L2) ---
type PS = 'sc' | 'cc' | 'ss';
interface ProdSumP {
  kind: PS;
  a: number;
  b: number;
}
const S_SIN = [30, 90, 150, 210, 270, 330];
const S_COS = [0, 60, 90, 120, 180, 240, 270, 300];
y1T<ProdSumP>(
  'tr-prodsum',
  25,
  'L2',
  110,
  (r) => {
    const kind = r.pick(['sc', 'cc', 'ss'] as const);
    const set = kind === 'sc' ? S_SIN : S_COS;
    const s = r.pick(set);
    const d = r.pick(kind === 'sc' ? S_SIN.concat(S_SIN.map((x) => -x)) : S_COS.concat(S_COS.map((x) => -x)));
    return { kind, a: (s + d) / 2, b: (s - d) / 2 };
  },
  (p) => {
    need(Number.isInteger(p.a) && Number.isInteger(p.b) && p.a > 0 && p.b > 0 && p.a !== p.b && p.a < 360 && p.b < 360 && p.a % 15 === 0 && p.b % 15 === 0);
    const sS = p.a + p.b;
    const dD = p.a - p.b;
    const sinv = (x: number) => exactSin(x);
    const cosv = (x: number) => exactCos(x);
    let ans: Frac;
    if (p.kind === 'sc') {
      need(sinv(sS).k === 1 && sinv(dD).k === 1);
      ans = fMul(frac(1, 2), fAdd(sinv(sS).c, sinv(dD).c));
    } else if (p.kind === 'cc') {
      need(cosv(sS).k === 1 && cosv(dD).k === 1);
      ans = fMul(frac(1, 2), fAdd(cosv(dD).c, cosv(sS).c));
    } else {
      need(cosv(sS).k === 1 && cosv(dD).k === 1);
      ans = fMul(frac(1, 2), fSub(cosv(dD).c, cosv(sS).c));
    }
    need(ans.n !== 0);
    // tipik xatolar: ishora, 1/2 ni unutish
    const wrong: (Frac | null)[] = [];
    if (p.kind === 'sc') wrong.push(fAdd(sinv(sS).c, sinv(dD).c), fMul(frac(1, 2), fSub(sinv(sS).c, sinv(dD).c)), fMul(frac(1, 2), fAdd(cosv(sS).c, cosv(dD).c)));
    else if (p.kind === 'cc') wrong.push(fAdd(cosv(dD).c, cosv(sS).c), fMul(frac(1, 2), fSub(cosv(dD).c, cosv(sS).c)), fMul(frac(1, 2), fAdd(sinv(sS).c, sinv(dD).c)));
    else wrong.push(fSub(cosv(dD).c, cosv(sS).c), fMul(frac(1, 2), fAdd(cosv(dD).c, cosv(sS).c)), fMul(frac(1, 2), fSub(cosv(sS).c, cosv(dD).c)));
    const expr = p.kind === 'sc' ? `\\sin ${deg(p.a)}\\cos ${deg(p.b)}` : p.kind === 'cc' ? `\\cos ${deg(p.a)}\\cos ${deg(p.b)}` : `\\sin ${deg(p.a)}\\sin ${deg(p.b)}`;
    const formula =
      p.kind === 'sc'
        ? M(`\\sin a\\cos b=\\tfrac12[\\sin(a+b)+\\sin(a-b)]`)
        : p.kind === 'cc'
          ? M(`\\cos a\\cos b=\\tfrac12[\\cos(a-b)+\\cos(a+b)]`)
          : M(`\\sin a\\sin b=\\tfrac12[\\cos(a-b)-\\cos(a+b)]`);
    return {
      stem: L(`${M(expr)} ning qiymatini toping.`, `Найдите значение ${M(expr)}.`, `${M(expr)} tiń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${formula}; bunda ${M(`a+b=${deg(sS)},\\ a-b=${deg(dD)}`)}. Natija ${mf(ans)}.`,
        `${formula}; здесь ${M(`a+b=${deg(sS)},\\ a-b=${deg(dD)}`)}. Результат ${mf(ans)}.`,
        `${formula}; bunda ${M(`a+b=${deg(sS)},\\ a-b=${deg(dD)}`)}. Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `${formula}; here ${M(`a+b=${deg(sS)},\\ a-b=${deg(dD)}`)}. Result ${mf(ans)}.`,
      ),
      mis: L(
        "Formuladagi $\\tfrac12$ ko'paytuvchini unutish; $\\sin a\\sin b$ da ishorani teskari olish.",
        'Забыть множитель $\\tfrac12$; перепутать знак в формуле для $\\sin a\\sin b$.',
        "Formuladaǵı $\\tfrac12$ kóbeytiwshisin umıtıw; $\\sin a\\sin b$ de belgini teris alıw.", // kaa: tekshirilsin
        'Forgetting the factor $\\tfrac12$; the wrong sign in the formula for $\\sin a\\sin b$.',
      ),
    };
  },
);

// --- 25: yig'indini ko'paytmaga keltirish (L3) ---
type SP = 'ss' | 'sd' | 'cs' | 'cd';
interface SumProdP {
  kind: SP;
  u: number;
  v: number;
}
y1T<SumProdP>(
  'tr-sumprod',
  25,
  'L3',
  120,
  (r) => {
    const kind = r.pick(['ss', 'sd', 'cs', 'cd'] as const);
    // ss: sin a + sin b = 2 sin u cos v; sd: sin a - sin b = 2 cos u sin v; cs: cos a + cos b = 2 cos u cos v; cd: cos a - cos b = -2 sin u sin v
    const sinSet = S_SIN;
    const cosSet = S_COS;
    const u = r.pick(kind === 'ss' ? sinSet : kind === 'sd' ? cosSet : kind === 'cs' ? cosSet : sinSet);
    const v = r.pick(kind === 'ss' ? cosSet : kind === 'sd' ? sinSet : kind === 'cs' ? cosSet : sinSet);
    return { kind, u, v };
  },
  (p) => {
    const a = p.u + p.v;
    const b = p.u - p.v;
    need(a > 0 && b > 0 && a < 360 && b < 360 && a !== b);
    const s = exactSin;
    const c = exactCos;
    let ans: Rad;
    let expr: string;
    let formula: string;
    if (p.kind === 'ss') {
      ans = { c: fMul(frac(2), fMul(s(p.u).c, c(p.v).c)), k: 1 };
      expr = `\\sin ${deg(a)}+\\sin ${deg(b)}`;
      formula = '\\sin a+\\sin b=2\\sin\\frac{a+b}{2}\\cos\\frac{a-b}{2}';
    } else if (p.kind === 'sd') {
      ans = { c: fMul(frac(2), fMul(c(p.u).c, s(p.v).c)), k: 1 };
      expr = `\\sin ${deg(a)}-\\sin ${deg(b)}`;
      formula = '\\sin a-\\sin b=2\\cos\\frac{a+b}{2}\\sin\\frac{a-b}{2}';
    } else if (p.kind === 'cs') {
      ans = { c: fMul(frac(2), fMul(c(p.u).c, c(p.v).c)), k: 1 };
      expr = `\\cos ${deg(a)}+\\cos ${deg(b)}`;
      formula = '\\cos a+\\cos b=2\\cos\\frac{a+b}{2}\\cos\\frac{a-b}{2}';
    } else {
      ans = { c: fMul(frac(-2), fMul(s(p.u).c, s(p.v).c)), k: 1 };
      expr = `\\cos ${deg(a)}-\\cos ${deg(b)}`;
      formula = '\\cos a-\\cos b=-2\\sin\\frac{a+b}{2}\\sin\\frac{a-b}{2}';
    }
    // bu yerda faqat k=1 (ratsional) qiymatlar: u, v ro'yxatlari shuni kafolatlaydi
    const usedK = p.kind === 'ss' ? [s(p.u).k, c(p.v).k] : p.kind === 'sd' ? [c(p.u).k, s(p.v).k] : p.kind === 'cs' ? [c(p.u).k, c(p.v).k] : [s(p.u).k, s(p.v).k];
    need(ans.c.n !== 0 && usedK.every((k) => k === 1));
    const wrong = [negRad(ans), { c: fMul(ans.c, frac(1, 2)), k: 1 }, { c: fMul(ans.c, frac(2)), k: 1 }, { c: frac(Math.abs(ans.c.n) + ans.c.d, ans.c.d), k: 1 }]
      .map((r) => r.c);
    const ansF = ans.c;
    return {
      stem: L(`${M(expr)} ning qiymatini toping.`, `Найдите значение ${M(expr)}.`, `${M(expr)} tiń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ansF),
      wrong: fracWrong(ansF, wrong),
      sol: L(
        `${M(formula)}; ${M(`\\frac{a+b}{2}=${deg(p.u)},\\ \\frac{a-b}{2}=${deg(p.v)}`)}. Natija ${mf(ansF)}.`,
        `${M(formula)}; ${M(`\\frac{a+b}{2}=${deg(p.u)},\\ \\frac{a-b}{2}=${deg(p.v)}`)}. Результат ${mf(ansF)}.`,
        `${M(formula)}; ${M(`\\frac{a+b}{2}=${deg(p.u)},\\ \\frac{a-b}{2}=${deg(p.v)}`)}. Nátiyje ${mf(ansF)}.`, // kaa: tekshirilsin
        `${M(formula)}; ${M(`\\frac{a+b}{2}=${deg(p.u)},\\ \\frac{a-b}{2}=${deg(p.v)}`)}. Result ${mf(ansF)}.`,
      ),
      mis: L(
        "Yarim yig'indi va yarim ayirmani adashtirish; kosinuslar ayirmasidagi minus ishorani unutish.",
        'Перепутать полусумму и полуразность; забыть минус в формуле разности косинусов.',
        "Yarım qosındı hám yarım ayırmanı shatastırıw; kosinuslar ayırmasındaǵı minus belgini umıtıw.", // kaa: tekshirilsin
        'Mixing up the half-sum and half-difference; forgetting the minus in the difference of cosines.',
      ),
    };
  },
);

// --- 26: cos x cos 2x cos 4x ... ko'paytmalari (L3) ---
interface SpecialP {
  x: number;
  n: number;
  k: number;
  extra: number;
}
const SPECIAL_CASES: { x: number; n: number; val: Frac }[] = [
  { x: 36, n: 2, val: frac(1, 4) },
  { x: 72, n: 2, val: frac(-1, 4) },
  { x: 20, n: 3, val: frac(1, 8) },
  { x: 40, n: 3, val: frac(-1, 8) },
];
y1T<SpecialP>(
  'tr-special',
  26,
  'L3',
  120,
  (r) => {
    const c = r.pick(SPECIAL_CASES);
    return { x: c.x, n: c.n, k: r.int(2, 40), extra: r.int(-6, 6) };
  },
  (p) => {
    const c = SPECIAL_CASES.find((z) => z.x === p.x && z.n === p.n)!;
    const ans = fAdd(fMul(frac(p.k), c.val), frac(p.extra));
    need(ans.n !== 0 && ans.d <= 8 && Math.abs(fracVal(ans)) <= 40);
    const prod = range(0, p.n - 1).map((j) => `\\cos ${deg(p.x * 2 ** j)}`).join('');
    const expr = `${p.k}${prod}${p.extra === 0 ? '' : p.extra > 0 ? `+${p.extra}` : `${p.extra}`}`;
    const wrong = [fAdd(fMul(frac(p.k), fMul(c.val, frac(-1))), frac(p.extra)), fAdd(fMul(frac(p.k), frac(1, 2 ** p.n)), frac(p.extra)), fAdd(fMul(frac(p.k), frac(1, 2 ** (p.n + 1))), frac(p.extra)), fAdd(fMul(frac(p.k), c.val), frac(-p.extra))];
    const pw = 2 ** p.n;
    return {
      stem: L(`${M(expr)} ifodaning qiymatini toping.`, `Найдите значение выражения ${M(expr)}.`, `${M(expr)} ańlatpanıń mánisin tabıń.`, `Find the value of ${M(expr)}.`), // kaa: tekshirilsin
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `Ko'paytmani ${M(`${pw}\\sin ${deg(p.x)}`)} ga ko'paytirib, bo'lamiz va ${M('\\sin2a=2\\sin a\\cos a')} ni qo'llaymiz: ${M(`\\prod=\\dfrac{\\sin ${deg(p.x * pw)}}{${pw}\\sin ${deg(p.x)}}=${texFrac(c.val)}`)} (keltirish formulasi bilan). Natija ${mf(ans)}.`,
        `Умножим и разделим произведение на ${M(`${pw}\\sin ${deg(p.x)}`)} и применим ${M('\\sin2a=2\\sin a\\cos a')}: ${M(`\\prod=\\dfrac{\\sin ${deg(p.x * pw)}}{${pw}\\sin ${deg(p.x)}}=${texFrac(c.val)}`)} (по формулам приведения). Результат ${mf(ans)}.`,
        `Kóbeymeni ${M(`${pw}\\sin ${deg(p.x)}`)} ge kóbeytip, bólemiz hám ${M('\\sin2a=2\\sin a\\cos a')} di qollanamız: ${M(`\\prod=\\dfrac{\\sin ${deg(p.x * pw)}}{${pw}\\sin ${deg(p.x)}}=${texFrac(c.val)}`)} (keltiriw formulası menen). Nátiyje ${mf(ans)}.`, // kaa: tekshirilsin
        `Multiply and divide by ${M(`${pw}\\sin ${deg(p.x)}`)} and use ${M('\\sin2a=2\\sin a\\cos a')}: ${M(`\\prod=\\dfrac{\\sin ${deg(p.x * pw)}}{${pw}\\sin ${deg(p.x)}}=${texFrac(c.val)}`)} (by reduction formulas). Result ${mf(ans)}.`,
      ),
      mis: L(
        "Ko'paytmani har bir kosinusni alohida hisoblab topishga urinish; $\\sin(180^{\\circ}-x)=\\sin x$ va $\\sin(360^{\\circ}-x)=-\\sin x$ ishorasini adashtirish.",
        'Пытаться считать каждый косинус отдельно; ошибиться в знаке: $\\sin(180^{\\circ}-x)=\\sin x$, $\\sin(360^{\\circ}-x)=-\\sin x$.',
        "Kóbeymeni hár bir kosinustı bólek esaplap tabıwǵa urınıw; $\\sin(180^{\\circ}-x)=\\sin x$ hám $\\sin(360^{\\circ}-x)=-\\sin x$ belgisin shatastırıw.", // kaa: tekshirilsin
        'Trying to compute every cosine separately; mixing up the signs $\\sin(180^{\\circ}-x)=\\sin x$ and $\\sin(360^{\\circ}-x)=-\\sin x$.',
      ),
    };
  },
);

// --- 52: y = a sin(bx) + d ning xossalari (L1) ---
interface AmpP {
  fn: 'sin' | 'cos';
  a: number;
  b: number;
  d: number;
  ask: 'max' | 'min' | 'period';
}
y1T<AmpP>(
  'tr-amp',
  52,
  'L1',
  80,
  (r) => ({ fn: r.pick(['sin', 'cos'] as const), a: r.pick([-5, -4, -3, -2, 2, 3, 4, 5, 6]), b: r.pick([2, 3, 4, 5, 6, 8]), d: r.int(-5, 5), ask: r.pick(['max', 'min', 'period'] as const) }),
  (p) => {
    const mx = Math.abs(p.a) + p.d;
    const mn = -Math.abs(p.a) + p.d;
    const per = frac(2, p.b);
    const func = `y=${p.a === 1 ? '' : p.a === -1 ? '-' : p.a}\\${p.fn} ${p.b}x${p.d === 0 ? '' : p.d > 0 ? `+${p.d}` : `${p.d}`}`;
    let correct: string;
    let wrongs: string[];
    let prompt: L10n;
    if (p.ask === 'period') {
      correct = piTex(per);
      wrongs = uniq([piTex(frac(1, p.b)), piTex(frac(2 * p.b)), '2\\pi', piTex(frac(4, p.b)), '\\pi', piTex(frac(p.b, 2))]).filter((t) => t !== correct);
      prompt = L('Funksiyaning eng kichik musbat davrini toping.', 'Найдите наименьший положительный период функции.', 'Funkciyanıń eń kishi oń dáwirin tabıń.', 'Find the smallest positive period of the function.'); // kaa: tekshirilsin
    } else {
      const val = p.ask === 'max' ? mx : mn;
      correct = String(val);
      wrongs = [p.ask === 'max' ? mn : mx, p.ask === 'max' ? Math.abs(p.a) : -Math.abs(p.a), p.ask === 'max' ? p.a + p.d : p.a - p.d, val + 1, val - 1].map(String).filter((t) => t !== correct);
      prompt = p.ask === 'max' ? L('Funksiyaning eng katta qiymatini toping.', 'Найдите наибольшее значение функции.', 'Funkciyanıń eń úlken mánisin tabıń.', 'Find the largest value of the function.') : L('Funksiyaning eng kichik qiymatini toping.', 'Найдите наименьшее значение функции.', 'Funkciyanıń eń kishi mánisin tabıń.', 'Find the smallest value of the function.'); // kaa: tekshirilsin
    }
    const sol =
      p.ask === 'period'
        ? L(`Davr ${M('T=\\frac{2\\pi}{|b|}')}: ${M(`T=${piTex(per)}`)}.`, `Период ${M('T=\\frac{2\\pi}{|b|}')}: ${M(`T=${piTex(per)}`)}.`, `Dáwir ${M('T=\\frac{2\\pi}{|b|}')}: ${M(`T=${piTex(per)}`)}.`, `The period is ${M('T=\\frac{2\\pi}{|b|}')}: ${M(`T=${piTex(per)}`)}.`) // kaa: tekshirilsin
        : L(
            `${M(`-1\\le\\${p.fn}${p.b}x\\le 1`)}, shuning uchun qiymatlar sohasi ${M(`[${mn};\\ ${mx}]`)}: ${p.ask === 'max' ? 'eng katta' : 'eng kichik'} ${mi(p.ask === 'max' ? mx : mn)}.`,
            `${M(`-1\\le\\${p.fn}${p.b}x\\le 1`)}, поэтому область значений ${M(`[${mn};\\ ${mx}]`)}: ${p.ask === 'max' ? 'наибольшее' : 'наименьшее'} ${mi(p.ask === 'max' ? mx : mn)}.`,
            `${M(`-1\\le\\${p.fn}${p.b}x\\le 1`)}, sonıń ushın mánisler kópligi ${M(`[${mn};\\ ${mx}]`)}: ${p.ask === 'max' ? 'eń úlkeni' : 'eń kishisi'} ${mi(p.ask === 'max' ? mx : mn)}.`, // kaa: tekshirilsin
            `${M(`-1\\le\\${p.fn}${p.b}x\\le 1`)}, so the range is ${M(`[${mn};\\ ${mx}]`)}: ${p.ask === 'max' ? 'largest' : 'smallest'} ${mi(p.ask === 'max' ? mx : mn)}.`,
          );
    return {
      stem: L(`${M(func)} funksiya berilgan. ${prompt.uz}`, `Дана функция ${M(func)}. ${prompt.ru}`, `${M(func)} funkciyası berilgen. ${prompt.kaa}`, `Given the function ${M(func)}. ${prompt.en}`), // kaa: tekshirilsin
      correct: M(correct),
      wrong: wrongs.map(M),
      sol,
      mis: L(
        "Amplituda ishorasini (manfiy $a$) e'tiborsiz qoldirish; davrni $\\frac{2\\pi}{b}$ o'rniga $\\frac{\\pi}{b}$ yoki $2\\pi b$ deb olish.",
        'Не учесть знак амплитуды (отрицательное $a$); взять период $\\frac{\\pi}{b}$ или $2\\pi b$ вместо $\\frac{2\\pi}{b}$.',
        "Amplituda belgisin (teris $a$) itibarsız qaldırıw; dáwirdi $\\frac{2\\pi}{b}$ ornına $\\frac{\\pi}{b}$ yamasa $2\\pi b$ dep alıw.", // kaa: tekshirilsin
        'Ignoring the sign of the amplitude (negative $a$); using $\\frac{\\pi}{b}$ or $2\\pi b$ instead of $\\frac{2\\pi}{b}$ for the period.',
      ),
    };
  },
);

// --- 52: y = a sin x + b cos x + c ning eng katta/kichik qiymati (L2) ---
interface RangeP {
  a: number;
  b: number;
  c: number;
  ask: 'max' | 'min';
  w: number;
}
y1T<RangeP>(
  'tr-range',
  52,
  'L2',
  110,
  (r) => {
    const [u, v] = r.pick([[3, 4], [5, 12], [8, 15], [6, 8], [7, 24], [9, 12], [12, 5], [4, 3]] as [number, number][]);
    return { a: r.pick([-1, 1]) * u, b: r.pick([-1, 1]) * v, c: r.int(-6, 6), ask: r.pick(['max', 'min'] as const), w: r.pick([1, 1, 2, 3]) };
  },
  (p) => {
    const R = Math.round(Math.hypot(p.a, p.b));
    const ans = p.ask === 'max' ? R + p.c : -R + p.c;
    const wrong = [p.ask === 'max' ? -R + p.c : R + p.c, Math.abs(p.a) + Math.abs(p.b) + (p.ask === 'max' ? p.c : -0 + p.c), p.ask === 'max' ? R * R + p.c : -R * R + p.c, p.ask === 'max' ? Math.abs(p.a) + p.c : -Math.abs(p.b) + p.c, ans + 1];
    const wx = p.w === 1 ? 'x' : `${p.w}x`;
    const term = (u: number, fn: string, first: boolean) => `${first ? (u < 0 ? '-' : '') : u < 0 ? '-' : '+'}${Math.abs(u) === 1 ? '' : Math.abs(u)}\\${fn} ${wx}`;
    const func = `y=${term(p.a, 'sin', true)}${term(p.b, 'cos', false)}${p.c === 0 ? '' : p.c > 0 ? `+${p.c}` : `${p.c}`}`;
    const calcR = M(p.c === 0 ? String(ans) : `${p.ask === 'max' ? R : -R}${p.c > 0 ? `+${p.c}` : `${p.c}`}=${ans}`);
    return {
      stem: L(
        `${M(func)} funksiyaning eng ${p.ask === 'max' ? 'katta' : 'kichik'} qiymatini toping.`,
        `Найдите ${p.ask === 'max' ? 'наибольшее' : 'наименьшее'} значение функции ${M(func)}.`,
        `${M(func)} funkciyanıń eń ${p.ask === 'max' ? 'úlken' : 'kishi'} mánisin tabıń.`, // kaa: tekshirilsin
        `Find the ${p.ask === 'max' ? 'largest' : 'smallest'} value of ${M(func)}.`,
      ),
      correct: mi(ans),
      wrong: intWrong(ans, wrong),
      sol: L(
        `${M(`a\\sin t+b\\cos t`)} ning qiymatlari ${M(`[-\\sqrt{a^2+b^2};\\ \\sqrt{a^2+b^2}]`)} oraliqda: ${M(`\\sqrt{${p.a ** 2}+${p.b ** 2}}=${R}`)}. Eng ${p.ask === 'max' ? 'katta' : 'kichik'}: ${calcR}.`,
        `Значения ${M(`a\\sin t+b\\cos t`)} лежат в ${M(`[-\\sqrt{a^2+b^2};\\ \\sqrt{a^2+b^2}]`)}: ${M(`\\sqrt{${p.a ** 2}+${p.b ** 2}}=${R}`)}. ${p.ask === 'max' ? 'Наибольшее' : 'Наименьшее'}: ${calcR}.`,
        `${M(`a\\sin t+b\\cos t`)} tiń mánisleri ${M(`[-\\sqrt{a^2+b^2};\\ \\sqrt{a^2+b^2}]`)} aralıǵında: ${M(`\\sqrt{${p.a ** 2}+${p.b ** 2}}=${R}`)}. Eń ${p.ask === 'max' ? 'úlkeni' : 'kishisi'}: ${calcR}.`, // kaa: tekshirilsin
        `The values of ${M(`a\\sin t+b\\cos t`)} lie in ${M(`[-\\sqrt{a^2+b^2};\\ \\sqrt{a^2+b^2}]`)}: ${M(`\\sqrt{${p.a ** 2}+${p.b ** 2}}=${R}`)}. The ${p.ask === 'max' ? 'largest' : 'smallest'} is ${calcR}.`,
      ),
      mis: L(
        "Eng katta qiymatni $|a|+|b|$ deb olish ($\\sqrt{a^2+b^2}$ emas); doimiy qo'shiluvchini unutish.",
        'Считать наибольшее значение равным $|a|+|b|$ (на самом деле $\\sqrt{a^2+b^2}$); забыть постоянное слагаемое.',
        "Eń úlken mánisti $|a|+|b|$ dep alıw ($\\sqrt{a^2+b^2}$ emes); turaqlı qosılıwshını umıtıw.", // kaa: tekshirilsin
        'Taking the maximum as $|a|+|b|$ (it is $\\sqrt{a^2+b^2}$); forgetting the constant term.',
      ),
    };
  },
);

// --- 52: sin^2 / cos^2 li funksiya, t=sin x bo'yicha kvadrat (L3) ---
interface QuadTrigP {
  a: number;
  b: number;
  c: number;
  ask: 'max' | 'min';
}
y1T<QuadTrigP>(
  'tr-quad',
  52,
  'L3',
  140,
  (r) => ({ a: r.int(1, 4), b: r.int(-6, 6), c: r.int(-5, 5), ask: r.pick(['max', 'min'] as const) }),
  (p) => {
    need(p.b !== 0);
    // y = a cos^2 x + b sin x + c = -a t^2 + b t + (a + c), t in [-1, 1]
    const A = -p.a;
    const B = p.b;
    const C = p.a + p.c;
    const f = (t: Frac) => fAdd(fAdd(fMul(frac(A), fMul(t, t)), fMul(frac(B), t)), frac(C));
    const vertex = frac(-B, 2 * A);
    const inside = Math.abs(fracVal(vertex)) <= 1;
    const cand = [f(frac(-1)), f(frac(1))];
    if (inside) cand.push(f(vertex));
    const ans = p.ask === 'max' ? cand.reduce((m, x) => (fracVal(x) > fracVal(m) ? x : m)) : cand.reduce((m, x) => (fracVal(x) < fracVal(m) ? x : m));
    need(ans.d <= 8);
    const vf = f(vertex);
    const wrong = [vf, f(frac(1)), f(frac(-1)), p.ask === 'max' ? cand.reduce((m, x) => (fracVal(x) < fracVal(m) ? x : m)) : cand.reduce((m, x) => (fracVal(x) > fracVal(m) ? x : m)), f(frac(0))];
    const func = `y=${p.a === 1 ? '' : p.a}\\cos^2 x${p.b > 0 ? '+' : '-'}${Math.abs(p.b) === 1 ? '' : Math.abs(p.b)}\\sin x${p.c === 0 ? '' : p.c > 0 ? `+${p.c}` : `${p.c}`}`;
    const quad = M(`y=${A === -1 ? '-' : A}t^2${B > 0 ? '+' : '-'}${Math.abs(B) === 1 ? '' : Math.abs(B)}t${C === 0 ? '' : C > 0 ? `+${C}` : `${C}`},\\ t=\\sin x\\in[-1;\\ 1]`);
    return {
      stem: L(
        `${M(func)} funksiyaning eng ${p.ask === 'max' ? 'katta' : 'kichik'} qiymatini toping.`,
        `Найдите ${p.ask === 'max' ? 'наибольшее' : 'наименьшее'} значение функции ${M(func)}.`,
        `${M(func)} funkciyanıń eń ${p.ask === 'max' ? 'úlken' : 'kishi'} mánisin tabıń.`, // kaa: tekshirilsin
        `Find the ${p.ask === 'max' ? 'largest' : 'smallest'} value of ${M(func)}.`,
      ),
      correct: mf(ans),
      wrong: fracWrong(ans, wrong),
      sol: L(
        `${M('\\cos^2x=1-\\sin^2x')} va ${M('t=\\sin x')} almashtirishi: ${quad}. Uchi ${M(`t=${texFrac(vertex)}`)}${inside ? '' : ' ($[-1;\\ 1]$ dan tashqarida)'}; kesmaning uchlari va uchini solishtiramiz: ${p.ask === 'max' ? 'eng katta' : 'eng kichik'} ${mf(ans)}.`,
        `${M('\\cos^2x=1-\\sin^2x')} и замена ${M('t=\\sin x')}: ${quad}. Вершина ${M(`t=${texFrac(vertex)}`)}${inside ? '' : ' (вне $[-1;\\ 1]$)'}; сравниваем значения в концах отрезка и в вершине: ${p.ask === 'max' ? 'наибольшее' : 'наименьшее'} ${mf(ans)}.`,
        `${M('\\cos^2x=1-\\sin^2x')} hám ${M('t=\\sin x')} almastırıwı: ${quad}. Dóńgelek ushı ${M(`t=${texFrac(vertex)}`)}${inside ? '' : ' ($[-1;\\ 1]$ den sırtta)'}; kesindiniń ushların hám tóbesin salıstıramız: ${p.ask === 'max' ? 'eń úlkeni' : 'eń kishisi'} ${mf(ans)}.`, // kaa: tekshirilsin
        `With ${M('\\cos^2x=1-\\sin^2x')} and ${M('t=\\sin x')}: ${quad}. The vertex is at ${M(`t=${texFrac(vertex)}`)}${inside ? '' : ' (outside $[-1;\\ 1]$)'}; compare the values at the ends and at the vertex: ${p.ask === 'max' ? 'largest' : 'smallest'} ${mf(ans)}.`,
      ),
      mis: L(
        "Parabola uchini $t\\in[-1;1]$ kesmadan tashqarida bo'lsa ham javob deb olish; $\\cos^2x$ ni $\\sin$ orqali ifodalashda ishorani adashtirish.",
        'Брать вершину параболы как ответ, даже если она вне отрезка $t\\in[-1;1]$; ошибиться в знаке при замене $\\cos^2x=1-\\sin^2x$.',
        "Parabola tóbesin $t\\in[-1;1]$ kesindiden sırtta bolsa da juwap dep alıw; $\\cos^2x$ di $\\sin$ arqalı ańlatıwda belgini shatastırıw.", // kaa: tekshirilsin
        'Taking the parabola vertex as the answer even when it lies outside $t\\in[-1;1]$; sign errors when substituting $\\cos^2x=1-\\sin^2x$.',
      ),
    };
  },
);

// --- 107: gradus va radian (L1) ---
interface RadConvP {
  mode: 'toRad' | 'toDeg';
  F: Frac;
}
y1T<RadConvP>(
  'rad-conv',
  107,
  'L1',
  70,
  (r) => ({ mode: r.pick(['toRad', 'toDeg'] as const), F: frac(r.int(1, 23), r.pick([2, 3, 4, 5, 6, 8, 9, 10, 12])) }),
  (p) => {
    need(p.F.n % p.F.d !== 0 && fracVal(p.F) < 2 && gcd(p.F.n, p.F.d) === 1 && p.F.d >= 2 && (180 * p.F.n) % p.F.d === 0);
    const degs = (180 * p.F.n) / p.F.d;
    need(degs !== 180 && degs !== 90 && degs !== 360 && degs % 5 === 0);
    if (p.mode === 'toRad') {
      const ans = piTex(p.F);
      const wrong = uniq([piTex(frac(p.F.n, p.F.d * 2)), piTex(frac(p.F.n * 2, p.F.d)), piTex(frac(p.F.d, p.F.n)), piTex(frac(degs, 360)), piTex(frac(degs, 90)), String(degs)]).filter((t) => t !== ans);
      return {
        stem: L(`${M(deg(degs))} burchakning radian o'lchovini toping.`, `Найдите радианную меру угла ${M(deg(degs))}.`, `${M(deg(degs))} múyeshtiń radian ólshemin tabıń.`, `Find the radian measure of the angle ${M(deg(degs))}.`), // kaa: tekshirilsin
        correct: M(ans),
        wrong: wrong.map(M),
        sol: L(
          `${M('1^{\\circ}=\\frac{\\pi}{180}')} rad: ${M(`${degs}\\cdot\\frac{\\pi}{180}=${ans}`)}.`,
          `${M('1^{\\circ}=\\frac{\\pi}{180}')} рад: ${M(`${degs}\\cdot\\frac{\\pi}{180}=${ans}`)}.`,
          `${M('1^{\\circ}=\\frac{\\pi}{180}')} rad: ${M(`${degs}\\cdot\\frac{\\pi}{180}=${ans}`)}.`, // kaa: tekshirilsin
          `${M('1^{\\circ}=\\frac{\\pi}{180}')} rad: ${M(`${degs}\\cdot\\frac{\\pi}{180}=${ans}`)}.`,
        ),
        mis: L(
          "$\\pi$ rad $=180^{\\circ}$ ekanini $360^{\\circ}$ bilan adashtirish; kasrni qisqartirmaslik.",
          'Путать $\\pi$ рад $=180^{\\circ}$ с $360^{\\circ}$; не сократить дробь.',
          "$\\pi$ rad $=180^{\\circ}$ ekenin $360^{\\circ}$ penen shatastırıw; bólshekti qısqartpaw.", // kaa: tekshirilsin
          'Confusing $\\pi$ rad $=180^{\\circ}$ with $360^{\\circ}$; not reducing the fraction.',
        ),
      };
    }
    const ans = String(degs);
    const wrong = [degs / 2, degs * 2, Math.round((p.F.d * 180) / p.F.n), degs + 30, degs - 30, 360 - degs, degs + 45, degs - 15].filter((x) => Number.isInteger(x) && x > 0).map(String).filter((t) => t !== ans);
    return {
      stem: L(`${M(piTex(p.F))} radian burchakning gradus o'lchovini toping.`, `Найдите градусную меру угла ${M(piTex(p.F))} радиан.`, `${M(piTex(p.F))} radian múyeshtiń gradus ólshemin tabıń.`, `Find the degree measure of the angle ${M(piTex(p.F))} radians.`), // kaa: tekshirilsin
      correct: M(ans),
      wrong: uniq(wrong).map(M),
      sol: L(
        `${M('\\pi\\ \\text{rad}=180^{\\circ}')}: ${M(`${piTex(p.F)}=${texFrac(p.F)}\\cdot 180^{\\circ}=${degs}^{\\circ}`)}.`,
        `${M('\\pi\\ \\text{рад}=180^{\\circ}')}: ${M(`${piTex(p.F)}=${texFrac(p.F)}\\cdot 180^{\\circ}=${degs}^{\\circ}`)}.`,
        `${M('\\pi\\ \\text{rad}=180^{\\circ}')}: ${M(`${piTex(p.F)}=${texFrac(p.F)}\\cdot 180^{\\circ}=${degs}^{\\circ}`)}.`, // kaa: tekshirilsin
        `${M('\\pi\\ \\text{rad}=180^{\\circ}')}: ${M(`${piTex(p.F)}=${texFrac(p.F)}\\cdot 180^{\\circ}=${degs}^{\\circ}`)}.`,
      ),
      mis: L(
        "$\\pi$ ni $180$ o'rniga $360$ yoki $90$ ga almashtirish; kasr suratini va maxrajini adashtirish.",
        'Заменять $\\pi$ на $360$ или $90$ вместо $180$; путать числитель и знаменатель.',
        "$\\pi$ di $180$ ornına $360$ yamasa $90$ ǵa almastırıw; bólshek alımı hám bólimin shatastırıw.", // kaa: tekshirilsin
        'Substituting $360$ or $90$ for $\\pi$ instead of $180$; swapping numerator and denominator.',
      ),
    };
  },
);

// --- 107: yoy uzunligi va sektor yuzi (L2) ---
interface ArcP {
  R: number;
  theta: Frac;
  ask: 'arc' | 'area';
  unit: 'rad' | 'deg';
}
y1T<ArcP>(
  'rad-arc',
  107,
  'L2',
  100,
  (r) => ({ R: r.int(2, 12), theta: frac(r.int(1, 11), r.pick([2, 3, 4, 6, 5])), ask: r.pick(['arc', 'area'] as const), unit: r.pick(['rad', 'deg'] as const) }),
  (p) => {
    need(gcd(p.theta.n, p.theta.d) === 1 && fracVal(p.theta) < 2 && (180 * p.theta.n) % p.theta.d === 0 && p.theta.d !== 1);
    const R = frac(p.R);
    const thetaPi = p.theta;
    const arc = fMul(R, thetaPi);
    const area = fMul(fMul(fMul(R, R), thetaPi), frac(1, 2));
    const ans = p.ask === 'arc' ? arc : area;
    const wrongs = p.ask === 'arc' ? [fMul(arc, frac(2)), fMul(arc, R), fMul(fMul(R, R), thetaPi), fMul(arc, frac(1, 2))] : [arc, fMul(area, frac(2)), fMul(fMul(R, R), thetaPi), fMul(area, R)];
    const degs = (180 * thetaPi.n) / thetaPi.d;
    const thetaTxt = p.unit === 'rad' ? M(`\\theta=${piTex(thetaPi)}`) : M(`\\theta=${deg(degs)}`);
    const ansT = piTex(ans);
    return {
      stem: L(
        `Doira sektorining radiusi ${mi(p.R)} sm, markaziy burchagi ${thetaTxt}${p.unit === 'rad' ? ' radian' : ''}. ${p.ask === 'arc' ? "Sektor yoyining uzunligini (sm) toping." : 'Sektor yuzini (sm$^2$) toping.'}`,
        `Радиус сектора круга ${mi(p.R)} см, центральный угол ${thetaTxt}${p.unit === 'rad' ? ' рад' : ''}. ${p.ask === 'arc' ? 'Найдите длину дуги сектора (в см).' : 'Найдите площадь сектора (в см$^2$).'}`,
        `Sheńber sektorınıń radiusı ${mi(p.R)} sm, orayliq múyeshi ${thetaTxt}${p.unit === 'rad' ? ' radian' : ''}. ${p.ask === 'arc' ? 'Sektor doǵasınıń uzınlıǵın (sm) tabıń.' : 'Sektor maydanın (sm$^2$) tabıń.'}`, // kaa: tekshirilsin
        `A circular sector has radius ${mi(p.R)} cm and central angle ${thetaTxt}${p.unit === 'rad' ? ' radians' : ''}. ${p.ask === 'arc' ? 'Find the arc length (in cm).' : 'Find the area of the sector (in cm$^2$).'}`,
      ),
      correct: M(ansT),
      wrong: uniq(wrongs.filter((f) => f.n !== 0).map(piTex)).filter((t) => t !== ansT).map(M),
      sol: L(
        `${p.unit === 'deg' ? `${M(`${deg(degs)}=${piTex(thetaPi)}`)} rad. ` : ''}${p.ask === 'arc' ? M(`l=R\\theta=${p.R}\\cdot ${piTex(thetaPi)}=${ansT}`) : M(`S=\\frac{R^2\\theta}{2}=\\frac{${p.R * p.R}\\cdot ${piTex(thetaPi)}}{2}=${ansT}`)}.`,
        `${p.unit === 'deg' ? `${M(`${deg(degs)}=${piTex(thetaPi)}`)} рад. ` : ''}${p.ask === 'arc' ? M(`l=R\\theta=${p.R}\\cdot ${piTex(thetaPi)}=${ansT}`) : M(`S=\\frac{R^2\\theta}{2}=\\frac{${p.R * p.R}\\cdot ${piTex(thetaPi)}}{2}=${ansT}`)}.`,
        `${p.unit === 'deg' ? `${M(`${deg(degs)}=${piTex(thetaPi)}`)} rad. ` : ''}${p.ask === 'arc' ? M(`l=R\\theta=${p.R}\\cdot ${piTex(thetaPi)}=${ansT}`) : M(`S=\\frac{R^2\\theta}{2}=\\frac{${p.R * p.R}\\cdot ${piTex(thetaPi)}}{2}=${ansT}`)}.`, // kaa: tekshirilsin
        `${p.unit === 'deg' ? `${M(`${deg(degs)}=${piTex(thetaPi)}`)} rad. ` : ''}${p.ask === 'arc' ? M(`l=R\\theta=${p.R}\\cdot ${piTex(thetaPi)}=${ansT}`) : M(`S=\\frac{R^2\\theta}{2}=\\frac{${p.R * p.R}\\cdot ${piTex(thetaPi)}}{2}=${ansT}`)}.`,
      ),
      mis: L(
        "Burchakni gradusda qoldirib formulaga qo'yish ($l=R\\theta$ da $\\theta$ radianda); sektor yuzida $\\frac12$ ni unutish.",
        'Подставлять угол в градусах в формулу ($\\theta$ должен быть в радианах); забыть $\\frac12$ в формуле площади сектора.',
        "Múyeshti gradusta qaldırıp formulaǵa qoyıw ($l=R\\theta$ de $\\theta$ radianda); sektor maydanında $\\frac12$ di umıtıw.", // kaa: tekshirilsin
        'Plugging the angle in degrees into the formula ($\\theta$ must be in radians); forgetting $\\frac12$ in the sector area.',
      ),
    };
  },
);

// --- 107: burchak qaysi chorakda (L1) ---
interface QuadAngleP {
  mode: 'deg' | 'rad';
  d: number;
  n: number;
  m: number;
}
y1T<QuadAngleP>(
  'rad-quad',
  107,
  'L1',
  80,
  (r) => ({ mode: r.pick(['deg', 'rad'] as const), d: r.int(-2000, 2000), n: r.pick([-1, 1]) * r.int(5, 60), m: r.pick([3, 4, 5, 6, 7, 8, 9]) }),
  (p) => {
    // radianda gcd(n, m) = 1 va m >= 3 bo'lsa burchak hech qachon 90 gradusning karralisi bo'lmaydi
    need(p.mode === 'deg' ? p.d % 90 !== 0 && Math.abs(p.d) > 360 : gcd(Math.abs(p.n), p.m) === 1 && Math.abs(p.n) > 2 * p.m);
    const n2 = ((p.n % (2 * p.m)) + 2 * p.m) % (2 * p.m);
    const quad = p.mode === 'deg' ? quadrantOf(p.d) : n2 * 2 < p.m ? 1 : n2 < p.m ? 2 : n2 * 2 < 3 * p.m ? 3 : 4;
    const shown = p.mode === 'deg' ? deg(p.d) : `${p.n < 0 ? '-' : ''}\\frac{${Math.abs(p.n)}\\pi}{${p.m}}`;
    const reduced = p.mode === 'deg' ? deg(((p.d % 360) + 360) % 360) : `\\frac{${n2 === 1 ? '' : n2}\\pi}{${p.m}}`;
    const turn = p.mode === 'deg' ? '[0^{\\circ};\\ 360^{\\circ})' : '[0;\\ 2\\pi)';
    const DEG_IV = ['', '(0^{\\circ};\\ 90^{\\circ})', '(90^{\\circ};\\ 180^{\\circ})', '(180^{\\circ};\\ 270^{\\circ})', '(270^{\\circ};\\ 360^{\\circ})'];
    const RAD_IV = ['', '(0;\\ \\frac{\\pi}{2})', '(\\frac{\\pi}{2};\\ \\pi)', '(\\pi;\\ \\frac{3\\pi}{2})', '(\\frac{3\\pi}{2};\\ 2\\pi)'];
    const iv = (p.mode === 'deg' ? DEG_IV : RAD_IV)[quad]!;
    const redLine = M(`${shown}\\to${reduced}`);
    return {
      stem: L(`${M(shown)} burchak qaysi chorakda yotadi?`, `В какой четверти лежит угол ${M(shown)}?`, `${M(shown)} múyesh qaysı shirekte jatadı?`, `In which quadrant does the angle ${M(shown)} lie?`), // kaa: tekshirilsin
      correct: M(`\\mathrm{${ROMAN[quad]}}`),
      wrong: [1, 2, 3, 4].filter((q) => q !== quad).map((q) => M(`\\mathrm{${ROMAN[q]}}`)),
      sol: L(
        `Burchakni ${M(turn)} ga keltiramiz (butun aylanishlarni tashlab): ${redLine}. Bu burchak ${M(iv)} oraliqda: ${ROMAN[quad]} chorak.`,
        `Приведём угол к ${M(turn)}, отбросив целые обороты: ${redLine}. Он лежит в промежутке ${M(iv)}: ${ROMAN[quad]} четверть.`,
        `Múyeshti ${M(turn)} ge keltiremiz (pútin aylanıwlardı taslap): ${redLine}. Bul múyesh ${M(iv)} aralıqta: ${ROMAN[quad]} shirek.`, // kaa: tekshirilsin
        `Reduce the angle to ${M(turn)} by dropping whole turns: ${redLine}. It lies in ${M(iv)}: quadrant ${ROMAN[quad]}.`,
      ),
      mis: L(
        "Manfiy burchakni soat strelkasi bo'yicha emas, teskari yo'nalishda sanash; to'liq aylanishlarni tashlamaslik.",
        'Отсчитывать отрицательный угол не по часовой стрелке; не отбросить полные обороты.',
        "Teris múyeshti saat strelkası boyınsha emes, qarama-qarsı baǵıtta sanaw; tolıq aylanıwlardı taslamaw.", // kaa: tekshirilsin
        'Measuring a negative angle counter-clockwise; not discarding full turns.',
      ),
    };
  },
);

// --- 107: nuqtani 90 darajalarga burish (L2) ---
interface RotP {
  a: number;
  b: number;
  k: 1 | 2 | 3;
  cw: boolean;
  unit: 'deg' | 'rad';
}
y1T<RotP>(
  'rad-rot',
  107,
  'L2',
  100,
  (r) => ({ a: r.int(-9, 9), b: r.int(-9, 9), k: r.pick([1, 2, 3] as const), cw: r.chance(0.4), unit: r.pick(['deg', 'rad'] as const) }),
  (p) => {
    need(p.a !== 0 && p.b !== 0 && Math.abs(p.a) !== Math.abs(p.b));
    const rotCCW = (x: number, y: number, k: number): [number, number] => {
      let [px, py] = [x, y];
      for (let i = 0; i < k; i++) [px, py] = [-py, px];
      return [px, py];
    };
    const turns = p.cw ? (4 - p.k) % 4 : p.k;
    const [rx, ry] = rotCCW(p.a, p.b, turns);
    const all = [0, 1, 2, 3].map((t) => rotCCW(p.a, p.b, t));
    const fmtPt = (pt: [number, number]) => `(${pt[0]};\\ ${pt[1]})`;
    const rad = piTex(frac(p.k, 2));
    const angleTxt = p.unit === 'deg' ? deg(90 * p.k) : rad;
    const dirTxt = p.cw ? L("soat strelkasi bo'yicha", 'по часовой стрелке', 'saat strelkası boyınsha', 'clockwise') : L("soat strelkasiga teskari yo'nalishda", 'против часовой стрелки', 'saat strelkasına qarama-qarsı baǵıtta', 'counter-clockwise'); // kaa: tekshirilsin
    const wrong = all.filter((pt, i) => !(pt[0] === rx && pt[1] === ry) && i !== 0).map(fmtPt);
    const wrongAll = uniq([...wrong, fmtPt(all[0]!)]).filter((t) => t !== fmtPt([rx, ry]));
    return {
      stem: L(
        `${M(`A(${p.a};\\ ${p.b})`)} nuqta koordinatalar boshi atrofida ${dirTxt.uz} ${M(angleTxt)}${p.unit === 'rad' ? ' radianga' : ' ga'} burildi. Hosil bo'lgan nuqtaning koordinatalarini toping.`,
        `Точка ${M(`A(${p.a};\\ ${p.b})`)} повёрнута вокруг начала координат ${dirTxt.ru} на ${M(angleTxt)}${p.unit === 'rad' ? ' радиан' : ''}. Найдите координаты полученной точки.`,
        `${M(`A(${p.a};\\ ${p.b})`)} noqat koordinata basları átirapında ${dirTxt.kaa} ${M(angleTxt)}${p.unit === 'rad' ? ' radianǵa' : ' qa'} buwrıldı. Payda bolǵan noqattıń koordinatalarin tabıń.`, // kaa: tekshirilsin
        `The point ${M(`A(${p.a};\\ ${p.b})`)} is rotated about the origin ${dirTxt.en} by ${M(angleTxt)}${p.unit === 'rad' ? ' radians' : ''}. Find the coordinates of the image.`,
      ),
      correct: M(fmtPt([rx, ry])),
      wrong: wrongAll.map(M),
      sol: L(
        `Soat strelkasiga teskari ${M(deg(90))} ga burishda ${M('(x;\\ y)\\to(-y;\\ x)')}. ${p.cw ? `Soat strelkasi bo'yicha ${M(deg(90 * p.k))} burish soat strelkasiga teskari ${M(deg(360 - 90 * p.k))} ga teng. ` : ''}Natija ${M(fmtPt([rx, ry]))}.`,
        `При повороте на ${M(deg(90))} против часовой стрелки ${M('(x;\\ y)\\to(-y;\\ x)')}. ${p.cw ? `Поворот по часовой стрелке на ${M(deg(90 * p.k))} равен повороту против часовой на ${M(deg(360 - 90 * p.k))}. ` : ''}Результат ${M(fmtPt([rx, ry]))}.`,
        `Saat strelkasına qarama-qarsı ${M(deg(90))} qa buwıwda ${M('(x;\\ y)\\to(-y;\\ x)')}. ${p.cw ? `Saat strelkası boyınsha ${M(deg(90 * p.k))} buwıw saat strelkasına qarama-qarsı ${M(deg(360 - 90 * p.k))} qa teń. ` : ''}Nátiyje ${M(fmtPt([rx, ry]))}.`, // kaa: tekshirilsin
        `A counter-clockwise rotation by ${M(deg(90))} sends ${M('(x;\\ y)\\to(-y;\\ x)')}. ${p.cw ? `A clockwise rotation by ${M(deg(90 * p.k))} equals a counter-clockwise one by ${M(deg(360 - 90 * p.k))}. ` : ''}Result ${M(fmtPt([rx, ry]))}.`,
      ),
      mis: L(
        "Burish yo'nalishini (soat strelkasi bo'yicha/teskari) adashtirish; $(x;y)\\to(y;-x)$ va $(-y;x)$ ni almashtirish.",
        'Перепутать направление поворота; перепутать $(x;y)\\to(y;-x)$ и $(-y;x)$.',
        "Buwıw baǵıtın (saat strelkası boyınsha/qarama-qarsı) shatastırıw; $(x;y)\\to(y;-x)$ hám $(-y;x)$ di almastırıw.", // kaa: tekshirilsin
        'Mixing up the direction of rotation; swapping $(x;y)\\to(y;-x)$ and $(-y;x)$.',
      ),
    };
  },
);

// --- 107: (r;0) nuqtani burchakka burish (L3) ---
interface RotUnitP {
  r: number;
  theta: number;
  ask: 'x' | 'y';
}
y1T<RotUnitP>(
  'rad-unit',
  107,
  'L3',
  120,
  (r) => ({ r: 2 * r.int(1, 8), theta: r.pick([30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330]), ask: r.pick(['x', 'y'] as const) }),
  (p) => {
    const r = frac(p.r);
    const val = p.ask === 'x' ? exactCos(p.theta) : exactSin(p.theta);
    const ans: Rad = { c: fMul(r, val.c), k: val.k };
    const other = p.ask === 'x' ? exactSin(p.theta) : exactCos(p.theta);
    const swapped: Rad = { c: fMul(r, other.c), k: other.k };
    const cands: Rad[] = [negRad(ans), swapped, negRad(swapped), { c: fMul(r, frac(1, 2)), k: 1 }, { c: fMul(r, frac(1)), k: 1 }];
    const ansT = radTex(ans);
    const wrong = uniq(cands.map(radTex)).filter((t) => t !== ansT && t !== '0');
    const thetaRad = piTex(frac(p.theta, 180));
    return {
      stem: L(
        `${M(`P(${p.r};\\ 0)`)} nuqta koordinatalar boshi atrofida soat strelkasiga teskari yo'nalishda ${M(thetaRad)} radianga burildi. Hosil bo'lgan nuqtaning ${p.ask === 'x' ? 'abssissasini' : 'ordinatasini'} toping.`,
        `Точка ${M(`P(${p.r};\\ 0)`)} повёрнута вокруг начала координат против часовой стрелки на ${M(thetaRad)} радиан. Найдите ${p.ask === 'x' ? 'абсциссу' : 'ординату'} полученной точки.`,
        `${M(`P(${p.r};\\ 0)`)} noqat koordinata basları átirapında saat strelkasına qarama-qarsı baǵıtta ${M(thetaRad)} radianǵa buwrıldı. Payda bolǵan noqattıń ${p.ask === 'x' ? 'abscissasın' : 'ordinatasın'} tabıń.`, // kaa: tekshirilsin
        `The point ${M(`P(${p.r};\\ 0)`)} is rotated counter-clockwise about the origin by ${M(thetaRad)} radians. Find the ${p.ask === 'x' ? 'x-coordinate' : 'y-coordinate'} of the image.`,
      ),
      correct: M(ansT),
      wrong: wrong.map(M),
      sol: L(
        `${M(`(x;\\ y)=(r\\cos\\theta;\\ r\\sin\\theta)`)}, ${M(`\\theta=${deg(p.theta)}`)}: ${M(`${p.ask === 'x' ? `x=${p.r}\\cos ${deg(p.theta)}` : `y=${p.r}\\sin ${deg(p.theta)}`}=${ansT}`)}.`,
        `${M(`(x;\\ y)=(r\\cos\\theta;\\ r\\sin\\theta)`)}, ${M(`\\theta=${deg(p.theta)}`)}: ${M(`${p.ask === 'x' ? `x=${p.r}\\cos ${deg(p.theta)}` : `y=${p.r}\\sin ${deg(p.theta)}`}=${ansT}`)}.`,
        `${M(`(x;\\ y)=(r\\cos\\theta;\\ r\\sin\\theta)`)}, ${M(`\\theta=${deg(p.theta)}`)}: ${M(`${p.ask === 'x' ? `x=${p.r}\\cos ${deg(p.theta)}` : `y=${p.r}\\sin ${deg(p.theta)}`}=${ansT}`)}.`, // kaa: tekshirilsin
        `${M(`(x;\\ y)=(r\\cos\\theta;\\ r\\sin\\theta)`)}, ${M(`\\theta=${deg(p.theta)}`)}: ${M(`${p.ask === 'x' ? `x=${p.r}\\cos ${deg(p.theta)}` : `y=${p.r}\\sin ${deg(p.theta)}`}=${ansT}`)}.`,
      ),
      mis: L(
        "Abssissa va ordinatani ($\\cos$ va $\\sin$) adashtirish; ikkinchi, uchinchi choraklarda ishorani unutish.",
        'Перепутать абсциссу и ординату ($\\cos$ и $\\sin$); забыть знак во второй и третьей четвертях.',
        "Abscissa hám ordinatanı ($\\cos$ hám $\\sin$) shatastırıw; ekinshi, úshinshi shireklerde belgini umıtıw.", // kaa: tekshirilsin
        'Swapping the x- and y-coordinates ($\\cos$ and $\\sin$); forgetting the sign in the second and third quadrants.',
      ),
    };
  },
);

// @@NEXT@@
