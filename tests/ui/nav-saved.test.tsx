import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BottomNav } from '@/components/bottom-nav';
import { ReviewGrid, type ReviewItem } from '@/components/exam/review-grid';
import { I18nProvider } from '@/components/i18n/provider';
import { ProProvider } from '@/components/pro/pro-modal';
import { SaveButton } from '@/components/saved/save-button';
import { uz } from '@/lib/i18n/dictionaries/uz';

const wrap = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <I18nProvider lang="uz" dict={uz}>
      <ProProvider>{node}</ProProvider>
    </I18nProvider>,
  ).replaceAll('&#x27;', "'");

describe('BottomNav (telefon)', () => {
  it("5 ta bo'lim, faol bo'lim belgilanadi, faqat md dan kichik ekranda", () => {
    const out = wrap(<BottomNav active="mistakes" />);
    for (const href of ['/exams', '/practice', '/history', '/mistakes', '/dtm']) expect(out).toContain(`href="${href}"`);
    expect(out.match(/aria-current="page"/g)).toHaveLength(1);
    expect(out).toContain('md:hidden');
    for (const label of [uz.nav.exams, uz.nav.practice, uz.nav.history, uz.nav.mistakes, uz.nav.dtm]) expect(out).toContain(label);
  });

  it('faol bo\'lim berilmasa hech biri belgilanmaydi', () => {
    expect(wrap(<BottomNav />)).not.toContain('aria-current');
  });
});

describe('SaveButton', () => {
  it('saqlangan va saqlanmagan holat, xato matni', () => {
    const off = wrap(<SaveButton saved={false} pending={false} error={null} onToggle={() => {}} />);
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain(`aria-label="${uz.saved.save}"`);
    const on = wrap(<SaveButton saved pending={false} error={null} onToggle={() => {}} />);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain(`aria-label="${uz.saved.saved}"`);
    const err = wrap(<SaveButton saved={false} pending={false} error="limit" onToggle={() => {}} />);
    expect(err).toContain('role="alert"');
    expect(err).toContain(uz.saved.err.limit);
    expect(wrap(<SaveButton saved={false} pending error={null} onToggle={() => {}} />)).toContain('disabled');
  });
});

describe('ReviewGrid: saqlash tugmasi', () => {
  const item = (questionId?: string): ReviewItem => ({
    position: 1,
    status: 'ok',
    block: 'Sonlar va amallar',
    scoreText: '1/1',
    stemMd: '$1+1$',
    figure: null,
    given: 'B',
    partsText: null,
    correct: 'B',
    solutionMd: null,
    mistakeNoteMd: null,
    questionId,
  });

  it('questionId berilsa oynada yer belgisi tugmasi bor; berilmasa yo\'q', () => {
    // autoOpen: 1-savol oynasi boshidan ochiq (statik renderda ham ko'rinadi)
    const withId = wrap(<ReviewGrid autoOpen items={[item('11111111-1111-4111-8111-111111111111')]} />);
    expect(withId).toContain(`aria-label="${uz.saved.save}"`);
    // oyna sarlavhasi: "Savollar tahlili"
    expect(withId).toContain(`<h2 id="review-title"`);
    expect(withId).toContain(uz.result.review);
    expect(wrap(<ReviewGrid autoOpen items={[item()]} />)).not.toContain(`aria-label="${uz.saved.save}"`);
  });
});
