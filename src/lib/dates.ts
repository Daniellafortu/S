export const TIME_ZONE = "America/Bogota";

export function dayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dayRange(day: string): [Date, Date] {
  const start = new Date(`${day}T00:00:00-05:00`);
  return [start, new Date(start.getTime() + 86_400_000)];
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function money(value: number | null | undefined): string {
  const amount = value || 0;
  return `${amount < 0 ? "-" : ""}$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.abs(amount))}`;
}

export function shortTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(value)).replace(/\s/g, " ");
}

export function shortDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { timeZone: TIME_ZONE, day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function elapsed(value: string | Date, end: string | Date = new Date()): string {
  const mins = Math.max(0, Math.floor((new Date(end).getTime() - new Date(value).getTime()) / 60000));
  const hours = Math.floor(mins / 60);
  return hours ? `${hours} h ${String(mins % 60).padStart(2, "0")} min` : `${mins} min`;
}
