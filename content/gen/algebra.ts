import { fAdd, fDiv, fMul, fSub, frac, gcd, texFrac, type Frac, type L10n, type Rng } from './helpers';
import {
  G,
  S,
  T,
  TRIG_FNS,
  TRIPLES,
  buildSpec,
  cosSign,
  degTex,
  disp,
  exactTrig,
  fnum,
  inQuadrant,
  inl,
  isSquare,
  mk,
  pickTemplate,
  polyEval,
  polyTex,
  qAdd,
  qMul,
  qNeg,
  qNum,
  qScale,
  qTex,
  radTex,
  ROMAN,
  rootTex,
  safeExact,
  sinSign,
  sqrtOrInt,
  terms,
  tpl,
  trigName,
  trigNum,
  coFn,
  type Built,
  type Quadrant,
  type Q,
  type Template,
  type TrigFn,
} from './algebra-lib';
import type { BlockGenerator } from './types';

// ---------------------------------------------------------------------------
// "Algebraik shakl almashtirishlar" bloki (mavzular 12-27), faqat Y-1.
// 11 slot: 10 tasi L1 (pozitsiyalar 3-12), 1 tasi L2 (13).
//
// Atamalar lug'ati (izchillik uchun):
//   uz: daraja, ko'rsatkich, ildiz, ko'phad, ko'paytuvchilarga ajratish, maxraj, burchak, chorak
//   ru: степень, показатель, корень, многочлен, разложение на множители, знаменатель, угол, четверть
//   kaa: dáreje, kórsetkish, túbir, kóp aǵza, kóbeytiwshilerge ajıratıw, bólim, múyesh, sherek  // kaa: tekshirilsin
//   en: power, exponent, root, polynomial, factoring, denominator, angle, quadrant
// ---------------------------------------------------------------------------

const st = (instr: L10n, tex: string) => (lang: Parameters<Built['stem']>[0]) => S(lang, instr, disp(tex));
const pf = (f: Frac): string => (f.n < 0 ? String.raw`\left(${texFrac(f)}\right)` : texFrac(f));
const nz = (r: Rng, lo: number, hi: number): number => {
  for (;;) {
    const v = r.int(lo, hi);
    if (v !== 0) return v;
  }
};
const signed = (n: number): string => (n < 0 ? `-${-n}` : `+${n}`);
const rtx = (n: number, base: number): string => (n === 2 ? String.raw`\sqrt{${base}}` : String.raw`\sqrt[${n}]{${base}}`);
/** (c1x + c0) shaklidagi kanonik chiziqli ifoda / maxraj: lin1(2, 4) -> \frac{x}{2} */
const lin1 = (num: number, den: number): string => {
  const g = gcd(num, den) || 1;
  const n = num / g;
  const d = den / g;
  const top = n === 1 ? 'x' : n === -1 ? '-x' : `${n}x`;
  return d === 1 ? top : n < 0 ? String.raw`-\frac{${terms([[-n, 'x']])}}{${d}}` : String.raw`\frac{${top}}{${d}}`;
};

const POS = T('musbat', 'положительна', 'oń', 'positive'); // kaa: oń/teris tekshirilsin
const NEG = T('manfiy', 'отрицательна', 'teris', 'negative');
const sgnWord = (s: number): L10n => (s > 0 ? POS : NEG);

// ===========================================================================
// L1 shablonlar
// ===========================================================================

// 1. Daraja xossalari (12)
interface PowP { form: number; b: number; m: number; n: number; k: number; e: number; alt: number }
const POW_RULE = T(
  String.raw`Daraja xossalari: $a^m\cdot a^n=a^{m+n}$, $a^m:a^n=a^{m-n}$, $(a^m)^n=a^{mn}$.`,
  String.raw`Свойства степени: $a^m\cdot a^n=a^{m+n}$, $a^m:a^n=a^{m-n}$, $(a^m)^n=a^{mn}$.`,
  String.raw`Dárejeniń qásiyetleri: $a^m\cdot a^n=a^{m+n}$, $a^m:a^n=a^{m-n}$, $(a^m)^n=a^{mn}$.`,
  String.raw`Laws of exponents: $a^m\cdot a^n=a^{m+n}$, $a^m:a^n=a^{m-n}$, $(a^m)^n=a^{mn}$.`,
);
const tPow = tpl<PowP>(
  'alg-pow',
  (r) => {
    for (;;) {
      const form = r.int(0, 2);
      if (form === 0) {
        const b = r.pick([2, 3, 5]);
        const m = r.int(2, 8);
        const n = r.int(2, 8);
        const k = r.int(1, m + n - 1);
        const e = m + n - k;
        if (b ** e <= 6000) return { form, b, m, n, k, e, alt: m * n - k };
      } else if (form === 1) {
        const b = r.pick([2, 3]);
        const m = r.int(2, 4);
        const n = r.int(2, 4);
        const k = r.int(1, m * n - 1);
        const e = m * n - k;
        if (b ** e <= 6000) return { form, b, m, n, k, e, alt: m + n - k };
      } else {
        const a = r.int(1, 5);
        const c0 = r.int(1, 6);
        const d = r.int(1, 3);
        const e = 2 * a + c0 - 3 * d;
        if (e >= 1 && e <= 12) return { form, b: 2, m: a, n: c0, k: d, e, alt: a + c0 - d };
      }
    }
  },
  ({ form, b, m, n, k, e, alt }) => {
    const val = b ** e;
    const expr =
      form === 0
        ? String.raw`\frac{${b}^{${m}}\cdot ${b}^{${n}}}{${b}^{${k}}}`
        : form === 1
          ? String.raw`\frac{(${b}^{${m}})^{${n}}}{${b}^{${k}}}`
          : String.raw`\frac{4^{${m}}\cdot 2^{${n}}}{8^{${k}}}`;
    const chain =
      form === 0
        ? String.raw`${expr}=${b}^{${m}+${n}-${k}}=${b}^{${e}}=${val}`
        : form === 1
          ? String.raw`${expr}=\frac{${b}^{${m}\cdot ${n}}}{${b}^{${k}}}=${b}^{${m * n}-${k}}=${b}^{${e}}=${val}`
          : String.raw`${expr}=\frac{2^{2\cdot ${m}}\cdot 2^{${n}}}{2^{3\cdot ${k}}}=2^{${2 * m}+${n}-${3 * k}}=2^{${e}}=${val}`;
    const direct = form === 0 ? (b ** m * b ** n) / b ** k : form === 1 ? (b ** m) ** n / b ** k : (4 ** m * 2 ** n) / 8 ** k;
    return {
      topic: 12,
      est: 60,
      stem: st(G.calc, expr),
      correct: String(val),
      wrong: [alt, e + 1, e - 1, e + 2].filter((x) => x >= 0 && b ** x <= 20000).map((x) => String(b ** x)),
      solution: (l) =>
        S(l, POW_RULE, ...(form === 2 ? [T('Hammasini 2 asosiga keltiramiz.', 'Приведём все степени к основанию 2.', 'Barlıǵın 2 tiykarına keltiremiz.', 'Rewrite everything with base 2.')] : []), disp(chain)),
      mistake: mk(T("Ko'paytirishda ko'rsatkichlarni qo'shish o'rniga ko'paytirish yoki asoslarni ko'paytirib yuborish.", 'Умножать показатели вместо сложения или перемножать основания.', 'Kóbeytiwde kórsetkishlerdi qosıw ornına kóbeytiw yamasa tiykarlardı kóbeytip jiberiw.', 'Multiplying exponents instead of adding them, or multiplying the bases.')),
      check: [[direct, val]],
    };
  },
);

// 2. Manfiy butun ko'rsatkich (12)
interface NegP { form: number; p: number; q: number; n: number; a: number; b: number; m: number }
const tNeg = tpl<NegP>(
  'alg-negexp',
  (r) => {
    for (;;) {
      const form = r.int(0, 1);
      const p = r.int(2, 6);
      const qq = r.int(2, 6);
      const n = r.int(2, 3);
      const a = r.int(2, 5);
      const b = r.int(2, 5);
      const m = r.int(1, 3);
      if (form === 0 && p !== qq && gcd(p, qq) === 1) return { form, p, q: qq, n, a, b, m };
      if (form === 1 && !(a === b && m === n)) return { form, p, q: qq, n, a, b, m };
    }
  },
  ({ form, p, q: qq, n, a, b, m }) => {
    let correct: Frac;
    let expr: string;
    let chain: string;
    let wrong: Frac[];
    let direct: number;
    if (form === 0) {
      correct = frac(qq ** n, p ** n);
      expr = String.raw`\left(\frac{${p}}{${qq}}\right)^{-${n}}`;
      chain = String.raw`${expr}=\left(\frac{${qq}}{${p}}\right)^{${n}}=\frac{${qq ** n}}{${p ** n}}`;
      wrong = [frac(p ** n, qq ** n), frac(-(qq ** n), p ** n), frac(qq * n, p), frac(qq ** n, p * n)];
      direct = (p / qq) ** -n;
    } else {
      correct = fAdd(frac(1, a ** m), frac(1, b ** n));
      expr = String.raw`${a}^{-${m}}+${b}^{-${n}}`;
      chain = String.raw`${expr}=\frac{1}{${a ** m}}+\frac{1}{${b ** n}}=${texFrac(correct)}`;
      wrong = [frac(a ** m + b ** n), frac(1, a ** m + b ** n), frac(-(a ** m) - b ** n), fAdd(frac(1, a * m), frac(1, b * n)), frac(-1, a ** m)];
      direct = a ** -m + b ** -n;
    }
    return {
      topic: 12,
      est: 70,
      stem: st(G.calc, expr),
      correct: texFrac(correct),
      wrong: wrong.map(texFrac),
      solution: (l) =>
        S(l, T(String.raw`Manfiy ko'rsatkich: $a^{-n}=\dfrac{1}{a^n}$, $\left(\dfrac{a}{b}\right)^{-n}=\left(\dfrac{b}{a}\right)^n$.`, String.raw`Отрицательный показатель: $a^{-n}=\dfrac{1}{a^n}$, $\left(\dfrac{a}{b}\right)^{-n}=\left(\dfrac{b}{a}\right)^n$.`, String.raw`Teris kórsetkish: $a^{-n}=\dfrac{1}{a^n}$, $\left(\dfrac{a}{b}\right)^{-n}=\left(\dfrac{b}{a}\right)^n$.`, String.raw`Negative exponent: $a^{-n}=\dfrac{1}{a^n}$, $\left(\dfrac{a}{b}\right)^{-n}=\left(\dfrac{b}{a}\right)^n$.`), disp(chain)),
      mistake: mk(T("Manfiy ko'rsatkichni ishora o'zgarishi deb tushunish yoki asosni teskari aylantirmaslik.", 'Считать, что отрицательный показатель меняет знак числа, или не переворачивать основание.', 'Teris kórsetkishti belgi ózgeriwi dep túsiniw yamasa tiykardı teris aylandırmaw.', 'Treating a negative exponent as a sign change, or forgetting to invert the base.')),
      check: [[direct, fnum(correct)]],
    };
  },
  (p) => JSON.stringify(p.form === 0 ? [0, p.p, p.q, p.n] : [1, p.a, p.m, p.b, p.n]),
);

// 3. Arifmetik ildizlar ko'paytmasi (13)
interface RootP { form: number; m: number; s: number; t: number }
const tRoot = tpl<RootP>(
  'alg-rootprod',
  (r) => {
    const form = r.int(0, 1);
    return form === 0 ? { form, m: r.pick([2, 3, 5, 6, 7, 10]), s: r.int(2, 6), t: r.int(2, 6) } : { form, m: r.pick([2, 3, 4, 5]), s: r.int(2, 3), t: r.int(2, 3) };
  },
  ({ form, m, s, t }) => {
    const A = form === 0 ? m * s * s : m * s ** 3;
    const B = form === 0 ? m * t * t : m * m * t ** 3;
    const res = m * s * t;
    const expr = form === 0 ? String.raw`\sqrt{${A}}\cdot\sqrt{${B}}` : String.raw`\sqrt[3]{${A}}\cdot\sqrt[3]{${B}}`;
    const chain =
      form === 0
        ? String.raw`${expr}=\sqrt{${A}\cdot ${B}}=\sqrt{${A * B}}=\sqrt{${res}^2}=${res}`
        : String.raw`${expr}=\sqrt[3]{${A}\cdot ${B}}=\sqrt[3]{${A * B}}=\sqrt[3]{${res}^3}=${res}`;
    const direct = form === 0 ? Math.sqrt(A) * Math.sqrt(B) : Math.cbrt(A) * Math.cbrt(B);
    return {
      topic: 13,
      est: 70,
      stem: st(G.calc, expr),
      correct: String(res),
      wrong: [m * (s + t), s * t, m * res, res + m, res - m, res + 1].map(String),
      solution: (l) =>
        S(l, T(String.raw`Bir xil darajali ildizlar ko'paytmasi: $\sqrt[n]{a}\cdot\sqrt[n]{b}=\sqrt[n]{ab}$.`, String.raw`Произведение корней одной степени: $\sqrt[n]{a}\cdot\sqrt[n]{b}=\sqrt[n]{ab}$.`, String.raw`Birdey dárejeli túbirlerdiń kóbeymesi: $\sqrt[n]{a}\cdot\sqrt[n]{b}=\sqrt[n]{ab}$.`, String.raw`Product of roots of the same index: $\sqrt[n]{a}\cdot\sqrt[n]{b}=\sqrt[n]{ab}$.`), disp(chain)),
      mistake: mk(T("Ildiz ostidagi sonlarni ko'paytirgach ildizni to'liq chiqarmaslik yoki ildiz ostidagi sonlarni qo'shib yuborish.", 'Складывать подкоренные числа вместо перемножения или не извлекать корень до конца.', 'Túbir astındaǵı sanlardı kóbeytiw ornına qosıp jiberiw yamasa túbirdi tolıq shıǵarmaw.', 'Adding the radicands instead of multiplying, or not extracting the root completely.')),
      check: [[direct, res]],
    };
  },
);

// 4. Ratsional ko'rsatkichli daraja (14)
interface RatP { qq: number; r: number; p: number; neg: boolean }
const tRat = tpl<RatP>(
  'alg-ratexp',
  (r) => {
    for (;;) {
      const qq = r.pick([2, 2, 3, 3, 4]);
      const root = qq === 2 ? r.int(2, 9) : qq === 3 ? r.int(2, 5) : r.int(2, 3);
      const p = r.int(1, 3);
      if (gcd(p, qq) === 1 && p !== qq) return { qq, r: root, p, neg: r.chance(0.5) };
    }
  },
  ({ qq, r: root, p, neg }) => {
    const base = root ** qq;
    const A = root ** p;
    const correct = neg ? frac(1, A) : frac(A);
    const reverse = neg ? frac(A) : frac(1, A);
    const expr = String.raw`${base}^{${neg ? '-' : ''}\frac{${p}}{${qq}}}`;
    const chain = neg
      ? String.raw`${expr}=\frac{1}{${base}^{\frac{${p}}{${qq}}}}=\frac{1}{\left(${rtx(qq, base)}\right)^{${p}}}=\frac{1}{${root}^{${p}}}=${texFrac(correct)}`
      : String.raw`${expr}=\left(${rtx(qq, base)}\right)^{${p}}=${root}^{${p}}=${A}`;
    return {
      topic: 14,
      est: 80,
      stem: st(G.calc, expr),
      correct: texFrac(correct),
      wrong: [reverse, frac(-correct.n, correct.d), neg ? frac(1, A * root) : frac(A * root), neg ? frac(1, root * p) : frac(root * p), neg ? frac(-1, A) : frac(-A)].map(texFrac),
      solution: (l) =>
        S(l, T(String.raw`Ratsional ko'rsatkich: $a^{\frac{m}{n}}=\left(\sqrt[n]{a}\right)^{m}$, $a^{-k}=\dfrac{1}{a^{k}}$.`, String.raw`Рациональный показатель: $a^{\frac{m}{n}}=\left(\sqrt[n]{a}\right)^{m}$, $a^{-k}=\dfrac{1}{a^{k}}$.`, String.raw`Ratsional kórsetkish: $a^{\frac{m}{n}}=\left(\sqrt[n]{a}\right)^{m}$, $a^{-k}=\dfrac{1}{a^{k}}$.`, String.raw`Rational exponent: $a^{\frac{m}{n}}=\left(\sqrt[n]{a}\right)^{m}$, $a^{-k}=\dfrac{1}{a^{k}}$.`), disp(chain)),
      mistake: mk(T("Kasr ko'rsatkichning surat va maxrajini almashtirib yuborish (ildiz darajasi bilan daraja o'rnini adashtirish) yoki manfiy ishorani e'tiborsiz qoldirish.", 'Путать числитель и знаменатель показателя (степень и корень) или игнорировать знак минус.', 'Bólshek kórsetkishtiń alımı menen bóliminiń ornın shatastırıw yamasa minus belgisine itibar bermew.', 'Mixing up numerator and denominator of the exponent (power vs root) or ignoring the minus sign.')),
      check: [[base ** ((neg ? -1 : 1) * (p / qq)), fnum(correct)]],
    };
  },
);

// 5. Ko'phadlar yig'indisi/ayirmasi (15)
interface PolyP { op: '+' | '-'; P: number[]; Q: number[] }
const tPoly = tpl<PolyP>(
  'alg-poly',
  (r) => ({ op: r.pick(['+', '-'] as const), P: [nz(r, -5, 5), nz(r, -6, 6), nz(r, -7, 7)], Q: [nz(r, -5, 5), nz(r, -6, 6), nz(r, -7, 7)] }),
  ({ op, P, Q }) => {
    const sg = op === '+' ? 1 : -1;
    const res = P.map((c, i) => c + sg * Q[i]!);
    const expr = `(${polyTex(P)})${op}(${polyTex(Q)})`;
    const mons = ['x^2', 'x', ''] as const;
    const open = terms([...P.map((c, i) => [c, mons[i]!] as const), ...Q.map((c, i) => [sg * c, mons[i]!] as const)]);
    const cands: number[][] =
      op === '-'
        ? [[P[0]! - Q[0]!, P[1]! + Q[1]!, P[2]! + Q[2]!], P.map((c, i) => c + Q[i]!), Q.map((c, i) => c - P[i]!), [P[0]! - Q[0]!, P[1]! - Q[1]!, P[2]! + Q[2]!]]
        : [P.map((c, i) => c - Q[i]!), [P[0]! + Q[0]!, P[1]! + Q[1]!, P[2]! - Q[2]!], [P[0]! + Q[0]!, P[1]! - Q[1]!, P[2]! + Q[2]!], [P[0]! * Q[0]!, P[1]! + Q[1]!, P[2]! + Q[2]!]];
    const x0 = 1.7;
    return {
      topic: 15,
      est: 75,
      stem: st(G.expand, expr),
      correct: polyTex(res),
      wrong: cands.map((c) => polyTex(c)),
      solution: (l) =>
        S(
          l,
          op === '-'
            ? T("Minus ishorali qavsni ochganda qavs ichidagi hamma hadlarning ishorasi o'zgaradi:", 'При раскрытии скобок со знаком минус знаки всех слагаемых в скобках меняются:', 'Minus belgili qawsırmanı ashqanda qawsırma ishindegi barlıq aǵzalardıń belgisi ózgeredi:', 'When opening brackets preceded by a minus sign, the signs of all terms inside change:')
            : T('Qavslarni ochamiz va o\'xshash hadlarni qo\'shamiz:', 'Раскроем скобки и сложим подобные слагаемые:', 'Qawsırmalardı ashamız hám uqsas aǵzalardı qosamız:', 'Open the brackets and add like terms:'),
          disp(String.raw`${expr}=${open}=${polyTex(res)}`),
        ),
      mistake: mk(
        op === '-'
          ? T("Minus ishorali qavsni ochganda faqat birinchi hadning ishorasini o'zgartirish.", 'Менять знак только у первого слагаемого при раскрытии скобок со знаком минус.', 'Minus belgili qawsırmanı ashqanda tek birinshi aǵzanıń belgisin ózgertiw.', 'Changing only the sign of the first term when removing a bracket preceded by a minus.')
          : T("O'xshash hadlarni qo'shishda ishora yoki koeffitsient xatosi.", 'Ошибка в знаке или коэффициенте при сложении подобных слагаемых.', 'Uqsas aǵzalardı qosıwda belgi yamasa koefficient qátesi.', 'A sign or coefficient error when adding like terms.'),
      ),
      check: [x0, -2.3, 0.4].map((x) => [polyEval(P, x) + sg * polyEval(Q, x), polyEval(res, x)] as const),
    };
  },
);

// 6. Ikki had yig'indisi kvadrati (16)
interface SqP { a: number; b: number }
const tSquare = tpl<SqP>(
  'alg-square',
  (r) => ({ a: r.int(1, 5), b: nz(r, -6, 6) }),
  ({ a, b }) => {
    const inner = terms([[a, 'x'], [b, 'y']]);
    const expr = `(${inner})^2`;
    const res = terms([[a * a, 'x^2'], [2 * a * b, 'xy'], [b * b, 'y^2']]);
    const by = `(${terms([[b, 'y']])})`;
    const ax = a === 1 ? 'x' : `${a}x`;
    return {
      topic: 16,
      est: 70,
      stem: st(G.expand, expr),
      correct: res,
      wrong: [terms([[a * a, 'x^2'], [b * b, 'y^2']]), terms([[a * a, 'x^2'], [a * b, 'xy'], [b * b, 'y^2']]), terms([[a * a, 'x^2'], [-2 * a * b, 'xy'], [b * b, 'y^2']]), terms([[a * a, 'x^2'], [2 * a * b, 'xy'], [-b * b, 'y^2']])],
      solution: (l) =>
        S(l, T(String.raw`Qisqa ko'paytirish formulasi: $(u+v)^2=u^2+2uv+v^2$.`, String.raw`Формула сокращённого умножения: $(u+v)^2=u^2+2uv+v^2$.`, String.raw`Qısqa kóbeytiw formulası: $(u+v)^2=u^2+2uv+v^2$.`, String.raw`Special product formula: $(u+v)^2=u^2+2uv+v^2$.`), disp(String.raw`${expr}=(${ax})^2+2\cdot ${ax}\cdot ${by}+${by}^2=${res}`)),
      mistake: mk(T("O'rtadagi $2uv$ hadni tashlab ketish: $(u+v)^2=u^2+v^2$.", String.raw`Пропускать удвоенное произведение: $(u+v)^2=u^2+v^2$.`, String.raw`Ortadaǵı $2uv$ aǵzanı taslap ketiw: $(u+v)^2=u^2+v^2$.`, String.raw`Dropping the middle term: $(u+v)^2=u^2+v^2$.`)),
      check: [[(a * 1.3 + b * 0.7) ** 2, a * a * 1.3 ** 2 + 2 * a * b * 1.3 * 0.7 + b * b * 0.7 ** 2]],
    };
  },
);

// 7. Kvadratlar ayirmasi bilan sonli hisoblash (16)
interface DsP { form: number; c: number; d: number; A: number; B: number }
const tDiffSq = tpl<DsP>(
  'alg-diffsq',
  (r) => {
    const form = r.int(0, 2);
    const c = r.int(3, 15) * 10;
    const d = r.int(1, 9);
    let A = r.int(21, 99);
    let B = r.int(21, 99);
    if (A === B) B = A - 1;
    if (A < B) [A, B] = [B, A];
    return { form, c, d, A, B };
  },
  ({ form, c, d, A, B }) => {
    let expr: string;
    let val: number;
    let wrong: number[];
    let chain: string;
    let direct: number;
    if (form === 0) {
      const X = c + d;
      const Y = c - d;
      val = 4 * c * d;
      expr = `${X}^2-${Y}^2`;
      chain = String.raw`${expr}=(${X}-${Y})(${X}+${Y})=${X - Y}\cdot ${X + Y}=${val}`;
      wrong = [(2 * d) ** 2, 2 * c * d, 2 * X, val * 10];
      direct = X * X - Y * Y;
    } else if (form === 1) {
      val = A + B;
      expr = String.raw`\frac{${A}^2-${B}^2}{${A}-${B}}`;
      chain = String.raw`${expr}=\frac{(${A}-${B})(${A}+${B})}{${A}-${B}}=${A}+${B}=${val}`;
      wrong = [A - B, 2 * A, 2 * B, val + 1];
      direct = (A * A - B * B) / (A - B);
    } else {
      val = A - B;
      expr = String.raw`\frac{${A}^2-${B}^2}{${A}+${B}}`;
      chain = String.raw`${expr}=\frac{(${A}-${B})(${A}+${B})}{${A}+${B}}=${A}-${B}=${val}`;
      wrong = [A + B, 2 * A, 2 * B, val + 1];
      direct = (A * A - B * B) / (A + B);
    }
    return {
      topic: 16,
      est: 70,
      stem: st(G.calc, expr),
      correct: String(val),
      wrong: wrong.map(String),
      solution: (l) => S(l, T(String.raw`Kvadratlar ayirmasi: $u^2-v^2=(u-v)(u+v)$.`, String.raw`Разность квадратов: $u^2-v^2=(u-v)(u+v)$.`, String.raw`Kvadratlar ayırması: $u^2-v^2=(u-v)(u+v)$.`, String.raw`Difference of squares: $u^2-v^2=(u-v)(u+v)$.`), disp(chain)),
      mistake: mk(T("Kvadratlar ayirmasini $(u-v)^2$ bilan adashtirish yoki har bir sonni alohida kvadratga oshirib ketish.", 'Путать разность квадратов с $(u-v)^2$ или возводить числа в квадрат по отдельности.', 'Kvadratlar ayırmasın $(u-v)^2$ penen shatastırıw yamasa hár bir sandı bólek kvadratqa kóteriw.', 'Confusing the difference of squares with $(u-v)^2$ or squaring each number separately.')),
      check: [[direct, val]],
    };
  },
);

// 8. Kvadrat uchhadni ko'paytuvchilarga ajratish (17)
interface FacP { u: number; w: number }
const fac2 = (c1: number, c2: number): string => {
  const [a, b] = c1 <= c2 ? [c1, c2] : [c2, c1];
  return `(${terms([[1, 'x'], [a, '']])})(${terms([[1, 'x'], [b, '']])})`;
};
const tFactor = tpl<FacP>(
  'alg-factor',
  (r) => {
    for (;;) {
      const u = nz(r, -9, 9);
      const w = nz(r, -9, 9);
      if (Math.abs(u) !== Math.abs(w)) return { u, w };
    }
  },
  ({ u, w }) => {
    const tri = terms([[1, 'x^2'], [u + w, 'x'], [u * w, '']]);
    const x0 = 2.3;
    return {
      topic: 17,
      est: 80,
      stem: st(G.factor, tri),
      correct: fac2(u, w),
      wrong: [fac2(-u, -w), fac2(u, -w), fac2(-u, w)],
      solution: (l) =>
        S(
          l,
          T(`Viyet teoremasiga ko'ra yig'indisi $${u + w}$, ko'paytmasi $${u * w}$ bo'lgan ikki sonni qidiramiz: bular $${u}$ va $${w}$.`, `Ищем два числа с суммой $${u + w}$ и произведением $${u * w}$ (теорема Виета): это $${u}$ и $${w}$.`, `Viyet teoremasına kóre qosındısı $${u + w}$, kóbeymesi $${u * w}$ bolǵan eki sandı izleymiz: bular $${u}$ hám $${w}$.`, `By Vieta's formulas we look for two numbers with sum $${u + w}$ and product $${u * w}$: they are $${u}$ and $${w}$.`),
          disp(String.raw`${tri}=${fac2(u, w)}`),
        ),
      mistake: mk(T("Ko'paytuvchilardagi sonlarning ishorasini teskari yozish: ildizlar bilan ko'paytuvchi ozod hadlarini adashtirish.", 'Записывать числа в скобках с противоположным знаком: путать корни и свободные члены множителей.', 'Kóbeytiwshilerdegi sanlardıń belgisin teris jazıw: túbirler menen kóbeytiwshilerdiń bos aǵzaların shatastırıw.', 'Writing the numbers in the factors with the opposite sign (confusing roots with constants of the factors).')),
      check: [[x0 * x0 + (u + w) * x0 + u * w, (x0 + Math.min(u, w)) * (x0 + Math.max(u, w))]],
    };
  },
);

// 9. Algebraik kasrni qisqartirish (18)
interface RedP { p: number; qq: number }
const tReduce = tpl<RedP>(
  'alg-reduce',
  (r) => {
    for (;;) {
      const p = r.int(2, 7);
      const qq = nz(r, -7, 7);
      if (qq !== p && qq !== -p) return { p, qq };
    }
  },
  ({ p, qq }) => {
    const num = terms([[1, 'x^2'], [-(p + qq), 'x'], [p * qq, '']]);
    const den = terms([[1, 'x^2'], [-p * p, '']]);
    const expr = String.raw`\frac{${num}}{${den}}`;
    const lin = (c: number) => terms([[1, 'x'], [c, '']]);
    const res = String.raw`\frac{${lin(-qq)}}{${lin(p)}}`;
    const x0 = 10.37;
    return {
      topic: 18,
      est: 90,
      stem: st(G.reduce, expr),
      correct: res,
      wrong: [String.raw`\frac{${lin(qq)}}{${lin(p)}}`, String.raw`\frac{${lin(-qq)}}{${lin(-p)}}`, String.raw`\frac{${lin(qq)}}{${lin(-p)}}`, texFrac(frac(qq, p))],
      solution: (l) =>
        S(
          l,
          T("Surat va maxrajni ko'paytuvchilarga ajratamiz:", 'Разложим числитель и знаменатель на множители:', 'Alım hám bólimdi kóbeytiwshilerge ajıratamız:', 'Factor the numerator and the denominator:'),
          disp(String.raw`${num}=(${lin(-p)})(${lin(-qq)}),\qquad ${den}=(${lin(-p)})(${lin(p)})`),
          T(`Umumiy ko'paytuvchi $${lin(-p)}$ ga qisqartiramiz:`, `Сократим на общий множитель $${lin(-p)}$:`, `Ulıwma kóbeytiwshi $${lin(-p)}$ qa qısqartamız:`, `Cancel the common factor $${lin(-p)}$:`),
          disp(String.raw`\frac{(${lin(-p)})(${lin(-qq)})}{(${lin(-p)})(${lin(p)})}=${res}`),
        ),
      mistake: mk(T("Qisqartirishda hadlarni emas, faqat ko'paytuvchilarni qisqartirish mumkin; ishora xatosi ko'p uchraydi.", 'Сокращать можно только множители, а не слагаемые; часто ошибаются со знаком.', 'Qısqartıwda aǵzalardı emes, tek kóbeytiwshilerdi qısqartıw múmkin; belgi qátesi kóp ushırasadı.', 'Only factors (not terms) can be cancelled; sign errors are common.')),
      check: [[(x0 * x0 - (p + qq) * x0 + p * qq) / (x0 * x0 - p * p), (x0 - qq) / (x0 + p)]],
    };
  },
);

// 10. Algebraik kasrlar ustida amallar (18)
interface FrP { op: '+' | '-'; m: number; n: number }
const tFrac = tpl<FrP>(
  'alg-fracop',
  (r) => ({ op: r.pick(['+', '-'] as const), m: r.int(1, 6), n: r.int(1, 6) }),
  ({ op, m, n }) => {
    const expr = String.raw`\frac{${m}}{x-${n}}${op}\frac{${m}}{x+${n}}`;
    const den = `x^2-${n * n}`;
    const num = op === '-' ? String(2 * m * n) : terms([[2 * m, 'x']]);
    const res = String.raw`\frac{${num}}{${den}}`;
    const mul = (inner: string) => (m === 1 ? `(${inner})` : `${m}(${inner})`);
    const sgn = op === '-' ? -1 : 1;
    const x0 = 5.9;
    const wrong =
      op === '-'
        ? [String.raw`\frac{-${2 * m * n}}{${den}}`, String.raw`\frac{${terms([[2 * m, 'x']])}}{${den}}`, String.raw`\frac{${2 * m * n}}{x^2+${n * n}}`, String.raw`\frac{${2 * m * n}}{x}`]
        : [String.raw`\frac{${2 * m}}{${den}}`, String.raw`\frac{${2 * m * n}}{${den}}`, String.raw`\frac{${terms([[2 * m, 'x']])}}{x^2+${n * n}}`, String.raw`\frac{${2 * m}}{x}`];
    return {
      topic: 18,
      est: 100,
      stem: st(G.simplify, expr),
      correct: res,
      wrong,
      solution: (l) =>
        S(
          l,
          T(`Umumiy maxraj: $(x-${n})(x+${n})=${den}$.`, `Общий знаменатель: $(x-${n})(x+${n})=${den}$.`, `Ulıwma bólim: $(x-${n})(x+${n})=${den}$.`, `Common denominator: $(x-${n})(x+${n})=${den}$.`),
          disp(String.raw`${expr}=\frac{${mul(`x+${n}`)}${op}${mul(`x-${n}`)}}{${den}}=\frac{${terms([[m, 'x'], [m * n, ''], [sgn * m, 'x'], [-sgn * m * n, '']])}}{${den}}=${res}`),
        ),
      mistake: mk(T("Qo'shish/ayirishda maxrajlarni qo'shib yuborish yoki surat qavsini ochganda ishorani adashtirish.", 'Складывать знаменатели или путать знак при раскрытии скобок в числителе.', 'Qosıw/ayırıwda bólimlerdi qosıp jiberiw yamasa alım qawsırmasın ashqanda belgini shatastırıw.', 'Adding denominators, or a sign error when expanding the brackets in the numerator.')),
      check: [[m / (x0 - n) + sgn * (m / (x0 + n)), (op === '-' ? 2 * m * n : 2 * m * x0) / (x0 * x0 - n * n)]],
    };
  },
);

// 11. Maxrajni irratsionallikdan qutqarish (19)
interface RatzP { c: number; m: number; k: number; plus: boolean }
const tRatz = tpl<RatzP>(
  'alg-rationalize',
  (r) => {
    for (;;) {
      const c = r.int(1, 4);
      const m = c * c + r.int(2, 14);
      if (!isSquare(m)) return { c, m, k: r.int(1, 4), plus: r.chance(0.5) };
    }
  },
  ({ c, m, k, plus }) => {
    const d = m - c * c;
    const p = k * d;
    if (p > 70) throw new Error('katta');
    const expr = String.raw`\frac{${p}}{\sqrt{${m}}${plus ? '+' : '-'}${c}}`;
    const conj = String.raw`\sqrt{${m}}${plus ? '-' : '+'}${c}`;
    const res = `${rootTex(k, m)}${plus ? '-' : '+'}${k * c}`;
    const opp = `${rootTex(k, m)}${plus ? '+' : '-'}${k * c}`;
    return {
      topic: 19,
      est: 90,
      stem: st(G.rationalize, expr),
      correct: res,
      wrong: [opp, `${rootTex(p, m)}${plus ? '-' : '+'}${p * c}`, rootTex(k, m), `${rootTex(k, m)}${plus ? '-' : '+'}${c}`, `${rootTex(p, m)}${plus ? '+' : '-'}${p * c}`],
      solution: (l) =>
        S(
          l,
          T("Surat va maxrajni maxrajga qo'shma ifodaga ko'paytiramiz:", 'Умножим числитель и знаменатель на сопряжённое выражение знаменателя:', 'Alım hám bólimdi bólimge qospa ańlatpaǵa kóbeytemiz:', 'Multiply the numerator and denominator by the conjugate of the denominator:'),
          disp(String.raw`${expr}=\frac{${p}\left(${conj}\right)}{\left(\sqrt{${m}}${plus ? '+' : '-'}${c}\right)\left(${conj}\right)}=\frac{${p}\left(${conj}\right)}{${m}-${c * c}}=\frac{${p}\left(${conj}\right)}{${d}}=${k === 1 ? String.raw`\left(${conj}\right)` : String.raw`${k}\left(${conj}\right)=${res}`}`),
        ),
      mistake: mk(T("Qo'shma ifodaning ishorasini noto'g'ri tanlash yoki maxrajni $m-c^2$ o'rniga $m+c^2$ deb hisoblash.", 'Неверно выбирать знак сопряжённого выражения или считать знаменатель как $m+c^2$.', 'Qospa ańlatpanıń belgisin qate saylaw yamasa bólimdi $m-c^2$ ornına $m+c^2$ dep esaplaw.', 'Choosing the wrong sign for the conjugate or computing the denominator as $m+c^2$.')),
      check: [[p / (Math.sqrt(m) + (plus ? c : -c)), k * Math.sqrt(m) + (plus ? -k * c : k * c)]],
    };
  },
);

// 12. Ildizli ifodalarni soddalashtirish (20)
interface SimpP { m: number; a: number; b: number; c: number; s1: number; s2: number }
const tSimpRoot = tpl<SimpP>(
  'alg-simproot',
  (r) => {
    for (;;) {
      const a = r.int(2, 7);
      const b = r.int(2, 7);
      const c = r.int(2, 7);
      if (a !== b && b !== c && a !== c) return { m: r.pick([2, 3, 5, 6, 7, 10, 11]), a, b, c, s1: r.pick([1, -1]), s2: r.pick([1, -1]) };
    }
  },
  ({ m, a, b, c, s1, s2 }) => {
    const sum = a + s1 * b + s2 * c;
    if (sum === 0) throw new Error('nol');
    const A = m * a * a;
    const B = m * b * b;
    const C = m * c * c;
    const expr = String.raw`\sqrt{${A}}${s1 > 0 ? '+' : '-'}\sqrt{${B}}${s2 > 0 ? '+' : '-'}\sqrt{${C}}`;
    const combos = [a + b + c, a + b - c, a - b + c, a - b - c, sum + 1, sum - 1].filter((v) => v !== sum && v !== 0);
    return {
      topic: 20,
      est: 85,
      stem: st(G.simplify, expr),
      correct: rootTex(sum, m),
      wrong: [...combos.map((v) => rootTex(v, m)), String(sum)],
      solution: (l) =>
        S(
          l,
          T("Har bir ildiz ostidan to'liq kvadratni chiqaramiz:", 'Вынесем из-под каждого корня полный квадрат:', 'Hár bir túbir astınan tolıq kvadratti shıǵaramız:', 'Take the perfect square out of each radical:'),
          disp(String.raw`\sqrt{${A}}=${a}\sqrt{${m}},\quad \sqrt{${B}}=${b}\sqrt{${m}},\quad \sqrt{${C}}=${c}\sqrt{${m}}`),
          disp(String.raw`${expr}=(${a}${signed(s1 * b)}${signed(s2 * c)})\sqrt{${m}}=${rootTex(sum, m)}`),
        ),
      mistake: mk(T("Ildiz ostidagi sonlarni qo'shib yuborish: $\\sqrt{a}+\\sqrt{b}=\\sqrt{a+b}$ deb o'ylash.", String.raw`Складывать подкоренные выражения: считать, что $\sqrt{a}+\sqrt{b}=\sqrt{a+b}$.`, String.raw`Túbir astındaǵı sanlardı qosıp jiberiw: $\sqrt{a}+\sqrt{b}=\sqrt{a+b}$ dep oylaw.`, String.raw`Adding radicands: assuming $\sqrt{a}+\sqrt{b}=\sqrt{a+b}$.`)),
      check: [[Math.sqrt(A) + s1 * Math.sqrt(B) + s2 * Math.sqrt(C), sum * Math.sqrt(m)]],
    };
  },
);

// 13. Logarifmlar yig'indisi/ayirmasi (21)
interface LogP { form: number; r: number; k: number; x: number; y: number }
const divisors = (n: number): number[] => Array.from({ length: n - 1 }, (_, i) => i + 2).filter((d) => n % d === 0 && d < n);
const LOG_RULE = T(
  String.raw`Logarifm xossalari: $\log_a x+\log_a y=\log_a(xy)$, $\log_a x-\log_a y=\log_a\dfrac{x}{y}$, $\log_a a^k=k$.`,
  String.raw`Свойства логарифмов: $\log_a x+\log_a y=\log_a(xy)$, $\log_a x-\log_a y=\log_a\dfrac{x}{y}$, $\log_a a^k=k$.`,
  String.raw`Logarifm qásiyetleri: $\log_a x+\log_a y=\log_a(xy)$, $\log_a x-\log_a y=\log_a\dfrac{x}{y}$, $\log_a a^k=k$.`,
  String.raw`Logarithm rules: $\log_a x+\log_a y=\log_a(xy)$, $\log_a x-\log_a y=\log_a\dfrac{x}{y}$, $\log_a a^k=k$.`,
);
const tLog = tpl<LogP>(
  'alg-log',
  (r) => {
    const form = r.int(0, 1);
    if (form === 0) {
      for (;;) {
        const rr = r.pick([2, 3, 5, 6, 10, 12]);
        const k = r.int(2, 3);
        const N = rr ** k;
        const x = r.pick(divisors(N));
        if (x !== rr && N / x !== rr) return { form, r: rr, k, x, y: N / x };
      }
    }
    const rr = r.pick([2, 3, 5]);
    const k = r.int(1, 3);
    const y = r.int(2, 9);
    return { form, r: rr, k, x: y * rr ** k, y };
  },
  ({ form, r: rr, k, x, y }) => {
    const expr = form === 0 ? String.raw`\log_{${rr}} ${x}+\log_{${rr}} ${y}` : String.raw`\log_{${rr}} ${x}-\log_{${rr}} ${y}`;
    const chain =
      form === 0
        ? String.raw`${expr}=\log_{${rr}}(${x}\cdot ${y})=\log_{${rr}} ${x * y}=\log_{${rr}} ${rr}^{${k}}=${k}`
        : String.raw`${expr}=\log_{${rr}}\frac{${x}}{${y}}=\log_{${rr}} ${x / y}${k === 1 ? '' : String.raw`=\log_{${rr}} ${rr}^{${k}}`}=${k}`;
    const direct = form === 0 ? (Math.log(x) + Math.log(y)) / Math.log(rr) : (Math.log(x) - Math.log(y)) / Math.log(rr);
    return {
      topic: 21,
      est: 70,
      stem: st(G.calc, expr),
      correct: String(k),
      wrong: [k + 1, k - 1, 2 * k, rr * k].map(String),
      solution: (l) => S(l, LOG_RULE, disp(chain)),
      mistake: mk(T("Logarifmlar yig'indisini sonlar yig'indisining logarifmi deb olish: $\\log_a x+\\log_a y=\\log_a(x+y)$.", String.raw`Считать, что $\log_a x+\log_a y=\log_a(x+y)$.`, String.raw`Logarifmler qosındısın sanlar qosındısınıń logarifmi dep alıw: $\log_a x+\log_a y=\log_a(x+y)$.`, String.raw`Believing that $\log_a x+\log_a y=\log_a(x+y)$.`)),
      check: [[direct, k]],
    };
  },
);

// 14. Logarifm asosi darajasi (21)
interface LogBP { b: number; s: number; t: number }
const tLogBase = tpl<LogBP>(
  'alg-logbase',
  (r) => ({ b: r.int(2, 5), s: r.int(2, 4), t: r.int(1, 5) }),
  ({ b, s, t }) => {
    if (s === t || b ** s > 700 || b ** t > 700) throw new Error('chegara');
    const B = b ** s;
    const A = b ** t;
    const ans = frac(t, s);
    const expr = String.raw`\log_{${B}} ${A}`;
    return {
      topic: 21,
      est: 80,
      stem: st(G.calc, expr),
      correct: texFrac(ans),
      wrong: [frac(s, t), frac(t * s), frac(t + s), frac(t, s + 1), frac(t, b * s)].map(texFrac),
      solution: (l) =>
        S(
          l,
          T(String.raw`Asos darajasi uchun: $\log_{a^s}a^t=\dfrac{t}{s}$.`, String.raw`Для степени в основании: $\log_{a^s}a^t=\dfrac{t}{s}$.`, String.raw`Tiykar dárejesi ushın: $\log_{a^s}a^t=\dfrac{t}{s}$.`, String.raw`For a power in the base: $\log_{a^s}a^t=\dfrac{t}{s}$.`),
          disp(String.raw`${expr}=\log_{${b}^{${s}}} ${b}^{${t}}=\frac{${t}}{${s}}${gcd(t, s) > 1 ? `=${texFrac(ans)}` : ''}`),
        ),
      mistake: mk(T("Daraja ko'rsatkichlarini teskari qo'yish: $\\dfrac{s}{t}$ o'rniga $\\dfrac{t}{s}$ yozish kerak.", String.raw`Перевернуть отношение показателей: нужно $\dfrac{t}{s}$, а не $\dfrac{s}{t}$.`, String.raw`Dáreje kórsetkishlerin teris qoyıw: $\dfrac{s}{t}$ ornına $\dfrac{t}{s}$ jazıw kerek.`, String.raw`Inverting the ratio of exponents: it must be $\dfrac{t}{s}$, not $\dfrac{s}{t}$.`)),
      check: [[Math.log(A) / Math.log(B), t / s]],
    };
  },
);

// 15. Asosiy trigonometrik ayniyat (22)
interface TrigP { tri: readonly [number, number, number]; swap: boolean; qd: Quadrant; target: 'cos' | 'tan' }
const AND = T('va', 'и', 'hám', 'and');
const tTrigId = tpl<TrigP>(
  'alg-trigid',
  (r) => ({ tri: r.pick(TRIPLES), swap: r.chance(0.5), qd: r.pick([1, 2, 3, 4] as const), target: r.pick(['cos', 'tan'] as const) }),
  ({ tri, swap, qd, target }) => {
    const [x, y, z] = tri;
    const sa = swap ? y : x;
    const ca = swap ? x : y;
    const sinV = frac(sinSign(qd) * sa, z);
    const cosV = frac(cosSign(qd) * ca, z);
    const tanV = fDiv(sinV, cosV);
    const correct = target === 'cos' ? cosV : tanV;
    const want = target === 'cos' ? String.raw`\cos\alpha` : String.raw`\operatorname{tg}\alpha`;
    const neg = (f: Frac) => frac(-f.n, f.d);
    const rec = (f: Frac) => frac(f.d, f.n);
    const wrong = target === 'cos' ? [neg(cosV), rec(cosV), tanV, neg(tanV), rec(tanV)] : [neg(tanV), rec(tanV), cosV, sinV, neg(cosV)];
    const FIND = T('Toping:', 'Найдите:', 'Tabıń:', 'Find:');
    const cosSq = frac(ca * ca, z * z);
    const cosSignTxt = cosSign(qd) > 0 ? '>0' : '<0';
    return {
      topic: 22,
      est: 90,
      stem: (l) => `${inl(String.raw`\sin\alpha=${texFrac(sinV)}`)} ${AND[l]} ${inQuadrant(l, qd)}. ${FIND[l]} ${inl(want)}.`,
      correct: texFrac(correct),
      wrong: wrong.map(texFrac),
      solution: (l) =>
        S(
          l,
          T(String.raw`Asosiy ayniyat: $\sin^2\alpha+\cos^2\alpha=1$.`, String.raw`Основное тождество: $\sin^2\alpha+\cos^2\alpha=1$.`, String.raw`Tiykarǵı ayniyat: $\sin^2\alpha+\cos^2\alpha=1$.`, String.raw`Fundamental identity: $\sin^2\alpha+\cos^2\alpha=1$.`),
          disp(String.raw`\cos^2\alpha=1-\left(${texFrac(sinV)}\right)^2=${texFrac(cosSq)},\qquad \cos\alpha=\pm${texFrac(frac(ca, z))}`),
          T(`Chorak bo'yicha ishorani aniqlaymiz: bu chorakda $\\cos\\alpha${cosSignTxt}$.`, `Определим знак по четверти: здесь $\\cos\\alpha${cosSignTxt}$.`, `Sherek boyınsha belgini anıqlaymız: bul sherekte $\\cos\\alpha${cosSignTxt}$.`, `Determine the sign from the quadrant: here $\\cos\\alpha${cosSignTxt}$.`),
          disp(target === 'cos' ? String.raw`\cos\alpha=${texFrac(cosV)}` : String.raw`\cos\alpha=${texFrac(cosV)},\qquad \operatorname{tg}\alpha=\frac{\sin\alpha}{\cos\alpha}=${texFrac(tanV)}`),
        ),
      mistake: mk(T("Chorakka qarab ishorani hisobga olmaslik (kvadrat ildizdan faqat musbat qiymat olish).", 'Не учитывать знак по четверти (брать только положительное значение корня).', 'Sherekke qaray belgini esapqa almaw (kvadrat túbirden tek oń mánisti alıw).', 'Ignoring the sign determined by the quadrant (taking only the positive root).')),
      check: [[target === 'cos' ? cosSign(qd) * Math.sqrt(1 - (sa / z) ** 2) : (sinSign(qd) * sa) / z / (cosSign(qd) * Math.sqrt(1 - (sa / z) ** 2)), fnum(correct)]],
    };
  },
);

// 16. Keltirish formulalari: aniq qiymat (23)
interface RedValP { fn: TrigFn; base: number; plus: boolean; th: number; rad: boolean }
const tReduceVal = tpl<RedValP>(
  'alg-redval',
  (r) => ({ fn: r.pick(TRIG_FNS), base: r.pick([90, 180, 270, 360]), plus: r.chance(0.6), th: r.pick([30, 45, 60]), rad: r.chance(0.4) }),
  ({ fn, base, plus, th, rad }) => {
    const ang = plus ? base + th : base - th;
    if (ang <= 90 || ang > 360) throw new Error('burchak');
    const val = exactTrig(fn, ang);
    const swapFn = base === 90 || base === 270 ? coFn(fn) : fn;
    const sign = trigNum(fn, ang) < 0 ? '-' : '';
    const nm = trigName(fn);
    const stemAngle = rad ? radTex(ang) : degTex(ang);
    const expr = String.raw`${nm}\,${stemAngle}`;
    const redAngle = String.raw`${base}^\circ${plus ? '+' : '-'}${th}^\circ`;
    const lead = rad ? String.raw`${expr}=${nm}\,${degTex(ang)}=` : `${expr}=`;
    const chain = String.raw`${lead}${nm}\left(${redAngle}\right)=${sign}${trigName(swapFn)}\,${degTex(th)}=${qTex(val)}`;
    const wrong: string[] = [qTex(qNeg(val))];
    for (const f of [coFn(fn), ...TRIG_FNS.filter((t) => t !== fn && t !== coFn(fn))]) {
      const e = safeExact(f, ang);
      if (e) wrong.push(qTex(e), qTex(qNeg(e)));
    }
    return {
      topic: 23,
      est: 75,
      stem: st(G.calc, expr),
      correct: qTex(val),
      wrong,
      solution: (l) =>
        S(
          l,
          T(
            "Keltirish qoidasi: $90^\\circ$ yoki $270^\\circ$ da funksiya nomi o'zgaradi, $180^\\circ$ yoki $360^\\circ$ da o'zgarmaydi; ishora esa dastlabki funksiyaning shu chorakdagi ishorasi bilan aniqlanadi.",
            'Правило приведения: при $90^\\circ$ и $270^\\circ$ название функции меняется, при $180^\\circ$ и $360^\\circ$ не меняется; знак определяется знаком исходной функции в данной четверти.',
            "Keltiriw qaǵıydası: $90^\\circ$ yamasa $270^\\circ$ da funkciya atı ózgeredi, $180^\\circ$ yamasa $360^\\circ$ da ózgermeydi; belgi dáslepki funkciyanıń usı sherektegi belgisi menen anıqlanadı.",
            'Reduction rule: at $90^\\circ$ and $270^\\circ$ the function name changes, at $180^\\circ$ and $360^\\circ$ it stays; the sign is that of the original function in that quadrant.',
          ),
          disp(chain),
        ),
      mistake: mk(T("Ishorani yoki funksiya nomini almashtirishni unutish ($\\sin 150^\\circ$ ni $-\\dfrac12$ deb yozish kabi).", 'Забыть про знак или замену названия функции (например, считать $\\sin 150^\\circ=-\\dfrac12$).', "Belgini yamasa funkciya atın almastırıwdı umıtıw ($\\sin 150^\\circ$ di $-\\dfrac12$ dep jazıw sıyaqlı).", 'Forgetting the sign or the change of function name (e.g. taking $\\sin 150^\\circ=-\\dfrac12$).')),
      check: [[trigNum(fn, ang), qNum(val)]],
    };
  },
  ({ fn, base, plus, th, rad }) => JSON.stringify([fn, plus ? base + th : base - th, rad]),
);

// 17. Keltirish formulalari: soddalashtirish (23)
interface RedSimP { fn: TrigFn; base: number; plus: boolean; rad: boolean }
const tReduceSimp = tpl<RedSimP>(
  'alg-redsimp',
  (r) => ({ fn: r.pick(TRIG_FNS), base: r.pick([90, 180, 270, 360]), plus: r.chance(0.5), rad: r.chance(0.5) }),
  ({ fn, base, plus, rad }) => {
    const ev = (g: TrigFn, a: number) => trigNum(g, a);
    const a0 = 17;
    const orig = (a: number) => ev(fn, plus ? base + a : base - a);
    let found: { g: TrigFn; s: number } | undefined;
    for (const g of TRIG_FNS) {
      for (const s of [1, -1]) {
        if ([a0, 41, 63].every((a) => Math.abs(orig(a) - s * ev(g, a)) < 1e-9)) found = { g, s };
      }
    }
    if (!found) throw new Error('topilmadi');
    const { g, s } = found;
    const baseTex = rad ? radTex(base) : degTex(base);
    const expr = String.raw`${trigName(fn)}\left(${baseTex}${plus ? '+' : '-'}\alpha\right)`;
    const res = `${s < 0 ? '-' : ''}${trigName(g)}\\alpha`;
    const wrong: string[] = [];
    const others = TRIG_FNS.filter((t) => t !== g);
    wrong.push(`${s < 0 ? '' : '-'}${trigName(g)}\\alpha`);
    for (const t of [coFn(g), ...others.filter((t) => t !== coFn(g))]) wrong.push(`${s < 0 ? '-' : ''}${trigName(t)}\\alpha`, `${s < 0 ? '' : '-'}${trigName(t)}\\alpha`);
    const qd: Quadrant = (plus ? { 90: 2, 180: 3, 270: 4, 360: 1 } : { 90: 1, 180: 2, 270: 3, 360: 4 })[base as 90 | 180 | 270 | 360] as Quadrant;
    const origSign = Math.sign(orig(a0));
    const changes = base === 90 || base === 270;
    return {
      topic: 23,
      est: 75,
      stem: st(G.simplify, expr),
      correct: res,
      wrong,
      solution: (l) =>
        S(
          l,
          T(
            `1) ${changes ? 'Funksiya nomi o\'zgaradi (burchakda $90^\\circ$ yoki $270^\\circ$ bor)' : 'Funksiya nomi o\'zgarmaydi (burchakda $180^\\circ$ yoki $360^\\circ$ bor)'}. 2) $\\alpha$ o'tkir deb olsak, burchak ${ROMAN[qd]} chorakda yotadi, u yerda dastlabki funksiya ${sgnWord(origSign)[l]}.`,
            `1) ${changes ? 'Название функции меняется (в угле есть $90^\\circ$ или $270^\\circ$)' : 'Название функции не меняется (в угле есть $180^\\circ$ или $360^\\circ$)'}. 2) Считая $\\alpha$ острым, угол лежит ${qd === 2 ? 'во' : 'в'} ${ROMAN[qd]} четверти, где исходная функция ${sgnWord(origSign)[l]}.`,
            `1) ${changes ? 'Funkciya atı ózgeredi (múyeshte $90^\\circ$ yamasa $270^\\circ$ bar)' : 'Funkciya atı ózgermeydi (múyeshte $180^\\circ$ yamasa $360^\\circ$ bar)'}. 2) $\\alpha$ ótkir dep alsaq, múyesh ${ROMAN[qd]} sherekte jatadı, ol jerde dáslepki funkciya ${sgnWord(origSign)[l]}.`,
            `1) ${changes ? 'The function name changes (the angle contains $90^\\circ$ or $270^\\circ$)' : 'The function name stays (the angle contains $180^\\circ$ or $360^\\circ$)'}. 2) For acute $\\alpha$ the angle lies in quadrant ${ROMAN[qd]}, where the original function is ${sgnWord(origSign)[l]}.`,
          ),
          disp(String.raw`${expr}=${res}`),
        ),
      mistake: mk(T("Funksiya nomini o'zgartirish qoidasini yoki chorak ishorasini unutish.", 'Забыть правило замены названия функции или знак по четверти.', 'Funkciya atın almastırıw qaǵıydasın yamasa sherek belgisin umıtıw.', 'Forgetting the rule for changing the function name, or the sign of the quadrant.')),
      check: [0.7, 0.2, 1.1].map((a) => [orig(a), s * ev(g, a)] as const),
    };
  },
);

// 18. Yig'indi/ayirma va ikkilangan burchak formulalari (24)
interface AngP { form: number; a: number; b: number; th: number }
const tAngle = tpl<AngP>(
  'alg-angle',
  (r) => {
    const form = r.int(0, 6);
    if (form <= 1) {
      const th = r.pick([30, 45, 60, 90, 120, 135, 150].filter((t) => t >= 30));
      const opts: number[] = [];
      for (let a = 10; a <= th - 10; a += 5) opts.push(a);
      const a = r.pick(opts);
      return { form, a, b: th - a, th };
    }
    if (form <= 3) {
      const th = r.pick([30, 45, 60, 90, 120, 135, 150]);
      const b = r.pick([10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
      return { form, a: th + b, b, th };
    }
    const a = r.pick([15, 30, 45, 60, 75]);
    return { form, a, b: a, th: 2 * a };
  },
  ({ form, a, b, th }) => {
    const sa = String.raw`\sin ${a}^\circ`;
    const cb = String.raw`\cos ${b}^\circ`;
    const ca = String.raw`\cos ${a}^\circ`;
    const sb = String.raw`\sin ${b}^\circ`;
    const exprs = [
      `${sa}${cb}+${ca}${sb}`,
      `${ca}${cb}-${sa}${sb}`,
      `${sa}${cb}-${ca}${sb}`,
      `${ca}${cb}+${sa}${sb}`,
      String.raw`2\sin ${a}^\circ\cos ${a}^\circ`,
      String.raw`\cos^2 ${a}^\circ-\sin^2 ${a}^\circ`,
      String.raw`2\cos^2 ${a}^\circ-1`,
    ];
    const formulas = [
      String.raw`\sin(\alpha+\beta)=\sin\alpha\cos\beta+\cos\alpha\sin\beta`,
      String.raw`\cos(\alpha+\beta)=\cos\alpha\cos\beta-\sin\alpha\sin\beta`,
      String.raw`\sin(\alpha-\beta)=\sin\alpha\cos\beta-\cos\alpha\sin\beta`,
      String.raw`\cos(\alpha-\beta)=\cos\alpha\cos\beta+\sin\alpha\sin\beta`,
      String.raw`\sin 2\alpha=2\sin\alpha\cos\alpha`,
      String.raw`\cos 2\alpha=\cos^2\alpha-\sin^2\alpha`,
      String.raw`\cos 2\alpha=2\cos^2\alpha-1`,
    ];
    const fnRes: TrigFn[] = ['sin', 'cos', 'sin', 'cos', 'sin', 'cos', 'cos'];
    const fr = fnRes[form]!;
    const val = exactTrig(fr, th);
    const arg = form <= 1 ? `${a}^\\circ+${b}^\\circ` : form <= 3 ? `${a}^\\circ-${b}^\\circ` : `2\\cdot ${a}^\\circ`;
    const expr = exprs[form]!;
    const direct = [
      Math.sin((a * Math.PI) / 180) * Math.cos((b * Math.PI) / 180) + Math.cos((a * Math.PI) / 180) * Math.sin((b * Math.PI) / 180),
      Math.cos((a * Math.PI) / 180) * Math.cos((b * Math.PI) / 180) - Math.sin((a * Math.PI) / 180) * Math.sin((b * Math.PI) / 180),
      Math.sin((a * Math.PI) / 180) * Math.cos((b * Math.PI) / 180) - Math.cos((a * Math.PI) / 180) * Math.sin((b * Math.PI) / 180),
      Math.cos((a * Math.PI) / 180) * Math.cos((b * Math.PI) / 180) + Math.sin((a * Math.PI) / 180) * Math.sin((b * Math.PI) / 180),
      2 * Math.sin((a * Math.PI) / 180) * Math.cos((a * Math.PI) / 180),
      Math.cos((a * Math.PI) / 180) ** 2 - Math.sin((a * Math.PI) / 180) ** 2,
      2 * Math.cos((a * Math.PI) / 180) ** 2 - 1,
    ][form]!;
    const wrong: string[] = [qTex(qNeg(val))];
    for (const f of TRIG_FNS) {
      const e = safeExact(f, th);
      if (e) wrong.push(qTex(e), qTex(qNeg(e)));
    }
    return {
      topic: 24,
      est: 90,
      stem: st(G.calc, expr),
      correct: qTex(val),
      wrong,
      solution: (l) =>
        S(
          l,
          T("Mos formuladan foydalanamiz:", 'Применим соответствующую формулу:', 'Sáykes formuladan paydalanamız:', 'Use the matching formula:'),
          disp(formulas[form]!),
          disp(String.raw`${expr}=${trigName(fr)}\left(${arg}\right)=${trigName(fr)}\,${degTex(th)}=${qTex(val)}`),
        ),
      mistake: mk(T("Formuladagi ishorani adashtirish ($\\cos(\\alpha+\\beta)$ da ayirma o'rniga yig'indi yozish).", 'Перепутать знак в формуле (например, в $\\cos(\\alpha+\\beta)$ поставить плюс вместо минуса).', "Formuladaǵı belgini shatastırıw ($\\cos(\\alpha+\\beta)$ de ayırma ornına qosındı jazıw).", 'Mixing up the sign in the formula (e.g. a plus instead of a minus in $\\cos(\\alpha+\\beta)$).')),
      check: [[direct, qNum(val)]],
    };
  },
);

// 19. Ko'paytmani yig'indiga keltirish (25)
interface PsP { op: number; a: number; b: number }
const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
const PS_PAIRS: Array<[number, number]> = [];
for (const u of SPECIAL) for (const v of SPECIAL) if (u > v && (u + v) % 2 === 0 && (u + v) / 2 <= 165 && (u + v) / 2 !== 90 && (u - v) / 2 !== 90 && (u - v) / 2 > 0) PS_PAIRS.push([(u + v) / 2, (u - v) / 2]);
const half = frac(1, 2);
const tProdSum = tpl<PsP>(
  'alg-prodsum',
  (r) => {
    const [a, b] = r.pick(PS_PAIRS);
    return { op: r.int(0, 2), a, b };
  },
  ({ op, a, b }) => {
    if (b === 0 || a === b) throw new Error('trivial');
    const u = a + b;
    const v = a - b;
    const s = (f: TrigFn, d: number) => exactTrig(f, d);
    let raw: Q;
    let alt: Q;
    let expr: string;
    let formula: string;
    let mid: string;
    let direct: number;
    const rd = (d: number) => (d * Math.PI) / 180;
    const pq = (x: Q) => (qNum(x) < 0 ? String.raw`\left(${qTex(x)}\right)` : qTex(x));
    if (op === 0) {
      raw = qAdd(s('sin', u), s('sin', v));
      alt = qAdd(s('sin', u), qNeg(s('sin', v)));
      expr = String.raw`\sin ${a}^\circ\cos ${b}^\circ`;
      formula = String.raw`\sin\alpha\cos\beta=\frac{1}{2}\left(\sin(\alpha+\beta)+\sin(\alpha-\beta)\right)`;
      mid = String.raw`\frac{1}{2}\left(\sin ${u}^\circ+\sin ${v}^\circ\right)=\frac{1}{2}\left(${qTex(s('sin', u))}+${pq(s('sin', v))}\right)`;
      direct = Math.sin(rd(a)) * Math.cos(rd(b));
    } else if (op === 1) {
      raw = qAdd(s('cos', u), s('cos', v));
      alt = qAdd(s('cos', u), qNeg(s('cos', v)));
      expr = String.raw`\cos ${a}^\circ\cos ${b}^\circ`;
      formula = String.raw`\cos\alpha\cos\beta=\frac{1}{2}\left(\cos(\alpha+\beta)+\cos(\alpha-\beta)\right)`;
      mid = String.raw`\frac{1}{2}\left(\cos ${u}^\circ+\cos ${v}^\circ\right)=\frac{1}{2}\left(${qTex(s('cos', u))}+${pq(s('cos', v))}\right)`;
      direct = Math.cos(rd(a)) * Math.cos(rd(b));
    } else {
      raw = qAdd(s('cos', v), qNeg(s('cos', u)));
      alt = qAdd(s('cos', v), s('cos', u));
      expr = String.raw`\sin ${a}^\circ\sin ${b}^\circ`;
      formula = String.raw`\sin\alpha\sin\beta=\frac{1}{2}\left(\cos(\alpha-\beta)-\cos(\alpha+\beta)\right)`;
      mid = String.raw`\frac{1}{2}\left(\cos ${v}^\circ-\cos ${u}^\circ\right)=\frac{1}{2}\left(${qTex(s('cos', v))}-${pq(s('cos', u))}\right)`;
      direct = Math.sin(rd(a)) * Math.sin(rd(b));
    }
    if (qIsZeroSafe(raw)) throw new Error('nol');
    const val = qScale(raw, half);
    return {
      topic: 25,
      est: 100,
      stem: st(G.calc, expr),
      correct: qTex(val),
      wrong: [qTex(raw), qTex(qScale(alt, half)), qTex(alt), qTex(qNeg(val))],
      solution: (l) =>
        S(
          l,
          T("Ko'paytmani yig'indiga keltirish formulasi:", 'Формула преобразования произведения в сумму:', 'Kóbeymeni qosındıǵa keltiriw formulası:', 'Product-to-sum formula:'),
          disp(formula),
          disp(String.raw`${expr}=${mid}=${qTex(val)}`),
        ),
      mistake: mk(T("Formuladagi $\\dfrac12$ ko'paytuvchini tushirib qoldirish yoki yig'indi/ayirma ishorasini adashtirish.", 'Потерять множитель $\\dfrac12$ или перепутать знак между слагаемыми.', "Formuladaǵı $\\dfrac12$ kóbeytiwshini túsirip qaldırıw yamasa qosındı/ayırma belgisin shatastırıw.", 'Dropping the factor $\\dfrac12$ or mixing up the sign between the terms.')),
      check: [[direct, qNum(val)]],
    };
  },
);
function qIsZeroSafe(x: Q): boolean {
  return Math.abs(qNum(x)) < 1e-12;
}

// 20. Trigonometrik ifoda qiymati (26)
interface TrEvP { f1: TrigFn; f2: TrigFn; f3: TrigFn; t1: number; t2: number; t3: number; k: number; minus: boolean }
const ANGLES: Record<TrigFn, readonly number[]> = {
  sin: [30, 45, 60, 120, 135, 150],
  cos: [30, 45, 60, 120, 135, 150],
  tan: [30, 45, 60, 120, 135, 150],
  cot: [30, 45, 60, 120, 135, 150],
};
const tTrigEval = tpl<TrEvP>(
  'alg-trigeval',
  (r) => {
    const f1 = r.pick(TRIG_FNS);
    const f2 = r.pick(TRIG_FNS);
    const f3 = r.pick(TRIG_FNS);
    return { f1, f2, f3, t1: r.pick(ANGLES[f1]), t2: r.pick(ANGLES[f2]), t3: r.pick(ANGLES[f3]), k: r.pick([1, 1, 2]), minus: r.chance(0.5) };
  },
  ({ f1, f2, f3, t1, t2, t3, k, minus }) => {
    const e1 = exactTrig(f1, t1);
    const e2 = exactTrig(f2, t2);
    const e3 = exactTrig(f3, t3);
    const prod = qScale(qMul(e1, e2), frac(k));
    const sgn = minus ? -1 : 1;
    const total = qAdd(prod, qScale(e3, frac(sgn)));
    if (Math.abs(qNum(total)) < 1e-12 || Math.abs(qNum(prod)) < 1e-12 || Math.abs(qNum(e3)) < 1e-12) throw new Error('nol');
    const pq = (x: Q) => (qNum(x) < 0 ? String.raw`\left(${qTex(x)}\right)` : qTex(x));
    const part = (f: TrigFn, t: number) => String.raw`${trigName(f)}\,${degTex(t)}`;
    const kk = k === 1 ? '' : `${k}\\cdot `;
    const expr = `${kk}${part(f1, t1)}\\cdot ${part(f2, t2)}${minus ? '-' : '+'}${part(f3, t3)}`;
    const sub = `${kk}${pq(e1)}\\cdot ${pq(e2)}${minus ? '-' : '+'}${pq(e3)}`;
    const direct = k * trigNum(f1, t1) * trigNum(f2, t2) + sgn * trigNum(f3, t3);
    return {
      topic: 26,
      est: 100,
      stem: st(G.value, expr),
      correct: qTex(total),
      wrong: [qTex(qAdd(prod, qScale(e3, frac(-sgn)))), qTex(qAdd(qNeg(prod), qScale(e3, frac(sgn)))), qTex(qNeg(total)), qTex(prod), qTex(e3)],
      solution: (l) =>
        S(
          l,
          T("Jadval qiymatlarini (kerak bo'lsa keltirish formulalari bilan) qo'yamiz:", 'Подставим табличные значения (при необходимости используя формулы приведения):', "Kesteli mánislerdi (kerek bolsa keltiriw formulaları menen) qoyamız:", 'Substitute the table values (using reduction formulas when needed):'),
          disp(String.raw`${expr}=${sub}=${qTex(prod)}${minus ? '-' : '+'}${pq(e3)}=${qTex(total)}`),
        ),
      mistake: mk(T("Burchak ikkinchi chorakda bo'lganda funksiya ishorasini hisobga olmaslik.", 'Не учитывать знак функции, когда угол во второй четверти.', 'Múyesh ekinshi sherekte bolǵanda funkciya belgisin esapqa almaw.', 'Ignoring the sign of the function when the angle is in the second quadrant.')),
      check: [[direct, qNum(total)]],
    };
  },
);

// 21. Modul belgisini ochish (27)
interface AbsP { a: number; s: number; less: boolean }
const tAbs = tpl<AbsP>(
  'alg-abs',
  (r) => ({ a: nz(r, -9, 9), s: r.pick([1, -1]), less: r.chance(0.5) }),
  ({ a, s, less }) => {
    const inner = terms([[s, 'x'], [-s * a, '']]);
    const x0 = less ? a - 1.7 : a + 1.7;
    const sign = s * (x0 - a) > 0 ? 1 : -1;
    const c1 = sign * s;
    const c0 = -sign * s * a;
    const res = terms([[c1, 'x'], [c0, '']]);
    const wrong = [terms([[-c1, 'x'], [-c0, '']]), terms([[c1, 'x'], [-c0, '']]), terms([[-c1, 'x'], [c0, '']])];
    const cond = `x${less ? '<' : '>'}${a}`;
    const expr = `|${inner}|`;
    const ok = sign > 0;
    return {
      topic: 27,
      est: 70,
      stem: (l) =>
        ({
          uz: `Agar ${inl(cond)} bo'lsa, ifodani modulsiz yozing: ${inl(expr)}.`,
          ru: `Если ${inl(cond)}, запишите выражение без знака модуля: ${inl(expr)}.`,
          kaa: `Eger ${inl(cond)} bolsa, ańlatpanı modulsız jazıń: ${inl(expr)}.`,
          en: `If ${inl(cond)}, rewrite the expression without the absolute value: ${inl(expr)}.`,
        })[l],
      correct: res,
      wrong,
      solution: (l) =>
        S(
          l,
          T(String.raw`Modul ta'rifi: $|t|=t$ agar $t\ge 0$ bo'lsa va $|t|=-t$ agar $t<0$ bo'lsa.`, String.raw`Определение модуля: $|t|=t$ при $t\ge 0$ и $|t|=-t$ при $t<0$.`, String.raw`Modul anıqlaması: $|t|=t$ eger $t\ge 0$ bolsa hám $|t|=-t$ eger $t<0$ bolsa.`, String.raw`Definition: $|t|=t$ for $t\ge 0$ and $|t|=-t$ for $t<0$.`),
          T(`${inl(cond)} bo'lganda $${inner}$ ${ok ? 'musbat' : 'manfiy'}.`, `При ${inl(cond)} выражение $${inner}$ ${ok ? 'положительно' : 'отрицательно'}.`, `${inl(cond)} bolǵanda $${inner}$ ${ok ? 'oń' : 'teris'}.`, `For ${inl(cond)} the expression $${inner}$ is ${ok ? 'positive' : 'negative'}.`),
          disp(ok ? String.raw`|${inner}|=${inner}` : String.raw`|${inner}|=-(${inner})=${res}`),
        ),
      mistake: mk(T("Modul ichidagi ifoda manfiy bo'lganda ishorasini almashtirmaslik.", 'Не менять знак выражения под модулем, когда оно отрицательно.', 'Modul ishindegi ańlatpa teris bolǵanda belgisin almastırmaw.', 'Not changing the sign when the expression under the modulus is negative.')),
      check: [[Math.abs(s * (x0 - a)), c1 * x0 + c0]],
    };
  },
);

export const ALGEBRA_L1: readonly Template[] = [
  tPow, tNeg, tRoot, tRat, tPoly, tSquare, tDiffSq, tFactor, tReduce, tFrac, tRatz, tSimpRoot, tLog, tLogBase, tTrigId, tReduceVal, tReduceSimp, tAngle, tProdSum, tTrigEval, tAbs,
];

// ===========================================================================
// L2 shablonlar
// ===========================================================================

// L2-a. Modulli irratsional ifodalar (27, 13)
interface Abs2P { form: number; a: number; b: number; m: number; flip: boolean }
const tAbs2 = tpl<Abs2P>(
  'alg-abs2',
  (r) => {
    for (;;) {
      const m = r.int(3, 80);
      if (isSquare(m)) continue;
      const s = Math.floor(Math.sqrt(m));
      const a = s - r.int(0, 2);
      if (a < 1) continue;
      return { form: r.int(0, 1), a, b: s + 1 + r.int(0, 2), m, flip: r.chance(0.5) };
    }
  },
  ({ form, a, b, m, flip }) => {
    const sq = String.raw`\sqrt{${m}}`;
    const first = form === 0 ? `|${a}-${sq}|` : `|${sq}-${a}|`;
    const second = form === 0 ? `|${b}-${sq}|` : `|${sq}-${b}|`;
    const expr = form === 0 ? (flip ? `${second}+${first}` : `${first}+${second}`) : `${first}-${second}`;
    const correct = form === 0 ? String(b - a) : `2${sq}-${a + b}`;
    const wrong = form === 0 ? [`${a + b}-2${sq}`, `2${sq}-${a + b}`, String(a - b), String(a + b), String(b - a + 1)] : [`${a + b}-2${sq}`, String(b - a), String(a - b), `2${sq}+${a + b}`, `${sq}-${a + b}`];
    const sm = Math.sqrt(m);
    const direct = form === 0 ? Math.abs(a - sm) + Math.abs(b - sm) : Math.abs(sm - a) - Math.abs(sm - b);
    const closed = form === 0 ? b - a : 2 * sm - a - b;
    return {
      topic: 27,
      extraTopics: [13],
      est: 130,
      stem: st(G.value, expr),
      correct,
      wrong,
      solution: (l) =>
        S(
          l,
          T(
            `Avval ${a}, ${b} va $${sq}$ ni taqqoslaymiz: $${a * a}<${m}<${b * b}$ bo'lgani uchun $${a}<${sq}<${b}$.`,
            `Сначала сравним ${a}, ${b} и $${sq}$: так как $${a * a}<${m}<${b * b}$, получаем $${a}<${sq}<${b}$.`,
            `Aldın ${a}, ${b} hám $${sq}$ di salıstıramız: $${a * a}<${m}<${b * b}$ bolǵanı ushın $${a}<${sq}<${b}$.`,
            `First compare ${a}, ${b} and $${sq}$: since $${a * a}<${m}<${b * b}$, we get $${a}<${sq}<${b}$.`,
          ),
          disp(String.raw`${first}=${sq}-${a},\qquad ${second}=${b}-${sq}`),
          T("Modullarni ochib, hisoblaymiz:", 'Раскроем модули и вычислим:', 'Modullardı ashıp, esaplaymız:', 'Remove the absolute values and compute:'),
          disp(form === 0 ? String.raw`(${sq}-${a})+(${b}-${sq})=${b - a}` : String.raw`(${sq}-${a})-(${b}-${sq})=2${sq}-${a + b}`),
        ),
      mistake: mk(T("Modul ostidagi ifodaning ishorasini baholamasdan modulni shunchaki tashlab yuborish.", 'Просто опустить знак модуля, не оценив знак выражения.', 'Modul astındaǵı ańlatpanıń belgisin bahalamastan modulde taslap jiberiw.', 'Dropping the modulus without checking the sign of the expression.')),
      check: [[direct, closed]],
    };
  },
);

// L2-b. Logarifm: asos almashtirish / asosiy logarifmik ayniyat (21)
interface Log2P { form: number; r: number; s: number; t: number; u: number; b: number; n: number; k: number; c: number }
const tLog2 = tpl<Log2P>(
  'alg-log2',
  (r) => ({ form: r.int(0, 1), r: r.pick([2, 3, 5]), s: r.int(1, 4), t: r.int(1, 4), u: r.int(1, 4), b: r.pick([2, 3, 5]), n: r.int(1, 3), k: r.int(2, 6), c: r.int(1, 2) }),
  ({ form, r: rr, s, t, u, b, n, k, c }) => {
    if (form === 0) {
      if (s === t || t === u || rr ** s > 700 || rr ** t > 700 || rr ** u > 700) throw new Error('chegara');
      const [A, B, C] = [rr ** s, rr ** t, rr ** u];
      const ans = frac(u, s);
      const expr = String.raw`\log_{${A}} ${B}\cdot\log_{${B}} ${C}`;
      return {
        topic: 21,
        est: 130,
        stem: st(G.calc, expr),
        correct: texFrac(ans),
        wrong: [frac(s, u), frac(t * u, s * t + 1), frac(u + t, s + t), frac(t, s), frac(u, t), frac(u - s + 1, s)].map(texFrac),
        solution: (l) =>
          S(
            l,
            T(String.raw`Asos darajasi: $\log_{a^s}a^t=\dfrac{t}{s}$. Har bir logarifmni hisoblaymiz:`, String.raw`Степень в основании: $\log_{a^s}a^t=\dfrac{t}{s}$. Вычислим каждый логарифм:`, String.raw`Tiykar dárejesi: $\log_{a^s}a^t=\dfrac{t}{s}$. Hár bir logarifmdi esaplaymız:`, String.raw`Power in the base: $\log_{a^s}a^t=\dfrac{t}{s}$. Compute each logarithm:`),
            disp(String.raw`\log_{${A}} ${B}=${texFrac(frac(t, s))},\qquad \log_{${B}} ${C}=${texFrac(frac(u, t))}`),
            T("Ko'paytiramiz:", 'Перемножим:', 'Kóbeytemiz:', 'Multiply:'),
            disp(String.raw`${pf(frac(t, s))}\cdot ${pf(frac(u, t))}=${texFrac(ans)}`),
          ),
        mistake: mk(T("Logarifm qiymatini teskari yozish yoki asoslarni almashtirish formulasini noto'g'ri qo'llash.", 'Записать значение логарифма перевёрнутым или неверно применить формулу перехода к другому основанию.', 'Logarifm mánisin teris jazıw yamasa tiykardı almastırıw formulasın qate qollanıw.', 'Inverting a logarithm value or misapplying the change-of-base formula.')),
        check: [[(Math.log(B) / Math.log(A)) * (Math.log(C) / Math.log(B)), fnum(ans)]],
      };
    }
    const val = k ** n * b ** c;
    const expr = String.raw`${b}^{${n === 1 ? '' : n}\log_{${b}} ${k}+${c}}`;
    return {
      topic: 21,
      est: 140,
      stem: st(G.calc, expr),
      correct: String(val),
      wrong: [k ** n + b ** c, n * k * b ** c, k ** n * c, (k * b) ** n, k * b ** c * (n + 1)].map(String),
      solution: (l) =>
        S(
          l,
          T(String.raw`Asosiy logarifmik ayniyat: $a^{\log_a x}=x$. Darajani ko'paytuvchilarga ajratamiz:`, String.raw`Основное логарифмическое тождество: $a^{\log_a x}=x$. Разложим степень на множители:`, String.raw`Tiykarǵı logarifmlik ayniyat: $a^{\log_a x}=x$. Dárejeni kóbeytiwshilerge ajıratamız:`, String.raw`Basic logarithmic identity: $a^{\log_a x}=x$. Split the power into factors:`),
          disp(String.raw`${expr}=\left(${b}^{\log_{${b}} ${k}}\right)^{${n}}\cdot ${b}^{${c}}=${k}^{${n}}\cdot ${b ** c}=${val}`),
        ),
      mistake: mk(T("Ko'rsatkichdagi yig'indini daraja ko'paytmasi o'rniga yig'indi sifatida qoldirish: $a^{x+c}=a^x\\cdot a^c$.", 'Не разложить показатель-сумму в произведение: $a^{x+c}=a^x\\cdot a^c$.', 'Kórsetkishtegi qosındını dáreje kóbeymesi ornına qosındı retinde qaldırıw: $a^{x+c}=a^x\\cdot a^c$.', 'Not splitting a sum in the exponent into a product: $a^{x+c}=a^x\\cdot a^c$.')),
      check: [[b ** (n * (Math.log(k) / Math.log(b)) + c), val]],
    };
  },
  (p) => JSON.stringify(p.form === 0 ? [0, p.r, p.s, p.t, p.u] : [1, p.b, p.n, p.k, p.c]),
);

// L2-c. Teleskopik yig'indi (19, 20)
interface TelP { P: number; Q: number }
const tTele = tpl<TelP>(
  'alg-tele',
  (r) => {
    const P = r.int(1, 10);
    return { P, Q: P + r.int(2, 14) };
  },
  ({ P, Q }) => {
    const diff = Q * Q - P * P;
    if (diff % 3 !== 0) throw new Error('bo\'linmadi');
    const d = diff / 3;
    const v = [P * P, P * P + d, P * P + 2 * d, Q * Q];
    const ans = frac(Q - P, d);
    const expr = [0, 1, 2].map((i) => String.raw`\frac{1}{${sqrtOrInt(v[i]!)}+${sqrtOrInt(v[i + 1]!)}}`).join('+');
    const direct = [0, 1, 2].reduce((s, i) => s + 1 / (Math.sqrt(v[i]!) + Math.sqrt(v[i + 1]!)), 0);
    return {
      topic: 19,
      extraTopics: [20],
      est: 170,
      stem: st(G.value, expr),
      correct: texFrac(ans),
      wrong: [frac(Q - P), frac(Q + P, d), frac(Q - P, 3 * d), frac(1, d), frac(Q - P, d + 1)].map(texFrac),
      solution: (l) =>
        S(
          l,
          T(`Har bir kasr maxrajini qo'shma ifodaga ko'paytiramiz: $\\dfrac{1}{\\sqrt{a}+\\sqrt{b}}=\\dfrac{\\sqrt{b}-\\sqrt{a}}{b-a}$. Bu yerda $b-a=${d}$.`, `Умножим каждую дробь на сопряжённое: $\\dfrac{1}{\\sqrt{a}+\\sqrt{b}}=\\dfrac{\\sqrt{b}-\\sqrt{a}}{b-a}$. Здесь $b-a=${d}$.`, `Hár bir bólshektiń bólimin qospa ańlatpaǵa kóbeytemiz: $\\dfrac{1}{\\sqrt{a}+\\sqrt{b}}=\\dfrac{\\sqrt{b}-\\sqrt{a}}{b-a}$. Bul jerde $b-a=${d}$.`, `Multiply each fraction by the conjugate: $\\dfrac{1}{\\sqrt{a}+\\sqrt{b}}=\\dfrac{\\sqrt{b}-\\sqrt{a}}{b-a}$. Here $b-a=${d}$.`),
          disp(String.raw`\frac{1}{${d}}\left(${sqrtOrInt(v[1]!)}-${sqrtOrInt(v[0]!)}+${sqrtOrInt(v[2]!)}-${sqrtOrInt(v[1]!)}+${sqrtOrInt(v[3]!)}-${sqrtOrInt(v[2]!)}\right)=\frac{${Q}-${P}}{${d}}=${texFrac(ans)}`),
        ),
      mistake: mk(T("Yig'indini teleskopik qisqartirishda oxirgi bo'lishni ($b-a$) unutish.", 'Забыть разделить на $b-a$ после телескопического сокращения.', 'Qosındını teleskopiyalıq qısqartıwda aqırǵı bóliwdi ($b-a$) umıtıw.', 'Forgetting to divide by $b-a$ after the telescoping cancellation.')),
      check: [[direct, fnum(ans)]],
    };
  },
);

// L2-d. tg alpha berilgan: bir jinsli kasr (22, 26)
interface TanP { u: number; v: number; neg: boolean; a: number; b: number; c: number; d: number }
const tTan = tpl<TanP>(
  'alg-tanratio',
  (r) => ({ u: r.int(1, 5), v: r.int(1, 4), neg: r.chance(0.4), a: nz(r, -4, 4), b: nz(r, -4, 4), c: nz(r, -4, 4), d: nz(r, -4, 4) }),
  ({ u, v, neg, a, b, c, d }) => {
    const t = frac(neg ? -u : u, v);
    const num = fAdd(fMul(frac(a), t), frac(b));
    const den = fAdd(fMul(frac(c), t), frac(d));
    if (den.n === 0 || a * d === b * c) throw new Error('maxraj nol');
    const ans = fDiv(num, den);
    const sn = String.raw`\sin\alpha`;
    const cs = String.raw`\cos\alpha`;
    const expr = String.raw`\frac{${terms([[a, sn], [b, cs]])}}{${terms([[c, sn], [d, cs]])}}`;
    const wrongA = fDiv(fAdd(frac(a), fMul(frac(b), t)), fAdd(frac(c), fMul(frac(d), t)));
    const wrongB = fDiv(num, fSub(fMul(frac(c), t), frac(d)));
    const wrongC = fDiv(fSub(fMul(frac(a), t), frac(b)), den);
    const al = Math.atan(fnum(t));
    return {
      topic: 22,
      extraTopics: [26],
      est: 140,
      stem: (l) =>
        S(
          l,
          T(`Agar $\\operatorname{tg}\\alpha=${texFrac(t)}$ bo'lsa, ifodaning qiymatini toping.`, `Если $\\operatorname{tg}\\alpha=${texFrac(t)}$, найдите значение выражения.`, `Eger $\\operatorname{tg}\\alpha=${texFrac(t)}$ bolsa, ańlatpanıń mánisin tabıń.`, `If $\\operatorname{tg}\\alpha=${texFrac(t)}$, find the value of the expression.`),
          disp(expr),
        ),
      correct: texFrac(ans),
      wrong: [wrongA, wrongB, wrongC, frac(-ans.n, ans.d), fDiv(frac(a + b), frac(c + d))].map(texFrac),
      solution: (l) =>
        S(
          l,
          T('Surat va maxrajni $\\cos\\alpha\\neq 0$ ga bo\'lamiz:', 'Разделим числитель и знаменатель на $\\cos\\alpha\\neq 0$:', 'Alım hám bólimdi $\\cos\\alpha\\neq 0$ ge bólemiz:', 'Divide the numerator and the denominator by $\\cos\\alpha\\neq 0$:'),
          disp(String.raw`\frac{${terms([[a, String.raw`\operatorname{tg}\alpha`], [b, '']])}}{${terms([[c, String.raw`\operatorname{tg}\alpha`], [d, '']])}}=\frac{${a}\cdot ${pf(t)}${signed(b)}}{${c}\cdot ${pf(t)}${signed(d)}}=\frac{${texFrac(num)}}{${texFrac(den)}}=${texFrac(ans)}`),
        ),
      mistake: mk(T("$\\operatorname{tg}\\alpha$ ni noto'g'ri o'rniga qo'yish: sinus va kosinus koeffitsientlarini almashtirib yuborish.", 'Неверно подставить $\\operatorname{tg}\\alpha$: перепутать коэффициенты при синусе и косинусе.', "$\\operatorname{tg}\\alpha$ di qate ornına qoyıw: sinus hám kosinus koeffitsientlerin almastırıp jiberiw.", 'Substituting $\\operatorname{tg}\\alpha$ incorrectly: swapping the coefficients of sine and cosine.')),
      check: [[(a * Math.sin(al) + b * Math.cos(al)) / (c * Math.sin(al) + d * Math.cos(al)), fnum(ans)]],
    };
  },
);

// L2-e. Algebraik kasrlar: ko'p amalli ifoda (18)
interface Fr2P { form: number; a: number; k: number }
const tFrac2 = tpl<Fr2P>(
  'alg-frac2',
  (r) => ({ form: r.int(0, 1), a: r.int(1, 5), k: r.int(1, 8) }),
  ({ form, a, k }) => {
    const x0 = 6.3;
    const ev = (x: number) =>
      form === 0
        ? ((x + a) / (x - a) - (x - a) / (x + a)) * ((x * x - a * a) / (k * x))
        : (x / (x - a) - x / (x + a)) / ((k * a) / (x * x - a * a));
    const expr =
      form === 0
        ? String.raw`\left(\frac{x+${a}}{x-${a}}-\frac{x-${a}}{x+${a}}\right)\cdot\frac{x^2-${a * a}}{${k === 1 ? '' : k}x}`
        : String.raw`\left(\frac{x}{x-${a}}-\frac{x}{x+${a}}\right):\frac{${k * a}}{x^2-${a * a}}`;
    const correct = form === 0 ? texFrac(frac(4 * a, k)) : lin1(2, k);
    const wrong =
      form === 0
        ? [frac(2 * a, k), frac(a, k), frac(8 * a, k), frac(4, k * a)].map(texFrac)
        : [lin1(2, k * a), lin1(2 * a, k), lin1(1, k), lin1(4, k), lin1(2 * a, 1)];
    return {
      topic: 18,
      est: 160,
      stem: st(G.simplify, expr),
      correct,
      wrong,
      solution: (l) =>
        S(
          l,
          T("Qavs ichini umumiy maxrajga keltiramiz va $x^2-a^2$ ni ko'paytuvchilarga ajratamiz:", 'Приведём выражение в скобках к общему знаменателю и разложим $x^2-a^2$ на множители:', "Qawsırma ishin ulıwma bólimge keltiremiz hám $x^2-a^2$ tı kóbeytiwshilerge ajıratamız:", 'Bring the bracket to a common denominator and factor $x^2-a^2$:'),
          disp(
            form === 0
              ? String.raw`\frac{(x+${a})^2-(x-${a})^2}{x^2-${a * a}}=\frac{${4 * a}x}{x^2-${a * a}}\ \Rightarrow\ \frac{${4 * a}x}{x^2-${a * a}}\cdot\frac{x^2-${a * a}}{${k === 1 ? '' : k}x}=${correct}`
              : String.raw`\frac{x(x+${a})-x(x-${a})}{x^2-${a * a}}=\frac{${2 * a}x}{x^2-${a * a}}\ \Rightarrow\ \frac{${2 * a}x}{x^2-${a * a}}\cdot\frac{x^2-${a * a}}{${k * a}}=${correct}`,
          ),
        ),
      mistake: mk(T("Kasrlarni ayirishda surat ishorasini adashtirish yoki bo'lishni teskari kasrga ko'paytirish bilan almashtirmaslik.", 'Ошибиться в знаке числителя при вычитании дробей или не заменить деление умножением на обратную дробь.', "Bólshekterdi ayırıwda alım belgisin shatastırıw yamasa bóliwdi teris bólshekke kóbeytiw menen almastırmaw.", 'A sign error in the numerator when subtracting fractions, or not turning division into multiplication by the reciprocal.')),
      check: [[ev(x0), form === 0 ? (4 * a) / k : (2 * x0) / k], [ev(-3.1), form === 0 ? (4 * a) / k : (-2 * 3.1) / k]],
    };
  },
);

export const ALGEBRA_L2: readonly Template[] = [tAbs2, tLog2, tTele, tTan, tFrac2];

// ===========================================================================
// Generator
// ===========================================================================

export const generateAlgebra: BlockGenerator = (req) => {
  const pool = req.difficulty === 'L1' ? ALGEBRA_L1 : ALGEBRA_L2;
  // L1: har variantda ketma-ket 10 ta turli shablon; variantlar o'rtasida siljish (stride 4 va 21 o'zaro tub)
  const tp = pickTemplate(pool, req, req.difficulty === 'L1' ? 4 : 1);
  return buildSpec(req, tp.build(req.variant));
};
