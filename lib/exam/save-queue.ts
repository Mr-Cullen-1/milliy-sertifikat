// Javoblarni avto-saqlash navbati: har savol uchun eng so'nggi qiymat yuboriladi (coalescing),
// tarmoq uzilsa localStorage'da saqlanadi va qayta uriniladi, muddat/yopilish xatosida to'xtaydi.

export interface PendingSave {
  questionId: string;
  /** undefined = o'zgartirilmaydi */
  value?: unknown;
  flagged?: boolean;
  timeSpent?: number;
}

export type SaveOutcome =
  | { ok: true; serverNow?: string; deadlineAt?: string }
  | { ok: false; code: 'network' | 'closed' | 'invalid'; message?: string };

export type QueueStatus = 'idle' | 'saving' | 'offline' | 'closed';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveQueueOptions {
  send: (save: PendingSave) => Promise<SaveOutcome>;
  storage?: StorageLike;
  storageKey?: string;
  debounceMs?: number;
  retryDelaysMs?: number[];
  onStatus?: (status: QueueStatus, pending: number) => void;
  onSaved?: (outcome: Extract<SaveOutcome, { ok: true }>) => void;
}

const FIELDS = ['value', 'flagged', 'timeSpent'] as const;

/** patch'dagi aniqlangan maydonlar base'dagini bosadi; undefined "o'zgartirmaslik" demak. */
function merge(base: PendingSave, patch: PendingSave): PendingSave {
  const out: PendingSave = { ...base };
  for (const f of FIELDS) {
    if (patch[f] !== undefined) Object.assign(out, { [f]: patch[f] });
  }
  return out;
}

export class SaveQueue {
  private pending = new Map<string, PendingSave>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private failures = 0;
  private status: QueueStatus = 'idle';
  private closed = false;

  constructor(private readonly opts: SaveQueueOptions) {
    this.restore();
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  enqueue(save: PendingSave): void {
    if (this.closed) return;
    this.pending.set(save.questionId, merge(this.pending.get(save.questionId) ?? { questionId: save.questionId }, save));
    this.persist();
    this.emit(this.status === 'offline' ? 'offline' : 'saving');
    this.clearTimer('debounceTimer');
    this.debounceTimer = setTimeout(() => void this.flush(), this.opts.debounceMs ?? 600);
  }

  /** Hammasini darhol yuboradi. true = navbat bo'sh. */
  flush(): Promise<boolean> {
    this.clearTimer('debounceTimer');
    this.clearTimer('retryTimer');
    this.running ??= this.drain().finally(() => {
      this.running = null;
    });
    return this.running.then(() => this.pending.size === 0);
  }

  /** Internet qaytganda chaqiriladi. */
  retryNow(): Promise<boolean> {
    return this.flush();
  }

  /** Taymerlarni to'xtatadi (unmount); navbat va saqlangan ma'lumot saqlanadi. */
  dispose(): void {
    this.clearTimer('debounceTimer');
    this.clearTimer('retryTimer');
  }

  private async drain(): Promise<void> {
    while (this.pending.size > 0 && !this.closed) {
      const [questionId, save] = this.pending.entries().next().value as [string, PendingSave];
      // Yuborilayotganda kelgan yangi o'zgarishlar alohida yozuv bo'ladi va yo'qolmaydi.
      this.pending.delete(questionId);
      this.emit('saving');

      let outcome: SaveOutcome;
      try {
        outcome = await this.opts.send(save);
      } catch {
        outcome = { ok: false, code: 'network' };
      }

      if (outcome.ok) {
        this.failures = 0;
        this.persist();
        this.opts.onSaved?.(outcome);
        continue;
      }

      if (outcome.code === 'network') {
        // Eskisini qaytaramiz, lekin undan keyin kelgan yangi qiymatlar ustun.
        this.pending.set(questionId, merge(save, this.pending.get(questionId) ?? { questionId }));
        this.persist();
        this.failures += 1;
        this.emit('offline');
        this.scheduleRetry();
        return;
      }

      if (outcome.code === 'closed') {
        this.closed = true;
        this.pending.clear();
        this.persist();
        this.emit('closed');
        return;
      }
      // 'invalid': bu yozuv hech qachon qabul qilinmaydi, tashlab davom etamiz.
      this.persist();
    }
    this.emit(this.closed ? 'closed' : this.pending.size === 0 ? 'idle' : this.status);
  }

  private scheduleRetry(): void {
    const delays = this.opts.retryDelaysMs ?? [1000, 2000, 4000, 8000, 15000];
    const delay = delays[Math.min(this.failures - 1, delays.length - 1)] ?? 15000;
    this.clearTimer('retryTimer');
    this.retryTimer = setTimeout(() => void this.flush(), delay);
  }

  private emit(status: QueueStatus): void {
    this.status = status;
    this.opts.onStatus?.(status, this.pending.size);
  }

  private clearTimer(name: 'debounceTimer' | 'retryTimer'): void {
    const t = this[name];
    if (t) clearTimeout(t);
    this[name] = null;
  }

  private persist(): void {
    const { storage, storageKey } = this.opts;
    if (!storage || !storageKey) return;
    try {
      if (this.pending.size === 0) storage.removeItem(storageKey);
      else storage.setItem(storageKey, JSON.stringify([...this.pending.values()]));
    } catch {
      // Xotira to'la yoki o'chirilgan: asosiy oqim ishlayveradi.
    }
  }

  private restore(): void {
    const { storage, storageKey } = this.opts;
    if (!storage || !storageKey) return;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return;
      const list = JSON.parse(raw) as PendingSave[];
      if (!Array.isArray(list)) return;
      for (const s of list) {
        if (s && typeof s.questionId === 'string') this.pending.set(s.questionId, s);
      }
    } catch {
      // Buzilgan yozuv e'tiborsiz qoldiriladi.
    }
  }
}
