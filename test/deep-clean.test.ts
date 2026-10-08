import { describe, expect, it } from "vitest";
import { DeepCleanTracker, RESULT_DISPLAY_MS, formatCountdown } from "../src/deep-clean";

const MIN = 60_000;
const T0 = 1_700_000_000_000;
const input = (minutesRemaining: number | null, changedAt: number | null, failure: string | null = null) => ({
  minutesRemaining,
  changedAt,
  failure,
});

describe("DeepCleanTracker", () => {
  it("stays idle while the sensor reads 60", () => {
    expect(new DeepCleanTracker().update(input(60, T0), T0).phase).toBe("idle");
  });

  it("runs its own 60 minute timer without further sensor updates", () => {
    const tracker = new DeepCleanTracker();
    expect(tracker.update(input(59, T0), T0)).toMatchObject({ phase: "running", secondsRemaining: 59 * 60 });
    expect(tracker.update(input(59, T0), T0 + 30 * MIN)).toMatchObject({ phase: "running", secondsRemaining: 29 * 60 });
  });

  it("ignores small differences from the sensor", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    const view = tracker.update(input(30, T0 + 29.5 * MIN), T0 + 30 * MIN);
    expect(view.secondsRemaining).toBe(29 * 60);
  });

  it("corrects large drift from the sensor", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(50, T0 + 5 * MIN), T0 + 5 * MIN).secondsRemaining).toBe(50 * 60);
  });

  it("completes when the timer ends and the sensor agrees", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(1, T0 + 58 * MIN), T0 + 59 * MIN)).toMatchObject({ phase: "complete", endsAt: T0 + 59 * MIN });
  });

  it("keeps running at the end if the sensor says there is clearly more to go", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(10, T0 + 58 * MIN), T0 + 59 * MIN)).toMatchObject({ phase: "running", secondsRemaining: 9 * 60 });
  });

  it("completes when the sensor returns to 60 near the end", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(60, T0 + 58.5 * MIN), T0 + 58.5 * MIN).phase).toBe("complete");
  });

  it("reports an early stop as interrupted", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(60, T0 + 20 * MIN), T0 + 20 * MIN)).toMatchObject({
      phase: "interrupted",
      reason: "The deep clean stopped early.",
    });
  });

  it("reports a device fault as interrupted with its message", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    expect(tracker.update(input(40, T0 + 19 * MIN, "Motor fault."), T0 + 20 * MIN)).toMatchObject({
      phase: "interrupted",
      reason: "Motor fault.",
    });
  });

  it("stays dismissed while the sensor is parked, then tracks the next clean", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    tracker.update(input(0, T0 + 59 * MIN), T0 + 59 * MIN);
    tracker.dismiss();
    expect(tracker.update(input(0, T0 + 59 * MIN), T0 + 61 * MIN).phase).toBe("idle");
    expect(tracker.update(input(60, T0 + 62 * MIN), T0 + 62 * MIN).phase).toBe("idle");
    expect(tracker.update(input(59, T0 + 120 * MIN), T0 + 120 * MIN).phase).toBe("running");
  });

  it("clears the result screen on its own after a while", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    tracker.update(input(0, T0 + 59 * MIN), T0 + 59 * MIN);
    expect(tracker.update(input(0, T0 + 59 * MIN), T0 + 59 * MIN + RESULT_DISPLAY_MS + 1).phase).toBe("idle");
  });

  it("does not treat a sensor parked low long after a clean as a new clean", () => {
    expect(new DeepCleanTracker().update(input(0, T0), T0 + 120 * MIN).phase).toBe("idle");
  });

  it("cannot dismiss a clean that is still running", () => {
    const tracker = new DeepCleanTracker();
    tracker.update(input(59, T0), T0);
    tracker.dismiss();
    expect(tracker.update(input(59, T0), T0 + MIN).phase).toBe("running");
  });
});

describe("formatCountdown", () => {
  it("formats as minutes and seconds", () => {
    expect(formatCountdown(36 * 60 - 25)).toBe("35:35");
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(0)).toBe("00:00");
  });
});
