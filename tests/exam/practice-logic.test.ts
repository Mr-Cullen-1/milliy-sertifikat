import { describe, expect, it } from 'vitest';
import { feedbackImmediately, FREE_PRACTICE_SOLUTIONS, isPracticeDifficulty, isPracticeMode } from '@/lib/practice/config';
import { gradePractice } from '@/lib/practice/grade';
import { isRevealed, practiceStateSchema } from '@/lib/practice/state';
import { parseItems, solutionOpen } from '@/lib/practice/view';

describe('gradePractice (imtihon bilan bir xil qoidalar)', () => {
  it("Y-1: harf kalit bilan solishtiriladi (katta-kichik harf farqsiz)", () => {
    expect(gradePractice('y1', 'L2', 'B', { correct: 'B' })).toEqual({ correct: true, parts: null });
    expect(gradePractice('y1', 'L2', 'b', { correct: 'B' }).correct).toBe(true);
    expect(gradePractice('y1', 'L2', 'A', { correct: 'B' }).correct).toBe(false);
    expect(gradePractice('y1', 'L2', undefined, { correct: 'B' }).correct).toBe(false);
  });

  it("Y-2: hamma band to'g'ri bo'lsa to'g'ri; bittasi xato bo'lsa xato", () => {
    const key = { pairs: { '1': 'A', '2': 'B', '3': 'C' } };
    expect(gradePractice('y2', 'L3', { '1': 'A', '2': 'B', '3': 'C' }, key).correct).toBe(true);
    expect(gradePractice('y2', 'L3', { '1': 'A', '2': 'B', '3': 'D' }, key).correct).toBe(false);
    expect(gradePractice('y2', 'L3', { '1': 'A', '2': 'B' }, key).correct).toBe(false);
  });

  it("O: son jihatidan teng javoblar qabul qilinadi; ikki bandda a/b alohida belgilanadi", () => {
    const key = { a: ['3/4', '0.75'], b: ['-2'] };
    expect(gradePractice('o', 'L3', { a: '0,75', b: '−2' }, key)).toEqual({ correct: true, parts: { a: true, b: true } });
    expect(gradePractice('o', 'L3', { a: '3/4', b: '2' }, key)).toEqual({ correct: false, parts: { a: true, b: false } });
    expect(gradePractice('o', 'L3', { a: '1', b: '2' }, key).correct).toBe(false);
  });

  it("buzilgan kalit xato tashlaydi (jim to'g'ri hisoblanmaydi)", () => {
    expect(() => gradePractice('y1', 'L1', 'A', { correct: 'Z' })).toThrow();
  });

  it("shakli noto'g'ri javob xato hisoblanadi", () => {
    expect(gradePractice('y1', 'L1', { a: '1' }, { correct: 'A' }).correct).toBe(false);
  });
});

describe('mashq sozlamalari', () => {
  it("javob darrov tekshiriladimi: faqat exam rejimda yo'q", () => {
    expect(feedbackImmediately('practice')).toBe(true);
    expect(feedbackImmediately('timed')).toBe(true);
    expect(feedbackImmediately('exam')).toBe(false);
  });

  it("rejim va qiyinlik qiymatlari tekshiriladi", () => {
    expect(isPracticeMode('timed')).toBe(true);
    expect(isPracticeMode('boshqa')).toBe(false);
    expect(isPracticeDifficulty('all')).toBe(true);
    expect(isPracticeDifficulty('L3')).toBe(true);
    expect(isPracticeDifficulty('L4')).toBe(false);
  });

  it("yechim: Pro yoki dastlabki 5 ta savol uchun ochiq", () => {
    expect(FREE_PRACTICE_SOLUTIONS).toBe(5);
    expect(solutionOpen(1, false)).toBe(true);
    expect(solutionOpen(5, false)).toBe(true);
    expect(solutionOpen(6, false)).toBe(false);
    expect(solutionOpen(6, true)).toBe(true);
  });
});

describe('holat sxemasi', () => {
  const base = {
    session: { id: 's', block_id: 6, difficulty: null, mode: 'exam', question_count: 2, started_at: 't', deadline_at: null, submitted_at: null, status: 'in_progress', correct_count: null, server_now: 't' },
    items: [
      { position: 1, question_id: 'q1', type: 'y1', difficulty: 'L2', block_id: 6, topic_id: 79, stem_md: 'x', payload: { options: { A: '1', B: '2', C: '3', D: '4' } } },
      { position: 2, question_id: 'q2', type: 'y1', difficulty: 'L2', block_id: 6, topic_id: 79, stem_md: 'y', payload: { options: { A: '1', B: '2' } } }, // buzilgan
    ],
    answers: [{ question_id: 'q1', value: 'A' }, { question_id: 'q2', value: 'B', is_correct: true, correct_answer: { correct: 'B' } }],
  };

  it("sxemadan o'tadi; tekshirilgan javob is_correct bilan aniqlanadi", () => {
    const s = practiceStateSchema.parse(base);
    expect(isRevealed(s.answers[0])).toBe(false);
    expect(isRevealed(s.answers[1])).toBe(true);
    expect(isRevealed(undefined)).toBe(false);
  });

  it("buzilgan payload'li savol butun mashqni yiqitmaydi (o'tkazib yuboriladi)", () => {
    const s = practiceStateSchema.parse(base);
    const items = parseItems(s.items);
    expect(items.map((i) => i.question_id)).toEqual(['q1']);
  });
});
