import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingStore } from "../src/pending";

describe("PendingStore", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("overlays a value until the actual state matches", () => {
    const store = new PendingStore(() => {});
    store.set("speed", 7);
    expect(store.value("speed", 4)).toBe(7);
    store.reconcile({ speed: 4 }, (_key, a, b) => a === b);
    expect(store.has("speed")).toBe(true);
    store.reconcile({ speed: 7 }, (_key, a, b) => a === b);
    expect(store.value("speed", 7)).toBe(7);
    expect(store.has("speed")).toBe(false);
  });

  it("expires and notifies the host", () => {
    const onExpire = vi.fn();
    const store = new PendingStore(onExpire);
    store.set("power", true, 1000);
    vi.advanceTimersByTime(1001);
    expect(store.has("power")).toBe(false);
    expect(onExpire).toHaveBeenCalledOnce();
  });
});
