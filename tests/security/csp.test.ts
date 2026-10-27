import { describe, expect, it } from 'vitest';
import { buildCsp, parseFrameAncestors } from '../../lib/security/csp';

describe('parseFrameAncestors', () => {
  it('standart: faqat o\'zi', () => {
    expect(parseFrameAncestors(undefined)).toBe("'self'");
    expect(parseFrameAncestors('')).toBe("'self'");
  });

  it('yaroqli https manzillarni qo\'shadi, qolganini tashlaydi', () => {
    const out = parseFrameAncestors("https://lms.example.uz https://*.example.uz http://insecure.uz javascript:alert(1) https://a.b;c * 'none' https://x.uz:8443");
    expect(out).toBe("'self' https://lms.example.uz https://*.example.uz https://x.uz:8443");
  });
});

describe('buildCsp', () => {
  const prod = buildCsp({ nonce: 'abc123', isDev: false, frameAncestors: "'self'" });

  it('skriptlar faqat nonce bilan (unsafe-inline yo\'q)', () => {
    expect(prod).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(prod).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(prod).not.toMatch(/script-src[^;]*unsafe-eval/);
  });

  it('muhim direktivalar', () => {
    for (const d of ["default-src 'self'", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", 'upgrade-insecure-requests', "img-src 'self' data: blob:"]) {
      expect(prod).toContain(d);
    }
    expect(prod).toContain("style-src 'self' 'nonce-abc123'");
    expect(prod).toContain("style-src-attr 'unsafe-inline'");
    expect(prod).toContain("connect-src 'self'");
    expect(prod).not.toMatch(/connect-src[^;]*https?:/);
  });

  it('dev: eval va websocket ruxsat, upgrade-insecure-requests yo\'q', () => {
    const dev = buildCsp({ nonce: 'n', isDev: true, frameAncestors: "'self'" });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain('ws:');
    expect(dev).not.toContain('upgrade-insecure-requests');
  });

  it('iframe ruxsat etilgan ichki platforma manzili', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false, frameAncestors: parseFrameAncestors('https://lms.example.uz') });
    expect(csp).toContain("frame-ancestors 'self' https://lms.example.uz");
  });
});
