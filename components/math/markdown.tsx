import 'katex/dist/katex.min.css';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

// Tugma/yorliq ichida <p> bo'lmasligi uchun (yaroqsiz HTML ichma-ichligi).
const inlineComponents: Components = { p: ({ children }) => <span className="block">{children}</span> };

/**
 * Markdown + KaTeX ($...$, $$...$$). Xom HTML render qilinmaydi (react-markdown standarti),
 * KaTeX `trust` o'chiq, shuning uchun admin kiritgan matn xavfsiz.
 */
export function Markdown({ children, inline = false, className = '' }: { children: string; inline?: boolean; className?: string }) {
  return (
    <div className={`math-md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={inline ? inlineComponents : undefined}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
