import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { Navigator } from '@/components/exam/navigator';
import { QuestionView, type RunnerItem } from '@/components/exam/question-view';
import { Markdown } from '@/components/math/markdown';
import { en } from '@/lib/i18n/dictionaries/en';
import { ru } from '@/lib/i18n/dictionaries/ru';
import { uz } from '@/lib/i18n/dictionaries/uz';

const withI18n = (node: React.ReactNode) => renderToStaticMarkup(<I18nProvider lang="uz" dict={uz}>{node}</I18nProvider>);

const base = { position: 7, questionId: 'q7', blockName: 'Algebraik shakl almashtirishlar' };

const y1: RunnerItem = {
  ...base,
  stemMd: '$\\frac{1}{2} + \\frac{1}{3}$ ni hisoblang.',
  payload: { type: 'y1', data: { options: { A: '$\\frac{2}{5}$', B: '$\\frac{5}{6}$', C: '1', D: '$\\sqrt{2}$' } } },
};

const y2: RunnerItem = {
  ...base,
  position: 33,
  stemMd: 'Ifodalarni qiymatlariga moslang.',
  payload: {
    type: 'y2',
    data: {
      options: { A: '$2$', B: '$3$', C: '$4$' },
      items: [
        { id: '1', text_md: '$1+1$' },
        { id: '2', text_md: '$2+2$' },
      ],
    },
  },
};

const open: RunnerItem = {
  ...base,
  position: 36,
  stemMd: '$x^2=9$ tenglamani yeching.',
  payload: {
    type: 'o',
    data: { parts: { a: { prompt_md: 'Musbat ildizni toping.' }, b: { prompt_md: 'Manfiy ildizni toping.', hint: 'Butun son' } } },
  },
};

const html = (item: RunnerItem, value?: Parameters<typeof QuestionView>[0]['value']) =>
  withI18n(<QuestionView item={item} value={value} onChange={() => {}} />);

describe('Markdown + KaTeX', () => {
  it('formulalarni KaTeX bilan render qiladi', () => {
    const out = renderToStaticMarkup(<Markdown>{'Yechim: $x^2 + 1$'}</Markdown>);
    expect(out).toContain('class="katex"');
    expect(out).toContain('Yechim:');
  });

  it('xom HTML ni render qilmaydi (xavfsizlik)', () => {
    const out = renderToStaticMarkup(<Markdown>{'<img src=x onerror=alert(1)> <script>alert(1)</script>'}</Markdown>);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
  });

  it('inline rejimda <p> chiqarmaydi', () => {
    expect(renderToStaticMarkup(<Markdown inline>{'matn'}</Markdown>)).not.toContain('<p>');
    expect(renderToStaticMarkup(<Markdown>{'matn'}</Markdown>)).toContain('<p>');
  });
});

describe('QuestionView', () => {
  it('Y-1: to\'rt variant, formulalar va tanlangan javob', () => {
    const out = html(y1, 'B');
    expect(out).toContain('7-topshiriq');
    expect(out).toContain('Yopiq test');
    expect(out).toContain('Algebraik shakl almashtirishlar');
    for (const letter of ['A', 'B', 'C', 'D']) expect(out).toContain(`>${letter}</span>`);
    expect(out.match(/class="katex"/g)!.length).toBeGreaterThanOrEqual(4);
    // faqat B belgilangan
    expect(out.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(out.match(/aria-checked="false"/g)).toHaveLength(3);
  });

  it('Y-1: javobsiz holatda hech biri tanlanmagan', () => {
    expect(html(y1).match(/aria-checked="true"/g)).toBeNull();
  });

  it('Y-2: bandlar va variantlar, juftlangan bandlarda nishon', () => {
    const out = html(y2, { '1': 'A' });
    expect(out).toContain('Moslashtirish');
    expect(out).toContain('Bandlar');
    expect(out).toContain('Variantlar');
    expect(out).toContain('1-band uchun tanlang'.replace('1-band', '2-band')); // keyingi bo'sh band faol
  });

  it('O: har band uchun input, tavsiya va kiritish qoidasi', () => {
    const out = html(open, { a: '3', b: '-3' });
    expect(out).toContain('Ochiq javob');
    expect(out).toContain('id="open-a"');
    expect(out).toContain('id="open-b"');
    expect(out).toContain('value="3"');
    expect(out).toContain('value="-3"');
    expect(out).toContain('Butun son');
    expect(out).toContain('kasr');
  });

  it('O: faqat bitta band bo\'lsa bitta input', () => {
    const only: RunnerItem = { ...open, payload: { type: 'o', data: { parts: { b: { prompt_md: 'Faqat b' } } } } };
    const out = html(only);
    expect(out).not.toContain('id="open-a"');
    expect(out).toContain('id="open-b"');
  });
});

describe('Navigator', () => {
  it('45 ta tugma va holatlar', () => {
    const items = Array.from({ length: 45 }, (_, i) => ({
      position: i + 1,
      state: i === 0 ? ('current' as const) : i === 1 ? ('answered' as const) : i === 2 ? ('flagged' as const) : ('empty' as const),
    }));
    const out = withI18n(<Navigator items={items} onSelect={() => {}} />);
    expect(out.match(/aria-label="\d+-savol"/g)).toHaveLength(45);
    expect(out).toContain('aria-current="step"');
    expect(out).toContain('Javob berilgan');
    expect(out).toContain('Belgilangan');
  });
});

describe('Navigator: bo\'limlar', () => {
  const typed = (n: number, type: 'y1' | 'y2' | 'o') => ({ position: n, state: 'empty' as const, type });
  const items = [typed(1, 'y1'), typed(2, 'y1'), typed(3, 'y2'), typed(4, 'o'), typed(5, 'o')];

  it('ketma-ket bir xil turdagi savollar "N-qism · tur" sarlavhasi ostida guruhlanadi', () => {
    const out = withI18n(<Navigator items={items} onSelect={() => {}} />);
    expect(out).toContain('1-qism · Yopiq test');
    expect(out).toContain('2-qism · Moslashtirish');
    expect(out).toContain('3-qism · Ochiq javob');
    expect(out.match(/<h3/g)).toHaveLength(3);
    expect(out.match(/<ol/g)).toHaveLength(3);
  });

  it('tur ko\'rsatilmasa sarlavhasiz bitta ro\'yxat', () => {
    const plain = items.map(({ position, state }) => ({ position, state }));
    const out = withI18n(<Navigator items={plain} onSelect={() => {}} />);
    expect(out).not.toContain('<h3');
    expect(out.match(/<ol/g)).toHaveLength(1);
  });

  it('legendada "Joriy" belgisi bor', () => {
    expect(withI18n(<Navigator items={items} onSelect={() => {}} />)).toContain('Joriy');
  });

  it('ustunlar soni tashqaridan beriladi (yon panel)', () => {
    expect(withI18n(<Navigator items={items} columns="grid-cols-5" onSelect={() => {}} />)).toContain('grid-cols-5');
  });
});

describe('savol kartasi: bayroq va ko\'rsatmalar', () => {
  it('bayroq tugmasi berilsa yuqori o\'ng burchakda chiqadi va holatini bildiradi', () => {
    const off = withI18n(<QuestionView item={y1} value={undefined} onChange={() => {}} flag={{ on: false, onToggle: () => {} }} />);
    expect(off).toContain('aria-pressed="false"');
    expect(off).toContain('aria-label="Belgilash"');
    const on = withI18n(<QuestionView item={y1} value={undefined} onChange={() => {}} flag={{ on: true, onToggle: () => {} }} />);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain('aria-label="Belgilangan"');
  });

  it('bayroq berilmasa (admin ko\'rinishi) tugma chiqmaydi', () => {
    expect(html(y1)).not.toContain('aria-label="Belgilash"');
  });

  it('Y-2: variantlar oralig\'i ko\'rsatilgan bir qatorli ko\'rsatma', () => {
    expect(html(y2)).toContain('Har bir bandga mos variantni (A–C) tanlang.');
  });

  it('O: kiritish qoidasi bor; ekran klaviaturasi faqat sensorli ekranda (serverda chiqmaydi)', () => {
    const out = html(open);
    expect(out).toContain('Faqat son, kasr');
    expect(out).not.toContain('Raqamli klaviatura');
  });
});

describe('boshqa tillarda render', () => {
  const render = (lang: 'ru' | 'en', node: React.ReactNode) =>
    renderToStaticMarkup(<I18nProvider lang={lang} dict={lang === 'ru' ? ru : en}>{node}</I18nProvider>);

  it("savol ko'rinishi tanlangan til yorliqlari bilan chiqadi", () => {
    const ruOut = render('ru', <QuestionView item={y1} value={undefined} onChange={() => {}} />);
    expect(ruOut).toContain(ru.exam.typeY1);
    expect(ruOut).toContain(ru.exam.task.replace('{n}', '7'));
    expect(ruOut).not.toContain(uz.exam.typeY1);
    const enOut = render('en', <QuestionView item={open} value={undefined} onChange={() => {}} />);
    expect(enOut).toContain(en.exam.typeO);
    expect(enOut).toContain(en.answers.placeholder);
  });

  it('panel va legenda tarjima qilinadi', () => {
    const items = [{ position: 1, state: 'current' as const }, { position: 2, state: 'empty' as const }];
    const out = render('ru', <Navigator items={items} onSelect={() => {}} />);
    expect(out).toContain(ru.exam.legendAnswered);
    expect(out).toContain(ru.exam.questionAria.replace('{n}', '2'));
  });
});
