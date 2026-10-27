export interface BreakdownItem {
  questionId: string;
  blockId: number;
}

export interface BreakdownAnswer {
  questionId: string;
  isCorrect?: boolean | null;
  score?: number | null;
  maxScore?: number | null;
}

export interface BlockRow {
  blockId: number;
  total: number;
  correct: number;
  score: number;
  maxScore: number;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

/** Natija sahifasi: bloklar bo'yicha to'g'ri javoblar soni va ball (blok id bo'yicha tartiblangan). */
export function blockBreakdown(items: BreakdownItem[], answers: BreakdownAnswer[]): BlockRow[] {
  const byQuestion = new Map(answers.map((a) => [a.questionId, a]));
  const rows = new Map<number, BlockRow>();
  for (const item of items) {
    const row = rows.get(item.blockId) ?? { blockId: item.blockId, total: 0, correct: 0, score: 0, maxScore: 0 };
    const a = byQuestion.get(item.questionId);
    row.total += 1;
    if (a?.isCorrect) row.correct += 1;
    row.score += a?.score ?? 0;
    row.maxScore += a?.maxScore ?? 0;
    rows.set(item.blockId, row);
  }
  return [...rows.values()]
    .map((r) => ({ ...r, score: round1(r.score), maxScore: round1(r.maxScore) }))
    .sort((a, b) => a.blockId - b.blockId);
}
