import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveQueue, type PendingSave, type QueueStatus, type SaveOutcome, type StorageLike } from '../../lib/exam/save-queue';

const OK: SaveOutcome = { ok: true, serverNow: '2026-01-01T00:00:00Z' };
const NET: SaveOutcome = { ok: false, code: 'network' };

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => void (data[k] = v),
    removeItem: (k) => void delete data[k],
  };
}

function setup(send: (s: PendingSave) => Promise<SaveOutcome>, extra: { storage?: StorageLike } = {}) {
  const statuses: QueueStatus[] = [];
  const queue = new SaveQueue({
    send,
    storage: extra.storage,
    storageKey: 'k',
    debounceMs: 600,
    retryDelaysMs: [1000, 2000],
    onStatus: (s) => statuses.push(s),
  });
  return { queue, statuses };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('SaveQueue', () => {
  it('debounce: 600 ms dan keyin bitta yuboradi, o\'sha savolning o\'zgarishlari birlashadi', async () => {
    const send = vi.fn().mockResolvedValue(OK);
    const { queue, statuses } = setup(send);

    queue.enqueue({ questionId: 'q1', value: { a: '1' } });
    queue.enqueue({ questionId: 'q1', value: { a: '12' } });
    queue.enqueue({ questionId: 'q1', flagged: true });
    await vi.advanceTimersByTimeAsync(599);
    expect(send).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ questionId: 'q1', value: { a: '12' }, flagged: true });
    expect(statuses.at(-1)).toBe('idle');
    expect(queue.pendingCount).toBe(0);
  });

  it('flush() debounce\'ni kutmaydi va navbat bo\'shaganini bildiradi', async () => {
    const send = vi.fn().mockResolvedValue(OK);
    const { queue } = setup(send);
    queue.enqueue({ questionId: 'a', value: 'A' });
    queue.enqueue({ questionId: 'b', value: 'B' });
    await expect(queue.flush()).resolves.toBe(true);
    expect(send.mock.calls.map((c) => c[0].questionId)).toEqual(['a', 'b']);
  });

  it('tarmoq uzilsa oflayn bo\'ladi, javob saqlanadi va qayta urinish bilan yuboriladi', async () => {
    const send = vi.fn().mockResolvedValueOnce(NET).mockResolvedValue(OK);
    const { queue, statuses } = setup(send);

    queue.enqueue({ questionId: 'q1', value: 'B' });
    await expect(queue.flush()).resolves.toBe(false);
    expect(statuses.at(-1)).toBe('offline');
    expect(queue.pendingCount).toBe(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(queue.pendingCount).toBe(0);
    expect(statuses.at(-1)).toBe('idle');
  });

  it('qayta urinish oraliqlari o\'sadi va retryNow() kutmaydi', async () => {
    const send = vi.fn().mockResolvedValue(NET);
    const { queue } = setup(send);
    queue.enqueue({ questionId: 'q1', value: 'A' });
    await queue.flush(); // 1-urinish
    await vi.advanceTimersByTimeAsync(1000); // 2-urinish, keyingi kutish 2000
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1999);
    expect(send).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(3);

    send.mockResolvedValue(OK);
    await expect(queue.retryNow()).resolves.toBe(true);
  });

  it('uzilish paytida kiritilgan yangi qiymat eskisini bosadi', async () => {
    let calls = 0;
    const sent: PendingSave[] = [];
    const send = vi.fn(async (s: PendingSave): Promise<SaveOutcome> => {
      sent.push(s);
      calls += 1;
      if (calls === 1) {
        // birinchi yuborish davomida talaba javobni o'zgartirdi
        queue.enqueue({ questionId: 'q1', value: 'C' });
        return NET;
      }
      return OK;
    });
    const { queue } = setup(send);

    queue.enqueue({ questionId: 'q1', value: 'B', flagged: true });
    await queue.flush();
    await queue.retryNow();

    expect(sent[1]).toEqual({ questionId: 'q1', value: 'C', flagged: true });
    expect(queue.pendingCount).toBe(0);
  });

  it('yuborish davomida kelgan o\'zgarish yo\'qolmaydi (muvaffaqiyatda ham)', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const sent: unknown[] = [];
    const send = vi.fn(async (s: PendingSave): Promise<SaveOutcome> => {
      sent.push(s.value);
      if (sent.length === 1) await gate;
      return OK;
    });
    const { queue } = setup(send);

    queue.enqueue({ questionId: 'q1', value: 'A' });
    const flushing = queue.flush();
    await vi.advanceTimersByTimeAsync(0);
    queue.enqueue({ questionId: 'q1', value: 'B' });
    release();
    await flushing;
    await queue.flush();

    expect(sent).toEqual(['A', 'B']);
  });

  it('muddat tugagan/attempt yopilgan: navbat to\'xtaydi va keyingi o\'zgarishlar qabul qilinmaydi', async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, code: 'closed' } satisfies SaveOutcome);
    const { queue, statuses } = setup(send);
    queue.enqueue({ questionId: 'q1', value: 'A' });
    queue.enqueue({ questionId: 'q2', value: 'B' });
    await queue.flush();

    expect(statuses.at(-1)).toBe('closed');
    expect(queue.isClosed).toBe(true);
    expect(queue.pendingCount).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);

    queue.enqueue({ questionId: 'q3', value: 'C' });
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('yaroqsiz yozuv tashlanadi, qolganlari yuboriladi', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, code: 'invalid' } satisfies SaveOutcome)
      .mockResolvedValue(OK);
    const { queue } = setup(send);
    queue.enqueue({ questionId: 'bad', value: 'x' });
    queue.enqueue({ questionId: 'good', value: 'A' });
    await expect(queue.flush()).resolves.toBe(true);
    expect(send.mock.calls.map((c) => c[0].questionId)).toEqual(['bad', 'good']);
  });

  it('send xato otsa tarmoq xatosi deb hisoblanadi', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValue(OK);
    const { queue, statuses } = setup(send);
    queue.enqueue({ questionId: 'q1', value: 'A' });
    await queue.flush();
    expect(statuses.at(-1)).toBe('offline');
    await vi.advanceTimersByTimeAsync(1000);
    expect(queue.pendingCount).toBe(0);
  });

  it('kutilayotgan javoblar saqlanadi va sahifa qayta ochilganda tiklanadi', async () => {
    const storage = memoryStorage();
    const first = setup(vi.fn().mockResolvedValue(NET), { storage });
    first.queue.enqueue({ questionId: 'q1', value: { a: '3/4' }, flagged: true });
    await first.queue.flush();
    first.queue.dispose();
    expect(JSON.parse(storage.data.k!)).toEqual([{ questionId: 'q1', value: { a: '3/4' }, flagged: true }]);

    const send = vi.fn().mockResolvedValue(OK);
    const second = setup(send, { storage });
    expect(second.queue.pendingCount).toBe(1);
    await expect(second.queue.flush()).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith({ questionId: 'q1', value: { a: '3/4' }, flagged: true });
    expect(storage.data.k).toBeUndefined();
  });

  it('buzuq saqlangan ma\'lumot yoki ishlamaydigan xotira ilovani yiqitmaydi', async () => {
    const broken = memoryStorage({ k: '{not json' });
    expect(() => setup(vi.fn().mockResolvedValue(OK), { storage: broken })).not.toThrow();

    const failing: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('quota');
      },
    };
    const send = vi.fn().mockResolvedValue(OK);
    const { queue } = setup(send, { storage: failing });
    queue.enqueue({ questionId: 'q1', value: 'A' });
    await expect(queue.flush()).resolves.toBe(true);
  });

  it('dispose() taymerlarni to\'xtatadi', async () => {
    const send = vi.fn().mockResolvedValue(OK);
    const { queue } = setup(send);
    queue.enqueue({ questionId: 'q1', value: 'A' });
    queue.dispose();
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).not.toHaveBeenCalled();
    expect(queue.pendingCount).toBe(1);
  });
});
