import { PageShell } from './page-shell';

/** Yuklanish holati uchun bo'sh joy (Suspense fallback): navbar va footer darrov chiqadi, kontent o'rni pulsatsiya qiladi. */
export function BlockSkeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`flex w-full flex-col gap-4 ${className}`}>
      <div className="h-[132px] animate-pulse rounded-3xl border-2 border-line bg-white/70" />
      <div className="h-[220px] animate-pulse rounded-3xl border-2 border-line bg-white/70" />
    </div>
  );
}

export function PageSkeleton({ active, minimal = false }: { active?: 'exams' | 'history' | 'mistakes' | 'dtm'; minimal?: boolean }) {
  return (
    <PageShell active={active} minimal={minimal}>
      <main className="mx-auto flex w-full max-w-[860px] flex-1 flex-col px-4 py-10">
        <BlockSkeleton />
      </main>
    </PageShell>
  );
}
