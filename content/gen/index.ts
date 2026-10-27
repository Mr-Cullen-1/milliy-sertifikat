import type { BlockCode } from '../../config/topics';
import { generateAlgebra } from './algebra';
import { generateAnaliz } from './analiz';
import { assemble } from './assemble';
import { generateFunksiyalar } from './funksiyalar';
import { generateGeometryPlan } from './geometriya-plan';
import { generateGeometryStereo } from './geometriya-stereo';
import { slotRequests, VARIANT_CODES, VARIANT_COUNT } from './layout';
import { generateSonlar } from './sonlar';
import { generateTenglama } from './tenglama';
import { generateToplam } from './toplam';
import type { BlockGenerator } from './types';

/** Geometriya ikki agent yozgan generatordan iborat: juft index -> planimetriya, toq index -> stereometriya. */
export const generateGeometriya: BlockGenerator = (req) => (req.index % 2 === 0 ? generateGeometryPlan(req) : generateGeometryStereo(req));

export const generators: Record<BlockCode, BlockGenerator> = {
  sonlar: generateSonlar,
  algebra: generateAlgebra,
  tenglama: generateTenglama,
  funksiyalar: generateFunksiyalar,
  analiz: generateAnaliz,
  geometriya: generateGeometriya,
  toplam: generateToplam,
};

export interface VariantFile {
  exam: { title: string; code: string; is_free: boolean };
  questions: Record<string, unknown>[];
}

/** Bir variant (45 savol) import formatida: lib/content/import-schema.ts importFileSchema ga mos. */
export function buildVariantFile(variant: number): VariantFile {
  if (!Number.isInteger(variant) || variant < 0 || variant >= VARIANT_COUNT) throw new Error(`variant 0..${VARIANT_COUNT - 1} bo'lishi kerak`);
  const code = VARIANT_CODES[variant]!;
  return {
    exam: { title: `Variant ${code}`, code, is_free: true },
    questions: slotRequests(variant).map((req) => assemble(generators[req.block](req), req)),
  };
}
