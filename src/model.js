import {
  entryTypes,
  reminderMinutes,
  validTime,
  validDate,
} from "./entries.js";
export function addDays(date, amount) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}
export const spreadDates = (start) =>
  Array.from({ length: 4 }, (_, i) => addDays(start, i));
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function emptyAgenda() {
  return {
    version: 1,
    locale: "en",
    days: {},
    subjects: [
      { id: "math", name: "Mathematics", color: "#9c82c8" },
      { id: "language", name: "Language", color: "#d99a63" },
      { id: "science", name: "Science", color: "#78a88b" },
    ],
    theme: "system",
    notifications: { enabled: false, background: true, allDayTime: "09:00" },
  };
}
const blockTypes = [
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "horizontalRule",
  "codeBlock",
];
const inlineTypes = ["text", "hardBreak"];
function safeColor(value) {
  return (
    typeof value === "string" &&
    value.length <= 120 &&
    /^(?:#[0-9a-f]{3,8}|[a-z]+|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\([a-z0-9.%+,/ -]+\))$/i.test(
      value,
    )
  );
}
function validDocument(node, depth = 0) {
  const types = [
    "doc",
    "paragraph",
    "text",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "hardBreak",
    "blockquote",
    "horizontalRule",
    "codeBlock",
  ];
  if (!node || depth > 40 || !types.includes(node.type)) return false;
  if (
    node.type === "text"
      ? typeof node.text !== "string" || !node.text
      : node.text !== undefined
  )
    return false;
  const children = node.content || [];
  if (!Array.isArray(children)) return false;
  if (node.type === "doc" || node.type === "blockquote") {
    if (
      !children.length ||
      !children.every((child) => blockTypes.includes(child?.type))
    )
      return false;
  } else if (node.type === "paragraph" || node.type === "heading") {
    if (!children.every((child) => inlineTypes.includes(child?.type)))
      return false;
  } else if (node.type === "bulletList" || node.type === "orderedList") {
    if (
      !children.length ||
      !children.every((child) => child?.type === "listItem")
    )
      return false;
  } else if (node.type === "listItem") {
    if (
      children[0]?.type !== "paragraph" ||
      !children.every((child) => blockTypes.includes(child?.type))
    )
      return false;
  } else if (node.type === "codeBlock") {
    if (
      !children.every((child) => child?.type === "text" && !child.marks?.length)
    )
      return false;
  } else if (children.length) return false;
  if (!inlineTypes.includes(node.type) && node.marks?.length) return false;
  if (
    node.content !== undefined &&
    (!Array.isArray(node.content) ||
      !node.content.every((n) => validDocument(n, depth + 1)))
  )
    return false;
  if (
    node.marks !== undefined &&
    (!Array.isArray(node.marks) ||
      !node.marks.every(
        (m) =>
          [
            "bold",
            "italic",
            "underline",
            "strike",
            "code",
            "textStyle",
          ].includes(m.type) &&
          (!m.attrs ||
            Object.entries(m.attrs).every(
              ([k, v]) =>
                m.type === "textStyle" &&
                k === "color" &&
                (v === null || safeColor(v)),
            )),
      ))
  )
    return false;
  if (
    node.attrs &&
    !Object.entries(node.attrs).every(
      ([k, v]) =>
        (node.type === "heading" &&
          k === "level" &&
          Number.isInteger(v) &&
          v >= 1 &&
          v <= 6) ||
        (node.type === "orderedList" && k === "start" && Number.isInteger(v)) ||
        (node.type === "orderedList" &&
          k === "type" &&
          [null, "1", "a", "A", "i", "I"].includes(v)) ||
        (node.type === "codeBlock" &&
          k === "language" &&
          (v === null || typeof v === "string")),
    )
  )
    return false;
  return true;
}
export function validateAgenda(data) {
  if (
    !data ||
    data.version !== 1 ||
    !data.days ||
    typeof data.days !== "object" ||
    Array.isArray(data.days) ||
    !Array.isArray(data.subjects) ||
    !["light", "dark", "system"].includes(data.theme) ||
    (data.notifications !== undefined &&
      (!data.notifications ||
        typeof data.notifications.enabled !== "boolean" ||
        typeof data.notifications.background !== "boolean" ||
        !validTime(data.notifications.allDayTime))) ||
    (data.locale !== undefined && !["en", "es", "fr"].includes(data.locale))
  )
    throw new Error("El archivo no es una copia válida de FriendlyAgenda.");
  const ids = new Set();
  for (const s of data.subjects) {
    if (
      !s ||
      typeof s.id !== "string" ||
      !s.id ||
      ids.has(s.id) ||
      typeof s.name !== "string" ||
      !s.name.trim() ||
      !/^#[0-9a-f]{6}$/i.test(s.color)
    )
      throw new Error("Asignaturas no válidas.");
    ids.add(s.id);
  }
  for (const [date, day] of Object.entries(data.days)) {
    if (
      !validDate(date) ||
      !day ||
      !Array.isArray(day.entries) ||
      !day.note ||
      day.note.type !== "doc" ||
      !validDocument(day.note)
    )
      throw new Error("Contenido de agenda no válido.");
    const entryIds = new Set();
    for (const e of day.entries) {
      if (
        !e ||
        typeof e.id !== "string" ||
        entryIds.has(e.id) ||
        typeof e.title !== "string" ||
        !e.title.trim() ||
        !Object.hasOwn(entryTypes, e.type) ||
        (e.allDay !== undefined && typeof e.allDay !== "boolean") ||
        (e.allDay === false && !validTime(e.time)) ||
        (e.time !== undefined && e.time !== "" && !validTime(e.time)) ||
        (e.endTime !== undefined &&
          e.endTime !== "" &&
          (!validTime(e.endTime) ||
            e.allDay !== false ||
            e.endTime < e.time)) ||
        (e.reminder !== undefined &&
          e.reminder !== null &&
          !reminderMinutes.includes(e.reminder)) ||
        ["description", "location", "importKey"].some(
          (key) =>
            e[key] !== undefined &&
            (typeof e[key] !== "string" || e[key].length > 10000),
        ) ||
        typeof e.done !== "boolean" ||
        (e.subject !== "" && !ids.has(e.subject))
      )
        throw new Error("Apuntes no válidos.");
      entryIds.add(e.id);
    }
  }
  return data;
}
function checkBackupSize(text) {
  if (new TextEncoder().encode(text).byteLength > 20 * 1024 * 1024)
    throw new Error("La copia supera el límite de 20 MB.");
}
export function encodeBackup(data) {
  const text = JSON.stringify(validateAgenda(data), null, 2);
  checkBackupSize(text);
  return text;
}
export function decodeBackup(text) {
  checkBackupSize(text);
  return validateAgenda(JSON.parse(text));
}
export function noteText(note) {
  return note?.text || note?.content?.map(noteText).join(" ") || "";
}
