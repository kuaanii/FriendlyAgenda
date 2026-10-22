export const entryTypes = {
  homework: "Deber",
  exam: "Examen",
  deadline: "Entrega",
  birthday: "Cumpleaños",
  meeting: "Reunión",
  appointment: "Cita",
  class: "Clase",
  study: "Estudio",
  holiday: "Vacaciones",
  event: "Evento",
  other: "Otro",
};
export const reminderMinutes = [0, 5, 15, 30, 60, 1440];
export const validTime = (value) =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
export const validDate = (date) =>
  typeof date === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  date >= "1900-01-01" &&
  date <= "2200-12-31" &&
  Number.isFinite(Date.parse(date)) &&
  new Date(date).toISOString().slice(0, 10) === date;
export function entryDue(date, entry, allDayTime = "09:00") {
  return new Date(
    `${date}T${entry.allDay === false ? entry.time : allDayTime}:00`,
  );
}
export const compareEntries = (a, b) =>
  (a.date || "").localeCompare(b.date || "") ||
  (a.time || "00:00").localeCompare(b.time || "00:00") ||
  a.title.localeCompare(b.title);
export function mergeCalendar(data, events) {
  const days = Object.fromEntries(
    Object.entries(data.days).map(([date, day]) => [
      date,
      { ...day, entries: [...day.entries] },
    ]),
  );
  const known = new Set(
    Object.values(days).flatMap((day) =>
      day.entries.map((entry) => entry.importKey).filter(Boolean),
    ),
  );
  let added = 0,
    duplicates = 0;
  for (const { date, entry } of events) {
    if (known.has(entry.importKey)) {
      duplicates++;
      continue;
    }
    known.add(entry.importKey);
    days[date] ||= {
      note: { type: "doc", content: [{ type: "paragraph" }] },
      entries: [],
    };
    days[date].entries.push(entry);
    added++;
  }
  return { data: { ...data, days }, added, duplicates };
}
