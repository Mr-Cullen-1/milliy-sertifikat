import { describe, expect, it } from 'vitest';
import { NUMBERS_ALGEBRA_TEMPLATES, numbersAlgebraParams } from '../../content/gen/extra/numbers-algebra';
import { LANGS } from '../../content/gen/types';
import { checkExtraTemplate } from './extra-harness';

// Matematik to'g'rilik (1.1, 1.2, 2.1-2.4 elementlar shablonlari): javoblar shablon kodidan MUSTAQIL usullar bilan qayta hisoblanadi
// (brute force, aniq kasrlar/BigInt, sonli qiymat, sanash, simulyatsiya). Parametrlar numbersAlgebraParams(id, seed) ko'prigi orqali olinadi;
// variantlar matni (TeX) o'z kichik hisoblagichimiz bilan songa aylantirilib, to'g'ri variant kutilgan qiymatga teng, chalg'ituvchilar teng emasligi tekshiriladi.

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const TPL = new Map(NUMBERS_ALGEBRA_TEMPLATES.map((t) => [t.id, t]));

// ---------------------------------------------------------------------------------------------
// TeX qismini songa aylantiruvchi kichik hisoblagich: raqamlar ("{,}" o'nli), \frac, \dfrac, \sqrt[n]{}, ^, \cdot, \times, :, \pi, \log_{b}{x},
// qavslar, o'zgaruvchilar (vars), yashirin ko'paytirish.
// ---------------------------------------------------------------------------------------------
function evalTex(src: string, vars: Record<string, number> = {}): number {
  const s = src
    .replace(/\\left|\\right|\\,|\\!|\\;|\\ |\\%|\\displaystyle/g, '')
    .replace(/\\dfrac/g, '\\frac')
    .replace(/\{,\}/g, '.')
    .replace(/\s+/g, '');
  let i = 0;
  const peek = (t: string) => s.startsWith(t, i);
  const eat = (t: string) => {
    if (!peek(t)) throw new Error(`"${t}" kutilgan (${i}): ${src}`);
    i += t.length;
  };
  const group = (): number => {
    if (peek('{')) {
      eat('{');
      const v = expr();
      eat('}');
      return v;
    }
    return atom();
  };
  const startsAtom = () => /^(\d|\\frac|\\sqrt|\\pi|\\log|\(|[a-zA-Z])/.test(s.slice(i)) && !/^\\(cdot|times)/.test(s.slice(i));
  function atom(): number {
    if (peek('(')) {
      eat('(');
      const v = expr();
      eat(')');
      return v;
    }
    if (peek('\\frac')) {
      eat('\\frac');
      const a = group();
      const b = group();
      return a / b;
    }
    if (peek('\\sqrt')) {
      eat('\\sqrt');
      let n = 2;
      if (peek('[')) {
        eat('[');
        n = expr();
        eat(']');
      }
      const v = group();
      return n === 2 ? Math.sqrt(v) : v < 0 && n % 2 === 1 ? -Math.pow(-v, 1 / n) : Math.pow(v, 1 / n);
    }
    if (peek('|')) {
      eat('|');
      const v = expr();
      eat('|');
      return Math.abs(v);
    }
    if (peek('\\pi')) {
      eat('\\pi');
      return Math.PI;
    }
    if (peek('\\log_')) {
      eat('\\log_');
      const b = group();
      const x = unary();
      return Math.log(x) / Math.log(b);
    }
    const m = /^(\d+(\.\d+)?)/.exec(s.slice(i));
    if (m) {
      i += m[1]!.length;
      return Number(m[1]);
    }
    const v = /^[a-zA-Z]/.exec(s.slice(i));
    if (v && v[0] in vars) {
      i += 1;
      return vars[v[0]]!;
    }
    throw new Error(`kutilmagan belgi (${i}) "${s.slice(i, i + 12)}": ${src}`);
  }
  function power(): number {
    const base = atom();
    if (peek('^')) {
      eat('^');
      return Math.pow(base, group());
    }
    return base;
  }
  function unary(): number {
    if (peek('-')) {
      eat('-');
      return -unary();
    }
    if (peek('+')) {
      eat('+');
      return unary();
    }
    return power();
  }
  function term(): number {
    let v = unary();
    for (;;) {
      if (peek('\\cdot')) {
        eat('\\cdot');
        v *= unary();
      } else if (peek('\\times')) {
        eat('\\times');
        v *= unary();
      } else if (peek(':') || peek('/')) {
        i += 1;
        v /= unary();
      } else if (startsAtom()) {
        v *= power();
      } else return v;
    }
  }
  function expr(): number {
    let v = term();
    for (;;) {
      if (peek('+')) {
        eat('+');
        v += term();
      } else if (peek('-')) {
        eat('-');
        v -= term();
      } else return v;
    }
  }
  const out = expr();
  if (i !== s.length) throw new Error(`oxirigacha o'qilmadi (${i}/${s.length}): ${src}`);
  return out;
}

/** "$...$" ni olib tashlab, songa aylantiradi. Aralash son "3\frac{1}{2}" ham tushuniladi. */
function optVal(text: string, vars: Record<string, number> = {}): number {
  const t = text.trim().replace(/^\$|\$$/g, '');
  const mixed = /^(-?)(\d+)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  if (mixed) return (mixed[1] ? -1 : 1) * (Number(mixed[2]) + Number(mixed[3]) / Number(mixed[4]));
  return evalTex(t, vars);
}

/** a+bi ko'rinishidagi matn -> [re, im]. */
function optComplex(text: string): [number, number] {
  const t = text.trim().replace(/^\$|\$$/g, '').replace(/\s+/g, '');
  if (!t.endsWith('i')) return [evalTex(t), 0];
  const body = t.slice(0, -1);
  // oxirgi yuqori darajadagi + yoki - (qavs/figurali qavs tashqarisida, birinchi belgi emas)
  let depth = 0;
  let cut = -1;
  for (let k = 0; k < body.length; k++) {
    const ch = body[k]!;
    if (ch === '{' || ch === '(') depth++;
    else if (ch === '}' || ch === ')') depth--;
    else if (depth === 0 && (ch === '+' || ch === '-') && k > 0) cut = k;
  }
  const part = (str: string): number => (str === '' || str === '+' ? 1 : str === '-' ? -1 : evalTex(str));
  if (cut < 0) return [0, part(body)];
  return [evalTex(body.slice(0, cut)), part(body.slice(cut))];
}

// ---------------------------------------------------------------------------------------------
// Savol ob'ekti va tekshiruv yordamchilari
// ---------------------------------------------------------------------------------------------

type P = any; // eslint-disable-line @typescript-eslint/no-explicit-any

interface Q {
  id: string;
  seed: number;
  type: 'y1' | 'y2' | 'o';
  stem: string;
  opts: Record<'A' | 'B' | 'C' | 'D', string>;
  correct: string;
  wrongs: string[];
  keyO: { a?: string[]; b?: string[] };
}

function load(id: string, seed: number): { p: P; q: Q } {
  const tpl = TPL.get(id);
  if (!tpl) throw new Error(`shablon yo'q: ${id}`);
  const p = numbersAlgebraParams(id, seed) as P;
  const spec = tpl.generate(seed);
  const c = spec.content('uz');
  const q: Q = { id, seed, type: tpl.type, stem: c.stem_md, opts: {} as Q['opts'], correct: '', wrongs: [], keyO: {} };
  if (tpl.type === 'y1') {
    const opts = (c.payload as { options: Q['opts'] }).options;
    const letter = (spec.key as { correct: 'A' | 'B' | 'C' | 'D' }).correct;
    q.opts = opts;
    q.correct = opts[letter];
    q.wrongs = (['A', 'B', 'C', 'D'] as const).filter((l) => l !== letter).map((l) => opts[l]);
    // tillar bo'yicha bir xil variantlar
    for (const lang of LANGS) {
      const o2 = (spec.content(lang).payload as { options: Q['opts'] }).options;
      expect(o2, `${id}#${seed} [${lang}] variantlar`).toEqual(opts);
    }
  } else {
    q.keyO = spec.key as Q['keyO'];
    for (const lang of LANGS) expect(spec.key).toEqual(tpl.generate(seed).key);
  }
  return { p, q };
}

/** Nisbiy yaqinlik (juda kichik qiymatlar ham farqlansin); ikkalasi ~0 bo'lsa teng. */
const close = (a: number, b: number, tol = 1e-9): boolean => Math.abs(a - b) <= tol * Math.max(Math.abs(a), Math.abs(b)) || Math.max(Math.abs(a), Math.abs(b)) < 1e-20;

/** To'g'ri variant kutilgan songa teng, chalg'ituvchilar teng emas. */
function expectNum(q: Q, expected: number, vars: Record<string, number> = {}, tol = 1e-9): void {
  const where = `${q.id}#${q.seed}`;
  const got = optVal(q.correct, vars);
  expect(close(got, expected, tol), `${where}: to'g'ri variant ${q.correct} = ${got}, kutilgan ${expected}`).toBe(true);
  for (const w of q.wrongs) {
    const v = optVal(w, vars);
    expect(close(v, expected, tol), `${where}: chalg'ituvchi ${w} = ${v} to'g'ri javobga teng (${expected})`).toBe(false);
  }
}
function expectComplex(q: Q, expected: [number, number]): void {
  const where = `${q.id}#${q.seed}`;
  const eq = (v: [number, number]) => close(v[0], expected[0]) && close(v[1], expected[1]);
  const got = optComplex(q.correct);
  expect(eq(got), `${where}: to'g'ri variant ${q.correct} = ${got}, kutilgan ${expected}`).toBe(true);
  for (const w of q.wrongs) expect(eq(optComplex(w)), `${where}: chalg'ituvchi ${w} to'g'ri javobga teng`).toBe(false);
}
/** Ochiq javob kaliti: barcha shakllar kutilgan songa teng. */
function expectKey(q: Q, part: 'a' | 'b', expected: number): void {
  const forms = q.keyO[part];
  expect(forms, `${q.id}#${q.seed}: ${part}) kalit yo'q`).toBeDefined();
  for (const f of forms!) {
    const v = f.includes('/') ? Number(f.split('/')[0]) / Number(f.split('/')[1]) : Number(f);
    expect(close(v, expected, 1e-9), `${q.id}#${q.seed}: ${part}) kalit "${f}", kutilgan ${expected}`).toBe(true);
  }
}
/** Matndagi (savol) hamma ko'rsatilgan sonlar bor. */
function stemHas(q: Q, ...nums: number[]): void {
  for (const n of nums) {
    expect(q.stem.includes(String(n)), `${q.id}#${q.seed}: savol matnida ${n} yo'q: ${q.stem.slice(0, 90)}`).toBe(true);
  }
}

const rng = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const sumOf = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);
const gcdB = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdB(b, a % b));
const digitSum = (n: number): number => String(n).split('').reduce((s, c) => s + Number(c), 0);

type Check = (p: P, q: Q) => void;
const CHECKS: Record<string, Check> = {};

// =============================================================================================
// 1.1 Natural sonlar
// =============================================================================================

CHECKS['na-digit-ext'] = (p, q) => {
  const lo = 10 ** (p.k - 1);
  const hi = 10 ** p.k - 1;
  let first = -1;
  let last = -1;
  for (let n = lo; n <= hi; n++) {
    if (digitSum(n) !== p.S) continue;
    if (p.par === 'even' && n % 2 !== 0) continue;
    if (p.par === 'odd' && n % 2 !== 1) continue;
    if (first < 0) first = n;
    last = n;
  }
  expectNum(q, p.mode === 'min' ? first : last);
  stemHas(q, p.S);
};

CHECKS['na-count-div'] = (p, q) => {
  let c = 0;
  for (let x = p.lo; x <= p.hi; x++) if (x % p.m === 0 && x % p.n !== 0) c++;
  expectNum(q, c);
  stemHas(q, p.lo, p.hi, p.m, p.n);
};

CHECKS['na-digit-zero'] = (p, q) => {
  let s = '';
  for (let x = 1; x <= p.N; x++) s += x;
  expectNum(q, s.split('0').length - 1);
  stemHas(q, p.N);
};

CHECKS['na-o-digits'] = (p, q) => {
  let s = '';
  for (let x = 1; x <= p.N; x++) s += x;
  expectKey(q, 'a', s.length);
  expectKey(q, 'b', s.split(String(p.R)).length - 1);
  stemHas(q, p.N);
};

CHECKS['na-two-unk'] = (p, q) => {
  const re = new RegExp(`^${p.pat.replace('a', '(\\d)').replace('b', '(\\d)')}$`);
  let c = 0;
  for (let n = 1000; n <= 9999; n++) {
    if (re.test(String(n)) && n % p.d === 0) c++;
  }
  expectNum(q, c);
  expect(q.stem.includes(p.pat), `${q.id}#${q.seed}: shablon ${p.pat} matnda yo'q`).toBe(true);
};

CHECKS['na-primes'] = (p, q) => {
  const sieve = new Array(p.b + 2).fill(true);
  sieve[0] = sieve[1] = false;
  for (let i = 2; i * i <= p.b; i++) if (sieve[i]) for (let j = i * i; j <= p.b; j += i) sieve[j] = false;
  const ps = rng(p.a, p.b).filter((x) => sieve[x]);
  expectNum(q, p.mode === 'count' ? ps.length : sumOf(ps));
  stemHas(q, p.a, p.b);
};

function bruteDivisors(N: number): number[] {
  return rng(1, N).filter((d) => N % d === 0);
}
const nOf = (pf: [number, number][]): number => pf.reduce((n, [q, e]) => n * q ** e, 1);

CHECKS['na-divisors'] = (p, q) => {
  const N = nOf(p.pf);
  const ds = bruteDivisors(N);
  const exp = { tau: ds.length, sigma: sumOf(ds), odd: ds.filter((d) => d % 2 === 1).length, sq: ds.filter((d) => Number.isInteger(Math.sqrt(d))).length }[p.ask as 'tau' | 'sigma' | 'odd' | 'sq'];
  expectNum(q, exp);
  stemHas(q, N);
};

CHECKS['na-o-divisors'] = (p, q) => {
  const N = nOf(p.pf);
  const ds = bruteDivisors(N);
  expectKey(q, 'a', ds.length);
  expectKey(q, 'b', sumOf(ds));
  stemHas(q, N);
};

CHECKS['na-last-digit'] = (p, q) => {
  let tot = 0n;
  for (const t of p.terms) tot += BigInt(t.a) ** BigInt(t.n);
  expectNum(q, Number(tot % 10n));
  for (const t of p.terms) expect(q.stem.includes(`${t.a}^{${t.n}}`)).toBe(true);
};

CHECKS['na-mod-system'] = (p, q) => {
  let n = p.M + 1;
  while (!(n % p.d1 === p.r1 && n % p.d2 === p.r2)) n++;
  expectNum(q, n);
  stemHas(q, p.d1, p.r1, p.d2, p.r2, p.M);
};

CHECKS['na-gcd-missing'] = (p, q) => {
  const a = p.g * p.u;
  const b = p.g * p.v;
  if (p.mode === 'other') {
    const l = (a * b) / gcdB(a, b);
    const sols = rng(1, 3000).filter((x) => gcdB(a, x) === p.g && (a * x) / gcdB(a, x) === l);
    expect(sols).toEqual([b]);
    expectNum(q, sols[0]!);
    stemHas(q, p.g, l, a);
  } else {
    const prod = a * b;
    const ls = new Set<number>();
    for (let x = 1; x * x <= prod; x++) {
      if (prod % x === 0 && gcdB(x, prod / x) === p.g) ls.add(prod / p.g);
    }
    expect([...ls].length).toBeGreaterThan(0);
    expectNum(q, [...ls][0]!);
    stemHas(q, prod, p.g);
  }
};

CHECKS['na-gcd-pairs'] = (p, q) => {
  const S = p.g * p.m;
  let c = 0;
  for (let a = 1; a < S; a++) {
    const b = S - a;
    if (gcdB(a, b) !== p.g) continue;
    if (p.ordered || a < b) c++;
  }
  expectNum(q, c);
  stemHas(q, S, p.g);
};

CHECKS['na-cycle'] = (p, q) => {
  const [x, y, z] = p.periods as number[];
  const total = p.T * 60;
  const horizon = p.mode === 'first' ? 100000 : total;
  let first = -1;
  let count = 0;
  for (let t = 1; t <= horizon; t++) {
    if (t % x! === 0 && t % y! === 0 && t % z! === 0) {
      if (first < 0) first = t;
      count++;
      if (p.mode === 'first') break;
    }
  }
  expectNum(q, p.mode === 'first' ? first : count);
  stemHas(q, x!, y!, z!);
};

CHECKS['na-tiles'] = (p, q) => {
  let side = 0;
  for (let s = p.a; s >= 1; s--) if (p.a % s === 0 && p.b % s === 0) { side = s; break; }
  expectNum(q, p.ask === 'side' ? side : (p.a * p.b) / (side * side));
  stemHas(q, p.a, p.b);
};

// =============================================================================================
// 1.2 Sonlar ustida amallar
// =============================================================================================

/** Savol matnidagi k-chi $...$ bo'lagi. */
const mathAt = (q: Q, k = 0): string => {
  const parts = [...q.stem.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
  if (!parts[k]) throw new Error(`${q.id}#${q.seed}: matnda ${k}-formula yo'q`);
  return parts[k]!;
};
/** 3\frac{1}{2} -> (3+\frac{1}{2}) */
const mixedToSum = (t: string): string => t.replace(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g, '($1+\\frac{$2}{$3})');

CHECKS['ar-mixed'] = (p, q) => {
  const x = p.A + p.b / p.c;
  const y = p.D + p.e / p.f;
  const exp = { '+': x + y, '-': x - y, '*': x * y, '/': x / y }[p.op as '+' | '-' | '*' | '/'];
  expectNum(q, exp);
  // ko'rsatilgan ifodaning o'zi ham shu qiymatga teng
  expect(close(evalTex(mixedToSum(mathAt(q))), exp, 1e-9), `${q.id}#${q.seed}: ifoda matni javobga teng emas`).toBe(true);
};

CHECKS['ar-cfrac'] = (p, q) => {
  const f = (k: number) => p.n[k] / p.d[k];
  const exp = [(f(0) + f(1)) / (f(2) - f(3)), f(0) / f(1) - f(2) / f(3), (f(0) - f(1)) / (f(2) + f(3))][p.v as number]!;
  expectNum(q, exp);
  expect(close(evalTex(mathAt(q)), exp, 1e-9), `${q.id}#${q.seed}: ifoda matni javobga teng emas`).toBe(true);
};

CHECKS['ar-frac-part'] = (p, q) => {
  const K = Number(/(\d+)\$ km/.exec(q.stem)![1]);
  const found: { T: number; d2: number }[] = [];
  for (let T = 1; T <= 5000; T++) {
    if ((T * p.n1) % p.d1 !== 0) continue;
    const r1 = T - (T * p.n1) / p.d1;
    if ((r1 * p.n2) % p.d2 !== 0) continue;
    const d2 = (r1 * p.n2) / p.d2;
    if (r1 - d2 === K) found.push({ T, d2 });
  }
  expect(found.length, `${q.id}#${q.seed}: butun yo'l yagona emas`).toBe(1);
  expectNum(q, p.mode === 'total' ? found[0]!.T : found[0]!.d2);
};

CHECKS['ar-decimal'] = (p, q) => {
  const x = p.A / 10;
  const y = p.B / 10;
  const D = p.D / 10;
  const C = D * (p.Q / 10);
  const exp = x * y + p.sign * (C / D);
  expectNum(q, exp);
  expect(close(evalTex(mathAt(q)), exp, 1e-9), `${q.id}#${q.seed}: ifoda matni javobga teng emas`).toBe(true);
};

/** 0,12(34) kabi matnni 40 xonagacha yoyib songa aylantiradi. */
function periodicValue(t: string): number {
  const m = /^0\{,\}(\d*)\((\d+)\)$/.exec(t)!;
  const digits = m[1]! + m[2]!.repeat(40);
  return Number(`0.${digits.slice(0, 40)}`) + 0; // 40 xona: xato < 1e-40
}
CHECKS['ar-periodic'] = (p, q) => {
  const m = /^(0\{,\}\d*\(\d+\))(\+|-|\\cdot )(0\{,\}\d*\(\d+\))$/.exec(mathAt(q));
  expect(m, `${q.id}#${q.seed}: matn tuzilishi`).not.toBeNull();
  const a = periodicValue(m![1]!);
  const b = periodicValue(m![3]!);
  const exp = m![2] === '+' ? a + b : m![2] === '-' ? a - b : a * b;
  expectNum(q, exp, {}, 1e-9);
  expect(m![2] === '+' ? '+' : m![2] === '-' ? '-' : '*').toBe(p.op);
};

CHECKS['ar-abs'] = (p, q) => {
  const exp = Math.abs(p.a) - Math.abs(p.b - p.c) + Math.abs(p.d) * Math.abs(p.e + p.f);
  expectNum(q, exp);
  expect(close(evalTex(mathAt(q)), exp, 1e-12), `${q.id}#${q.seed}: ifoda matni javobga teng emas`).toBe(true);
};

CHECKS['ar-order'] = (p, q) => {
  const vals = [q.correct, ...q.wrongs].map((t) => optVal(t));
  const target = p.mode === 'max' ? Math.max(...vals) : Math.min(...vals);
  expect(close(optVal(q.correct), target), `${q.id}#${q.seed}: to'g'ri variant ${p.mode} emas`).toBe(true);
  expect(vals.filter((v) => close(v, target)).length).toBe(1);
  const pv = (p.vals as { n: number; d: number }[]).map((f) => f.n / f.d).sort((a, b) => a - b);
  expect(vals.sort((a, b) => a - b).every((v, i) => close(v, pv[i]!))).toBe(true);
};

CHECKS['ar-telescope'] = (p, q) => {
  let s = 0;
  for (let k = 0; k < p.n; k++) s += p.c / ((p.a + k * p.d) * (p.a + (k + 1) * p.d));
  expectNum(q, s, {}, 1e-9);
  expect(q.stem.includes(`\\frac{${p.c}}{${p.a}\\cdot ${p.a + p.d}}`)).toBe(true);
  expect(q.stem.includes(`\\frac{${p.c}}{${p.a + (p.n - 1) * p.d}\\cdot ${p.a + p.n * p.d}}`)).toBe(true);
};

CHECKS['ar-sci'] = (p, q) => {
  const a = p.m1 / 10;
  const b = p.m2 / 10;
  const exp = p.op === 'mul' ? a * b * 10 ** (p.e1 + p.e2) : (a / b) * 10 ** (p.e1 - p.e2);
  expectNum(q, exp);
  expect(close(evalTex(mathAt(q)), exp, 1e-9), `${q.id}#${q.seed}: ifoda matni javobga teng emas`).toBe(true);
  const mant = Number(/^\$([\d{,}]+)\\cdot 10\^\{-?\d+\}\$$/.exec(q.correct)![1]!.replace('{,}', '.'));
  expect(mant >= 1 && mant < 10, `${q.id}#${q.seed}: mantissa [1;10) da emas`).toBe(true);
};

CHECKS['ar-relerr'] = (p, q) => {
  const nums = [...q.stem.matchAll(/\$([\d{,}]+)\$/g)].map((m) => Number(m[1]!.replace('{,}', '.')));
  const [X, meas] = nums as [number, number];
  expect(X).toBe(p.X);
  const d = Math.abs(meas - X);
  expectKey(q, 'a', d);
  expectKey(q, 'b', (d / X) * 100);
};

CHECKS['ar-between'] = (p, q) => {
  const e = p.kind === 'sqrt' ? 0.5 : 1 / 3;
  const lo = Math.pow(p.a, e);
  const hi = Math.pow(p.b, e);
  const c = rng(0, 60).filter((k) => k > lo + 1e-12 && k < hi - 1e-12).length;
  expectNum(q, c);
  stemHas(q, p.a, p.b);
};

CHECKS['ar-nearest'] = (p, q) => {
  const v = evalTex(mathAt(q));
  let best = 0;
  for (let k = 0; k <= 40; k++) if (Math.abs(k - v) < Math.abs(best - v)) best = k;
  expectNum(q, best);
  expect(Math.abs(v - Math.floor(v) - 0.5)).toBeGreaterThan(0.05);
};

// --- kompleks sonlar ---
type C2 = [number, number];
const cM = (a: C2, b: C2): C2 => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cD = (a: C2, b: C2): C2 => {
  const den = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / den, (a[1] * b[0] - a[0] * b[1]) / den];
};
const cAbs = (a: C2): number => Math.hypot(a[0], a[1]);

CHECKS['cx-mul'] = (p, q) => {
  const z = cM([p.a, p.b], [p.c, p.d]);
  expectComplex(q, z);
  // (ac - bd, ad + bc) ni sonli tekshiruv: z1*z2 modulari
  expect(close(cAbs(z), cAbs([p.a, p.b]) * cAbs([p.c, p.d]), 1e-9)).toBe(true);
};

CHECKS['cx-ipow'] = (p, q) => {
  let re = 0;
  let im = 0;
  for (const n of p.exps as number[]) {
    let z: C2 = [1, 0];
    for (let k = 0; k < n; k++) z = cM(z, [0, 1]);
    re += z[0];
    im += z[1];
  }
  expectComplex(q, [re, im]);
};

CHECKS['cx-mod'] = (p, q) => {
  const z1 = p.z1 as C2;
  const z2 = p.z2 as C2;
  let exp: number;
  if (p.kind === 'mul') exp = cAbs(cM(z1, z2));
  else if (p.kind === 'div') exp = cAbs(cD(z1, z2));
  else {
    let z: C2 = [1, 0];
    for (let k = 0; k < p.n; k++) z = cM(z, z1);
    exp = cAbs(z);
  }
  expectNum(q, exp);
};

CHECKS['cx-div'] = (p, q) => {
  expectComplex(q, cD([p.a, p.b], [p.c, p.d]));
};

CHECKS['cx-o'] = (p, q) => {
  // matndagi z ifodasidan o'qiymiz: z = (a+bi)^2 / (c+di)
  const m = /\\dfrac\{\((.+?)\)\^\{2\}\}\{(.+?)\}/.exec(mathAt(q));
  expect(m, `${q.id}#${q.seed}: matn tuzilishi`).not.toBeNull();
  const num = optComplex(m![1]!);
  const den = optComplex(m![2]!);
  expect(den).toEqual([p.c, p.d]);
  const z = cD(cM(num, num), den);
  expect(close(z[0], Math.round(z[0]), 1e-9) && close(z[1], Math.round(z[1]), 1e-9)).toBe(true);
  expectKey(q, 'a', z[0]);
  expectKey(q, 'b', z[1]);
};

// =============================================================================================
// 2.1 Daraja va ildiz
// =============================================================================================

/** Savol matnidagi ifoda (birinchi formula) ning o'zi ham javobga teng (displeydagi ifodani mustaqil hisoblagich bilan o'qiymiz). */
function expectStemExpr(q: Q, expected: number, vars: Record<string, number> = {}, tol = 1e-9): void {
  const v = evalTex(mathAt(q), vars);
  expect(close(v, expected, tol), `${q.id}#${q.seed}: matndagi ifoda = ${v}, kutilgan ${expected}`).toBe(true);
}

CHECKS['pw-neg'] = (p, q) => {
  const exp = (p.a / p.b) ** -p.m + (p.op === '+' ? 1 : -1) * p.c ** -p.n;
  expectNum(q, exp);
  expectStemExpr(q, exp);
};

CHECKS['pw-same'] = (p, q) => {
  const exp = p.p ** (p.i * p.x + p.j * p.y - p.k * p.z);
  expectNum(q, exp);
  expectStemExpr(q, exp);
};

CHECKS['pw-compare'] = (p, q) => {
  const big = (t: string): bigint => {
    const m = /^\$(\d+)\^\{(\d+)\}\$$/.exec(t)!;
    return BigInt(m[1]!) ** BigInt(m[2]!);
  };
  const all = [q.correct, ...q.wrongs].map(big);
  const target = p.mode === 'max' ? all.reduce((a, b) => (a > b ? a : b)) : all.reduce((a, b) => (a < b ? a : b));
  expect(big(q.correct) === target, `${q.id}#${q.seed}: to'g'ri variant ${p.mode} emas`).toBe(true);
  expect(all.filter((x) => x === target).length).toBe(1);
  // parametrlar bilan moslik
  const fromP = (p.items as { a: number; m: number }[]).map((it) => BigInt(it.a) ** BigInt(it.m * p.g));
  expect([...fromP].sort().map(String)).toEqual([...all].sort().map(String));
};

CHECKS['pw-factor'] = (p, q) => {
  const { a, p: P, q: Q, r: R, k, s } = p;
  for (const n of [3, 5, 8]) {
    const direct = (a ** (n + P) + s * k * a ** (n + Q)) / a ** (n + R);
    expectNum(q, direct);
    expectStemExpr(q, direct, { n });
  }
};

CHECKS['rt-denest'] = (p, q) => {
  const inner = p.m + p.n + (p.minus ? -2 : 2) * Math.sqrt(p.m * p.n);
  expect(inner).toBeGreaterThan(0);
  const exp = Math.sqrt(inner);
  expectNum(q, exp);
  expectStemExpr(q, exp);
  expect(close(exp, p.minus ? Math.sqrt(p.m) - Math.sqrt(p.n) : Math.sqrt(p.m) + Math.sqrt(p.n), 1e-12)).toBe(true);
};

CHECKS['rt-cube'] = (p, q) => {
  const exp = Math.cbrt(p.k[0] ** 3) + Math.cbrt(p.k[1] ** 3) - Math.cbrt(p.k[2] ** 3);
  expectNum(q, Math.round(exp));
  expect(close(exp, Math.round(exp), 1e-12)).toBe(true);
  expectStemExpr(q, Math.round(exp));
};

CHECKS['rt-prod'] = (p, q) => {
  expectNum(q, p.c);
  expectStemExpr(q, p.c, {}, 1e-9);
};

CHECKS['rt-frac'] = (p, q) => {
  const exp = Math.pow(p.r1 ** p.q, p.pe / p.q) + (p.op === '+' ? 1 : -1) * Math.pow(p.r2 ** p.q2, p.pe2 / p.q2);
  expectNum(q, exp, {}, 1e-9);
  expectStemExpr(q, exp, {}, 1e-9);
};

CHECKS['rt-frac-mix'] = (p, q) => {
  const bs = (p.i as number[]).map((e) => p.p ** e);
  const exp = (Math.pow(bs[0]!, p.t[0] / p.i[0]) * Math.pow(bs[1]!, p.t[1] / p.i[1])) / Math.pow(bs[2]!, p.t[2] / p.i[2]);
  expectNum(q, exp, {}, 1e-9);
  expectStemExpr(q, exp, {}, 1e-9);
};

CHECKS['rt-rationalize'] = (p, q) => {
  const den = Math.sqrt(p.m) + (p.plus ? 1 : -1) * Math.sqrt(p.n);
  const k = p.c * (p.m - p.n);
  expectNum(q, k / den, {}, 1e-9);
  expectStemExpr(q, k / den, {}, 1e-9);
};

CHECKS['rt-rat-tele'] = (p, q) => {
  const a = p.s * p.s;
  const n = (p.t * p.t - a) / p.d;
  let s = 0;
  for (let k = 0; k < n; k++) s += 1 / (Math.sqrt(a + k * p.d) + Math.sqrt(a + (k + 1) * p.d));
  expectNum(q, s, {}, 1e-9);
  expect(Number.isInteger(n)).toBe(true);
  // matndagi birinchi va oxirgi hadlar (ko'p nuqta bor: to'liq ifodani hisoblab bo'lmaydi)
  expect(q.stem.includes(String.raw`\frac{1}{\sqrt{${a}}+\sqrt{${a + p.d}}}`)).toBe(true);
  expect(q.stem.includes(String.raw`\frac{1}{\sqrt{${a + (n - 1) * p.d}}+\sqrt{${a + n * p.d}}}`)).toBe(true);
  stemHas(q, n);
};

CHECKS['rt-simp'] = (p, q) => {
  const radicands = (p.k as number[]).map((kk) => kk * kk * p.c);
  const exp = radicands.reduce((s, v, i) => s + p.sg[i] * Math.sqrt(v), 0);
  expectNum(q, exp, {}, 1e-9);
  expectStemExpr(q, exp, {}, 1e-9);
};

CHECKS['rt-conj'] = (p, q) => {
  const A = Math.sqrt(p.a) + Math.sqrt(p.b);
  const B = Math.sqrt(p.a) - Math.sqrt(p.b);
  const exp = { sumsq: A * A + B * B, cross: A * A - B * B, rev: A / B + B / A }[p.kind as 'sumsq' | 'cross' | 'rev'];
  expectNum(q, exp, {}, 1e-9);
  expectStemExpr(q, exp, {}, 1e-9);
};

CHECKS['ni-largest'] = (p, q) => {
  const vals = [q.correct, ...q.wrongs].map((t) => optVal(t));
  const target = p.mode === 'max' ? Math.max(...vals) : Math.min(...vals);
  expect(close(optVal(q.correct), target), `${q.id}#${q.seed}: to'g'ri variant ${p.mode} emas`).toBe(true);
  expect(vals.filter((v) => close(v, target)).length).toBe(1);
  const fromP = (p.items as { n: number; x: number }[]).map((it) => Math.pow(it.x, 1 / it.n)).sort((a, b) => a - b);
  expect(vals.sort((a, b) => a - b).every((v, i) => close(v, fromP[i]!, 1e-9))).toBe(true);
};

CHECKS['ni-o-bounds'] = (p, q) => {
  const E = (x: number, y: number) => p.al * x + p.be * y;
  const corners = [E(p.a, p.c), E(p.a, p.d), E(p.b, p.c), E(p.b, p.d)];
  const lo = Math.min(...corners);
  const hi = Math.max(...corners);
  // (a,b) x (c,d) ochiq to'rtburchak: E butun k ni qabul qiladi <=> lo < k < hi; torlar bilan ham tasdiqlaymiz
  const attained = new Set<number>();
  const step = 1 / 60;
  for (let xi = 1; xi < (p.b - p.a) * 60; xi++) {
    for (let yi = 1; yi < (p.d - p.c) * 60; yi++) {
      const v = E(p.a + xi * step, p.c + yi * step);
      const r = Math.round(v);
      if (Math.abs(v - r) < 1e-9) attained.add(r);
    }
  }
  const ks = [...attained];
  expect(ks.length).toBeGreaterThan(0);
  expectKey(q, 'a', Math.max(...ks));
  expectKey(q, 'b', Math.min(...ks));
  expect(Math.max(...ks)).toBeLessThan(hi);
  expect(Math.min(...ks)).toBeGreaterThan(lo);
};

CHECKS['ni-count'] = (p, q) => {
  const e = p.kind === 'sqrt' ? 2 : 3;
  // P/2 < n^(1/e) < Q/2  <=>  P^e < 2^e n  va  2^e n < Q^e (butun sonlar bilan)
  let c = 0;
  for (let n = 1; n <= 5000; n++) if (p.P ** e < 2 ** e * n && 2 ** e * n < p.Q ** e) c++;
  expectNum(q, c);
  // float bilan ham
  let c2 = 0;
  for (let n = 1; n <= 5000; n++) if (Math.pow(n, 1 / e) > p.P / 2 + 1e-12 && Math.pow(n, 1 / e) < p.Q / 2 - 1e-12) c2++;
  expect(c2).toBe(c);
};

// =============================================================================================
// 2.2 Trigonometriya asoslari
// =============================================================================================

const RAD = Math.PI / 180;
const ROMANS = ['', 'I', 'II', 'III', 'IV'];
/** "$\mathrm{III}$" -> 3 */
const romanVal = (t: string): number => ROMANS.indexOf(/\\mathrm\{([IV]+)\}/.exec(t)![1]!);
/** Matndan chorak raqami: "III chorakda" */
const stemQuadrant = (q: Q): number => ROMANS.indexOf(/\b(IV|III|II|I)\b chorakda/.exec(q.stem)![1]!);
/** Burchak matni (daraja yoki radian TeX) -> daraja */
const angleToDeg = (t: string): number => {
  const m = /^(-?\d+(?:\.\d+)?)\^\{\\circ\}$/.exec(t.replace(/\s+/g, ''));
  return m ? Number(m[1]) : (optVal(t) * 180) / Math.PI;
};
/** sin/cos qiymati va chorak -> burchak (radian), mustaqil: acos/asin dan emas, atan2 bilan */
function angleFromGiven(fn: 'sin' | 'cos', g: number, quad: number): number {
  const other = Math.sqrt(1 - g * g);
  const sgnOther = fn === 'sin' ? (quad === 1 || quad === 4 ? 1 : -1) : quad === 1 || quad === 2 ? 1 : -1;
  const s = fn === 'sin' ? g : sgnOther * other;
  const c = fn === 'cos' ? g : sgnOther * other;
  return Math.atan2(s, c);
}

CHECKS['tr-pyth'] = (p, q) => {
  const m = /^\\(sin|cos)\\alpha=(.+)$/.exec(mathAt(q))!;
  const fn = m[1] as 'sin' | 'cos';
  const g = evalTex(m[2]!);
  expect(fn).toBe(p.given);
  const th = angleFromGiven(fn, g, stemQuadrant(q));
  const exp = { sin: Math.sin(th), cos: Math.cos(th), tan: Math.tan(th), cot: 1 / Math.tan(th) }[p.ask as 'sin' | 'cos' | 'tan' | 'cot'];
  expectNum(q, exp);
  // matndagi so'ralgan funksiya nomi
  const asked = mathAt(q, 2);
  expect(asked.includes(p.ask === 'tan' ? 'tg' : p.ask === 'cot' ? 'ctg' : p.ask)).toBe(true);
};

CHECKS['tr-tanratio'] = (p, q) => {
  const t = p.n / p.m;
  const th = Math.atan(t);
  const s = Math.sin(th);
  const c = Math.cos(th);
  const exp = p.kind === 'lin' ? (p.a * s + p.b * c) / (p.c * s + p.d * c) : p.kind === 'sc' ? s * c : s * s;
  expectNum(q, exp);
  const given = /\\alpha=(.+?)\$ bo'lsa/.exec(q.stem.replace(/\$/g, '$') + '')?.[1];
  void given;
  expect(close(evalTex(/=(-?\\frac\{\d+\}\{\d+\}|-?\d+)\$ bo'lsa/.exec(q.stem)![1]!), t)).toBe(true);
};

CHECKS['tr-sincos'] = (p, q) => {
  const s = p.y / p.c;
  const c = p.x / p.c;
  const sInStem = evalTex(/\\sin\\alpha\+\\cos\\alpha=([^$]+)\$/.exec(q.stem)![1]!);
  expect(close(sInStem, s + c)).toBe(true);
  const exp = { prod: s * c, cubes: s ** 3 + c ** 3, fourth: s ** 4 + c ** 4 }[p.kind as 'prod' | 'cubes' | 'fourth'];
  expectNum(q, exp);
};

CHECKS['tr-reduce'] = (p, q) => {
  const f = (fn: string, d: number) => (fn === 'sin' ? Math.sin(d * RAD) : fn === 'cos' ? Math.cos(d * RAD) : Math.tan(d * RAD));
  const exp = (p.terms as { fn: string; d: number; k: number }[]).reduce((s, t) => s + t.k * f(t.fn, t.d), 0);
  expectNum(q, exp, {}, 1e-8);
  for (const t of p.terms as { d: number }[]) stemHas(q, t.d);
};

CHECKS['tr-large'] = (p, q) => {
  const th = (p.n * Math.PI) / p.d;
  const exp = { sin: Math.sin(th), cos: Math.cos(th), tan: Math.tan(th) }[p.fn as 'sin' | 'cos' | 'tan'];
  expectNum(q, exp, {}, 1e-8);
  stemHas(q, p.n, p.d);
};

CHECKS['tr-double'] = (p, q) => {
  const th = Math.atan2(p.y, p.x);
  const exp = { sin2: Math.sin(2 * th), cos2: Math.cos(2 * th), tan2: Math.tan(2 * th) }[p.ask as 'sin2' | 'cos2' | 'tan2'];
  expectNum(q, exp, {}, 1e-8);
  // berilgan qiymat va chorak matndan
  const m = /^\\(sin|cos)\\alpha=(.+)$/.exec(mathAt(q))!;
  const th2 = angleFromGiven(m[1] as 'sin' | 'cos', evalTex(m[2]!), stemQuadrant(q));
  expect(close(Math.sin(2 * th2), Math.sin(2 * th), 1e-9) && close(Math.cos(2 * th2), Math.cos(2 * th), 1e-9)).toBe(true);
};

CHECKS['tr-tansum'] = (p, q) => {
  const a = Math.atan(p.n1 / p.m1);
  const b = Math.atan(p.n2 / p.m2);
  expectNum(q, Math.tan(p.sign === 1 ? a + b : a - b), {}, 1e-8);
};

CHECKS['tr-prodsum'] = (p, q) => {
  const A = p.a * RAD;
  const B = p.b * RAD;
  const exp = { sc: Math.sin(A) * Math.cos(B), cc: Math.cos(A) * Math.cos(B), ss: Math.sin(A) * Math.sin(B) }[p.kind as 'sc' | 'cc' | 'ss'];
  expectNum(q, exp, {}, 1e-8);
  stemHas(q, p.a, p.b);
  // natija ratsional (kasr) ekani
  expect(close(optVal(q.correct) * 4, Math.round(optVal(q.correct) * 4), 1e-9)).toBe(true);
};

CHECKS['tr-sumprod'] = (p, q) => {
  const a = (p.u + p.v) * RAD;
  const b = (p.u - p.v) * RAD;
  const exp = { ss: Math.sin(a) + Math.sin(b), sd: Math.sin(a) - Math.sin(b), cs: Math.cos(a) + Math.cos(b), cd: Math.cos(a) - Math.cos(b) }[p.kind as 'ss' | 'sd' | 'cs' | 'cd'];
  expectNum(q, exp, {}, 1e-8);
  stemHas(q, p.u + p.v, p.u - p.v);
};

CHECKS['tr-special'] = (p, q) => {
  let prod = 1;
  for (let j = 0; j < p.n; j++) prod *= Math.cos(p.x * 2 ** j * RAD);
  expectNum(q, p.k * prod + p.extra, {}, 1e-8);
  stemHas(q, p.k, p.x);
};

CHECKS['tr-amp'] = (p, q) => {
  const f = (x: number) => p.a * (p.fn === 'sin' ? Math.sin(p.b * x) : Math.cos(p.b * x)) + p.d;
  if (p.ask === 'period') {
    const xs = [0.1234, 0.777, 1.9, 3.1];
    let T = 0;
    for (let t = 1e-4; t <= 7; t += 1e-4) {
      if (xs.every((x) => Math.abs(f(x + t) - f(x)) < Math.abs(p.a) * p.b * 6e-5 + 1e-9)) {
        T = t;
        break;
      }
    }
    expect(T).toBeGreaterThan(0);
    expectNum(q, T, {}, 5e-4);
  } else {
    let mx = -Infinity;
    let mn = Infinity;
    for (let x = 0; x <= 2 * Math.PI; x += 1e-4) {
      mx = Math.max(mx, f(x));
      mn = Math.min(mn, f(x));
    }
    expectNum(q, p.ask === 'max' ? Math.round(mx * 1e6) / 1e6 : Math.round(mn * 1e6) / 1e6, {}, 1e-6);
  }
};

CHECKS['tr-range'] = (p, q) => {
  let mx = -Infinity;
  let mn = Infinity;
  for (let x = 0; x <= 2 * Math.PI; x += 1e-4) {
    const y = p.a * Math.sin(p.w * x) + p.b * Math.cos(p.w * x) + p.c;
    mx = Math.max(mx, y);
    mn = Math.min(mn, y);
  }
  expectNum(q, p.ask === 'max' ? Math.round(mx * 1e5) / 1e5 : Math.round(mn * 1e5) / 1e5, {}, 1e-6);
};

CHECKS['tr-quad'] = (p, q) => {
  let mx = -Infinity;
  let mn = Infinity;
  for (let x = 0; x <= 2 * Math.PI; x += 5e-5) {
    const y = p.a * Math.cos(x) ** 2 + p.b * Math.sin(x) + p.c;
    mx = Math.max(mx, y);
    mn = Math.min(mn, y);
  }
  // 5e-5 qadam: xato ~1e-8 dan kichik
  expectNum(q, Math.round((p.ask === 'max' ? mx : mn) * 1e7) / 1e7, {}, 1e-6);
};

CHECKS['rad-conv'] = (p, q) => {
  if (p.mode === 'toRad') {
    const d = Number(/(\d+)\^\{\\circ\}/.exec(q.stem)![1]);
    expectNum(q, d * RAD);
    expect(close((d * RAD) / Math.PI, p.F.n / p.F.d, 1e-12)).toBe(true);
  } else {
    const rad = evalTex(mathAt(q));
    expectNum(q, (rad * 180) / Math.PI, {}, 1e-9);
  }
};

CHECKS['rad-arc'] = (p, q) => {
  const th = /\\theta=([^$]+)\$/.exec(q.stem)![1]!;
  const rad = angleToDeg(th) * RAD;
  const R = Number(/(\d+)\$ sm/.exec(q.stem)![1]);
  expect(R).toBe(p.R);
  expectNum(q, p.ask === 'arc' ? R * rad : (R * R * rad) / 2, {}, 1e-9);
};

CHECKS['rad-quad'] = (p, q) => {
  const deg = angleToDeg(mathAt(q));
  const quad = Math.floor((((deg % 360) + 360) % 360) / 90) + 1;
  expect(romanVal(q.correct), `${q.id}#${q.seed}: chorak ${q.correct}, kutilgan ${ROMANS[quad]}`).toBe(quad);
  expect(q.wrongs.map(romanVal).sort()).toEqual([1, 2, 3, 4].filter((x) => x !== quad));
  expect(Math.abs(deg % 90)).toBeGreaterThan(1e-6);
};

const parsePt = (t: string): [number, number] => {
  const body = t.replace(/^\$|\$$/g, '').replace(/^\(|\)$/g, '');
  const [x, y] = body.split(';\\ ');
  return [evalTex(x!), evalTex(y!)];
};

CHECKS['rad-rot'] = (p, q) => {
  const pt = /A\((-?\d+);\\ (-?\d+)\)/.exec(q.stem)!;
  const a = Number(pt[1]);
  const b = Number(pt[2]);
  expect([a, b]).toEqual([p.a, p.b]);
  const ang = angleToDeg(mathAt(q, 1)) * RAD * (p.cw ? -1 : 1);
  const rx = Math.round(a * Math.cos(ang) - b * Math.sin(ang));
  const ry = Math.round(a * Math.sin(ang) + b * Math.cos(ang));
  expect(parsePt(q.correct), `${q.id}#${q.seed}: nuqta`).toEqual([rx, ry]);
  for (const w of q.wrongs) expect(parsePt(w)).not.toEqual([rx, ry]);
};

CHECKS['rad-unit'] = (p, q) => {
  const r = Number(/P\((\d+);\\ 0\)/.exec(q.stem)![1]);
  expect(r).toBe(p.r);
  const th = angleToDeg(mathAt(q, 1)) * RAD;
  expect(close(th / RAD, p.theta, 1e-9)).toBe(true);
  expectNum(q, p.ask === 'x' ? r * Math.cos(th) : r * Math.sin(th), {}, 1e-8);
};

// @@CHECKS@@

// =============================================================================================
// Umumiy: har shablon uchun tekshiruv bor; barcha seedlar; xilma-xillik
// =============================================================================================

describe("qo'shimcha shablonlar: matematik to'g'rilik (1-2 bo'limlar)", () => {
  it("har bir shablon uchun mustaqil tekshiruv bor va tekshirilmagan shablon yo'q", () => {
    const ids = NUMBERS_ALGEBRA_TEMPLATES.map((t) => t.id);
    expect(ids.filter((id) => !CHECKS[id])).toEqual([]);
    expect(Object.keys(CHECKS).filter((id) => !TPL.has(id))).toEqual([]);
  });

  for (const tpl of NUMBERS_ALGEBRA_TEMPLATES) {
    it(`${tpl.id} (mavzu ${tpl.topic}, ${tpl.type}, ${tpl.difficulty}): ${SEEDS.length} seed bo'yicha javob va chalg'ituvchilar`, () => {
      const check = CHECKS[tpl.id];
      expect(check, `${tpl.id}: tekshiruv yo'q`).toBeDefined();
      for (const seed of SEEDS) {
        const { p, q } = load(tpl.id, seed);
        check!(p, q);
      }
    });
  }

  it('umumiy tekshiruv (KaTeX, 4 til, tuzilish, import sxemasi) 40 seed uchun', () => {
    const problems = NUMBERS_ALGEBRA_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS));
    expect(problems.slice(0, 15)).toEqual([]);
  }, 120000);

  it("har shablon 40 seedda kamida 24 ta turli savol beradi", () => {
    const low: string[] = [];
    for (const tpl of NUMBERS_ALGEBRA_TEMPLATES) {
      const sigs = new Set(SEEDS.map((s) => JSON.stringify([tpl.generate(s).content('uz').stem_md, tpl.generate(s).content('uz').payload])));
      if (sigs.size < 24) low.push(`${tpl.id}: ${sigs.size}`);
    }
    expect(low).toEqual([]);
  }, 60000);
});
