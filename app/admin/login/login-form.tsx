'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { adminLoginAction, type LoginState } from '../actions';

const input =
  'w-full rounded-2xl border-2 border-b-[5px] border-line bg-white px-4 py-3.5 text-[18px] font-bold text-ink outline-none focus:border-accent';

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(adminLoginAction, {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[16px] font-extrabold text-ink">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={input} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[16px] font-extrabold text-ink">
          Parol
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={input} />
      </div>
      {state.error && (
        <p role="alert" className="text-[16px] font-bold text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Tekshirilmoqda…' : 'Kirish'}
      </Button>
    </form>
  );
}
