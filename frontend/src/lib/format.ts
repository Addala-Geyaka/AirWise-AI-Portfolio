export function formatTime(
  value: string | null | undefined,
  timezone?: string | null,
): string {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
    timeZone: timezone ?? undefined,
  };
  try {
    return date.toLocaleString(undefined, options);
  } catch {
    return date.toLocaleString(undefined, { ...options, timeZone: undefined });
  }
}

export function formatHour(value: string, timezone?: string | null): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    timeZone: timezone ?? undefined,
  };
  try {
    return date.toLocaleTimeString(undefined, options);
  } catch {
    return date.toLocaleTimeString(undefined, {
      ...options,
      timeZone: undefined,
    });
  }
}

export function formatNumber(
  value: number | null | undefined,
  digits = 0,
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "Unavailable";
  return value.toFixed(digits);
}
