import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { PracticeSetup, type SetupGroup } from '@/components/practice/practice-setup';
import { uz } from '@/lib/i18n/dictionaries/uz';

// Server amali Supabase sozlamalarini talab qiladi; interfeys testida kerak emas
vi.mock('@/app/practice/actions', () => ({ startPracticeAction: async () => ({}) }));

const groups: SetupGroup[] = [
  {
    block: 'sonlar',
    label: 'Sonlar va amallar',
    elements: [
      { code: '1.1', label: 'Natural sonlar', counts: { all: 80, L1: 80, L2: 0, L3: 0 } },
      { code: '1.2', label: 'Sonlar ustida amallar', counts: { all: 0, L1: 0, L2: 0, L3: 0 } },
    ],
  },
  {
    block: 'tenglama',
    label: 'Tenglama va tengsizliklar',
    elements: [{ code: '3.1', label: 'Tenglamalar', counts: { all: 318, L1: 0, L2: 318, L3: 0 } }],
  },
];

const render = (g: SetupGroup[]) =>
  renderToStaticMarkup(
    <I18nProvider lang="uz" dict={uz}>
      <PracticeSetup groups={g} />
    </I18nProvider>,
  ).replaceAll('&#x27;', "'");

describe('PracticeSetup', () => {
  const out = render(groups);

  it("bo'lim, qiyinlik, rejim, savollar soni bo'limlari va mavjud savollar soni chiqadi", () => {
    for (const label of [uz.practice.block, uz.practice.difficulty, uz.practice.mode, uz.practice.count]) expect(out).toContain(label);
    expect(out).toContain('80 ta savol mavjud');
    expect(out).toContain('1.1'); // element kodi ko'rinadi
    expect(out).toContain('Sonlar va amallar'); // bo'lim sarlavhasi
    expect(out).toContain('318 ta savol mavjud');
    for (const m of [uz.practice.modePractice, uz.practice.modeTimed, uz.practice.modeExam]) expect(out).toContain(m);
  });

  it("birinchi savoli bor bo'lim tanlangan; savolsiz bo'lim va mavjud bo'lmagan qiyinliklar o'chirilgan", () => {
    expect(out).toContain('name="block" value="1.1"'); // birinchi savoli bor element tanlangan
    expect(out).toContain('name="difficulty" value="all"');
    expect(out).toContain('name="mode" value="practice"');
    expect(out).toContain('name="count" value="10"');
    // 1.2 elementi (0 savol), 1.1 uchun O'rta va Qiyin (0 savol): disabled
    expect(out.match(/disabled=""/g)!.length).toBeGreaterThanOrEqual(3);
  });

  it("savollar soni tanlangandan kam bo'lsa ogohlantirish chiqadi", () => {
    const few = render([{ block: 'sonlar', label: 'Sonlar', elements: [{ code: '1.1', label: 'Natural sonlar', counts: { all: 6, L1: 6, L2: 0, L3: 0 } }] }]);
    expect(few).toContain(uz.practice.notEnough.replace('{n}', '6'));
  });

  it("zaxira bo'sh bo'lsa boshlash tugmasi o'chirilgan", () => {
    const none = render([{ block: 'sonlar', label: 'Sonlar', elements: [{ code: '1.1', label: 'Natural sonlar', counts: { all: 0, L1: 0, L2: 0, L3: 0 } }] }]);
    expect(none).toMatch(/<button type="submit"[^>]*disabled=""/);
  });
});
