import { describe, expect, it } from 'vitest';
import { SETS_DATA_TEMPLATES } from '../../content/gen/extra/sets-data';
import { checkExtraTemplate } from './extra-harness';
import { evalTex, near } from './tex-eval';

// 5-bo'lim (To'plam, mulohaza) shablonlari uchun mustaqil matematik tekshiruv: javob savol MATNIDAGI sonlardan/to'plamlardan
// qayta hisoblanadi (to'plamlarni sanash, qism to'plamlarni bitmask bilan sanab chiqish, qo'shish-ayirish formulalari),
// shablonning ichki parametrlariga tayanmasdan. To'g'ri variant kutilgan javobga teng, chalg'ituvchilar teng emas.

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const TPL = new Map(SETS_DATA_TEMPLATES.map((t) => [t.id, t]));

interface Q {
  id: string;
  seed: number;
  stem: string;
  correct: string;
  wrongs: string[];
  key: { a?: string[]; b?: string[] };
  parts?: Record<string, { prompt_md: string }>;
}
function load(id: string, seed: number): Q {
  const spec = TPL.get(id)!.generate(seed);
  const c = spec.content('uz');
  if (TPL.get(id)!.type === 'o') {
    return { id, seed, stem: c.stem_md, correct: '', wrongs: [], key: spec.key as Q['key'], parts: (c.payload as { parts: Q['parts'] }).parts };
  }
  const opts = (c.payload as { options: Record<string, string> }).options;
  const letter = (spec.key as { correct: string }).correct;
  return { id, seed, stem: c.stem_md, correct: opts[letter]!, wrongs: Object.entries(opts).filter(([l]) => l !== letter).map(([, t]) => t), key: {} };
}

const mathChunks = (md: string): string[] => [...md.matchAll(/\$([^$\n]+?)\$/g)].map((m) => m[1]!);
const num = (t: string): number => Number(t.replace(/\$/g, ''));
const setOf = (t: string): number[] =>
  t
    .replace(/\$/g, '')
    .replace(/\\\{|\\\}|\\ /g, '')
    .split(';')
    .filter((s) => s.trim() !== '')
    .map(Number)
    .sort((a, b) => a - b);

function expectCount(q: Q, expected: number): void {
  expect(num(q.correct), `${q.id}#${q.seed}: to'g'ri variant ${q.correct}, kutilgan ${expected}`).toBe(expected);
  for (const w of q.wrongs) expect(num(w), `${q.id}#${q.seed}: chalg'ituvchi ${w} to'g'ri javobga teng`).not.toBe(expected);
}
function expectSet(q: Q, expected: number[]): void {
  expect(setOf(q.correct), `${q.id}#${q.seed}: to'g'ri variant`).toEqual(expected);
  for (const w of q.wrongs) expect(setOf(w), `${q.id}#${q.seed}: chalg'ituvchi ${w}`).not.toEqual(expected);
}
const rangeInts = (a: number, b: number): number[] => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);
const stemInts = (s: string): number[] => (s.match(/\d+/g) ?? []).map(Number);
const intervals = (stem: string): [number, number][] => [...stem.matchAll(/x\\mid (-?\d+)\\le x\\le (-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

type Check = (q: Q) => void;
const CHECKS: Record<string, Check> = {};

CHECKS['sd-set-interval'] = (q) => {
  const [[a1, a2], [b1, b2]] = intervals(q.stem) as [[number, number], [number, number]];
  const op = mathChunks(q.stem)[2]!;
  const A = rangeInts(a1, a2);
  const B = rangeInts(b1, b2);
  const inA = (x: number) => x >= a1 && x <= a2;
  const inB = (x: number) => x >= b1 && x <= b2;
  const all = rangeInts(Math.min(a1, b1), Math.max(a2, b2));
  const pick = { 'A\\cap B': (x: number) => inA(x) && inB(x), 'A\\cup B': (x: number) => inA(x) || inB(x), 'A\\setminus B': (x: number) => inA(x) && !inB(x), 'B\\setminus A': (x: number) => inB(x) && !inA(x) }[op];
  expect(pick, `${q.id}: amal tanilmadi: ${op}`).toBeDefined();
  expect(A.length).toBeGreaterThan(0);
  expect(B.length).toBeGreaterThan(0);
  expectCount(q, all.filter(pick!).length);
};

CHECKS['sd-set-universe'] = (q) => {
  const [[u1, u2], [a1, a2], [b1, b2]] = intervals(q.stem) as [[number, number], [number, number], [number, number]];
  const op = mathChunks(q.stem).find((c) => c.includes('\\overline') && !c.startsWith('X'))!.replace(/\\overline\{X\}.*/, '');
  const inA = (x: number) => x >= a1 && x <= a2;
  const inB = (x: number) => x >= b1 && x <= b2;
  const f = {
    '\\overline{A\\cap B}': (x: number) => !(inA(x) && inB(x)),
    '\\overline{A\\cup B}': (x: number) => !(inA(x) || inB(x)),
    '\\overline{A}\\cap B': (x: number) => !inA(x) && inB(x),
    'A\\cup\\overline{B}': (x: number) => inA(x) || !inB(x),
  }[op];
  expect(f, `${q.id}: amal tanilmadi: ${op}`).toBeDefined();
  expect(u1).toBe(-u2);
  expect(a1 >= u1 && a2 <= u2 && b1 >= u1 && b2 <= u2).toBe(true);
  expectCount(q, rangeInts(u1, u2).filter(f!).length);
};

CHECKS['sd-venn-two'] = (q) => {
  const [n, x, y, g] = stemInts(q.stem) as [number, number, number, number];
  // n ta o'quvchi: ikkala to'garak (both), faqat A, faqat B, hech biri; x = |A|, y = |B|
  let expected: number;
  if (/Hech qaysi to'garakka qatnashmaydigan/.test(q.stem)) expected = n - (x + y - g);
  else if (/Ikkala to'garakka ham qatnashadigan/.test(q.stem)) expected = x + y - (n - g);
  else if (/Faqat/.test(q.stem)) expected = x - g;
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
  // bevosita sanab chiqish: o'quvchilarni to'garak a'zoligi bo'yicha qurish
  const both = /Ikkala to'garakka ham qatnashadigan/.test(q.stem) ? x + y - (n - g) : g;
  const none = /Hech qaysi/.test(q.stem) ? n - (x + y - g) : /Ikkala/.test(q.stem) ? g : n - (x + y - g);
  const students = [
    ...Array.from({ length: both }, () => 'AB'),
    ...Array.from({ length: x - both }, () => 'A'),
    ...Array.from({ length: y - both }, () => 'B'),
    ...Array.from({ length: none }, () => ''),
  ];
  expect(students.length, `${q.id}#${q.seed}: jami o'quvchilar ${students.length} != ${n}`).toBe(n);
  const count = (pred: (s: string) => boolean) => students.filter(pred).length;
  expect(count((s) => s.includes('A'))).toBe(x);
  expect(count((s) => s.includes('B'))).toBe(y);
  const direct = /Hech qaysi to'garakka qatnashmaydigan/.test(q.stem) ? count((s) => s === '') : /Ikkala/.test(q.stem) ? count((s) => s === 'AB') : count((s) => s === 'A');
  expect(direct).toBe(expected);
  expect(expected).toBeGreaterThan(0);
  expectCount(q, expected);
};

CHECKS['sd-venn-three'] = (q) => {
  const [n, X, Y, Z, P, Qn, R, T] = stemInts(q.stem) as [number, number, number, number, number, number, number, number];
  const union = X + Y + Z - P - Qn - R + T;
  expect(union).toBeLessThanOrEqual(n);
  expectCount(q, /Kamida bitta/.test(q.stem) ? union : n - union);
};

CHECKS['sd-venn-exactly'] = (q) => {
  const [n, X, Y, Z, T] = stemInts(q.stem) as [number, number, number, number, number];
  // har kim kamida bitta to'garakda: n = X+Y+Z - (juftliklar yig'indisi) + T, roppa-rosa ikkita = juftliklar - 3T
  const pairs = X + Y + Z + T - n;
  const exactlyTwo = pairs - 3 * T;
  expect(exactlyTwo).toBeGreaterThan(0);
  expectCount(q, exactlyTwo);
};

CHECKS['sd-set-listed'] = (q) => {
  const sets = [...q.stem.matchAll(/\\\{([^}]*)\\\}/g)].map((m) => setOf(`\\{${m[1]}\\}`));
  const [A, B] = sets as [number[], number[]];
  const op = mathChunks(q.stem).pop()!;
  const inA = (x: number) => A.includes(x);
  const inB = (x: number) => B.includes(x);
  const all = [...new Set([...A, ...B])].sort((a, b) => a - b);
  const f = { 'A\\cap B': (x: number) => inA(x) && inB(x), 'A\\cup B': () => true, 'A\\setminus B': (x: number) => inA(x) && !inB(x), 'B\\setminus A': (x: number) => inB(x) && !inA(x) }[op];
  expect(f, `${q.id}: amal tanilmadi: ${op}`).toBeDefined();
  expectSet(q, all.filter(f!));
};

CHECKS['sd-set-subsets'] = (q) => {
  let elems: number[];
  const abs = /\|x\|\\le (\d+)/.exec(q.stem);
  const nat = /x<(\d+)/.exec(q.stem);
  if (abs) elems = rangeInts(-Number(abs[1]), Number(abs[1]));
  else if (nat) elems = rangeInts(1, Number(nat[1]) - 1);
  else throw new Error(`to'plam ko'rinishi tanilmadi: ${q.stem}`);
  const n = elems.length;
  const full = (1 << n) - 1;
  const probe = mathChunks(q.stem)[1];
  const e = probe !== undefined && /^-?\d+$/.test(probe) ? elems.indexOf(Number(probe)) : -1;
  let cnt = 0;
  for (let s = 0; s <= full; s++) {
    let ok: boolean;
    if (/o'z ichiga olgan/.test(q.stem)) ok = e >= 0 && (s & (1 << e)) !== 0;
    else if (/o'z ichiga olmagan/.test(q.stem)) ok = e >= 0 && (s & (1 << e)) === 0;
    else if (/bo'sh bo'lmagan xos/.test(q.stem)) ok = s !== 0 && s !== full;
    else if (/xos qism/.test(q.stem)) ok = s !== full;
    else if (/barcha qism/.test(q.stem)) ok = true;
    else throw new Error(`savol turi tanilmadi: ${q.stem}`);
    if (ok) cnt++;
  }
  expectCount(q, cnt);
};

CHECKS['sd-set-multiples'] = (q) => {
  const n = Number(/1 dan (\d+) gacha/.exec(q.stem)![1]);
  const [p, r] = mathChunks(q.stem).filter((c) => /^\d+$/.test(c)).map(Number) as [number, number];
  let cnt = 0;
  for (let x = 1; x <= n; x++) {
    const a = x % p === 0;
    const b = x % r === 0;
    const ok = /lekin/.test(q.stem) ? a && !b : /na /.test(q.stem) ? !a && !b : /yoki/.test(q.stem) ? a || b : /ham/.test(q.stem) ? a && b : null;
    if (ok === null) throw new Error(`savol turi tanilmadi: ${q.stem}`);
    if (ok) cnt++;
  }
  expectCount(q, cnt);
};

// =============================================================================================
// 5.2 Ma'lumotlar tahlili, 5.3 Kombinatorika, 5.4 Ehtimol, 5.5 Modellashtirish
// =============================================================================================

const allInts = (s: string): number[] => (s.match(/-?\d+/g) ?? []).map(Number);
/** y1: to'g'ri variant kutilgan songa (kasr/o'nli/TeX) teng, chalg'ituvchilar teng emas */
function expectVal(q: Q, expected: number, eps = 1e-9): void {
  expect(near(evalTex(q.correct), expected, eps), `${q.id}#${q.seed}: to'g'ri variant ${q.correct} = ${evalTex(q.correct)}, kutilgan ${expected}`).toBe(true);
  for (const w of q.wrongs) expect(near(evalTex(w), expected, 1e-7), `${q.id}#${q.seed}: chalg'ituvchi ${w} to'g'ri javobga teng`).toBe(false);
}
const keyNum = (f: string): number => (f.includes('/') ? Number(f.split('/')[0]) / Number(f.split('/')[1]) : Number(f));
function expectKey(q: Q, part: 'a' | 'b', expected: number): void {
  const forms = q.key[part];
  expect(forms, `${q.id}#${q.seed}: ${part}) kalit yo'q`).toBeDefined();
  for (const f of forms!) expect(near(keyNum(f), expected), `${q.id}#${q.seed}: ${part}) kalit "${f}", kutilgan ${expected}`).toBe(true);
}
const numChunks = (stem: string): number[] => mathChunks(stem).filter((c) => /^-?\d+$/.test(c)).map(Number);
const listChunk = (stem: string): number[] => mathChunks(stem).find((c) => c.includes(';'))!.replace(/\\ /g, '').split(';').map(Number);
const mean = (xs: number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length;

function parseArray(stem: string): { top: number[]; bottom: number[] } {
  const m = /\\begin\{array\}\{[^}]*\}(.*?)\\end\{array\}/.exec(stem)!;
  const [r1, r2] = m[1]!.split(/\\\\\s*\\hline/);
  const cells = (r: string) => r.split('&').slice(1).map((s) => Number(s.trim()));
  return { top: cells(r1!), bottom: cells(r2!) };
}

CHECKS['da-mean-missing'] = (q) => {
  const [k, m, , ...vals] = allInts(q.stem);
  expectCount(q, m! * k! - vals.reduce((s, x) => s + x, 0));
};

CHECKS['da-median-mode'] = (q) => {
  const xs = listChunk(q.stem);
  const sorted = [...xs].sort((a, b) => a - b);
  const median = sorted[(sorted.length - 1) / 2]!;
  const counts = new Map<number, number>();
  for (const v of xs) counts.set(v, (counts.get(v) ?? 0) + 1);
  const mode = [...counts].sort((a, b) => b[1] - a[1])[0]![0];
  let expected: number;
  if (/medianasi va modasining/.test(q.stem)) expected = median + mode;
  else if (/medianasini/.test(q.stem)) expected = median;
  else if (/modasini/.test(q.stem)) expected = mode;
  else if (/o'zgarish kengligini/.test(q.stem)) expected = sorted[sorted.length - 1]! - sorted[0]!;
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
  expectCount(q, expected);
};

CHECKS['da-mean-change'] = (q) => {
  const [n, m, m2] = numChunks(q.stem) as [number, number, number];
  // remove: qolgan n-1 tasining yig'indisi (n-1)*m2; add: n+1 tasining yig'indisi (n+1)*m2
  expectCount(q, /chiqarib/.test(q.stem) ? n * m - (n - 1) * m2 : (n + 1) * m2 - n * m);
};

CHECKS['da-freq-mean'] = (q) => {
  const { top, bottom } = parseArray(q.stem);
  let tot = 0;
  let n = 0;
  for (let i = 0; i < top.length; i++) {
    tot += top[i]! * bottom[i]!;
    n += bottom[i]!;
  }
  expectVal(q, tot / n);
};

CHECKS['da-pie-sector'] = (q) => {
  const [N, v] = allInts(q.stem) as [number, number];
  expectCount(q, /necha gradus/.test(q.stem) ? (v * 360) / N : (N * v) / 360);
};

CHECKS['da-std-dev'] = (q) => {
  const xs = listChunk(q.stem);
  const mu = mean(xs);
  expectCount(q, Math.sqrt(mean(xs.map((x) => (x - mu) ** 2))));
};

CHECKS['da-variance'] = (q) => {
  const xs = listChunk(q.stem);
  const mu = mean(xs);
  expectVal(q, mean(xs.map((x) => (x - mu) ** 2)));
};

CHECKS['da-table-read'] = (q) => {
  const { bottom } = parseArray(q.stem);
  const sorted = [...bottom].sort((a, b) => b - a);
  const avg = mean(bottom);
  let expected: number;
  if (/farqni/.test(q.stem)) expected = sorted[0]! - sorted[sorted.length - 1]!;
  else if (/yig'indisini/.test(q.stem)) expected = sorted[0]! + sorted[1]!;
  else if (/oylar sonini/.test(q.stem)) expected = bottom.filter((v) => v > avg).length;
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
  expectCount(q, expected);
};

CHECKS['cb-digit-numbers'] = (q) => {
  const digits = listChunk(q.stem);
  const len = numChunks(q.stem).find((x) => x === 3 || x === 4)!;
  const set = new Set(digits.map(String));
  let c = 0;
  for (let v = 10 ** (len - 1); v < 10 ** len; v++) {
    const s = String(v);
    if (new Set(s).size !== len || [...s].some((ch) => !set.has(ch))) continue;
    if (/ juft son/.test(q.stem) && v % 2 !== 0) continue;
    if (/5 ga bo'linadigan/.test(q.stem) && v % 5 !== 0) continue;
    c++;
  }
  expectCount(q, c);
};

function permutations<T>(xs: T[]): T[][] {
  const out: T[][] = [];
  const a = [...xs];
  const rec = (k: number): void => {
    if (k === a.length) {
      out.push([...a]);
      return;
    }
    for (let i = k; i < a.length; i++) {
      [a[k], a[i]] = [a[i]!, a[k]!];
      rec(k + 1);
      [a[k], a[i]] = [a[i]!, a[k]!];
    }
  };
  rec(0);
  return out;
}

CHECKS['cb-arrange-adjacent'] = (q) => {
  const [n] = numChunks(q.stem) as [number];
  const apart = /yonma-yon emas/.test(q.stem);
  let c = 0;
  for (const perm of permutations(Array.from({ length: n }, (_, i) => i))) {
    const d = Math.abs(perm.indexOf(0) - perm.indexOf(1));
    if (apart ? d > 1 : d === 1) c++;
  }
  expectCount(q, c);
};

CHECKS['cb-committee'] = (q) => {
  const [m, w, k, j] = numChunks(q.stem) as [number, number, number, number | undefined];
  const tot = m + w;
  let c = 0;
  for (let mask = 0; mask < 1 << tot; mask++) {
    let bits = 0;
    let women = 0;
    for (let i = 0; i < tot; i++)
      if (mask & (1 << i)) {
        bits++;
        if (i >= m) women++;
      }
    if (bits !== k) continue;
    if (/kamida bitta qiz/.test(q.stem) ? women >= 1 : women === j) c++;
  }
  expectCount(q, c);
};

CHECKS['cb-circular'] = (q) => {
  const [n] = numChunks(q.stem) as [number];
  const together = /yonma-yon/.test(q.stem);
  let c = 0;
  for (const rest of permutations(Array.from({ length: n - 1 }, (_, i) => i + 1))) {
    const seat = [0, ...rest]; // 0-chi kishi 0-o'rinda mahkamlangan
    if (!together) {
      c++;
      continue;
    }
    const d = Math.abs(seat.indexOf(1) - seat.indexOf(2));
    if (d === 1 || d === n - 1) c++;
  }
  expectCount(q, c);
};

const WORD_CACHE = new Map<string, number>();
function distinctArrangements(word: string): number {
  const hit = WORD_CACHE.get(word);
  if (hit !== undefined) return hit;
  const cnt = new Map<string, number>();
  for (const ch of word) cnt.set(ch, (cnt.get(ch) ?? 0) + 1);
  const keys = [...cnt.keys()];
  const rec = (left: number): number => {
    if (left === 0) return 1;
    let t = 0;
    for (const k of keys) {
      const v = cnt.get(k)!;
      if (v === 0) continue;
      cnt.set(k, v - 1);
      t += rec(left - 1);
      cnt.set(k, v);
    }
    return t;
  };
  const r = rec(word.length);
  WORD_CACHE.set(word, r);
  return r;
}
CHECKS['cb-letter-perm'] = (q) => {
  const word = /«([^»]+)»/.exec(q.stem)![1]!;
  expectCount(q, distinctArrangements(word));
};

/** (ax+b)^n ko'phadining koeffitsiyentlari (ko'phadlarni ketma-ket ko'paytirish) */
function expandBinom(a: number, b: number, n: number): number[] {
  let poly = [1];
  for (let i = 0; i < n; i++) {
    const next = Array.from({ length: poly.length + 1 }, () => 0);
    poly.forEach((c, k) => {
      next[k] += c * b;
      next[k + 1] += c * a;
    });
    poly = next;
  }
  return poly;
}
const parseBase = (stem: string): { a: number; b: number; n: number } => {
  const m = /\((\d*)x([+-])(\d+)\)\^\{(\d+)\}/.exec(stem)!;
  return { a: m[1] === '' ? 1 : Number(m[1]), b: (m[2] === '-' ? -1 : 1) * Number(m[3]), n: Number(m[4]) };
};

CHECKS['cb-binomial-coef'] = (q) => {
  const { a, b, n } = parseBase(q.stem);
  const k = Number(/x\^\{(\d+)\}\$ oldidagi/.exec(q.stem)![1]);
  expectCount(q, expandBinom(a, b, n)[k]!);
};

CHECKS['cb-binomial-o'] = (q) => {
  const { a, b, n } = parseBase(q.stem);
  const poly = expandBinom(a, b, n);
  expectKey(q, 'a', poly.reduce((s, x) => s + x, 0));
  const k = Number(/x\^\{(\d+)\}/.exec(q.parts!.b!.prompt_md)![1]);
  expectKey(q, 'b', poly[k]!);
};

CHECKS['pr-two-dice'] = (q) => {
  const v = (re: RegExp): number => Number(re.exec(q.stem)![1]);
  let ok: (a: number, b: number) => boolean;
  if (/yig'indisi \$\d+\$ ga teng/.test(q.stem)) ok = (a, b) => a + b === v(/yig'indisi \$(\d+)\$ ga teng/);
  else if (/yig'indisi kamida/.test(q.stem)) ok = (a, b) => a + b >= v(/kamida \$(\d+)\$/);
  else if (/ko'paytmasi juft/.test(q.stem)) ok = (a, b) => (a * b) % 2 === 0;
  else if (/ko'paytmasi \$\d+\$ ga teng/.test(q.stem)) ok = (a, b) => a * b === v(/ko'paytmasi \$(\d+)\$ ga teng/);
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
  let c = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (ok(a, b)) c++;
  expectVal(q, c / 36);
};

CHECKS['pr-balls-two'] = (q) => {
  const [r, b] = numChunks(q.stem) as [number, number];
  const balls = [...Array.from({ length: r }, () => 'R'), ...Array.from({ length: b }, () => 'B')];
  let fav = 0;
  let tot = 0;
  for (let i = 0; i < balls.length; i++)
    for (let j = i + 1; j < balls.length; j++) {
      tot++;
      const x = balls[i]!;
      const y = balls[j]!;
      if (/bir xil rangda/i.test(q.stem) ? x === y : /turli rangda/i.test(q.stem) ? x !== y : x === 'R' && y === 'R') fav++;
    }
  expectVal(q, fav / tot);
};

CHECKS['pr-shooters'] = (q) => {
  const [pa, pb] = mathChunks(q.stem).filter((c) => /^0\{,\}\d$/.test(c)).map((c) => Number(c.replace('{,}', '.'))) as [number, number];
  let p = 0;
  for (const ha of [true, false])
    for (const hb of [true, false]) {
      const pr = (ha ? pa : 1 - pa) * (hb ? pb : 1 - pb);
      const ok = /ikkalasi ham/i.test(q.stem) ? ha && hb : /kamida biri/i.test(q.stem) ? ha || hb : /faqat bittasi/i.test(q.stem) ? ha !== hb : !ha && !hb;
      if (ok) p += pr;
    }
  expectVal(q, p, 1e-9);
};

CHECKS['pr-total-prob'] = (q) => {
  const [share, pa, pb] = numChunks(q.stem) as [number, number, number];
  expectVal(q, (share / 100) * (pa / 100) + (1 - share / 100) * (pb / 100));
};

CHECKS['pr-coins-o'] = (q) => {
  const n = numChunks(q.stem)[0]!;
  const k = numChunks(q.parts!.a!.prompt_md)[0]!;
  let a = 0;
  let b = 0;
  for (let mask = 0; mask < 1 << n; mask++) {
    let heads = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) heads++;
    if (heads === k) a++;
    if (heads >= 1) b++;
  }
  expectKey(q, 'a', a / 2 ** n);
  expectKey(q, 'b', b / 2 ** n);
};

CHECKS['md-plans'] = (q) => {
  const [a0, a1, b0, b1] = numChunks(q.stem) as [number, number, number, number];
  let x = 0;
  while (!(b0 + b1 * x < a0 + a1 * x)) x++;
  expectCount(q, x);
};

CHECKS['md-quad-revenue'] = (q) => {
  const m = /q=(\d+)-(\d+)p/.exec(q.stem)!;
  const q0 = Number(m[1]);
  const k = Number(m[2]);
  let best = -Infinity;
  let bp = 0;
  for (let p = 0; p <= q0 / k; p += 0.5) {
    const r = p * (q0 - k * p);
    if (r > best) {
      best = r;
      bp = p;
    }
  }
  expectCount(q, /narxni/.test(q.stem) ? bp : best);
};

CHECKS['md-exp-growth'] = (q) => {
  const [T, a, b] = numChunks(q.stem) as [number, number, number];
  let expected: number;
  if (/necha soat kerak/.test(q.stem)) {
    // a boshlang'ich, b maqsad
    let n = a;
    let t = 0;
    while (n < b) {
      n *= 2;
      t += T;
    }
    expected = t;
  } else if (/qoladi/.test(q.stem)) {
    let n = a;
    for (let t = T; t <= b; t += T) n /= 2;
    expected = n;
  } else {
    let n = a;
    for (let t = T; t <= b; t += T) n *= 2;
    expected = n;
  }
  expectCount(q, expected);
};

CHECKS['md-trig-model'] = (q) => {
  const m = /h\(t\)=(\d+)\+(\d+)\\sin/.exec(q.stem)!;
  const C = Number(m[1]);
  const A = Number(m[2]);
  const tChunk = mathChunks(q.stem).find((c) => /^t=\d+$/.test(c));
  let expected: number;
  if (tChunk) expected = C + A * Math.sin((Math.PI * Number(tChunk.slice(2))) / 6);
  else if (/Eng katta balandlikni/.test(q.stem)) expected = C + A;
  else if (/ayirmasini/.test(q.stem)) expected = 2 * A;
  else throw new Error(`savol turi tanilmadi: ${q.stem}`);
  expectVal(q, expected, 1e-9);
};

CHECKS['md-compound'] = (q) => {
  const [P, r, n] = numChunks(q.stem) as [number, number, number];
  let amount = P;
  for (let i = 0; i < n; i++) amount += (amount * r) / 100;
  expectCount(q, /hisobdagi summa/.test(q.stem) ? amount : amount - P);
};

CHECKS['md-linear-o'] = (q) => {
  const [x1, y1, x2, y2] = numChunks(q.stem) as [number, number, number, number];
  const x3 = numChunks(q.parts!.b!.prompt_md)[0]!;
  const slope = (y2 - y1) / (x2 - x1);
  expectKey(q, 'a', slope);
  expectKey(q, 'b', y1 + slope * (x3 - x1));
};

describe("qo'shimcha shablonlar: 5-bo'lim (mustaqil matematik tekshiruv)", () => {
  it('har shablon uchun tekshiruv bor', () => {
    expect(SETS_DATA_TEMPLATES.map((t) => t.id).filter((id) => !CHECKS[id])).toEqual([]);
    expect(Object.keys(CHECKS).filter((id) => !TPL.has(id))).toEqual([]);
  });

  for (const t of SETS_DATA_TEMPLATES) {
    it(`${t.id} (mavzu ${t.topic}, ${t.type}/${t.difficulty})`, () => {
      for (const seed of SEEDS) CHECKS[t.id]!(load(t.id, seed));
    });
  }

  it('umumiy sifat (KaTeX, 4 til, import sxemasi)', () => {
    expect(SETS_DATA_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS)).slice(0, 10)).toEqual([]);
  });
});
