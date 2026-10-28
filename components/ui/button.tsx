import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'accent';
type Size = 'md' | 'sm';

// Figma B/"O'yin": qalin pastki chegarali "bosiladigan" tugma; ustiga yorug' chiziq va gradient qo'shilgan.
const base =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] font-extrabold ' +
  'tracking-[0.01em] transition-[transform,filter,box-shadow] duration-150 hover:-translate-y-0.5 ' +
  'active:translate-y-[3px] active:border-b-2 active:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const sizes: Record<Size, string> = {
  md: 'h-14 px-6 text-[19px]',
  sm: 'h-11 px-4 text-[16px]',
};

const variants: Record<Variant, string> = {
  primary:
    'border-brand-edge bg-linear-to-b from-[#f57c2b] to-brand text-white [text-shadow:0_1px_0_rgba(120,40,0,0.35)] ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.32),0_10px_18px_-10px_rgba(184,67,6,0.75)] hover:brightness-105 ' +
    'disabled:border-disabled-edge disabled:bg-none disabled:bg-disabled-bg disabled:text-faint disabled:shadow-none ' +
    'disabled:[text-shadow:none] disabled:hover:brightness-100',
  accent:
    'border-[#3a22a8] bg-linear-to-b from-[#7a5bff] to-accent text-white [text-shadow:0_1px_0_rgba(20,10,80,0.35)] ' +
    'shadow-[inset_0_2px_0_rgba(255,255,255,0.28),0_10px_18px_-10px_rgba(75,47,208,0.7)] hover:brightness-105 ' +
    'disabled:border-disabled-edge disabled:bg-none disabled:bg-disabled-bg disabled:text-faint disabled:shadow-none',
  secondary: 'border-line-strong bg-white text-ink shadow-card hover:bg-surface hover:border-accent/40 disabled:text-faint disabled:shadow-none',
};

export function buttonClass(variant: Variant = 'primary', extra = '', size: Size = 'md'): string {
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`.trim();
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button type={type} className={buttonClass(variant, className, size)} {...props} />;
}
