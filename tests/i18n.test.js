import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogues,
  translate,
  formatDate,
  errorMessage,
} from "../src/i18n.js";
import { emptyAgenda, encodeBackup, decodeBackup } from "../src/model.js";

test("English defaults, complete catalogues and compatible locale backups", () => {
  assert.equal(emptyAgenda().locale, "en");
  for (const locale of ["en", "es", "fr"]) {
    assert.deepEqual(
      Object.keys(catalogues[locale]).sort(),
      Object.keys(catalogues.en).sort(),
    );
    for (const key of Object.keys(catalogues.en)) {
      assert.ok(catalogues[locale][key].trim());
      const variables = (s) =>
        [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      assert.deepEqual(
        variables(catalogues[locale][key]),
        variables(catalogues.en[key]),
      );
    }
    const data = { ...emptyAgenda(), locale };
    assert.deepEqual(decodeBackup(encodeBackup(data)), data);
  }
  const legacy = emptyAgenda();
  delete legacy.locale;
  assert.deepEqual(decodeBackup(encodeBackup(legacy)), legacy);
  assert.throws(() => encodeBackup({ ...emptyAgenda(), locale: "de" }));
});
test("dates, dynamic phrases and known native errors use the chosen language", () => {
  assert.equal(formatDate("fr", "2026-10-22", { weekday: "long" }), "jeudi");
  assert.equal(formatDate("en", "2026-10-22", { weekday: "long" }), "Thursday");
  assert.equal(
    translate("fr", "Notas del {date}", { date: "2026-10-22" }),
    "Notes du 2026-10-22",
  );
  assert.equal(
    errorMessage(
      "en",
      new Error(
        "Error invoking remote method 'agenda:import': Error: Asignaturas no válidas.",
      ),
    ),
    "Invalid subjects.",
  );
  assert.equal(
    errorMessage("en", "private OS error", "saveError"),
    catalogues.en.saveError,
  );
});
