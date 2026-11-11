import { frac, texBig, texFrac } from './helpers';
import { S, T, disp, inl, mk, polyTex, tpl, type Template } from './algebra-lib';

// ---------------------------------------------------------------------------
// Yangi mock variantlar G–O uchun qo'shimcha oddiy shablonlar (content/gen/mock-official.ts).
// Sabab: rasmiy spetsifikatsiyada progressiyalar (57, 58), matnli masalalar (42), masshtab (105) "Algebraik shakl almashtirishlar"
// (2.4) bo'limiga kiradi; hosilaning fizik ma'nosi (110) esa Analizga (6.1). Eski generatorlarda mos oddiy (L1) shablon yo'q edi.
// Hammasi algebra-lib `tpl` infratuzilmasida: parametrlar deterministik, javob kod bilan hisoblanadi, "check" mustaqil usul bilan.
// Tillar: uz / ru / kaa / en; qoraqalpoq atamalari tekshirilsin.
//   uz: progressiya, ayirma (d), maxraj (q), birga ishlash, oqim, masshtab, tezlik, tezlanish
//   ru: прогрессия, разность, знаменатель, совместная работа, масштаб, скорость, ускорение
//   kaa: progressiya, ayırma, bólim (q), birge islew, masshtab, tezlik, tezleniw   // kaa: tekshirilsin
//   en: progression, common difference, common ratio, working together, scale, velocity, acceleration
// ---------------------------------------------------------------------------

const tx = (n: number, d = 1): string => texFrac(frac(n, d));
const sgn = (n: number): string => (n < 0 ? `(${n})` : String(n));

// ===========================================================================
// 1. Arifmetik progressiya, oddiy (57)
// ===========================================================================
interface ApP { form: number; a1: number; d: number; n: number; p: number; q: number }
export const tMockAp: Template = tpl<ApP>(
  'mock-ap',
  (r) => {
    const p = r.int(2, 6);
    return { form: r.int(0, 2), a1: r.int(-6, 15), d: r.pick([-4, -3, -2, 2, 3, 4, 5, 6, 7]), n: r.int(9, 16), p, q: r.int(p + 2, p + 7) };
  },
  ({ form, a1, d, n, p, q }) => {
    const an = (k: number) => a1 + (k - 1) * d;
    if (form === 0) {
      const val = an(n);
      let cur = a1;
      for (let k = 1; k < n; k++) cur += d;
      return {
        topic: 57,
        est: 60,
        stem: (l) =>
          ({
            uz: `Arifmetik progressiyada ${inl(`a_1=${a1}`)} va ${inl(`d=${d}`)}. Progressiyaning ${inl(`${n}`)}-hadi ${inl(`a_{${n}}`)} ni toping.`,
            ru: `В арифметической прогрессии ${inl(`a_1=${a1}`)} и ${inl(`d=${d}`)}. Найдите ${inl(`${n}`)}-й член прогрессии ${inl(`a_{${n}}`)}.`,
            kaa: `Arifmetikalıq progressiyada ${inl(`a_1=${a1}`)} hám ${inl(`d=${d}`)}. Progressiyanıń ${inl(`${n}`)}-aǵzası ${inl(`a_{${n}}`)} tı tabıń.`, // kaa: tekshirilsin
            en: `In an arithmetic progression ${inl(`a_1=${a1}`)} and ${inl(`d=${d}`)}. Find the ${n}th term ${inl(`a_{${n}}`)}.`,
          })[l],
        correct: String(val),
        wrong: [a1 + n * d, a1 + (n - 2) * d, (n - 1) * d, a1 * (n - 1) + d].map(String),
        solution: (l) =>
          S(
            l,
            T("Arifmetik progressiyaning $n$-hadi: $a_n=a_1+(n-1)d$.", 'Формула $n$-го члена арифметической прогрессии: $a_n=a_1+(n-1)d$.', 'Arifmetikalıq progressiyanıń $n$-aǵzası: $a_n=a_1+(n-1)d$.', 'The $n$th term of an arithmetic progression: $a_n=a_1+(n-1)d$.'),
            disp(`a_{${n}}=${a1}+${n - 1}\\cdot ${sgn(d)}=${val}`),
          ),
        mistake: mk(T("Formulada $n-1$ o'rniga $n$ ni olish.", 'Взять $n$ вместо $n-1$ в формуле.', 'Formulada $n-1$ ornına $n$ di alıw.', 'Using $n$ instead of $n-1$ in the formula.')),
        check: [[cur, val]],
      };
    }
    if (form === 1) {
      const ap = an(p);
      const aq = an(q);
      let found = NaN;
      for (let dd = -30; dd <= 30; dd++) if (ap + (q - p) * dd === aq) found = dd;
      return {
        topic: 57,
        est: 70,
        stem: (l) =>
          ({
            uz: `Arifmetik progressiyada ${inl(`a_{${p}}=${ap}`)} va ${inl(`a_{${q}}=${aq}`)}. Progressiyaning ayirmasi ${inl('d')} ni toping.`,
            ru: `В арифметической прогрессии ${inl(`a_{${p}}=${ap}`)} и ${inl(`a_{${q}}=${aq}`)}. Найдите разность прогрессии ${inl('d')}.`,
            kaa: `Arifmetikalıq progressiyada ${inl(`a_{${p}}=${ap}`)} hám ${inl(`a_{${q}}=${aq}`)}. Progressiyanıń ayırması ${inl('d')} ni tabıń.`, // kaa: tekshirilsin
            en: `In an arithmetic progression ${inl(`a_{${p}}=${ap}`)} and ${inl(`a_{${q}}=${aq}`)}. Find the common difference ${inl('d')}.`,
          })[l],
        correct: String(d),
        wrong: [tx(aq - ap), tx(aq - ap, q - p + 1), tx(-d), tx(aq + ap, q - p), String(d + 1), String(d - 1)],
        solution: (l) =>
          S(
            l,
            T("$a_q-a_p=(q-p)d$ bo'lgani uchun $d=\\dfrac{a_q-a_p}{q-p}$.", 'Так как $a_q-a_p=(q-p)d$, то $d=\\dfrac{a_q-a_p}{q-p}$.', '$a_q-a_p=(q-p)d$ bolǵanı ushın $d=\\dfrac{a_q-a_p}{q-p}$.', 'Since $a_q-a_p=(q-p)d$, we get $d=\\dfrac{a_q-a_p}{q-p}$.'),
            disp(`d=\\frac{${aq}-${sgn(ap)}}{${q}-${p}}=\\frac{${aq - ap}}{${q - p}}=${d}`),
          ),
        mistake: mk(T("Hadlar ayirmasini hadlar raqamlari ayirmasiga bo'lishni unutish.", 'Не разделить разность членов на разность их номеров.', 'Aǵzalar ayırmasın nomerler ayırmasına bóliwdi umıtıw.', 'Forgetting to divide the difference of the terms by the difference of their indices.')),
        check: [[found, d]],
      };
    }
    const val = (n * (2 * a1 + (n - 1) * d)) / 2;
    let s = 0;
    for (let k = 1; k <= n; k++) s += an(k);
    const sOf = (k: number) => (k * (2 * a1 + (k - 1) * d)) / 2;
    return {
      topic: 57,
      est: 75,
      stem: (l) =>
        ({
          uz: `Arifmetik progressiyada ${inl(`a_1=${a1}`)} va ${inl(`d=${d}`)}. Progressiyaning dastlabki ${inl(`${n}`)} ta hadi yig'indisini toping.`,
          ru: `В арифметической прогрессии ${inl(`a_1=${a1}`)} и ${inl(`d=${d}`)}. Найдите сумму первых ${inl(`${n}`)} членов прогрессии.`,
          kaa: `Arifmetikalıq progressiyada ${inl(`a_1=${a1}`)} hám ${inl(`d=${d}`)}. Progressiyanıń dáslepki ${inl(`${n}`)} aǵzasınıń qosındısın tabıń.`, // kaa: tekshirilsin
          en: `In an arithmetic progression ${inl(`a_1=${a1}`)} and ${inl(`d=${d}`)}. Find the sum of the first ${inl(`${n}`)} terms.`,
        })[l],
      correct: String(val),
      wrong: [tx(n * (2 * a1 + n * d), 2), sOf(n - 1), n * an(n), a1 + an(n)].map((v) => (typeof v === 'string' ? v : String(v))),
      solution: (l) =>
        S(
          l,
          T("Yig'indi formulasi: $S_n=\\dfrac{2a_1+(n-1)d}{2}\\cdot n$.", 'Формула суммы: $S_n=\\dfrac{2a_1+(n-1)d}{2}\\cdot n$.', 'Qosındı formulası: $S_n=\\dfrac{2a_1+(n-1)d}{2}\\cdot n$.', 'Sum formula: $S_n=\\dfrac{2a_1+(n-1)d}{2}\\cdot n$.'),
          disp(`S_{${n}}=\\frac{2\\cdot ${sgn(a1)}+${n - 1}\\cdot ${sgn(d)}}{2}\\cdot ${n}=${val}`),
        ),
      mistake: mk(T("Formulada $n-1$ o'rniga $n$ ni qo'yish yoki $n/2$ ga ko'paytirishni unutish.", 'Подставить $n$ вместо $n-1$ или забыть умножить на $n/2$.', 'Formulada $n-1$ ornına $n$ di qoyıw yamasa $n/2$ ge kóbeytiwdi umıtıw.', 'Using $n$ instead of $n-1$, or forgetting to multiply by $n/2$.')),
      check: [[s, val]],
    };
  },
);

// ===========================================================================
// 2. Geometrik progressiya, oddiy (58)
// ===========================================================================
interface GpP { form: number; b1: number; q: number; n: number; p: number }
export const tMockGp: Template = tpl<GpP>(
  'mock-gp',
  (r) => ({ form: r.int(0, 2), b1: r.int(1, 6) * r.pick([1, 1, -1]), q: r.pick([2, 3, 4, -2, -3]), n: r.int(4, 6), p: r.int(1, 2) }),
  ({ form, b1, q, n, p }) => {
    if (form === 0) {
      const val = b1 * q ** (n - 1);
      let cur = b1;
      for (let k = 1; k < n; k++) cur *= q;
      return {
        topic: 58,
        est: 60,
        stem: (l) =>
          ({
            uz: `Geometrik progressiyada ${inl(`b_1=${b1}`)} va ${inl(`q=${q}`)}. Progressiyaning ${inl(`${n}`)}-hadi ${inl(`b_{${n}}`)} ni toping.`,
            ru: `В геометрической прогрессии ${inl(`b_1=${b1}`)} и ${inl(`q=${q}`)}. Найдите ${inl(`${n}`)}-й член прогрессии ${inl(`b_{${n}}`)}.`,
            kaa: `Geometriyalıq progressiyada ${inl(`b_1=${b1}`)} hám ${inl(`q=${q}`)}. Progressiyanıń ${inl(`${n}`)}-aǵzası ${inl(`b_{${n}}`)} tı tabıń.`, // kaa: tekshirilsin
            en: `In a geometric progression ${inl(`b_1=${b1}`)} and ${inl(`q=${q}`)}. Find the ${n}th term ${inl(`b_{${n}}`)}.`,
          })[l],
        correct: String(val),
        wrong: [b1 * q ** n, b1 * q * (n - 1), (b1 * q) ** (n - 1), b1 + (n - 1) * q].map(String),
        solution: (l) =>
          S(
            l,
            T("Geometrik progressiyaning $n$-hadi: $b_n=b_1\\cdot q^{n-1}$.", 'Формула $n$-го члена геометрической прогрессии: $b_n=b_1\\cdot q^{n-1}$.', 'Geometriyalıq progressiyanıń $n$-aǵzası: $b_n=b_1\\cdot q^{n-1}$.', 'The $n$th term of a geometric progression: $b_n=b_1\\cdot q^{n-1}$.'),
            disp(`b_{${n}}=${b1}\\cdot ${sgn(q)}^{${n - 1}}=${val}`),
          ),
        mistake: mk(T("$q^{n-1}$ o'rniga $q^{n}$ ni olish yoki darajani ko'paytirish bilan almashtirish.", 'Взять $q^{n}$ вместо $q^{n-1}$ или заменить степень умножением.', '$q^{n-1}$ ornına $q^{n}$ di alıw yamasa dárejeni kóbeytiw menen almastırıw.', 'Using $q^{n}$ instead of $q^{n-1}$, or replacing the power by a product.')),
        check: [[cur, val]],
      };
    }
    if (form === 1) {
      const c = Math.abs(b1);
      const bp = c * q ** (p - 1);
      const bp3 = c * q ** (p + 2);
      let found = NaN;
      for (let t = -9; t <= 9; t++) if (t !== 0 && bp * t ** 3 === bp3) found = t;
      return {
        topic: 58,
        est: 80,
        stem: (l) =>
          ({
            uz: `Geometrik progressiyada ${inl(`b_{${p}}=${bp}`)} va ${inl(`b_{${p + 3}}=${bp3}`)}. Progressiyaning maxraji ${inl('q')} ni toping.`,
            ru: `В геометрической прогрессии ${inl(`b_{${p}}=${bp}`)} и ${inl(`b_{${p + 3}}=${bp3}`)}. Найдите знаменатель прогрессии ${inl('q')}.`,
            kaa: `Geometriyalıq progressiyada ${inl(`b_{${p}}=${bp}`)} hám ${inl(`b_{${p + 3}}=${bp3}`)}. Progressiyanıń bólimi ${inl('q')} di tabıń.`, // kaa: tekshirilsin
            en: `In a geometric progression ${inl(`b_{${p}}=${bp}`)} and ${inl(`b_{${p + 3}}=${bp3}`)}. Find the common ratio ${inl('q')}.`,
          })[l],
        correct: String(q),
        wrong: [q ** 3, q + 1, q - 1, -q, q * 3, q * q].map(String),
        solution: (l) =>
          S(
            l,
            T(`$b_{${p + 3}}=b_{${p}}\\cdot q^{3}$ bo'lgani uchun $q^{3}=\\dfrac{${bp3}}{${sgn(bp)}}=${q ** 3}$.`, `Так как $b_{${p + 3}}=b_{${p}}\\cdot q^{3}$, получаем $q^{3}=\\dfrac{${bp3}}{${sgn(bp)}}=${q ** 3}$.`, `$b_{${p + 3}}=b_{${p}}\\cdot q^{3}$ bolǵanı ushın $q^{3}=\\dfrac{${bp3}}{${sgn(bp)}}=${q ** 3}$.`, `Since $b_{${p + 3}}=b_{${p}}\\cdot q^{3}$, we get $q^{3}=\\dfrac{${bp3}}{${sgn(bp)}}=${q ** 3}$.`),
            disp(`q=\\sqrt[3]{${q ** 3}}=${q}`),
          ),
        mistake: mk(T("Hadlar nisbatini $q$ ning o'zi deb olish (kub ildiz chiqarishni unutish).", 'Принять отношение членов за $q$ (забыть извлечь кубический корень).', 'Aǵzalar qatnasın $q$ diń ózi dep alıw (kub túbir shıǵarıwdı umıtıw).', 'Taking the ratio of the terms as $q$ itself (forgetting the cube root).')),
        check: [[found, q]],
      };
    }
    const qq = Math.abs(q) === 2 || Math.abs(q) === 3 ? Math.abs(q) : 2;
    const c = Math.abs(b1);
    const val = (c * (qq ** n - 1)) / (qq - 1);
    let s = 0;
    let t = c;
    for (let k = 1; k <= n; k++) {
      s += t;
      t *= qq;
    }
    return {
      topic: 58,
      est: 80,
      stem: (l) =>
        ({
          uz: `Geometrik progressiyada ${inl(`b_1=${c}`)} va ${inl(`q=${qq}`)}. Progressiyaning dastlabki ${inl(`${n}`)} ta hadi yig'indisini toping.`,
          ru: `В геометрической прогрессии ${inl(`b_1=${c}`)} и ${inl(`q=${qq}`)}. Найдите сумму первых ${inl(`${n}`)} членов прогрессии.`,
          kaa: `Geometriyalıq progressiyada ${inl(`b_1=${c}`)} hám ${inl(`q=${qq}`)}. Progressiyanıń dáslepki ${inl(`${n}`)} aǵzasınıń qosındısın tabıń.`, // kaa: tekshirilsin
          en: `In a geometric progression ${inl(`b_1=${c}`)} and ${inl(`q=${qq}`)}. Find the sum of the first ${inl(`${n}`)} terms.`,
        })[l],
      correct: String(val),
      wrong: [c * qq ** n, c * (qq ** n - 1), tx(c * (qq ** n - 1), qq), c * qq ** (n - 1)].map(String),
      solution: (l) =>
        S(
          l,
          T("Yig'indi formulasi: $S_n=\\dfrac{b_1(q^{n}-1)}{q-1}$.", 'Формула суммы: $S_n=\\dfrac{b_1(q^{n}-1)}{q-1}$.', 'Qosındı formulası: $S_n=\\dfrac{b_1(q^{n}-1)}{q-1}$.', 'Sum formula: $S_n=\\dfrac{b_1(q^{n}-1)}{q-1}$.'),
          disp(`S_{${n}}=\\frac{${c}\\cdot(${qq}^{${n}}-1)}{${qq}-1}=\\frac{${c}\\cdot ${qq ** n - 1}}{${qq - 1}}=${val}`),
        ),
      mistake: mk(T("Maxrajdagi $q-1$ ni tushirib qoldirish yoki $q^{n}-1$ o'rniga $q^{n}$ ni olish.", 'Опустить знаменатель $q-1$ или взять $q^{n}$ вместо $q^{n}-1$.', 'Bólimdegi $q-1$ di túsirip qaldırıw yamasa $q^{n}-1$ ornına $q^{n}$ di alıw.', 'Dropping the denominator $q-1$ or using $q^{n}$ instead of $q^{n}-1$.')),
      check: [[s, val]],
    };
  },
  (p) => JSON.stringify(p.form === 0 ? [0, p.b1, p.q, p.n] : p.form === 1 ? [1, Math.abs(p.b1), p.q, p.p] : [2, Math.abs(p.b1), Math.abs(p.q) === 2 || Math.abs(p.q) === 3 ? Math.abs(p.q) : 2, p.n]),
);

// ===========================================================================
// 3. Birga ishlash (matnli masala, 42): ishchilar, quvurlar
// ===========================================================================
interface WorkPair { x: number; y: number; t: number }
const WORK_TOGETHER: WorkPair[] = [];
for (let t = 2; t <= 12; t++) {
  for (let d = 1; d < t; d++) {
    if ((t * t) % d !== 0) continue;
    const x = t + d;
    const y = t + (t * t) / d;
    if (x < y && y <= 60) WORK_TOGETHER.push({ x, y, t });
  }
}
const WORK_DRAIN: WorkPair[] = [];
for (let x = 2; x <= 20; x++) {
  for (let y = x + 1; y <= 60; y++) {
    if ((x * y) % (y - x) === 0 && (x * y) / (y - x) <= 60) WORK_DRAIN.push({ x, y, t: (x * y) / (y - x) });
  }
}

interface WorkP { form: number; i: number; swap: boolean }
export const tMockWork: Template = tpl<WorkP>(
  'mock-work',
  (r) => {
    const form = r.int(0, 2);
    const len = form === 1 ? WORK_DRAIN.length : WORK_TOGETHER.length;
    return { form, i: r.int(0, len - 1), swap: r.chance(0.5) };
  },
  ({ form, i, swap }) => {
    if (form === 0) {
      const { x, y, t } = WORK_TOGETHER[i]!;
      // mustaqil: ish unumdorliklari qo'shiladi (Frac)
      const together = 1 / (1 / x + 1 / y);
      return {
        topic: 42,
        est: 90,
        stem: (l) =>
          ({
            uz: `Birinchi ishchi ishni ${inl(String(x))} kunda, ikkinchisi esa ${inl(String(y))} kunda bajaradi. Ikkalasi birga ishlasa, shu ishni necha kunda bajaradi? (ish unumdorligi o'zgarmas)`,
            ru: `Первый рабочий выполняет работу за ${inl(String(x))} дней, а второй — за ${inl(String(y))} дней. За сколько дней они выполнят эту работу, работая вместе? (производительность постоянна)`,
            kaa: `Birinshi jumısshı jumıstı ${inl(String(x))} kúnde, ekinshisi ${inl(String(y))} kúnde orınlaydı. Ekewi birge islese, usı jumıstı neshe kúnde orınlaydı? (ónimdarlıq ózgermeydi)`, // kaa: tekshirilsin
            en: `The first worker finishes a job in ${inl(String(x))} days and the second in ${inl(String(y))} days. How many days will they need working together? (constant productivity)`,
          })[l],
        correct: String(t),
        wrong: [tx(x + y, 2), x + y, y - x, t + 1, t - 1].map((v) => (typeof v === 'string' ? v : String(v))),
        solution: (l) =>
          S(
            l,
            T("Butun ishni $1$ deb olamiz. Kunlik unumdorliklar $\\dfrac{1}{x}$ va $\\dfrac{1}{y}$; birga ishlaganda ular qo'shiladi.", 'Примем всю работу за $1$. Дневные производительности $\\dfrac{1}{x}$ и $\\dfrac{1}{y}$; при совместной работе они складываются.', 'Pútin jumıstı $1$ dep alamız. Kúnlik ónimdarlıqlar $\\dfrac{1}{x}$ hám $\\dfrac{1}{y}$; birge islegende olar qosıladı.', 'Take the whole job as $1$. The daily rates are $\\dfrac{1}{x}$ and $\\dfrac{1}{y}$; working together they add up.'),
            disp(`\\frac{1}{${x}}+\\frac{1}{${y}}=\\frac{${x + y}}{${x * y}}=\\frac{1}{${t}}\\ \\Rightarrow\\ t=${t}`),
          ),
        mistake: mk(T("Kunlarni o'rtacha qilib olish yoki qo'shish (unumdorliklarni qo'shish kerak).", 'Брать среднее или сумму дней (нужно складывать производительности).', 'Kúnlerdi ortasha qılıp alıw yamasa qosıw (ónimdarlıqlardı qosıw kerek).', 'Averaging or adding the days (the rates must be added).')),
        check: [[together, t]],
      };
    }
    if (form === 1) {
      const { x, y, t } = WORK_DRAIN[i]!;
      const net = 1 / x - 1 / y;
      return {
        topic: 42,
        est: 90,
        stem: (l) =>
          ({
            uz: `Bo'sh hovuz birinchi quvur orqali ${inl(String(x))} soatda to'ladi. To'la hovuz ikkinchi quvur orqali ${inl(String(y))} soatda bo'shaydi. Ikkala quvur bir vaqtda ochilsa, bo'sh hovuz necha soatda to'ladi?`,
            ru: `Пустой бассейн наполняется через первую трубу за ${inl(String(x))} ч. Полный бассейн опорожняется через вторую трубу за ${inl(String(y))} ч. За сколько часов наполнится пустой бассейн, если открыть обе трубы одновременно?`,
            kaa: `Bos basseyn birinshi turba arqalı ${inl(String(x))} saatta toladı. Tolı basseyn ekinshi turba arqalı ${inl(String(y))} saatta bosaydı. Eki turba bir waqıtta ashılsa, bos basseyn neshe saatta toladı?`, // kaa: tekshirilsin
            en: `An empty pool is filled by the first pipe in ${inl(String(x))} hours. A full pool is emptied by the second pipe in ${inl(String(y))} hours. If both pipes are opened at once, how many hours does it take to fill the empty pool?`,
          })[l],
        correct: String(t),
        wrong: [tx(x * y, x + y), y - x, x + y, t + 1, t - 1].map((v) => (typeof v === 'string' ? v : String(v))),
        solution: (l) =>
          S(
            l,
            T("Soatlik unumdorliklar: to'ldirish $\\dfrac{1}{x}$, bo'shatish $\\dfrac{1}{y}$. Ikkala quvur ochilganda ayirma olinadi.", 'Часовые производительности: наполнение $\\dfrac{1}{x}$, опорожнение $\\dfrac{1}{y}$. При двух открытых трубах берём разность.', 'Saatlıq ónimdarlıqlar: toltırıw $\\dfrac{1}{x}$, bosatıw $\\dfrac{1}{y}$. Eki turba ashılǵanda ayırma alınadı.', 'Hourly rates: filling $\\dfrac{1}{x}$, emptying $\\dfrac{1}{y}$. With both pipes open we take the difference.'),
            disp(`\\frac{1}{${x}}-\\frac{1}{${y}}=\\frac{${y - x}}{${x * y}}=\\frac{1}{${t}}\\ \\Rightarrow\\ t=${t}`),
          ),
        mistake: mk(T("Bo'shatuvchi quvur unumdorligini ayirish o'rniga qo'shib yuborish.", 'Складывать производительности вместо вычитания производительности сливной трубы.', 'Bosatıwshı turba ónimdarlıǵın ayırıw ornına qosıp jiberiw.', 'Adding the rates instead of subtracting the draining rate.')),
        check: [[1 / net, t]],
      };
    }
    const { x, y, t } = WORK_TOGETHER[i]!;
    const given = swap ? y : x;
    const ans = swap ? x : y;
    let found = NaN;
    for (let c = 1; c <= 200; c++) if (Math.abs(1 / given + 1 / c - 1 / t) < 1e-12) found = c;
    return {
      topic: 42,
      est: 100,
      stem: (l) =>
        ({
          uz: `Ikki ishchi birga ishlab, ishni ${inl(String(t))} kunda bajaradi. Agar birinchisi yolg'iz o'zi ishni ${inl(String(given))} kunda bajarsa, ikkinchisi yolg'iz o'zi necha kunda bajaradi?`,
          ru: `Двое рабочих, работая вместе, выполняют работу за ${inl(String(t))} дней. Если первый один выполняет её за ${inl(String(given))} дней, то за сколько дней её выполнит один второй?`,
          kaa: `Eki jumısshı birge islep, jumıstı ${inl(String(t))} kúnde orınlaydı. Eger birinshisi jalǵız ózi jumıstı ${inl(String(given))} kúnde orınlasa, ekinshisi jalǵız ózi neshe kúnde orınlaydı?`, // kaa: tekshirilsin
          en: `Two workers together finish a job in ${inl(String(t))} days. If the first worker alone needs ${inl(String(given))} days, how many days does the second worker need alone?`,
        })[l],
      correct: String(ans),
      wrong: [given - t, given + t, tx(t * given, given + t), ans + 1, ans - 1].map((v) => (typeof v === 'string' ? v : String(v))),
      solution: (l) =>
        S(
          l,
          T("Butun ishni $1$ deb olamiz: ikkinchi ishchining unumdorligi birgalikdagi va birinchining unumdorliklari ayirmasiga teng.", 'Примем всю работу за $1$: производительность второго равна разности совместной и производительности первого.', 'Pútin jumıstı $1$ dep alamız: ekinshi jumısshınıń ónimdarlıǵı birgelikdegi hám birinshiniń ónimdarlıqları ayırmasına teń.', 'Take the whole job as $1$: the second worker\'s rate is the joint rate minus the first worker\'s rate.'),
          disp(`\\frac{1}{${t}}-\\frac{1}{${given}}=\\frac{${given - t}}{${t * given}}=\\frac{1}{${ans}}\\ \\Rightarrow\\ ${ans}`),
        ),
      mistake: mk(T("Kunlarni to'g'ridan-to'g'ri ayirish ($" + given + '-' + t + '$) unumdorliklarni ayirish o\'rniga.', 'Вычитать дни напрямую ($' + given + '-' + t + '$) вместо вычитания производительностей.', 'Kúnlerdi tuwrıdan-tuwrı ayırıw ($' + given + '-' + t + '$) ónimdarlıqlardı ayırıw ornına.', 'Subtracting the days directly ($' + given + '-' + t + '$) instead of subtracting the rates.')),
      check: [[found, ans]],
    };
  },
  (p) => JSON.stringify(p.form === 2 ? [2, p.i, p.swap] : [p.form, p.i]),
);

// ===========================================================================
// 4. Harakat masalasi, oddiy (42)
// ===========================================================================
interface MotionP { form: number; t: number; u: number; v: number; h: number; diff: number }
const AVG_PAIRS: Array<[number, number]> = [];
for (let u = 20; u <= 100; u += 5) for (let v = u + 5; v <= 120; v += 5) if ((2 * u * v) % (u + v) === 0 && u !== v) AVG_PAIRS.push([u, v]);
export const tMockMotion: Template = tpl<MotionP>(
  'mock-motion',
  (r) => {
    const form = r.int(0, 2);
    if (form === 2) {
      const [u, v] = r.pick(AVG_PAIRS);
      return { form, t: 0, u, v, h: 0, diff: 0 };
    }
    if (form === 0) {
      const u = r.pick([40, 45, 50, 55, 60, 65, 70, 75, 80]);
      let v = r.pick([40, 45, 50, 55, 60, 65, 70, 75, 80]);
      if (v === u) v = u + 5;
      return { form, t: r.int(2, 7), u, v, h: 0, diff: 0 };
    }
    const u = r.pick([10, 12, 15, 16, 18, 20, 24, 25, 30]);
    return { form, t: 0, u, v: 0, h: r.int(1, 3), diff: r.pick([4, 5, 6, 8, 10, 12]) };
  },
  ({ form, t, u, v, h, diff }) => {
    if (form === 0) {
      const d = (u + v) * t;
      let found = NaN;
      for (let k = 1; k <= 20; k++) if (u * k + v * k === d) found = k;
      return {
        topic: 42,
        est: 75,
        stem: (l) =>
          ({
            uz: `Ikki shahar orasidagi masofa ${inl(String(d))} km. Ikki avtomobil bir vaqtda bir-biriga qarab yo'lga chiqdi: tezliklari ${inl(String(u))} km/soat va ${inl(String(v))} km/soat. Necha soatdan keyin ular uchrashadi?`,
            ru: `Расстояние между двумя городами ${inl(String(d))} км. Два автомобиля одновременно выехали навстречу друг другу со скоростями ${inl(String(u))} км/ч и ${inl(String(v))} км/ч. Через сколько часов они встретятся?`,
            kaa: `Eki qala arasındaǵı aralıq ${inl(String(d))} km. Eki avtomobil bir waqıtta bir-birine qarap jolǵa shıqtı: tezlikleri ${inl(String(u))} km/saat hám ${inl(String(v))} km/saat. Neshe saattan keyin ushırasadı?`, // kaa: tekshirilsin
            en: `Two cities are ${inl(String(d))} km apart. Two cars set off towards each other at the same time with speeds ${inl(String(u))} km/h and ${inl(String(v))} km/h. After how many hours do they meet?`,
          })[l],
        correct: String(t),
        wrong: [tx(d, Math.abs(u - v)), tx(d, u), tx(d, v), t + 1, t - 1].map((x) => (typeof x === 'string' ? x : String(x))),
        solution: (l) =>
          S(
            l,
            T("Bir-biriga qarab yurganda tezliklar qo'shiladi (yaqinlashish tezligi).", 'При встречном движении скорости складываются (скорость сближения).', 'Bir-birine qarap júrgende tezlikler qosıladı (jaqınlasıw tezligi).', 'For movement towards each other the speeds add up (closing speed).'),
            disp(`t=\\frac{${d}}{${u}+${v}}=\\frac{${d}}{${u + v}}=${t}`),
          ),
        mistake: mk(T("Tezliklarni qo'shish o'rniga ayirish yoki masofani bitta tezlikka bo'lish.", 'Вычитать скорости вместо сложения или делить расстояние на одну скорость.', 'Tezliklerdi qosıw ornına ayırıw yamasa aralıqtı bir tezlikke bóliw.', 'Subtracting the speeds instead of adding them, or dividing the distance by one speed.')),
        check: [[found, t]],
      };
    }
    if (form === 1) {
      if ((u * h) % diff !== 0) throw new Error('butun emas');
      const tt = (u * h) / diff;
      if (tt < 2 || tt > 10) throw new Error('vaqt');
      const w = u + diff;
      let found = NaN;
      for (let k = 1; k <= 30; k++) if (w * k === u * (k + h)) found = k;
      return {
        topic: 42,
        est: 90,
        stem: (l) =>
          ({
            uz: `Birinchi velosipedchi ${inl(String(u))} km/soat tezlik bilan yo'lga chiqdi. ${inl(String(h))} soatdan keyin uning ketidan ikkinchi velosipedchi ${inl(String(w))} km/soat tezlik bilan chiqdi. Ikkinchi velosipedchi yo'lga chiqqandan necha soat keyin birinchisiga yetib oladi?`,
            ru: `Первый велосипедист выехал со скоростью ${inl(String(u))} км/ч. Через ${inl(String(h))} ч вслед за ним выехал второй со скоростью ${inl(String(w))} км/ч. Через сколько часов после своего выезда второй догонит первого?`,
            kaa: `Birinshi velosipedshi ${inl(String(u))} km/saat tezlik penen jolǵa shıqtı. ${inl(String(h))} saattan keyin onıń izinen ekinshi velosipedshi ${inl(String(w))} km/saat tezlik penen shıqtı. Ekinshi velosipedshi jolǵa shıqqannan neshe saat keyin birinshisine jetip aladı?`, // kaa: tekshirilsin
            en: `The first cyclist set off at ${inl(String(u))} km/h. After ${inl(String(h))} h a second cyclist followed at ${inl(String(w))} km/h. How many hours after the second cyclist starts will he catch up with the first?`,
          })[l],
        correct: String(tt),
        wrong: [tt + h, tx(u * h, u + w), tx(u * h, w), tt - 1, tt + 1].map((x) => (typeof x === 'string' ? x : String(x))),
        solution: (l) =>
          S(
            l,
            T(`Ikkinchi chiqquncha birinchi $${u}\\cdot ${h}=${u * h}$ km yo'l bosib o'tgan. Quvib yetish tezligi $${w}-${u}=${diff}$ km/soat.`, `К выезду второго первый проехал $${u}\\cdot ${h}=${u * h}$ км. Скорость сближения $${w}-${u}=${diff}$ км/ч.`, `Ekinshi shıqqansha birinshi $${u}\\cdot ${h}=${u * h}$ km jol júrgen. Jetip alıw tezligi $${w}-${u}=${diff}$ km/saat.`, `By the time the second cyclist starts, the first has covered $${u}\\cdot ${h}=${u * h}$ km. The closing speed is $${w}-${u}=${diff}$ km/h.`),
            disp(`t=\\frac{${u * h}}{${diff}}=${tt}`),
          ),
        mistake: mk(T("Quvib yetish vaqtiga birinchining oldindan yurgan vaqtini qo'shib yuborish yoki tezliklarni qo'shish.", 'Прибавить к времени время раннего старта первого или сложить скорости.', 'Jetip alıw waqtına birinshiniń aldınnan júrgen waqtın qosıp jiberiw yamasa tezliklerdi qosıw.', "Adding the first cyclist's head start to the time, or adding the speeds.")),
        check: [[found, tt]],
      };
    }
    const hm = (2 * u * v) / (u + v);
    const L = 2 * u * v;
    const total = L / u + L / v;
    return {
      topic: 42,
      est: 90,
      stem: (l) =>
        ({
          uz: `Avtomobil A shahardan B shaharga ${inl(String(u))} km/soat tezlik bilan, qaytishda esa ${inl(String(v))} km/soat tezlik bilan yurdi. Butun yo'l bo'yicha o'rtacha tezlik necha km/soat?`,
          ru: `Автомобиль ехал из города A в город B со скоростью ${inl(String(u))} км/ч, а обратно — со скоростью ${inl(String(v))} км/ч. Какова средняя скорость на всём пути (км/ч)?`,
          kaa: `Avtomobil A qaladan B qalaǵa ${inl(String(u))} km/saat tezlik penen, qaytıwda ${inl(String(v))} km/saat tezlik penen júrdi. Pútin jol boyınsha ortasha tezlik neshe km/saat?`, // kaa: tekshirilsin
          en: `A car drove from city A to city B at ${inl(String(u))} km/h and back at ${inl(String(v))} km/h. What is the average speed for the whole trip (km/h)?`,
        })[l],
      correct: String(hm),
      wrong: [tx(u + v, 2), u + v, v - u, hm + 2, hm - 2].map((x) => (typeof x === 'string' ? x : String(x))),
      solution: (l) =>
        S(
          l,
          T("O'rtacha tezlik = butun yo'l / butun vaqt. Bir tomonlama masofa $s$ bo'lsin.", 'Средняя скорость = весь путь / всё время. Пусть расстояние в одну сторону равно $s$.', 'Ortasha tezlik = pútin jol / pútin waqıt. Bir tárepleme aralıq $s$ bolsın.', 'Average speed = total distance / total time. Let the one-way distance be $s$.'),
          disp(`v_{\\mathrm{avg}}=\\frac{2s}{\\frac{s}{${u}}+\\frac{s}{${v}}}=\\frac{2\\cdot ${u}\\cdot ${v}}{${u}+${v}}=${hm}`),
        ),
      mistake: mk(T("O'rtacha tezlikni tezliklarning o'rta arifmetigi deb olish.", 'Считать среднюю скорость средним арифметическим скоростей.', 'Ortasha tezlikti tezliklerdiń ortasha arifmetigi dep alıw.', 'Taking the average speed as the arithmetic mean of the speeds.')),
      check: [[(2 * L) / total, hm]],
    };
  },
  (p) => JSON.stringify(p.form === 0 ? [0, p.t, p.u, p.v] : p.form === 1 ? [1, p.u, p.h, p.diff] : [2, p.u, p.v]),
);

// ===========================================================================
// 5. Masshtab (105)
// ===========================================================================
interface ScaleP { form: number; N: number; d: number; D: number }
export const tMockScale: Template = tpl<ScaleP>(
  'mock-scale',
  (r) => ({ form: r.int(0, 2), N: r.pick([50000, 100000, 200000, 250000, 500000, 1000000]), d: r.int(2, 18), D: r.int(4, 120) }),
  ({ form, N, d, D }) => {
    if (form === 0) {
      // xaritada d sm -> real km
      const realCm = d * N;
      if (realCm % 100000 !== 0) throw new Error('butun emas');
      const km = realCm / 100000;
      return {
        topic: 105,
        est: 60,
        stem: (l) =>
          ({
            uz: `Xaritaning masshtabi ${inl(`1:${texBig(N)}`)}. Xaritada ikki shahar orasidagi masofa ${inl(String(d))} sm. Haqiqiy masofa necha km?`,
            ru: `Масштаб карты ${inl(`1:${texBig(N)}`)}. Расстояние между двумя городами на карте ${inl(String(d))} см. Каково реальное расстояние в километрах?`,
            kaa: `Kartanıń masshtabı ${inl(`1:${texBig(N)}`)}. Kartada eki qala arasındaǵı aralıq ${inl(String(d))} sm. Haqıyqıy aralıq neshe km?`, // kaa: tekshirilsin
            en: `The scale of a map is ${inl(`1:${texBig(N)}`)}. Two cities are ${inl(String(d))} cm apart on the map. What is the real distance in km?`,
          })[l],
        correct: String(km),
        wrong: [km * 10, km / 10, km * 100, km / 100].map((x) => tx(Math.round(x * 100), 100)),
        solution: (l) =>
          S(
            l,
            T("Masshtab $1:N$ degani xaritadagi $1$ sm haqiqatda $N$ sm ekanini bildiradi. $1$ km $=100\\,000$ sm.", 'Масштаб $1:N$ означает, что $1$ см на карте соответствует $N$ см на местности. $1$ км $=100\\,000$ см.', 'Masshtab $1:N$ degeni kartadaǵı $1$ sm haqıyqatında $N$ sm ekenin bildiredi. $1$ km $=100\\,000$ sm.', 'A scale $1:N$ means $1$ cm on the map is $N$ cm in reality. $1$ km $=100\\,000$ cm.'),
            disp(`${d}\\cdot ${texBig(N)}=${texBig(realCm)}\\ \\mathrm{cm}=${km}\\ \\mathrm{km}`),
          ),
        mistake: mk(T("Santimetrni kilometrga o'tkazishda nollar sonini adashtirish.", 'Ошибиться в количестве нулей при переводе сантиметров в километры.', 'Santimetrdi kilometrge ótkeriwde nollar sanın shatastırıw.', 'Miscounting the zeros when converting centimetres to kilometres.')),
        check: [[(d * N) / 1000 / 100, km]],
      };
    }
    if (form === 1) {
      const cm = (D * 100000) / N;
      if (!Number.isInteger(cm) || cm < 2 || cm > 40) throw new Error('butun emas');
      return {
        topic: 105,
        est: 60,
        stem: (l) =>
          ({
            uz: `Xaritaning masshtabi ${inl(`1:${texBig(N)}`)}. Ikki shahar orasidagi haqiqiy masofa ${inl(String(D))} km. Xaritada bu masofa necha sm bo'ladi?`,
            ru: `Масштаб карты ${inl(`1:${texBig(N)}`)}. Реальное расстояние между двумя городами ${inl(String(D))} км. Сколько сантиметров составит это расстояние на карте?`,
            kaa: `Kartanıń masshtabı ${inl(`1:${texBig(N)}`)}. Eki qala arasındaǵı haqıyqıy aralıq ${inl(String(D))} km. Kartada bul aralıq neshe sm boladı?`, // kaa: tekshirilsin
            en: `The scale of a map is ${inl(`1:${texBig(N)}`)}. The real distance between two cities is ${inl(String(D))} km. How many centimetres is this on the map?`,
          })[l],
        correct: String(cm),
        wrong: [cm * 10, cm / 10, cm * 100, cm / 100].map((x) => tx(Math.round(x * 1000), 1000)),
        solution: (l) =>
          S(
            l,
            T("Haqiqiy masofani santimetrga o'tkazamiz ($1$ km $=100\\,000$ sm) va masshtab sonigacha bo'lamiz.", 'Переводим реальное расстояние в сантиметры ($1$ км $=100\\,000$ см) и делим на знаменатель масштаба.', 'Haqıyqıy aralıqtı santimetrge ótkeremiz ($1$ km $=100\\,000$ sm) hám masshtab sanına bólemiz.', 'Convert the real distance to centimetres ($1$ km $=100\\,000$ cm) and divide by the scale number.'),
            disp(`\\frac{${D}\\cdot 100\\,000}{${texBig(N)}}=${cm}`),
          ),
        mistake: mk(T("Masshtab bo'yicha ko'paytirish va bo'lishni adashtirish.", 'Перепутать умножение и деление при переходе по масштабу.', 'Masshtab boyınsha kóbeytiw hám bóliwdi shatastırıw.', 'Mixing up multiplication and division when applying the scale.')),
        check: [[(D * 1e5) / N, cm]],
      };
    }
    const cm = d;
    const real = (cm * N) / 100000;
    if (!Number.isInteger(real) || real < 2) throw new Error('butun emas');
    return {
      topic: 105,
      est: 70,
      stem: (l) =>
        ({
          uz: `Xaritada ${inl(String(cm))} sm uzunlikdagi kesma haqiqatda ${inl(String(real))} km masofani bildiradi. Xaritaning masshtabini toping.`,
          ru: `Отрезок длиной ${inl(String(cm))} см на карте соответствует реальному расстоянию ${inl(String(real))} км. Найдите масштаб карты.`,
          kaa: `Kartada ${inl(String(cm))} sm uzınlıqtaǵı kesindi haqıyqatında ${inl(String(real))} km aralıqtı bildiredi. Kartanıń masshtabın tabıń.`, // kaa: tekshirilsin
          en: `A segment of ${inl(String(cm))} cm on a map represents a real distance of ${inl(String(real))} km. Find the scale of the map.`,
        })[l],
      correct: `1:${texBig(N)}`,
      wrong: [`1:${texBig(N * 10)}`, `1:${texBig(N / 10)}`, `1:${texBig(N * 100)}`, `1:${texBig((real * 1000) / cm)}`],
      solution: (l) =>
        S(
          l,
          T("Haqiqiy masofani santimetrga o'tkazamiz va xaritadagi uzunlikka bo'lamiz.", 'Переводим реальное расстояние в сантиметры и делим на длину на карте.', 'Haqıyqıy aralıqtı santimetrge ótkeremiz hám kartadaǵı uzınlıqqa bólemiz.', 'Convert the real distance to centimetres and divide by the length on the map.'),
          disp(`\\frac{${real}\\cdot 100\\,000}{${cm}}=${texBig(N)}\\ \\Rightarrow\\ 1:${texBig(N)}`),
        ),
      mistake: mk(T("Kilometrni santimetrga o'tkazishda nollarni adashtirish (10 yoki 100 marta xato).", 'Ошибиться в нулях при переводе километров в сантиметры (в 10 или 100 раз).', 'Kilometrdi santimetrge ótkeriwde nollardı shatastırıw (10 yamasa 100 ese qate).', 'Miscounting the zeros when converting kilometres to centimetres (off by 10 or 100 times).')),
      check: [[(real * 1e5) / cm, N]],
    };
  },
  (p) => JSON.stringify(p.form === 0 ? [0, p.N, p.d] : p.form === 1 ? [1, p.N, p.D] : [2, p.N, p.d]),
);

// ===========================================================================
// 6. Hosilaning fizik ma'nosi (110): tezlik va tezlanish
// ===========================================================================
interface PhysP { form: number; a: number; b: number; c: number; t0: number; t1: number }
const sAt = (cs: readonly number[], t: number): number => cs.reduce((acc, k) => acc * t + k, 0);
/** 5 nuqtali formula: darajasi <= 4 bo'lgan ko'phad uchun aniq (butun arifmetika) */
const d1 = (cs: readonly number[], t: number): number => (-sAt(cs, t + 2) + 8 * sAt(cs, t + 1) - 8 * sAt(cs, t - 1) + sAt(cs, t - 2)) / 12;
const d2 = (cs: readonly number[], t: number): number => (-sAt(cs, t + 2) + 16 * sAt(cs, t + 1) - 30 * sAt(cs, t) + 16 * sAt(cs, t - 1) - sAt(cs, t - 2)) / 12;
export const tMockPhys: Template = tpl<PhysP>(
  'mock-phys',
  (r) => ({ form: r.int(0, 2), a: r.int(1, 4), b: r.int(-6, 6), c: r.int(-8, 10), t0: r.int(1, 4), t1: r.int(2, 8) }),
  ({ form, a, b, c, t0, t1 }) => {
    if (form === 2) {
      // s = a t^2 + b t + c0; tezlik v1 bo'ladigan vaqt
      const cs = [a, b, c];
      const v1 = 2 * a * t1 + b;
      let found = NaN;
      for (let t = 0; t <= 60; t++) if (d1(cs, t) === v1) found = t;
      const poly = polyTex(cs, 't');
      return {
        topic: 110,
        est: 90,
        stem: (l) =>
          ({
            uz: `Moddiy nuqta ${inl(`s(t)=${poly}`)} qonun bo'yicha to'g'ri chiziqli harakatlanadi (${inl('s')} — metr, ${inl('t')} — sekund). Qaysi ${inl('t')} (s) paytda uning tezligi ${inl(String(v1))} m/s ga teng bo'ladi?`,
            ru: `Материальная точка движется прямолинейно по закону ${inl(`s(t)=${poly}`)} (${inl('s')} — в метрах, ${inl('t')} — в секундах). В какой момент ${inl('t')} (с) её скорость равна ${inl(String(v1))} м/с?`,
            kaa: `Materiallıq noqat ${inl(`s(t)=${poly}`)} nızamı boyınsha tuwrı sızıqlı háreketlenedi (${inl('s')} — metr, ${inl('t')} — sekund). Qaysı ${inl('t')} (s) waqıtta onıń tezligi ${inl(String(v1))} m/s qa teń boladı?`, // kaa: tekshirilsin
            en: `A particle moves in a straight line by the law ${inl(`s(t)=${poly}`)} (${inl('s')} in metres, ${inl('t')} in seconds). At what time ${inl('t')} (s) is its velocity equal to ${inl(String(v1))} m/s?`,
          })[l],
        correct: String(t1),
        wrong: [tx(v1 - b, a), tx(v1, 2 * a), tx(v1 + b, 2 * a), t1 + 1, t1 - 1].map((x) => (typeof x === 'string' ? x : String(x))),
        solution: (l) =>
          S(
            l,
            T("Tezlik — yo'lning vaqt bo'yicha hosilasi: $v(t)=s'(t)$.", 'Скорость — производная пути по времени: $v(t)=s\'(t)$.', 'Tezlik — joldıń waqıt boyınsha tuwındısı: $v(t)=s\'(t)$.', 'Velocity is the derivative of position: $v(t)=s\'(t)$.'),
            disp(`v(t)=${polyTex([2 * a, b], 't')}=${v1}\\ \\Rightarrow\\ t=\\frac{${v1 - b}}{${2 * a}}=${t1}`),
          ),
        mistake: mk(T("Hosilani noto'g'ri olish ($2at$ o'rniga $at$) yoki $s(t)$ ni tezlikka tenglashtirish.", 'Ошибиться в производной ($at$ вместо $2at$) или приравнять к скорости саму функцию $s(t)$.', 'Tuwındını qate alıw ($2at$ ornına $at$) yamasa $s(t)$ di tezlikke teńlestiriw.', 'Differentiating incorrectly ($at$ instead of $2at$) or setting $s(t)$ itself equal to the velocity.')),
        check: [[found, t1]],
      };
    }
    const cs = [a, b, c, 0];
    const poly = polyTex(cs, 't');
    if (form === 0) {
      const v = 3 * a * t0 * t0 + 2 * b * t0 + c;
      return {
        topic: 110,
        est: 80,
        stem: (l) =>
          ({
            uz: `Moddiy nuqta ${inl(`s(t)=${poly}`)} qonun bo'yicha to'g'ri chiziqli harakatlanadi (${inl('s')} — metr, ${inl('t')} — sekund). ${inl(`t=${t0}`)} s paytdagi tezligini (m/s) toping.`,
            ru: `Материальная точка движется прямолинейно по закону ${inl(`s(t)=${poly}`)} (${inl('s')} — в метрах, ${inl('t')} — в секундах). Найдите её скорость (м/с) в момент ${inl(`t=${t0}`)} с.`,
            kaa: `Materiallıq noqat ${inl(`s(t)=${poly}`)} nızamı boyınsha tuwrı sızıqlı háreketlenedi (${inl('s')} — metr, ${inl('t')} — sekund). ${inl(`t=${t0}`)} s waqıttaǵı tezligin (m/s) tabıń.`, // kaa: tekshirilsin
            en: `A particle moves in a straight line by the law ${inl(`s(t)=${poly}`)} (${inl('s')} in metres, ${inl('t')} in seconds). Find its velocity (m/s) at ${inl(`t=${t0}`)} s.`,
          })[l],
        correct: String(v),
        wrong: [sAt(cs, t0), 6 * a * t0 + 2 * b, 3 * a * t0 * t0 + 2 * b * t0, a * t0 * t0 + b * t0 + c, v + c].map(String),
        solution: (l) =>
          S(
            l,
            T("Tezlik — yo'lning hosilasi: $v(t)=s'(t)$.", 'Скорость — производная пути: $v(t)=s\'(t)$.', 'Tezlik — joldıń tuwındısı: $v(t)=s\'(t)$.', 'Velocity is the derivative of position: $v(t)=s\'(t)$.'),
            disp(`v(t)=${polyTex([3 * a, 2 * b, c], 't')},\\qquad v(${t0})=${v}`),
          ),
        mistake: mk(T("Tezlik o'rniga $s(t_0)$ (bosib o'tilgan yo'l) yoki tezlanishni hisoblash.", 'Вычислить $s(t_0)$ (путь) или ускорение вместо скорости.', 'Tezlik ornına $s(t_0)$ (ótilgen jol) yamasa tezleniwdi esaplaw.', 'Computing $s(t_0)$ (position) or the acceleration instead of the velocity.')),
        check: [[d1(cs, t0), v]],
      };
    }
    const acc = 6 * a * t0 + 2 * b;
    return {
      topic: 110,
      est: 90,
      stem: (l) =>
        ({
          uz: `Moddiy nuqta ${inl(`s(t)=${poly}`)} qonun bo'yicha to'g'ri chiziqli harakatlanadi (${inl('s')} — metr, ${inl('t')} — sekund). ${inl(`t=${t0}`)} s paytdagi tezlanishini (m/s$^2$) toping.`,
          ru: `Материальная точка движется прямолинейно по закону ${inl(`s(t)=${poly}`)} (${inl('s')} — в метрах, ${inl('t')} — в секундах). Найдите её ускорение (м/с$^2$) в момент ${inl(`t=${t0}`)} с.`,
          kaa: `Materiallıq noqat ${inl(`s(t)=${poly}`)} nızamı boyınsha tuwrı sızıqlı háreketlenedi (${inl('s')} — metr, ${inl('t')} — sekund). ${inl(`t=${t0}`)} s waqıttaǵı tezleniwin (m/s$^2$) tabıń.`, // kaa: tekshirilsin
          en: `A particle moves in a straight line by the law ${inl(`s(t)=${poly}`)} (${inl('s')} in metres, ${inl('t')} in seconds). Find its acceleration (m/s$^2$) at ${inl(`t=${t0}`)} s.`,
        })[l],
      correct: String(acc),
      wrong: [3 * a * t0 * t0 + 2 * b * t0 + c, 6 * a * t0, 3 * a * t0 * t0 + 2 * b * t0, sAt(cs, t0), acc + 2].map(String),
      solution: (l) =>
        S(
          l,
          T("Tezlanish — tezlikning hosilasi, ya'ni yo'lning ikkinchi hosilasi: $a(t)=v'(t)=s''(t)$.", 'Ускорение — производная скорости, то есть вторая производная пути: $a(t)=v\'(t)=s\'\'(t)$.', 'Tezleniw — tezliktiń tuwındısı, yaǵnıy joldıń ekinshi tuwındısı: $a(t)=v\'(t)=s\'\'(t)$.', 'Acceleration is the derivative of velocity, i.e. the second derivative of position: $a(t)=v\'(t)=s\'\'(t)$.'),
          disp(`v(t)=${polyTex([3 * a, 2 * b, c], 't')},\\quad a(t)=${polyTex([6 * a, 2 * b], 't')},\\quad a(${t0})=${acc}`),
        ),
      mistake: mk(T("Tezlanish o'rniga tezlikni hisoblash yoki ikkinchi hosilada $2b$ hadini tushirib qoldirish.", 'Вычислить скорость вместо ускорения или потерять слагаемое $2b$ во второй производной.', 'Tezleniw ornına tezlikti esaplaw yamasa ekinshi tuwındıda $2b$ aǵzasın túsirip qaldırıw.', 'Computing the velocity instead of the acceleration, or dropping the term $2b$ in the second derivative.')),
      check: [[d2(cs, t0), acc]],
    };
  },
  (p) => JSON.stringify(p.form === 2 ? [2, p.a, p.b, p.t1] : [p.form, p.a, p.b, p.c, p.t0]),
);

/** Barcha yangi shablonlar (id bo'yicha) */
export const MOCK_TEMPLATES: Readonly<Record<string, Template>> = {
  'mock-ap': tMockAp,
  'mock-gp': tMockGp,
  'mock-work': tMockWork,
  'mock-motion': tMockMotion,
  'mock-scale': tMockScale,
  'mock-phys': tMockPhys,
};
