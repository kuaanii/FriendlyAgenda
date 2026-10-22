import test from "node:test";
import assert from "node:assert/strict";
import { addDays, spreadDates } from "../src/model.js";
test("la doble página cruza de año sin perder días", () => {
  assert.deepEqual(spreadDates("2026-12-30"), [
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
  ]);
  assert.equal(addDays("2027-01-03", -4), "2026-12-30");
});
test("la agenda incluye el día bisiesto y los cambios de horario", () => {
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-28", 2), "2026-03-30");
});
