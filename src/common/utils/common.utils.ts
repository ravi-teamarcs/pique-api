import { utcToZonedTime, format } from 'date-fns-tz';

/**
 * Convert a UTC date/time string to a specific timezone
 * and return it as a formatted string.
 *
 * @param utcString - The UTC timestamp string (e.g., "2025-08-08T18:45:00Z")
 * @param timeZone - IANA timezone string (e.g., "America/New_York")
 * @param outputFormat - date-fns format string (default: "yyyy-MM-dd HH:mm:ss")
 * @returns formatted local-time string
 */
export function convertUtcToTimezoneString(
  utcString: string,
  timeZone: string = 'UTC',
  outputFormat = 'yyyy-MM-dd hh:mm:ss a',
): string {
  if (!utcString) return '';
  if (typeof timeZone === null) timeZone = 'UTC';
  try {
    // Parse string into Date
    const date = new Date(utcString);
    // Convert UTC date → target timezone
    const zonedDate = utcToZonedTime(date, timeZone);

    // Format in the given timezone
    return format(zonedDate, outputFormat, { timeZone });
  } catch (err) {
    console.error('Failed to convert UTC string:', err.message);
    return utcString; // fallback
  }
}

export function nowUtc(): Date {
  return new Date(new Date().toISOString()); 
}
