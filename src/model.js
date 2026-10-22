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
    days: {},
    subjects: [
      { id: "math", name: "Matemáticas", color: "#9c82c8" },
      { id: "language", name: "Lengua", color: "#d99a63" },
      { id: "science", name: "Ciencias", color: "#78a88b" },
    ],
    theme: "light",
  };
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
  if (node.text !== undefined && typeof node.text !== "string") return false;
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
              ([k, v]) => k === "color" && /^#[0-9a-f]{6}$/i.test(v),
            )),
      ))
  )
    return false;
  if (
    node.attrs &&
    !Object.entries(node.attrs).every(
      ([k, v]) =>
        (k === "level" && Number.isInteger(v) && v >= 1 && v <= 6) ||
        (k === "start" && Number.isInteger(v)) ||
        (k === "language" && (v === null || typeof v === "string")),
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
    !["light", "dark"].includes(data.theme)
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
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      !day ||
      !Array.isArray(day.entries) ||
      (day.note && (day.note.type !== "doc" || !validDocument(day.note)))
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
        !["homework", "exam"].includes(e.type) ||
        typeof e.done !== "boolean" ||
        (e.subject !== "" && !ids.has(e.subject))
      )
        throw new Error("Apuntes no válidos.");
      entryIds.add(e.id);
    }
  }
  return data;
}
export const encodeBackup = (data) =>
  JSON.stringify(validateAgenda(data), null, 2);
export function decodeBackup(text) {
  if (text.length > 20 * 1024 * 1024)
    throw new Error("La copia supera el límite de 20 MB.");
  return validateAgenda(JSON.parse(text));
}
export function noteText(note) {
  return note?.text || note?.content?.map(noteText).join(" ") || "";
}
