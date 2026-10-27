import { mathFormatV1 } from '../../config/exam-format.math-v1';
import type { BlockCode } from '../../config/topics';
import type { Level, QType, SlotRequest } from './types';

// Rasmiy tartib (docs/mavzular.md): bo'limlar spetsifikatsiya jadvali tartibida joylashadi.
export const BLOCK_ORDER: readonly BlockCode[] = ['sonlar', 'algebra', 'tenglama', 'funksiyalar', 'analiz', 'geometriya', 'toplam'];

export interface PositionSlot {
  position: number;
  block: BlockCode;
  type: QType;
  difficulty: Level;
  index: number;
  count: number;
}

/** Qiyinlik: Y-1 1–12 L1, 13–27 L2, 28–32 L3 (docs/loyiha.md §5); Y-2 L2,L3,L3; O 36–38 L2, qolgani L3. */
const difficultyAt = (type: QType, position: number): Level => {
  if (type === 'y1') return position <= 12 ? 'L1' : position <= 27 ? 'L2' : 'L3';
  if (type === 'y2') return position === 33 ? 'L2' : 'L3';
  return position <= 38 ? 'L2' : 'L3';
};

/** Variantdan mustaqil 45 pozitsiyalik tartib. */
export function buildLayout(): PositionSlot[] {
  const slots: PositionSlot[] = [];
  for (const sec of mathFormatV1.sections) {
    let position = sec.from;
    for (const block of BLOCK_ORDER) {
      const count = mathFormatV1.blueprint[block]?.[sec.type] ?? 0;
      for (let index = 0; index < count; index++, position++) {
        slots.push({ position, block, type: sec.type, difficulty: difficultyAt(sec.type, position), index, count });
      }
    }
    if (position !== sec.to + 1) throw new Error(`${sec.type} bo'limi pozitsiyalari ${sec.from}–${sec.to} bilan mos kelmadi`);
  }
  return slots;
}

export const LAYOUT: readonly PositionSlot[] = buildLayout();

export const slotRequests = (variant: number): SlotRequest[] => LAYOUT.map((s) => ({ ...s, variant }));

export const VARIANT_COUNT = 6;
export const VARIANT_CODES = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
