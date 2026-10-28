// Avto-generatsiya: node scripts/prepare-art.cjs (qo'lda tahrirlamang)
export const ART = {
  'mascot-waving': { w: 290, h: 258 },
  'mascot-laptop': { w: 254, h: 263 },
  'mascot-trophy': { w: 228, h: 254 },
  'mascot-celebrate': { w: 271, h: 292 },
  'mascot-pencil': { w: 261, h: 300 },
  'mascot-point': { w: 253, h: 257 },
  'mascot-reading': { w: 213, h: 275 },
  'mascot-books': { w: 241, h: 252 },
  'mascot-think': { w: 246, h: 311 },
  'mascot-thumbs': { w: 216, h: 282 },
  'mascot-checklist': { w: 228, h: 250 },
  'mascot-coin': { w: 189, h: 276 },
  'trophy': { w: 264, h: 288 },
  'sparkles': { w: 119, h: 85 },
  'orb': { w: 306, h: 182 },
  'alarm': { w: 133, h: 157 },
  'chart': { w: 199, h: 189 },
  'crown': { w: 228, h: 201 },
  'shuffle': { w: 209, h: 203 },
  'gift': { w: 236, h: 237 },
  'cube': { w: 157, h: 182 },
  'pyramid': { w: 191, h: 183 },
  'books': { w: 172, h: 141 },
} as const;

export type ArtName = keyof typeof ART;

export const ICONS = ['coin', 'daily-reset', 'lesson', 'point', 'random-questions', 'test-complete', 'trainer', 'unrewarded-practice'] as const;

export type IconName = (typeof ICONS)[number];
