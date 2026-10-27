import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary';

// Figma B/"O'yin": qalin pastki chegarali "bosiladigan" tugma (Button/primary/*).
const base =
  'inline-flex h-14 items-center justify-center rounded-2xl border-2 border-b-[5px] px-6 text-[19px] font-extrabold ' +
  'transition-[transform,filter] active:translate-y-[3px] active:border-b-2 disabled:translate-y-0 disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const variants: Record<Variant, string> = {
  primary:
    'border-brand-edge bg-brand text-white hover:brightness-105 ' +
    'disabled:border-disabled-edge disabled:bg-disabled-bg disabled:text-faint disabled:hover:brightness-100',
  secondary:
    'border-line-strong bg-white text-ink hover:bg-surface disabled:text-faint',
};

export function buttonClass(variant: Variant = 'primary', extra = ''): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
