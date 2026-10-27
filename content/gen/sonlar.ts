import { fAdd, fDiv, fMul, fSub, frac, gcd, lcm, texFrac, type Frac, type L10n, type Rng, makeRng } from './helpers';
import { G, S, T, buildSpec, disp, fnum, inl, mk, pickTemplate, tpl, type Built, type Template } from './algebra-lib';
import type { BlockGenerator, Lang } from './types';

// ---------------------------------------------------------------------------
// "Sonlar" bloki (mavzular 1-11), faqat Y-1, 2 slot, ikkalasi L1.
//
// Atamalar lug'ati:
//   uz: EKUB, EKUK, oddiy kasr, o'nli kasr, davriy kasr, modul, nisbat, proporsiya, foiz, yaxlitlash, irratsional son
//   ru: НОД, НОК, обыкновенная дробь, десятичная дробь, периодическая дробь, модуль, отношение, пропорция, процент, округление, иррациональное число
//   kaa: EKUB (eń úlken ulıwma bóliwshi), EKUK (eń kishi ulıwma eselik), ápiwayı bólshek, onlıq bólshek, dawırlı bólshek, modul,
//        qatnas, proporciya, procent, jýiklew, irracional san   // kaa: tekshirilsin
//   en: GCD, LCM, common fraction, decimal, repeating decimal, absolute value, ratio, proportion, percent, rounding, irrational number
// ---------------------------------------------------------------------------

/** 4 ta o'nli kasr yozuvi: kasr vergulli ("{,}") yoziladi. */
const dec = (scaled: number, scale: number): string => {
  const neg = scaled < 0;
  const digits = String(Math.abs(scaled)).padStart(scale + 1, '0');
  const intPart = digits.slice(0, digits.length - scale);
  const fracPart = digits.slice(digits.length - scale).replace(/0+$/, '');
  return `${neg ? '-' : ''}${intPart}${fracPart ? `{,}${fracPart}` : ''}`;
};
/** Oddiy son (butun yoki 2 xonagacha kasr) vergul bilan */
const numStr = (x: number): string => dec(Math.round(x * 100), 2);

const primeFactors = (n: number): Map<number, number> => {
  const m = new Map<number, number>();
  let x = n;
  for (let p = 2; p * p <= x; p++) while (x % p === 0) { m.set(p, (m.get(p) ?? 0) + 1); x /= p; }
  if (x > 1) m.set(x, (m.get(x) ?? 0) + 1);
  return m;
};
const factorTex = (m: Map<number, number>): string => {
  const parts = [...m.entries()].sort((a, b) => a[0] - b[0]).map(([p, e]) => (e === 1 ? String(p) : `${p}^{${e}}`));
  return parts.length ? parts.join('\\cdot ') : '1';
};
const safeFrac = (n: number, d: number): Frac | null => (d === 0 ? null : frac(n, d));
const fracWrong = (list: Array<Frac | null>): string[] => list.filter((f): f is Frac => f !== null).map(texFrac);
const isqrt = (n: number) => Math.round(Math.sqrt(n));
const isSq = (n: number) => isqrt(n) ** 2 === n;

// ===========================================================================
// Shablonlar
// ===========================================================================

// 1. EKUB / EKUK (3)
interface GcdP { lcmForm: boolean; g: number; u: number; v: number }
const tGcd = tpl<GcdP>(
  'son-gcd',
  (r) => {
    for (;;) {
      const u = r.int(2, 9);
      const v = r.int(2, 9);
      if (u !== v && gcd(u, v) === 1) return { lcmForm: r.chance(0.5), g: r.int(2, 12), u, v };
    }
  },
  ({ lcmForm, g, u, v }) => {
    const a = g * u;
    const b = g * v;
    const L = lcm(a, b);
    const fa = primeFactors(a);
    const fb = primeFactors(b);
    const primes = [...new Set([...fa.keys(), ...fb.keys()])];
    const minF = new Map<number, number>();
    const maxF = new Map<number, number>();
    for (const p of primes) {
      const ea = fa.get(p) ?? 0;
      const eb = fb.get(p) ?? 0;
      if (Math.min(ea, eb) > 0) minF.set(p, Math.min(ea, eb));
      maxF.set(p, Math.max(ea, eb));
    }
    const ans = lcmForm ? L : g;
    // mustaqil tekshiruv: bo'luvchilar/karralilar bo'yicha qo'pol hisob
    let brute = 0;
    if (lcmForm) {
      brute = a;
      while (brute % b !== 0) brute += a;
    } else {
      for (let d = 1; d <= Math.min(a, b); d++) if (a % d === 0 && b % d === 0) brute = d;
    }
    return {
      topic: 3,
      est: 60,
      stem: (l: Lang) =>
        ({
          uz: `${inl(String(a))} va ${inl(String(b))} sonlarining ${lcmForm ? 'EKUK' : 'EKUB'}ini toping.`,
          ru: `Найдите ${lcmForm ? 'НОК' : 'НОД'} чисел ${inl(String(a))} и ${inl(String(b))}.`,
          kaa: `${inl(String(a))} hám ${inl(String(b))} sanlarınıń ${lcmForm ? 'eń kishi ulıwma eselikin (EKUK)' : 'eń úlken ulıwma bóliwshisin (EKUB)'} tabıń.`, // kaa: tekshirilsin
          en: `Find the ${lcmForm ? 'least common multiple' : 'greatest common divisor'} of ${inl(String(a))} and ${inl(String(b))}.`,
        })[l],
      correct: String(ans),
      wrong: (lcmForm ? [g, a * b, a + b, L * 2, L - g] : [L, Math.abs(a - b), g * 2, g * u, a * b / L + g]).map(String),
      solution: (l) =>
        S(
          l,
          T('Sonlarni tub ko\'paytuvchilarga ajratamiz:', 'Разложим числа на простые множители:', 'Sanlardı tub kóbeytiwshilerge ajıratamız:', 'Factor the numbers into primes:'),
          disp(String.raw`${a}=${factorTex(fa)},\qquad ${b}=${factorTex(fb)}`),
          lcmForm
            ? T("EKUK — barcha tub ko'paytuvchilarning eng katta darajalari ko'paytmasi:", 'НОК — произведение всех простых множителей в наибольших степенях:', 'EKUK — barlıq tub kóbeytiwshilerdiń eń úlken dárejeleriniń kóbeymesi:', 'The LCM is the product of all primes with their greatest powers:')
            : T("EKUB — umumiy tub ko'paytuvchilarning eng kichik darajalari ko'paytmasi:", 'НОД — произведение общих простых множителей в наименьших степенях:', 'EKUB — ulıwma tub kóbeytiwshilerdiń eń kishi dárejeleriniń kóbeymesi:', 'The GCD is the product of the common primes with their smallest powers:'),
          disp(lcmForm ? String.raw`\operatorname{lcm}(${a},${b})=${factorTex(maxF)}=${ans}` : String.raw`\gcd(${a},${b})=${factorTex(minF)}=${ans}`),
        ),
      mistake: mk(T("EKUB bilan EKUKni adashtirish yoki umumiy ko'paytuvchilarni noto'g'ri tanlash.", 'Путать НОД и НОК или неверно выбирать общие множители.', 'EKUB penen EKUKtı shatastırıw yamasa ulıwma kóbeytiwshilerdi qate saylaw.', 'Confusing GCD with LCM or choosing the common factors incorrectly.')),
      check: [[brute, ans]],
    };
  },
);

// 2. Oddiy kasrlar ustida amallar (4)
interface FrOpP { op: '+' | '-' | '*' | '/'; a: number; b: number; c: number; d: number }
const tFracOp = tpl<FrOpP>(
  'son-fracop',
  (r) => {
    for (;;) {
      const b = r.int(2, 9);
      const d = r.int(2, 9);
      const a = r.int(1, b + 3);
      const c = r.int(1, d + 3);
      if (gcd(a, b) === 1 && gcd(c, d) === 1 && (a !== c || b !== d) && !(a === d && b === c)) return { op: r.pick(['+', '-', '*', '/'] as const), a, b, c, d };
    }
  },
  ({ op, a, b, c, d }) => {
    const x = frac(a, b);
    const y = frac(c, d);
    const res = op === '+' ? fAdd(x, y) : op === '-' ? fSub(x, y) : op === '*' ? fMul(x, y) : fDiv(x, y);
    const sym = { '+': '+', '-': '-', '*': String.raw`\cdot`, '/': ':' }[op];
    const expr = String.raw`\frac{${a}}{${b}}${sym}\frac{${c}}{${d}}`;
    const direct = op === '+' ? a / b + c / d : op === '-' ? a / b - c / d : op === '*' ? (a / b) * (c / d) : a / b / (c / d);
    const wrong =
      op === '+'
        ? [safeFrac(a + c, b + d), frac(a * c, b * d), fSub(x, y), safeFrac(a + c, b * d)]
        : op === '-'
          ? [safeFrac(a - c, b - d), fAdd(x, y), fSub(y, x), safeFrac(a - c, b * d)]
          : op === '*'
            ? [fAdd(x, y), fDiv(x, y), safeFrac(a * c, b + d), safeFrac(a + c, b * d)]
            : [fMul(x, y), fDiv(y, x), safeFrac(a * d, b + c), safeFrac(a * c, b * d + 1)];
    const how: Record<FrOpP['op'], L10n> = {
      '+': T("Umumiy maxrajga keltiramiz va suratlarni qo'shamiz.", 'Приведём к общему знаменателю и сложим числители.', 'Ulıwma bólimge keltiremiz hám alımlardı qosamız.', 'Use a common denominator and add the numerators.'),
      '-': T('Umumiy maxrajga keltiramiz va suratlarni ayiramiz.', 'Приведём к общему знаменателю и вычтем числители.', 'Ulıwma bólimge keltiremiz hám alımlardı ayıramız.', 'Use a common denominator and subtract the numerators.'),
      '*': T("Suratni suratga, maxrajni maxrajga ko'paytiramiz.", 'Перемножим числители и знаменатели.', 'Alımdı alımǵa, bólimdi bólimge kóbeytemiz.', 'Multiply numerators and denominators.'),
      '/': T("Bo'lishni ikkinchi kasrning teskarisiga ko'paytirish bilan almashtiramiz.", 'Заменим деление умножением на перевёрнутую дробь.', 'Bóliwdi ekinshi bólshektiń teskerisine kóbeytiw menen almastıramız.', 'Replace division by multiplication by the reciprocal.'),
    };
    const mid =
      op === '+' || op === '-'
        ? (() => {
            const L = lcm(b, d);
            return String.raw`${expr}=\frac{${a * (L / b)}${op}${c * (L / d)}}{${L}}`;
          })()
        : op === '*'
          ? String.raw`${expr}=\frac{${a}\cdot ${c}}{${b}\cdot ${d}}`
          : String.raw`${expr}=\frac{${a}}{${b}}\cdot\frac{${d}}{${c}}=\frac{${a}\cdot ${d}}{${b}\cdot ${c}}`;
    return {
      topic: 4,
      est: 60,
      stem: (l) => S(l, G.calc, disp(expr)),
      correct: texFrac(res),
      wrong: fracWrong(wrong),
      solution: (l) => S(l, how[op], disp(`${mid}=${texFrac(res)}`)),
      mistake: mk(
        op === '+' || op === '-'
          ? T("Maxrajlarni ham qo'shib (ayirib) yuborish: $\\dfrac{a}{b}+\\dfrac{c}{d}=\\dfrac{a+c}{b+d}$.", String.raw`Складывать (вычитать) и знаменатели: $\dfrac{a}{b}+\dfrac{c}{d}=\dfrac{a+c}{b+d}$.`, String.raw`Bólimlerdi de qosıp (ayırıp) jiberiw: $\dfrac{a}{b}+\dfrac{c}{d}=\dfrac{a+c}{b+d}$.`, String.raw`Adding (subtracting) the denominators too: $\dfrac{a}{b}+\dfrac{c}{d}=\dfrac{a+c}{b+d}$.`)
          : T("Bo'lishda ikkinchi kasrni teskari aylantirmaslik yoki kasrlarni umumiy maxrajga keltirib ko'paytirish.", 'Не перевернуть вторую дробь при делении или приводить к общему знаменателю при умножении.', 'Bóliwde ekinshi bólshekti teskeri aylandırmaw yamasa kóbeytiwde ulıwma bólimge keltiriw.', 'Not inverting the second fraction when dividing, or using a common denominator when multiplying.'),
      ),
      check: [[direct, fnum(res)]],
    };
  },
);

// 3. O'nli va davriy kasrlar (5)
interface DecP { form: number; period: number; digits: number; A: number; B: number; qq: number }
const tDecimal = tpl<DecP>(
  'son-decimal',
  (r) => {
    const digits = r.int(1, 2);
    return { form: r.int(0, 2), period: digits === 1 ? r.int(1, 8) : r.int(10, 98), digits, A: r.int(11, 99), B: r.int(11, 99), qq: r.int(2, 30) };
  },
  ({ form, period, digits, A, B, qq }) => {
    if (form === 0) {
      const den = digits === 1 ? 9 : 99;
      const ans = frac(period, den);
      const per = String(period).padStart(digits, '0');
      const expr = String.raw`0{,}(${per})`;
      return {
        topic: 5,
        est: 75,
        stem: (l) =>
          ({
            uz: `Davriy kasrni oddiy kasr ko'rinishida yozing: ${inl(expr)}.`,
            ru: `Запишите периодическую дробь в виде обыкновенной: ${inl(expr)}.`,
            kaa: `Dawırlı bólshekti ápiwayı bólshek túrinde jazıń: ${inl(expr)}.`,
            en: `Write the repeating decimal as a common fraction: ${inl(expr)}.`,
          })[l],
        correct: texFrac(ans),
        wrong: fracWrong([frac(period, digits === 1 ? 10 : 100), frac(period, digits === 1 ? 99 : 999), frac(period, digits === 1 ? 90 : 90), frac(period + 1, den), frac(period, den - 1)]),
        solution: (l) =>
          S(
            l,
            T(`Sof davriy kasrda davr ${digits === 1 ? '9' : '99'} maxrajli kasr bo'ladi: davr soni suratga, maxrajga esa davr xonalari soniga teng ${digits === 1 ? '9' : '99'} yoziladi.`, `У чисто периодической дроби в числителе пишут период, а в знаменателе столько девяток, сколько цифр в периоде (${digits === 1 ? '9' : '99'}).`, `Taza dawırlı bólshekte alımǵa dawır, bólimge dawırdaǵı cifrlar sanınday toǵızlıq (${digits === 1 ? '9' : '99'}) jazıladı.`, `For a purely repeating decimal, the numerator is the period and the denominator has as many nines as the period has digits (${digits === 1 ? '9' : '99'}).`),
            disp(String.raw`${expr}=\frac{${period}}{${den}}${ans.d !== den ? `=${texFrac(ans)}` : ''}`),
          ),
        mistake: mk(T("Maxrajga 10 yoki 100 yozish (davriy kasrni oddiy o'nli kasr deb hisoblash).", 'Писать в знаменателе 10 или 100 (считать дробь конечной десятичной).', 'Bólimge 10 yamasa 100 jazıw (dawırlı bólshekti shekli onlıq bólshek dep esaplaw).', 'Writing 10 or 100 in the denominator (treating it as a finite decimal).')),
        check: [[period / den, fnum(ans)]],
      };
    }
    if (form === 1) {
      if (A % 10 === 0 || B % 10 === 0) throw new Error('nol');
      // A/10 * B/100 = A*B/1000
      const x = dec(A, 1);
      const y = dec(B, 2);
      const prod = A * B;
      return {
        topic: 5,
        est: 70,
        stem: (l) => S(l, G.calc, disp(String.raw`${x}\cdot ${y}`)),
        correct: dec(prod, 3),
        wrong: [dec(prod, 2), dec(prod, 4), dec(prod, 1), dec(A + B, 2)],
        solution: (l) =>
          S(
            l,
            T("O'nli kasrlarni vergulga e'tibor bermay butun sonlardek ko'paytiramiz, so'ng vergulni ikkala ko'paytuvchidagi xonalar yig'indisicha suramiz (1 + 2 = 3 xona).", 'Перемножим числа без запятых, затем отделим запятой столько знаков, сколько их в обоих множителях вместе (1 + 2 = 3 знака).', 'Onlıq bólshekterdi útirge itibar bermey pútin sanlardaı kóbeytemiz, soń útirdi eki kóbeytiwshidegi orınlar qosındısınday (1 + 2 = 3) ótkeremiz.', 'Multiply as whole numbers ignoring the commas, then place the comma so that the result has as many decimal places as both factors together (1 + 2 = 3).'),
            disp(String.raw`${A}\cdot ${B}=${prod}\ \Rightarrow\ ${x}\cdot ${y}=${dec(prod, 3)}`),
          ),
        mistake: mk(T("Vergulni noto'g'ri joyga qo'yish: o'nli xonalar sonini qo'shishni unutish.", 'Неверно поставить запятую: забыть сложить количество десятичных знаков.', 'Útirdi qate jerge qoyıw: onlıq orınlar sanın qosıwdı umıtıw.', 'Misplacing the comma: forgetting to add the numbers of decimal places.')),
        check: [[(A / 10) * (B / 100), prod / 1000]],
      };
    }
    // form 2: o'nli kasrga bo'lish
    if (B % 10 === 0) throw new Error('nol');
    const y = dec(B, 2);
    const xs = qq * B;
    const x = dec(xs, 2);
    return {
      topic: 5,
      est: 75,
      stem: (l) => S(l, G.calc, disp(String.raw`${x}:${y}`)),
      correct: String(qq),
      wrong: [qq * 10, qq * 100, qq / 10, qq + 10].map((v) => numStr(v)),
      solution: (l) =>
        S(
          l,
          T("Bo'luvchi butun bo'lishi uchun ikkala sonni $100$ ga ko'paytiramiz (vergulni 2 xona o'ngga suramiz):", 'Чтобы делитель стал целым, умножим оба числа на $100$ (сдвинем запятую на 2 знака вправо):', "Bóliwshi pútin bolıwı ushın eki sandı $100$ ge kóbeytemiz (útirdi 2 orın ońǵa ótkeremiz):", 'To make the divisor an integer, multiply both numbers by $100$ (shift the comma two places right):'),
          disp(String.raw`${x}:${y}=${xs}:${B}=${qq}`),
        ),
      mistake: mk(T("Vergulni siljitishda xonalar sonini adashtirish (natija 10 yoki 100 marta xato chiqadi).", 'Ошибиться в количестве знаков при переносе запятой (ответ неверен в 10 или 100 раз).', 'Útirdi ótkeriwde orınlar sanın shatastırıw (juwap 10 yamasa 100 ese qate shıǵadı).', 'Miscounting the places when shifting the comma (the answer is off by a factor of 10 or 100).')),
      check: [[(xs / 100) / (B / 100), qq]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.period, p.digits] : p.form === 1 ? [p.A, p.B] : [p.qq, p.B]]),
);

// 4. Modul (6)
interface AbsNP { form: number; a: number; b: number; c: number; d: number }
const tModul = tpl<AbsNP>(
  'son-modul',
  (r) => ({ form: r.int(0, 1), a: r.int(-15, 15), b: r.int(-15, 15), c: r.int(-15, 15), d: r.int(-15, 15) }),
  ({ form, a, b, c, d }) => {
    if (form === 0) {
      if (a === 0 || d === 0 || b - c >= 0 || a > 0 || d > 0) throw new Error('shakl');
      // |a| + |b - c| - |d| : a < 0, b < c, d < 0
      const val = Math.abs(a) + Math.abs(b - c) - Math.abs(d);
      const expr = String.raw`|${a}|+|${b}-${c < 0 ? `(${c})` : c}|-|${d}|`;
      return {
        topic: 6,
        est: 60,
        stem: (l) => S(l, G.calc, disp(expr)),
        correct: String(val),
        wrong: [a + (b - c) - d, -val, Math.abs(a) + (b - c) - Math.abs(d), a + Math.abs(b - c) - d].map(String),
        solution: (l) =>
          S(
            l,
            T("Modul sonning nol nuqtadan masofasi: $|t|=t$ ($t\\ge 0$), $|t|=-t$ ($t<0$).", 'Модуль — расстояние до нуля: $|t|=t$ при $t\\ge 0$, $|t|=-t$ при $t<0$.', 'Modul — sannıń nolden aralıǵı: $|t|=t$ ($t\\ge 0$), $|t|=-t$ ($t<0$).', 'The absolute value is the distance from zero: $|t|=t$ for $t\\ge 0$, $|t|=-t$ for $t<0$.'),
            disp(String.raw`${expr}=${Math.abs(a)}+${Math.abs(b - c)}-${Math.abs(d)}=${val}`),
          ),
        mistake: mk(T("Modulni manfiy son oldidagi minus ishorasi bilan adashtirish: $|-5|=-5$ deb yozish.", 'Путать модуль со знаком минус: считать $|-5|=-5$.', 'Moduldi teris san aldındaǵı minus belgisi menen shatastırıw: $|-5|=-5$ dep jazıw.', 'Confusing the absolute value with a minus sign: writing $|-5|=-5$.')),
        check: [[Math.abs(a) + Math.abs(b - c) - Math.abs(d), val]],
      };
    }
    if (a === b || Math.sign(a) !== Math.sign(b) || a === 0 || b === 0) throw new Error('shakl');
    const dist = Math.abs(a - b);
    const P = (n: number) => `${n}`;
    return {
      topic: 6,
      est: 70,
      stem: (l) =>
        ({
          uz: `Sonlar o'qida ${inl(`A(${P(a)})`)} va ${inl(`B(${P(b)})`)} nuqtalar berilgan. Ular orasidagi masofani toping.`,
          ru: `На числовой прямой отмечены точки ${inl(`A(${P(a)})`)} и ${inl(`B(${P(b)})`)}. Найдите расстояние между ними.`,
          kaa: `San kósherinde ${inl(`A(${P(a)})`)} hám ${inl(`B(${P(b)})`)} noqatları berilgen. Olar arasındaǵı aralıqtı tabıń.`,
          en: `Points ${inl(`A(${P(a)})`)} and ${inl(`B(${P(b)})`)} are given on the number line. Find the distance between them.`,
        })[l],
      correct: String(dist),
      wrong: [a - b, a + b, Math.abs(a) + Math.abs(b), Math.abs(a + b), dist + 1, dist - 1].map(String),
      solution: (l) =>
        S(
          l,
          T("Ikki nuqta orasidagi masofa koordinatalar ayirmasining moduliga teng: $AB=|a-b|$.", 'Расстояние между точками равно модулю разности координат: $AB=|a-b|$.', 'Eki noqat arasındaǵı aralıq koordinatalar ayırmasınıń moduline teń: $AB=|a-b|$.', 'The distance between two points is the absolute value of the difference of the coordinates: $AB=|a-b|$.'),
          disp(String.raw`AB=|${a}-${b < 0 ? `(${b})` : b}|=|${a - b}|=${dist}`),
        ),
      mistake: mk(T("Masofani koordinatalar ayirmasi (manfiy bo'lishi mumkin) deb olish yoki modulni qo'llamaslik.", 'Считать расстоянием саму разность координат (она может быть отрицательной), без модуля.', 'Aralıqtı koordinatalar ayırması (teris bolıwı múmkin) dep alıw yamasa moduldi qollanbaw.', 'Taking the difference of coordinates (which may be negative) as the distance, without the modulus.')),
      check: [[Math.abs(a - b), dist]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.a, p.b, p.c, p.d] : [p.a, p.b]]),
);

// 5. Nisbat va proporsiya (7)
interface PropP { form: number; a: number; b: number; k: number; w1: number; d1: number }
const tProp = tpl<PropP>(
  'son-prop',
  (r) => ({ form: r.int(0, 2), a: r.int(2, 9), b: r.int(2, 9), k: r.int(2, 20), w1: r.int(2, 9), d1: r.int(4, 24) }),
  ({ form, a, b, k, w1, d1 }) => {
    if (form === 0) {
      // x : (k*a) = b : a  ->  x = k*b ... tuzamiz: x : A = B : C, A = k*C
      if (a === b) throw new Error('teng');
      const C = a;
      const A = k * a;
      const B = b;
      const x = k * b;
      return {
        topic: 7,
        est: 60,
        stem: (l) =>
          ({
            uz: `${inl(`x:${A}=${B}:${C}`)} proporsiyadan ${inl('x')} ni toping.`,
            ru: `Найдите ${inl('x')} из пропорции ${inl(`x:${A}=${B}:${C}`)}.`,
            kaa: `${inl(`x:${A}=${B}:${C}`)} proporciyasınan ${inl('x')} tı tabıń.`,
            en: `Find ${inl('x')} from the proportion ${inl(`x:${A}=${B}:${C}`)}.`,
          })[l],
        correct: String(x),
        wrong: fracWrong([frac(A * C, B), frac(A + B - C), frac(B * C, A), frac(A * B, 1) , frac(x + k, 1)]),
        solution: (l) =>
          S(
            l,
            T("Proporsiyaning asosiy xossasi: chetki hadlar ko'paytmasi o'rta hadlar ko'paytmasiga teng.", 'Основное свойство пропорции: произведение крайних членов равно произведению средних.', 'Proporciyanıń tiykarǵı qásiyeti: shetki aǵzalar kóbeymesi ortaǵı aǵzalar kóbeymesine teń.', 'Basic property of a proportion: the product of the extremes equals the product of the means.'),
            disp(String.raw`x\cdot ${C}=${A}\cdot ${B}\ \Rightarrow\ x=\frac{${A * B}}{${C}}=${x}`),
          ),
        mistake: mk(T("Proporsiyada noma'lum hadni topishda ko'paytirish va bo'lishni adashtirish (teskari nisbat olish).", 'Путать умножение и деление при нахождении неизвестного члена (брать обратное отношение).', "Proporciyada belgisiz aǵzanı tabıwda kóbeytiw menen bóliwdi shatastırıw (teskeri qatnas alıw).", 'Mixing up multiplication and division when finding the unknown term (using the inverse ratio).')),
        check: [[(A * B) / C, x]],
      };
    }
    if (form === 1) {
      if (a === b || gcd(a, b) !== 1) throw new Error('nisbat');
      const total = k * (a + b) * 10;
      const unit = total / (a + b);
      const big = unit * Math.max(a, b);
      const small = unit * Math.min(a, b);
      return {
        topic: 7,
        est: 75,
        stem: (l) =>
          ({
            uz: `${inl(String(total))} so'm ${inl(`${a}:${b}`)} nisbatda ikki qismga bo'lindi. Katta qism necha so'm?`,
            ru: `Сумма ${inl(String(total))} сумов разделена на две части в отношении ${inl(`${a}:${b}`)}. Сколько сумов составляет большая часть?`,
            kaa: `${inl(String(total))} swm ${inl(`${a}:${b}`)} qatnasında eki bólekke bólindi. Úlken bólek neshe swm?`, // kaa: tekshirilsin (swm = so'm)
            en: `A sum of ${inl(String(total))} UZS is divided into two parts in the ratio ${inl(`${a}:${b}`)}. How many UZS is the larger part?`,
          })[l],
        correct: String(big),
        wrong: [small, total / a, total / b, total - unit, big + unit].map((v) => numStr(v)),
        solution: (l) =>
          S(
            l,
            T(`Bir ulush: $${total}:(${a}+${b})=${unit}$ so'm.`, `Одна доля: $${total}:(${a}+${b})=${unit}$ сумов.`, `Bir úles: $${total}:(${a}+${b})=${unit}$ swm.`, `One part: $${total}:(${a}+${b})=${unit}$ UZS.`),
            disp(String.raw`${Math.max(a, b)}\cdot ${unit}=${big}`),
          ),
        mistake: mk(T("Umumiy summani nisbatning bitta hadiga bo'lib yuborish (ulushlar yig'indisiga emas).", 'Делить всю сумму на один член отношения, а не на сумму частей.', 'Ulıwma summanı qatnastıń bir aǵzasına bólip jiberiw (úlesler qosındısına emes).', 'Dividing the total by one term of the ratio instead of the sum of the parts.')),
        check: [[(total * Math.max(a, b)) / (a + b), big]],
      };
    }
    // form 2: teskari proporsionallik
    const w2 = w1 * (2 + (k % 3));
    if ((w1 * d1) % w2 !== 0) throw new Error('bo\'linmadi');
    const d2 = (w1 * d1) / w2;
    if (d2 < 1 || d2 === d1) throw new Error('kun');
    return {
      topic: 7,
      est: 70,
      stem: (l) =>
        ({
          uz: `${inl(String(w1))} ishchi ishni ${inl(String(d1))} kunda bajaradi. Xuddi shu ishni ${inl(String(w2))} ishchi necha kunda bajaradi? (ish unumdorligi bir xil)`,
          ru: `${inl(String(w1))} рабочих выполняют работу за ${inl(String(d1))} дней. За сколько дней эту же работу выполнят ${inl(String(w2))} рабочих? (производительность одинакова)`,
          kaa: `${inl(String(w1))} jumısshı jumıstı ${inl(String(d1))} kúnde orınlaydı. Sol jumıstı ${inl(String(w2))} jumısshı neshe kúnde orınlaydı? (ónimdarlıq birdey)`,
          en: `${inl(String(w1))} workers finish a job in ${inl(String(d1))} days. How many days will ${inl(String(w2))} workers need for the same job? (equal productivity)`,
        })[l],
      correct: String(d2),
      wrong: fracWrong([frac(w2 * d1, w1), frac(d1 + (w2 - w1)), frac(d1 - (w2 - w1)), frac(d2 + 1), frac(w2 * d2, w1)]),
      solution: (l) =>
        S(
          l,
          T("Ishchilar soni oshsa, kunlar soni shuncha marta kamayadi (teskari proporsionallik): ishchi-kunlar ko'paytmasi o'zgarmaydi.", 'Чем больше рабочих, тем меньше дней (обратная пропорциональность): произведение числа рабочих на число дней постоянно.', 'Jumısshılar sanı artsa, kúnler sanı sonsha márte azayadı (teskeri proporcionallıq): jumısshı-kúnler kóbeymesi ózgermeydi.', 'More workers means fewer days (inverse proportion): the product of workers and days is constant.'),
          disp(String.raw`${w1}\cdot ${d1}=${w2}\cdot x\ \Rightarrow\ x=\frac{${w1 * d1}}{${w2}}=${d2}`),
        ),
      mistake: mk(T("Teskari proporsionallikni to'g'ri proporsionallik deb olish (ishchilar ko'paysa kunlar ham ko'payadi deb o'ylash).", 'Считать зависимость прямой: думать, что с ростом числа рабочих растёт и число дней.', 'Teskeri proporcionallıqtı tuwrı proporcionallıq dep alıw (jumısshılar kóbeyse kúnler de kóbeyedi dep oylaw).', 'Treating the relation as direct: thinking that more workers need more days.')),
      check: [[(w1 * d1) / w2, d2]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.a, p.b, p.k] : p.form === 1 ? [p.a, p.b, p.k] : [p.w1, p.d1, p.k % 3]]),
);

// 6. Foiz (8)
interface PctP { form: number; p: number; N: number; q: number; k: number; b: number }
const tPercent = tpl<PctP>(
  'son-percent',
  (r) => ({ form: r.int(0, 2), p: r.pick([5, 10, 12, 15, 20, 25, 30, 40, 45, 60, 75]), N: 20 * r.int(5, 60), q: r.pick([10, 20, 25, 40, 50]), k: r.int(1, 12), b: r.pick([20, 25, 40, 50, 80, 125, 200, 250]) }),
  ({ form, p, N, q, k, b }) => {
    if (form === 0) {
      const val = (N * p) / 100;
      if (!Number.isInteger(val)) throw new Error('butun emas');
      return {
        topic: 8,
        est: 50,
        stem: (l) =>
          ({
            uz: `${inl(String(N))} sonining ${inl(String(p))} foizini toping.`,
            ru: `Найдите ${inl(String(p))} процентов от числа ${inl(String(N))}.`,
            kaa: `${inl(String(N))} sanınıń ${inl(String(p))} procentin tabıń.`,
            en: `Find ${inl(String(p))} percent of ${inl(String(N))}.`,
          })[l],
        correct: String(val),
        wrong: [N / 10 * (p / 10), N - val, N / p, (N * p) / 10, val + p].map(numStr),
        solution: (l) =>
          S(
            l,
            T("Foizni kasrga aylantiramiz: $p\\%=\\dfrac{p}{100}$.", 'Переведём проценты в дробь: $p\\%=\\dfrac{p}{100}$.', 'Procentti bólshekke aylandıramız: $p\\%=\\dfrac{p}{100}$.', 'Convert the percent to a fraction: $p\\%=\\dfrac{p}{100}$.'),
            disp(String.raw`${N}\cdot\frac{${p}}{100}=${val}`),
          ),
        mistake: mk(T("Foizni 100 ga bo'lishni unutish yoki sonni foizga bo'lib yuborish.", 'Забыть разделить проценты на 100 или разделить число на проценты.', 'Procentti 100 ge bóliwdi umıtıw yamasa sandı procentke bólip jiberiw.', 'Forgetting to divide the percent by 100, or dividing the number by the percent.')),
        check: [[(N / 100) * p, val]],
      };
    }
    if (form === 1) {
      const P1 = r10(p);
      const base = 400 * k;
      if ((base * (100 + P1) * (100 - q)) % 10000 !== 0) throw new Error('butun emas');
      const fin = (base * (100 + P1) * (100 - q)) / 10000;
      const alt = base * (1 + (P1 - q) / 100);
      return {
        topic: 8,
        est: 90,
        stem: (l) =>
          ({
            uz: `Mahsulot narxi ${inl(String(base))} so'm edi. Narx avval ${inl(String(P1))}% ga oshirildi, so'ng yangi narxdan ${inl(String(q))}% ga kamaytirildi. Mahsulotning oxirgi narxi necha so'm?`,
            ru: `Цена товара была ${inl(String(base))} сумов. Её сначала повысили на ${inl(String(P1))}%, а затем снизили на ${inl(String(q))}% от новой цены. Какова итоговая цена в сумах?`,
            kaa: `Ónimniń bahası ${inl(String(base))} swm edi. Baha aldın ${inl(String(P1))}% ke asırıldı, soń jańa bahadan ${inl(String(q))}% ke kemeytildi. Ónimniń aqırǵı bahası neshe swm?`,
            en: `A product cost ${inl(String(base))} UZS. The price was first increased by ${inl(String(P1))}%, then decreased by ${inl(String(q))}% of the new price. What is the final price in UZS?`,
          })[l],
        correct: numStr(fin),
        wrong: [alt, base, (base * (100 + P1)) / 100, (base * (100 - q)) / 100, base * (1 - (q - P1) / 100) + 1].map(numStr),
        solution: (l) =>
          S(
            l,
            T("Har bir o'zgarish oldingi narxga nisbatan hisoblanadi: ko'paytiramiz.", 'Каждое изменение считается от предыдущей цены: перемножаем коэффициенты.', 'Hár bir ózgeris aldıńǵı bahaǵa salıstırǵanda esaplanadı: kóbeytemiz.', 'Each change applies to the previous price: multiply the factors.'),
            disp(String.raw`${base}\cdot ${dec(100 + P1, 2)}\cdot ${dec(100 - q, 2)}=${numStr(fin)}`),
          ),
        mistake: mk(T("Foizlarni qo'shib-ayirib yuborish (+" + P1 + "% va −" + q + "% ni " + (P1 - q) + "% deb olish).", 'Складывать проценты (+' + P1 + '% и −' + q + '% считать как ' + (P1 - q) + '%).', "Procentlerdi qosıp-ayırıp jiberiw (+" + P1 + "% hám −" + q + "% di " + (P1 - q) + "% dep alıw).", 'Adding the percents (treating +' + P1 + '% and −' + q + '% as ' + (P1 - q) + '%).')),
        check: [[base * (1 + P1 / 100) * (1 - q / 100), fin]],
      };
    }
    const pc = r10(p) + 5;
    const a = (pc * b) / 100;
    if (!Number.isInteger(a) || a < 2) throw new Error('butun emas');
    return {
      topic: 8,
      est: 60,
      stem: (l) =>
        ({
          uz: `${inl(String(a))} soni ${inl(String(b))} sonining necha foizini tashkil qiladi?`,
          ru: `Сколько процентов от числа ${inl(String(b))} составляет число ${inl(String(a))}?`,
          kaa: `${inl(String(a))} sanı ${inl(String(b))} sanınıń neshe procentin quraydı?`,
          en: `What percent of ${inl(String(b))} is ${inl(String(a))}?`,
        })[l],
      correct: String(pc),
      wrong: [(100 * b) / a, (a / b) * 10, pc + 10, a - b + 100].map(numStr),
      solution: (l) =>
        S(
          l,
          T("Qism butunning qancha qismini tashkil qilishini 100% ga ko'paytirib topamiz:", 'Находим долю части от целого и умножаем на 100%:', 'Bólektiń pútinniń qansha bólegin quraytuǵının 100% ke kóbeytip tabamız:', 'Find the part divided by the whole and multiply by 100%:'),
          disp(String.raw`\frac{${a}}{${b}}\cdot 100\%=${pc}\%`),
        ),
      mistake: mk(T("Qismni butunga emas, butunni qismga bo'lib yuborish.", 'Делить целое на часть вместо части на целое.', 'Bólekti pútinge emes, pútindi bólekke bólip jiberiw.', 'Dividing the whole by the part instead of the part by the whole.')),
      check: [[(a / b) * 100, pc]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.p, p.N] : p.form === 1 ? [p.p, p.q, p.k] : [p.p, p.b]]),
);
/** foiz tanlovi uchun: 5..45 oralig'iga keltiradi (10 ga karrali yoki 5 ga karrali) */
function r10(p: number): number {
  return Math.min(45, Math.max(5, Math.round(p / 5) * 5));
}

// 7. Sonli ifodalar (9)
interface ExprP { form: number; a: number; b: number; c: number; d: number; e: number }
const tExpr = tpl<ExprP>(
  'son-expr',
  (r) => ({ form: r.int(0, 1), a: r.int(2, 30), b: r.int(2, 12), c: r.int(2, 9), d: r.int(2, 30), e: r.int(2, 6) }),
  ({ form, a, b, c, d, e }) => {
    if (form === 0) {
      // a + b*c - D:e, D = e * m
      const D = e * d;
      const val = a + b * c - D / e;
      const ltr = fDiv(frac((a + b) * c - D, 1), frac(e));
      const expr = `${a}+${b}\\cdot ${c}-${D}:${e}`;
      return {
        topic: 9,
        est: 60,
        stem: (l) => S(l, G.value, disp(expr)),
        correct: String(val),
        wrong: [texFrac(ltr), String((a + b) * c - D / e), String(a + b * c - D * e), String(val + b), String(val - c)],
        solution: (l) =>
          S(
            l,
            T("Amallar tartibi: avval ko'paytirish va bo'lish, keyin qo'shish va ayirish.", 'Порядок действий: сначала умножение и деление, затем сложение и вычитание.', 'Ámeller tártibi: aldın kóbeytiw hám bóliw, soń qosıw hám ayırıw.', 'Order of operations: multiplication and division first, then addition and subtraction.'),
            disp(String.raw`${expr}=${a}+${b * c}-${D / e}=${val}`),
          ),
        mistake: mk(T("Amallarni chapdan o'ngga ketma-ket bajarish (ustuvorlikni hisobga olmaslik).", 'Выполнять действия строго слева направо, не учитывая приоритет.', 'Ámellerdi shepten ońǵa izbe-iz orınlaw (ústinlikti esapqa almaw).', 'Evaluating strictly left to right, ignoring operator precedence.')),
        check: [[a + b * c - D / e, val]],
      };
    }
    // (a-b)*c + D:e ,  D = e*m
    if (a === b) throw new Error('nol');
    const D = e * d;
    const val = (a - b) * c + D / e;
    const expr = `(${a}-${b})\\cdot ${c}+${D}:${e}`;
    return {
      topic: 9,
      est: 70,
      stem: (l) => S(l, G.value, disp(expr)),
      correct: String(val),
      wrong: [a - b * c + D / e, ((a - b) * c + D) / e, (a - b) * (c + D / e), val + c, val - e].map((v) => (Number.isInteger(v) ? String(v) : texFrac(frac(Math.round(v * 100), 100)))),
      solution: (l) =>
        S(
          l,
          T("Avval qavs ichi, keyin ko'paytirish va bo'lish, oxirida qo'shish:", 'Сначала скобки, затем умножение и деление, в конце сложение:', 'Aldın qawsırma ishi, soń kóbeytiw hám bóliw, aqırında qosıw:', 'Brackets first, then multiplication and division, finally addition:'),
          disp(String.raw`${expr}=${a - b}\cdot ${c}+${D / e}=${(a - b) * c}+${D / e}=${val}`),
        ),
      mistake: mk(T("Qavsni hisobga olmaslik yoki bo'lishni butun yig'indiga qo'llash.", 'Не учесть скобки или применить деление ко всей сумме.', 'Qawsırmanı esapqa almaw yamasa bóliwdi pútin qosındıǵa qollanıw.', 'Ignoring the brackets or applying the division to the whole sum.')),
      check: [[(a - b) * c + D / e, val]],
    };
  },
  (p) => JSON.stringify([p.form, p.a, p.b, p.c, p.d, p.e]),
);

// 8. Bo'linish belgilari (2)
interface DivP { div: number; x: number; y: number }
const tDivis = tpl<DivP>(
  'son-divis',
  (r) => ({ div: r.pick([3, 9, 11]), x: r.int(1, 9), y: r.int(1, 9) }),
  ({ div, x, y }) => {
    let ans = -1;
    const valid: number[] = [];
    for (let a = 0; a <= 9; a++) {
      const n = 100 * x + 10 * a + y;
      if (n % div === 0) valid.push(a);
    }
    if (div === 3) ans = Math.max(...valid);
    else if (valid.length === 1) ans = valid[0]!;
    if (ans < 0 || valid.length === 0) throw new Error('yechim yo\'q');
    const num = String.raw`\overline{${x}a${y}}`;
    const nVal = 100 * x + 10 * ans + y;
    const wrong = [ans + 1, ans - 1, ans + 2, ans - 2, 9 - ans].filter((v) => v >= 0 && v <= 9 && v !== ans);
    const rule =
      div === 9
        ? T("9 ga bo'linish belgisi: raqamlar yig'indisi 9 ga bo'linadi.", 'Признак делимости на 9: сумма цифр делится на 9.', "9 ǵa bóliniw belgisi: cifrlar qosındısı 9 ǵa bólinedi.", 'Divisibility by 9: the digit sum is divisible by 9.')
        : div === 3
          ? T("3 ga bo'linish belgisi: raqamlar yig'indisi 3 ga bo'linadi.", 'Признак делимости на 3: сумма цифр делится на 3.', "3 ke bóliniw belgisi: cifrlar qosındısı 3 ke bólinedi.", 'Divisibility by 3: the digit sum is divisible by 3.')
          : T("11 ga bo'linish belgisi: toq va juft o'rindagi raqamlar yig'indilarining ayirmasi 11 ga bo'linadi.", 'Признак делимости на 11: разность сумм цифр на нечётных и чётных местах делится на 11.', "11 ge bóliniw belgisi: taq hám jup orındaǵı cifrlar qosındıları ayırması 11 ge bólinedi.", 'Divisibility by 11: the difference between the sums of digits in odd and even places is divisible by 11.');
    const cond = div === 11 ? `${x}+${y}-a` : `${x}+a+${y}`;
    return {
      topic: 2,
      est: 70,
      stem: (l) =>
        ({
          uz: `${inl(num)} uch xonali son ${inl(String(div))} ga bo'linishi uchun ${inl('a')} raqami ${div === 3 ? "ning eng katta qiymati" : 'nechaga teng bo\'lishi kerak'}?`,
          ru: `Какой цифрой должна быть ${inl('a')}, чтобы трёхзначное число ${inl(num)} делилось на ${inl(String(div))}${div === 3 ? ' (наибольшее возможное значение)' : ''}?`,
          kaa: `${inl(num)} úsh orınlı san ${inl(String(div))} ge bólinıwi ushın ${inl('a')} cifrı ${div === 3 ? 'nıń eń úlken mánisi' : 'nege teń bolıwı kerek'}?`,
          en: `For the three-digit number ${inl(num)} to be divisible by ${inl(String(div))}, what must the digit ${inl('a')} be${div === 3 ? ' (the largest possible value)' : ''}?`,
        })[l],
      correct: String(ans),
      wrong: wrong.map(String),
      solution: (l) =>
        S(
          l,
          rule,
          disp(String.raw`${cond}=${x + y}${div === 11 ? '-a' : '+a'}`),
          disp(div === 11 ? String.raw`a=${ans}:\quad ${x}+${y}-${ans}=${x + y - ans}` : String.raw`a=${ans}:\quad ${x}+${ans}+${y}=${x + y + ans}`),
          T(`Demak, $a=${ans}$ (son: $${nVal}$).`, `Значит, $a=${ans}$ (число $${nVal}$).`, `Demek, $a=${ans}$ (san: $${nVal}$).`, `So $a=${ans}$ (the number is $${nVal}$).`),
        ),
      mistake: mk(T("Bo'linish belgisini noto'g'ri qo'llash: raqamlar yig'indisi o'rniga alohida raqamlarni tekshirish.", 'Неверно применить признак делимости: проверять отдельные цифры вместо суммы цифр.', 'Bóliniw belgisin qate qollanıw: cifrlar qosındısı ornına jeke cifrlardı tekseriw.', 'Misapplying the divisibility test: checking single digits instead of the digit sum.')),
      check: [[nVal % div, 0]],
    };
  },
  (p) => JSON.stringify([p.div, p.x, p.y]),
);

// 9. Yaxlitlash / standart shakl (10)
interface RoundP { form: number; I: number; ds: number[]; place: number; m: number; e: number }
const tRound = tpl<RoundP>(
  'son-round',
  (r) => ({ form: r.int(0, 1), I: r.int(1, 99), ds: [r.int(0, 9), r.int(0, 9), r.int(0, 9), r.int(1, 9)], place: r.int(1, 3), m: r.int(11, 99), e: r.pick([-7, -6, -5, -4, -3, 4, 5, 6, 7, 8, 9]) }),
  ({ form, I, ds, place, m, e }) => {
    if (form === 0) {
      const scaled = I * 10000 + ds[0]! * 1000 + ds[1]! * 100 + ds[2]! * 10 + ds[3]!; // 4 xona
      const shift = 10 ** (4 - place);
      const roundedScaled = Math.round(scaled / shift); // yarim yuqoriga (ties 5...5 emas, oxirgi raqam!=0)
      const down = Math.floor(scaled / shift);
      if ((scaled % shift) * 2 === shift) throw new Error('teng');
      const text = dec(scaled, 4);
      const placeName: L10n[] = [T('', '', '', ''), T("o'ndan birlargacha", 'до десятых', 'ondan bir bólekke shekem', 'to the nearest tenth'), T('yuzdan birlargacha', 'до сотых', 'júzden bir bólekke shekem', 'to the nearest hundredth'), T('mingdan birlargacha', 'до тысячных', 'mińnan bir bólekke shekem', 'to the nearest thousandth')];
      const wrongList = [dec(down, place), dec(down + 1, place), dec(Math.round(scaled / 10 ** (4 - Math.min(3, place + 1))), Math.min(3, place + 1)), dec(Math.round(scaled / 10 ** (4 - Math.max(1, place - 1))), Math.max(1, place - 1)), dec(Math.round(scaled / 10 ** 4), 0)];
      return {
        topic: 10,
        est: 50,
        stem: (l) =>
          ({
            uz: `${inl(text)} sonini ${placeName[place]!.uz} yaxlitlang.`,
            ru: `Округлите число ${inl(text)} ${placeName[place]!.ru}.`,
            kaa: `${inl(text)} sanın ${placeName[place]!.kaa} jýiklep jazıń.`,
            en: `Round ${inl(text)} ${placeName[place]!.en}.`,
          })[l],
        correct: dec(roundedScaled, place),
        wrong: wrongList,
        solution: (l) =>
          S(
            l,
            T(`Saqlanadigan oxirgi raqamdan keyingi raqamga qaraymiz: u $5$ yoki undan katta bo'lsa, oxirgi raqam bittaga oshadi, aks holda o'zgarmaydi.`, 'Смотрим на первую отбрасываемую цифру: если она не меньше $5$, последняя оставляемая цифра увеличивается на единицу, иначе не меняется.', "Saqlanatuǵın aqırǵı cifrdan keyingi cifrǵa qaraymız: ol $5$ ke teń yamasa úlken bolsa, aqırǵı cifr bir birlikke artadı, bolmasa ózgermeydi.", 'Look at the first digit being dropped: if it is at least $5$, the last kept digit increases by one; otherwise it stays.'),
            disp(String.raw`${text}\approx ${dec(roundedScaled, place)}`),
          ),
        mistake: mk(T("Yaxlitlashda oxirgi raqamni oshirmasdan shunchaki kesib tashlash (qoldiqni hisobga olmaslik).", 'Просто отбросить лишние цифры, не учитывая округление последней.', 'Jýiklewde aqırǵı cifrdi arttırmastan tek kesip taslaw.', 'Truncating the extra digits instead of rounding the last kept digit.')),
        check: [[Math.round((scaled / 10 ** 4) * 10 ** place) / 10 ** place, roundedScaled / 10 ** place]],
      };
    }
    const mant = dec(m, 1); // d{,}d  (m=11..99)  -> m/10, 1.1..9.9
    if (m % 10 === 0) throw new Error('nol');
    const digitsStr = String(m); // m.m
    let plain: string;
    if (e > 0) {
      const digitsNum = BigInt(m) * BigInt(10) ** BigInt(e - 1);
      plain = String(digitsNum).replace(/\B(?=(\d{3})+(?!\d))/g, String.raw`\,`);
    } else {
      plain = '0{,}' + '0'.repeat(-e - 1) + digitsStr;
    }
    const ans = `${mant}\\cdot 10^{${e}}`;
    return {
      topic: 10,
      est: 70,
      stem: (l) =>
        ({
          uz: `${inl(plain)} sonini standart shaklda ${inl('a\\cdot 10^{n}')} ($1\\le a<10$) yozing.`,
          ru: `Запишите число ${inl(plain)} в стандартном виде ${inl('a\\cdot 10^{n}')} ($1\\le a<10$).`,
          kaa: `${inl(plain)} sanın standart kóriniste ${inl('a\\cdot 10^{n}')} ($1\\le a<10$) jazıń.`,
          en: `Write ${inl(plain)} in standard form ${inl('a\\cdot 10^{n}')} ($1\\le a<10$).`,
        })[l],
      correct: ans,
      wrong: [`${mant}\\cdot 10^{${e + 1}}`, `${mant}\\cdot 10^{${e - 1}}`, `${m}\\cdot 10^{${e - 1}}`, `${dec(m, 2)}\\cdot 10^{${e + 1}}`],
      solution: (l) =>
        S(
          l,
          T("Vergulni birinchi nolmas raqamdan keyin qo'yamiz; vergul necha xona surilganini ko'rsatkichga yozamiz (o'ngga — manfiy, chapga — musbat).", 'Ставим запятую после первой ненулевой цифры; показатель равен числу сдвигов (влево — положительный, вправо — отрицательный).', "Útirdi birinshi nol emes cifrdan keyin qoyamız; útir neshe orın ótkenin kórsetkishke jazamız (ońǵa — teris, shepke — oń).", 'Put the comma after the first nonzero digit; the exponent counts the shifts (left: positive, right: negative).'),
          disp(String.raw`${plain}=${ans}`),
        ),
      mistake: mk(T("Ko'rsatkichni bir birlikka xato yozish yoki $a$ ni $1\\le a<10$ oralig'idan chiqarib yuborish.", 'Ошибиться в показателе на единицу или выйти за $1\\le a<10$.', "Kórsetkishti bir birlikke qate jazıw yamasa $a$ nı $1\\le a<10$ aralıǵınan shıǵarıp jiberiw.", 'Being off by one in the exponent or letting $a$ leave the range $1\\le a<10$.')),
      check: [[Number(`${digitsStr}e${e - 1}`), (m / 10) * 10 ** e]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.I, p.ds, p.place] : [p.m, p.e]]),
);

// 10. Irratsional sonlar (11)
interface IrrP { m: number; seed: number; cubic: boolean }
const tIrr = tpl<IrrP>(
  'son-irr',
  (r) => ({ m: r.int(5, 70), seed: r.int(1, 1_000_000), cubic: r.chance(0.3) }),
  ({ m, seed, cubic }) => {
    if (cubic ? [8, 27, 64].includes(m) : isSq(m)) throw new Error('ratsional');
    const rng: Rng = makeRng(`irr|${seed}`);
    const correct = cubic ? String.raw`\sqrt[3]{${m}}` : String.raw`\sqrt{${m}}`;
    // ratsional chalg'ituvchilar: [tex, qiymat tex, son qiymati]
    const k = rng.int(3, 15);
    const r3 = rng.int(2, 5);
    const t = rng.int(2, 6);
    const aa = rng.int(2, 9);
    // [tex, qiymat tex, to'g'ridan-to'g'ri sonli hisob, e'lon qilingan qiymat]
    const pools: Array<[string, string, number, number]> = [
      [String.raw`\sqrt{${k * k}}`, String(k), Math.sqrt(k * k), k],
      [String.raw`\sqrt[3]{${r3 ** 3}}`, String(r3), Math.cbrt(r3 ** 3), r3],
      [String.raw`\sqrt{${aa}}\cdot\sqrt{${aa * t * t}}`, String(aa * t), Math.sqrt(aa) * Math.sqrt(aa * t * t), aa * t],
      [String.raw`\left(\sqrt{${aa + 1}}\right)^2`, String(aa + 1), Math.sqrt(aa + 1) ** 2, aa + 1],
      [String.raw`\sqrt{0{,}${k % 2 === 0 ? 25 : 49}}`, k % 2 === 0 ? '0{,}5' : '0{,}7', Math.sqrt(k % 2 === 0 ? 0.25 : 0.49), k % 2 === 0 ? 0.5 : 0.7],
      [String.raw`0{,}(3)`, String.raw`\frac{1}{3}`, 3 / 9, 1 / 3],
      [String.raw`\frac{${aa}}{${aa + t}}`, String.raw`\frac{${aa}}{${aa + t}}`, aa / (aa + t), aa / (aa + t)],
      [String.raw`\sqrt{\frac{${t * t}}{${aa * aa}}}`, String.raw`\frac{${t}}{${aa}}`, Math.sqrt((t * t) / (aa * aa)), t / aa],
    ];
    const chosen = rng.shuffle(pools).slice(0, 3);
    const numericRoot = cubic ? Math.cbrt(m) : Math.sqrt(m);
    return {
      topic: 11,
      est: 60,
      stem: (l) =>
        ({
          uz: 'Quyidagi sonlardan qaysi biri irratsional son?',
          ru: 'Какое из следующих чисел является иррациональным?',
          kaa: 'Tómendegi sanlardan qaysısı irracional san?', // kaa: tekshirilsin
          en: 'Which of the following numbers is irrational?',
        })[l],
      correct,
      wrong: chosen.map((c) => c[0]),
      solution: (l) =>
        S(
          l,
          T("Irratsional son — cheksiz davriy bo'lmagan o'nli kasr; ratsional son esa oddiy kasr ko'rinishida yoziladi. Variantlarni tekshiramiz:", 'Иррациональное число — бесконечная непериодическая десятичная дробь; рациональное число записывается обыкновенной дробью. Проверим варианты:', "Irracional san — sheksiz dawırlı emes onlıq bólshek; ratsional san bolsa ápiwayı bólshek túrinde jazıladı. Variantlardı tekseremiz:", 'An irrational number is a non-terminating, non-repeating decimal; a rational number can be written as a common fraction. Check the options:'),
          disp(chosen.filter((c) => c[0] !== c[1]).map((c) => `${c[0]}=${c[1]}`).join(String.raw`,\quad `) || String.raw`\frac{a}{b}`),
          T(`$${m}$ soni ${cubic ? "to'liq kub" : "to'liq kvadrat"} emas, shuning uchun $${correct}$ irratsional son.`, `Число $${m}$ не является полным ${cubic ? 'кубом' : 'квадратом'}, поэтому $${correct}$ иррационально.`, `$${m}$ sanı ${cubic ? 'tolıq kub' : 'tolıq kvadrat'} emes, sonıń ushın $${correct}$ irracional san.`, `The number $${m}$ is not a perfect ${cubic ? 'cube' : 'square'}, so $${correct}$ is irrational.`),
        ),
      mistake: mk(T("Ildiz belgisi bor har qanday sonni irratsional deb hisoblash (masalan, $\\sqrt{49}=7$ ratsional).", 'Считать любое число с корнем иррациональным (например, $\\sqrt{49}=7$ рационально).', "Túbir belgisi bar hár qanday sandı irracional dep esaplaw (mısalı, $\\sqrt{49}=7$ ratsional).", 'Regarding every number with a root sign as irrational (e.g. $\\sqrt{49}=7$ is rational).')),
      check: [[Math.abs(numericRoot - Math.round(numericRoot)) > 1e-6 ? 1 : 0, 1], ...chosen.map((c) => [c[2], c[3]] as const)],
    };
  },
  (p) => JSON.stringify([p.m, p.cubic]),
);

// 11. Natural sonlar: qoldiqli bo'lish (1)
interface NatP { form: number; d: number; q: number; r: number; N: number }
const tNatural = tpl<NatP>(
  'son-natural',
  (r) => {
    const d = r.int(3, 9);
    return { form: r.int(0, 1), d, q: r.int(10, 60), r: r.int(1, d - 1), N: r.int(100, 999) };
  },
  ({ form, d, q, r, N }) => {
    if (form === 0) {
      const val = d * q + r;
      return {
        topic: 1,
        est: 55,
        stem: (l) =>
          ({
            uz: `Natural son ${inl(String(d))} ga bo'linganda bo'linma ${inl(String(q))}, qoldiq ${inl(String(r))} chiqadi. Shu sonni toping.`,
            ru: `При делении натурального числа на ${inl(String(d))} получили частное ${inl(String(q))} и остаток ${inl(String(r))}. Найдите это число.`,
            kaa: `Natural san ${inl(String(d))} ge bólingende bólindi ${inl(String(q))}, qaldıq ${inl(String(r))} shıqtı. Sol sandı tabıń.`,
            en: `A natural number divided by ${inl(String(d))} gives quotient ${inl(String(q))} and remainder ${inl(String(r))}. Find the number.`,
          })[l],
        correct: String(val),
        wrong: [d * q, q + d + r, d * (q + r), d * q - r, val + d].map(String),
        solution: (l) =>
          S(
            l,
            T("Qoldiqli bo'lish formulasi: bo'linuvchi = bo'luvchi $\\cdot$ bo'linma + qoldiq.", 'Формула деления с остатком: делимое = делитель $\\cdot$ частное + остаток.', "Qaldıqlı bóliw formulası: bólinwshi = bóliwshi $\\cdot$ bólindi + qaldıq.", 'Division with remainder: dividend = divisor $\\cdot$ quotient + remainder.'),
            disp(String.raw`${d}\cdot ${q}+${r}=${val}`),
          ),
        mistake: mk(T("Qoldiqni qo'shishni unutish yoki bo'linmani bo'luvchiga qo'shib yuborish.", 'Забыть прибавить остаток или сложить частное с делителем.', 'Qaldıqtı qosıwdı umıtıw yamasa bólindini bóliwshige qosıp jiberiw.', 'Forgetting to add the remainder, or adding the quotient to the divisor.')),
        check: [[val % d, r], [Math.floor(val / d), q]],
      };
    }
    const cnt = Math.floor(N / d);
    let brute = 0;
    for (let i = 1; i <= N; i++) if (i % d === 0) brute++;
    return {
      topic: 1,
      est: 60,
      stem: (l) =>
        ({
          uz: `${inl('1')} dan ${inl(String(N))} gacha bo'lgan natural sonlar orasida nechtasi ${inl(String(d))} ga bo'linadi?`,
          ru: `Сколько натуральных чисел от ${inl('1')} до ${inl(String(N))} делятся на ${inl(String(d))}?`,
          kaa: `${inl('1')} den ${inl(String(N))} ge shekemgi natural sanlardıń neshewi ${inl(String(d))} ge bólinedi?`, // kaa: tekshirilsin
          en: `How many natural numbers from ${inl('1')} to ${inl(String(N))} are divisible by ${inl(String(d))}?`,
        })[l],
      correct: String(cnt),
      wrong: [cnt + 1, cnt - 1, N - cnt, Math.ceil(N / d) + 1, cnt + 2].map(String),
      solution: (l) =>
        S(
          l,
          T("$d$ ga bo'linadigan sonlar $d,2d,3d,\\dots$ ko'rinishida; ularning soni $\\left[\\dfrac{N}{d}\\right]$ (butun qismi).", 'Числа, делящиеся на $d$, имеют вид $d,2d,3d,\\dots$; их количество равно целой части $\\left[\\dfrac{N}{d}\\right]$.', "$d$ ǵa bólinetuǵın sanlar $d,2d,3d,\\dots$ kórinisinde; olardıń sanı $\\left[\\dfrac{N}{d}\\right]$ (pútin bólegi).", 'Numbers divisible by $d$ are $d,2d,3d,\\dots$; their count is the integer part $\\left[\\dfrac{N}{d}\\right]$.'),
          disp(String.raw`\left[\frac{${N}}{${d}}\right]=${cnt}`),
        ),
      mistake: mk(T("Bo'linma kasr chiqsa, uni yaxlitlab yuborish (butun qismi o'rniga eng yaqin butunni olish).", 'Округлять частное вместо взятия целой части.', 'Bólindi bólshek shıqsa, onı jýiklep jiberiw (pútin bólegi ornına eń jaqın pútindi alıw).', 'Rounding the quotient instead of taking its integer part.')),
      check: [[brute, cnt]],
    };
  },
  (p) => JSON.stringify([p.form, p.form === 0 ? [p.d, p.q, p.r] : [p.d, p.N]]),
);

export const SONLAR_TEMPLATES: readonly Template[] = [tGcd, tFracOp, tDecimal, tModul, tProp, tPercent, tExpr, tDivis, tRound, tIrr, tNatural];

export const generateSonlar: BlockGenerator = (req) => {
  // 2 slot/variant: (index + 2*variant) % 10 - har variantda 2 ta turli shablon, 5 variantda hammasi aylanib chiqadi
  const tp = pickTemplate(SONLAR_TEMPLATES, req, 2);
  const b: Built = tp.build(req.variant);
  return buildSpec(req, b);
};
