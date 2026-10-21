/**
 * Broadcast timecodes.
 *
 * Sigma Broadcast keeps two clocks apart (SPEC §7):
 *
 * - the *absolute* clock counts every simulated millisecond from kickoff,
 *   including the half-time interval;
 * - the *match clock* restarts at zero in each period, exactly like the clock
 *   a viewer sees on a real broadcast.
 *
 * Every timed artefact of the export carries both, plus a broadcast
 * timecode such as `1H 08:42`.
 */

export interface MatchClock {
  period: 1 | 2;
  clockMs: number;
  timecode: string;
}

export interface ClockLayout {
  periodDurationMs: number;
  halftimeDurationMs: number;
}

/** Renders a broadcast timecode such as `2H 00:00`. */
export function formatTimecode(period: 1 | 2, clockMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(clockMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${period}H ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Converts an absolute simulated timestamp into the match clock a viewer
 * would read.
 *
 * During the half-time interval the match clock is frozen at the end of the
 * first period, which is how a real broadcast behaves.
 */
export function absoluteToMatchClock(
  absoluteMs: number,
  layout: ClockLayout,
): MatchClock {
  const clamped = Math.max(0, absoluteMs);
  const p1End = layout.periodDurationMs;
  const p2Start = p1End + layout.halftimeDurationMs;

  if (clamped < p1End) {
    return {
      period: 1,
      clockMs: clamped,
      timecode: formatTimecode(1, clamped),
    };
  }
  if (clamped < p2Start) {
    return {
      period: 1,
      clockMs: p1End,
      timecode: formatTimecode(1, p1End),
    };
  }
  const clockMs = clamped - p2Start;
  return {
    period: 2,
    clockMs,
    timecode: formatTimecode(2, clockMs),
  };
}
