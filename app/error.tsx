'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useT } from '@/components/i18n/provider';
import { Button, buttonClass } from '@/components/ui/button';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-4 px-4 py-10">
      <h1 className="font-heading text-[32px] leading-[40px] font-semibold text-ink">{t('errors.errorTitle')}</h1>
      <p className="text-[19px] leading-7 font-semibold text-muted">{t('errors.errorLead')}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={reset}>{t('common.retry')}</Button>
        <Link href="/" className={buttonClass('secondary')}>
          {t('common.home')}
        </Link>
      </div>
    </main>
  );
}
