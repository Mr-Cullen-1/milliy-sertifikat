const xmlEscape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);

/**
 * Ekran tasvirini olib tarqatishni qiyinlashtirish uchun: ishtirokchi ismi bilan xira diagonal suv belgisi.
 * Bosishga xalaqit bermaydi, ekran o'qish dasturlariga ko'rinmaydi.
 */
export function Watermark({ text }: { text: string }) {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='270'>` +
    `<text x='30' y='145' transform='rotate(-24 210 135)' font-family='sans-serif' font-size='15' font-weight='700' ` +
    `fill='#1e1b39' fill-opacity='0.045'>${xmlEscape(text)}</text></svg>`;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-20 select-none"
      style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")` }}
    />
  );
}
