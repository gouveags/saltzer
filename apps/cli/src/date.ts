import { type LocalDate, LocalDateSchema } from "@saltzer/domain";

export function localDateNow(now = new Date()): LocalDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return LocalDateSchema.parse(`${values.year}-${values.month}-${values.day}`);
}
