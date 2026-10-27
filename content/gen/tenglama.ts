import { fAdd, fDiv, fMul, fSub, frac, gcd, lcm, texFrac, type Frac, type L10n } from './helpers';
import {
  chooseEntry,
  fp,
  fracChoices,
  fracPart,
  fv,
  G,
  intChoices,
  M,
  oEntry,
  oSpec,
  pick,
  pickPool,
  range,
  texLin,
  texPi,
  texPoly,
  textChoices,
  y1Entry,
  y1Spec,
  type OEntry,
  type Y1Entry,
} from './tf-common';
import type { BlockGenerator } from './types';

// "Tenglama va tengsizliklar" bloki (mavzular 28-42): Y-1 L2 x6, O L2 x2 (har variantda).
// Barcha javoblar parametrlardan kod bilan hisoblanadi; chalg'ituvchilar tipik xatolardan.

const sumInts = (lo: number, hi: number): number => (lo > hi ? 0 : ((lo + hi) * (hi - lo + 1)) / 2);
const nonZero = (a: number, b: number): number[] => range(a, b).filter((n) => n !== 0);

// ---------------------------------------------------------------------------------------------
// Y-1 shablonlari
// ---------------------------------------------------------------------------------------------

// 1. Viyet teoremasi (29)
type VietQty = 'sq' | 'rec' | 'cube' | 'diff2';
interface VietP {
  a: number;
  b: number;
  c: number;
  qty: VietQty;
}
const VIET_POOL: VietP[] = [];
for (const a of [1, 2, 3]) for (const b of nonZero(-9, 9)) for (const c of nonZero(-7, 7)) for (const qty of ['sq', 'rec', 'cube', 'diff2'] as const) if (b * b - 4 * a * c > 0) VIET_POOL.push({ a, b, c, qty });

const VIET_EXPR: Record<VietQty, string> = {
  sq: 'x_1^2 + x_2^2',
  rec: '\\frac{1}{x_1} + \\frac{1}{x_2}',
  cube: 'x_1^3 + x_2^3',
  diff2: '(x_1 - x_2)^2',
};
const VIET_FORMULA: Record<VietQty, string> = {
  sq: 'x_1^2 + x_2^2 = (x_1 + x_2)^2 - 2x_1x_2',
  rec: '\\frac{1}{x_1} + \\frac{1}{x_2} = \\frac{x_1 + x_2}{x_1x_2}',
  cube: 'x_1^3 + x_2^3 = (x_1 + x_2)^3 - 3x_1x_2(x_1 + x_2)',
  diff2: '(x_1 - x_2)^2 = (x_1 + x_2)^2 - 4x_1x_2',
};

const viet = y1Entry<VietP>({
  id: 'viet',
  topic: 29,
  draw: (req) => pickPool(req, 'viet', VIET_POOL),
  build: (p) => {
    const s = frac(-p.b, p.a);
    const pr = frac(p.c, p.a);
    const s2 = fMul(s, s);
    const two = frac(2);
    let val: Frac;
    let wrong: Frac[];
    let subst: string;
    if (p.qty === 'sq') {
      val = fSub(s2, fMul(two, pr));
      wrong = [fAdd(s2, fMul(two, pr)), s2, fSub(s2, pr), fSub(fMul(two, pr), s2)];
      subst = `${fp(s)}^2 - 2\\cdot ${fp(pr)}`;
    } else if (p.qty === 'rec') {
      val = fDiv(s, pr);
      wrong = [fDiv(pr, s), fMul(frac(-1), val), fMul(s, pr), fDiv(frac(p.b, 1), frac(p.c, 1))];
      subst = `${fp(s)} \\div ${fp(pr)}`;
    } else if (p.qty === 'cube') {
      val = fSub(fMul(s2, s), fMul(frac(3), fMul(pr, s)));
      wrong = [fAdd(fMul(s2, s), fMul(frac(3), fMul(pr, s))), fSub(fMul(s2, s), fMul(pr, s)), fSub(fMul(s2, s), fMul(frac(3), pr)), fMul(frac(-1), val)];
      subst = `${fp(s)}^3 - 3\\cdot ${fp(pr)}\\cdot ${fp(s)}`;
    } else {
      val = fSub(s2, fMul(frac(4), pr));
      wrong = [fSub(s2, fMul(two, pr)), fAdd(s2, fMul(frac(4), pr)), fSub(fMul(frac(4), pr), s2), fSub(s2, pr)];
      subst = `${fp(s)}^2 - 4\\cdot ${fp(pr)}`;
    }
    const eq = `${texPoly([p.a, p.b, p.c])} = 0`;
    const expr = VIET_EXPR[p.qty];
    const stem = pick({
      uz: `${M(eq)} kvadrat tenglamaning ildizlari ${M('x_1')} va ${M('x_2')} bo'lsin. ${M(expr)} ifodaning qiymatini toping.`,
      ru: `Пусть $x_1$ и $x_2$ — корни квадратного уравнения ${M(eq)}. Найдите значение выражения ${M(expr)}.`,
      kaa: `${M(eq)} kvadrat teńlemeniń túbirleri ${M('x_1')} hám ${M('x_2')} bolsın. ${M(expr)} ańlatpasınıń mánisin tabıń.`, // kaa: tekshirilsin
      en: `Let ${M('x_1')} and ${M('x_2')} be the roots of the quadratic equation ${M(eq)}. Find the value of ${M(expr)}.`,
    });
    const sumProd = `x_1 + x_2 = ${texFrac(s)}, \\quad x_1x_2 = ${texFrac(pr)}`;
    const calc = `${VIET_FORMULA[p.qty]}`;
    const res = `${subst} = ${texFrac(val)}`;
    const solution = pick({
      uz: `Viyet teoremasiga ko'ra ${M(sumProd)}.\n\nIfodani yig'indi va ko'paytma orqali yozamiz: ${M(calc)}.\n\nQiymatlarni qo'yamiz: ${M(res)}.`,
      ru: `По теореме Виета ${M(sumProd)}.\n\nВыразим через сумму и произведение корней: ${M(calc)}.\n\nПодставляем: ${M(res)}.`,
      kaa: `Vyet teoreması boyınsha ${M(sumProd)}.\n\nAńlatpanı qosındı hám kóbeyme arqalı jazamız: ${M(calc)}.\n\nMánislerdi qoyamız: ${M(res)}.`, // kaa: tekshirilsin
      en: `By Vieta's formulas ${M(sumProd)}.\n\nExpress the quantity through the sum and the product: ${M(calc)}.\n\nSubstitute: ${M(res)}.`,
    });
    const mistake = pick({
      uz: `Viyet teoremasida yig'indi ${M('-\\frac{b}{a}')} ekanini (ishorani) unutish yoki ifodani yig'indi va ko'paytma orqali noto'g'ri yozish.`,
      ru: `Забывают знак в сумме корней ${M('-\\frac{b}{a}')} или неверно выражают величину через сумму и произведение.`,
      kaa: `Vyet teoremasında qosındı ${M('-\\frac{b}{a}')} ekenin (belgisin) umıtıw yamasa ańlatpanı qosındı hám kóbeyme arqalı qáte jazıw.`, // kaa: tekshirilsin
      en: `Forgetting the sign in the sum of roots ${M('-\\frac{b}{a}')} or expressing the quantity incorrectly through the sum and product.`,
    });
    return { value: fv(val), ...fracChoices(val, wrong), est: 130, stem, solution, mistake };
  },
});

// 2. Kvadrat tengsizlikning butun yechimlari (30)
interface QineqP {
  p: number;
  gap: number;
  strict: boolean;
  ask: 'count' | 'sum';
}
const QINEQ_POOL: QineqP[] = [];
for (const p of range(-6, 3)) for (const gap of range(3, 8)) for (const strict of [true, false]) for (const ask of ['count', 'sum'] as const) QINEQ_POOL.push({ p, gap, strict, ask });

const qineqStem = (f: string, ask: 'count' | 'sum'): L10n =>
  ask === 'count'
    ? {
        uz: `${f} tengsizlikning butun yechimlari sonini toping.`,
        ru: `Найдите количество целых решений неравенства ${f}.`,
        kaa: `${f} teńsizliginiń pútin sheshimleri sanın tabıń.`, // kaa: tekshirilsin
        en: `Find the number of integer solutions of the inequality ${f}.`,
      }
    : {
        uz: `${f} tengsizlikning butun yechimlari yig'indisini toping.`,
        ru: `Найдите сумму целых решений неравенства ${f}.`,
        kaa: `${f} teńsizliginiń pútin sheshimleriniń qosındısın tabıń.`, // kaa: tekshirilsin
        en: `Find the sum of the integer solutions of the inequality ${f}.`,
      };

const qineq = y1Entry<QineqP>({
  id: 'qineq',
  topic: 30,
  draw: (req) => pickPool(req, 'qineq', QINEQ_POOL),
  build: (p) => {
    const q = p.p + p.gap;
    const ineq = `${texPoly([1, -(p.p + q), p.p * q])} ${p.strict ? '<' : '\\le'} 0`;
    const lo = p.strict ? p.p + 1 : p.p;
    const hi = p.strict ? q - 1 : q;
    const count = hi - lo + 1;
    const total = sumInts(lo, hi);
    const isCount = p.ask === 'count';
    const value = isCount ? count : total;
    const wrong = isCount
      ? [count + 1, count - 1, p.strict ? q - p.p + 1 : q - p.p - 1, p.strict ? q - p.p : q - p.p]
      : [sumInts(p.p, q), sumInts(p.p + 1, q), sumInts(p.p, q - 1), sumInts(p.p + 1, q - 1)];
    const set = p.strict ? `(${p.p};\\ ${q})` : `[${p.p};\\ ${q}]`;
    const list = range(lo, hi).join(', ');
    const stem = pick(qineqStem(M(ineq), p.ask));
    const res = isCount ? `${count}` : `${total}`;
    const solution = pick({
      uz: `Mos tenglamaning ildizlari ${M(String(p.p))} va ${M(String(q))} (Viyet teoremasi: yig'indisi ${p.p + q}, ko'paytmasi ${p.p * q}).\n\nParabolaning shoxlari yuqoriga qaragan, shuning uchun tengsizlik ildizlar orasida bajariladi: ${M(`x \\in ${set}`)}.\n\nButun yechimlar: ${M(list)}. ${isCount ? `Ularning soni ${count} ta.` : `Ularning yig'indisi ${total}.`} ${G.answer.uz}: ${M(res)}.`,
      ru: `Корни уравнения: ${M(String(p.p))} и ${M(String(q))} (по теореме Виета сумма ${p.p + q}, произведение ${p.p * q}).\n\nВетви параболы направлены вверх, поэтому неравенство выполняется между корнями: ${M(`x \\in ${set}`)}.\n\nЦелые решения: ${M(list)}. ${isCount ? `Их количество равно ${count}.` : `Их сумма равна ${total}.`} ${G.answer.ru}: ${M(res)}.`,
      kaa: `Teńlemeniń túbirleri: ${M(String(p.p))} hám ${M(String(q))} (Vyet teoreması: qosındısı ${p.p + q}, kóbeymesi ${p.p * q}).\n\nParabolanıń shaqaları joqarıǵa qaragan, sonlıqtan teńsizlik túbirler aralıǵında orınlanadı: ${M(`x \\in ${set}`)}.\n\nPútin sheshimler: ${M(list)}. ${isCount ? `Olardıń sanı ${count}.` : `Olardıń qosındısı ${total}.`} ${G.answer.kaa}: ${M(res)}.`, // kaa: tekshirilsin
      en: `The roots of the equation are ${M(String(p.p))} and ${M(String(q))} (Vieta: sum ${p.p + q}, product ${p.p * q}).\n\nThe parabola opens upward, so the inequality holds between the roots: ${M(`x \\in ${set}`)}.\n\nThe integer solutions are ${M(list)}. ${isCount ? `There are ${count} of them.` : `Their sum is ${total}.`} ${G.answer.en}: ${M(res)}.`,
    });
    const mistake = pick({
      uz: p.strict ? "Qat'iy tengsizlikda ildizlarning o'zi yechimga kirmaydi: chegaralarni yechimga qo'shib yuborish." : "Qat'iymas tengsizlikda ildizlarning o'zi ham yechimga kiradi: chegaralarni tashlab yuborish.",
      ru: p.strict ? 'При строгом неравенстве сами корни не входят в решение: ошибочно включают границы.' : 'При нестрогом неравенстве корни входят в решение: ошибочно отбрасывают границы.',
      kaa: p.strict ? "Qatań teńsizlikte túbirleriniń ózi sheshimge kirmeydi: shegaralardı qosıp jiberiw." : "Qatań emes teńsizlikte túbirleriniń ózi de sheshimge kiredi: shegaralardı taslap ketiw.", // kaa: tekshirilsin
      en: p.strict ? 'For a strict inequality the endpoints are not solutions: including the boundaries by mistake.' : 'For a non-strict inequality the endpoints are solutions: dropping the boundaries by mistake.',
    });
    return { value, ...intChoices(value, wrong), est: 110, stem, solution, mistake };
  },
});

// 3. Kasr-ratsional tenglama: begona ildiz (32)
interface TrapP {
  q: number;
  r: number;
  excl: 'q' | 'r';
}
const TRAP_POOL: TrapP[] = [];
for (const q of nonZero(-6, 7)) for (const r of nonZero(-6, 7)) if (q < r) for (const excl of ['q', 'r'] as const) TRAP_POOL.push({ q, r, excl });

const trap = y1Entry<TrapP>({
  id: 'trap',
  topic: 32,
  draw: (req) => pickPool(req, 'trap', TRAP_POOL),
  build: (p) => {
    const bad = p.excl === 'q' ? p.q : p.r;
    const good = p.excl === 'q' ? p.r : p.q;
    const eq = `\\frac{${texPoly([1, -(p.q + p.r), p.q * p.r])}}{${texLin('x', -bad)}} = 0`;
    const stem = pick({
      uz: `${M(eq)} tenglama ildizlarining yig'indisini toping.`,
      ru: `Найдите сумму корней уравнения ${M(eq)}.`,
      kaa: `${M(eq)} teńlemesi túbirleriniń qosındısın tabıń.`, // kaa: tekshirilsin
      en: `Find the sum of the roots of the equation ${M(eq)}.`,
    });
    const factor = `(x ${p.q < 0 ? '+' : '-'} ${Math.abs(p.q)})(x ${p.r < 0 ? '+' : '-'} ${Math.abs(p.r)}) = 0`;
    const solution = pick({
      uz: `Kasr nolga teng bo'lishi uchun surat nolga teng, maxraj esa noldan farqli bo'lishi kerak.\n\nSurat: ${M(factor)}, ya'ni ${M(`x = ${p.q}`)} yoki ${M(`x = ${p.r}`)}.\n\nMaxraj: ${M(`x \\ne ${bad}`)}, demak ${M(`x = ${bad}`)} begona ildiz. Faqat ${M(`x = ${good}`)} qoladi. ${G.answer.uz}: ${M(String(good))}.`,
      ru: `Дробь равна нулю, когда числитель равен нулю, а знаменатель не равен нулю.\n\nЧислитель: ${M(factor)}, то есть ${M(`x = ${p.q}`)} или ${M(`x = ${p.r}`)}.\n\nЗнаменатель: ${M(`x \\ne ${bad}`)}, значит ${M(`x = ${bad}`)} — посторонний корень. Остаётся только ${M(`x = ${good}`)}. ${G.answer.ru}: ${M(String(good))}.`,
      kaa: `Bólshek nolge teń bolıwı ushın alım nolge teń, bólim bolsa noldan ayrıqsha bolıwı kerek.\n\nAlım: ${M(factor)}, yaǵnıy ${M(`x = ${p.q}`)} yamasa ${M(`x = ${p.r}`)}.\n\nBólim: ${M(`x \\ne ${bad}`)}, demek ${M(`x = ${bad}`)} qosımsha túbir. Tek ${M(`x = ${good}`)} qaladı. ${G.answer.kaa}: ${M(String(good))}.`, // kaa: tekshirilsin
      en: `A fraction is zero when its numerator is zero and its denominator is not.\n\nNumerator: ${M(factor)}, so ${M(`x = ${p.q}`)} or ${M(`x = ${p.r}`)}.\n\nDenominator: ${M(`x \\ne ${bad}`)}, so ${M(`x = ${bad}`)} is an extraneous root. Only ${M(`x = ${good}`)} remains. ${G.answer.en}: ${M(String(good))}.`,
    });
    const mistake = pick({
      uz: `Maxrajni nolga aylantiradigan ildiz (${bad}) ni tashlab yubormaslik: ildizlar yig'indisi ${p.q + p.r} deb olinadi.`,
      ru: `Не отбрасывают корень ${bad}, обращающий знаменатель в нуль: сумму корней принимают равной ${p.q + p.r}.`,
      kaa: `Bólimdi nolge aylandıratuǵın túbirdi (${bad}) taslap ketpew: túbirler qosındısın ${p.q + p.r} dep alıw.`, // kaa: tekshirilsin
      en: `Not discarding the root ${bad} that makes the denominator zero: taking the sum of roots as ${p.q + p.r}.`,
    });
    return { value: good, ...intChoices(good, [p.q + p.r, bad, p.q * p.r, -good]), est: 100, stem, solution, mistake };
  },
});

// 4. Modulli tenglama |x-p|+|x-q|=s (33)
interface ModEqP {
  p: number;
  q: number;
  s: number;
  ask: 'max' | 'min';
}
const MODEQ_POOL: ModEqP[] = [];
for (const p of range(-4, 3)) for (const g of range(1, 6)) for (let j = 1; j <= 4; j++) for (const ask of ['max', 'min'] as const) MODEQ_POOL.push({ p, q: p + g, s: g + 2 * j, ask });

const modEq = y1Entry<ModEqP>({
  id: 'modEq',
  topic: 33,
  draw: (req) => pickPool(req, 'modEq', MODEQ_POOL),
  build: (p) => {
    const lo = (p.p + p.q - p.s) / 2;
    const hi = (p.p + p.q + p.s) / 2;
    const value = p.ask === 'max' ? hi : lo;
    const other = p.ask === 'max' ? lo : hi;
    const eq = `|${texLin('x', -p.p)}| + |${texLin('x', -p.q)}| = ${p.s}`;
    const stem = pick(
      p.ask === 'max'
        ? {
            uz: `${M(eq)} tenglamaning eng katta ildizini toping.`,
            ru: `Найдите наибольший корень уравнения ${M(eq)}.`,
            kaa: `${M(eq)} teńlemesiniń eń úlken túbirin tabıń.`,
            en: `Find the largest root of the equation ${M(eq)}.`,
          }
        : {
            uz: `${M(eq)} tenglamaning eng kichik ildizini toping.`,
            ru: `Найдите наименьший корень уравнения ${M(eq)}.`,
            kaa: `${M(eq)} teńlemesiniń eń kishi túbirin tabıń.`,
            en: `Find the smallest root of the equation ${M(eq)}.`,
          },
    );
    const gp = p.q - p.p;
    const solution = pick({
      uz: `Modullarni ochish uchun uch oraliqni qaraymiz.\n\n${M(`x < ${p.p}`)}: ${M(`-${par(texLin('x', -p.p))} - ${par(texLin('x', -p.q))} = ${p.s}`)}, bundan ${M(`x = ${lo}`)} (shart bajariladi).\n\n${M(`${p.p} \\le x \\le ${p.q}`)}: ifoda doim ${M(String(gp))} ga teng, ${M(`${gp} \\ne ${p.s}`)}, yechim yo'q.\n\n${M(`x > ${p.q}`)}: ${M(`${par(texLin('x', -p.p))} + ${par(texLin('x', -p.q))} = ${p.s}`)}, bundan ${M(`x = ${hi}`)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Раскрываем модули на трёх промежутках.\n\n${M(`x < ${p.p}`)}: ${M(`-${par(texLin('x', -p.p))} - ${par(texLin('x', -p.q))} = ${p.s}`)}, откуда ${M(`x = ${lo}`)} (условие выполнено).\n\n${M(`${p.p} \\le x \\le ${p.q}`)}: выражение всегда равно ${M(String(gp))}, а ${M(`${gp} \\ne ${p.s}`)}, решений нет.\n\n${M(`x > ${p.q}`)}: ${M(`${par(texLin('x', -p.p))} + ${par(texLin('x', -p.q))} = ${p.s}`)}, откуда ${M(`x = ${hi}`)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Modullardı ashıw ushın úsh aralıqtı qaraymız.\n\n${M(`x < ${p.p}`)}: ${M(`-${par(texLin('x', -p.p))} - ${par(texLin('x', -p.q))} = ${p.s}`)}, bunnan ${M(`x = ${lo}`)} (shárt orınlanadı).\n\n${M(`${p.p} \\le x \\le ${p.q}`)}: ańlatpa hámme waqıt ${M(String(gp))} ge teń, ${M(`${gp} \\ne ${p.s}`)}, sheshim joq.\n\n${M(`x > ${p.q}`)}: ${M(`${par(texLin('x', -p.p))} + ${par(texLin('x', -p.q))} = ${p.s}`)}, bunnan ${M(`x = ${hi}`)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `Remove the absolute values on three intervals.\n\n${M(`x < ${p.p}`)}: ${M(`-${par(texLin('x', -p.p))} - ${par(texLin('x', -p.q))} = ${p.s}`)}, so ${M(`x = ${lo}`)} (the condition holds).\n\n${M(`${p.p} \\le x \\le ${p.q}`)}: the expression is always ${M(String(gp))} and ${M(`${gp} \\ne ${p.s}`)}, no solutions.\n\n${M(`x > ${p.q}`)}: ${M(`${par(texLin('x', -p.p))} + ${par(texLin('x', -p.q))} = ${p.s}`)}, so ${M(`x = ${hi}`)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Modul belgisini oraliqlarga ajratmasdan ochish yoki topilgan ildizni mos oraliqqa tegishliligini tekshirmaslik.",
      ru: 'Раскрывают модули без разбиения на промежутки или не проверяют, принадлежит ли найденный корень своему промежутку.',
      kaa: "Modul belgisin aralıqlarǵa bólmey ashıw yamasa tabılǵan túbirdiń sáykes aralıqqa tiyisliligin tekspew.", // kaa: tekshirilsin
      en: 'Opening the absolute values without splitting into intervals, or not checking that each root lies in its interval.',
    });
    return { value, ...intChoices(value, [other, p.p + p.q, p.s, (gp + p.s) / 2]), est: 140, stem, solution, mistake };
  },
});

/** ifoda x ning o'zi bo'lmasa qavsga oladi */
function par(e: string): string {
  return e === 'x' ? e : `(${e})`;
}

/** x - 3 yoki x - (-3) -> "x + 3" ko'rinishini oldini olish uchun: musbat sonni o'zicha, manfiyni qavsda yozadi */
function texParen0(n: number): string {
  return n < 0 ? `(${n})` : String(n);
}

// 5. Modulli tengsizlik |ax+b| < c (33)
interface ModIneqP {
  a: number;
  b: number;
  c: number;
  strict: boolean;
}
const modCount = (p: ModIneqP, strict: boolean): number => {
  let n = 0;
  for (let x = -80; x <= 80; x++) {
    const v = Math.abs(p.a * x + p.b);
    if (strict ? v < p.c : v <= p.c) n++;
  }
  return n;
};
const MODINEQ_POOL: ModIneqP[] = [];
for (const a of [2, 3, 4, 5]) for (const b of nonZero(-9, 9)) for (const c of range(4, 15)) for (const strict of [true, false]) {
  const cand = { a, b, c, strict };
  const n = modCount(cand, strict);
  if (n >= 3 && n <= 8) MODINEQ_POOL.push(cand);
}

const modIneq = y1Entry<ModIneqP>({
  id: 'modIneq',
  topic: 33,
  draw: (req) => pickPool(req, 'modIneq', MODINEQ_POOL),
  build: (p) => {
    const ineq = `|${texPoly([p.a, p.b])}| ${p.strict ? '<' : '\\le'} ${p.c}`;
    const count = modCount(p, p.strict);
    const lo = frac(-p.c - p.b, p.a);
    const hi = frac(p.c - p.b, p.a);
    const rel = p.strict ? '<' : '\\le';
    const stem = pick(qineqStem(M(ineq), 'count'));
    const chain = `-${p.c} ${rel} ${texPoly([p.a, p.b])} ${rel} ${p.c}`;
    const interval = `${texFrac(lo)} ${rel} x ${rel} ${texFrac(hi)}`;
    const ints = range(-80, 80).filter((x) => (p.strict ? Math.abs(p.a * x + p.b) < p.c : Math.abs(p.a * x + p.b) <= p.c));
    const list = ints.join(', ');
    const solution = pick({
      uz: `Modulli tengsizlik ikki tomonlama tengsizlikka teng: ${M(chain)}.\n\nHar bir qismdan ${M(String(p.b))} ni ayirib, ${M(String(p.a))} ga bo'lamiz: ${M(interval)}.\n\nShu oraliqdagi butun sonlar: ${M(list)}, ya'ni ${count} ta. ${G.answer.uz}: ${M(String(count))}.`,
      ru: `Неравенство с модулем равносильно двойному неравенству: ${M(chain)}.\n\nВычитаем ${M(String(p.b))} из всех частей и делим на ${M(String(p.a))}: ${M(interval)}.\n\nЦелые числа на этом промежутке: ${M(list)}, их ${count}. ${G.answer.ru}: ${M(String(count))}.`,
      kaa: `Modulli teńsizlik eki tárepleme teńsizlikke teń: ${M(chain)}.\n\nHár bir bólekten ${M(String(p.b))} di alıp, ${M(String(p.a))} ǵa bólemiz: ${M(interval)}.\n\nUsı aralıqtaǵı pútin sanlar: ${M(list)}, yaǵnıy ${count} ta. ${G.answer.kaa}: ${M(String(count))}.`, // kaa: tekshirilsin
      en: `An absolute value inequality is equivalent to a double inequality: ${M(chain)}.\n\nSubtract ${M(String(p.b))} from all parts and divide by ${M(String(p.a))}: ${M(interval)}.\n\nThe integers in this range are ${M(list)}, that is ${count} of them. ${G.answer.en}: ${M(String(count))}.`,
    });
    const mistake = pick({
      uz: "Oraliq chegaralari butun son bo'lsa, qat'iy tengsizlikda ular yechimga kirmaydi (qat'iymasda kiradi): chegaralarni noto'g'ri hisoblash.",
      ru: 'Если границы промежутка целые, при строгом неравенстве они не входят в решение (при нестрогом входят): ошибка при учёте границ.',
      kaa: "Aralıq shegaraları pútin san bolsa, qatań teńsizlikte olar sheshimge kirmeydi (qatań emeste kiredi): shegaralardı qáte esaplaw.", // kaa: tekshirilsin
      en: 'If the endpoints are integers, a strict inequality excludes them (a non-strict one includes them): miscounting the boundary values.',
    });
    const other = modCount(p, !p.strict);
    return { value: count, ...intChoices(count, [other, count + 1, count - 1, count + 2]), est: 120, stem, solution, mistake };
  },
});

// 6. Irratsional tenglama: begona ildiz (34)
interface IrrP {
  b: number;
  d: number;
}
const IRR_POOL: IrrP[] = [];
for (const b of range(-3, 4)) for (const d of range(2, 6)) IRR_POOL.push({ b, d });

const irr = y1Entry<IrrP>({
  id: 'irr',
  topic: 34,
  draw: (req) => pickPool(req, 'irr', IRR_POOL),
  build: (p) => {
    const r1 = p.b + p.d;
    const r2 = 2 * p.b + 1 - r1;
    const a = p.b * p.b - r1 * r2;
    const eq = `\\sqrt{${texLin('x', a)}} = ${texLin('x', -p.b)}`;
    const stem = pick({
      uz: `${M(eq)} tenglamaning ildizini toping.`,
      ru: `Найдите корень уравнения ${M(eq)}.`,
      kaa: `${M(eq)} teńlemesiniń túbirin tabıń.`,
      en: `Find the root of the equation ${M(eq)}.`,
    });
    const squared = p.b === 0 ? `${texLin('x', a)} = x^2` : `${texLin('x', a)} = (${texLin('x', -p.b)})^2`;
    const quad = `${texPoly([1, -(2 * p.b + 1), p.b * p.b - a])} = 0`;
    const cond = `${texLin('x', -p.b)} \\ge 0`;
    const solution = pick({
      uz: `Ikkala qismni kvadratga ko'taramiz (shart: ${M(cond)}): ${M(squared)}.\n\nSoddalashtiramiz: ${M(quad)}, ildizlari ${M(String(r1))} va ${M(String(r2))}.\n\nShartni tekshiramiz: ${M(String(r1))} uchun ${M(`${r1} - ${texParen0(p.b)} = ${r1 - p.b} \\ge 0`)} to'g'ri, ${M(String(r2))} uchun ${M(`${r2} - ${texParen0(p.b)} = ${r2 - p.b} < 0`)} begona ildiz. ${G.answer.uz}: ${M(String(r1))}.`,
      ru: `Возводим обе части в квадрат (условие: ${M(cond)}): ${M(squared)}.\n\nУпрощаем: ${M(quad)}, корни ${M(String(r1))} и ${M(String(r2))}.\n\nПроверяем условие: для ${M(String(r1))} имеем ${M(`${r1} - ${texParen0(p.b)} = ${r1 - p.b} \\ge 0`)} — верно, для ${M(String(r2))} имеем ${M(`${r2} - ${texParen0(p.b)} = ${r2 - p.b} < 0`)} — посторонний корень. ${G.answer.ru}: ${M(String(r1))}.`,
      kaa: `Eki tárepti de kvadratqa kóteremiz (shárt: ${M(cond)}): ${M(squared)}.\n\nQarapayımlastıramız: ${M(quad)}, túbirleri ${M(String(r1))} hám ${M(String(r2))}.\n\nShártti tekseremiz: ${M(String(r1))} ushın ${M(`${r1} - ${texParen0(p.b)} = ${r1 - p.b} \\ge 0`)} durıs, ${M(String(r2))} ushın ${M(`${r2} - ${texParen0(p.b)} = ${r2 - p.b} < 0`)} qosımsha túbir. ${G.answer.kaa}: ${M(String(r1))}.`, // kaa: tekshirilsin
      en: `Square both sides (condition: ${M(cond)}): ${M(squared)}.\n\nSimplify: ${M(quad)}, with roots ${M(String(r1))} and ${M(String(r2))}.\n\nCheck the condition: for ${M(String(r1))} we get ${M(`${r1} - ${texParen0(p.b)} = ${r1 - p.b} \\ge 0`)}, true; for ${M(String(r2))} we get ${M(`${r2} - ${texParen0(p.b)} = ${r2 - p.b} < 0`)}, an extraneous root. ${G.answer.en}: ${M(String(r1))}.`,
    });
    const mistake = pick({
      uz: "Kvadratga ko'tarishda paydo bo'lgan begona ildizni tekshirmaslik (o'ng tomon manfiy bo'lmasligi shartini unutish).",
      ru: 'Не проверяют посторонний корень, появившийся при возведении в квадрат (забывают условие неотрицательности правой части).',
      kaa: "Kvadratqa kóteriwde payda bolǵan qosımsha túbirdi tekspew (ońǵa tárep teris bolmawı shártin umıtıw).", // kaa: tekshirilsin
      en: 'Not checking the extraneous root created by squaring (forgetting that the right-hand side must be non-negative).',
    });
    return { value: r1, ...intChoices(r1, [r2, r1 + r2, r1 * r2, a]), est: 150, stem, solution, mistake };
  },
});

// 7. Nochiziqli sistema (35)
interface SysP {
  x0: number;
  y0: number;
}
const SYS_POOL: SysP[] = [];
for (const x0 of nonZero(-6, 9)) for (const y0 of nonZero(-6, 9)) if (x0 !== y0 && x0 + y0 !== 0) SYS_POOL.push({ x0, y0 });

const system = y1Entry<SysP>({
  id: 'system',
  topic: 35,
  draw: (req) => pickPool(req, 'system', SYS_POOL),
  build: (p) => {
    const d = p.x0 - p.y0;
    const m = d * (p.x0 + p.y0);
    const sys = `\\begin{cases} x - y = ${d} \\\\ x^2 - y^2 = ${m} \\end{cases}`;
    const val = p.x0 * p.y0;
    const stem = pick({
      uz: `Tenglamalar sistemasi berilgan: ${M(sys)} ${M('xy')} ko'paytmaning qiymatini toping.`,
      ru: `Дана система уравнений: ${M(sys)} Найдите значение произведения ${M('xy')}.`,
      kaa: `Teńlemeler sisteması berilgen: ${M(sys)} ${M('xy')} kóbeymesiniń mánisin tabıń.`, // kaa: tekshirilsin
      en: `Given the system of equations ${M(sys)} find the value of the product ${M('xy')}.`,
    });
    const S = p.x0 + p.y0;
    const solution = pick({
      uz: `${M('x^2 - y^2 = (x - y)(x + y)')} bo'lgani uchun ikkinchi tenglamadan ${M(`${d}(x + y) = ${m}`)}, ya'ni ${M(`x + y = ${S}`)}.\n\n${M(`x - y = ${d}`)} bilan qo'shib: ${M(`2x = ${S + d}`)}, ${M(`x = ${p.x0}`)}, keyin ${M(`y = ${p.y0}`)}.\n\n${M(`xy = ${texParen0(p.x0)} \\cdot ${texParen0(p.y0)} = ${val}`)}.`,
      ru: `Так как ${M('x^2 - y^2 = (x - y)(x + y)')}, из второго уравнения ${M(`${d}(x + y) = ${m}`)}, то есть ${M(`x + y = ${S}`)}.\n\nСкладываем с ${M(`x - y = ${d}`)}: ${M(`2x = ${S + d}`)}, ${M(`x = ${p.x0}`)}, затем ${M(`y = ${p.y0}`)}.\n\n${M(`xy = ${texParen0(p.x0)} \\cdot ${texParen0(p.y0)} = ${val}`)}.`,
      kaa: `${M('x^2 - y^2 = (x - y)(x + y)')} bolǵanlıqtan ekinshi teńlemeden ${M(`${d}(x + y) = ${m}`)}, yaǵnıy ${M(`x + y = ${S}`)}.\n\n${M(`x - y = ${d}`)} menen qosıp: ${M(`2x = ${S + d}`)}, ${M(`x = ${p.x0}`)}, keyin ${M(`y = ${p.y0}`)}.\n\n${M(`xy = ${texParen0(p.x0)} \\cdot ${texParen0(p.y0)} = ${val}`)}.`, // kaa: tekshirilsin
      en: `Since ${M('x^2 - y^2 = (x - y)(x + y)')}, the second equation gives ${M(`${d}(x + y) = ${m}`)}, so ${M(`x + y = ${S}`)}.\n\nAdding ${M(`x - y = ${d}`)}: ${M(`2x = ${S + d}`)}, ${M(`x = ${p.x0}`)}, then ${M(`y = ${p.y0}`)}.\n\n${M(`xy = ${texParen0(p.x0)} \\cdot ${texParen0(p.y0)} = ${val}`)}.`,
    });
    const mistake = pick({
      uz: "Kvadratlar ayirmasini ko'paytuvchilarga ajratmaslik yoki $x$ va $y$ ni topishda ishora xatosiga yo'l qo'yish.",
      ru: 'Не раскладывают разность квадратов на множители или допускают ошибку в знаке при нахождении $x$ и $y$.',
      kaa: "Kvadratlar ayırmasın kóbeytiwshilerge ajıratpaw yamasa $x$ hám $y$ di tabıwda belgi qátesin jiberiw.", // kaa: tekshirilsin
      en: 'Not factoring the difference of squares, or making a sign error when finding $x$ and $y$.',
    });
    return { value: val, ...intChoices(val, [S, -val, p.x0 * p.x0 + p.y0 * p.y0, d]), est: 140, stem, solution, mistake };
  },
});

// 8. Ko'rsatkichli tenglama, almashtirish (37, 31)
interface ExpP {
  a: number;
  m: number;
  n: number;
  ask: 'sum' | 'prod';
}
const EXP_POOL: ExpP[] = [];
for (const [a, top] of [[2, 4], [3, 3], [5, 2]] as const) for (let m = 0; m <= top; m++) for (let n = m + 1; n <= top; n++) for (const ask of ['sum', 'prod'] as const) if (ask === 'sum' || m >= 1) EXP_POOL.push({ a, m, n, ask });

const exp = y1Entry<ExpP>({
  id: 'exp',
  topic: 37,
  extraTopics: [31],
  draw: (req) => pickPool(req, 'exp', EXP_POOL),
  build: (p) => {
    const { a, m, n } = p;
    const t1 = a ** m;
    const t2 = a ** n;
    const eq = `${a}^{2x} - ${t1 + t2}\\cdot ${a}^{x} + ${t1 * t2} = 0`;
    const value = p.ask === 'sum' ? m + n : m * n;
    const stem = pick(
      p.ask === 'sum'
        ? {
            uz: `${M(eq)} tenglama ildizlarining yig'indisini toping.`,
            ru: `Найдите сумму корней уравнения ${M(eq)}.`,
            kaa: `${M(eq)} teńlemesi túbirleriniń qosındısın tabıń.`,
            en: `Find the sum of the roots of the equation ${M(eq)}.`,
          }
        : {
            uz: `${M(eq)} tenglama ildizlarining ko'paytmasini toping.`,
            ru: `Найдите произведение корней уравнения ${M(eq)}.`,
            kaa: `${M(eq)} teńlemesi túbirleriniń kóbeymesin tabıń.`,
            en: `Find the product of the roots of the equation ${M(eq)}.`,
          },
    );
    const tq = `t^2 - ${t1 + t2}t + ${t1 * t2} = 0`;
    const fin = p.ask === 'sum' ? `${m} + ${n} = ${value}` : `${m} \\cdot ${n} = ${value}`;
    const solution = pick({
      uz: `${M(`t = ${a}^x`)} almashtirish olamiz (${M('t > 0')}): ${M(tq)}.\n\nViyet teoremasi bo'yicha ${M(`t = ${t1}`)} yoki ${M(`t = ${t2}`)}. Ikkalasi ham musbat.\n\n${M(`${a}^x = ${t1}`)} dan ${M(`x = ${m}`)}, ${M(`${a}^x = ${t2}`)} dan ${M(`x = ${n}`)}. ${G.answer.uz}: ${M(fin)}.`,
      ru: `Сделаем замену ${M(`t = ${a}^x`)} (${M('t > 0')}): ${M(tq)}.\n\nПо теореме Виета ${M(`t = ${t1}`)} или ${M(`t = ${t2}`)}. Оба корня положительны.\n\nИз ${M(`${a}^x = ${t1}`)} получаем ${M(`x = ${m}`)}, из ${M(`${a}^x = ${t2}`)} получаем ${M(`x = ${n}`)}. ${G.answer.ru}: ${M(fin)}.`,
      kaa: `${M(`t = ${a}^x`)} almastırıwın alamız (${M('t > 0')}): ${M(tq)}.\n\nVyet teoreması boyınsha ${M(`t = ${t1}`)} yamasa ${M(`t = ${t2}`)}. Ekewi de oń.\n\n${M(`${a}^x = ${t1}`)} den ${M(`x = ${m}`)}, ${M(`${a}^x = ${t2}`)} den ${M(`x = ${n}`)}. ${G.answer.kaa}: ${M(fin)}.`, // kaa: tekshirilsin
      en: `Substitute ${M(`t = ${a}^x`)} (${M('t > 0')}): ${M(tq)}.\n\nBy Vieta ${M(`t = ${t1}`)} or ${M(`t = ${t2}`)}. Both are positive.\n\nFrom ${M(`${a}^x = ${t1}`)} we get ${M(`x = ${m}`)}, from ${M(`${a}^x = ${t2}`)} we get ${M(`x = ${n}`)}. ${G.answer.en}: ${M(fin)}.`,
    });
    const mistake = pick({
      uz: `${M('t')} ning topilgan qiymatlarini ${M('x')} ning qiymati deb olish: ${M(`${a}^x = t`)} tenglamani yechishni unutish.`,
      ru: `Принимают найденные значения ${M('t')} за значения ${M('x')}: забывают решить уравнение ${M(`${a}^x = t`)}.`,
      kaa: `${M('t')} nıń tabılǵan mánislerin ${M('x')} tiń mánisi dep alıw: ${M(`${a}^x = t`)} teńlemesin sheshiwdi umıtıw.`, // kaa: tekshirilsin
      en: `Taking the found values of ${M('t')} as values of ${M('x')}: forgetting to solve ${M(`${a}^x = t`)}.`,
    });
    const wrong = p.ask === 'sum' ? [t1 + t2, t1 * t2, m * n, n - m] : [m + n, t1 * t2, t1 + t2, n - m];
    return { value, ...intChoices(value, wrong), est: 140, stem, solution, mistake };
  },
});

// 9. Logarifmik tenglama: aniqlanish sohasi (38)
interface LogP {
  a: number;
  i: number;
  j: number;
}
const LOG_POOL: LogP[] = [];
for (const [a, maxGap] of [[2, 3], [3, 2]] as const) for (const i of range(0, 2)) for (let g = 1; g <= maxGap; g++) LOG_POOL.push({ a, i, j: i + g });

const log = y1Entry<LogP>({
  id: 'log',
  topic: 38,
  draw: (req) => pickPool(req, 'log', LOG_POOL),
  build: (p) => {
    const r1 = p.a ** p.i;
    const big = p.a ** p.j;
    const s = big - r1;
    const k = p.i + p.j;
    const eq = `\\log_{${p.a}} x + \\log_{${p.a}} (x + ${s}) = ${k}`;
    const stem = pick({
      uz: `${M(eq)} tenglamaning ildizini toping.`,
      ru: `Найдите корень уравнения ${M(eq)}.`,
      kaa: `${M(eq)} teńlemesiniń túbirin tabıń.`,
      en: `Find the root of the equation ${M(eq)}.`,
    });
    const prod = `x(x + ${s}) = ${p.a}^{${k}} = ${p.a ** k}`;
    const quad = `x^2 + ${s}x - ${p.a ** k} = 0`;
    const solution = pick({
      uz: `Aniqlanish sohasi: ${M('x > 0')}.\n\nLogarifmlar yig'indisi ko'paytmaning logarifmiga teng: ${M(prod)}.\n\nKvadrat tenglama ${M(quad)} ning ildizlari ${M(String(r1))} va ${M(String(-big))}. Aniqlanish sohasiga ${M('x > 0')} faqat ${M(String(r1))} to'g'ri keladi. ${G.answer.uz}: ${M(String(r1))}.`,
      ru: `ОДЗ: ${M('x > 0')}.\n\nСумма логарифмов равна логарифму произведения: ${M(prod)}.\n\nКорни квадратного уравнения ${M(quad)}: ${M(String(r1))} и ${M(String(-big))}. Условию ${M('x > 0')} удовлетворяет только ${M(String(r1))}. ${G.answer.ru}: ${M(String(r1))}.`,
      kaa: `Anıqlanıw oblastı: ${M('x > 0')}.\n\nLogarifmler qosındısı kóbeymeniń logarifmine teń: ${M(prod)}.\n\n${M(quad)} kvadrat teńlemesiniń túbirleri ${M(String(r1))} hám ${M(String(-big))}. Anıqlanıw oblastına ${M('x > 0')} tek ${M(String(r1))} sáykes keledi. ${G.answer.kaa}: ${M(String(r1))}.`, // kaa: tekshirilsin
      en: `Domain: ${M('x > 0')}.\n\nThe sum of logarithms is the logarithm of the product: ${M(prod)}.\n\nThe quadratic ${M(quad)} has roots ${M(String(r1))} and ${M(String(-big))}. Only ${M(String(r1))} satisfies ${M('x > 0')}. ${G.answer.en}: ${M(String(r1))}.`,
    });
    const mistake = pick({
      uz: "Kvadrat tenglamaning manfiy ildizini aniqlanish sohasi bilan tekshirmaslik (logarifm ostidagi ifoda musbat bo'lishi kerak).",
      ru: 'Не проверяют отрицательный корень квадратного уравнения по ОДЗ (выражение под логарифмом должно быть положительным).',
      kaa: "Kvadrat teńlemeniń teris túbirin anıqlanıw oblastı menen tekspew (logarifm astındaǵı ańlatpa oń bolıwı kerek).", // kaa: tekshirilsin
      en: 'Not checking the negative root of the quadratic against the domain (the argument of a logarithm must be positive).',
    });
    return { value: r1, ...intChoices(r1, [-big, big, k, s]), est: 150, stem, solution, mistake };
  },
});

// 10. Trigonometrik tenglama: eng kichik musbat ildiz (39)
interface TrigEntry {
  fn: 'sin' | 'cos' | 'tan';
  val: string;
  /** qiymat (tekshiruv uchun) */
  num: number;
  /** t ning eng kichik musbat yechimi (pi ulushida) */
  t: Frac;
  /** boshqa oilaning eng kichik yechimi (pi ulushida) */
  alt: Frac;
}
const R2 = '\\frac{\\sqrt{2}}{2}';
const R3 = '\\frac{\\sqrt{3}}{2}';
const T3 = '\\frac{\\sqrt{3}}{3}';
export const TRIG_TABLE: TrigEntry[] = [
  { fn: 'sin', val: '\\frac{1}{2}', num: 0.5, t: frac(1, 6), alt: frac(5, 6) },
  { fn: 'sin', val: R2, num: Math.SQRT2 / 2, t: frac(1, 4), alt: frac(3, 4) },
  { fn: 'sin', val: R3, num: Math.sqrt(3) / 2, t: frac(1, 3), alt: frac(2, 3) },
  { fn: 'sin', val: '-\\frac{1}{2}', num: -0.5, t: frac(7, 6), alt: frac(11, 6) },
  { fn: 'sin', val: `-${R2}`, num: -Math.SQRT2 / 2, t: frac(5, 4), alt: frac(7, 4) },
  { fn: 'sin', val: `-${R3}`, num: -Math.sqrt(3) / 2, t: frac(4, 3), alt: frac(5, 3) },
  { fn: 'cos', val: '\\frac{1}{2}', num: 0.5, t: frac(1, 3), alt: frac(5, 3) },
  { fn: 'cos', val: R2, num: Math.SQRT2 / 2, t: frac(1, 4), alt: frac(7, 4) },
  { fn: 'cos', val: R3, num: Math.sqrt(3) / 2, t: frac(1, 6), alt: frac(11, 6) },
  { fn: 'cos', val: '-\\frac{1}{2}', num: -0.5, t: frac(2, 3), alt: frac(4, 3) },
  { fn: 'cos', val: `-${R2}`, num: -Math.SQRT2 / 2, t: frac(3, 4), alt: frac(5, 4) },
  { fn: 'cos', val: `-${R3}`, num: -Math.sqrt(3) / 2, t: frac(5, 6), alt: frac(7, 6) },
  { fn: 'tan', val: '1', num: 1, t: frac(1, 4), alt: frac(5, 4) },
  { fn: 'tan', val: '\\sqrt{3}', num: Math.sqrt(3), t: frac(1, 3), alt: frac(4, 3) },
  { fn: 'tan', val: T3, num: Math.sqrt(3) / 3, t: frac(1, 6), alt: frac(7, 6) },
  { fn: 'tan', val: '-1', num: -1, t: frac(3, 4), alt: frac(7, 4) },
  { fn: 'tan', val: '-\\sqrt{3}', num: -Math.sqrt(3), t: frac(2, 3), alt: frac(5, 3) },
  { fn: 'tan', val: `-${T3}`, num: -Math.sqrt(3) / 3, t: frac(5, 6), alt: frac(11, 6) },
];
interface TrigP {
  e: TrigEntry;
  k: number;
}
const TRIG_POOL: TrigP[] = [];
for (const e of TRIG_TABLE) for (const k of [2, 3, 4, 6]) TRIG_POOL.push({ e, k });

const trig = y1Entry<TrigP>({
  id: 'trig',
  topic: 39,
  draw: (req) => pickPool(req, 'trig', TRIG_POOL),
  build: (p) => {
    const root = fDiv(p.e.t, frac(p.k));
    const eq = `\\${p.e.fn} ${p.k}x = ${p.e.val}`;
    const stem = pick({
      uz: `${M(eq)} tenglamaning eng kichik musbat ildizini toping.`,
      ru: `Найдите наименьший положительный корень уравнения ${M(eq)}.`,
      kaa: `${M(eq)} teńlemesiniń eń kishi oń túbirin tabıń.`,
      en: `Find the smallest positive root of the equation ${M(eq)}.`,
    });
    const step1 = `t = ${p.k}x, \\quad \\${p.e.fn} t = ${p.e.val}`;
    const step2 = `t = ${texPi(p.e.t)}`;
    const step3 = `x = \\frac{t}{${p.k}} = ${texPi(root)}`;
    const solution = pick({
      uz: `Almashtirish: ${M(step1)}.\n\nBirlik aylana (yoki jadval qiymatlari) bo'yicha ${M('t')} ning eng kichik musbat qiymati: ${M(step2)}. Boshqa oilaning eng kichik yechimi ${M(texPi(p.e.alt))} dan katta yoki unga teng, shuning uchun u kichik emas.\n\nDemak ${M(step3)}. ${G.answer.uz}: ${M(texPi(root))}.`,
      ru: `Замена: ${M(step1)}.\n\nПо единичной окружности (или таблице значений) наименьшее положительное значение ${M('t')}: ${M(step2)}. Наименьшее решение другой серии ${M(texPi(p.e.alt))} не меньше, поэтому оно не подходит.\n\nЗначит, ${M(step3)}. ${G.answer.ru}: ${M(texPi(root))}.`,
      kaa: `Almastırıw: ${M(step1)}.\n\nBirlik aylana (yamasa keste mánisleri) boyınsha ${M('t')} nıń eń kishi oń mánisi: ${M(step2)}. Basqa qatardıń eń kishi sheshimi ${M(texPi(p.e.alt))} úlken yamasa teń, sonlıqtan ol kishi emes.\n\nDemek ${M(step3)}. ${G.answer.kaa}: ${M(texPi(root))}.`, // kaa: tekshirilsin
      en: `Substitute: ${M(step1)}.\n\nFrom the unit circle (or the table of values) the smallest positive value of ${M('t')} is ${M(step2)}. The smallest solution of the other family, ${M(texPi(p.e.alt))}, is not smaller.\n\nHence ${M(step3)}. ${G.answer.en}: ${M(texPi(root))}.`,
    });
    const mistake = pick({
      uz: `${M(`t = ${p.k}x`)} almashtirishdan keyin ${M('t')} ni ${p.k} ga bo'lishni unutish (yoki ${p.k} ga ko'paytirish), shuningdek manfiy qiymatlarda eng kichik musbat yechimni noto'g'ri tanlash.`,
      ru: `После замены ${M(`t = ${p.k}x`)} забывают разделить ${M('t')} на ${p.k} (или умножают на ${p.k}), а также неверно выбирают наименьший положительный корень при отрицательном значении.`,
      kaa: `${M(`t = ${p.k}x`)} almastırıwdan keyin ${M('t')} nı ${p.k} ǵa bóliwdi umıtıw (yamasa ${p.k} ǵa kóbeytiw), sonıń menen birge teris mánislerde eń kishi oń sheshimdi qáte tańlaw.`, // kaa: tekshirilsin
      en: `After substituting ${M(`t = ${p.k}x`)}, forgetting to divide ${M('t')} by ${p.k} (or multiplying by ${p.k}), or picking the wrong smallest positive root when the value is negative.`,
    });
    const correct = M(texPi(root));
    const wrong = [fMul(p.e.t, frac(p.k)), p.e.t, fDiv(p.e.alt, frac(p.k)), fDiv(fAdd(p.e.t, frac(1)), frac(p.k)), fMul(root, frac(2)), fDiv(fSub(frac(1), p.e.t), frac(p.k))].map((f) => M(texPi(f)));
    return { value: fv(root) * Math.PI, ...textChoices(correct, wrong), est: 150, stem, solution, mistake };
  },
});

// 11. Parametrli tenglama: yagona ildiz (41)
interface ParamP {
  p: number;
  q: number;
  a0: number;
}
const PARAM_POOL: ParamP[] = [];
for (const p of nonZero(-5, 5)) for (const q of [1, 2, 3]) for (const a0 of nonZero(-6, 6)) if (p * p - q * a0 !== 0) PARAM_POOL.push({ p, q, a0 });

const param = y1Entry<ParamP>({
  id: 'param',
  topic: 41,
  extraTopics: [29],
  draw: (req) => pickPool(req, 'param', PARAM_POOL),
  build: (p) => {
    const r = p.p * p.p - p.q * p.a0;
    const qa = `${p.q === 1 ? '' : p.q}a`;
    const cst = `${qa} ${r < 0 ? '-' : '+'} ${Math.abs(r)}`;
    const eq = `x^2 ${p.p < 0 ? '-' : '+'} ${2 * Math.abs(p.p)}x + ${cst} = 0`;
    const stem = pick({
      uz: `${M(eq)} tenglama faqat bitta ildizga ega bo'ladigan ${M('a')} parametrning qiymatini toping.`,
      ru: `Найдите значение параметра ${M('a')}, при котором уравнение ${M(eq)} имеет ровно один корень.`,
      kaa: `${M(eq)} teńlemesi tek bir túbirge iye bolatuǵın ${M('a')} parametriniń mánisin tabıń.`, // kaa: tekshirilsin
      en: `Find the value of the parameter ${M('a')} for which the equation ${M(eq)} has exactly one root.`,
    });
    const disc = `D = ${(2 * p.p) ** 2} - 4(${cst}) = 0`;
    const expanded = `${4 * p.p * p.p} - ${4 * p.q}a ${r < 0 ? '+' : '-'} ${4 * Math.abs(r)} = 0`;
    const lin = `${4 * p.q}a = ${4 * p.q * p.a0}`;
    const solution = pick({
      uz: `Kvadrat tenglama faqat bitta ildizga ega bo'lishi uchun diskriminant nolga teng bo'lishi kerak: ${M(disc)}.

Qavsni ochamiz: ${M(expanded)}, bundan ${M(lin)}, ya'ni ${M(`a = ${p.a0}`)}. ${G.answer.uz}: ${M(String(p.a0))}.`,
      ru: `Квадратное уравнение имеет ровно один корень, когда дискриминант равен нулю: ${M(disc)}.

Раскрываем скобки: ${M(expanded)}, откуда ${M(lin)}, то есть ${M(`a = ${p.a0}`)}. ${G.answer.ru}: ${M(String(p.a0))}.`,
      kaa: `Kvadrat teńleme tek bir túbirge iye bolıwı ushın diskriminant nolge teń bolıwı kerek: ${M(disc)}.

Qawıstı ashamız: ${M(expanded)}, bunnan ${M(lin)}, yaǵnıy ${M(`a = ${p.a0}`)}. ${G.answer.kaa}: ${M(String(p.a0))}.`, // kaa: tekshirilsin
      en: `A quadratic has exactly one root when its discriminant is zero: ${M(disc)}.

Expanding the bracket: ${M(expanded)}, so ${M(lin)}, that is ${M(`a = ${p.a0}`)}. ${G.answer.en}: ${M(String(p.a0))}.`,
    });
    const mistake = pick({
      uz: "Diskriminantda parametrli qavsni ishorasi bilan ochishda xato (4 ni qavs ichidagi har bir hadga ko'paytirmaslik).",
      ru: 'Ошибка при раскрытии скобки с параметром в дискриминанте (4 умножают не на каждое слагаемое в скобках).',
      kaa: "Diskriminantta parametrli qawısıtı belgisi menen ashıwda qátelik (4 ti qawıs ishindegi hár bir hadqa kóbeytpew).", // kaa: tekshirilsin
      en: 'Expanding the bracket with the parameter incorrectly in the discriminant (not multiplying 4 by every term in the brackets).',
    });
    const wrong = [frac(-p.a0), frac(p.p * p.p + r, p.q), frac(p.p * p.p, p.q), frac(p.a0 + p.q)];
    return { value: p.a0, ...fracChoices(frac(p.a0), wrong), est: 130, stem, solution, mistake };
  },
});

// 12. Matnli masala: harakat (42)
interface MotionP {
  u1: number;
  u2: number;
  ask: 'current' | 'boat';
}
export interface MotionBase {
  u1: number;
  u2: number;
  d: number;
  t1: number;
  t2: number;
}
export function motionBase(u1: number, u2: number): MotionBase | null {
  const l = lcm(u1, u2);
  const d = l * Math.max(1, Math.ceil(48 / l));
  if (d > 300 || d / u2 > 16) return null;
  return { u1, u2, d, t1: d / u1, t2: d / u2 };
}
const MOTION_BASES: MotionBase[] = [];
for (const u1 of range(8, 30)) for (const u2 of range(4, u1 - 2)) if ((u1 - u2) % 2 === 0) {
  const b = motionBase(u1, u2);
  if (b && b.t1 >= 2) MOTION_BASES.push(b);
}
const MOTION_POOL: MotionP[] = MOTION_BASES.flatMap((b) => (['current', 'boat'] as const).map((ask) => ({ u1: b.u1, u2: b.u2, ask })));

const motion = y1Entry<MotionP>({
  id: 'motion',
  topic: 42,
  draw: (req) => pickPool(req, 'motion', MOTION_POOL),
  build: (p) => {
    const b = motionBase(p.u1, p.u2)!;
    const v = (p.u1 + p.u2) / 2;
    const c = (p.u1 - p.u2) / 2;
    const value = p.ask === 'current' ? c : v;
    const stem = pick(
      p.ask === 'current'
        ? {
            uz: `Qayiq daryo oqimi bo'ylab ${b.d} km yo'lni ${b.t1} soatda, oqimga qarshi shu yo'lni ${b.t2} soatda bosib o'tdi. Daryo oqimining tezligini (km/soat) toping.`,
            ru: `Лодка прошла ${b.d} км по течению реки за ${b.t1} ч, а против течения тот же путь — за ${b.t2} ч. Найдите скорость течения реки (км/ч).`,
            kaa: `Qayıq dárya aǵısı boyınsha ${b.d} km jolǵa ${b.t1} saatta, aǵısqa qarama-qarsı sol jolǵa ${b.t2} saatta jetti. Dárya aǵısınıń tezligin (km/saat) tabıń.`, // kaa: tekshirilsin
            en: `A boat travelled ${b.d} km downstream in ${b.t1} hours and the same distance upstream in ${b.t2} hours. Find the speed of the current (km/h).`,
          }
        : {
            uz: `Qayiq daryo oqimi bo'ylab ${b.d} km yo'lni ${b.t1} soatda, oqimga qarshi shu yo'lni ${b.t2} soatda bosib o'tdi. Qayiqning turg'un suvdagi tezligini (km/soat) toping.`,
            ru: `Лодка прошла ${b.d} км по течению реки за ${b.t1} ч, а против течения тот же путь — за ${b.t2} ч. Найдите собственную скорость лодки (км/ч).`,
            kaa: `Qayıq dárya aǵısı boyınsha ${b.d} km jolǵa ${b.t1} saatta, aǵısqa qarama-qarsı sol jolǵa ${b.t2} saatta jetti. Qayıqtıń turaqlı suwdaǵı tezligin (km/saat) tabıń.`, // kaa: tekshirilsin
            en: `A boat travelled ${b.d} km downstream in ${b.t1} hours and the same distance upstream in ${b.t2} hours. Find the speed of the boat in still water (km/h).`,
          },
    );
    const sys = `v + c = \\frac{${b.d}}{${b.t1}} = ${p.u1}, \\quad v - c = \\frac{${b.d}}{${b.t2}} = ${p.u2}`;
    const fin = p.ask === 'current' ? `c = \\frac{${p.u1} - ${p.u2}}{2} = ${c}` : `v = \\frac{${p.u1} + ${p.u2}}{2} = ${v}`;
    const solution = pick({
      uz: `Qayiqning turg'un suvdagi tezligi ${M('v')}, oqim tezligi ${M('c')} bo'lsin. Oqim bo'ylab tezlik ${M('v + c')}, oqimga qarshi ${M('v - c')}.\n\n${M(sys)}.\n\nTenglamalarni qo'shsak yoki ayirsak: ${M(fin)}. ${G.answer.uz}: ${M(String(value))}.`,
      ru: `Пусть ${M('v')} — собственная скорость лодки, ${M('c')} — скорость течения. По течению скорость ${M('v + c')}, против течения ${M('v - c')}.\n\n${M(sys)}.\n\nСкладывая или вычитая уравнения, получаем ${M(fin)}. ${G.answer.ru}: ${M(String(value))}.`,
      kaa: `Qayıqtıń turaqlı suwdaǵı tezligi ${M('v')}, aǵıs tezligi ${M('c')} bolsın. Aǵıs boyınsha tezlik ${M('v + c')}, aǵısqa qarsı ${M('v - c')}.\n\n${M(sys)}.\n\nTeńlemelerdi qossaq yamasa ayırsaq: ${M(fin)}. ${G.answer.kaa}: ${M(String(value))}.`, // kaa: tekshirilsin
      en: `Let ${M('v')} be the boat's speed in still water and ${M('c')} the speed of the current. The downstream speed is ${M('v + c')} and the upstream speed is ${M('v - c')}.\n\n${M(sys)}.\n\nAdding or subtracting the equations gives ${M(fin)}. ${G.answer.en}: ${M(String(value))}.`,
    });
    const mistake = pick({
      uz: "Oqim bo'ylab va oqimga qarshi tezliklarni aralashtirish yoki tezliklar yig'indisi (ayirmasi)ni 2 ga bo'lishni unutish.",
      ru: 'Путают скорости по течению и против течения или забывают разделить сумму (разность) скоростей на 2.',
      kaa: "Aǵıs boyınsha hám aǵısqa qarsı tezliklerdi aralastırıw yamasa tezlikler qosındısın (ayırmasın) 2 ge bóliwdi umıtıw.", // kaa: tekshirilsin
      en: 'Mixing up the downstream and upstream speeds, or forgetting to divide the sum (difference) of the speeds by 2.',
    });
    const wrong = p.ask === 'current' ? [v, p.u1 - p.u2, p.u2, p.u1] : [c, p.u1 + p.u2, p.u1, p.u2];
    return { value, ...intChoices(value, wrong), est: 130, stem, solution, mistake };
  },
});

// 13. Matnli masala: aralashma (42)
interface MixP {
  m: number;
  p: number;
  q: number;
  r: number;
}
const MIX_POOL: MixP[] = [];
for (let m = 10; m <= 60; m += 5) for (let p = 5; p <= 80; p += 5) for (let r = p + 5; r <= 85; r += 5) for (let q = r + 5; q <= 95; q += 5) {
  const num = m * (r - p);
  const den = q - r;
  if (num % den === 0 && num / den >= 5 && num / den <= 150 && num / den !== m) MIX_POOL.push({ m, p, q, r });
}

const mixture = y1Entry<MixP>({
  id: 'mixture',
  topic: 42,
  draw: (req) => pickPool(req, 'mixture', MIX_POOL),
  build: (p) => {
    const x = (p.m * (p.r - p.p)) / (p.q - p.r);
    const stem = pick({
      uz: `${p.p}% li ${p.m} kg eritmaga ${p.q}% li eritmadan necha kg qo'shilsa, ${p.r}% li eritma hosil bo'ladi?`,
      ru: `Сколько килограммов ${p.q}%-ного раствора нужно добавить к ${p.m} кг ${p.p}%-ного раствора, чтобы получить ${p.r}%-ный раствор?`,
      kaa: `${p.p}% lı ${p.m} kg eritpege ${p.q}% lı eritpeden neshe kg qossa, ${p.r}% lı eritpe payda boladı?`, // kaa: tekshirilsin
      en: `How many kilograms of a ${p.q}% solution must be added to ${p.m} kg of a ${p.p}% solution to obtain a ${p.r}% solution?`,
    });
    const bal = `${p.m}\\cdot ${p.p} + x\\cdot ${p.q} = (${p.m} + x)\\cdot ${p.r}`;
    const lin = `${p.m * p.p} + ${p.q}x = ${p.m * p.r} + ${p.r}x`;
    const fin = `${p.q - p.r}x = ${p.m * (p.r - p.p)}, \\quad x = ${x}`;
    const solution = pick({
      uz: `Qo'shiladigan eritma ${M('x')} kg bo'lsin. Sof modda miqdori (foiz birligida) saqlanadi: ${M(bal)}.\n\nSoddalashtiramiz: ${M(lin)}.\n\nBundan ${M(fin)}. ${G.answer.uz}: ${M(String(x))}.`,
      ru: `Пусть добавили ${M('x')} кг раствора. Количество чистого вещества (в процентных единицах) сохраняется: ${M(bal)}.\n\nУпрощаем: ${M(lin)}.\n\nОтсюда ${M(fin)}. ${G.answer.ru}: ${M(String(x))}.`,
      kaa: `Qosılatuǵın eritpe ${M('x')} kg bolsın. Taza zat muǵdarı (procent birliginde) saqlanadı: ${M(bal)}.\n\nQarapayımlastıramız: ${M(lin)}.\n\nBunnan ${M(fin)}. ${G.answer.kaa}: ${M(String(x))}.`, // kaa: tekshirilsin
      en: `Let ${M('x')} kg of the solution be added. The amount of pure substance (in percent units) is conserved: ${M(bal)}.\n\nSimplify: ${M(lin)}.\n\nHence ${M(fin)}. ${G.answer.en}: ${M(String(x))}.`,
    });
    const mistake = pick({
      uz: `Foiz farqlarini noto'g'ri olish: ${M(`${p.q} - ${p.r}`)} o'rniga ${M(`${p.q} - ${p.p}`)} ni olish yoki ayirmalar tartibini almashtirish.`,
      ru: `Неверно берут разности процентов: вместо ${M(`${p.q} - ${p.r}`)} используют ${M(`${p.q} - ${p.p}`)} или меняют разности местами.`,
      kaa: `Procent ayırmaların qáte alıw: ${M(`${p.q} - ${p.r}`)} ornına ${M(`${p.q} - ${p.p}`)} di alıw yamasa ayırmalardıń ornın almastırıw.`, // kaa: tekshirilsin
      en: `Taking the percentage differences incorrectly: using ${M(`${p.q} - ${p.p}`)} instead of ${M(`${p.q} - ${p.r}`)}, or swapping the differences.`,
    });
    const wrong = [frac(p.m * (p.r - p.p), p.q - p.p), frac(p.m * (p.q - p.r), p.r - p.p), frac(p.m * (p.r - p.p), p.q + p.r), frac(p.m * (p.q - p.r), p.q - p.p)];
    return { value: x, ...fracChoices(frac(x), wrong), est: 140, stem, solution, mistake };
  },
});

export const TENGLAMA_Y1: readonly Y1Entry[] = [viet, qineq, exp, irr, modEq, system, log, trap, trig, motion, param, modIneq, mixture];

// ---------------------------------------------------------------------------------------------
// O (ochiq) shablonlari
// ---------------------------------------------------------------------------------------------

// O1. Ratsional ildizli kvadrat tenglama: katta ildiz va kvadratlar yig'indisi (29)
interface OVietP {
  n1: number;
  d1: number;
  n2: number;
  d2: number;
}
const OVIET_POOL: OVietP[] = [];
for (const d1 of [1, 2, 3]) for (const d2 of [1, 2, 3]) for (const n1 of nonZero(-5, 5)) for (const n2 of nonZero(-5, 5)) {
  if (gcd(n1, d1) !== 1 || gcd(n2, d2) !== 1) continue;
  if (d1 > d2 || (d1 === d2 && n1 >= n2)) continue;
  if (d1 * d2 === 1 && Math.abs(n1) + Math.abs(n2) > 8) continue;
  OVIET_POOL.push({ n1, d1, n2, d2 });
}

const oViet = oEntry<OVietP>({
  id: 'oViet',
  topic: 29,
  draw: (req) => pickPool(req, 'oViet', OVIET_POOL),
  build: (p) => {
    const A = p.d1 * p.d2;
    const B = -(p.d1 * p.n2 + p.d2 * p.n1);
    const C = p.n1 * p.n2;
    const x1 = frac(p.n1, p.d1);
    const x2 = frac(p.n2, p.d2);
    const big = fv(x1) > fv(x2) ? x1 : x2;
    const sq = fAdd(fMul(x1, x1), fMul(x2, x2));
    const eq = `${texPoly([A, B, C])} = 0`;
    const disc = B * B - 4 * A * C;
    const rt = Math.round(Math.sqrt(disc));
    const stem = pick({
      uz: `Kvadrat tenglama berilgan: ${M(eq)}. Uning ildizlari ${M('x_1')} va ${M('x_2')}.`,
      ru: `Дано квадратное уравнение ${M(eq)}. Его корни — ${M('x_1')} и ${M('x_2')}.`,
      kaa: `Kvadrat teńleme berilgen: ${M(eq)}. Onıń túbirleri ${M('x_1')} hám ${M('x_2')}.`, // kaa: tekshirilsin
      en: `The quadratic equation ${M(eq)} is given. Its roots are ${M('x_1')} and ${M('x_2')}.`,
    });
    const roots = `x_{1,2} = \\frac{${-B} \\pm ${rt}}{${2 * A}}`;
    const solution = pick({
      uz: `Diskriminant: ${M(`D = ${B * B} - 4\\cdot ${A}\\cdot ${texParen0(C)} = ${disc}`)}, ${M(`\\sqrt{D} = ${rt}`)}.\n\nIldizlar: ${M(roots)}, ya'ni ${M(`x_1 = ${texFrac(x1)}`)}, ${M(`x_2 = ${texFrac(x2)}`)}. Katta ildiz ${M(texFrac(big))}.\n\nKvadratlar yig'indisi: ${M(`x_1^2 + x_2^2 = ${texFrac(sq)}`)}.`,
      ru: `Дискриминант: ${M(`D = ${B * B} - 4\\cdot ${A}\\cdot ${texParen0(C)} = ${disc}`)}, ${M(`\\sqrt{D} = ${rt}`)}.\n\nКорни: ${M(roots)}, то есть ${M(`x_1 = ${texFrac(x1)}`)}, ${M(`x_2 = ${texFrac(x2)}`)}. Больший корень равен ${M(texFrac(big))}.\n\nСумма квадратов: ${M(`x_1^2 + x_2^2 = ${texFrac(sq)}`)}.`,
      kaa: `Diskriminant: ${M(`D = ${B * B} - 4\\cdot ${A}\\cdot ${texParen0(C)} = ${disc}`)}, ${M(`\\sqrt{D} = ${rt}`)}.\n\nTúbirler: ${M(roots)}, yaǵnıy ${M(`x_1 = ${texFrac(x1)}`)}, ${M(`x_2 = ${texFrac(x2)}`)}. Úlken túbir ${M(texFrac(big))}.\n\nKvadratlar qosındısı: ${M(`x_1^2 + x_2^2 = ${texFrac(sq)}`)}.`, // kaa: tekshirilsin
      en: `Discriminant: ${M(`D = ${B * B} - 4\\cdot ${A}\\cdot ${texParen0(C)} = ${disc}`)}, ${M(`\\sqrt{D} = ${rt}`)}.\n\nRoots: ${M(roots)}, that is ${M(`x_1 = ${texFrac(x1)}`)}, ${M(`x_2 = ${texFrac(x2)}`)}. The larger root is ${M(texFrac(big))}.\n\nSum of squares: ${M(`x_1^2 + x_2^2 = ${texFrac(sq)}`)}.`,
    });
    const mistake = pick({
      uz: "Diskriminantni hisoblashda yoki kasr ildizni kvadratga ko'tarishda (faqat suratni kvadratga oshirib, maxrajni unutish) xato qilish.",
      ru: 'Ошибки при вычислении дискриминанта или при возведении дробного корня в квадрат (возводят в квадрат только числитель).',
      kaa: "Diskriminantti esaplawda yamasa bólshek túbirdi kvadratqa kóteriwde (tek alımdı kvadratqa kóterip, bólimdi umıtıw) qátelesiw.", // kaa: tekshirilsin
      en: 'Errors when computing the discriminant or when squaring a fractional root (squaring only the numerator).',
    });
    return {
      est: 320,
      stem,
      parts: {
        a: fracPart(
          big,
          pick({ uz: 'Tenglamaning katta ildizini toping.', ru: 'Найдите больший корень уравнения.', kaa: 'Teńlemeniń úlken túbirin tabıń.', en: 'Find the larger root of the equation.' }),
          true,
        ),
        b: fracPart(
          sq,
          pick({
            uz: `${M('x_1^2 + x_2^2')} ning qiymatini toping.`,
            ru: `Найдите значение ${M('x_1^2 + x_2^2')}.`,
            kaa: `${M('x_1^2 + x_2^2')} tiń mánisin tabıń.`,
            en: `Find the value of ${M('x_1^2 + x_2^2')}.`,
          }),
          true,
        ),
      },
      solution,
      mistake,
    };
  },
});

// O2. Kvadrat tengsizlik: butun yechimlar soni va yig'indisi (30)
interface OQineqP {
  a: number;
  p: number;
  gap: number;
  strict: boolean;
}
const OQINEQ_POOL: OQineqP[] = [];
for (const a of [1, 2, 3]) for (const p of range(-5, 2)) for (const gap of range(3, 7)) for (const strict of [true, false]) OQINEQ_POOL.push({ a, p, gap, strict });

const oQineq = oEntry<OQineqP>({
  id: 'oQineq',
  topic: 30,
  draw: (req) => pickPool(req, 'oQineq', OQINEQ_POOL),
  build: (p) => {
    const q = p.p + p.gap;
    const ineq = `${texPoly([p.a, -p.a * (p.p + q), p.a * p.p * q])} ${p.strict ? '<' : '\\le'} 0`;
    const lo = p.strict ? p.p + 1 : p.p;
    const hi = p.strict ? q - 1 : q;
    const count = hi - lo + 1;
    const total = sumInts(lo, hi);
    const set = p.strict ? `(${p.p};\\ ${q})` : `[${p.p};\\ ${q}]`;
    const list = range(lo, hi).join(', ');
    const stem = pick({
      uz: `${M(ineq)} tengsizlik berilgan.`,
      ru: `Дано неравенство ${M(ineq)}.`,
      kaa: `${M(ineq)} teńsizligi berilgen.`,
      en: `The inequality ${M(ineq)} is given.`,
    });
    const solution = pick({
      uz: `${M(String(p.a))} ga bo'lib, ildizlarni topamiz: ildizlar ${M(String(p.p))} va ${M(String(q))} (yig'indisi ${p.p + q}, ko'paytmasi ${p.p * q}). Parabola shoxlari yuqoriga qaragan, shuning uchun yechim: ${M(`x \\in ${set}`)}.\n\nButun yechimlar: ${M(list)}. Ularning soni ${count} ta, yig'indisi ${total}.`,
      ru: `Делим на ${M(String(p.a))} и находим корни: ${M(String(p.p))} и ${M(String(q))} (сумма ${p.p + q}, произведение ${p.p * q}). Ветви параболы направлены вверх, поэтому решение: ${M(`x \\in ${set}`)}.\n\nЦелые решения: ${M(list)}. Их количество ${count}, сумма ${total}.`,
      kaa: `${M(String(p.a))} ǵa bólip, túbirlerdi tabamız: ${M(String(p.p))} hám ${M(String(q))} (qosındısı ${p.p + q}, kóbeymesi ${p.p * q}). Parabola shaqaları joqarıǵa qaragan, sonlıqtan sheshim: ${M(`x \\in ${set}`)}.\n\nPútin sheshimler: ${M(list)}. Olardıń sanı ${count} ta, qosındısı ${total}.`, // kaa: tekshirilsin
      en: `Divide by ${M(String(p.a))} and find the roots ${M(String(p.p))} and ${M(String(q))} (sum ${p.p + q}, product ${p.p * q}). The parabola opens upward, so the solution is ${M(`x \\in ${set}`)}.\n\nInteger solutions: ${M(list)}. There are ${count} of them, with sum ${total}.`,
    });
    const mistake = pick({
      uz: p.strict ? "Qat'iy tengsizlikda ildizlarni yechimga kiritib yuborish." : "Qat'iymas tengsizlikda ildizlarni yechimdan chiqarib tashlash.",
      ru: p.strict ? 'Включают корни в решение при строгом неравенстве.' : 'Исключают корни из решения при нестрогом неравенстве.',
      kaa: p.strict ? "Qatań teńsizlikte túbirlerdi sheshimge kirgizip jiberiw." : "Qatań emes teńsizlikte túbirlerdi sheshimnen shıǵarıp taslaw.", // kaa: tekshirilsin
      en: p.strict ? 'Including the roots in the solution of a strict inequality.' : 'Excluding the roots from the solution of a non-strict inequality.',
    });
    return {
      est: 300,
      stem,
      parts: {
        a: { value: count, forms: [String(count)], prompt: pick({ uz: "Tengsizlikning butun yechimlari sonini toping.", ru: 'Найдите количество целых решений неравенства.', kaa: 'Teńsizliktiń pútin sheshimleri sanın tabıń.', en: 'Find the number of integer solutions of the inequality.' }) },
        b: { value: total, forms: [String(total)], prompt: pick({ uz: "Tengsizlikning barcha butun yechimlari yig'indisini toping.", ru: 'Найдите сумму всех целых решений неравенства.', kaa: 'Teńsizliktiń barlıq pútin sheshimleriniń qosındısın tabıń.', en: 'Find the sum of all integer solutions of the inequality.' }) },
      },
      solution,
      mistake,
    };
  },
});

// O3. Bikvadrat tenglama (31)
type BiqKind = 'four' | 'three' | 'two';
interface OBiqP {
  kind: BiqKind;
  m: number;
  n: number;
}
const OBIQ_POOL: OBiqP[] = [];
for (const m of range(1, 4)) for (const n of range(m + 1, 4)) OBIQ_POOL.push({ kind: 'four', m, n });
for (const m of range(2, 7)) OBIQ_POOL.push({ kind: 'three', m, n: 0 });
for (const m of range(1, 5)) for (const n of range(1, 9)) OBIQ_POOL.push({ kind: 'two', m, n });

const oBiq = oEntry<OBiqP>({
  id: 'oBiq',
  topic: 31,
  draw: (req) => pickPool(req, 'oBiq', OBIQ_POOL),
  build: (p) => {
    const t1 = p.m * p.m;
    const t2 = p.kind === 'four' ? p.n * p.n : p.kind === 'three' ? 0 : -p.n;
    const eq = `${texPoly([1, 0, -(t1 + t2), 0, t1 * t2])} = 0`;
    const roots = [p.m, -p.m, ...(p.kind === 'four' ? [p.n, -p.n] : p.kind === 'three' ? [0] : [])];
    const count = roots.length;
    const sumSq = roots.reduce((s, r) => s + r * r, 0);
    const factor = p.kind === 'four' ? `(x^2 - ${t1})(x^2 - ${t2}) = 0` : p.kind === 'three' ? `x^2(x^2 - ${t1}) = 0` : `(x^2 - ${t1})(x^2 + ${p.n}) = 0`;
    const tvals = p.kind === 'four' ? `x^2 = ${t1}, \\quad x^2 = ${t2}` : p.kind === 'three' ? `x^2 = 0, \\quad x^2 = ${t1}` : `x^2 = ${t1}, \\quad x^2 = -${p.n}`;
    const realRoots = roots.slice().sort((x, y) => x - y).join(', ');
    const stem = pick({
      uz: `Bikvadrat tenglama berilgan: ${M(eq)}.`,
      ru: `Дано биквадратное уравнение ${M(eq)}.`,
      kaa: `Bikvadrat teńleme berilgen: ${M(eq)}.`,
      en: `The biquadratic equation ${M(eq)} is given.`,
    });
    const neg = p.kind === 'two';
    const solution = pick({
      uz: `Tenglamani ko'paytuvchilarga ajratamiz: ${M(factor)}.\n\nBundan ${M(tvals)}.${neg ? ` ${M(`x^2 = -${p.n}`)} haqiqiy yechimga ega emas.` : ''}\n\nHaqiqiy ildizlar: ${M(realRoots)}. Ularning soni ${count} ta, kvadratlari yig'indisi ${M(String(sumSq))}.`,
      ru: `Раскладываем на множители: ${M(factor)}.\n\nОтсюда ${M(tvals)}.${neg ? ` Уравнение ${M(`x^2 = -${p.n}`)} не имеет действительных решений.` : ''}\n\nДействительные корни: ${M(realRoots)}. Их количество ${count}, сумма квадратов ${M(String(sumSq))}.`,
      kaa: `Teńlemeni kóbeytiwshilerge ajıratamız: ${M(factor)}.\n\nBunnan ${M(tvals)}.${neg ? ` ${M(`x^2 = -${p.n}`)} haqıyqıy sheshimge iye emes.` : ''}\n\nHaqıyqıy túbirler: ${M(realRoots)}. Olardıń sanı ${count} ta, kvadratlarınıń qosındısı ${M(String(sumSq))}.`, // kaa: tekshirilsin
      en: `Factor the equation: ${M(factor)}.\n\nHence ${M(tvals)}.${neg ? ` The equation ${M(`x^2 = -${p.n}`)} has no real solutions.` : ''}\n\nThe real roots are ${M(realRoots)}. There are ${count} of them and the sum of their squares is ${M(String(sumSq))}.`,
    });
    const mistake = pick({
      uz: "$x^2 = t$ manfiy bo'lsa haqiqiy ildiz yo'qligini unutish yoki $t = 0$ dan hosil bo'ladigan ildizni ($x = 0$) hisobga olmaslik.",
      ru: 'Забывают, что при отрицательном $t$ уравнение $x^2 = t$ не имеет действительных корней, или не учитывают корень $x = 0$ при $t = 0$.',
      kaa: "$x^2 = t$ teris bolsa haqıyqıy túbir joq ekenin umıtıw yamasa $t = 0$ den payda bolatuǵın túbirdi ($x = 0$) esapqa almaw.", // kaa: tekshirilsin
      en: 'Forgetting that $x^2 = t$ has no real roots for negative $t$, or ignoring the root $x = 0$ coming from $t = 0$.',
    });
    return {
      est: 320,
      stem,
      parts: {
        a: { value: count, forms: [String(count)], prompt: pick({ uz: 'Tenglama nechta haqiqiy ildizga ega?', ru: 'Сколько действительных корней имеет уравнение?', kaa: 'Teńleme neshe haqıyqıy túbirge iye?', en: 'How many real roots does the equation have?' }) },
        b: { value: sumSq, forms: [String(sumSq)], prompt: pick({ uz: "Tenglamaning barcha haqiqiy ildizlari kvadratlarining yig'indisini toping.", ru: 'Найдите сумму квадратов всех действительных корней уравнения.', kaa: 'Teńlemeniń barlıq haqıyqıy túbirleri kvadratlarınıń qosındısın tabıń.', en: 'Find the sum of the squares of all real roots of the equation.' }) },
      },
      solution,
      mistake,
    };
  },
});

// O4. Qayiq masalasi: oqim tezligi va ko'ldagi vaqt (42)
interface OBoatP {
  u1: number;
  u2: number;
  L: number;
}
const OBOAT_POOL: OBoatP[] = MOTION_BASES.flatMap((b) => [48, 60, 90, 120].map((L) => ({ u1: b.u1, u2: b.u2, L })));

const oBoat = oEntry<OBoatP>({
  id: 'oBoat',
  topic: 42,
  draw: (req) => pickPool(req, 'oBoat', OBOAT_POOL),
  build: (p) => {
    const b = motionBase(p.u1, p.u2)!;
    const v = (p.u1 + p.u2) / 2;
    const c = (p.u1 - p.u2) / 2;
    const time = frac(p.L, v);
    const stem = pick({
      uz: `Qayiq daryo oqimi bo'ylab ${b.d} km yo'lni ${b.t1} soatda, oqimga qarshi shu yo'lni ${b.t2} soatda bosib o'tdi. Qayiqning turg'un suvdagi tezligi va oqim tezligi o'zgarmas.`,
      ru: `Лодка прошла ${b.d} км по течению реки за ${b.t1} ч, а против течения тот же путь — за ${b.t2} ч. Собственная скорость лодки и скорость течения постоянны.`,
      kaa: `Qayıq dárya aǵısı boyınsha ${b.d} km jolǵa ${b.t1} saatta, aǵısqa qarama-qarsı sol jolǵa ${b.t2} saatta jetti. Qayıqtıń turaqlı suwdaǵı tezligi hám aǵıs tezligi ózgermeydi.`, // kaa: tekshirilsin
      en: `A boat travelled ${b.d} km downstream in ${b.t1} hours and the same distance upstream in ${b.t2} hours. The boat's speed in still water and the speed of the current are constant.`,
    });
    const sys = `v + c = ${p.u1}, \\quad v - c = ${p.u2}`;
    const solution = pick({
      uz: `Oqim bo'ylab tezlik ${M(`\\frac{${b.d}}{${b.t1}} = ${p.u1}`)}, oqimga qarshi ${M(`\\frac{${b.d}}{${b.t2}} = ${p.u2}`)}. Turg'un suvdagi tezlik ${M('v')}, oqim tezligi ${M('c')}: ${M(sys)}.\n\nBundan ${M(`c = ${c}`)}, ${M(`v = ${v}`)}.\n\nKo'lda (turg'un suvda) vaqt: ${M(`t = \\frac{${p.L}}{${v}} = ${texFrac(time)}`)} soat.`,
      ru: `Скорость по течению ${M(`\\frac{${b.d}}{${b.t1}} = ${p.u1}`)}, против течения ${M(`\\frac{${b.d}}{${b.t2}} = ${p.u2}`)}. Пусть собственная скорость ${M('v')}, скорость течения ${M('c')}: ${M(sys)}.\n\nОтсюда ${M(`c = ${c}`)}, ${M(`v = ${v}`)}.\n\nВремя на озере (в стоячей воде): ${M(`t = \\frac{${p.L}}{${v}} = ${texFrac(time)}`)} ч.`,
      kaa: `Aǵıs boyınsha tezlik ${M(`\\frac{${b.d}}{${b.t1}} = ${p.u1}`)}, aǵısqa qarsı ${M(`\\frac{${b.d}}{${b.t2}} = ${p.u2}`)}. Turaqlı suwdaǵı tezlik ${M('v')}, aǵıs tezligi ${M('c')}: ${M(sys)}.\n\nBunnan ${M(`c = ${c}`)}, ${M(`v = ${v}`)}.\n\nKóldegi (turaqlı suwdaǵı) waqıt: ${M(`t = \\frac{${p.L}}{${v}} = ${texFrac(time)}`)} saat.`, // kaa: tekshirilsin
      en: `Downstream speed ${M(`\\frac{${b.d}}{${b.t1}} = ${p.u1}`)}, upstream speed ${M(`\\frac{${b.d}}{${b.t2}} = ${p.u2}`)}. With the boat's speed ${M('v')} and the current ${M('c')}: ${M(sys)}.\n\nHence ${M(`c = ${c}`)}, ${M(`v = ${v}`)}.\n\nTime on a lake (still water): ${M(`t = \\frac{${p.L}}{${v}} = ${texFrac(time)}`)} hours.`,
    });
    const mistake = pick({
      uz: "Oqim bo'ylab va oqimga qarshi tezliklarni aralashtirish; ko'ldagi vaqtni hisoblashda oqim tezligini ham qo'shib yuborish.",
      ru: 'Путают скорости по течению и против течения; при расчёте времени на озере учитывают скорость течения.',
      kaa: "Aǵıs boyınsha hám aǵısqa qarsı tezliklerdi aralastırıw; kóldegi waqıttı esaplawda aǵıs tezligin de qosıp jiberiw.", // kaa: tekshirilsin
      en: 'Mixing up the downstream and upstream speeds; including the current when computing the time on the lake.',
    });
    return {
      est: 330,
      stem,
      parts: {
        a: { value: c, forms: [String(c)], prompt: pick({ uz: 'Daryo oqimining tezligini (km/soat) toping.', ru: 'Найдите скорость течения реки (км/ч).', kaa: 'Dárya aǵısınıń tezligin (km/saat) tabıń.', en: 'Find the speed of the current (km/h).' }) },
        b: fracPart(
          time,
          pick({
            uz: `Shu qayiq ko'lda (turg'un suvda) ${p.L} km masofani necha soatda bosib o'tadi?`,
            ru: `За сколько часов эта лодка пройдёт ${p.L} км по озеру (в стоячей воде)?`,
            kaa: `Usı qayıq kóllde (turaqlı suwda) ${p.L} km aralıqtı neshe saatta ótedi?`, // kaa: tekshirilsin
            en: `How many hours will this boat need to travel ${p.L} km on a lake (still water)?`,
          }),
          true,
        ),
      },
      solution,
      mistake,
    };
  },
});

// O5. Simmetrik sistema (35)
interface OSysP {
  x0: number;
  y0: number;
}
const OSYS_POOL: OSysP[] = [];
for (const x0 of nonZero(-3, 9)) for (const y0 of nonZero(-6, 8)) if (y0 < x0) OSYS_POOL.push({ x0, y0 });

const oSystem = oEntry<OSysP>({
  id: 'oSystem',
  topic: 35,
  draw: (req) => pickPool(req, 'oSystem', OSYS_POOL),
  build: (p) => {
    const s = p.x0 + p.y0;
    const m = p.x0 * p.x0 + p.y0 * p.y0;
    const pr = p.x0 * p.y0;
    const sys = `\\begin{cases} x + y = ${s} \\\\ x^2 + y^2 = ${m} \\end{cases}`;
    const stem = pick({
      uz: `Tenglamalar sistemasi berilgan: ${M(sys)} Sistemaning ikki yechimidan ${M('x')} katta bo'lganini oling.`,
      ru: `Дана система уравнений ${M(sys)} Из двух решений системы возьмите то, в котором ${M('x')} больше.`,
      kaa: `Teńlemeler sisteması berilgen: ${M(sys)} Sistemanıń eki sheshiminen ${M('x')} úlkenin alıń.`, // kaa: tekshirilsin
      en: `Given the system ${M(sys)} take the one of its two solutions in which ${M('x')} is larger.`,
    });
    const xy = `xy = \\frac{(x+y)^2 - (x^2+y^2)}{2} = \\frac{${s * s} - ${m}}{2} = ${pr}`;
    const quad = `${texPoly([1, -s, pr], 't')} = 0`;
    const solution = pick({
      uz: `${M('(x + y)^2 = x^2 + 2xy + y^2')} dan: ${M(xy)}.\n\n${M('x')} va ${M('y')} lar ${M(quad)} tenglamaning ildizlari bo'ladi: ${M(String(p.x0))} va ${M(String(p.y0))}.\n\n${M('x')} katta bo'lgan yechimda ${M(`x = ${p.x0}`)}, ${M(`y = ${p.y0}`)}.`,
      ru: `Из ${M('(x + y)^2 = x^2 + 2xy + y^2')}: ${M(xy)}.\n\nЧисла ${M('x')} и ${M('y')} — корни уравнения ${M(quad)}: ${M(String(p.x0))} и ${M(String(p.y0))}.\n\nВ решении с большим ${M('x')} получаем ${M(`x = ${p.x0}`)}, ${M(`y = ${p.y0}`)}.`,
      kaa: `${M('(x + y)^2 = x^2 + 2xy + y^2')} den: ${M(xy)}.\n\n${M('x')} hám ${M('y')} sanları ${M(quad)} teńlemesiniń túbirleri boladı: ${M(String(p.x0))} hám ${M(String(p.y0))}.\n\n${M('x')} úlken bolǵan sheshimde ${M(`x = ${p.x0}`)}, ${M(`y = ${p.y0}`)}.`, // kaa: tekshirilsin
      en: `From ${M('(x + y)^2 = x^2 + 2xy + y^2')}: ${M(xy)}.\n\n${M('x')} and ${M('y')} are the roots of ${M(quad)}: ${M(String(p.x0))} and ${M(String(p.y0))}.\n\nIn the solution with the larger ${M('x')} we get ${M(`x = ${p.x0}`)}, ${M(`y = ${p.y0}`)}.`,
    });
    const mistake = pick({
      uz: "$xy$ ko'paytmani topishda $(x+y)^2$ dan $x^2+y^2$ ni ayirib 2 ga bo'lishni unutish; $y$ ni topishda $x$ va $y$ ni almashtirib yuborish.",
      ru: 'Забывают разделить на 2 при нахождении $xy = ((x+y)^2 - (x^2+y^2))/2$; путают $x$ и $y$ в ответе.',
      kaa: "$xy$ kóbeymesin tabıwda $(x+y)^2$ tan $x^2+y^2$ tı alıp 2 ge bóliwdi umıtıw; $y$ di tabıwda $x$ hám $y$ tiń ornın almastırıp jiberiw.", // kaa: tekshirilsin
      en: 'Forgetting to divide by 2 when finding $xy$; swapping $x$ and $y$ in the answer.',
    });
    return {
      est: 300,
      stem,
      parts: {
        a: { value: p.x0, forms: [String(p.x0)], prompt: pick({ uz: `${M('x')} ning eng katta qiymatini toping.`, ru: `Найдите наибольшее значение ${M('x')}.`, kaa: `${M('x')} tiń eń úlken mánisin tabıń.`, en: `Find the largest value of ${M('x')}.` }) },
        b: { value: p.y0, forms: [String(p.y0)], prompt: pick({ uz: `Shu yechimda ${M('y')} ning qiymatini toping.`, ru: `Найдите значение ${M('y')} в этом решении.`, kaa: `Usı sheshimde ${M('y')} tiń mánisin tabıń.`, en: `Find the value of ${M('y')} in this solution.` }) },
      },
      solution,
      mistake,
    };
  },
});

export const TENGLAMA_O: readonly OEntry[] = [oViet, oQineq, oBiq, oBoat, oSystem];

// ---------------------------------------------------------------------------------------------

export const generateTenglama: BlockGenerator = (req) => (req.type === 'o' ? oSpec(req, chooseEntry(TENGLAMA_O, req)) : y1Spec(req, chooseEntry(TENGLAMA_Y1, req)));

