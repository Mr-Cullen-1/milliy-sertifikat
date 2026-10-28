import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/components/i18n/provider';
import { SiteFooter } from '@/components/site-footer';
import { LangSwitcher } from '@/components/i18n/lang-switcher';
import { SiteHeader } from '@/components/site-header';
import { en } from '@/lib/i18n/dictionaries/en';
import { uz } from '@/lib/i18n/dictionaries/uz';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }), usePathname: () => '/' }));
vi.mock('@/app/language-actions', () => ({ setLanguageAction: async () => {} }));
vi.mock('@/app/auth-actions', () => ({ logoutParticipant: async () => {} }));

const render = (node: React.ReactNode, lang: 'uz' | 'en' = 'uz') =>
  renderToStaticMarkup(
    <I18nProvider lang={lang} dict={lang === 'uz' ? uz : en}>
      {node}
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

  it("to'liq footer: maxfiylik, ogohlantirish va yil; bo'limlar navigatsiyasi yo'q (navbarda bor)", () => {
    const out = render(<SiteFooter year={new Date().getFullYear()} />, 'en');
    expect(out).toContain('href="/privacy"');
    expect(out).not.toContain('href="/dtm"');
    expect(out).toContain(en.footer.disclaimer);
    expect(out).toContain(String(new Date().getFullYear()));
  });

  it("ixcham footer bitta qatorda, bo'limlar ro'yxatisiz", () => {
    const out = render(<SiteFooter year={2026} compact />);
    expect(out).toContain('href="/privacy"');
    expect(out).not.toContain('href="/mistakes"');
  });

  it("til almashtirgich ixcham: bayroq va qisqa kod (UZ), ro'yxat yopiq", () => {
    const out = render(<LangSwitcher />);
    expect(out).toContain('>UZ<');
    expect(out).toContain('aria-haspopup="listbox"');
    expect(out).not.toContain('Qaraqalpaqsha');
    expect(render(<LangSwitcher />, 'en')).toContain('>EN<');
  });
});
