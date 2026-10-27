import { describe, expect, it, vi } from 'vitest';
import { mathFormatV1 } from '../../config/exam-format.math-v1';
import {
  computeAttemptResult,
  finalizeAttempt,
  type AttemptResult,
  type ExamStore,
  type ScoringData,
} from '../../lib/exam/finalize';

const scoring = mathFormatV1.scoring;

const data = (answers: { y1?: unknown; o?: unknown } = {}, key: unknown = { correct: 'A' }): ScoringData => ({
  scoring,
  items: [
    { item: { questionId: 'q1', type: 'y1', difficulty: 'L3' }, key, answer: answers.y1 },
    { item: { questionId: 'q2', type: 'o', difficulty: 'L3' }, key: { a: ['1/2'], b: ['3'] }, answer: answers.o },
  ],
});

describe('computeAttemptResult', () => {
  it('ball, daraja va savol bo\'yicha natijalarni qaytaradi', () => {
    const r = computeAttemptResult(data({ y1: 'a', o: { a: '0,5', b: '3' } }));
    expect(r.raw).toBe(5.4);
    expect(r.maxRaw).toBe(5.4);
    expect(r.scaled).toBe(75);
    expect(r.level).toBe('A+');
    expect(r.scoringVersion).toBe('phaseA-linear-v1');
    expect(r.results).toEqual([
      { question_id: 'q1', is_correct: true, score: 2.2, max_score: 2.2, parts: null },
      { question_id: 'q2', is_correct: true, score: 3.2, max_score: 3.2, parts: { a: true, b: true } },
    ]);
  });

  it('javobsiz va yaroqsiz javob 0 ball, maksimal ball saqlanadi', () => {
    const r = computeAttemptResult(data({ y1: { x: 1 } }));
    expect(r.raw).toBe(0);
    expect(r.maxRaw).toBe(5.4);
    expect(r.level).toBeNull();
    expect(r.results.every((x) => !x.is_correct && x.score === 0)).toBe(true);
  });

  it('kaliti yaroqsiz savol bo\'lsa jim ketmay xato beradi', () => {
    expect(() => computeAttemptResult(data({}, { correct: 'Z' }))).toThrow(/q1.*kaliti noto'g'ri/);
    expect(() => computeAttemptResult(data({}, null))).toThrow(/q1/);
  });
});

function fakeStore(overrides: Partial<ExamStore> = {}) {
  const store = {
    closeAttempt: vi.fn<ExamStore['closeAttempt']>().mockResolvedValue({ status: 'submitted', scored: false }),
    loadScoringData: vi.fn<ExamStore['loadScoringData']>().mockResolvedValue(data({ y1: 'A' })),
    storeScore: vi.fn<ExamStore['storeScore']>().mockResolvedValue(true),
    ...overrides,
  };
  return store;
}

describe('finalizeAttempt', () => {
  it('muddat o\'tmagan bo\'lsa hech narsa yuklanmaydi va yozilmaydi', async () => {
    const store = fakeStore({ closeAttempt: vi.fn().mockResolvedValue({ status: 'in_progress', scored: false }) });
    await expect(finalizeAttempt(store, 'a1', { onlyIfExpired: true })).resolves.toEqual({ status: 'in_progress' });
    expect(store.closeAttempt).toHaveBeenCalledWith('a1', true);
    expect(store.loadScoringData).not.toHaveBeenCalled();
    expect(store.storeScore).not.toHaveBeenCalled();
  });

  it('yopilgan, ballsiz attempt hisoblanib bir marta yoziladi', async () => {
    const store = fakeStore();
    const out = await finalizeAttempt(store, 'a1', { onlyIfExpired: false });
    expect(out.status).toBe('submitted');
    expect(store.storeScore).toHaveBeenCalledTimes(1);
    const stored: AttemptResult = vi.mocked(store.storeScore).mock.calls[0]![1];
    expect(stored.raw).toBe(2.2);
  });

  it('allaqachon ballangan attempt qayta hisoblanmaydi', async () => {
    const store = fakeStore({ closeAttempt: vi.fn().mockResolvedValue({ status: 'submitted', scored: true }) });
    await finalizeAttempt(store, 'a1', { onlyIfExpired: false });
    expect(store.loadScoringData).not.toHaveBeenCalled();
    expect(store.storeScore).not.toHaveBeenCalled();
  });

  it('kalit buzuq bo\'lsa ball yozilmaydi va xato ko\'tariladi', async () => {
    const store = fakeStore({ loadScoringData: vi.fn().mockResolvedValue(data({}, { correct: 'Z' })) });
    await expect(finalizeAttempt(store, 'a1', { onlyIfExpired: false })).rejects.toThrow(/kaliti noto'g'ri/);
    expect(store.storeScore).not.toHaveBeenCalled();
  });
});
