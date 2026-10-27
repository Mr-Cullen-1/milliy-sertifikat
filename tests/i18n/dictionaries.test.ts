import { describe, expect, it } from 'vitest';
import { LANGS } from '../../lib/i18n/config';
import { dictionaries } from '../../lib/i18n/dictionaries';
import { TOPIC_NAMES } from '../../lib/i18n/topics';
import { interpolate, lookup } from '../../lib/i18n/translate';

const flatten = (obj: unknown, prefix = ''): Record<string, string> =>
  Object.entries(obj as Record<string, unknown>).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});

const params = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

const uz = flatten(dictionaries.uz);
const others = LANGS.filter((l) => l !== 'uz');

// Til-neytral qiymatlar (telefon namunasi) barcha tillarda bir xil bo'ladi.
const NEUTRAL = new Set(['start.phonePlaceholder']);

describe('lug\'atlar', () => {
  it('uz lug\'ati bo\'sh emas', () => {
    expect(Object.keys(uz).length).toBeGreaterThan(200);
    expect(Object.values(uz).every((v) => v.trim() !== '')).toBe(true);
  });

  describe.each(others)('%s', (lang) => {
    const dict = flatten(dictionaries[lang]);

    it('kalitlar uz bilan bir xil', () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(uz).sort());
    });

    it('bo\'sh qiymat yo\'q', () => {
      expect(Object.entries(dict).filter(([, v]) => v.trim() === '').map(([k]) => k)).toEqual([]);
    });

    it('{parametr} lar o\'zgarmagan', () => {
      const bad = Object.keys(uz).filter((k) => params(dict[k]!).join() !== params(uz[k]!).join());
      expect(bad).toEqual([]);
    });

    it('tarjima qilinmagan (o\'zbekchadan nusxa) matnlar kam', () => {
      // Qisqa/til-neytral qiymatlar (daraja belgilari, raqamlar) bir xil bo'lishi mumkin.
      const same = Object.keys(uz).filter((k) => !NEUTRAL.has(k) && uz[k]!.length > 14 && dict[k] === uz[k]);
      expect(same.slice(0, 10)).toEqual([]);
    });
  });

  it('ru: kirill harflari bor', () => {
    const dict = flatten(dictionaries.ru);
    const cyr = Object.values(dict).filter((v) => /[А-Яа-яЁё]/.test(v)).length;
    expect(cyr / Object.keys(dict).length).toBeGreaterThan(0.9);
  });

  it('interpolatsiya va qidiruv', () => {
    expect(interpolate('Salom, {name}', { name: 'Ali' })).toBe('Salom, Ali');
    expect(interpolate('{a}/{b}', { a: 1 })).toBe('1/{b}');
    expect(lookup(dictionaries.uz, 'start.errors.name')).toBeTruthy();
    expect(lookup(dictionaries.uz, 'yo.q')).toBeUndefined();
  });
});

describe('mavzu nomlari tarjimasi', () => {
  it('103 ta mavzu, har biri ru/kaa/en da (uz bazada)', () => {
    const missing: string[] = [];
    for (let id = 1; id <= 103; id++) {
      for (const lang of ['ru', 'kaa', 'en'] as const) {
        if (!TOPIC_NAMES[id]?.[lang]?.trim()) missing.push(`${id}/${lang}`);
      }
    }
    expect(missing.slice(0, 15)).toEqual([]);
  });
});
