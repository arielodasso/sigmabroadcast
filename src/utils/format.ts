/**
 * Small shared formatting helpers for clocks and ratios.
 */

export function formatClock(clockMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(clockMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatMeters(value: number): string {
  return `${value.toFixed(1)} m`;
}
