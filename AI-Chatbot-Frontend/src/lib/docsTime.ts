/**
 * Timezone-safe conversion helpers for the documentation publishing schedule.
 *
 * `<input type="datetime-local">` has no timezone. The admin picks a wall-clock
 * time in the selected IANA zone; these helpers convert it to/from UTC ISO so
 * the backend always stores an unambiguous instant.
 */

function zonedParts(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return parts;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === '24' ? '00' : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - date.getTime();
}

/** Converts a `datetime-local` value in an IANA zone to a UTC ISO string. */
export function localInputToUtcIso(value: string, timeZone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const wallClockUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? '0')
  );

  // Resolve the zone offset iteratively. At most two passes are needed in
  // practice; three keeps DST transition edges deterministic.
  let instant = wallClockUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = timeZoneOffsetMs(new Date(instant), timeZone);
    const next = wallClockUtc - offset;
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

/** Formats a UTC ISO instant as a `datetime-local` value in an IANA zone. */
export function utcIsoToLocalInput(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = zonedParts(date, timeZone);
  const hour = parts.hour === '24' ? '00' : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
}

export const TIMEZONE_OPTIONS = [
  'Asia/Dhaka',
  'Asia/Kolkata',
  'Asia/Karachi',
  'Asia/Dubai',
  'Asia/Singapore',
  'UTC',
  'Europe/London',
  'America/New_York',
] as const;
