/**
 * Parse a date string as local time, not UTC.
 * "2025-12-25" via new Date() becomes UTC midnight, which displays as 12/24 in US timezones.
 * This splits the string and constructs a local-time Date instead.
 */
export function parseLocalDate(d: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(d)) {
    const [datePart] = d.split("T");
    const [y, m, day] = datePart.split("-").map(Number);
    return new Date(y, m - 1, day);
  }
  return new Date(d);
}
