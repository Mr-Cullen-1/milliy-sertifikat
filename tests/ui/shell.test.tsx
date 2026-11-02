import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { SiteFooter } from '@/components/site-footer';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { ProOpenButton, ProProvider } from '@/components/pro/pro-modal';
import { SiteHeader } from '@/components/site-header';
import { en } from '@/lib/i18n/dictionaries/en';
import { uz } from '@/lib/i18n/dictionaries/uz';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }), usePathname: () => '/' }));
vi.mock('@/app/language-actions', () => ({ setLanguageAction: async () => {} }));
vi.mock('@/app/auth-actions', () => ({ logoutParticipant: async () => {} }));

const render = (node: React.ReactNode, lang: 'uz' | 'en' = 'uz') =>
  renderToStaticMarkup(
    <I18nProvider lang={lang} dict={lang === 'uz' ? uz : en}>
      <ProProvider>{node}</ProProvider>
    </I18nProvider>,
  );

describe('navbar va footer', () => {
  it("navbar: bo'limlar, faol sahifa belgisi va mobil menyu tugmasi", () => {
    const out = render(<SiteHeader active="history" />);
    for (const href of ['/exams', '/history', '/mistakes', '/dtm']) expect(out).toContain(`href="${href}"`);
    expect(out).toContain('aria-current="page"');
    expect(out).toContain(`aria-label="${uz.nav.menu}"`);
  });

  it("kirgan ishtirokchiga dumaloq chiqish tugmasi ko'rsatiladi, aks holda yo'q", () => {
    expect(render(<SiteHeader signedIn />)).toContain(`aria-label="${uz.nav.logout}"`);
    expect(render(<SiteHeader />)).not.toContain(`aria-label="${uz.nav.logout}"`);
  });

  it("minimal navbar bo'limlar menyusisiz", () => {
    const out = render(<SiteHeader minimal />);
    expect(out).not.toContain('href="/history"');
  });

  it("yagona footer: huquqlar, ogohlantirish belgisi (warn fon) va maxfiylik; boshqa havolalar yo'q", () => {
    const out = render(<SiteFooter year={2026} />, 'en');
    expect(out).toContain('href="/privacy"');
    expect(out).toContain('2026');
    expect(out).toContain(en.footer.disclaimer);
    expect(out).toContain('bg-warn-soft');
    expect(out).not.toContain('href="/dtm"');
    expect(out).not.toContain('href="/mistakes"');
  });

  it("til almashtirgich ixcham: bayroq va qisqa kod (UZ), ro'yxat yopiq", () => {
    const out = render(<LangSwitcher />);
    expect(out).toContain('>UZ<');
    expect(out).toContain('aria-haspopup="listbox"');
    expect(out).not.toContain('Qaraqalpaqsha');
    expect(render(<LangSwitcher />, 'en')).toContain('>EN<');
  });

  it("Pro obuna: navbarda tugma bor; oyna matni (nima ochiladi, 9 variant va 405 test) tayyor, havola bo'lmasa CTA yo'q", () => {
    const out = render(<SiteHeader />).replaceAll('&#x27;', "'");
    expect(out).toContain(`aria-label="${uz.pro.nav}"`);
    for (const text of [uz.pro.i1, uz.pro.i2, uz.pro.i3, uz.pro.i4, uz.pro.i5]) expect(out).toContain(text);
    expect(out).toContain('>405<');
    expect(out).toContain('>9<');
    expect(out).not.toContain(uz.pro.cta);
  });

  it('ProOpenButton oyna ochuvchi tugma sifatida chiziladi', () => {
    const out = render(<ProOpenButton className="x">{uz.pro.cardButton}</ProOpenButton>);
    expect(out).toContain(uz.pro.cardButton);
  });
});
