import { describe, expect, it } from 'vitest';
import { describeAnswer, describeKey, isAnswered, navState, sanitizeOpenInput } from '../../lib/exam/answer-state';
import { parseItems, type StateItem } from '../../lib/exam/attempt-state';
import { blockBreakdown } from '../../lib/exam/breakdown';
import { isSafeSvg, parsePayload } from '../../lib/exam/payload';
import { clockOffset, formatRemaining, remainingMs, timerPhase, WARNING_MS } from '../../lib/exam/timer';

describe('timer', () => {
  it('ofset server va mijoz soati farqini hisobga oladi', () => {
    // mijoz soati serverdan 30 s orqada
    const offset = clockOffset('2026-01-01T10:00:30.000Z', Date.parse('2026-01-01T10:00:00.000Z'));
    expect(offset).toBe(30_000);
    const clientNow = Date.parse('2026-01-01T10:00:10.000Z');
    expect(remainingMs('2026-01-01T10:01:00.000Z', offset, clientNow)).toBe(20_000);
  });

  it('manfiy qolgan vaqt 0 ga tushadi', () => {
    expect(remainingMs('2026-01-01T10:00:00.000Z', 0, Date.parse('2026-01-01T10:05:00.000Z'))).toBe(0);
  });

  it.each([
    [150 * 60 * 1000, '2:30:00'],
    [59 * 60 * 1000 + 59_000, '59:59'],
    [5 * 60 * 1000, '05:00'],
    [1, '00:01'],
    [0, '00:00'],
  ])('formatRemaining(%d) = %s', (ms, text) => {
    expect(formatRemaining(ms)).toBe(text);
  });

  it('faza: oddiy, 5 daqiqada ogohlantirish, tugagan', () => {
    expect(timerPhase(WARNING_MS + 1)).toBe('normal');
    expect(timerPhase(WARNING_MS)).toBe('warning');
    expect(timerPhase(1)).toBe('warning');
    expect(timerPhase(0)).toBe('over');
  });
});

describe('isAnswered', () => {
  it('y1', () => {
    expect(isAnswered('y1', 'B')).toBe(true);
    expect(isAnswered('y1', '')).toBe(false);
    expect(isAnswered('y1', null)).toBe(false);
    expect(isAnswered('y1', undefined)).toBe(false);
  });
  it('y2: kamida bitta band tanlangan', () => {
    expect(isAnswered('y2', { '1': 'A' })).toBe(true);
    expect(isAnswered('y2', {})).toBe(false);
  });
  it('o: kamida bitta band to\'ldirilgan, bo\'sh joy hisoblanmaydi', () => {
    expect(isAnswered('o', { a: '3/4' })).toBe(true);
    expect(isAnswered('o', { b: '-2' })).toBe(true);
    expect(isAnswered('o', { a: '  ', b: '' })).toBe(false);
  });
});

describe('navState', () => {
  it('ustuvorlik: joriy > belgilangan > javob berilgan > bo\'sh', () => {
    expect(navState({ current: true, flagged: true, answered: true })).toBe('current');
    expect(navState({ current: false, flagged: true, answered: true })).toBe('flagged');
    expect(navState({ current: false, flagged: false, answered: true })).toBe('answered');
    expect(navState({ current: false, flagged: false, answered: false })).toBe('empty');
  });
});

describe('sanitizeOpenInput', () => {
  it('faqat son, kasr, minus, vergul va nuqtani qoldiradi', () => {
    expect(sanitizeOpenInput('3/4')).toBe('3/4');
    expect(sanitizeOpenInput('-0,75')).toBe('-0,75');
    expect(sanitizeOpenInput('−2')).toBe('−2');
    expect(sanitizeOpenInput('x=12abc')).toBe('12');
    // belgilar (<, >, harflar) olib tashlanadi; kasr uchun "/" ruxsat, shuning uchun qoladi (zararsiz)
    expect(sanitizeOpenInput('<script>1</script>')).toBe('1/');
    expect(sanitizeOpenInput('9'.repeat(100))).toHaveLength(64);
  });
});

describe('parsePayload', () => {
  it('y1: 4 ta variant shart', () => {
    expect(() => parsePayload('y1', { options: { A: '1', B: '2', C: '3' } })).toThrow();
    expect(parsePayload('y1', { options: { A: '1', B: '2', C: '3', D: '4' } }).type).toBe('y1');
  });
  it('y2: variantlar va bandlar, band id lari noyob', () => {
    const ok = { options: { A: 'x', B: 'y', C: 'z' }, items: [{ id: '1', text_md: 'p' }, { id: '2', text_md: 'q' }] };
    expect(parsePayload('y2', ok).type).toBe('y2');
    expect(() => parsePayload('y2', { ...ok, items: [{ id: '1', text_md: 'p' }, { id: '1', text_md: 'q' }] })).toThrow();
    expect(() => parsePayload('y2', { ...ok, options: { A: 'x' } })).toThrow();
    expect(() => parsePayload('y2', { ...ok, options: { A: 'x', G: 'y' } })).toThrow();
  });
  it('o: a yoki b band kerak', () => {
    expect(parsePayload('o', { parts: { a: { prompt_md: '$x$ ni toping' } } }).type).toBe('o');
    expect(parsePayload('o', { parts: { b: { prompt_md: 'q', hint: 'yuzdan birgacha' } } }).type).toBe('o');
    expect(() => parsePayload('o', { parts: {} })).toThrow();
  });
});

describe('parseItems', () => {
  const item = (position: number, over: Partial<StateItem> = {}): StateItem => ({
    position,
    section: 'y1',
    question_id: `q${position}`,
    type: 'y1',
    block_id: 1,
    topic_id: 1,
    difficulty: 'L1',
    stem_md: 'Savol',
    payload: { options: { A: '1', B: '2', C: '3', D: '4' } },
    ...over,
  });

  it('pozitsiya bo\'yicha tartiblaydi', () => {
    expect(parseItems([item(3), item(1), item(2)]).map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it('buzuq payload savol id bilan xato beradi', () => {
    expect(() => parseItems([item(7, { payload: { options: {} } })])).toThrow(/q7.*7-pozitsiya/);
  });
});

describe('blockBreakdown', () => {
  it('bloklar bo\'yicha savollar, to\'g\'ri javoblar va ballni yig\'adi', () => {
    const rows = blockBreakdown(
      [
        { questionId: 'a', blockId: 2 },
        { questionId: 'b', blockId: 1 },
        { questionId: 'c', blockId: 2 },
        { questionId: 'd', blockId: 2 },
      ],
      [
        { questionId: 'a', isCorrect: true, score: 1.3, maxScore: 1.3 },
        { questionId: 'b', isCorrect: false, score: 0, maxScore: 2.2 },
        { questionId: 'c', isCorrect: true, score: 2.2, maxScore: 2.2 },
        // 'd' ga javob qatori yo'q
      ],
    );
    expect(rows).toEqual([
      { blockId: 1, total: 1, correct: 0, score: 0, maxScore: 2.2 },
      { blockId: 2, total: 3, correct: 2, score: 3.5, maxScore: 3.5 },
    ]);
  });
});

describe("describeAnswer", () => {
  it("y1, y2 va o javoblarini qisqa matnga aylantiradi", () => {
    expect(describeAnswer("y1", "b")).toBe("B");
    expect(describeAnswer("y2", { x: "a", y: "c" }, ["x", "y", "z"])).toBe("1 → A, 2 → C, 3 → —");
    expect(describeAnswer("o", { a: " 3/4 ", b: "" })).toBe("a) 3/4   b) —");
    expect(describeAnswer("o", { a: "0,5" })).toBe("a) 0,5");
  });

  it("javobsiz holat", () => {
    expect(describeAnswer("y1", undefined)).toBe("Javob berilmagan");
    expect(describeAnswer("o", { a: "  " })).toBe("Javob berilmagan");
    expect(describeAnswer("y2", {}, ["x"])).toBe("Javob berilmagan");
  });
});

describe("describeKey va noAnswer matni", () => {
  it("kalitni ko'rsatish matniga aylantiradi", () => {
    expect(describeKey("y1", { correct: "C" })).toBe("C");
    expect(describeKey("y2", { pairs: { x: "A", y: "C" } }, ["x", "y"])).toBe("1 → A, 2 → C");
    expect(describeKey("o", { a: ["3/4", "0.75"], b: ["-2"] })).toBe("a) 3/4   b) -2");
    expect(describeKey("o", { b: ["5"] })).toBe("b) 5");
    expect(describeKey("y1", null)).toBe("");
  });

  it("javobsiz holat matni tashqaridan beriladi (til)", () => {
    expect(describeAnswer("y1", undefined, [], "No answer")).toBe("No answer");
  });
});

describe('isSafeSvg', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/><text x="1" y="2">A</text></svg>';

  it("xmlns li oddiy SVG ni qabul qiladi", () => {
    expect(isSafeSvg(ok)).toBe(true);
    expect(isSafeSvg(`  ${ok}\n`)).toBe(true);
  });

  it.each([
    ['skript', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ['hodisa atributi', '<svg xmlns="http://www.w3.org/2000/svg"><circle onload="x()" r="1"/></svg>'],
    ['tashqi havola', '<svg xmlns="http://www.w3.org/2000/svg"><a href="https://x.com"><circle r="1"/></a></svg>'],
    ['boshqa http', '<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(http://x.com/a)" r="1"/></svg>'],
    ['javascript', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1" fill="javascript:1"/></svg>'],
    ['image', '<svg xmlns="http://www.w3.org/2000/svg"><image width="1"/></svg>'],
    ['foreignObject', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>'],
    ['style teg', '<svg xmlns="http://www.w3.org/2000/svg"><style>a{}</style></svg>'],
    ['data uri', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1" fill="data:x"/></svg>'],
    ['svg emas', '<div>x</div>'],
    ['entity bilan yashirilgan havola', '<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(http&#58;//x.com/a)" r="1"/></svg>'],
    ['oltilik entity bilan yashirilgan', '<svg xmlns="http://www.w3.org/2000/svg"><circle fill="url(&#x68;ttp://x.com/a)" r="1"/></svg>'],
    ['nomli entity', '<svg xmlns="http://www.w3.org/2000/svg"><text>&nbsp;</text></svg>'],
    ['yopilmagan', '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/>'],
  ])('%s rad etiladi', (_name, svg) => {
    expect(isSafeSvg(svg)).toBe(false);
  });
});
