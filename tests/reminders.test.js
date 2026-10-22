import test from "node:test";
import assert from "node:assert/strict";
import { dueReminders, createReminderEngine } from "../electron/reminders.mjs";
import { emptyAgenda, validateAgenda } from "../src/model.js";
const document = () => ({
  ...emptyAgenda(),
  notifications: { enabled: true, background: true, allDayTime: "09:00" },
  days: {
    "2026-10-22": {
      note: { type: "doc", content: [{ type: "paragraph" }] },
      entries: [
        {
          id: "fixture",
          title: "Task",
          type: "homework",
          done: false,
          subject: "",
          allDay: false,
          time: "10:00",
          reminder: 15,
        },
      ],
    },
  },
});
test("timed and all-day reminders trigger only at their chosen times", () => {
  const data = document();
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-22T09:44:00")).length,
    0,
  );
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-22T09:45:00")).length,
    1,
  );
  data.days["2026-10-22"].entries[0] = {
    ...data.days["2026-10-22"].entries[0],
    allDay: true,
    time: "",
    reminder: 0,
  };
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-22T08:59:00")).length,
    0,
  );
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-22T09:00:00")).length,
    1,
  );
});
test("overdue reminders repeat once daily, stop when completed/disabled, and expire after seven days", () => {
  const data = document();
  const now = new Date("2026-10-22T10:30:00");
  const [item] = dueReminders(data, {}, now);
  assert.equal(dueReminders(data, { [item.key]: +now }, now).length, 0);
  assert.equal(
    dueReminders(data, { [item.key]: +now }, new Date("2026-10-23T09:00:00"))
      .length,
    1,
  );
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-30T10:00:00")).length,
    0,
  );
  data.days["2026-10-22"].entries[0].done = true;
  assert.equal(dueReminders(data, {}, now).length, 0);
  data.days["2026-10-22"].entries[0].done = false;
  data.notifications.enabled = false;
  assert.equal(dueReminders(data, {}, now).length, 0);
});
test("journal prevents duplicate delivery after restart; failed native delivery is not marked as delivered", async () => {
  let journal = {},
    deliveries = 0;
  const now = () => new Date("2026-10-22T10:30:00");
  const dependencies = {
    now,
    loadJournal: async () => ({ ...journal }),
    saveJournal: async (data) => {
      journal = { ...data };
    },
    notify: async () => {
      deliveries++;
      return true;
    },
  };
  const first = createReminderEngine(dependencies);
  first.update(document());
  await Promise.all([first.tick(), first.tick()]);
  assert.equal(deliveries, 1);
  const restarted = createReminderEngine(dependencies);
  restarted.update(document());
  await restarted.tick();
  assert.equal(deliveries, 1);
  let saved = false;
  const blocked = createReminderEngine({
    ...dependencies,
    loadJournal: async () => ({}),
    notify: async () => false,
    saveJournal: async () => {
      saved = true;
    },
  });
  blocked.update(document());
  await blocked.tick();
  assert.equal(saved, false);
});

test("advance reminders do not repeat at midnight and legacy entries receive their default reminder", () => {
  const data = document();
  data.days["2026-10-22"].entries[0].reminder = 1440;
  const before = new Date("2026-10-21T10:00:00");
  const [item] = dueReminders(data, {}, before);
  assert.ok(item);
  assert.equal(
    dueReminders(data, { [item.key]: +before }, new Date("2026-10-22T00:01:00"))
      .length,
    0,
  );
  delete data.days["2026-10-22"].entries[0].reminder;
  assert.equal(
    dueReminders(data, {}, new Date("2026-10-22T10:00:00")).length,
    1,
  );
});
test("schema accepts all new entry types and system theme while rejecting malformed times and reminders", () => {
  const data = document();
  data.theme = "system";
  validateAgenda(data);
  const entry = data.days["2026-10-22"].entries[0];
  for (const type of [
    "birthday",
    "meeting",
    "appointment",
    "class",
    "study",
    "deadline",
    "holiday",
    "event",
    "other",
  ]) {
    entry.type = type;
    validateAgenda(data);
  }
  for (const change of [
    { time: "25:00" },
    { reminder: -10 },
    { allDay: "yes" },
    { endTime: "09:00" },
  ]) {
    const invalid = structuredClone(data);
    Object.assign(invalid.days["2026-10-22"].entries[0], change);
    assert.throws(() => validateAgenda(invalid));
  }
});
