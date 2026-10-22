import ical from "node-ical";
import { createHash } from "node:crypto";
import { addDays, validateAgenda, emptyAgenda } from "../src/model.js";
import { validDate, validTime } from "../src/entries.js";

const text = (value) => String(value?.val ?? value ?? "");
const hash = (value) => createHash("sha256").update(value).digest("hex");
function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    ...(timeZone ? { timeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
  };
}
function classify(value) {
  const normalized = text(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const rules = {
    birthday: /birthday|cumplean|anniversaire/,
    exam: /exam|examen|controle/,
    deadline: /deadline|entrega|echeance/,
    homework: /homework|deber|devoir/,
    meeting: /meeting|reunion/,
    appointment: /appointment|cita|rendez-vous/,
    class: /\bclass|clase|cours/,
    study: /study|estudio|etude|revis/,
    holiday: /holiday|vacacion|vacances/,
  };
  return (
    Object.keys(rules).find((type) => rules[type].test(normalized)) || "event"
  );
}
function csvRows(source) {
  const delimiter = source.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      field = "";
      if (rows.length > 20000) throw Error("calendarLimit");
    } else field += c;
  }
  if (quoted) throw Error("calendarInvalid");
  row.push(field);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
const normalizeHeader = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}|[^a-zA-Z0-9]/gu, "")
    .toLowerCase();
function csvDate(value, format) {
  if (validDate(value)) return value;
  const match = value.trim().match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (!match) return null;
  const [, a, b, y] = match;
  const d = `${y}-${(format === "dmy" ? b : a).padStart(2, "0")}-${(format === "dmy" ? a : b).padStart(2, "0")}`;
  return validDate(d) ? d : null;
}
function csvTime(value) {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  }
  const time = `${String(h).padStart(2, "0")}:${m[2]}`;
  return validTime(time) ? time : null;
}
function parseCsv(source, options) {
  const rows = csvRows(source.replace(/^\uFEFF/, ""));
  const headers = (rows.shift() || []).map(normalizeHeader);
  const find = (row, names) =>
    text(row[headers.findIndex((h) => names.includes(h))]).trim();
  if (
    !headers.some((h) =>
      ["subject", "asunto", "objet", "title", "titulo"].includes(h),
    ) ||
    !headers.some((h) =>
      [
        "startdate",
        "fechadeinicio",
        "fechainicial",
        "datededebut",
        "fechadecomienzo",
        "comienzo",
      ].includes(h),
    )
  )
    throw Error("calendarInvalid");
  return rows.map((row, index) => {
    const get = (...names) => find(row, names);
    const date = csvDate(
      get(
        "startdate",
        "fechadeinicio",
        "fechainicial",
        "datededebut",
        "fechadecomienzo",
        "comienzo",
      ),
      options.dateFormat,
    );
    const start = get(
      "starttime",
      "horadeinicio",
      "horainicial",
      "heurededebut",
      "horadecomienzo",
    );
    const allDay =
      ["true", "yes", "1", "si", "oui", "verdadero"].includes(
        get(
          "alldayevent",
          "eventodetodoeldia",
          "evenementsurlajournee",
          "journeeentiere",
          "todoeldia",
        ).toLowerCase(),
      ) || !start;
    const time = allDay ? "00:00" : csvTime(start);
    const endDateValue = get(
      "enddate",
      "fechadefinalizacion",
      "fechafinal",
      "datedefin",
      "fechadefin",
      "finalizacion",
    );
    const endDate = endDateValue
      ? csvDate(endDateValue, options.dateFormat)
      : date;
    const endTimeValue = get(
      "endtime",
      "horadefinalizacion",
      "horafinal",
      "heuredefin",
      "horadefin",
    );
    const endTime = allDay
      ? "00:00"
      : endTimeValue
        ? csvTime(endTimeValue)
        : time;
    if (!date || !time || !endDate || !endTime) return null;
    const title = get("subject", "asunto", "objet", "title", "titulo");
    return {
      uid: hash(JSON.stringify(row)),
      title,
      allDay,
      date,
      time,
      endDate,
      endTime,
      endExclusive: false,
      description: get("description", "descripcion"),
      location: get("location", "ubicacion", "emplacement"),
      category: get("categories", "categorias"),
      index,
    };
  });
}
export function parseCalendar(source, options) {
  if (
    typeof source !== "string" ||
    Buffer.byteLength(source) > 20 * 1024 * 1024
  )
    throw Error("calendarLimit");
  if (
    !options ||
    !validDate(options.from) ||
    !validDate(options.to) ||
    options.from > options.to ||
    Date.parse(options.to) - Date.parse(options.from) > 5 * 366 * 86400000
  )
    throw Error("calendarRange");
  let records = [],
    skipped = 0;
  if (options.format === "csv") records = parseCsv(source, options);
  else {
    if (
      !/^\s*BEGIN:VCALENDAR\s*$/im.test(source) ||
      !/^END:VCALENDAR\s*$/im.test(source)
    )
      throw Error("calendarInvalid");
    const parsed = ical.sync.parseICS(source);
    for (const event of Object.values(parsed)) {
      if (event?.type !== "VEVENT") continue;
      if (event.status === "CANCELLED") {
        skipped++;
        continue;
      }
      if (!(event.start instanceof Date) || !Number.isFinite(+event.start)) {
        skipped++;
        continue;
      }
      let instances;
      try {
        instances = ical.expandRecurringEvent(event, {
          from: new Date(`${addDays(options.from, -366)}T00:00:00Z`),
          to: new Date(`${addDays(options.to, 1)}T23:59:59Z`),
          expandOngoing: true,
        });
      } catch {
        skipped++;
        continue;
      }
      for (const instance of instances) {
        const original = instance.event;
        if (original.status === "CANCELLED") {
          skipped++;
          continue;
        }
        const allDay = instance.isFullDay;
        // All-day dates float in the originating calendar; timed events use this computer's timezone.
        const start = localParts(
          instance.start,
          allDay ? instance.start.tz || event.start.tz || undefined : undefined,
        );
        const end = localParts(
          instance.end || instance.start,
          allDay
            ? instance.end?.tz || instance.start.tz || undefined
            : undefined,
        );
        records.push({
          uid: text(event.uid),
          occurrence: instance.start.toISOString(),
          title: text(instance.summary),
          allDay,
          ...start,
          endDate: end.date,
          endTime: end.time,
          endExclusive: true,
          description: text(original.description),
          location: text(original.location),
          category: text(original.categories),
        });
        if (records.length > 10000) throw Error("calendarLimit");
      }
    }
  }
  const events = [];
  const seen = new Set();
  for (const record of records) {
    if (
      !record ||
      !record.title.trim() ||
      !validDate(record.date) ||
      !validDate(record.endDate) ||
      record.endDate < record.date
    ) {
      skipped++;
      continue;
    }
    let last = record.endDate;
    if (
      record.endExclusive &&
      last > record.date &&
      (record.allDay || record.endTime === "00:00")
    )
      last = addDays(last, -1);
    if (Date.parse(last) - Date.parse(record.date) > 366 * 86400000) {
      skipped++;
      continue;
    }
    for (let date = record.date; date <= last; date = addDays(date, 1)) {
      if (date < options.from || date > options.to) continue;
      const importKey = hash(
        `${record.uid}|${record.occurrence || record.date + record.time}|${date}`,
      );
      if (seen.has(importKey)) continue;
      seen.add(importKey);
      const allDay = record.allDay || (date > record.date && date < last);
      const time = date === record.date ? record.time : "00:00";
      const endTime = date === last ? record.endTime : "23:59";
      events.push({
        date,
        entry: {
          id: `cal-${importKey.slice(0, 32)}`,
          importKey,
          title: record.title.trim().slice(0, 300),
          type: classify(record.category + " " + record.title),
          done: false,
          subject: "",
          allDay,
          ...(!allDay
            ? { time, endTime: endTime >= time ? endTime : time }
            : {}),
          reminder: null,
          description: record.description.slice(0, 10000),
          location: record.location.slice(0, 10000),
        },
      });
      if (events.length > 5000) throw Error("calendarLimit");
    }
  }
  const data = emptyAgenda();
  for (const { date, entry } of events) {
    data.days[date] ||= {
      note: { type: "doc", content: [{ type: "paragraph" }] },
      entries: [],
    };
    data.days[date].entries.push(entry);
  }
  validateAgenda(data);
  return {
    events: events.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.entry.time || "").localeCompare(b.entry.time || ""),
    ),
    skipped,
    from: options.from,
    to: options.to,
  };
}
