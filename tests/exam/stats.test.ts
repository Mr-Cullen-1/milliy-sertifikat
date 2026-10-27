import { describe, expect, it } from 'vitest';
import { summarize, weakTopics, type TopicStat } from '../../lib/exam/stats';

const stat = (topic_id: number, total: number, correct: number, block_id = 1): TopicStat => ({ topic_id, block_id, total, correct });

describe('weakTopics', () => {
  it("eng past ulushdan boshlab, kam ma'lumotli va 100% li mavzularsiz", () => {
    const out = weakTopics([stat(1, 4, 4), stat(2, 4, 1), stat(3, 1, 0), stat(4, 3, 2), stat(5, 6, 0)]);
    expect(out.map((s) => s.topic_id)).toEqual([5, 2, 4]);
    expect(out[0]).toMatchObject({ pct: 0, total: 6 });
    expect(out[1]).toMatchObject({ pct: 25 });
  });

  it('teng ulushda ko\'proq savol bo\'lgani oldin; limit va minTotal', () => {
    const out = weakTopics([stat(10, 2, 1), stat(11, 4, 2), stat(12, 6, 3)], { limit: 2 });
    expect(out.map((s) => s.topic_id)).toEqual([12, 11]);
    expect(weakTopics([stat(1, 3, 0)], { minTotal: 5 })).toEqual([]);
  });
});

describe('summarize', () => {
  it('eng yaxshi, o\'rtacha va soni', () => {
    expect(summarize([40.2, 55, 61.1])).toEqual({ attempts: 3, best: 61.1, average: 52.1 });
    expect(summarize([])).toEqual({ attempts: 0, best: null, average: null });
  });
});
