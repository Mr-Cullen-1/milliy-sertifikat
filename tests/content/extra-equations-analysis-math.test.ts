import { describe, expect, it } from 'vitest';
import { buildExtraQuestion, questionSignature } from '../../content/gen/extra/build';
import { EQUATIONS_ANALYSIS_TEMPLATES, equationsAnalysisParams } from '../../content/gen/extra/equations-analysis';
import type { ExtraTemplate } from '../../content/gen/extra/types';
import { LANGS } from '../../content/gen/types';
import { checkExtraTemplate } from './extra-harness';

// Mustaqil matematik tekshiruv: shablon kodidan NOMUSTAQIL. Javob testda boshqa usul bilan qayta hisoblanadi:
// matnda CHIQARILGAN formulani (TeX) sonli ifodaga aylantirib, sonli ildiz izlash (belgi almashishi + bisektsiya),
// markaziy farq bilan hosila, sonli integrallash, butun sonlar bo'yicha sanash va aniq arifmetika orqali.
// Javob kaliti (y1: to'g'ri variant; o: kalit shakllari) va chalg'ituvchilar (to'g'ri javobga teng emasligi) tekshiriladi.

const SEEDS = Array.from({ length: 40 }, (_, i) => i);
const REL = 1e-9;

// ---------------------------------------------------------------------------------------------
// TeX -> sonli funksiya (testlar uchun mini-tarjimon; faqat shablonlarda uchraydigan konstruktsiyalar)
// ---------------------------------------------------------------------------------------------

type NumFn = (...a: number[]) => number;

function texToJs(tex: string): string {
  let t = tex.replace(/\\[,;! ]/g, '').replace(/\s+/g, '');
  t = t.replace(/\\left\|/g, '⟨').replace(/\\right\|/g, '⟩').replace(/\\left|\\right/g, '');
  t = t.replace(/\{,\}/g, '.');
  t = t.replace(/\\cdot/g, '*').replace(/\\pi/g, 'PI').replace(/\\times/g, '*');
  for (let i = 0; i < 30; i++) {
    const before = t;
    t = t
      .replace(/\^\{([^{}]*)\}/g, '**($1)')
      .replace(/\^(\d)/g, '**$1')
      .replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'SQRT($1)')
      .replace(/\\log_\{([^{}]*)\}\(/g, 'LOG($1,')
      .replace(/\\ln\(/g, 'LN(')
      .replace(/\\(sin|cos|tan)\(/g, (_, f: string) => `${f.toUpperCase()}(`);
    if (t === before) break;
  }
  let out = '';
  for (const ch of t) {
    if (ch === '⟨') out += 'ABS(';
    else if (ch === '⟩') out += ')';
    else if (ch === '|') out += out === '' || /[+\-*/(=,]$/.test(out) ? 'ABS(' : ')';
    else out += ch;
  }
  out = out.replace(/(\d|\)|[a-z])(?=[a-zA-Z(])/g, '$1*');
  out = out.replace(/(^|[(*/,])-/g, '$1(-1)*');
  return out;
}

const HELPERS = ['SQRT', 'ABS', 'LOG', 'LN', 'SIN', 'COS', 'TAN', 'PI'] as const;
const helperValues = [Math.sqrt, Math.abs, (b: number, v: number) => Math.log(v) / Math.log(b), Math.log, Math.sin, Math.cos, Math.tan, Math.PI];

export function texFn(tex: string, vars: readonly string[] = ['x']): NumFn {
  const js = texToJs(tex);
  const f = new Function(...vars, ...HELPERS, `return (${js});`) as (...a: unknown[]) => number;
  return (...a: number[]) => f(...a, ...helperValues);
}

/** Matndagi $...$ qismlar */
const mathChunks = (md: string): string[] => [...md.matchAll(/\$([^$\n]+?)\$/g)].map((m) => m[1]!);
const firstEq = (md: string): string => {
  const c = mathChunks(md).find((s) => s.includes('=') && !/^[A-Za-z]\(/.test(s));
  if (!c) throw new Error(`tenglama topilmadi: ${md.slice(0, 80)}`);
  return c;
};
const sides = (eq: string): [string, string] => {
  const i = eq.indexOf('=');
  return [eq.slice(0, i), eq.slice(i + 1)];
};

/** Chiqarilgan tenglamaning ([lo, hi] dagi) barcha haqiqiy ildizlari: belgi almashishi + bisektsiya, ildiz tekshiruvi nisbiy xato bilan. */
function eqRoots(eq: string, lo = -60, hi = 60, step = 0.001, minMag = 0): number[] {
  const [l, r] = sides(eq);
  const L = texFn(l);
  const R = texFn(r);
  const g = (x: number) => L(x) - R(x);
  const good = (x: number) => {
    const a = L(x);
    const b = R(x);
    return Math.abs(a) + Math.abs(b) >= minMag && Math.abs(a - b) <= 1e-7 * (Math.abs(a) + Math.abs(b)) + (minMag > 0 ? 0 : 1e-9);
  };
  const out: number[] = [];
  let px = NaN;
  let pv = NaN;
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    const v = g(x);
    if (!Number.isFinite(v)) {
      pv = NaN;
      continue;
    }
    if (good(x)) {
      out.push(x);
    } else if (Number.isFinite(pv) && v * pv < 0) {
      let a = px;
      let b = x;
      let fa = pv;
      for (let k = 0; k < 90; k++) {
        const m = (a + b) / 2;
        const fm = g(m);
        if (!Number.isFinite(fm)) break;
        if (fm * fa <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      const root = (a + b) / 2;
      if (good(root)) out.push(root);
    }
    px = x;
    pv = v;
  }
  out.sort((p, q) => p - q);
  return out.filter((x, i) => i === 0 || Math.abs(x - out[i - 1]!) > 1e-5);
}

// ---------------------------------------------------------------------------------------------
// Javob tekshiruvi
// ---------------------------------------------------------------------------------------------

/** Variant yoki kalit matnini songa aylantiradi ($...$, kasr, ildiz, pi). */
const numOf = (text: string): number => texFn(text.trim().replace(/^\$|\$$/g, ''), [])();
const keyNum = (form: string): number => {
  const m = /^(-?\d+)\/(\d+)$/.exec(form);
  return m ? Number(m[1]) / Number(m[2]) : Number(form);
};
const near = (a: number, b: number, eps = REL): boolean => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

interface Ctx {
  id: string;
  seed: number;
  p: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  stem: string;
  /** uz tilidagi payload (o: bandlar matni uchun) */
  payload: unknown;
  /** y1 uchun: to'g'ri variant matni va hammasi */
  correct?: string;
  options?: Record<string, string>;
  keys?: { a: string[]; b?: string[] };
  /** y1: to'g'ri javob songa teng; boshqa variantlar (son bo'lsa) teng emas */
  num(expected: number, eps?: number): void;
  /** y1: to'g'ri javob matni aynan shu (TeX, $ larsiz); boshqa variantlar boshqacha */
  text(expected: string): void;
  /** o: a/b kalit shakllari shu songa teng */
  key(part: 'a' | 'b', expected: number, eps?: number): void;
}

function makeCtx(tpl: ExtraTemplate, seed: number): Ctx {
  const spec = tpl.generate(seed);
  const c = spec.content('uz');
  const p = equationsAnalysisParams(tpl.id, seed);
  const ctx: Ctx = {
    id: tpl.id,
    seed,
    p,
    stem: c.stem_md,
    payload: c.payload,
    num: () => undefined,
    text: () => undefined,
    key: () => undefined,
  };
  const at = `${tpl.id}#${seed}`;
  if (tpl.type === 'y1') {
    const payload = c.payload as { options: Record<string, string> };
    const letter = (spec.key as { correct: string }).correct;
    ctx.options = payload.options;
    ctx.correct = payload.options[letter]!;
    ctx.num = (expected, eps = REL) => {
      const got = numOf(ctx.correct!);
      expect(near(got, expected, eps), `${at}: to'g'ri variant ${ctx.correct} = ${got}, kutilgan ${expected}`).toBe(true);
      for (const [l, t] of Object.entries(payload.options)) {
        if (l === letter) continue;
        let v: number;
        try {
          v = numOf(t);
        } catch {
          continue;
        }
        expect(near(v, expected, eps), `${at}: chalg'ituvchi ${l} (${t}) to'g'ri javobga teng`).toBe(false);
      }
    };
    ctx.text = (expected) => {
      const norm = (s: string) => s.trim().replace(/^\$|\$$/g, '').replace(/\s+/g, '');
      expect(norm(ctx.correct!), `${at}: to'g'ri variant`).toBe(norm(expected));
      for (const [l, t] of Object.entries(payload.options)) if (l !== letter) expect(norm(t), `${at}: chalg'ituvchi ${l}`).not.toBe(norm(expected));
    };
  } else {
    const key = spec.key as { a: string[]; b?: string[] };
    ctx.keys = key;
    ctx.key = (part, expected, eps = REL) => {
      const forms = key[part];
      expect(forms, `${at}: ${part}) kalit yo'q`).toBeDefined();
      for (const f of forms!) expect(near(keyNum(f), expected, eps), `${at}: ${part}) kalit "${f}" != ${expected}`).toBe(true);
    };
  }
  return ctx;
}

const CHECKS: Record<string, (c: Ctx) => void> = {};

// ---------------------------------------------------------------------------------------------
// 3.1 Tenglamalar
// ---------------------------------------------------------------------------------------------

/** Chiqarilgan tenglamaning yagona ildizi */
CHECKS['eq-lin-frac'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -80, 80, 0.01);
  expect(r.length).toBe(1);
  c.num(r[0]!, 1e-6);
};

CHECKS['eq-viet-min'] = (c) => {
  const { a, k, c: cc, ask } = c.p as { a: number; k: number; c: number; ask: 'm' | 'min' };
  // chiqarilgan tenglama p bilan mos
  const g = texFn(sides(firstEq(c.stem))[0], ['x', 'm']);
  for (const [x, m] of [[1, 2], [-2, 3], [0.5, -1.5]] as const) expect(near(g(x, m), x * x - (m + a) * x + (k * m + cc), 1e-9)).toBe(true);
  let best = Infinity;
  let bestM = NaN;
  for (let i = -240; i <= 240; i++) {
    const m = i / 4;
    const b = m + a;
    const d = b * b - 4 * (k * m + cc);
    if (d < 0) continue;
    const x1 = (b + Math.sqrt(d)) / 2;
    const x2 = (b - Math.sqrt(d)) / 2;
    const s = x1 * x1 + x2 * x2;
    if (s < best - 1e-12) {
      best = s;
      bestM = m;
    }
  }
  c.num(ask === 'm' ? bestM : best, 1e-9);
};

CHECKS['eq-disc-count'] = (c) => {
  const { t, w, n, kind } = c.p as { t: number; w: number; n: number; kind: 'two' | 'none' | 'any' };
  const g = texFn(sides(firstEq(c.stem))[0], ['x', 'm']);
  for (const [x, m] of [[1, 2], [-2, 3], [0.5, -1.5]] as const) expect(near(g(x, m), x * x - 2 * m * x + t * m + w, 1e-9)).toBe(true);
  let cnt = 0;
  for (let m = -n; m <= n; m++) {
    const d = (2 * m) ** 2 - 4 * (t * m + w);
    if (kind === 'two' ? d > 0 : kind === 'none' ? d < 0 : d >= 0) cnt++;
  }
  c.num(cnt);
};

CHECKS['eq-frac-cancel'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -60, 60, 0.001);
  expect(r.length).toBeGreaterThanOrEqual(1);
  c.num(r.reduce((s, x) => s + x, 0), 1e-6);
};

CHECKS['eq-abs-linear'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -200, 200, 0.001);
  expect(r.length).toBeGreaterThanOrEqual(1);
  c.num(r.reduce((s, x) => s + x, 0), 1e-6);
};

CHECKS['eq-abs-nested'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -60, 60, 0.001);
  c.num(r.reduce((s, x) => s * x, 1), 1e-6);
};

CHECKS['eq-irr-two'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -60, 60, 0.001);
  expect(r.length).toBe(1);
  c.num(r[0]!, 1e-6);
};

CHECKS['eq-irr-sub'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -60, 60, 0.0005);
  expect(r.length).toBe(2);
  c.num(r[0]! * r[1]!, 1e-5);
};

CHECKS['eq-sys-lin2'] = (c) => {
  const m = /\\begin\{cases\}(.*?)\\\\(.*?)\\end\{cases\}/.exec(firstSys(c.stem))!;
  const e1 = [sides(m[1]!)[0], sides(m[1]!)[1]];
  const e2 = [sides(m[2]!)[0], sides(m[2]!)[1]];
  const f1 = [texFn(e1[0]!, ['x', 'y']), texFn(e1[1]!, ['x', 'y'])];
  const f2 = [texFn(e2[0]!, ['x', 'y']), texFn(e2[1]!, ['x', 'y'])];
  const sols: [number, number][] = [];
  for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) if (f1[0]!(x, y) === f1[1]!(x, y) && f2[0]!(x, y) === f2[1]!(x, y)) sols.push([x, y]);
  expect(sols.length).toBe(1);
  const [x, y] = sols[0]!;
  const qty = /\$(x\+y|x-y|xy)\$/.exec(c.stem.replace(/\\begin\{cases\}.*?\\end\{cases\}/, ''))![1]!;
  c.num(qty === 'x+y' ? x + y : qty === 'x-y' ? x - y : x * y);
};

CHECKS['eq-exp-same'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -30, 30, 0.001, 1e-200);
  expect(r.length).toBe(1);
  c.num(r[0]!, 1e-6);
};

CHECKS['eq-exp-factor'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -20, 20, 0.001, 1e-200);
  expect(r.length).toBe(1);
  c.num(r[0]!, 1e-6);
};

CHECKS['eq-log-domain'] = (c) => {
  const r = eqRoots(firstEq(c.stem), -40, 120, 0.001);
  expect(r.length).toBeGreaterThanOrEqual(1);
  expect(r.length).toBe(1);
  c.num(r[0]!, 1e-6);
};

const TRIG_VALS = [0.5, -0.5, Math.SQRT1_2, -Math.SQRT1_2, Math.sqrt(3) / 2, -Math.sqrt(3) / 2];
CHECKS['eq-trig-count'] = (c) => {
  const eq = firstEq(c.stem);
  const m = /^\\(sin|cos)\\,(\d*)x=(.+)$/.exec(eq)!;
  const fn = m[1] === 'sin' ? Math.sin : Math.cos;
  const k = m[2] === '' ? 1 : Number(m[2]);
  const val = texFn(m[3]!, [])();
  expect(TRIG_VALS.some((v) => near(v, val, 1e-12))).toBe(true);
  const seg = /\[0;\\ (\d*)\\pi\]/.exec(c.stem)!;
  const n = seg[1] === '' ? 1 : Number(seg[1]);
  const N = 200000;
  let cnt = 0;
  let prev = fn(k * 1e-9) - val;
  for (let i = 1; i <= N; i++) {
    const x = (n * Math.PI * (i + 0.37)) / (N + 1);
    const v = fn(k * x) - val;
    if (v * prev < 0) cnt++;
    prev = v;
  }
  c.num(cnt);
};

CHECKS['eq-param-none'] = (c) => {
  const { s1, p1, s2, p2 } = c.p as { s1: number; p1: number; s2: number; p2: number };
  const [l, r] = sides(firstEq(c.stem));
  const L = texFn(l.replace(/^\(|\)(?=x$)/g, '').replace(/x$/, ''), ['m']);
  const R = texFn(r, ['m']);
  for (const m of [-3, 0, 2, 5]) {
    expect(near(L(m), m * m - s1 * m + p1)).toBe(true);
    expect(near(R(m), m * m - s2 * m + p2)).toBe(true);
  }
  const none: number[] = [];
  const inf: number[] = [];
  for (let m = -40; m <= 40; m++) {
    const A = L(m);
    const B = R(m);
    if (A === 0 && B !== 0) none.push(m);
    if (A === 0 && B === 0) inf.push(m);
  }
  expect(none.length).toBe(1);
  expect(inf.length).toBe(1);
  c.key('a', none[0]!);
  c.key('b', inf[0]!);
};

CHECKS['eq-line-circle'] = (c) => {
  const m = /\\begin\{cases\}(.*?)\\\\(.*?)\\end\{cases\}/.exec(firstSys(c.stem))!;
  const f = [m[1]!, m[2]!].map((e) => sides(e)).map(([l, r]) => [texFn(l, ['x', 'y']), texFn(r, ['x', 'y'])] as const);
  const sols: [number, number][] = [];
  for (let x = -40; x <= 40; x++) for (let y = -60; y <= 60; y++) if (f.every(([L, R]) => near(L(x, y), R(x, y), 1e-12))) sols.push([x, y]);
  expect(sols.length).toBe(2);
  c.key('a', sols[0]![0] + sols[1]![0]);
  c.key('b', Math.max(sols[0]![1], sols[1]![1]));
};

/** Sistema matni: $\begin{cases}...\end{cases}$ ni o'z ichiga olgan bo'lak */
function firstSys(md: string): string {
  const c = mathChunks(md).find((s) => s.includes('\\begin{cases}'));
  if (!c) throw new Error('sistema topilmadi');
  return c;
}

// ---------------------------------------------------------------------------------------------
// Tengsizliklar: chiqarilgan matndan predikat, butun sonlar bo'yicha sanash, oraliqlar yozuvi
// ---------------------------------------------------------------------------------------------

const RELRE = /\\le(?![a-z])|\\ge(?![a-z])|<|>/;
type Pred = (...a: number[]) => boolean;
/** "L rel R" ko'rinishidagi bitta tengsizlikdan predikat (sonli xato 1e-9; cheksiz/NaN — yolg'on) */
function ineqPred(tex: string, vars: readonly string[] = ['x']): Pred {
  const m = RELRE.exec(tex);
  if (!m) throw new Error(`munosabat topilmadi: ${tex}`);
  const L = texFn(tex.slice(0, m.index), vars);
  const R = texFn(tex.slice(m.index + m[0].length), vars);
  const rel = m[0];
  return (...a) => {
    const v = L(...a) - R(...a);
    if (!Number.isFinite(v)) return false;
    return rel === '<' ? v < -1e-9 : rel === '>' ? v > 1e-9 : rel === '\\le' ? v <= 1e-9 : v >= -1e-9;
  };
}
/** $\begin{cases}A\\B\end{cases}$ dagi har bir qator predikati; qator bo'lmasa butun matn bitta tengsizlik */
function systemPred(chunk: string, vars: readonly string[] = ['x']): Pred {
  const m = /\\begin\{cases\}(.*)\\end\{cases\}/.exec(chunk);
  const lines = m ? m[1]!.split('\\\\') : [chunk];
  const ps = lines.map((l) => ineqPred(l, vars));
  return (...a) => ps.every((p) => p(...a));
}
const sysChunk = (md: string): string => {
  const c = mathChunks(md).find((s) => s.includes('\\begin{cases}'));
  if (!c) throw new Error('sistema topilmadi');
  return c;
};
const firstIneq = (md: string): string => {
  const c = mathChunks(md).find((s) => RELRE.test(s));
  if (!c) throw new Error(`tengsizlik topilmadi: ${md.slice(0, 80)}`);
  return c;
};
const intsWhere = (pred: Pred, lo: number, hi: number): number[] => {
  const out: number[] = [];
  for (let x = lo; x <= hi; x++) if (pred(x)) out.push(x);
  return out;
};
const sumOf = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);

/** Yechim to'plamining oraliq yozuvi (kvartal to'r: oxirlar butun sonlar) */
function setTexOf(pred: (x: number) => boolean, lo = -30, hi = 30): string {
  const pts: number[] = [];
  for (let i = lo * 4; i <= hi * 4; i++) pts.push(i / 4);
  const t = pts.map(pred);
  const parts: string[] = [];
  let i = 0;
  while (i < pts.length) {
    if (!t[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < pts.length && t[j + 1]) j++;
    const a = pts[i]!;
    const b = pts[j]!;
    const left = Number.isInteger(a) ? a : a - 0.25;
    const right = Number.isInteger(b) ? b : b + 0.25;
    if (i === j && Number.isInteger(a)) parts.push(`\\{${a}\\}`);
    else parts.push(`${i === 0 ? '(-\\infty' : `${Number.isInteger(a) ? '[' : '('}${left}`};\\ ${j === pts.length - 1 ? '+\\infty)' : `${right}${Number.isInteger(b) ? ']' : ')'}`}`);
    i = j + 1;
  }
  return parts.join('\\cup ');
}

/** Hududning yuzi: [-12;12]^2 da nuqtalar to'ri (qadam 0.05, chegara bilan mos tushmaydigan siljish) */
function gridArea(pred: Pred, box = 12, h = 0.05): number {
  let n = 0;
  const steps = Math.round((2 * box) / h);
  for (let i = 0; i < steps; i++) {
    const x = -box + (i + 0.3137) * h;
    for (let j = 0; j < steps; j++) if (pred(x, -box + (j + 0.7311) * h)) n++;
  }
  return n * h * h;
}

/** g(x) funksiyasining [lo,hi] dagi nollari soni: belgi almashishi va to'rdagi aniq nollar */
function countRoots(g: (x: number) => number, lo: number, hi: number, step: number): number {
  let cnt = 0;
  let prev = NaN;
  const n = Math.round((hi - lo) / step);
  for (let i = 0; i <= n; i++) {
    const v = g(lo + i * step);
    if (!Number.isFinite(v)) {
      prev = NaN;
      continue;
    }
    if (Math.abs(v) < 1e-9) {
      cnt++;
      prev = NaN;
      continue;
    }
    if (Number.isFinite(prev) && prev * v < 0) cnt++;
    prev = v;
  }
  return cnt;
}

// ---------------------------------------------------------------------------------------------
// 3.2 Tengsizliklar
// ---------------------------------------------------------------------------------------------

CHECKS['ineq-sys-lin'] = (c) => {
  const sols = intsWhere(systemPred(sysChunk(c.stem)), -100, 100);
  c.num(/nechta/.test(c.stem) ? sols.length : sumOf(sols));
};

CHECKS['ineq-quad-all'] = (c) => {
  const chunk = firstIneq(c.stem);
  const m = RELRE.exec(chunk)!;
  const f = texFn(chunk.slice(0, m.index), ['x', 'm']);
  const strict = m[0] === '>';
  const a = (f(1, 0) + f(-1, 0)) / 2 - f(0, 0);
  const k = f(0, 0);
  expect(a).toBeGreaterThan(0);
  let cnt = 0;
  for (let mm = -80; mm <= 80; mm++) {
    const v = f(-mm / (2 * a), mm);
    if (strict ? v > 1e-9 : v >= -1e-9) cnt++;
  }
  expect(k).toBeGreaterThan(0);
  c.num(cnt);
};

CHECKS['ineq-frac'] = (c) => {
  c.num(intsWhere(ineqPred(firstIneq(c.stem)), -60, 60).length);
};

CHECKS['ineq-abs-two'] = (c) => {
  c.num(intsWhere(ineqPred(firstIneq(c.stem)), -100, 100).length);
};

CHECKS['ineq-irr'] = (c) => {
  const sols = intsWhere(ineqPred(firstIneq(c.stem)), -100, 300);
  c.num(/nechta/.test(c.stem) ? sols.length : /yig'indisini/.test(c.stem) ? sumOf(sols) : Math.max(...sols));
};

CHECKS['ineq-exp'] = (c) => {
  const sols = intsWhere(ineqPred(firstIneq(c.stem)), -60, 60);
  c.num(/nechta/.test(c.stem) ? sols.length : sumOf(sols));
};

CHECKS['ineq-log'] = (c) => {
  const sols = intsWhere(ineqPred(firstIneq(c.stem)), -60, 400);
  c.num(/nechta/.test(c.stem) ? sols.length : /yig'indisini/.test(c.stem) ? sumOf(sols) : Math.min(...sols));
};

CHECKS['ineq-trig-len'] = (c) => {
  const chunk = firstIneq(c.stem);
  const m = /^\\(sin|cos)\\,x(>|<)(.+)$/.exec(chunk)!;
  const fn = m[1] === 'sin' ? Math.sin : Math.cos;
  const val = texFn(m[3]!, [])();
  const N = 2_000_000;
  let cnt = 0;
  for (let i = 0; i < N; i++) {
    const v = fn(((i + 0.5) * 2 * Math.PI) / N) - val;
    if (m[2] === '>' ? v > 0 : v < 0) cnt++;
  }
  c.num((cnt * 2 * Math.PI) / N, 1e-4);
};

CHECKS['ineq-cubic-union'] = (c) => {
  const pred = ineqPred(firstIneq(c.stem));
  c.text(setTexOf((x) => pred(x)));
};

CHECKS['ineq-o-abs'] = (c) => {
  const sols = intsWhere(ineqPred(firstIneq(c.stem)), -200, 200);
  c.key('a', Math.min(...sols));
  c.key('b', Math.max(...sols));
};

CHECKS['ineq-o-quad-abs'] = (c) => {
  const sols = intsWhere(systemPred(sysChunk(c.stem)), -100, 100);
  c.key('a', sols.length);
  c.key('b', sumOf(sols));
};

CHECKS['sys2-tri-lattice'] = (c) => {
  const pred = systemPred(sysChunk(c.stem), ['x', 'y']);
  let cnt = 0;
  for (let x = -5; x <= 60; x++) for (let y = -5; y <= 60; y++) if (pred(x, y)) cnt++;
  c.num(cnt);
};

CHECKS['sys2-area'] = (c) => {
  const chunk = mathChunks(c.stem).find((s) => RELRE.test(s))!;
  c.num(gridArea(systemPred(chunk, ['x', 'y'])), 0.02);
};

CHECKS['sys2-lp'] = (c) => {
  const pred = systemPred(sysChunk(c.stem), ['x', 'y']);
  const fch = mathChunks(c.stem).find((s) => s.startsWith('F='))!;
  const F = texFn(fch.slice(2), ['x', 'y']);
  let best = -Infinity;
  for (let x = 0; x <= 60; x++) for (let y = 0; y <= 60; y++) if (pred(x, y)) best = Math.max(best, F(x, y));
  c.num(best);
};

CHECKS['sys2-diamond'] = (c) => {
  const pred = systemPred(firstIneq(c.stem), ['x', 'y']);
  let cnt = 0;
  for (let x = -30; x <= 30; x++) for (let y = -30; y <= 30; y++) if (pred(x, y)) cnt++;
  c.key('a', cnt);
  c.key('b', gridArea(pred), 0.01);
};

/** 109: grafik usul */
CHECKS['gr-abs-quad-count'] = (c) => {
  c.num(eqRoots(firstEq(c.stem), -30, 30, 0.001).length);
};

CHECKS['gr-abs-param'] = (c) => {
  const [l, r] = sides(firstEq(c.stem));
  const f = texFn(l, ['x']);
  let cnt = 0;
  for (let m = -3; m <= 40; m++) if (countRoots((x) => f(x) - m, -20, 20, 0.002) === 4) cnt++;
  expect(r).toBe('m');
  c.num(cnt);
};

CHECKS['gr-exp-line'] = (c) => {
  c.num(eqRoots(firstEq(c.stem), -40, 40, 0.001).length);
};

CHECKS['gr-cubic-param'] = (c) => {
  const [l] = sides(firstEq(c.stem));
  const f = texFn(l, ['x']);
  const c0 = f(0);
  let cnt = 0;
  for (let m = c0 - 40; m <= c0 + 40; m++) if (countRoots((x) => f(x) - m, -10, 10, 0.002) === 3) cnt++;
  c.num(cnt);
};

// ---------------------------------------------------------------------------------------------
// 4.1 Funksiyalar (va 121 funksional bog'liqlik). Javoblar chiqarilgan matndan (stem/jadval) mustaqil qayta hisoblanadi.
// ---------------------------------------------------------------------------------------------

const flat = (s: string): string => s.replace(/\\ /g, '').replace(/\s+/g, '');
const fnBody = (c: Ctx): string => mathChunks(c.stem)[0]!.replace(/^f\(x\)=/, '');

/** "(-\infty; -5]\cup [2; +\infty)" matnidagi oraliqlar birlashmasiga x kirishini aniqlaydi. */
function inUnion(text: string, x: number): boolean {
  const t = flat(text.trim().replace(/^\$|\$$/g, ''));
  return t.split('\\cup').some((iv) => {
    const m = /^([[(])(.+?);(.+?)([\])])$/.exec(iv);
    if (!m) throw new Error(`oraliq tahlil qilinmadi: ${iv}`);
    const bound = (s: string): number => (s.includes('\\infty') ? (s.startsWith('-') ? -Infinity : Infinity) : texFn(s, [])());
    const lo = bound(m[2]!);
    const hi = bound(m[3]!);
    return (m[1] === '[' ? x >= lo : x > lo) && (m[4] === ']' ? x <= hi : x < hi);
  });
}

/** to'g'ri variant to'plami pred bilan mos (0.25 qadamli to'rda), chalg'ituvchilar mos emas */
function checkSets(c: Ctx, pred: (x: number) => boolean, lo = -14, hi = 14): void {
  const xs: number[] = [];
  for (let x = lo; x <= hi + 1e-9; x += 0.25) xs.push(x);
  const agrees = (t: string) => xs.every((x) => inUnion(t, x) === pred(x));
  expect(agrees(c.correct!), `${c.id}#${c.seed}: to'g'ri variant ${c.correct}`).toBe(true);
  for (const t of Object.values(c.options!)) if (t !== c.correct) expect(agrees(t), `${c.id}#${c.seed}: chalg'ituvchi ${t} to'g'ri javobga teng`).toBe(false);
}

CHECKS['fn-domain-union'] = (c) => {
  const f = texFn(fnBody(c));
  checkSets(c, (x) => Number.isFinite(f(x)));
};

CHECKS['fn-log-domain'] = (c) => {
  const f = texFn(fnBody(c));
  checkSets(c, (x) => Number.isFinite(f(x)));
};

CHECKS['fn-parity-param'] = (c) => {
  const odd = /toq/.test(c.stem);
  const f = texFn(fnBody(c), ['x', 'm']);
  const ms: number[] = [];
  for (let i = -80; i <= 80; i++) {
    const m = i / 2;
    const ok = [0.5, 1, 2, 3.5].every((x) => (odd ? near(f(-x, m), -f(x, m), 1e-9) : near(f(-x, m), f(x, m), 1e-9)));
    if (ok) ms.push(m);
  }
  expect(ms.length, `${c.id}#${c.seed}: m yagona bo'lishi kerak: ${ms}`).toBe(1);
  c.num(ms[0]!);
};

CHECKS['fn-period-sum'] = (c) => {
  const f = texFn(fnBody(c));
  const pts = Array.from({ length: 40 }, (_, i) => 0.113 + 0.37 * i);
  let found = NaN;
  for (let k = 1; k <= 288 && Number.isNaN(found); k++) {
    const T = (k * Math.PI) / 12;
    const ok = pts.every((x) => {
      const a = f(x);
      const b = f(x + T);
      if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 1e5 || Math.abs(b) > 1e5) return true; // tan qutblari yaqinida o'tkazamiz
      return Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a));
    });
    if (ok) found = T;
  }
  expect(Number.isNaN(found), `${c.id}#${c.seed}: davr topilmadi`).toBe(false);
  c.num(found, 1e-9);
};

CHECKS['fn-mono-quad'] = (c) => {
  const dec = /kamay/.test(c.stem);
  const f = texFn(fnBody(c));
  const h = 1e-4;
  checkSets(c, (x) => {
    const d = (f(x + h) - f(x - h)) / (2 * h);
    return dec ? d <= 1e-6 : d >= -1e-6;
  }, -30, 30);
};

const stemPoints = (stem: string): [number, number][] => [...flat(stem).matchAll(/[A-Z]\((-?\d+);(-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const askedArg = (stem: string): number => {
  const m = [...mathChunks(stem)].map((s) => /^f\((-?\d+)\)$/.exec(s)).find(Boolean);
  if (!m) throw new Error('f(n) topilmadi');
  return Number(m[1]);
};

CHECKS['fn-linear-2pts'] = (c) => {
  const [[x1, y1], [x2, y2]] = stemPoints(c.stem) as [[number, number], [number, number]];
  const x3 = askedArg(c.stem);
  c.num(y1 + ((y2 - y1) / (x2 - x1)) * (x3 - x1), 1e-12);
};

CHECKS['fn-quad-3pts'] = (c) => {
  const pts = stemPoints(c.stem);
  expect(pts.length).toBe(3);
  const x = askedArg(c.stem);
  let v = 0;
  for (let i = 0; i < 3; i++) {
    let term = pts[i]![1];
    for (let j = 0; j < 3; j++) if (j !== i) term *= (x - pts[j]![0]) / (pts[i]![0] - pts[j]![0]);
    v += term;
  }
  c.num(v, 1e-9);
};

CHECKS['fn-quad-roots'] = (c) => {
  const f = texFn(fnBody(c));
  const a = (f(1) - 2 * f(0) + f(-1)) / 2;
  const b = (f(1) - f(-1)) / 2;
  const c0 = f(0);
  const disc = b * b - 4 * a * c0;
  expect(disc).toBeGreaterThan(0);
  const xv = -b / (2 * a);
  const val = /ordinata/.test(c.stem) ? f(xv) : /masofa/.test(c.stem) ? Math.sqrt(disc) / Math.abs(a) : /absissa/.test(c.stem) ? xv : NaN;
  expect(Number.isNaN(val), `${c.id}: savol turi aniqlanmadi`).toBe(false);
  c.num(val, 1e-9);
};

CHECKS['fn-power-compare'] = (c) => {
  const min = /kichik/.test(c.stem);
  const vals = Object.entries(c.options!).map(([, t]) => [t, numOf(t)] as const);
  const sorted = vals.map((v) => v[1]).sort((p, q) => p - q);
  const target = min ? sorted[0]! : sorted[3]!;
  expect(near(numOf(c.correct!), target, 1e-12), `${c.id}#${c.seed}: to'g'ri variant ${c.correct}`).toBe(true);
  for (let i = 1; i < 4; i++) expect(sorted[i]! - sorted[i - 1]!).toBeGreaterThan(1e-6 * sorted[i]!);
};

CHECKS['fn-exp-range'] = (c) => {
  const f = texFn(fnBody(c));
  const [lo, hi] = flat(mathChunks(c.stem)[1]!).replace(/^\[|\]$/g, '').split(';').map(Number) as [number, number];
  let best = /kichik/.test(c.stem) ? Infinity : -Infinity;
  const n = 4000;
  for (let i = 0; i <= n; i++) {
    const v = f(lo + ((hi - lo) * i) / n);
    best = /kichik/.test(c.stem) ? Math.min(best, v) : Math.max(best, v);
  }
  c.num(best, 1e-9);
};

const arcFn = { arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan } as const;
const trigFn = { sin: Math.sin, cos: Math.cos, tan: Math.tan } as const;
const numArg = (s: string): number => texFn(s, [])();

CHECKS['fn-invtrig-sum'] = (c) => {
  const s = mathChunks(c.stem)[0]!.replace(/\\left|\\right/g, '');
  const m = /^(2?)\\(arcsin|arccos|arctan)\((.+?)\)([+-])\\(arcsin|arccos|arctan)\((.+?)\)$/.exec(s.replace(/\s+/g, ''));
  expect(m, `${c.id}: ifoda tahlil qilinmadi: ${s}`).not.toBeNull();
  const k = m![1] === '2' ? 2 : 1;
  const A = arcFn[m![2] as keyof typeof arcFn](numArg(m![3]!));
  const B = arcFn[m![5] as keyof typeof arcFn](numArg(m![6]!));
  c.num(k * A + (m![4] === '+' ? 1 : -1) * B, 1e-12);
};

CHECKS['fn-invtrig-eval'] = (c) => {
  const s = mathChunks(c.stem)[0]!.replace(/\\left|\\right/g, '').replace(/\s+/g, '');
  const m = /^\\(sin|cos|tan)\((2?)\\(arcsin|arccos)\((.+)\)\)$/.exec(s);
  expect(m, `${c.id}: ifoda tahlil qilinmadi: ${s}`).not.toBeNull();
  const k = m![2] === '2' ? 2 : 1;
  c.num(trigFn[m![1] as keyof typeof trigFn](k * arcFn[m![3] as 'arcsin' | 'arccos'](numArg(m![4]!))), 1e-9);
};

CHECKS['fn-transform-point'] = (c) => {
  const ch = mathChunks(c.stem).map(flat);
  const pt = /^\((-?\d+);(-?\d+)\)$/.exec(ch[1]!)!;
  const g = /^g\(x\)=(-?\d*)f\((-?\d*)x([+-]\d+)?\)([+-]\d+)?$/.exec(ch[2]!);
  expect(g, `${c.id}: g(x) tahlil qilinmadi: ${ch[2]}`).not.toBeNull();
  const coef = (s: string): number => (s === '' ? 1 : s === '-' ? -1 : Number(s));
  const A = coef(g![1]!);
  const B = coef(g![2]!);
  const C = g![3] ? Number(g![3]) : 0;
  const D = g![4] ? Number(g![4]) : 0;
  const ex = (Number(pt[1]) - C) / B;
  const ey = A * Number(pt[2]) + D;
  const parse = (t: string): [number, number] => {
    const m = /^\((-?\d+(?:\.\d+)?);(-?\d+(?:\.\d+)?)\)$/.exec(flat(t.replace(/^\$|\$$/g, '')));
    if (!m) throw new Error(`nuqta tahlil qilinmadi: ${t}`);
    return [Number(m[1]), Number(m[2])];
  };
  const [cx, cy] = parse(c.correct!);
  expect([cx + 0, cy + 0], `${c.id}#${c.seed}: to'g'ri variant`).toEqual([ex + 0, ey + 0]);
  for (const t of Object.values(c.options!)) if (t !== c.correct) expect(parse(t).map((v) => v + 0), `${c.id}#${c.seed}: chalg'ituvchi ${t}`).not.toEqual([ex + 0, ey + 0]);
};

CHECKS['fn-compose-subst'] = (c) => {
  const ch = mathChunks(c.stem).map(flat);
  const m = /^f\((-?\d*)x([+-]\d+)\)=(.+)$/.exec(ch[0]!);
  expect(m, `${c.id}: shart tahlil qilinmadi: ${ch[0]}`).not.toBeNull();
  const a = m![1] === '' ? 1 : m![1] === '-' ? -1 : Number(m![1]);
  const b = Number(m![2]);
  const rhs = texFn(m![3]!);
  const t = Number(/^f\((-?\d+)\)$/.exec(ch[1]!)![1]);
  c.num(rhs((t - b) / a), 1e-9);
};

/** \lim_{x\to...}: ifoda qismini ajratadi */
const limBody = (c: Ctx): string => mathChunks(c.stem)[0]!.replace(/^\\lim_\{x\\to\+?\\infty\}/, '');

CHECKS['fn-limit-rat'] = (c) => {
  const f = texFn(limBody(c));
  c.num(f(1e9), 1e-6);
};

CHECKS['fn-limit-sqrt'] = (c) => {
  const f = texFn(limBody(c));
  // 1/x xatosini Richardson usuli bilan yo'qotamiz
  c.num(2 * f(2e5) - f(1e5), 1e-6);
};

CHECKS['fn-continuity'] = (c) => {
  const s = flat(mathChunks(c.stem)[0]!);
  const m = /\\frac\{(.*?)\}\{(x[^{}]*)\},&x\\ne(-?\d+)/.exec(s);
  expect(m, `${c.id}: kasr tahlil qilinmadi: ${s}`).not.toBeNull();
  const N = texFn(m![1]!);
  const D = texFn(m![2]!);
  const r = Number(m![3]);
  expect(Math.abs(D(r))).toBeLessThan(1e-12);
  expect(Math.abs(N(r))).toBeLessThan(1e-9);
  const h = 1e-5;
  const g = (x: number) => N(x) / D(x);
  const left = g(r - h);
  const right = g(r + h);
  expect(Math.abs(left - right), `${c.id}#${c.seed}: bir tomonli limitlar farq qiladi`).toBeLessThan(1e-3);
  c.num((left + right) / 2, 1e-4);
};

/** KaTeX array jadvali: birinchi qator x, ikkinchi qator y ("?" = null) */
function parseTable(stem: string): { xs: number[]; ys: (number | null)[] } {
  const m = /\\begin\{array\}\{[^}]*\}(.*?)\\end\{array\}/.exec(stem);
  expect(m, 'jadval topilmadi').not.toBeNull();
  const [r1, r2] = m![1]!.split(/\\\\\s*\\hline/);
  const cells = (r: string) => r.split('&').slice(1).map((s) => s.trim());
  return { xs: cells(r1!).map(Number), ys: cells(r2!).map((s) => (s === '?' ? null : Number(s))) };
}

CHECKS['fn-table-formula'] = (c) => {
  const { xs, ys } = parseTable(c.stem);
  const fits = (t: string): boolean => {
    const rhs = flat(t.replace(/^\$|\$$/g, '')).replace(/^y=/, '');
    const f = texFn(rhs);
    return xs.every((x, i) => near(f(x), ys[i]!, 1e-9));
  };
  expect(fits(c.correct!), `${c.id}#${c.seed}: to'g'ri variant jadvalga mos emas`).toBe(true);
  for (const t of Object.values(c.options!)) if (t !== c.correct) expect(fits(t), `${c.id}#${c.seed}: chalg'ituvchi ${t} jadvalga mos`).toBe(false);
};

CHECKS['fn-table-missing'] = (c) => {
  const { xs, ys } = parseTable(c.stem);
  const known = xs.map((x, i) => [x, ys[i]] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const hole = xs.filter((_, i) => ys[i] === null);
  expect(hole.length).toBe(1);
  const [[xa, ya], [xb, yb]] = known as [readonly [number, number], readonly [number, number]];
  const k = (yb - ya) / (xb - xa);
  for (const [x, y] of known) expect(near(ya + k * (x - xa), y, 1e-9), `${c.id}#${c.seed}: jadval chiziqli emas`).toBe(true);
  c.num(ya + k * (hole[0]! - xa), 1e-9);
};

/** Kvadrat bog'liqlik: ma'lum nuqtalardan Lagranj interpolyatsiyasi (3 ta nuqta), qolganlari mos kelishi shart */
function lagrange(pts: readonly (readonly [number, number])[], x: number): number {
  let v = 0;
  for (let i = 0; i < pts.length; i++) {
    let term = pts[i]![1];
    for (let j = 0; j < pts.length; j++) if (j !== i) term *= (x - pts[j]![0]) / (pts[i]![0] - pts[j]![0]);
    v += term;
  }
  return v;
}

CHECKS['fn-table-quad'] = (c) => {
  const { xs, ys } = parseTable(c.stem);
  const known = xs.map((x, i) => [x, ys[i]] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  const hole = xs.filter((_, i) => ys[i] === null);
  expect(hole.length).toBe(1);
  const three = known.slice(0, 3);
  for (const [x, y] of known.slice(3)) expect(near(lagrange(three, x), y, 1e-9), `${c.id}#${c.seed}: jadval kvadrat emas`).toBe(true);
  c.num(lagrange(three, hole[0]!), 1e-9);
};

CHECKS['fn-word-model'] = (c) => {
  const s = mathChunks(c.stem).find((q) => q.startsWith('S(x)='))!;
  const m = /S\(x\)=\\begin\{cases\}(.+?),\s*&\s*0\\le x\\le (\d+)\\\\\s*(.+?),\s*&\s*x>(\d+)\\end\{cases\}/.exec(s);
  expect(m, `${c.id}: bo'lakli formula tahlil qilinmadi: ${s}`).not.toBeNull();
  const f1 = texFn(m![1]!);
  const T = Number(m![2]);
  const f2 = texFn(m![3]!);
  expect(Number(m![4])).toBe(T);
  expect(near(f1(T), f2(T), 1e-12), `${c.id}#${c.seed}: tarmoqlar T da ulanmaydi`).toBe(true);
  const d = Number(/\$(\d+)\$ km/.exec(c.stem)![1]);
  c.num(d <= T ? f1(d) : f2(d), 1e-12);
};

CHECKS['fn-table-o'] = (c) => {
  const { xs, ys } = parseTable(c.stem);
  const pts = xs.map((x, i) => [x, ys[i]!] as const);
  const three = pts.slice(0, 3);
  for (const [x, y] of pts.slice(3)) expect(near(lagrange(three, x), y, 1e-9), `${c.id}#${c.seed}: jadval kvadrat emas`).toBe(true);
  const f0 = lagrange(three, 0);
  const a = (lagrange(three, 1) - 2 * f0 + lagrange(three, -1)) / 2;
  c.key('a', a, 1e-9);
  const parts = (c.payload as { parts: Record<string, { prompt_md: string }> }).parts;
  const x = Number(/x=(-?\d+)/.exec(parts.b!.prompt_md)![1]);
  c.key('b', lagrange(three, x), 1e-9);
};

// ---------------------------------------------------------------------------------------------
// Umumiy tekshiruvlar va ishga tushirish
// ---------------------------------------------------------------------------------------------

// ---------------------------------------------------------------------------------------------
// 6.1 Hosila, 6.2 Boshlang'ich funksiya va integral (va 110). Sonli differensiallash/integrallash bilan.
// ---------------------------------------------------------------------------------------------

const ndiff = (f: NumFn, x: number, h = 1e-5): number => (f(x + h) - f(x - h)) / (2 * h);
const simpson = (f: NumFn, a: number, b: number, n = 2000): number => {
  const h = (b - a) / n;
  let s = f(a) + f(b);
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
};
/** g(x)=0 ning [lo,hi] dagi ildizlari (belgi almashishi + bisektsiya) */
function numRoots(g: (x: number) => number, lo: number, hi: number, step = 0.001): number[] {
  const out: number[] = [];
  let px = lo;
  let pv = g(lo);
  for (let x = lo + step; x <= hi + 1e-12; x += step) {
    const v = g(x);
    if (pv === 0) out.push(px);
    else if (pv * v < 0) {
      let a = px;
      let b = x;
      let fa = pv;
      for (let k = 0; k < 80; k++) {
        const m = (a + b) / 2;
        const fm = g(m);
        if (fm * fa <= 0) b = m;
        else {
          a = m;
          fa = fm;
        }
      }
      out.push((a + b) / 2);
    }
    px = x;
    pv = v;
  }
  return out;
}
const askedDerivArg = (c: Ctx): number => {
  const q = mathChunks(c.stem)
    .map((s) => s.replace(/\\left|\\right/g, ''))
    .find((s) => /^f'\(.+\)$/.test(s));
  if (!q) throw new Error(`f'(...) topilmadi: ${c.stem}`);
  return texFn(q.slice(3, -1), [])();
};
const fOf = (c: Ctx): NumFn => texFn(mathChunks(c.stem).find((s) => s.startsWith('f(x)='))!.replace(/^f\(x\)=/, ''));
const chunkNum = (c: Ctx, re: RegExp): number => {
  for (const s of mathChunks(c.stem)) {
    const m = re.exec(s);
    if (m) return Number(m[1]);
  }
  throw new Error(`${re}: topilmadi: ${c.stem}`);
};

for (const id of ['der-poly-point', 'der-prod-point', 'der-quot-point', 'der-pow-point', 'der-trig-point']) {
  CHECKS[id] = (c) => {
    const f = fOf(c);
    c.num(ndiff(f, askedDerivArg(c)), 1e-6);
  };
}

CHECKS['der-tangent-parallel'] = (c) => {
  const f = fOf(c);
  const line = texFn(mathChunks(c.stem).find((s) => s.startsWith('y='))!.replace(/^y=/, ''));
  const k = line(1) - line(0);
  const g0 = ndiff(f, 0);
  const g1 = ndiff(f, 1);
  c.num((k - g0) / (g1 - g0), 1e-6);
};

CHECKS['der-tangent-angle'] = (c) => {
  const f = fOf(c);
  const ang = chunkNum(c, /^(45|135)\^\\circ$/);
  const k = Math.tan((ang * Math.PI) / 180);
  const roots = numRoots((x) => ndiff(f, x) - k, -40, 40);
  expect(roots.length, `${c.id}#${c.seed}: ikkita urinish nuqtasi kutilgan`).toBe(2);
  c.num(roots[0]! + roots[1]!, 1e-6);
};

CHECKS['der-decreasing-int'] = (c) => {
  const f = fOf(c);
  let cnt = 0;
  for (let n = -80; n <= 80; n++) if (ndiff(f, n) <= 1e-6) cnt++;
  c.num(cnt);
};

CHECKS['der-extremum-value'] = (c) => {
  const f = fOf(c);
  const crit = numRoots((x) => ndiff(f, x), -30, 30);
  expect(crit.length).toBe(2);
  const vals = crit.map((x) => ({ x, v: f(x), max: ndiff(f, x - 0.01) > 0 && ndiff(f, x + 0.01) < 0 }));
  const mx = vals.find((q) => q.max)!;
  const mn = vals.find((q) => !q.max)!;
  expect(mx && mn).toBeTruthy();
  c.num(/ayirma/.test(c.stem) ? mx.v - mn.v : /maksimum nuqtasidagi/.test(c.stem) ? mx.v : mn.v, 1e-6);
};

CHECKS['der-optim-product'] = (c) => {
  const S = chunkNum(c, /^x\+y=(\d+)$/);
  const x2y = mathChunks(c.stem).includes('x^{2}y');
  const g = (x: number) => (x2y ? x * x * (S - x) : x * (S - x) * (S - x));
  let lo = 0;
  let hi = S;
  for (let i = 0; i < 200; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (g(m1) < g(m2)) lo = m1;
    else hi = m2;
  }
  const xb = (lo + hi) / 2;
  c.num(/ning shu/.test(c.stem) ? xb : g(xb), 1e-6);
};

const sOf = (c: Ctx): NumFn => texFn(mathChunks(c.stem).find((s) => s.startsWith('s(t)='))!.replace(/^s\(t\)=/, ''), ['t']);
const sd2 = (s: NumFn, t: number): number => (s(t + 1e-2) - 2 * s(t) + s(t - 1e-2)) / 1e-4;

CHECKS['der-velocity'] = (c) => {
  const s = sOf(c);
  const t0 = chunkNum(c, /^t=(\d+)$/);
  c.num(/tezligini/.test(c.stem) ? ndiff(s, t0) : sd2(s, t0), 1e-6);
};

CHECKS['der-velocity-o'] = (c) => {
  const s = sOf(c);
  const parts = (c.payload as { parts: Record<string, { prompt_md: string }> }).parts;
  const t0 = Number(/t=(\d+)/.exec(parts.a!.prompt_md)![1]);
  c.key('a', ndiff(s, t0), 1e-6);
  const a0 = sd2(s, 0);
  const a1 = sd2(s, 1);
  c.key('b', -a0 / (a1 - a0), 1e-6);
};

CHECKS['der-normal-slope'] = (c) => {
  const f = fOf(c);
  c.num(-1 / ndiff(f, chunkNum(c, /^x_0=(-?\d+)$/)), 1e-6);
};

CHECKS['der-normal-o'] = (c) => {
  const f = fOf(c);
  const x0 = chunkNum(c, /^x_0=(-?\d+)$/);
  const kn = -1 / ndiff(f, x0);
  c.key('a', kn, 1e-6);
  c.key('b', f(x0) - kn * x0, 1e-6);
};

CHECKS['int-antider-form'] = (c) => {
  const f = fOf(c);
  const xs = [-2, -1, 0.5, 1, 2.5];
  const fits = (t: string): boolean => {
    const F = texFn(flat(t.replace(/^\$|\$$/g, '')).replace(/^F\(x\)=/, '').replace(/\+C$/, ''));
    return xs.every((x) => near(ndiff(F, x), f(x), 1e-6));
  };
  expect(fits(c.correct!), `${c.id}#${c.seed}: to'g'ri variant ${c.correct}`).toBe(true);
  for (const t of Object.values(c.options!)) if (t !== c.correct) expect(fits(t), `${c.id}#${c.seed}: chalg'ituvchi ${t} to'g'ri`).toBe(false);
};

CHECKS['int-antider-value'] = (c) => {
  const f = fOf(c);
  const chunks = mathChunks(c.stem);
  const given = chunks.map((s) => /^F\((-?\d+)\)=(-?\d+)$/.exec(s)).find(Boolean)!;
  const asked = chunks.map((s) => /^F\((-?\d+)\)$/.exec(s)).find(Boolean)!;
  c.num(Number(given[2]) + simpson(f, Number(given[1]), Number(asked[1])), 1e-9);
};

const integrand = (c: Ctx): { lo: number; hi: number; f: NumFn } => {
  const s = mathChunks(c.stem)[0]!.replace(/\\left|\\right/g, '');
  const m = /^\\int_\{(-?\d+)\}\^\{(-?\d+)\}(.+)dx$/.exec(s);
  if (!m) throw new Error(`integral tahlil qilinmadi: ${s}`);
  return { lo: Number(m[1]), hi: Number(m[2]), f: texFn(m[3]!) };
};
CHECKS['int-def-poly'] = (c) => {
  const { lo, hi, f } = integrand(c);
  c.num(simpson(f, lo, hi), 1e-9);
};
CHECKS['int-def-pow'] = (c) => {
  const { lo, hi, f } = integrand(c);
  c.num(simpson(f, lo, hi, 4000), 1e-9);
};

CHECKS['int-def-trig'] = (c) => {
  const s = mathChunks(c.stem)[0]!;
  const m = /^\\int_\{(.+?)\}\^\{(.+?)\}(-?\d*)\\(sin|cos)\\,x\\,dx$/.exec(s);
  expect(m, `${c.id}: integral tahlil qilinmadi: ${s}`).not.toBeNull();
  const k = m![3] === '' ? 1 : m![3] === '-' ? -1 : Number(m![3]);
  const fn = m![4] === 'sin' ? Math.sin : Math.cos;
  c.num(simpson((x) => k * fn(x), texFn(m![1]!, [])(), texFn(m![2]!, [])(), 20000), 1e-9);
};

CHECKS['int-find-bound'] = (c) => {
  const s = mathChunks(c.stem)[0]!;
  const pm = /\(2x([+-]\d+)\)/.exec(s)!;
  const V = Number(/=(\d+)$/.exec(s)![1]);
  const f = (x: number) => 2 * x + Number(pm[1]);
  const hits: number[] = [];
  for (let b = 1; b <= 200; b++) if (Math.abs(simpson(f, 0, b, 200) - V) < 1e-9) hits.push(b);
  expect(hits.length, `${c.id}#${c.seed}: musbat butun yechim yagona`).toBe(1);
  c.num(hits[0]!);
};

const wordsStripped = (s: string): string => s.replace(/\$[^$\n]+?\$/g, ' ');

describe("qo'shimcha shablonlar: tenglamalar, funksiyalar, analiz (mustaqil matematik tekshiruv)", () => {
  it('shablonlar soni va qamrov: har element va yangi mavzular', () => {
    expect(EQUATIONS_ANALYSIS_TEMPLATES.length).toBeGreaterThanOrEqual(50);
    // @@COVERAGE@@
  });

  it("har bir shablon uchun matematik tekshiruv mavjud (tekshirib bo'lmaydigan shablon qoldirilmagan)", () => {
    const missing = EQUATIONS_ANALYSIS_TEMPLATES.filter((t) => !CHECKS[t.id]).map((t) => t.id);
    expect(missing).toEqual([]);
    const extra = Object.keys(CHECKS).filter((id) => !EQUATIONS_ANALYSIS_TEMPLATES.some((t) => t.id === id));
    expect(extra).toEqual([]);
  });

  it("umumiy sifat: KaTeX, 4 til, import sxemasi (40 seed), deterministiklik, xilma-xillik (>= 30 ta turli savol)", () => {
    const problems = EQUATIONS_ANALYSIS_TEMPLATES.flatMap((t) => checkExtraTemplate(t, SEEDS));
    expect(problems.slice(0, 10)).toEqual([]);
    for (const t of EQUATIONS_ANALYSIS_TEMPLATES) {
      const a = SEEDS.map((s) => questionSignature(buildExtraQuestion(t, s)));
      const b = SEEDS.map((s) => questionSignature(buildExtraQuestion(t, s)));
      expect(a, `${t.id}: deterministik emas`).toEqual(b);
      expect(new Set(a).size, `${t.id}: 40 seedda juda kam turli savol`).toBeGreaterThanOrEqual(30);
    }
  });

  it('tillar bo\'yicha izchillik: raqamlar, variantlar, kalit bir xil; kirill faqat ruscha; literal $ yo\'q', () => {
    const problems: string[] = [];
    const digits = (s: string) => (s.match(/\d+/g) ?? []).sort().join(',');
    const cyr = /[Ѐ-ӿ]/;
    for (const t of EQUATIONS_ANALYSIS_TEMPLATES) {
      for (const seed of SEEDS.slice(0, 12)) {
        const spec = t.generate(seed);
        const per = LANGS.map((l) => ({ l, c: spec.content(l) }));
        const base = per[0]!.c;
        for (const { l, c } of per) {
          const at = `${t.id}#${seed}[${l}]`;
          if (digits(c.stem_md.replace(/\$[^$\n]+?\$/g, (m) => m)) !== digits(base.stem_md)) problems.push(`${at}: savol raqamlari uz dan farq qiladi`);
          if (t.type === 'y1' && JSON.stringify(c.payload) !== JSON.stringify(base.payload)) problems.push(`${at}: variantlar tillarda farq qiladi`);
          if (t.type === 'o') {
            const parts = (c.payload as { parts: Record<string, { prompt_md: string }> }).parts;
            const bp = (base.payload as { parts: Record<string, { prompt_md: string }> }).parts;
            if (Object.keys(parts).join() !== Object.keys(bp).join()) problems.push(`${at}: a/b bandlari farq qiladi`);
            for (const k of Object.keys(parts)) if (digits(parts[k]!.prompt_md) !== digits(bp[k]!.prompt_md)) problems.push(`${at}: ${k}) raqamlari farq qiladi`);
          }
          for (const text of [c.stem_md, c.solution_md, c.mistake_note_md ?? '']) {
            const plain = wordsStripped(text);
            if (l !== 'ru' && cyr.test(plain)) problems.push(`${at}: kirill harflari: ${plain.slice(0, 50)}`);
            if (/\$\$/.test(text)) problems.push(`${at}: bo'sh $$`);
          }
        }
      }
    }
    expect(problems.slice(0, 10)).toEqual([]);
  });

  describe('javoblar mustaqil usul bilan qayta hisoblanadi', () => {
    for (const t of EQUATIONS_ANALYSIS_TEMPLATES) {
      it(`${t.id} (mavzu ${t.topic}, ${t.type}/${t.difficulty})`, () => {
        const check = CHECKS[t.id];
        expect(check, `${t.id}: tekshiruv yo'q`).toBeDefined();
        for (const seed of SEEDS) check!(makeCtx(t, seed));
      }, 120000);
    }
  });
});
