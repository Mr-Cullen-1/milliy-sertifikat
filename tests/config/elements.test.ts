import { describe, expect, it } from 'vitest';
import { ELEMENT_CODES, ELEMENTS, MAX_TOPIC_ID, NEW_TOPICS, officialBlocksOf, officialPrimaryBlock, TOPIC_ELEMENTS, topicAllowedInBlock } from '../../config/elements';
import { BLOCK_CODES, topicInBlock } from '../../config/topics';

describe('rasmiy 21 mazmun elementi', () => {
  it('21 ta noyob element, har biri 7 bo\'limdan biriga tegishli; kodning birinchi raqami bo\'lim tartibi', () => {
    expect(ELEMENTS).toHaveLength(21);
    expect(new Set(ELEMENT_CODES).size).toBe(21);
    const order = ['sonlar', 'algebra', 'tenglama', 'funksiyalar', 'toplam', 'analiz', 'geometriya']; // rasmiy: 1 sonlar ... 5 to'plam, 6 analiz, 7 geometriya
    for (const e of ELEMENTS) {
      expect(BLOCK_CODES).toContain(e.block);
      expect(e.block).toBe(order[Number(e.code[0]) - 1]);
    }
  });

  it("har bo'limda kamida bitta element bor", () => {
    for (const b of BLOCK_CODES) expect(ELEMENTS.some((e) => e.block === b), b).toBe(true);
  });
});

describe('mavzu -> element moslashtirish', () => {
  it("1..103 hamma mavzu kamida bitta mavjud elementga bog'langan", () => {
    for (let t = 1; t <= 103; t++) {
      const els = TOPIC_ELEMENTS[t];
      expect(els?.length, `mavzu ${t}`).toBeGreaterThan(0);
      for (const c of els!) expect(ELEMENT_CODES, `mavzu ${t}: ${c}`).toContain(c);
    }
  });

  it("har bir element kamida bitta mavzuga ega (mashq bo'sh bo'lmasligi uchun)", () => {
    for (const code of ELEMENT_CODES) {
      expect(Object.values(TOPIC_ELEMENTS).some((els) => els.includes(code)), code).toBe(true);
    }
  });

  it('yangi mavzular 104 dan ketma-ket, noyob nomli, elementlari mavjud', () => {
    NEW_TOPICS.forEach((t, i) => {
      expect(t.id).toBe(104 + i);
      for (const c of t.elements) expect(ELEMENT_CODES).toContain(c);
    });
    expect(new Set(NEW_TOPICS.map((t) => t.name)).size).toBe(NEW_TOPICS.length);
    expect(MAX_TOPIC_ID).toBe(NEW_TOPICS.at(-1)!.id);
  });
});

describe('bo\'lim tasnifi: ishchi diapazon yoki rasmiy joylashuv', () => {
  it("progressiya, matnli masala, foiz, nisbat rasmiyda Algebra bo'limida (bizning diapazonda boshqa bo'limda)", () => {
    for (const t of [7, 8, 42, 56, 57, 58]) {
      expect(officialPrimaryBlock(t), `mavzu ${t}`).toBe('algebra');
      expect(topicAllowedInBlock('algebra', t)).toBe(true);
    }
    // eski variantlar bizning diapazonda tuzilgan: ular ham yaroqli
    expect(topicInBlock('analiz', 57)).toBe(true);
    expect(topicAllowedInBlock('analiz', 57)).toBe(true);
    expect(topicAllowedInBlock('tenglama', 42)).toBe(true);
    expect(topicAllowedInBlock('sonlar', 7)).toBe(true);
  });

  it("rasmiy Analiz faqat hosila va integral; funksiya limiti Funksiyalar bo'limida", () => {
    for (const t of [60, 61, 62, 63, 64, 65, 66, 110]) expect(officialPrimaryBlock(t), `mavzu ${t}`).toBe('analiz');
    expect(officialPrimaryBlock(59)).toBe('funksiyalar');
  });

  it("noto'g'ri bo'limga ruxsat yo'q", () => {
    expect(topicAllowedInBlock('geometriya', 12)).toBe(false);
    expect(topicAllowedInBlock('sonlar', 114)).toBe(false);
    expect(topicAllowedInBlock('geometriya', 114)).toBe(true);
    expect(officialBlocksOf(52).sort()).toEqual(['algebra', 'funksiyalar']);
  });
});
