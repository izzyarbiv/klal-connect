// The Shabbos/Yom Tov gate decision, kept pure and dependency-free so it can be
// tested directly. Everything that decides whether the app is usable during
// Shabbos lives here.

/**
 * Decide the gate from the clock and the absolute boundaries, not from the
 * server's `isRestricted` boolean — that boolean is as old as the last poll,
 * which can be 60s or, after a freeze, hours.
 *
 * @returns 'restricted' | 'open' | 'no-location' | 'unknown'
 */
export function shabbosState(status, now = Date.now()) {
  if (!status) return "unknown";
  if (status.adminOverride) return "open";
  if (status.hasLocation === false) return "no-location";

  const { startsAt, endsAt } = status;
  if (startsAt != null && endsAt != null) {
    if (now >= startsAt && now < endsAt) return "restricted";
    // Before the next window starts, we positively know it has not begun.
    if (now < startsAt) return "open";
    // Past the last window we were told about, we know nothing about the next
    // one. Unverified must mean locked, never unlocked.
    return "unknown";
  }
  return status.isRestricted ? "restricted" : "open";
}
