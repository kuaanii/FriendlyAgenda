import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { emptyAgenda, encodeBackup, decodeBackup } from "../src/model.js";
import { createStorage } from "../electron/storage.mjs";
test("el formato y los deberes sobreviven a cerrar, abrir y restaurar una copia", async () => {
  const folder = await mkdtemp(join(tmpdir(), "friendly-agenda-"));
  try {
    const data = emptyAgenda();
    data.days["2026-10-22"] = {
      note: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Repasar álgebra",
                marks: [
                  { type: "bold" },
                  { type: "textStyle", attrs: { color: "#aa3300" } },
                ],
              },
            ],
          },
        ],
      },
      entries: [
        {
          id: "one",
          title: "Ejercicios 1–5",
          subject: "math",
          type: "homework",
          done: true,
        },
      ],
    };
    await createStorage(folder).save(data);
    const loaded = await createStorage(folder).load();
    assert.deepEqual(loaded.data, data);
    assert.deepEqual(decodeBackup(encodeBackup(loaded.data)), data);
    await createStorage(folder).save({ ...data, theme: "dark" });
    await writeFile(join(folder, "agenda.json"), "corrupto");
    const recovered = await createStorage(folder).load();
    assert.deepEqual(recovered.data, data);
    assert.match(recovered.warning, /recuperado/);
    assert.ok(await readFile(join(folder, "agenda.json.corrupt"), "utf8"));
  } finally {
    assert.ok(
      resolve(folder).startsWith(resolve(tmpdir()) + sep + "friendly-agenda-"),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
test("una importación inválida no sustituye el documento guardado", async () => {
  const folder = await mkdtemp(join(tmpdir(), "friendly-agenda-"));
  try {
    const storage = createStorage(folder);
    await storage.save(emptyAgenda());
    await assert.rejects(storage.save({ version: 999 }));
    assert.deepEqual((await storage.load()).data, emptyAgenda());
    assert.throws(() => decodeBackup('{"version":999}'));
    const data = emptyAgenda();
    data.days["2026-10-22"] = {
      entries: [],
      note: {
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://example.com/track" } },
        ],
      },
    };
    assert.throws(() => encodeBackup(data));
  } finally {
    assert.ok(
      resolve(folder).startsWith(resolve(tmpdir()) + sep + "friendly-agenda-"),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
