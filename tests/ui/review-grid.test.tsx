import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { ProProvider } from '@/components/pro/pro-modal';
import { ReviewGrid, type ReviewItem } from '@/components/exam/review-grid';
import { uz } from '@/lib/i18n/dictionaries/uz';

const item = (position: number, status: ReviewItem['status'], locked = false): ReviewItem => ({
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
  locked,
});

const render = (items: ReviewItem[]) =>
  renderToStaticMarkup(
    <I18nProvider lang="uz" dict={uz}>
      <ProProvider>
        <ReviewGrid items={items} />
      </ProProvider>
    </I18nProvider>,
  ).replaceAll('&#x27;', "'");

describe('ReviewGrid', () => {
  it("har savol uchun bir xil o'lchamli karta va holat yorlig'i chiqaradi", () => {
    const out = render([item(1, 'ok'), item(2, 'wrong'), item(3, 'empty')]);
    expect(out.match(/h-\[112px\]/g)).toHaveLength(3);
    expect(out).toContain(uz.result.ok);
    expect(out).toContain(uz.result.wrong);
    expect(out).toContain(uz.result.empty);
  });

  it("yopiq (Pro) kartalar o'chirilgan ko'rinishda, lekin bosiladigan: natija yorlig'i va ball chiqmaydi", () => {
    const out = render([item(1, 'ok'), item(2, 'empty', true)]);
    expect(out.match(/aria-disabled="true"/g)).toHaveLength(1);
    expect(out).toContain(`2: ${uz.pro.cardButton}`);
    expect(out.match(/0\/1,3/g)).toHaveLength(1);
  });
});
