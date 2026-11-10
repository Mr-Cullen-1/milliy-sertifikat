'use client';

import { useEffect, useRef } from 'react';

/**
 * Klaviatura yorliqlari yozish maydonida, ochiq modal oynada, modifikator (Ctrl/Alt/Meta) bosilganda
 * va tugma ushlab turilganda (takrorlanuvchi hodisa) ishlamaydi.
 */
export function isShortcutBlocked(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return true;
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return true;
  return !!document.querySelector('dialog[open]');
}

/** Harf tugmasi: `e.code` ("KeyA") klaviatura tilidan (lotin/kirill) mustaqil. Qaytaradi: "A" yoki null. */
export function letterOf(e: KeyboardEvent): string | null {
  const m = /^Key([A-Z])$/.exec(e.code);
  return m ? m[1]! : null;
}

/** Har renderda eng so'nggi `handler` ishlatiladi; tinglovchi bir marta o'rnatiladi. */
export function useShortcut(handler: (e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!isShortcutBlocked(e)) ref.current(e);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
}
