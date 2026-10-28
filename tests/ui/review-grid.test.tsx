import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { ReviewGrid, type ReviewItem } from '@/components/exam/review-grid';
import { uz } from '@/lib/i18n/dictionaries/uz';

const item = (position: number, status: ReviewItem['status']): ReviewItem => ({
  position,
  status,
  block: 'Sonlar va amallar',
  scoreText: '0/1,3',
  stemMd: '$1+1$',
  figure: null,
  given: '—',
  partsText: null,
  correct: 'B',
  solutionMd: null,
  mistakeNoteMd: null,
});

describe('ReviewGrid', () => {
  it("har savol uchun bir xil o'lchamli karta va holat yorlig'i chiqaradi", () => {
    const out = renderToStaticMarkup(
      <I18nProvider lang="uz" dict={uz}>
        <ReviewGrid items={[item(1, 'ok'), item(2, 'wrong'), item(3, 'empty')]} />
      </I18nProvider>,
    );
    const text = out.replaceAll('&#x27;', "'");
    expect(out.match(/h-\[112px\]/g)).toHaveLength(3);
    expect(text).toContain(uz.result.ok);
    expect(text).toContain(uz.result.wrong);
    expect(text).toContain(uz.result.empty);
  });
});
