import type { Level, QType, QuestionSpec } from '../types';

/**
 * Qo'shimcha (mashq zaxirasi uchun) mustaqil shablon. Mock variantlar tartibiga (45 pozitsiya) bog'liq emas:
 * har shablon aniq mavzu, tur va qiyinlikka ega; `seed` bo'yicha deterministik savol beradi (bir xil seed => bir xil savol).
 * Mavzu raqami config/elements.ts dagi (1..121) mavzu; bo'lim shu mavzuning rasmiy asosiy bo'limidan olinadi.
 */
export interface ExtraTemplate {
  /** Noyob, qisqa (<= 32 belgi, faqat a-z, 0-9, '-'): masalan "cx-mul" */
  id: string;
  /** config/elements.ts dagi mavzu raqami */
  topic: number;
  type: QType;
  difficulty: Level;
  /** seed 0,1,2... uchun savol; spec.topic === topic va spec.difficulty === difficulty bo'lishi shart */
  generate(seed: number): QuestionSpec;
}
