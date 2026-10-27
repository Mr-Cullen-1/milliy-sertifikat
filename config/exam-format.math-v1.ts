import type { ExamFormat } from '../lib/exam/format';

// Manba: docs/mavzular.md (rasmiy spetsifikatsiya, 2023 tahri ball qiymatlari — mo'ljal).
export const mathFormatV1: ExamFormat = {
  code: 'math-v1',
  durationMin: 150,
  sections: [
    { type: 'y1', from: 1, to: 32 },
    { type: 'y2', from: 33, to: 35 },
    { type: 'o', from: 36, to: 45 },
  ],
  blueprint: {
    sonlar: { y1: 2, y2: 0, o: 0 },
    algebra: { y1: 11, y2: 0, o: 0 },
    tenglama: { y1: 6, y2: 0, o: 2 },
    funksiyalar: { y1: 2, y2: 0, o: 1 },
    analiz: { y1: 2, y2: 0, o: 2 },
    geometriya: { y1: 7, y2: 3, o: 4 },
    toplam: { y1: 2, y2: 0, o: 1 },
  },
  scoring: {
    version: 'phaseA-linear-v1',
    y1Weights: { L1: 1.3, L2: 1.3, L3: 2.2 },
    y2Weight: 2.2,
    open: { a: 1.5, b: 1.7, both: 3.2 },
    scale: [
      [0, 0],
      [1, 75],
    ],
    levels: [
      { code: 'A+', min: 70 },
      { code: 'A', min: 65 },
      { code: 'B+', min: 60 },
      { code: 'B', min: 55 },
      { code: 'C+', min: 50 },
      { code: 'C', min: 46 },
    ],
    graceSec: 5,
  },
};
