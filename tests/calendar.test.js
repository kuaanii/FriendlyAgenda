import test from "node:test";
import assert from "node:assert/strict";
import { parseCalendar } from "../electron/calendar.mjs";
import { emptyAgenda, encodeBackup, decodeBackup } from "../src/model.js";
import { mergeCalendar } from "../src/entries.js";
process.env.TZ = "Europe/Madrid";
const options = { from: "2026-01-01", to: "2027-12-31" };
const calendar = (events) =>
  `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events}\r\nEND:VCALENDAR`;
const event = (body) => `BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`;

test("ICS timezone conversion, recurrence, exceptions and cancellation survive DST", () => {
  const source = calendar(
    event(
      "UID:fixture-one\r\nSUMMARY:Examen de física\r\nDTSTART;TZID=Europe/Madrid:20261024T103000\r\nDTEND;TZID=Europe/Madrid:20261024T113000\r\nRRULE:FREQ=DAILY;COUNT=4\r\nEXDATE;TZID=Europe/Madrid:20261026T103000",
    ) +
      "\r\n" +
      event(
        "UID:fixture-cancelled\r\nSUMMARY:Cancelled\r\nDTSTART:20261024T090000Z\r\nSTATUS:CANCELLED",
      ),
  );
  const result = parseCalendar(source, options);
  assert.deepEqual(
    result.events.map(({ date, entry }) => [
      date,
      entry.time,
      entry.endTime,
      entry.type,
    ]),
    [
      ["2026-10-24", "10:30", "11:30", "exam"],
      ["2026-10-25", "10:30", "11:30", "exam"],
      ["2026-10-27", "10:30", "11:30", "exam"],
    ],
  );
  assert.equal(result.skipped, 1);
});
test("Google/Apple all-day events use exclusive DTEND and retain folded descriptions", () => {
  const source = calendar(
    event(
      "UID:fixture-birthday\r\nSUMMARY:Cumpleaños\r\nDTSTART;VALUE=DATE:20261022\r\nDTEND;VALUE=DATE:20261024\r\nDESCRIPTION:Primera línea\\nSegunda\r\n  línea\r\nLOCATION:Casa",
    ),
  );
  const { events } = parseCalendar(source, options);
  assert.deepEqual(
    events.map((e) => e.date),
    ["2026-10-22", "2026-10-23"],
  );
  assert.ok(
    events.every(
      (e) =>
        e.entry.allDay &&
        e.entry.type === "birthday" &&
        e.entry.reminder === null,
    ),
  );
  assert.equal(events[0].entry.description, "Primera línea\nSegunda línea");
});
test("Outlook Windows zones and modified recurring occurrences are imported", () => {
  const source = calendar(
    event(
      "UID:fixture-meeting\r\nSUMMARY:Meeting\r\nDTSTART;TZID=Romance Standard Time:20261022T103000\r\nDTEND;TZID=Romance Standard Time:20261022T113000\r\nRRULE:FREQ=DAILY;COUNT=2",
    ) +
      "\r\n" +
      event(
        "UID:fixture-meeting\r\nRECURRENCE-ID;TZID=Romance Standard Time:20261023T103000\r\nSUMMARY:Moved meeting\r\nDTSTART;TZID=Romance Standard Time:20261023T153000\r\nDTEND;TZID=Romance Standard Time:20261023T163000",
      ),
  );
  const { events } = parseCalendar(source, options);
  assert.deepEqual(
    events.map((e) => [e.date, e.entry.time, e.entry.title]),
    [
      ["2026-10-22", "10:30", "Meeting"],
      ["2026-10-23", "15:30", "Moved meeting"],
    ],
  );
});
test("CSV handles quoted newlines, DMY/MDY, 12-hour times and all-day flags", () => {
  const csv =
    'Subject,Start Date,Start Time,End Date,End Time,All Day Event,Description\r\n"Exam, algebra",10/22/2026,10:30 AM,10/22/2026,11:30 AM,False,"First\nSecond"\r\nBirthday,10/23/2026,,10/23/2026,,True,';
  const { events } = parseCalendar(csv, {
    ...options,
    format: "csv",
    dateFormat: "mdy",
  });
  assert.equal(events[0].entry.time, "10:30");
  assert.equal(events[0].entry.description, "First\nSecond");
  assert.equal(events[1].entry.allDay, true);
  const es = "Asunto;Fecha de inicio;Hora de inicio\r\nCita;23/10/2026;18:30";
  assert.equal(
    parseCalendar(es, { ...options, format: "csv", dateFormat: "dmy" })
      .events[0].entry.type,
    "appointment",
  );
});
test("import merges without touching notes, edits or existing event IDs, and deduplicates across days", () => {
  const parsed = parseCalendar(
    calendar(
      event(
        "UID:fixture-dedupe\r\nSUMMARY:Meeting\r\nDTSTART:20261022T090000Z",
      ),
    ),
    options,
  );
  const original = emptyAgenda();
  original.days["2026-10-22"] = {
    note: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Keep my notes" }],
        },
      ],
    },
    entries: [],
  };
  const first = mergeCalendar(original, parsed.events);
  assert.equal(first.added, 1);
  assert.equal(original.days["2026-10-22"].entries.length, 0);
  first.data.days["2026-10-22"].entries[0].title = "My edit";
  const again = mergeCalendar(first.data, parsed.events);
  assert.equal(again.added, 0);
  assert.equal(again.duplicates, 1);
  assert.equal(again.data.days["2026-10-22"].entries[0].title, "My edit");
  assert.deepEqual(
    again.data.days["2026-10-22"].note,
    original.days["2026-10-22"].note,
  );
  assert.deepEqual(decodeBackup(encodeBackup(again.data)), again.data);
});
test("invalid ranges, malformed CSV/ICS and excessive imports reject without modifying an agenda", () => {
  assert.throws(
    () => parseCalendar("not a calendar", options),
    /calendarInvalid/,
  );
  assert.throws(
    () => parseCalendar("BEGIN:VCALENDAR", options),
    /calendarInvalid/,
  );
  assert.throws(
    () => parseCalendar("a,b", { ...options, format: "csv" }),
    /calendarInvalid/,
  );
  assert.throws(
    () => parseCalendar("", { from: "2020-01-01", to: "2030-01-01" }),
    /calendarRange/,
  );
  const source = calendar(
    event(
      "UID:fixture-limit\r\nSUMMARY:Too many\r\nDTSTART:20260101T000000Z\r\nRRULE:FREQ=HOURLY;COUNT=6000",
    ),
  );
  assert.throws(() => parseCalendar(source, options), /calendarLimit/);
});
