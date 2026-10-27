// docs/mavzular.md dagi 7 blokning mavzu raqamlari diapazonlari (kod -> [birinchi, oxirgi]).
export const BLOCK_CODES = ['sonlar', 'algebra', 'tenglama', 'funksiyalar', 'analiz', 'geometriya', 'toplam'] as const;
export type BlockCode = (typeof BLOCK_CODES)[number];

export const TOPIC_RANGES: Record<BlockCode, readonly [number, number]> = {
  sonlar: [1, 11],
  algebra: [12, 27],
  tenglama: [28, 42],
  funksiyalar: [43, 55],
  analiz: [56, 66],
  geometriya: [67, 93],
  toplam: [94, 103],
};

export const topicInBlock = (block: BlockCode, topic: number): boolean => {
  const [from, to] = TOPIC_RANGES[block];
  return Number.isInteger(topic) && topic >= from && topic <= to;
};
