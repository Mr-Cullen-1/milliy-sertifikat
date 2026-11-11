import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { PracticeReveal } from '@/app/practice/actions';
import { I18nProvider } from '@/components/i18n/provider';
import type { RunnerItem } from '@/components/exam/question-view';
import { PracticeRunner } from '@/components/practice/practice-runner';
import { RevealSheet } from '@/components/practice/reveal-sheet';
import { uz } from '@/lib/i18n/dictionaries/uz';

// Server amallari Supabase sozlamalarini talab qiladi; interfeys testida kerak emas
vi.mock('@/app/practice/actions', () => ({ submitPracticeAnswerAction: async () => ({ ok: true, checked: false }), finishPracticeAction: async () => ({ ok: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, push: () => {}, refresh: () => {} }) }));
vi.mock('@/app/language-actions', () => ({ setLanguageAction: async () => {} }));

const items: RunnerItem[] = [1, 2, 3].map((n) => ({
  position: n,
  questionId: `q${n}`,
  blockName: 'Sonlar va amallar',
  stemMd: `$${n}+${n}$ ni hisoblang.`,
  payload: { type: 'y1' as const, data: { options: { A: '$1$', B: '$2$', C: '$3$', D: '$4$' } } },
}));

const reveal: PracticeReveal = {
  isCorrect: false,
  parts: null,
  correctAnswer: 'B',
  solutionMd: "Yechim: $1+1=2$.",
  mistakeNoteMd: 'Tipik xato.',
  solutionLocked: false,
};

const html = (node: React.ReactNode) => renderToStaticMarkup(<I18nProvider lang="uz" dict={uz}>{node}</I18nProvider>).replaceAll('&#x27;', "'");

describe('PracticeRunner: mock test ekraniga o\'xshash tuzilish', () => {
  const out = html(
    <PracticeRunner sessionId="s1" mode="practice" title="Mashq: Sonlar" items={items} initialAnswers={{}} initialReveals={{}} deadlineAt={null} serverNow="2026-11-11T00:00:00Z" />,
  );

  it("mock bilan bir xil ramka: kengligi 1480, yon panel (navigator), kalkulyator yozuvi, klaviatura yorlig'i", () => {
    expect(out).toContain('max-w-[1480px]');
    expect(out).toContain('lg:h-dvh lg:overflow-hidden');
    expect(out).toContain(uz.exam.noCalc);
    expect(out).toContain(uz.exam.panel); // yon panel sarlavhasi
    expect(out).toContain('aria-label="Savol 1"'.replace('Savol 1', uz.exam.questionAria.replace('{n}', '1')));
    expect(out).toContain(uz.exam.kbd.replace('{keys}', 'A–D'));
  });

  it("bayroq tugmasi, pastki panel tugmalari (Orqaga, Tekshirish) mockdagi kabi, javob oynasi ochilmaydi", () => {
    expect(out).toContain(uz.exam.flag);
    expect(out).toContain(uz.practice.check);
    expect(out).toContain(uz.exam.back);
    expect(out).toContain('lg:h-14!'); // mockdagi katta tugma o'lchami
    // javob oynasi (dialog) mavjud, lekin tekshirilmaguncha bo'sh va yopiq
    expect(out).toContain('app-sheet-top');
    expect(out).not.toContain('open=""');
  });
});

describe('PracticeRunner: tekshirilgan savol', () => {
  const out = html(
    <PracticeRunner
      sessionId="s1"
      mode="practice"
      title="Mashq: Sonlar"
      items={items}
      initialAnswers={{ q1: 'A', q2: 'A', q3: 'A' }}
      initialReveals={{ q1: reveal, q2: reveal, q3: reveal }}
      deadlineAt={null}
      serverNow="2026-11-11T00:00:00Z"
    />,
  );

  it("javob oynasi yopilganda savol ostida natija paneli va \"Javobni ko'rish\" tugmasi turadi (pastga aylantirish shart emas)", () => {
    expect(out).toContain(uz.practice.wrong);
    expect(out).toContain(uz.practice.viewAnswer);
  });
});

describe('RevealSheet: tepadan tushadigan javob oynasi', () => {
  it("to'g'ri javob, yechim, xato izohi va Keyingi/Yopish tugmalari bor; dialog tepadan (app-sheet-top) chiziladi", () => {
    const out = html(<RevealSheet open={false} reveal={reveal} correctText="B" isLast={false} onClose={() => {}} onNext={() => {}} />);
    expect(out).toContain('app-sheet-top');
    expect(out).toContain(uz.practice.wrong);
    expect(out).toContain(`${uz.result.correctAnswer}:`);
    expect(out).toContain('Yechim: ');
    expect(out).toContain('Tipik xato.');
    expect(out).toContain(uz.practice.next);
    expect(out).toContain(uz.common.close);
  });

  it("oxirgi savolda 'Yakunlash'; to'g'ri javobda to'g'ri javob matni qayta takrorlanmaydi", () => {
    const ok: PracticeReveal = { ...reveal, isCorrect: true, mistakeNoteMd: null };
    const out = html(<RevealSheet open={false} reveal={ok} correctText="B" isLast onClose={() => {}} onNext={() => {}} />);
    expect(out).toContain(uz.practice.correct);
    expect(out).toContain(uz.practice.finish);
    expect(out).not.toContain(`${uz.result.correctAnswer}:`);
    expect(out).not.toContain('Tipik xato.');
  });
});
