import { entryDue } from "../src/entries.js";
const dayKey = (now) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
export function dueReminders(data, sent, now = new Date()) {
  if (!data?.notifications?.enabled) return [];
  const allDayTime = data.notifications.allDayTime || "09:00";
  const result = [];
  for (const [date, day] of Object.entries(data.days))
    for (const entry of day.entries) {
      if (entry.done || entry.reminder === null) continue;
      const due = entryDue(date, entry, allDayTime);
      const minutes = entry.reminder ?? 0;
      const trigger = +due - minutes * 60000;
      if (
        !Number.isFinite(trigger) ||
        trigger > +now ||
        +now - +due > 7 * 86400000
      )
        continue;
      const daily = new Date(`${dayKey(now)}T${allDayTime}:00`);
      if (date < dayKey(now) && now < daily) continue;
      const phase = date < dayKey(now) ? dayKey(now) : "scheduled";
      const key = `${date}|${entry.id}|${+due}|${minutes}|${phase}`;
      if (!sent[key])
        result.push({
          key,
          date,
          entry,
          due,
          overdue:
            date < dayKey(now) ||
            (entry.allDay === false && +now - +due >= 60000),
        });
    }
  return result.sort((a, b) => +a.due - +b.due);
}
export function createReminderEngine({
  loadJournal,
  saveJournal,
  notify,
  now = () => new Date(),
  onError = () => {},
}) {
  let data = null,
    sent = {},
    running = false,
    loaded = false,
    retryAfter = 0;
  return {
    update(next) {
      data = next;
    },
    async tick() {
      if (running || +now() < retryAfter) return;
      running = true;
      try {
        if (!loaded) {
          sent = await loadJournal();
          loaded = true;
        }
        const current = now();
        sent = Object.fromEntries(
          Object.entries(sent).filter(
            ([, when]) =>
              Number.isFinite(when) && +current - when < 8 * 86400000,
          ),
        );
        for (const item of dueReminders(data, sent, current).slice(0, 3)) {
          // Re-evaluate after each asynchronous delivery; completed/deleted tasks must stop immediately.
          if (
            !dueReminders(data, sent, now()).some(
              (next) => next.key === item.key,
            )
          )
            continue;
          if (await notify(item, data.locale || "en")) {
            sent[item.key] = +current;
            await saveJournal(sent);
          } else {
            retryAfter = +current + 60000;
            break;
          }
        }
      } catch (error) {
        retryAfter = +now() + 60000;
        onError(error);
      } finally {
        running = false;
      }
    },
  };
}
