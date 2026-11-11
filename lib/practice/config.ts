// Mashq rejimi sozlamalari (docs/v2-reja.md, Bosqich 1C).
import { BLOCK_CODES, type BlockCode } from '../../config/topics';

export { BLOCK_CODES };
export type { BlockCode };

/** practice: taymersiz, javob darrov; timed: taymer, javob darrov; exam: taymer, natija oxirida. */
export const PRACTICE_MODES = ['practice', 'timed', 'exam'] as const;
export type PracticeMode = (typeof PRACTICE_MODES)[number];

export const PRACTICE_DIFFICULTIES = ['all', 'L1', 'L2', 'L3'] as const;
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

export const PRACTICE_COUNTS = [5, 10, 15, 20, 30] as const;
export const DEFAULT_PRACTICE_COUNT = 10;

/** Taymerli rejimlarda savol boshiga vaqt (bazadagi start_practice bilan bir xil). */
export const PRACTICE_SECONDS_PER_QUESTION = 180;

/** Pro obunasiz yechimi ochiladigan savollar soni: har mashqda dastlabki 5 ta (imtihon tahlili bilan bir xil qoida). */
export const FREE_PRACTICE_SOLUTIONS = 5;

/** Javob darrov tekshiriladimi (exam rejimda faqat oxirida). */
export const feedbackImmediately = (mode: PracticeMode): boolean => mode !== 'exam';

const ELEMENT_KEYS = {
  '1.1': 'elements.e11', '1.2': 'elements.e12', '2.1': 'elements.e21', '2.2': 'elements.e22', '2.3': 'elements.e23', '2.4': 'elements.e24',
  '3.1': 'elements.e31', '3.2': 'elements.e32', '4.1': 'elements.e41', '5.1': 'elements.e51', '5.2': 'elements.e52', '5.3': 'elements.e53',
  '5.4': 'elements.e54', '5.5': 'elements.e55', '6.1': 'elements.e61', '6.2': 'elements.e62', '7.1': 'elements.e71', '7.2': 'elements.e72',
  '7.3': 'elements.e73', '7.4': 'elements.e74', '7.5': 'elements.e75',
} as const;
export type ElementLabelKey = (typeof ELEMENT_KEYS)[keyof typeof ELEMENT_KEYS];

/** Rasmiy mazmun elementi kodi -> lug'at kaliti ("2.4" -> elements.e24); noma'lum kod bo'lmasligi kerak (bazada FK). */
export const elementLabelKey = (code: string): ElementLabelKey => ELEMENT_KEYS[code as keyof typeof ELEMENT_KEYS] ?? 'elements.e11';

export const isPracticeMode = (v: unknown): v is PracticeMode => (PRACTICE_MODES as readonly unknown[]).includes(v);
export const isPracticeDifficulty = (v: unknown): v is PracticeDifficulty => (PRACTICE_DIFFICULTIES as readonly unknown[]).includes(v);
