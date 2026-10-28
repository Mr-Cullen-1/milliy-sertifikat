import { redirect } from 'next/navigation';
import { Art } from '@/components/art';
import { getAdmin } from '@/lib/auth/admin';
import { AdminLoginForm } from './login-form';

const FEATURES = [
  'Ishtirokchilar va natijalar statistikasi',
  'Variantlarni ochish va yopish (nashr, arxiv)',
  "Savollarni JSON orqali yuklash va ko'rish",
  "Audit jurnali va har savol bo'yicha natijalar",
];

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect('/admin');
  return (
    <div className="flex min-h-dvh flex-col lg:h-dvh lg:overflow-hidden">
      <main className="mx-auto grid w-full max-w-[1100px] flex-1 content-center items-center gap-8 px-4 py-8 sm:px-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-16 lg:overflow-y-auto">
        <section className="flex flex-col gap-5">
          <p className="text-[15px] font-extrabold text-brand-ink">Milliy sertifikat · Admin</p>
          <h1 className="font-heading text-[34px] leading-[42px] font-semibold text-ink lg:text-[44px] lg:leading-[52px]">Boshqaruv paneliga kirish</h1>
          <p className="max-w-[480px] text-[17px] leading-7 font-semibold text-muted">Faqat platforma ma&apos;muriyati uchun.</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl border-2 border-b-[5px] border-line-strong bg-white px-4 py-3 shadow-card">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-brand text-[14px] font-black text-white">{i + 1}</span>
                <span className="text-[15px] leading-6 font-bold text-ink">{f}</span>
              </li>
            ))}
          </ul>
          <Art name="mascot-laptop" width={150} className="hidden lg:block" />
        </section>
        <section className="rounded-3xl border-2 border-b-[6px] border-line-strong bg-white p-5 shadow-card sm:p-6">
          <AdminLoginForm />
        </section>
      </main>
    </div>
  );
}
