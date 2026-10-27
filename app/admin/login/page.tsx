import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth/admin';
import { AdminLoginForm } from './login-form';

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect('/admin');
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-[15px] font-extrabold text-brand-ink">Milliy sertifikat · Admin</p>
        <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink">Boshqaruv paneliga kirish</h1>
        <p className="text-[16px] leading-6 font-semibold text-muted">Faqat platforma ma&apos;muriyati uchun.</p>
      </header>
      <AdminLoginForm />
    </main>
  );
}
