export type QuestionType = 'y1' | 'y2' | 'o';
export type Difficulty = 'L1' | 'L2' | 'L3';

export interface SectionSpec {
  type: QuestionType;
  from: number;
  to: number;
}

export interface LevelSpec {
  code: string;
  min: number;
}

export interface ScoringConfig {
  version: string;
  y1Weights: Record<Difficulty, number>;
  y2Weight: number;
  open: { a: number; b: number; both: number };
  /** [xom ball ulushi 0..1, taxminiy shkala balli 0..75], ulush bo'yicha o'sish tartibida */
  scale: Array<[number, number]>;
  /** min bo'yicha kamayish tartibida */
  levels: LevelSpec[];
  graceSec: number;
}

export type BlockBlueprint = Record<QuestionType, number>;

export interface ExamFormat {
  code: string;
  durationMin: number;
  sections: SectionSpec[];
  /** blok kodi -> tur bo'yicha topshiriqlar soni */
  blueprint: Record<string, BlockBlueprint>;
  scoring: ScoringConfig;
}
