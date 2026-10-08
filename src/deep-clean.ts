export const DEEP_CLEAN_MINUTES = 60;

const MINUTE = 60_000;
// Disagreement with the sensor that is tolerated before the local timer is corrected.
export const SYNC_TOLERANCE_MS = 2 * MINUTE;
// A finished or interrupted clean stays on screen this long unless dismissed first.
export const RESULT_DISPLAY_MS = 10 * MINUTE;

export type DeepCleanPhase = "idle" | "running" | "complete" | "interrupted";

export interface DeepCleanInput {
  minutesRemaining: number | null;
  changedAt: number | null;
  failure: string | null;
}

export interface DeepCleanView {
  phase: DeepCleanPhase;
  secondsRemaining: number;
  endsAt: number;
  reason: string | null;
}

interface Session {
  endsAt: number;
  phase: Exclude<DeepCleanPhase, "idle">;
  reason: string | null;
  finishedAt: number | null;
  dismissed: boolean;
}

const IDLE: DeepCleanView = { phase: "idle", secondsRemaining: 0, endsAt: 0, reason: null };

function sensorRunning(minutes: number | null): minutes is number {
  return minutes !== null && minutes < DEEP_CLEAN_MINUTES;
}

// The cycle always lasts exactly 60 minutes, so once a clean is seen the card runs its own timer and
// only consults the sensor to catch large drift, an early stop, a fault, or a mismatch at the end.
export class DeepCleanTracker {
  private session: Session | null = null;

  update({ minutesRemaining: minutes, changedAt, failure }: DeepCleanInput, now: number): DeepCleanView {
    if (!this.session) {
      if (!sensorRunning(minutes)) return IDLE;
      const endsAt = (changedAt ?? now) + minutes * MINUTE;
      // A sensor parked below 60 long after its clean ended is not a new clean.
      if (now - endsAt > RESULT_DISPLAY_MS) return IDLE;
      this.session = { endsAt, phase: "running", reason: null, finishedAt: null, dismissed: false };
    }

    const session = this.session;

    if (!sensorRunning(minutes)) {
      if (session.phase === "running") {
        if (session.endsAt - now > SYNC_TOLERANCE_MS) this.finish("interrupted", now, "The deep clean stopped early.");
        else this.finish("complete", now);
      }
      if (session.dismissed) {
        this.session = null;
        return IDLE;
      }
    }

    if (session.phase === "running") {
      if (failure) {
        this.finish("interrupted", now, failure);
      } else if (now >= session.endsAt) {
        const sensorEndsAt = sensorRunning(minutes) && changedAt !== null ? changedAt + minutes * MINUTE : null;
        if (sensorEndsAt !== null && sensorEndsAt - now > SYNC_TOLERANCE_MS) session.endsAt = sensorEndsAt;
        else this.finish("complete", now);
      } else if (sensorRunning(minutes) && changedAt !== null) {
        const sensorEndsAt = changedAt + minutes * MINUTE;
        if (Math.abs(sensorEndsAt - session.endsAt) > SYNC_TOLERANCE_MS) session.endsAt = sensorEndsAt;
      }
    }

    if (session.finishedAt !== null && now - session.finishedAt > RESULT_DISPLAY_MS) session.dismissed = true;
    if (session.dismissed) return IDLE;

    return {
      phase: session.phase,
      secondsRemaining: session.phase === "running" ? Math.max(0, Math.ceil((session.endsAt - now) / 1000)) : 0,
      endsAt: session.endsAt,
      reason: session.reason,
    };
  }

  dismiss(): void {
    if (this.session && this.session.phase !== "running") this.session.dismissed = true;
  }

  private finish(phase: "complete" | "interrupted", now: number, reason: string | null = null): void {
    if (!this.session) return;
    this.session.phase = phase;
    this.session.reason = reason;
    this.session.finishedAt = now;
    if (phase === "complete") this.session.endsAt = Math.min(this.session.endsAt, now);
  }
}

export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
