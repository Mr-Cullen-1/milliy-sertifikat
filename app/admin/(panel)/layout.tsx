import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/auth/admin';
import { adminLogoutAction } from '../actions';

const NAV = [
  { href: '/admin', label: 'Boshqaruv' },
  { href: '/admin/exams', label: 'Imtihonlar' },
  { href: '/admin/questions', label: 'Savollar' },
  { href: '/admin/import', label: 'Yuklash' },
  { href: '/admin/attempts', label: 'Natijalar' },
  { href: '/admin/participants', label: 'Ishtirokchilar' },
  { href: '/admin/audit', label: 'Audit' },
] as const;

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b-2 border-line bg-white">
        <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-heading text-[18px] font-semibold text-ink">
            Admin · Milliy sertifikat
          </Link>
          <div className="flex items-center gap-4 text-[15px] font-bold text-muted">
            <span>
              {admin.email} · <span className="text-brand-ink">{admin.role === 'admin' ? 'admin' : 'muharrir'}</span>
            </span>
            <form action={adminLogoutAction}>
              <button type="submit" className="font-extrabold text-accent underline underline-offset-4">
                Chiqish
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Admin" className="mx-auto flex w-full max-w-[1280px] flex-wrap gap-x-5 gap-y-1 px-4 pb-2">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-[16px] font-extrabold text-muted hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-6 px-4 py-6">{children}</main>
    </div>
  );
}
