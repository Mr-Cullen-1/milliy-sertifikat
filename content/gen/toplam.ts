import { frac, fAdd, fMul, fSub, numericDistractors, slotRng, texFrac, texParen, type Frac, type Rng } from './helpers';
import { mn, binom, factorial, fracFallbacks, langPicker, m, oSpec, pickTemplate, slotId, y1Spec, smallIntDistractors } from './analiz-toplam-util';
import type { BlockGenerator, Lang, SlotRequest } from './types';

// "To'plam, mulohazalar, ma'lumotlar tahlili, kombinatorika, ehtimollar va modellashtirish" bloki (mavzular 94-103).
// Har bir shablon: sample...(rng) parametrlarni tanlaydi, solve...(p) javobni KOD bilan hisoblaydi (to'g'ridan-to'g'ri
// sanash yoki formula). Ikkalasi ham eksport qilinadi: tests/content/toplam-math.test.ts mustaqil usul bilan tekshiradi.

const T = String.raw;

const fracStrings = (list: readonly Frac[]): string[] => list.filter((f) => f.d !== 0).map((f) => m(texFrac(f)));
const list = (nums: readonly number[]): string => nums.join(',\\ ');

// ============================== Y-1, L3 shablonlar ==============================

// --- T1: uchta to'plam, Eyler-Venn (94) ---
export interface VennP {
  a: number;
  b: number;
  c: number;
  ab: number;
  ac: number;
  bc: number;
  abc: number;
  none: number;
}
export function sampleVenn(rng: Rng): VennP {
  return { a: rng.int(2, 9), b: rng.int(2, 9), c: rng.int(2, 9), ab: rng.int(1, 6), ac: rng.int(1, 6), bc: rng.int(1, 6), abc: rng.int(1, 4), none: rng.int(1, 8) };
}
/** Sohalar: faqat A, faqat B, ...; berilgan kattaliklar: X, Y, Z (to'plam o'lchamlari), P, Q, R (juft kesishmalar), T (uchlik) */
export function solveVenn(v: VennP): { X: number; Y: number; Z: number; P: number; Q: number; R: number; T: number; N: number; onlyOne: number; exactlyTwo: number; union: number } {
  const X = v.a + v.ab + v.ac + v.abc;
  const Y = v.b + v.ab + v.bc + v.abc;
  const Z = v.c + v.ac + v.bc + v.abc;
  const P = v.ab + v.abc;
  const Q = v.ac + v.abc;
  const R = v.bc + v.abc;
  const union = v.a + v.b + v.c + v.ab + v.ac + v.bc + v.abc;
  return { X, Y, Z, P, Q, R, T: v.abc, N: union + v.none, onlyOne: v.a + v.b + v.c, exactlyTwo: v.ab + v.ac + v.bc, union };
}

function tplVenn(req: SlotRequest) {
  const v = sampleVenn(slotRng(req, 'venn'));
  const rng = slotRng(req, 'venn-opt');
  const s = solveVenn(v);
  const ds = numericDistractors(s.onlyOne, [s.X + s.Y + s.Z - (s.P + s.Q + s.R), s.onlyOne - 2 * s.T, s.union, s.onlyOne + s.T], rng, mn);
  return y1Spec({
    topic: 94,
    difficulty: req.difficulty,
    estSeconds: 220,
    correct: m(String(s.onlyOne)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Sinfdagi $${s.N}$ ta o'quvchidan $${s.X}$ tasi shaxmat, $${s.Y}$ tasi rasm, $${s.Z}$ tasi musiqa to'garagiga qatnashadi. Shaxmat va rasmga $${s.P}$ ta, shaxmat va musiqaga $${s.Q}$ ta, rasm va musiqaga $${s.R}$ ta o'quvchi qatnashadi, uchala to'garakka esa $${s.T}$ ta o'quvchi qatnashadi. Roppa-rosa bitta to'garakka qatnashadigan o'quvchilar nechta?`,
          T`Из $${s.N}$ учеников класса $${s.X}$ ходят в шахматный кружок, $${s.Y}$ — в кружок рисования, $${s.Z}$ — в музыкальный. В шахматный и рисования ходят $${s.P}$ учеников, в шахматный и музыкальный — $${s.Q}$, в рисования и музыкальный — $${s.R}$, а во все три кружка — $${s.T}$. Сколько учеников посещают ровно один кружок?`,
          T`Klasstaǵı $${s.N}$ oqıwshıdan $${s.X}$ i shaxmat, $${s.Y}$ i súwret, $${s.Z}$ i muzıka úyirmesine qatnasadı. Shaxmat hám súwretke $${s.P}$, shaxmat hám muzıkaǵa $${s.Q}$, súwret hám muzıkaǵa $${s.R}$ oqıwshı qatnasadı, úsh úyirmege de $${s.T}$ oqıwshı qatnasadı. Tap bir úyirmege qatnasatuǵın oqıwshılar neshe?`, // kaa: tekshirilsin
          T`Of $${s.N}$ students in a class, $${s.X}$ attend the chess club, $${s.Y}$ the art club and $${s.Z}$ the music club. $${s.P}$ attend chess and art, $${s.Q}$ chess and music, $${s.R}$ art and music, and $${s.T}$ attend all three. How many students attend exactly one club?`,
        ),
        solution_md: L(
          T`Faqat bitta to'garak: $X+Y+Z-2(P+Q+R)+3T=${s.X}+${s.Y}+${s.Z}-2\cdot ${s.P + s.Q + s.R}+3\cdot ${s.T}=${s.onlyOne}$. (Tekshirish: faqat shaxmat $${v.a}$, faqat rasm $${v.b}$, faqat musiqa $${v.c}$.)`,
          T`Ровно один кружок: $X+Y+Z-2(P+Q+R)+3T=${s.X}+${s.Y}+${s.Z}-2\cdot ${s.P + s.Q + s.R}+3\cdot ${s.T}=${s.onlyOne}$. (Проверка: только шахматы $${v.a}$, только рисование $${v.b}$, только музыка $${v.c}$.)`,
          T`Tek bir úyirme: $X+Y+Z-2(P+Q+R)+3T=${s.X}+${s.Y}+${s.Z}-2\cdot ${s.P + s.Q + s.R}+3\cdot ${s.T}=${s.onlyOne}$. (Tekseriw: tek shaxmat $${v.a}$, tek súwret $${v.b}$, tek muzıka $${v.c}$.)`,
          T`Exactly one club: $X+Y+Z-2(P+Q+R)+3T=${s.X}+${s.Y}+${s.Z}-2\cdot ${s.P + s.Q + s.R}+3\cdot ${s.T}=${s.onlyOne}$. (Check: chess only $${v.a}$, art only $${v.b}$, music only $${v.c}$.)`,
        ),
        mistake_note_md: L(
          T`Juft kesishmalar uchlik kesishmani ham o'z ichiga oladi: $X+Y+Z-(P+Q+R)$ faqat bitta va roppa-rosa ikkita to'garakkagina qatnashuvchilarning yig'indisini beradi.`,
          T`Парные пересечения уже содержат тройное: $X+Y+Z-(P+Q+R)$ даёт сумму тех, кто ходит в один или ровно в два кружка.`,
          T`Jup kesilisiwler úshlik kesilisiwdi de óz ishine aladı: $X+Y+Z-(P+Q+R)$ tek bir hám tap eki úyirmege qatnasatuǵınlardıń qosındısın beredi.`,
          T`Pairwise intersections already include the triple one: $X+Y+Z-(P+Q+R)$ counts those in exactly one or exactly two clubs.`,
        ),
      };
    },
  });
}

// --- T2: mantiq, rostlik jadvali (95) ---
export interface LogicF {
  id: string;
  tex: string;
  fn: (p: boolean, q: boolean, r: boolean) => boolean;
}
export const LOGIC: readonly LogicF[] = [
  { id: 'imp', tex: T`(p\land q)\to r`, fn: (p, q, r) => !(p && q) || r },
  { id: 'orNeg', tex: T`(p\lor q)\to\lnot r`, fn: (p, q, r) => !(p || q) || !r },
  { id: 'eqImp', tex: T`(p\leftrightarrow q)\land(q\to r)`, fn: (p, q, r) => p === q && (!q || r) },
  { id: 'cycle', tex: T`(p\to q)\land(q\to r)\land(r\to p)`, fn: (p, q, r) => (!p || q) && (!q || r) && (!r || p) },
  { id: 'xorImp', tex: T`(p\oplus q)\to r`, fn: (p, q, r) => p === q || r },
  { id: 'mix', tex: T`\lnot(p\land q)\lor(r\land\lnot p)`, fn: (p, q, r) => !(p && q) || (r && !p) },
];
export interface LogicP {
  f: LogicF;
  askTrue: boolean;
}
export function sampleLogic(req: SlotRequest): LogicP {
  const combo = (slotId(req) * 5 + 3) % (LOGIC.length * 2);
  return { f: LOGIC[combo % LOGIC.length]!, askTrue: Math.floor(combo / LOGIC.length) % 2 === 0 };
}
export function solveLogic({ f, askTrue }: LogicP): { trues: number; answer: number } {
  let trues = 0;
  for (const p of [true, false]) for (const q of [true, false]) for (const r of [true, false]) if (f.fn(p, q, r)) trues++;
  return { trues, answer: askTrue ? trues : 8 - trues };
}

function tplLogic(req: SlotRequest) {
  const p = sampleLogic(req);
  const rng = slotRng(req, 'logic-opt');
  const { trues, answer } = solveLogic(p);
  const ds = smallIntDistractors(answer, 8, rng, [8 - answer, answer + 1, answer - 1]);
  return y1Spec({
    topic: 95,
    difficulty: req.difficulty,
    estSeconds: 200,
    correct: m(String(answer)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const word = p.askTrue
        ? L(`rost`, `истинно`, `rás`, `true`)
        : L(`yolg'on`, `ложно`, `jalǵan`, `false`);
      return {
        stem_md: L(
          T`$p,\ q,\ r$ mulohazalarining barcha $8$ ta qiymatlar to'plamidan nechtasida $${p.f.tex}$ mulohaza ${word} bo'ladi?`,
          T`Для скольких из всех $8$ наборов значений высказываний $p,\ q,\ r$ высказывание $${p.f.tex}$ ${word}?`,
          T`$p,\ q,\ r$ tastıyıqlawlarınıń barlıq $8$ mánisler toplamınan neshewinde $${p.f.tex}$ tastıyıqlawı ${word} boladı?`, // kaa: tekshirilsin
          T`For how many of the $8$ possible truth assignments of $p,\ q,\ r$ is $${p.f.tex}$ ${word}?`,
        ),
        solution_md: L(
          T`Rostlik jadvalini $8$ ta satr bo'yicha tuzamiz (har bir qavs va amalni alohida hisoblab). $${p.f.tex}$ ifoda $${trues}$ ta satrda rost, $${8 - trues}$ ta satrda yolg'on. Javob: $${answer}$.`,
          T`Составим таблицу истинности из $8$ строк (отдельно вычисляя каждую скобку и операцию). Выражение $${p.f.tex}$ истинно в $${trues}$ строках и ложно в $${8 - trues}$. Ответ: $${answer}$.`,
          T`$8$ qatarlı ushın rástlik kestesin dúzemiz (hár bir qawıs hám ámeldi bólek esaplap). $${p.f.tex}$ an'latpası $${trues}$ qatarda rás, $${8 - trues}$ qatarda jalǵan. Juwap: $${answer}$.`,
          T`Build the $8$-row truth table, evaluating each bracket and operation separately. The expression $${p.f.tex}$ is true in $${trues}$ rows and false in $${8 - trues}$. Answer: $${answer}$.`,
        ),
        mistake_note_md: L(
          T`Implikatsiya ($p\to q$) faqat $p$ rost, $q$ yolg'on bo'lganda yolg'on; uni konyunksiya bilan adashtirish.`,
          T`Импликация $p\to q$ ложна только при истинном $p$ и ложном $q$; её часто путают с конъюнкцией.`,
          T`Implikaciya ($p\to q$) tek $p$ rás, $q$ jalǵan bolǵanda jalǵan; onı konyunkciya menen shatastırıw.`,
          T`An implication $p\to q$ is false only when $p$ is true and $q$ is false; it is often confused with a conjunction.`,
        ),
      };
    },
  });
}

// --- T3: raqamlardan sonlar tuzish (96) ---
export type DigitCond = 'even' | 'odd' | 'div5';
export interface DigitsP {
  digits: number[];
  len: number;
  cond: DigitCond;
}
export function sampleDigits(rng: Rng): DigitsP {
  const size = rng.int(5, 7);
  const pool = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, size - 1);
  const digits = [0, ...pool].sort((x, y) => x - y);
  return { digits, len: rng.int(3, 4), cond: rng.pick<DigitCond>(['even', 'odd', 'div5']) };
}
const digitOk = (c: DigitCond, last: number): boolean => (c === 'even' ? last % 2 === 0 : c === 'odd' ? last % 2 === 1 : last % 5 === 0);
/** To'g'ridan-to'g'ri sanash: takrorlanmaydigan raqamlar, birinchi raqam 0 emas */
export function solveDigits({ digits, len, cond }: DigitsP): { count: number; leadingZeroAllowed: number; noCondition: number; noConditionLead: number } {
  let count = 0;
  let leadingZeroAllowed = 0;
  let noCondition = 0;
  let noConditionLead = 0;
  const used = new Array<boolean>(digits.length).fill(false);
  const cur: number[] = [];
  const rec = () => {
    if (cur.length === len) {
      const ok = digitOk(cond, cur[len - 1]!);
      noConditionLead++;
      if (ok) leadingZeroAllowed++;
      if (cur[0] !== 0) {
        noCondition++;
        if (ok) count++;
      }
      return;
    }
    for (let i = 0; i < digits.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(digits[i]!);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return { count, leadingZeroAllowed, noCondition, noConditionLead };
}

/** Hollarga ajratish formulasi (yechimda ko'rsatiladi); sanash bilan mos kelishi tekshiriladi */
export function digitsFormula({ digits, len, cond }: DigitsP): { d: number; zeroLast: number; nonzeroLast: number; mid: number; count: number } {
  const d = digits.length;
  const zeroLast = digitOk(cond, 0) ? 1 : 0;
  const nonzeroLast = digits.filter((x) => x !== 0 && digitOk(cond, x)).length;
  let mid = 1;
  for (let i = 0; i < len - 2; i++) mid *= d - 2 - i;
  return { d, zeroLast, nonzeroLast, mid, count: mid * (zeroLast * (d - 1) + nonzeroLast * (d - 2)) };
}

function tplDigits(req: SlotRequest) {
  const p = sampleDigits(slotRng(req, 'digits'));
  const rng = slotRng(req, 'digits-opt');
  const s = solveDigits(p);
  const ds = numericDistractors(s.count, [s.leadingZeroAllowed, s.noCondition, s.noConditionLead], rng, mn);
  const f = digitsFormula(p);
  if (f.count !== s.count) throw new Error('raqamlar formulasi sanash bilan mos emas');
  return y1Spec({
    topic: 96,
    extraTopics: [97],
    difficulty: req.difficulty,
    estSeconds: 220,
    correct: m(String(s.count)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const dg = `$${list(p.digits)}$`;
      const cond = {
        even: L(`juft`, `чётных`, `jup`, `even`),
        odd: L(`toq`, `нечётных`, `taq`, `odd`),
        div5: L(`$5$ ga karrali`, `кратных $5$`, `$5$ ke eselik`, `divisible by $5$`),
      }[p.cond];
      const lastTxt = {
        even: L(`oxirgi raqam juft`, `последняя цифра чётная`, `aqırǵı cifr jup`, `the last digit is even`),
        odd: L(`oxirgi raqam toq`, `последняя цифра нечётная`, `aqırǵı cifr taq`, `the last digit is odd`),
        div5: L(`oxirgi raqam $0$ yoki $5$`, `последняя цифра $0$ или $5$`, `aqırǵı cifr $0$ yamasa $5$`, `the last digit is $0$ or $5$`),
      }[p.cond];
      return {
        stem_md: L(
          T`${dg} raqamlaridan (har bir raqamdan ko'pi bilan bir marta foydalanib) tuzilgan ${p.len} xonali ${cond} sonlar nechta?`,
          T`Сколько существует ${p.len}-значных ${cond} чисел, составленных из цифр ${dg} (каждую цифру можно использовать не более одного раза)?`,
          T`${dg} cifrlarınan (hár cifrdi eń kóbi menen bir ret paydalanıp) dúzilgen ${p.len} xanalı ${cond} sanlar neshe?`, // kaa: tekshirilsin
          T`How many ${p.len}-digit ${cond} numbers can be formed from the digits ${dg}, using each digit at most once?`,
        ),
        solution_md: L(
          T`Shart: ${lastTxt}; birinchi raqam $0$ bo'lmasligi kerak. Oxirgi raqam bo'yicha hollarga ajratamiz. Oxirgi raqam $0$ bo'lsa (${f.zeroLast} xil tanlov): birinchi raqam $${f.d - 1}$ usul. Oxirgi raqam $0$ dan boshqa (${f.nonzeroLast} xil tanlov): birinchi raqam $${f.d - 2}$ usul. O'rtadagi ${p.len - 2} ta o'rin qolgan $${f.d - 2}$ ta raqamdan $${f.mid}$ usulda to'ldiriladi. Jami: $${f.mid}\cdot(${f.zeroLast}\cdot ${f.d - 1}+${f.nonzeroLast}\cdot ${f.d - 2})=${s.count}$.`,
          T`Условие: ${lastTxt}; первая цифра не может быть $0$. Разбираем по последней цифре. Если она $0$ (вариантов: ${f.zeroLast}): первая цифра выбирается $${f.d - 1}$ способами. Если последняя цифра не $0$ (вариантов: ${f.nonzeroLast}): первая цифра — $${f.d - 2}$ способами. Средние ${p.len - 2} места заполняются из оставшихся $${f.d - 2}$ цифр $${f.mid}$ способами. Итого: $${f.mid}\cdot(${f.zeroLast}\cdot ${f.d - 1}+${f.nonzeroLast}\cdot ${f.d - 2})=${s.count}$.`,
          T`Shárt: ${lastTxt}; birinshi cifr $0$ bolmawı kerek. Aqırǵı cifr boyınsha bólemiz. Aqırǵı cifr $0$ bolsa (${f.zeroLast} túrli tańlaw): birinshi cifr $${f.d - 1}$ usıl. Aqırǵı cifr $0$ den basqa (${f.nonzeroLast} túrli tańlaw): birinshi cifr $${f.d - 2}$ usıl. Ortadaǵı ${p.len - 2} orın qalǵan $${f.d - 2}$ cifrdan $${f.mid}$ usılda toltırıladı. Jámi: $${f.mid}\cdot(${f.zeroLast}\cdot ${f.d - 1}+${f.nonzeroLast}\cdot ${f.d - 2})=${s.count}$.`,
          T`Condition: ${lastTxt}; the first digit cannot be $0$. Split by the last digit. If it is $0$ (${f.zeroLast} choice): the first digit has $${f.d - 1}$ options. If it is non-zero (${f.nonzeroLast} choices): the first digit has $${f.d - 2}$ options. The ${p.len - 2} middle places are filled from the remaining $${f.d - 2}$ digits in $${f.mid}$ ways. Total: $${f.mid}\cdot(${f.zeroLast}\cdot ${f.d - 1}+${f.nonzeroLast}\cdot ${f.d - 2})=${s.count}$.`,
        ),
        mistake_note_md: L(
          T`Birinchi raqam $0$ bo'lishi mumkin emasligini unutish (barcha ${s.leadingZeroAllowed} ta tartibni sanash).`,
          T`Забыть, что первая цифра не может быть нулём (получается $${s.leadingZeroAllowed}$ вместо верного ответа).`,
          T`Birinshi cifr $0$ bola almaytuǵının umıtıw (barlıq $${s.leadingZeroAllowed}$ tártipti sanaw).`,
          T`Forgetting that the first digit cannot be zero (getting $${s.leadingZeroAllowed}$ instead).`,
        ),
      };
    },
  });
}

// --- T4: qatorga joylashtirish (97) ---
export type ArrCond = 'notAdj' | 'notEnds' | 'triple';
export interface ArrP {
  n: number;
  cond: ArrCond;
}
export function sampleArr(rng: Rng): ArrP {
  return { n: rng.int(5, 8), cond: rng.pick<ArrCond>(['notAdj', 'notEnds', 'triple']) };
}
/** To'g'ridan-to'g'ri sanash: n ta odam (0,1,2 - A,B,C) qatorda, shart bajariladigan almashtirishlar soni */
export function solveArr({ n, cond }: ArrP): number {
  const used = new Array<boolean>(n).fill(false);
  const cur: number[] = [];
  let count = 0;
  const ok = (): boolean => {
    const pos = (who: number) => cur.indexOf(who);
    if (cond === 'notAdj') return Math.abs(pos(0) - pos(1)) !== 1;
    if (cond === 'notEnds') return pos(0) !== 0 && pos(1) !== n - 1;
    const ps = [pos(0), pos(1), pos(2)].sort((x, y) => x - y);
    return ps[2]! - ps[0]! === 2;
  };
  const rec = () => {
    if (cur.length === n) {
      if (ok()) count++;
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return count;
}

function tplArr(req: SlotRequest) {
  const p = sampleArr(slotRng(req, 'arr'));
  const rng = slotRng(req, 'arr-opt');
  const { n, cond } = p;
  const ans = solveArr(p);
  const f = factorial;
  const mistakes =
    cond === 'notAdj'
      ? [f(n) - f(n - 1), 2 * f(n - 1), f(n) - 2 * f(n - 2), f(n)]
      : cond === 'notEnds'
        ? [f(n) - 2 * f(n - 1), f(n) - f(n - 1), f(n) - 2 * f(n - 1) - f(n - 2), f(n) - 2 * f(n - 2)]
        : [f(n - 2), 3 * f(n - 2), f(n - 3) * 6, 6 * f(n)];
  const ds = numericDistractors(ans, mistakes, rng, mn);
  return y1Spec({
    topic: 97,
    difficulty: req.difficulty,
    estSeconds: 230,
    correct: m(String(ans)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const condTxt = {
        notAdj: L(`A va B yonma-yon turmasligi`, `A и B не стояли рядом`, `A hám B janasıp turmawı`, `A and B are not next to each other`),
        notEnds: L(`A birinchi o'rinda ham, B oxirgi o'rinda ham turmasligi`, `A не стоял первым и B не стоял последним`, `A birinshi orında da, B aqırǵı orında da turmawı`, `A is not first and B is not last`),
        triple: L(`A, B va C yonma-yon (istalgan tartibda) turishi`, `A, B и C стояли подряд (в любом порядке)`, `A, B hám C janasıp (qálegen tártipte) turıwı`, `A, B and C stand consecutively (in any order)`),
      }[cond];
      const sol = {
        notAdj: T`$${n}!-2\cdot ${n - 1}!=${f(n)}-${2 * f(n - 1)}=${ans}$`,
        notEnds: T`$${n}!-${n - 1}!-${n - 1}!+${n - 2}!=${f(n)}-${2 * f(n - 1)}+${f(n - 2)}=${ans}$`,
        triple: T`$3!\cdot ${n - 2}!=6\cdot ${f(n - 2)}=${ans}$`,
      }[cond];
      const how = {
        notAdj: L(
          `Barcha joylashtirishlar $n!$, A va B yonma-yon bo'lganlari ularni bitta blok deb olib $2\\cdot(n-1)!$. Ayiramiz:`,
          `Всего $n!$ расстановок; когда A и B рядом, считаем их одним блоком: $2\\cdot(n-1)!$. Вычитаем:`,
          `Barlıq ornalastırıwlar $n!$, A hám B janasqanları olardı bir blok dep alıp $2\\cdot(n-1)!$. Ayıramız:`,
          `There are $n!$ arrangements in total; with A and B adjacent we treat them as one block: $2\\cdot(n-1)!$. Subtract:`,
        ),
        notEnds: L(
          `Kiritish-chiqarish usuli: A birinchi turgan va B oxirgi turgan holatlar har biri $(n-1)!$, ikkalasi birga $(n-2)!$. Demak:`,
          `Метод включений и исключений: A первым — $(n-1)!$ способов, B последним — $(n-1)!$, оба сразу — $(n-2)!$. Значит:`,
          `Kirgiziw-shıǵarıw usılı: A birinshi turǵan hám B aqırǵı turǵan jaǵdaylar hár biri $(n-1)!$, ekewi birge $(n-2)!$. Demek:`,
          `Inclusion-exclusion: A first gives $(n-1)!$, B last gives $(n-1)!$, both together $(n-2)!$. Hence:`,
        ),
        triple: L(
          `A, B, C ni bitta blok deb olamiz: blok ichida $3!$ tartib, blok va qolgan $n-3$ kishi $(n-2)!$ usulda joylashadi:`,
          `Считаем A, B, C одним блоком: внутри блока $3!$ порядков, а блок и остальные $n-3$ человек расставляются $(n-2)!$ способами:`,
          `A, B, C nı bir blok dep alamız: blok ishinde $3!$ tártip, blok hám qalǵan $n-3$ adam $(n-2)!$ usılda ornalasadı:`,
          `Treat A, B, C as one block: $3!$ orders inside it, and the block with the other $n-3$ people can be arranged in $(n-2)!$ ways:`,
        ),
      }[cond];
      return {
        stem_md: L(
          T`${n} ta o'quvchi bir qatorga tizilmoqda. Ular orasida A, B${cond === 'triple' ? ' va C' : ''} bor. ${condTxt} sharti bilan nechta turli usulda tizilish mumkin?`,
          T`${n} учеников выстраиваются в ряд, среди них A, B${cond === 'triple' ? ' и C' : ''}. Сколькими способами это можно сделать при условии: ${condTxt}?`,
          T`${n} oqıwshı bir qatarǵa tizilmekte. Olar arasında A, B${cond === 'triple' ? ' hám C' : ''} bar. ${condTxt} sharti menen neshe túrli usılda tizilıw múmkin?`, // kaa: tekshirilsin
          T`${n} students line up in a row; A, B${cond === 'triple' ? ' and C' : ''} are among them. In how many ways can they line up if ${condTxt}?`,
        ),
        solution_md: `${how} ${sol}.`,
        mistake_note_md: L(
          T`Blok ichidagi tartibni (A va B ning o'rin almashishini) hisobga olmaslik yoki ayirishda bir holatni ikki marta olib tashlash.`,
          T`Не учесть порядок внутри блока (перестановку A и B) или вычесть одну ситуацию дважды.`,
          T`Blok ishindegi tártipti (A hám B dıń orın almasıwın) esapqa almaw yamasa ayırıwda bir jaǵdaydı eki ret alıp taslaw.`,
          T`Ignoring the order inside the block (A and B swapping) or subtracting one case twice.`,
        ),
      };
    },
  });
}

// --- T5: Nyuton binomi (98) ---
export interface BinomP {
  p: number;
  q: number;
  a: number;
  b: number;
  n: number;
  k: number;
}
export function sampleBinom(rng: Rng): BinomP {
  const n = rng.int(5, 8);
  return { p: rng.pick([1, 2, 3]), q: rng.pick([1, 2]), a: rng.pick([1, 2]), b: rng.pick([-2, -1, 1, 2]), n, k: rng.int(0, n) };
}
/** (a x^p + b/x^q)^n yoyilmasida k-chi (0 dan) had: C(n,k) a^(n-k) b^k x^(pn-(p+q)k) */
export function binomTerm({ p, q, a, b, n }: BinomP, k: number): { coef: number; exp: number } {
  return { coef: binom(n, k) * a ** (n - k) * b ** k, exp: p * n - (p + q) * k };
}
const xPow = (e: number): string => (e === 1 ? 'x' : `x^{${e}}`);
export function binomExprTex({ p, q, a, b, n }: BinomP): string {
  const bt = `${b < 0 ? '-' : '+'}\\dfrac{${Math.abs(b)}}{${xPow(q)}}`;
  return `\\left(${a === 1 ? '' : a}${xPow(p)}${bt}\\right)^{${n}}`;
}

/** "x^e oldidagi koeffitsiyent" (e=0 bo'lsa ozod had): tushum kelishigidagi shakllar */
function binomTarget(e: number): Record<Lang, string> {
  const free = e === 0;
  return {
    uz: free ? `ozod hadni` : `$x^{${e}}$ oldidagi koeffitsiyentni`,
    ru: free ? `свободный член` : `коэффициент при $x^{${e}}$`,
    kaa: free ? `erkin aǵzanı` : `$x^{${e}}$ aldındaǵı koeffitsiyentti`,
    en: free ? `the constant term` : `the coefficient of $x^{${e}}$`,
  };
}

function askTarget(t: Record<Lang, string>, lang: Lang): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return { uz: `${cap(t.uz)} toping.`, ru: `Найдите ${t.ru}.`, kaa: `${cap(t.kaa)} tabıń.`, en: `Find ${t.en}.` }[lang];
}

function tplBinom(req: SlotRequest) {
  const p = sampleBinom(slotRng(req, 'binom'));
  const rng = slotRng(req, 'binom-opt');
  const { n, k } = p;
  const { coef, exp } = binomTerm(p, k);
  const wrongA = binom(n, k) * p.b ** k;
  const ds = numericDistractors(coef, [binom(n, k), wrongA, binomTerm(p, Math.max(0, k - 1)).coef, binomTerm(p, Math.min(n, k + 1)).coef, binom(n, k) * p.a ** k * p.b ** (n - k)], rng, mn);
  return y1Spec({
    topic: 98,
    difficulty: req.difficulty,
    estSeconds: 220,
    correct: m(String(coef)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const expr = binomExprTex(p);
      const tgt = binomTarget(exp);
      return {
        stem_md: L(
          T`$${expr}$ ifodaning yoyilmasida ${tgt.uz} toping.`,
          T`Найдите ${tgt.ru} в разложении $${expr}$.`,
          T`$${expr}$ an'latpasınıń jayılmasında ${tgt.kaa} tabıń.`,
          T`Find ${tgt.en} in the expansion of $${expr}$.`,
        ),
        solution_md: L(
          T`Umumiy had: $\binom{${n}}{j}\,a^{${n}-j}b^{j}x^{${p.p * n}-${p.p + p.q}j}$. Daraja $${exp}$ bo'lishi uchun $${p.p * n}-${p.p + p.q}j=${exp}$, ya'ni $j=${k}$. Koeffitsiyent: $\binom{${n}}{${k}}\cdot ${texParen(p.a)}^{${n - k}}\cdot ${texParen(p.b)}^{${k}}=${coef}$.`,
          T`Общий член: $\binom{${n}}{j}\,a^{${n}-j}b^{j}x^{${p.p * n}-${p.p + p.q}j}$. Показатель равен $${exp}$ при $${p.p * n}-${p.p + p.q}j=${exp}$, то есть $j=${k}$. Коэффициент: $\binom{${n}}{${k}}\cdot ${texParen(p.a)}^{${n - k}}\cdot ${texParen(p.b)}^{${k}}=${coef}$.`,
          T`Ulıwma aǵza: $\binom{${n}}{j}\,a^{${n}-j}b^{j}x^{${p.p * n}-${p.p + p.q}j}$. Dáreje $${exp}$ bolıwı ushın $${p.p * n}-${p.p + p.q}j=${exp}$, yaǵnıy $j=${k}$. Koeffitsiyent: $\binom{${n}}{${k}}\cdot ${texParen(p.a)}^{${n - k}}\cdot ${texParen(p.b)}^{${k}}=${coef}$.`,
          T`General term: $\binom{${n}}{j}\,a^{${n}-j}b^{j}x^{${p.p * n}-${p.p + p.q}j}$. The exponent equals $${exp}$ when $${p.p * n}-${p.p + p.q}j=${exp}$, i.e. $j=${k}$. Coefficient: $\binom{${n}}{${k}}\cdot ${texParen(p.a)}^{${n - k}}\cdot ${texParen(p.b)}^{${k}}=${coef}$.`,
        ),
        mistake_note_md: L(
          T`$a$ va $b$ koeffitsiyentlarini darajaga ko'tarishni unutish yoki $b$ ning ishorasini yo'qotish.`,
          T`Забыть возвести коэффициенты $a$ и $b$ в степень или потерять знак $b$.`,
          T`$a$ hám $b$ koeffitsiyentlerin dárejege kóteriwdi umıtıw yamasa $b$ nıń belgisin joǵaltıw.`,
          T`Forgetting to raise the coefficients $a$ and $b$ to powers or losing the sign of $b$.`,
        ),
      };
    },
  });
}

// --- T6: klassik ehtimollik, o'yin soqqalari (99) ---
export type DiceCond = { kind: 'sumDiv'; m: number } | { kind: 'prod6' } | { kind: 'diffGe'; d: number } | { kind: 'sum3'; s: number };
export function sampleDice(rng: Rng): DiceCond {
  const pool: DiceCond[] = [
    { kind: 'sumDiv', m: 4 },
    { kind: 'sumDiv', m: 5 },
    { kind: 'prod6' },
    { kind: 'diffGe', d: 3 },
    { kind: 'diffGe', d: 4 },
    { kind: 'sum3', s: 9 },
    { kind: 'sum3', s: 10 },
    { kind: 'sum3', s: 11 },
    { kind: 'sum3', s: 12 },
  ];
  return rng.pick(pool);
}
const diceCount = (c: DiceCond): number => (c.kind === 'sum3' ? 3 : 2);
/** To'liq sanash: qulay holatlar soni va jami */
export function solveDice(c: DiceCond): { favorable: number; total: number; p: Frac; unordered: number } {
  const dice = diceCount(c);
  let favorable = 0;
  let total = 0;
  let unordered = 0;
  const test = (v: number[]): boolean => {
    if (c.kind === 'sumDiv') return (v[0]! + v[1]!) % c.m === 0;
    if (c.kind === 'prod6') return (v[0]! * v[1]!) % 6 === 0;
    if (c.kind === 'diffGe') return Math.abs(v[0]! - v[1]!) >= c.d;
    return v[0]! + v[1]! + v[2]! === c.s;
  };
  const rec = (v: number[]) => {
    if (v.length === dice) {
      total++;
      if (test(v)) {
        favorable++;
        if (dice === 2 && v[0]! <= v[1]!) unordered++;
      }
      return;
    }
    for (let i = 1; i <= 6; i++) rec([...v, i]);
  };
  rec([]);
  return { favorable, total, p: frac(favorable, total), unordered };
}

function tplDice(req: SlotRequest) {
  const c = sampleDice(slotRng(req, 'dice'));
  const rng = slotRng(req, 'dice-opt');
  const s = solveDice(c);
  const ds = fracStrings([
    fSub(frac(1), s.p),
    frac(s.favorable + 1, s.total),
    frac(s.favorable - 1, s.total),
    ...(s.total === 36 ? [frac(s.unordered, 21)] : [frac(s.favorable, 56)]),
  ]);
  return y1Spec({
    topic: 99,
    difficulty: req.difficulty,
    estSeconds: 200,
    correct: m(texFrac(s.p)),
    pad: fracStrings(fracFallbacks(s.p)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const dice = diceCount(c);
      const cond =
        c.kind === 'sumDiv'
          ? L(`tushgan ochkolar yig'indisi $${c.m}$ ga bo'linadi`, `сумма выпавших очков делится на $${c.m}$`, `túsken ochkolar qosındısı $${c.m}$ ge bólinedi`, `the sum of the points is divisible by $${c.m}$`)
          : c.kind === 'prod6'
            ? L(`tushgan ochkolar ko'paytmasi $6$ ga bo'linadi`, `произведение выпавших очков делится на $6$`, `túsken ochkolar kóbeymesi $6$ ǵa bólinedi`, `the product of the points is divisible by $6$`)
            : c.kind === 'diffGe'
              ? L(`tushgan ochkolar ayirmasining moduli kamida $${c.d}$ ga teng`, `модуль разности выпавших очков не меньше $${c.d}$`, `túsken ochkolar ayırmasınıń moduli keminde $${c.d}$ ge teń`, `the absolute difference of the points is at least $${c.d}$`)
              : L(`tushgan ochkolar yig'indisi roppa-rosa $${c.s}$ ga teng`, `сумма выпавших очков равна ровно $${c.s}$`, `túsken ochkolar qosındısı tap $${c.s}$ ge teń`, `the sum of the points is exactly $${c.s}$`);
      const dWord = dice === 2 ? L(`Ikkita`, `Две`, `Eki`, `Two`) : L(`Uchta`, `Три`, `Úsh`, `Three`);
      return {
        stem_md: L(
          T`${dWord} muntazam o'yin soqqasi bir vaqtda tashlanadi. Quyidagi hodisaning ehtimolini toping: ${cond}.`,
          T`Одновременно бросают ${dice === 2 ? 'две' : 'три'} правильные игральные кости. Найдите вероятность того, что ${cond}.`,
          T`${dWord} durıs oyın kubigi bir waqıtta taslanadı. Tómendegi hádiyseniń itimallıǵın tabıń: ${cond}.`, // kaa: tekshirilsin
          T`${dWord} fair dice are rolled together. Find the probability that ${cond}.`,
        ),
        solution_md: L(
          T`Barcha teng imkoniyatli natijalar soni $6^{${dice}}=${s.total}$ (soqqalar ajratiladi, tartib hisobga olinadi). Qulay natijalar to'liq sanab chiqilganda $${s.favorable}$ ta. Ehtimollik $\dfrac{${s.favorable}}{${s.total}}=${texFrac(s.p)}$.`,
          T`Всего равновозможных исходов $6^{${dice}}=${s.total}$ (кости различимы, порядок важен). Полный перебор даёт $${s.favorable}$ благоприятных исходов. Вероятность $\dfrac{${s.favorable}}{${s.total}}=${texFrac(s.p)}$.`,
          T`Barlıq teń múmkinshilikli nátiyjeler sanı $6^{${dice}}=${s.total}$ (kubikler ajıratıladı, tártip esapqa alınadı). Qolaylı nátiyjeler tolıq sanap shıǵılǵanda $${s.favorable}$ ta. Itimallıq $\dfrac{${s.favorable}}{${s.total}}=${texFrac(s.p)}$.`,
          T`There are $6^{${dice}}=${s.total}$ equally likely outcomes (the dice are distinguishable, order matters). A full enumeration gives $${s.favorable}$ favourable outcomes. The probability is $\dfrac{${s.favorable}}{${s.total}}=${texFrac(s.p)}$.`,
        ),
        mistake_note_md: L(
          T`Natijalarni tartibsiz juftliklar deb sanash (masalan, $(1,2)$ va $(2,1)$ ni bitta deb olish).`,
          T`Считать исходы неупорядоченными парами (например, $(1,2)$ и $(2,1)$ как один).`,
          T`Nátiyjelerdi tártipsiz jup dep sanaw (mısalı, $(1,2)$ hám $(2,1)$ di bir dep alıw).`,
          T`Counting outcomes as unordered pairs (e.g. treating $(1,2)$ and $(2,1)$ as one).`,
        ),
      };
    },
  });
}

// --- T7: to'liq ehtimollik va Bayes (100) ---
export interface BayesP {
  x: number;
  a: number;
  b: number;
}
export function sampleBayes(rng: Rng): BayesP {
  return { x: rng.pick([20, 30, 40, 50, 60, 70, 80]), a: rng.int(1, 9), b: rng.int(1, 9) };
}
/** P(1-zavod | yaroqsiz) = x a / (x a + (100-x) b) */
export function solveBayes({ x, a, b }: BayesP): { posterior: Frac; defective: Frac } {
  const w1 = x * a;
  const w2 = (100 - x) * b;
  return { posterior: frac(w1, w1 + w2), defective: frac(w1 + w2, 10000) };
}

function tplBayes(req: SlotRequest) {
  const p = sampleBayes(slotRng(req, 'bayes'));
  const rng = slotRng(req, 'bayes-opt');
  const { x, a, b } = p;
  const { posterior, defective } = solveBayes(p);
  const w1 = x * a;
  const w2 = (100 - x) * b;
  const ds = fracStrings([frac(w1, 10000), defective, frac(a, a + b), frac(w2, w1 + w2), frac(x, 100)]);
  return y1Spec({
    topic: 100,
    difficulty: req.difficulty,
    estSeconds: 240,
    correct: m(texFrac(posterior)),
    pad: fracStrings(fracFallbacks(posterior)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Omborga keltirilgan buyumlarning $${x}\%$ i 1-zavodda, qolgani 2-zavodda ishlab chiqarilgan. 1-zavod mahsulotining $${a}\%$ i, 2-zavodniki esa $${b}\%$ i yaroqsiz. Tasodifan olingan buyum yaroqsiz chiqdi. Uning 1-zavodda ishlab chiqarilgan bo'lish ehtimolini toping.`,
          T`На склад поступили изделия: $${x}\%$ изготовлено на заводе 1, остальные — на заводе 2. Среди изделий завода 1 брак составляет $${a}\%$, завода 2 — $${b}\%$. Наугад взятое изделие оказалось бракованным. Найдите вероятность того, что оно изготовлено на заводе 1.`,
          T`Skladqa keltirilgen buyımlardıń $${x}\%$ i 1-zavodta, qalǵanı 2-zavodta islep shıǵarılǵan. 1-zavod öniminiń $${a}\%$ i, 2-zavodtıń $${b}\%$ i jaramsız. Tosattan alınǵan buyım jaramsız shıqtı. Onıń 1-zavodta islep shıǵarılǵan bolıw itimallıǵın tabıń.`, // kaa: tekshirilsin
          T`Items delivered to a warehouse: $${x}\%$ were made at factory 1 and the rest at factory 2. $${a}\%$ of factory 1 items and $${b}\%$ of factory 2 items are defective. An item chosen at random is defective. Find the probability that it was made at factory 1.`,
        ),
        solution_md: L(
          T`$D$ — buyum yaroqsiz. To'liq ehtimollik: $P(D)=${texFrac(frac(x, 100))}\cdot ${texFrac(frac(a, 100))}+${texFrac(frac(100 - x, 100))}\cdot ${texFrac(frac(b, 100))}=${texFrac(defective)}$. Bayes formulasi: $P(1\mid D)=\dfrac{${texFrac(frac(w1, 10000))}}{${texFrac(defective)}}=${texFrac(posterior)}$.`,
          T`$D$ — изделие бракованное. Полная вероятность: $P(D)=${texFrac(frac(x, 100))}\cdot ${texFrac(frac(a, 100))}+${texFrac(frac(100 - x, 100))}\cdot ${texFrac(frac(b, 100))}=${texFrac(defective)}$. Формула Байеса: $P(1\mid D)=\dfrac{${texFrac(frac(w1, 10000))}}{${texFrac(defective)}}=${texFrac(posterior)}$.`,
          T`$D$ — buyım jaramsız. Tolıq itimallıq: $P(D)=${texFrac(frac(x, 100))}\cdot ${texFrac(frac(a, 100))}+${texFrac(frac(100 - x, 100))}\cdot ${texFrac(frac(b, 100))}=${texFrac(defective)}$. Bayes formulası: $P(1\mid D)=\dfrac{${texFrac(frac(w1, 10000))}}{${texFrac(defective)}}=${texFrac(posterior)}$.`,
          T`$D$ — the item is defective. Total probability: $P(D)=${texFrac(frac(x, 100))}\cdot ${texFrac(frac(a, 100))}+${texFrac(frac(100 - x, 100))}\cdot ${texFrac(frac(b, 100))}=${texFrac(defective)}$. Bayes' formula: $P(1\mid D)=\dfrac{${texFrac(frac(w1, 10000))}}{${texFrac(defective)}}=${texFrac(posterior)}$.`,
        ),
        mistake_note_md: L(
          T`Shartli ehtimollik o'rniga qo'shma ehtimollikni (1-zavod mahsuloti va yaroqsiz bo'lish ehtimolini) javob qilib olish.`,
          T`Взять в качестве ответа совместную вероятность (завод 1 и брак) вместо условной.`,
          T`Shártli itimallıq ornına birgeliktegi itimallıqtı juwap etip alıw.`,
          T`Giving the joint probability (factory 1 and defective) instead of the conditional one.`,
        ),
      };
    },
  });
}

// --- T8: dispersiya (101) ---
export interface VarP {
  data: number[];
}
export function sampleVar(rng: Rng): VarP {
  for (;;) {
    const n = rng.int(5, 6);
    const data = Array.from({ length: n }, () => rng.int(1, 15));
    const sum = data.reduce((s, v) => s + v, 0);
    if (sum % n !== 0) continue;
    const mean = sum / n;
    const sq = data.reduce((s, v) => s + (v - mean) ** 2, 0);
    if (sq % n === 0 && sq > 0) return { data };
  }
}
export function solveVar({ data }: VarP): { mean: number; sumSq: number; variance: number; sampleVar: Frac; meanOfSquares: Frac } {
  const n = data.length;
  const mean = data.reduce((s, v) => s + v, 0) / n;
  const sumSq = data.reduce((s, v) => s + (v - mean) ** 2, 0);
  return { mean, sumSq, variance: sumSq / n, sampleVar: frac(sumSq, n - 1), meanOfSquares: frac(data.reduce((s, v) => s + v * v, 0), n) };
}

function tplVar(req: SlotRequest) {
  const p = sampleVar(slotRng(req, 'var'));
  const rng = slotRng(req, 'var-opt');
  const s = solveVar(p);
  const n = p.data.length;
  const ds = [m(texFrac(s.sampleVar)), m(String(s.sumSq)), m(texFrac(s.meanOfSquares)), m(String(s.mean)), m(String(s.variance + 1))];
  return y1Spec({
    topic: 101,
    difficulty: req.difficulty,
    estSeconds: 210,
    correct: m(String(s.variance)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const data = list(p.data);
      const devs = p.data.map((v) => `(${v}-${s.mean})^{2}`).join('+');
      return {
        stem_md: L(
          T`Ma'lumotlar to'plami: $${data}$. Uning dispersiyasini (og'ishlar kvadratlarining o'rtacha qiymatini) toping.`,
          T`Набор данных: $${data}$. Найдите его дисперсию (среднее арифметическое квадратов отклонений от среднего).`,
          T`Mánisler toplamı: $${data}$. Onıń dispersiyasın (awıwlar kvadratlarınıń ortasha mánisin) tabıń.`,
          T`A data set: $${data}$. Find its variance (the mean of the squared deviations from the mean).`,
        ),
        solution_md: L(
          T`O'rtacha: $\bar{x}=\dfrac{${p.data.reduce((a, b) => a + b, 0)}}{${n}}=${s.mean}$. Og'ishlar kvadratlari yig'indisi: $${devs}=${s.sumSq}$. Dispersiya $\dfrac{${s.sumSq}}{${n}}=${s.variance}$.`,
          T`Среднее: $\bar{x}=\dfrac{${p.data.reduce((a, b) => a + b, 0)}}{${n}}=${s.mean}$. Сумма квадратов отклонений: $${devs}=${s.sumSq}$. Дисперсия $\dfrac{${s.sumSq}}{${n}}=${s.variance}$.`,
          T`Ortasha: $\bar{x}=\dfrac{${p.data.reduce((a, b) => a + b, 0)}}{${n}}=${s.mean}$. Awıwlar kvadratları qosındısı: $${devs}=${s.sumSq}$. Dispersiya $\dfrac{${s.sumSq}}{${n}}=${s.variance}$.`,
          T`Mean: $\bar{x}=\dfrac{${p.data.reduce((a, b) => a + b, 0)}}{${n}}=${s.mean}$. Sum of squared deviations: $${devs}=${s.sumSq}$. Variance $\dfrac{${s.sumSq}}{${n}}=${s.variance}$.`,
        ),
        mistake_note_md: L(
          T`Og'ishlar kvadratlari yig'indisini $n$ ga emas, $n-1$ ga bo'lish yoki bo'lishni butunlay unutish.`,
          T`Делить сумму квадратов отклонений на $n-1$ вместо $n$ или вовсе не делить.`,
          T`Awıwlar kvadratları qosındısın $n$ ge emes, $n-1$ ge bóliw yamasa bóliwdi pútkilley umıtıw.`,
          T`Dividing the sum of squared deviations by $n-1$ instead of $n$, or not dividing at all.`,
        ),
      };
    },
  });
}

// --- T9: taksi tarifi, model (103) ---
export interface TariffP {
  a: number;
  b: number;
  d: number;
  x0: number;
}
export function sampleTariff(rng: Rng): TariffP {
  const d = rng.int(1, 4);
  return { a: rng.int(2, 8), b: d + rng.int(1, 4), d, x0: rng.int(2, 9) };
}
/** A: a + b x; B: c + d x, c = a + (b-d) x0; B qat'iy arzon bo'ladigan eng kichik butun x */
export function solveTariff({ a, b, d, x0 }: TariffP): { c: number; answer: number } {
  const c = a + (b - d) * x0;
  let x = 0;
  while (!(c + d * x < a + b * x)) x++;
  return { c, answer: x };
}

function tplTariff(req: SlotRequest) {
  const p = sampleTariff(slotRng(req, 'tariff'));
  const rng = slotRng(req, 'tariff-opt');
  const { c, answer } = solveTariff(p);
  const ds = numericDistractors(answer, [p.x0, answer + 1, c - p.a, answer - 2], rng, mn);
  return y1Spec({
    topic: 103,
    difficulty: req.difficulty,
    estSeconds: 200,
    correct: m(String(answer)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Taksi kompaniyalari tariflari: A kompaniyada chaqiruv uchun $${p.a}$ ming so'm va har bir km uchun $${p.b}$ ming so'm; B kompaniyada chaqiruv uchun $${c}$ ming so'm va har bir km uchun $${p.d}$ ming so'm to'lanadi. Necha kilometrdan (butun son) boshlab B kompaniyaning narxi A kompaniyanikidan qat'iy arzon bo'ladi?`,
          T`Тарифы двух такси: у компании A за вызов $${p.a}$ тыс. сумов и $${p.b}$ тыс. сумов за каждый километр; у компании B — $${c}$ тыс. сумов за вызов и $${p.d}$ тыс. сумов за километр. Начиная с какого целого числа километров поездка у B становится строго дешевле, чем у A?`,
          T`Taksi kompaniyaları tariflari: A kompaniyada shaqırıw ushın $${p.a}$ mıń swm hám hár bir km ushın $${p.b}$ mıń swm; B kompaniyada shaqırıw ushın $${c}$ mıń swm hám hár bir km ushın $${p.d}$ mıń swm tólenedi. Neshe kilometrden (pútin san) baslap B kompaniyanıń bahası A kompaniyanıkinen qatań arzan boladı?`, // kaa: tekshirilsin
          T`Taxi tariffs: company A charges $${p.a}$ thousand soums per call plus $${p.b}$ thousand soums per km; company B charges $${c}$ thousand soums per call plus $${p.d}$ thousand soums per km. From how many kilometres (an integer) is B strictly cheaper than A?`,
        ),
        solution_md: L(
          T`A: $${p.a}+${p.b}x$, B: $${c}+${p.d}x$. B arzon: $${c}+${p.d}x<${p.a}+${p.b}x$, ya'ni $${p.b - p.d}x>${c - p.a}$, $x>${p.x0}$. Tengsizlik qat'iy, shuning uchun eng kichik butun $x=${answer}$.`,
          T`A: $${p.a}+${p.b}x$, B: $${c}+${p.d}x$. B дешевле: $${c}+${p.d}x<${p.a}+${p.b}x$, то есть $${p.b - p.d}x>${c - p.a}$, $x>${p.x0}$. Неравенство строгое, поэтому наименьшее целое $x=${answer}$.`,
          T`A: $${p.a}+${p.b}x$, B: $${c}+${p.d}x$. B arzan: $${c}+${p.d}x<${p.a}+${p.b}x$, yaǵnıy $${p.b - p.d}x>${c - p.a}$, $x>${p.x0}$. Teńsizlik qatań, sonıń ushın eń kishi pútin $x=${answer}$.`,
          T`A: $${p.a}+${p.b}x$, B: $${c}+${p.d}x$. B is cheaper when $${c}+${p.d}x<${p.a}+${p.b}x$, i.e. $${p.b - p.d}x>${c - p.a}$, so $x>${p.x0}$. The inequality is strict, hence the smallest integer is $x=${answer}$.`,
        ),
        mistake_note_md: L(
          T`Narxlar tenglashadigan nuqtani ($x=${p.x0}$) javob qilib olish: u yerda B hali arzon emas.`,
          T`Взять точку равенства цен ($x=${p.x0}$) за ответ: в ней B ещё не дешевле.`,
          T`Bahalar teńlesetuǵın noqattı ($x=${p.x0}$) juwap etip alıw: onda B arzan emes.`,
          T`Taking the break-even point ($x=${p.x0}$) as the answer: B is not yet cheaper there.`,
        ),
      };
    },
  });
}

// --- T10: ustunli diagramma (102) ---
export interface DiagramP {
  kind: 'aboveAvg' | 'maxOverMin';
  values: number[];
}
export function sampleDiagram(rng: Rng): DiagramP {
  if (rng.chance(0.5)) {
    for (;;) {
      const values = Array.from({ length: 6 }, () => rng.int(4, 18) * 5);
      if (values.reduce((s, v) => s + v, 0) % 6 === 0 && new Set(values).size >= 4) return { kind: 'aboveAvg', values };
    }
  }
  const min = rng.pick([20, 40, 60]);
  const max = (min * (100 + rng.pick([25, 50, 75, 100]))) / 100;
  const values = Array.from({ length: 6 }, () => rng.int(min + 1, max - 1));
  const iMin = rng.int(0, 5);
  let iMax = rng.int(0, 5);
  if (iMax === iMin) iMax = (iMax + 2) % 6;
  values[iMin] = min;
  values[iMax] = max;
  return { kind: 'maxOverMin', values };
}
export function solveDiagram({ kind, values }: DiagramP): { answer: number; mean: number; max: number; min: number; above: number[] } {
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const above = values.filter((v) => v > mean);
  const answer = kind === 'aboveAvg' ? above.reduce((s, v) => s + v, 0) : ((max - min) * 100) / min;
  return { answer, mean, max, min, above };
}

/** Ustunli diagramma SVG (xmlns <img> ichida ko'rsatish uchun shart; isSafeSvg aynan shu nomlar fazosiga ruxsat beradi). */
export function barChartSvg(values: readonly number[], unit: string): string {
  const top = Math.ceil(Math.max(...values) / 10) * 10;
  const base = 190;
  const bars = values
    .map((v, i) => {
      const h = Math.round((v / top) * 150);
      const x = 40 + i * 44;
      return `<rect x="${x}" y="${base - h}" width="32" height="${h}" fill="#4f7cac"/><text x="${x + 16}" y="${base - h - 5}" font-size="12" text-anchor="middle" fill="#222222">${v}</text><text x="${x + 16}" y="${base + 16}" font-size="12" text-anchor="middle" fill="#222222">${i + 1}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220"><rect x="0" y="0" width="320" height="220" fill="#ffffff"/><text x="6" y="16" font-size="12" fill="#222222">${unit}</text><line x1="34" y1="30" x2="34" y2="${base}" stroke="#222222" stroke-width="1.5"/><line x1="34" y1="${base}" x2="312" y2="${base}" stroke="#222222" stroke-width="1.5"/>${bars}</svg>`;
}

function tplDiagram(req: SlotRequest) {
  const p = sampleDiagram(slotRng(req, 'diag'));
  const rng = slotRng(req, 'diag-opt');
  const s = solveDiagram(p);
  const ds =
    p.kind === 'aboveAvg'
      ? numericDistractors(s.answer, [p.values.reduce((a, b) => a + b, 0), s.mean * s.above.length, s.above.length, p.values.filter((v) => v < s.mean).reduce((a, b) => a + b, 0)], rng, mn)
      : [
          m(texFrac(frac((s.max - s.min) * 100, s.max))),
          ...numericDistractors(s.answer, [100 + s.answer, s.max - s.min, s.answer + 10, s.answer / 2], rng, mn),
        ];
  return y1Spec({
    topic: 102,
    difficulty: req.difficulty,
    estSeconds: 210,
    correct: m(String(s.answer)),
    distractors: ds,
    rng,
    text: (lang) => {
      const L = langPicker(lang);
      const unit = L(`ming dona`, `тыс. шт.`, `mıń dana`, `thousand units`);
      const vals = list(p.values);
      const ask =
        p.kind === 'aboveAvg'
          ? L(
              `O'rtacha oylik hajmdan yuqori bo'lgan oylardagi ishlab chiqarish hajmlarining yig'indisi necha ming dona?`,
              `Чему равна сумма объёмов производства за те месяцы, когда выпуск был выше среднемесячного (в тыс. шт.)?`,
              `Ortasha aylıq kólemnen joqarı bolǵan aylardaǵı islep shıǵarıw kólemleriniń qosındısı neshe mıń dana?`,
              `What is the total output (in thousand units) over the months in which output was above the monthly average?`,
            )
          : L(
              `Eng ko'p ishlab chiqarilgan oyning hajmi eng kam ishlab chiqarilgan oyning hajmidan necha foiz ko'p?`,
              `На сколько процентов выпуск в самый продуктивный месяц больше, чем в самый малопродуктивный?`,
              `Eń kóp islep shıǵarılǵan aydıń kólemi eń az islep shıǵarılǵan aydıń kólemınen neshe procent kóp?`,
              `By what percent is the output of the best month greater than the output of the worst month?`,
            );
      const sol =
        p.kind === 'aboveAvg'
          ? L(
              T`Qiymatlar: $${vals}$. O'rtacha $\dfrac{${p.values.reduce((a, b) => a + b, 0)}}{6}=${s.mean}$. O'rtachadan katta oylar: $${list(s.above)}$, yig'indisi $${s.answer}$.`,
              T`Значения: $${vals}$. Среднее $\dfrac{${p.values.reduce((a, b) => a + b, 0)}}{6}=${s.mean}$. Месяцы выше среднего: $${list(s.above)}$, их сумма $${s.answer}$.`,
              T`Mánisler: $${vals}$. Ortasha $\dfrac{${p.values.reduce((a, b) => a + b, 0)}}{6}=${s.mean}$. Ortashadan úlken aylar: $${list(s.above)}$, qosındısı $${s.answer}$.`,
              T`Values: $${vals}$. The mean is $\dfrac{${p.values.reduce((a, b) => a + b, 0)}}{6}=${s.mean}$. Months above the mean: $${list(s.above)}$, with sum $${s.answer}$.`,
            )
          : L(
              T`Eng katta qiymat $${s.max}$, eng kichigi $${s.min}$. Farq $${s.max - s.min}$, foizda: $\dfrac{${s.max - s.min}}{${s.min}}\cdot 100=${s.answer}$ ($\%$).`,
              T`Наибольшее значение $${s.max}$, наименьшее $${s.min}$. Разность $${s.max - s.min}$, в процентах: $\dfrac{${s.max - s.min}}{${s.min}}\cdot 100=${s.answer}$ ($\%$).`,
              T`Eń úlken mánis $${s.max}$, eń kishisi $${s.min}$. Ayırma $${s.max - s.min}$, procentte: $\dfrac{${s.max - s.min}}{${s.min}}\cdot 100=${s.answer}$ ($\%$).`,
              T`The largest value is $${s.max}$ and the smallest $${s.min}$. The difference is $${s.max - s.min}$, which in percent is $\dfrac{${s.max - s.min}}{${s.min}}\cdot 100=${s.answer}$ ($\%$).`,
            );
      return {
        stem_md: L(
          T`Diagrammada korxonaning 6 oy davomidagi oylik ishlab chiqarish hajmi (${unit}) ko'rsatilgan. ${ask}`,
          T`На диаграмме показан ежемесячный выпуск продукции предприятия за 6 месяцев (${unit}). ${ask}`,
          T`Diagrammada kárxananıń 6 ay dawamındaǵı aylıq islep shıǵarıw kólemi (${unit}) kórsetilgen. ${ask}`,
          T`The diagram shows a factory's monthly output over 6 months (${unit}). ${ask}`,
        ),
        solution_md: sol,
        mistake_note_md:
          p.kind === 'aboveAvg'
            ? L(
                T`O'rtachaga teng bo'lgan yoki undan kichik oylarni ham qo'shib yuborish.`,
                T`Добавить месяцы, где выпуск не выше среднего.`,
                T`Ortashaǵa teń yamasa odan kishi aylardı da qosıp jiberiw.`,
                T`Also adding the months that are not above the average.`,
              )
            : L(
                T`Farqni eng kichik qiymatga emas, eng katta qiymatga nisbatan foizda hisoblash.`,
                T`Считать разность в процентах от наибольшего значения, а не от наименьшего.`,
                T`Ayırmanı eń kishi mánisge emes, eń úlken mánisge salıstırıp procentte esaplaw.`,
                T`Computing the difference as a percent of the largest value instead of the smallest.`,
              ),
        figure: {
          svg: barChartSvg(p.values, unit),
          alt: L(
            `Ustunli diagramma, oylar 1 dan 6 gacha, qiymatlar (${unit}): ${p.values.join(', ')}`,
            `Столбчатая диаграмма, месяцы с 1 по 6, значения (${unit}): ${p.values.join(', ')}`,
            `Tiykarlı diagramma, aylar 1 den 6 ǵa shekem, mánisler (${unit}): ${p.values.join(', ')}`,
            `Bar chart, months 1 to 6, values (${unit}): ${p.values.join(', ')}`,
          ),
        },
      };
    },
  });
}

// ============================== O (ochiq), L3 shablonlar ==============================

// --- O1: shar tanlash (99) ---
export interface BallsP {
  r: number;
  b: number;
  g: number;
}
export function sampleBalls(rng: Rng): BallsP {
  return { r: rng.int(2, 6), b: rng.int(2, 6), g: rng.int(2, 6) };
}
/** Bir vaqtda 2 ta shar: jami C(n,2); bir xil rang C(r,2)+C(b,2)+C(g,2) */
export function solveBalls({ r, b, g }: BallsP): { total: number; same: number; p: Frac } {
  const n = r + b + g;
  const total = (n * (n - 1)) / 2;
  const same = (r * (r - 1)) / 2 + (b * (b - 1)) / 2 + (g * (g - 1)) / 2;
  return { total, same, p: frac(same, total) };
}

function otplBalls(req: SlotRequest) {
  const k = sampleBalls(slotRng(req, 'balls'));
  const s = solveBalls(k);
  const n = k.r + k.b + k.g;
  return oSpec({
    topic: 99,
    extraTopics: [97],
    difficulty: req.difficulty,
    estSeconds: 330,
    a: frac(s.total),
    b: s.p,
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Qutida $${k.r}$ ta qizil, $${k.b}$ ta ko'k va $${k.g}$ ta yashil shar bor. Qutidan bir vaqtda tasodifan ikkita shar olinadi.`,
          T`В коробке $${k.r}$ красных, $${k.b}$ синих и $${k.g}$ зелёных шаров. Из коробки одновременно наугад берут два шара.`,
          T`Qutıda $${k.r}$ qızıl, $${k.b}$ kók hám $${k.g}$ jasıl shar bar. Qutıdan bir waqıtta tosattan eki shar alınadı.`,
          T`A box contains $${k.r}$ red, $${k.b}$ blue and $${k.g}$ green balls. Two balls are drawn at random at the same time.`,
        ),
        a: {
          prompt_md: L(T`Ikkita sharni tanlashning barcha mumkin bo'lgan usullari sonini toping.`, T`Найдите число всех возможных способов выбрать два шара.`, T`Eki shardı tańlawdıń barlıq múmkin bolǵan usılları sanın tabıń.`, T`Find the number of all possible ways to choose two balls.`),
        },
        b: {
          prompt_md: L(T`Ikkala shar bir xil rangda bo'lish ehtimolini toping.`, T`Найдите вероятность того, что оба шара одного цвета.`, T`Eki shar da bir túste bolıw itimallıǵın tabıń.`, T`Find the probability that both balls have the same colour.`),
          hint: L(`Oddiy kasr (masalan 3/8) yoki o'nli kasr`, `Обыкновенная дробь (например 3/8) или десятичная дробь`, `Ápiwayı bólshek (mısalı 3/8) yamasa onlıq bólshek`, `A common fraction (e.g. 3/8) or a decimal`),
        },
        solution_md: L(
          T`a) $C_{${n}}^{2}=\dfrac{${n}\cdot ${n - 1}}{2}=${s.total}$. b) Bir xil rang: $C_{${k.r}}^{2}+C_{${k.b}}^{2}+C_{${k.g}}^{2}=${s.same}$. Ehtimollik $\dfrac{${s.same}}{${s.total}}=${texFrac(s.p)}$.`,
          T`а) $C_{${n}}^{2}=\dfrac{${n}\cdot ${n - 1}}{2}=${s.total}$. б) Один цвет: $C_{${k.r}}^{2}+C_{${k.b}}^{2}+C_{${k.g}}^{2}=${s.same}$. Вероятность $\dfrac{${s.same}}{${s.total}}=${texFrac(s.p)}$.`,
          T`a) $C_{${n}}^{2}=\dfrac{${n}\cdot ${n - 1}}{2}=${s.total}$. b) Bir tús: $C_{${k.r}}^{2}+C_{${k.b}}^{2}+C_{${k.g}}^{2}=${s.same}$. Itimallıq $\dfrac{${s.same}}{${s.total}}=${texFrac(s.p)}$.`,
          T`a) $C_{${n}}^{2}=\dfrac{${n}\cdot ${n - 1}}{2}=${s.total}$. b) Same colour: $C_{${k.r}}^{2}+C_{${k.b}}^{2}+C_{${k.g}}^{2}=${s.same}$. Probability $\dfrac{${s.same}}{${s.total}}=${texFrac(s.p)}$.`,
        ),
        mistake_note_md: L(
          T`Sharlar bir vaqtda olingani uchun tartib ahamiyatsiz: $C_n^2$ o'rniga $n(n-1)$ ni olish.`,
          T`Шары берут одновременно, порядок не важен: брать $n(n-1)$ вместо $C_n^2$ — ошибка.`,
          T`Sharlar bir waqıtta alınǵanı ushın tártip áhmiyetsiz: $C_n^2$ ornına $n(n-1)$ di alıw.`,
          T`The balls are drawn together, so order does not matter: using $n(n-1)$ instead of $C_n^2$ is wrong.`,
        ),
      };
    },
  });
}

// --- O2: binom, ikkita had (98) ---
export function sampleBinomOpen(rng: Rng): BinomP & { k2: number } {
  const p = sampleBinom(rng);
  let k2 = rng.int(0, p.n);
  if (k2 === p.k) k2 = (k2 + 1) % (p.n + 1);
  return { ...p, k2 };
}

function otplBinom(req: SlotRequest) {
  const p = sampleBinomOpen(slotRng(req, 'obinom'));
  const t1 = binomTerm(p, p.k);
  const t2 = binomTerm(p, p.k2);
  const expr = binomExprTex(p);
  return oSpec({
    topic: 98,
    difficulty: req.difficulty,
    estSeconds: 360,
    a: frac(t1.coef),
    b: frac(t2.coef),
    text: (lang) => {
      const L = langPicker(lang);
      const solPart = (k: number, t: { coef: number; exp: number }) =>
        T`$j=${k}$: $\binom{${p.n}}{${k}}\cdot ${texParen(p.a)}^{${p.n - k}}\cdot ${texParen(p.b)}^{${k}}=${t.coef}$ ($x^{${t.exp}}$)`;
      return {
        stem_md: L(
          T`$${expr}$ ifodaning yoyilmasi berilgan.`,
          T`Дано выражение $${expr}$ и его разложение по формуле бинома Ньютона.`,
          T`$${expr}$ an'latpasınıń jayılması berilgen.`,
          T`Consider the binomial expansion of $${expr}$.`,
        ),
        a: { prompt_md: askTarget(binomTarget(t1.exp), lang) },
        b: { prompt_md: askTarget(binomTarget(t2.exp), lang) },
        solution_md: L(
          T`Umumiy had: $\binom{${p.n}}{j}a^{${p.n}-j}b^{j}x^{${p.p * p.n}-${p.p + p.q}j}$. a) ${solPart(p.k, t1)}; b) ${solPart(p.k2, t2)}.`,
          T`Общий член: $\binom{${p.n}}{j}a^{${p.n}-j}b^{j}x^{${p.p * p.n}-${p.p + p.q}j}$. а) ${solPart(p.k, t1)}; б) ${solPart(p.k2, t2)}.`,
          T`Ulıwma aǵza: $\binom{${p.n}}{j}a^{${p.n}-j}b^{j}x^{${p.p * p.n}-${p.p + p.q}j}$. a) ${solPart(p.k, t1)}; b) ${solPart(p.k2, t2)}.`,
          T`General term: $\binom{${p.n}}{j}a^{${p.n}-j}b^{j}x^{${p.p * p.n}-${p.p + p.q}j}$. a) ${solPart(p.k, t1)}; b) ${solPart(p.k2, t2)}.`,
        ),
        mistake_note_md: L(
          T`Daraja tenglamasida $x^{-q}$ ning manfiy ko'rsatkichini hisobga olmaslik.`,
          T`Не учесть отрицательный показатель в $x^{-q}$ при составлении уравнения для степени.`,
          T`Dáreje teńlemesinde $x^{-q}$ dıń teris kórsetkishin esapqa almaw.`,
          T`Ignoring the negative exponent of $x^{-q}$ when setting up the exponent equation.`,
        ),
      };
    },
  });
}

// --- O3: chastotalar jadvali: o'rtacha va dispersiya (101) ---
export interface FreqP {
  xs: number[];
  fs: number[];
}
export function sampleFreq(rng: Rng): FreqP {
  const xs = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4).sort((a, b) => a - b);
  return { xs, fs: xs.map(() => rng.int(1, 6)) };
}
export function solveFreq({ xs, fs }: FreqP): { n: number; mean: Frac; variance: Frac } {
  const n = fs.reduce((s, f) => s + f, 0);
  const mean = frac(xs.reduce((s, x, i) => s + x * fs[i]!, 0), n);
  const meanSq = frac(xs.reduce((s, x, i) => s + x * x * fs[i]!, 0), n);
  return { n, mean, variance: fSub(meanSq, fMul(mean, mean)) };
}

function otplFreq(req: SlotRequest) {
  const p = sampleFreq(slotRng(req, 'freq'));
  const s = solveFreq(p);
  const sumX = p.xs.reduce((a, x, i) => a + x * p.fs[i]!, 0);
  return oSpec({
    topic: 101,
    difficulty: req.difficulty,
    estSeconds: 400,
    a: s.mean,
    b: s.variance,
    text: (lang) => {
      const L = langPicker(lang);
      const hint = L(`Oddiy kasr (masalan 7/4) yoki o'nli kasr`, `Обыкновенная дробь (например 7/4) или десятичная дробь`, `Ápiwayı bólshek (mısalı 7/4) yamasa onlıq bólshek`, `A common fraction (e.g. 7/4) or a decimal`);
      return {
        stem_md: L(
          T`Tanlanma qiymatlari $x_i$: $${list(p.xs)}$; ularning chastotalari $f_i$: $${list(p.fs)}$ (jami $${s.n}$ ta kuzatuv).`,
          T`Значения выборки $x_i$: $${list(p.xs)}$; их частоты $f_i$: $${list(p.fs)}$ (всего $${s.n}$ наблюдений).`,
          T`Tańlanba mánisleri $x_i$: $${list(p.xs)}$; olardıń jiyilikleri $f_i$: $${list(p.fs)}$ (jámi $${s.n}$ baqlaw).`, // kaa: tekshirilsin
          T`Sample values $x_i$: $${list(p.xs)}$; their frequencies $f_i$: $${list(p.fs)}$ ($${s.n}$ observations in total).`,
        ),
        a: { prompt_md: L(T`O'rtacha qiymatni toping.`, T`Найдите среднее значение.`, T`Ortasha mánisti tabıń.`, T`Find the mean.`), hint },
        b: { prompt_md: L(T`Dispersiyani toping ($D=\overline{x^{2}}-\bar{x}^{2}$).`, T`Найдите дисперсию ($D=\overline{x^{2}}-\bar{x}^{2}$).`, T`Dispersiyanı tabıń ($D=\overline{x^{2}}-\bar{x}^{2}$).`, T`Find the variance ($D=\overline{x^{2}}-\bar{x}^{2}$).`), hint },
        solution_md: L(
          T`$\bar{x}=\dfrac{\sum x_if_i}{${s.n}}=\dfrac{${sumX}}{${s.n}}=${texFrac(s.mean)}$. $\overline{x^{2}}=\dfrac{${p.xs.reduce((a, x, i) => a + x * x * p.fs[i]!, 0)}}{${s.n}}$, shuning uchun $D=\overline{x^{2}}-\bar{x}^{2}=${texFrac(s.variance)}$.`,
          T`$\bar{x}=\dfrac{\sum x_if_i}{${s.n}}=\dfrac{${sumX}}{${s.n}}=${texFrac(s.mean)}$. $\overline{x^{2}}=\dfrac{${p.xs.reduce((a, x, i) => a + x * x * p.fs[i]!, 0)}}{${s.n}}$, поэтому $D=\overline{x^{2}}-\bar{x}^{2}=${texFrac(s.variance)}$.`,
          T`$\bar{x}=\dfrac{\sum x_if_i}{${s.n}}=\dfrac{${sumX}}{${s.n}}=${texFrac(s.mean)}$. $\overline{x^{2}}=\dfrac{${p.xs.reduce((a, x, i) => a + x * x * p.fs[i]!, 0)}}{${s.n}}$, sonıń ushın $D=\overline{x^{2}}-\bar{x}^{2}=${texFrac(s.variance)}$.`,
          T`$\bar{x}=\dfrac{\sum x_if_i}{${s.n}}=\dfrac{${sumX}}{${s.n}}=${texFrac(s.mean)}$. $\overline{x^{2}}=\dfrac{${p.xs.reduce((a, x, i) => a + x * x * p.fs[i]!, 0)}}{${s.n}}$, hence $D=\overline{x^{2}}-\bar{x}^{2}=${texFrac(s.variance)}$.`,
        ),
        mistake_note_md: L(
          T`Chastotalarni hisobga olmasdan qiymatlarning oddiy o'rtachasini olish.`,
          T`Не учесть частоты и взять простое среднее значений.`,
          T`Jiyiliklerdi esapqa almay mánislerdiń ápiwayı ortashasın alıw.`,
          T`Ignoring the frequencies and taking the plain average of the values.`,
        ),
      };
    },
  });
}

// --- O4: shartli ehtimollik (100) ---
export interface CondP {
  N: number;
  alpha: number;
  beta: number;
  gamma: number;
}
export function sampleCond(rng: Rng): CondP {
  for (;;) {
    const N = rng.pick([20, 24, 30, 36, 40]);
    const alpha = rng.int(Math.ceil(N / 4), Math.floor(N / 2));
    const beta = rng.int(Math.ceil(N / 4), Math.floor(N / 2));
    const gamma = rng.int(2, Math.min(alpha, beta) - 1);
    if (alpha + beta - gamma <= N && gamma < Math.min(alpha, beta)) return { N, alpha, beta, gamma };
  }
}
/** P(AB) = P(A)+P(B)-P(A U B); P(A|B) = P(AB)/P(B) */
export function solveCond({ N, alpha, beta, gamma }: CondP): { pA: Frac; pB: Frac; pU: Frac; pAB: Frac; cond: Frac } {
  const pA = frac(alpha, N);
  const pB = frac(beta, N);
  const pU = frac(alpha + beta - gamma, N);
  const pAB = fSub(fAdd(pA, pB), pU);
  return { pA, pB, pU, pAB, cond: fMul(pAB, frac(pB.d, pB.n)) };
}

function otplCond(req: SlotRequest) {
  const k = sampleCond(slotRng(req, 'cond'));
  const s = solveCond(k);
  return oSpec({
    topic: 100,
    difficulty: req.difficulty,
    estSeconds: 330,
    a: s.pAB,
    b: s.cond,
    text: (lang) => {
      const L = langPicker(lang);
      const hint = L(`Oddiy kasr (masalan 3/8) yoki o'nli kasr`, `Обыкновенная дробь (например 3/8) или десятичная дробь`, `Ápiwayı bólshek (mısalı 3/8) yamasa onlıq bólshek`, `A common fraction (e.g. 3/8) or a decimal`);
      return {
        stem_md: L(
          T`$A$ va $B$ hodisalar uchun $P(A)=${texFrac(s.pA)}$, $P(B)=${texFrac(s.pB)}$, $P(A\cup B)=${texFrac(s.pU)}$.`,
          T`Для событий $A$ и $B$ известно: $P(A)=${texFrac(s.pA)}$, $P(B)=${texFrac(s.pB)}$, $P(A\cup B)=${texFrac(s.pU)}$.`,
          T`$A$ hám $B$ hádiyseleri ushın $P(A)=${texFrac(s.pA)}$, $P(B)=${texFrac(s.pB)}$, $P(A\cup B)=${texFrac(s.pU)}$.`,
          T`For events $A$ and $B$: $P(A)=${texFrac(s.pA)}$, $P(B)=${texFrac(s.pB)}$, $P(A\cup B)=${texFrac(s.pU)}$.`,
        ),
        a: { prompt_md: L(T`$P(A\cap B)$ ni toping.`, T`Найдите $P(A\cap B)$.`, T`$P(A\cap B)$ di tabıń.`, T`Find $P(A\cap B)$.`), hint },
        b: { prompt_md: L(T`Shartli ehtimollik $P(A\mid B)$ ni toping.`, T`Найдите условную вероятность $P(A\mid B)$.`, T`Shártli itimallıq $P(A\mid B)$ di tabıń.`, T`Find the conditional probability $P(A\mid B)$.`), hint },
        solution_md: L(
          T`a) $P(A\cap B)=P(A)+P(B)-P(A\cup B)=${texFrac(s.pA)}+${texFrac(s.pB)}-${texFrac(s.pU)}=${texFrac(s.pAB)}$. b) $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}=\dfrac{${texFrac(s.pAB)}}{${texFrac(s.pB)}}=${texFrac(s.cond)}$.`,
          T`а) $P(A\cap B)=P(A)+P(B)-P(A\cup B)=${texFrac(s.pA)}+${texFrac(s.pB)}-${texFrac(s.pU)}=${texFrac(s.pAB)}$. б) $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}=\dfrac{${texFrac(s.pAB)}}{${texFrac(s.pB)}}=${texFrac(s.cond)}$.`,
          T`a) $P(A\cap B)=P(A)+P(B)-P(A\cup B)=${texFrac(s.pA)}+${texFrac(s.pB)}-${texFrac(s.pU)}=${texFrac(s.pAB)}$. b) $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}=\dfrac{${texFrac(s.pAB)}}{${texFrac(s.pB)}}=${texFrac(s.cond)}$.`,
          T`a) $P(A\cap B)=P(A)+P(B)-P(A\cup B)=${texFrac(s.pA)}+${texFrac(s.pB)}-${texFrac(s.pU)}=${texFrac(s.pAB)}$. b) $P(A\mid B)=\dfrac{P(A\cap B)}{P(B)}=\dfrac{${texFrac(s.pAB)}}{${texFrac(s.pB)}}=${texFrac(s.cond)}$.`,
        ),
        mistake_note_md: L(
          T`Shartli ehtimollikda $P(B)$ o'rniga $P(A)$ ga bo'lish.`,
          T`Делить на $P(A)$ вместо $P(B)$ при вычислении условной вероятности.`,
          T`Shártli itimallıqta $P(B)$ ornına $P(A)$ ǵa bóliw.`,
          T`Dividing by $P(A)$ instead of $P(B)$ in the conditional probability.`,
        ),
      };
    },
  });
}

// --- O5: uchta to'plam (94) ---
function otplSets(req: SlotRequest) {
  const v = sampleVenn(slotRng(req, 'sets'));
  const s = solveVenn(v);
  return oSpec({
    topic: 94,
    difficulty: req.difficulty,
    estSeconds: 330,
    a: frac(s.union),
    b: frac(s.exactlyTwo),
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`Kursda $${s.X}$ talaba ingliz tilini, $${s.Y}$ talaba rus tilini, $${s.Z}$ talaba nemis tilini o'rganadi. Ingliz va rus tillarini $${s.P}$ ta, ingliz va nemis tillarini $${s.Q}$ ta, rus va nemis tillarini $${s.R}$ ta talaba o'rganadi; uchala tilni $${s.T}$ ta talaba o'rganadi.`,
          T`На курсе $${s.X}$ студентов изучают английский, $${s.Y}$ — русский, $${s.Z}$ — немецкий. Английский и русский изучают $${s.P}$ студентов, английский и немецкий — $${s.Q}$, русский и немецкий — $${s.R}$; все три языка изучают $${s.T}$ студентов.`,
          T`Kursta $${s.X}$ student ingliz tilin, $${s.Y}$ student rus tilin, $${s.Z}$ student nemis tilin úyrenedi. Ingliz hám rus tillerin $${s.P}$, ingliz hám nemis tillerin $${s.Q}$, rus hám nemis tillerin $${s.R}$ student úyrenedi; úsh tildi de $${s.T}$ student úyrenedi.`, // kaa: tekshirilsin
          T`On a course, $${s.X}$ students study English, $${s.Y}$ study Russian and $${s.Z}$ study German. $${s.P}$ study English and Russian, $${s.Q}$ English and German, $${s.R}$ Russian and German; $${s.T}$ study all three languages.`,
        ),
        a: { prompt_md: L(T`Kamida bitta tilni o'rganadigan talabalar sonini toping.`, T`Найдите число студентов, изучающих хотя бы один язык.`, T`Keminde bir tildi úyrenetuǵın studentler sanın tabıń.`, T`Find the number of students who study at least one language.`) },
        b: { prompt_md: L(T`Roppa-rosa ikkita tilni o'rganadigan talabalar sonini toping.`, T`Найдите число студентов, изучающих ровно два языка.`, T`Tap eki tildi úyrenetuǵın studentler sanın tabıń.`, T`Find the number of students who study exactly two languages.`) },
        solution_md: L(
          T`a) $|A\cup B\cup C|=X+Y+Z-P-Q-R+T=${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${s.T}=${s.union}$. b) Roppa-rosa ikkita: $(P-T)+(Q-T)+(R-T)=${s.P}+${s.Q}+${s.R}-3\cdot ${s.T}=${s.exactlyTwo}$.`,
          T`а) $|A\cup B\cup C|=X+Y+Z-P-Q-R+T=${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${s.T}=${s.union}$. б) Ровно два: $(P-T)+(Q-T)+(R-T)=${s.P}+${s.Q}+${s.R}-3\cdot ${s.T}=${s.exactlyTwo}$.`,
          T`a) $|A\cup B\cup C|=X+Y+Z-P-Q-R+T=${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${s.T}=${s.union}$. b) Tap eki: $(P-T)+(Q-T)+(R-T)=${s.P}+${s.Q}+${s.R}-3\cdot ${s.T}=${s.exactlyTwo}$.`,
          T`a) $|A\cup B\cup C|=X+Y+Z-P-Q-R+T=${s.X}+${s.Y}+${s.Z}-${s.P}-${s.Q}-${s.R}+${s.T}=${s.union}$. b) Exactly two: $(P-T)+(Q-T)+(R-T)=${s.P}+${s.Q}+${s.R}-3\cdot ${s.T}=${s.exactlyTwo}$.`,
        ),
        mistake_note_md: L(
          T`Uchlik kesishma $T$ ni qo'shishni unutish yoki juft kesishmalardan $T$ ni ayirmaslik.`,
          T`Забыть прибавить $T$ в формуле объединения или не вычесть $T$ из парных пересечений.`,
          T`Úshlik kesilisiw $T$ nı qosıwdı umıtıw yamasa jup kesilisiwlerden $T$ nı ayırmaw.`,
          T`Forgetting to add $T$ in the union formula or not subtracting $T$ from the pairwise intersections.`,
        ),
      };
    },
  });
}

// --- O6: yonma-yon o'tirish (97) ---
export interface AdjP {
  n: number;
}
export const sampleAdj = (rng: Rng): AdjP => ({ n: rng.int(6, 8) });
/** To'g'ridan-to'g'ri sanash: A va B yonma-yon (bir qatorda n kishi) */
export function solveAdj({ n }: AdjP): { adjacent: number; apart: number } {
  const used = new Array<boolean>(n).fill(false);
  const cur: number[] = [];
  let adjacent = 0;
  let total = 0;
  const rec = () => {
    if (cur.length === n) {
      total++;
      if (Math.abs(cur.indexOf(0) - cur.indexOf(1)) === 1) adjacent++;
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      cur.push(i);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return { adjacent, apart: total - adjacent };
}

function otplAdj(req: SlotRequest) {
  const k = sampleAdj(slotRng(req, 'adj'));
  const s = solveAdj(k);
  const n = k.n;
  return oSpec({
    topic: 97,
    difficulty: req.difficulty,
    estSeconds: 300,
    a: frac(s.adjacent),
    b: frac(s.apart),
    text: (lang) => {
      const L = langPicker(lang);
      return {
        stem_md: L(
          T`${n} ta o'quvchi (ular orasida A va B bor) bir qatorga tizilmoqda.`,
          T`${n} учеников (среди них A и B) выстраиваются в один ряд.`,
          T`${n} oqıwshı (olar arasında A hám B bar) bir qatarǵa tizilmekte.`,
          T`${n} students (A and B among them) line up in a single row.`,
        ),
        a: { prompt_md: L(T`A va B yonma-yon turadigan tizilishlar sonini toping.`, T`Найдите число расстановок, в которых A и B стоят рядом.`, T`A hám B janasıp turatuǵın tizilisler sanın tabıń.`, T`Find the number of line-ups in which A and B stand next to each other.`) },
        b: { prompt_md: L(T`A va B yonma-yon turmaydigan tizilishlar sonini toping.`, T`Найдите число расстановок, в которых A и B не стоят рядом.`, T`A hám B janasıp turmaytuǵın tizilisler sanın tabıń.`, T`Find the number of line-ups in which A and B are not next to each other.`) },
        solution_md: L(
          T`a) A va B ni bitta blok deb olamiz: blok ichida $2$ tartib, blok va qolgan $${n - 2}$ kishi $${n - 1}!$ usulda: $2\cdot ${n - 1}!=${s.adjacent}$. b) Hammasi $${n}!=${factorial(n)}$, shuning uchun $${factorial(n)}-${s.adjacent}=${s.apart}$.`,
          T`а) Считаем A и B одним блоком: внутри блока $2$ порядка, а блок и остальные $${n - 2}$ человек — $${n - 1}!$ способов: $2\cdot ${n - 1}!=${s.adjacent}$. б) Всего $${n}!=${factorial(n)}$, поэтому $${factorial(n)}-${s.adjacent}=${s.apart}$.`,
          T`a) A hám B nı bir blok dep alamız: blok ishinde $2$ tártip, blok hám qalǵan $${n - 2}$ adam $${n - 1}!$ usılda: $2\cdot ${n - 1}!=${s.adjacent}$. b) Barlıǵı $${n}!=${factorial(n)}$, sonıń ushın $${factorial(n)}-${s.adjacent}=${s.apart}$.`,
          T`a) Treat A and B as one block: $2$ orders inside it, and the block with the other $${n - 2}$ students gives $${n - 1}!$ ways: $2\cdot ${n - 1}!=${s.adjacent}$. b) In total $${n}!=${factorial(n)}$, so $${factorial(n)}-${s.adjacent}=${s.apart}$.`,
        ),
        mistake_note_md: L(
          T`Blok ichida A va B ning o'rin almashishini ($2$ ko'paytuvchini) unutish.`,
          T`Забыть множитель $2$ — перестановку A и B внутри блока.`,
          T`Blok ishinde A hám B dıń orın almasıwın ($2$ kóbeytiwshisin) umıtıw.`,
          T`Forgetting the factor $2$ for swapping A and B inside the block.`,
        ),
      };
    },
  });
}

// ============================== Generator ==============================

// Mavzu qo'shni shablonlarda har xil bo'lishi uchun tartiblangan: 94, 96, 95, 98, 97, 99, 100, 101, 103, 102.
const Y1_TEMPLATES = [tplVenn, tplDigits, tplLogic, tplBinom, tplArr, tplDice, tplBayes, tplVar, tplTariff, tplDiagram] as const;
const O_TEMPLATES = [otplBalls, otplBinom, otplFreq, otplCond, otplSets, otplAdj] as const;

export const generateToplam: BlockGenerator = (req) => {
  if (req.type === 'o') return pickTemplate(req, O_TEMPLATES)(req);
  return pickTemplate(req, Y1_TEMPLATES)(req);
};

export const TOPLAM_TEMPLATE_COUNTS = { y1: Y1_TEMPLATES.length, o: O_TEMPLATES.length };

