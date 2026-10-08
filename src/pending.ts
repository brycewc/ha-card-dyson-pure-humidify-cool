interface PendingEntry {
  value: unknown;
  timer: ReturnType<typeof setTimeout>;
}

export class PendingStore {
  private readonly entries = new Map<string, PendingEntry>();

  constructor(private readonly onExpire: () => void) {}

  set(key: string, value: unknown, ttlMs = 15_000): void {
    this.clear(key);
    const timer = setTimeout(() => {
      this.entries.delete(key);
      this.onExpire();
    }, ttlMs);
    this.entries.set(key, { value, timer });
  }

  get<T>(key: string): T | undefined {
    return this.entries.get(key)?.value as T | undefined;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  value<T>(key: string, actual: T): T {
    return this.has(key) ? (this.get<T>(key) as T) : actual;
  }

  clear(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    this.entries.delete(key);
  }

  reconcile(actuals: Record<string, unknown>, equals: (key: string, pending: unknown, actual: unknown) => boolean): void {
    for (const [key, entry] of this.entries) {
      if (key in actuals && equals(key, entry.value, actuals[key])) this.clear(key);
    }
  }

  get size(): number {
    return this.entries.size;
  }

  dispose(): void {
    for (const key of [...this.entries.keys()]) this.clear(key);
  }
}
