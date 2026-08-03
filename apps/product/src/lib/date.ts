import { type LocalDate, LocalDateSchema } from "@saltzer/domain";

export function todayLocalDate(now = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return LocalDateSchema.parse(`${values.year}-${values.month}-${values.day}`);
}

export function longDate(localDate: LocalDate): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(`${localDate}T12:00:00`));
}
