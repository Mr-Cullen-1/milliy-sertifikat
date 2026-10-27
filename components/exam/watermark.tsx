const xmlEscape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/**
 * Ekran tasvirini olib tarqatishni qiyinlashtirish uchun: ishtirokchi ismi bilan xira diagonal suv belgisi.
 * Bosishga xalaqit bermaydi, ekran o'qish dasturlariga ko'rinmaydi.
 */
export function Watermark({ text }: { text: string }) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='210'>` +
    `<text x='24' y='115' transform='rotate(-24 170 105)' font-family='sans-serif' font-size='16' font-weight='700' ` +
    `fill='#1e1b39' fill-opacity='0.065'>${xmlEscape(text)}</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 select-none"
      style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")` }}
    />
  );
}
