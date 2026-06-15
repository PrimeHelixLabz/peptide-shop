/**
 * Timezone-aware calendar-day helpers for the admin analytics.
 *
 * The dashboard buckets orders into calendar days and labels a chart axis.
 * The query *window* is an absolute instant range (correct regardless of tz),
 * but "which day does this order belong to" is a calendar question that must
 * be answered in the viewer's timezone — otherwise an order placed at
 * 11pm PT (= 6am UTC next day) gets attributed to the wrong day.
 *
 * The admin's browser tz (IANA, e.g. "America/Los_Angeles") is sent to the
 * API and threaded through every bucketing/labeling step so the server and
 * client agree on day boundaries.
 */

/** A calendar day as "YYYY-MM-DD". */
export type DayKey = string

/**
 * The calendar day (in `tz`) that an instant falls on, as "YYYY-MM-DD".
 * en-CA formats as YYYY-MM-DD, which is exactly the key shape we want.
 */
export function dayKeyInTz(instant: Date | string, tz: string): DayKey {
  const date = typeof instant === "string" ? new Date(instant) : instant
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

/**
 * Inclusive list of consecutive day keys from `startKey` to `endKey`.
 * Anchored at noon UTC so a ±1h DST shift can never push the +24h step
 * across a day boundary.
 */
export function eachDayKey(startKey: DayKey, endKey: DayKey): DayKey[] {
  const [sy, sm, sd] = startKey.split("-").map(Number)
  const [ey, em, ed] = endKey.split("-").map(Number)
  let cur = Date.UTC(sy, sm - 1, sd, 12)
  const end = Date.UTC(ey, em - 1, ed, 12)
  const keys: DayKey[] = []
  while (cur <= end) {
    const d = new Date(cur)
    keys.push(formatUtcDayKey(d))
    cur += 24 * 60 * 60 * 1000
  }
  return keys
}

function formatUtcDayKey(d: Date): DayKey {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`
}

/** Shift a day key by a whole number of days. Noon-UTC anchored (DST-safe). */
export function shiftDayKey(key: DayKey, deltaDays: number): DayKey {
  const [y, m, d] = key.split("-").map(Number)
  return formatUtcDayKey(new Date(Date.UTC(y, m - 1, d + deltaDays, 12)))
}

/**
 * The tz offset (in ms) at `instant` for `tz`: wall-clock-as-UTC minus the
 * real UTC instant. e.g. America/Los_Angeles in summer → -7h.
 */
function tzOffsetMs(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant)
  const map: Record<string, number> = {}
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value)
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second
  )
  return asUtc - instant.getTime()
}

/**
 * The absolute instant of midnight (start of day) for `dayKey` in `tz`.
 * Use for "N days ago" style window boundaries so they sit on the admin's
 * local day start rather than 00:00 UTC.
 */
export function zonedDayStart(dayKey: DayKey, tz: string): Date {
  const [y, m, d] = dayKey.split("-").map(Number)
  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0)
  const offset = tzOffsetMs(new Date(utcMidnight), tz)
  return new Date(utcMidnight - offset)
}

/**
 * Parse a "YYYY-MM-DD" day key into a *local* Date at midnight.
 *
 * Use this on the client instead of `new Date("2026-06-09")` — the latter
 * parses date-only strings as UTC midnight, which then renders a day early
 * in any negative-offset zone (e.g. shows "Jun 8" for a PT viewer). Building
 * from explicit parts keeps the label on the intended calendar day.
 */
export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

/** Format a local Date as a "YYYY-MM-DD" day key (no UTC drift). */
export function formatDayKey(d: Date): DayKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`
}

/** The admin browser's IANA timezone, with a UTC fallback. */
export function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  } catch {
    return "UTC"
  }
}
