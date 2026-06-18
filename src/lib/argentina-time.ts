export const argentinaTimeZone = "America/Argentina/Buenos_Aires";
const argentinaUtcOffset = "-03:00";

export function formatArgentinaDate(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-AR", { timeZone: argentinaTimeZone });
}

export function formatArgentinaTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("es-AR", { timeZone: argentinaTimeZone });
}

export function formatArgentinaDateTime(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR", { timeZone: argentinaTimeZone });
}

export function formatArgentinaShortDeadline(value: string) {
  const parts = new Intl.DateTimeFormat("es-AR", {
    timeZone: argentinaTimeZone,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("day")}/${byType.get("month")}, ${byType.get("hour")}:${byType.get("minute")}`;
}

export function isoToArgentinaInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: argentinaTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}T${byType.get("hour")}:${byType.get("minute")}`;
}

export function argentinaInputToIso(value: string) {
  if (!value) return "";
  const date = new Date(`${value}:00${argentinaUtcOffset}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
