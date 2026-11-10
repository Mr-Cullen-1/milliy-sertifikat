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

export const isPracticeMode = (v: unknown): v is PracticeMode => (PRACTICE_MODES as readonly unknown[]).includes(v);
export const isPracticeDifficulty = (v: unknown): v is PracticeDifficulty => (PRACTICE_DIFFICULTIES as readonly unknown[]).includes(v);
