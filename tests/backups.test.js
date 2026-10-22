import test from "node:test";
import assert from "node:assert/strict";
import { emptyAgenda, encodeBackup, decodeBackup } from "../src/model.js";

test("una agenda demasiado grande se rechaza antes de guardarse", () => {
  const data = emptyAgenda();
  data.days["2026-10-22"] = {
    entries: [],
    note: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "á".repeat(11 * 1024 * 1024) }],
        },
      ],
    },
  };
  assert.throws(() => encodeBackup(data), /20 MB/);
});
test("restaurar rechaza árboles que el editor no puede representar", () => {
  const data = emptyAgenda();
  for (const content of [
    [{ type: "text", text: "Texto sin párrafo" }],
    [
      {
        type: "bulletList",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Lista inválida" }],
          },
        ],
      },
    ],
    [
      {
        type: "paragraph",
        content: [{ type: "doc", content: [{ type: "paragraph" }] }],
      },
    ],
    [
      {
        type: "codeBlock",
        content: [{ type: "text", text: "x", marks: [{ type: "bold" }] }],
      },
    ],
  ]) {
    data.days["2026-10-22"] = { entries: [], note: { type: "doc", content } };
    assert.throws(() => decodeBackup(JSON.stringify(data)), /Contenido/);
  }
});
