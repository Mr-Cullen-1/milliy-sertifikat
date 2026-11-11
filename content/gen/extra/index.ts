import { EQUATIONS_ANALYSIS_TEMPLATES } from './equations-analysis';
import { GEOMETRY_TEMPLATES } from './geometry';
import { NUMBERS_ALGEBRA_TEMPLATES } from './numbers-algebra';
import { SETS_DATA_TEMPLATES } from './sets-data';
import { GEOMETRY2_TEMPLATES } from './geometry2';
import type { ExtraTemplate } from './types';

export type { ExtraTemplate } from './types';

/** Barcha qo'shimcha (mashq zaxirasi) shablonlari; har soha o'z faylida. */
export const EXTRA_TEMPLATES: readonly ExtraTemplate[] = [...NUMBERS_ALGEBRA_TEMPLATES, ...EQUATIONS_ANALYSIS_TEMPLATES, ...SETS_DATA_TEMPLATES, ...GEOMETRY_TEMPLATES, ...GEOMETRY2_TEMPLATES];
