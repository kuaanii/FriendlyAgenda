import { test, expect } from "@playwright/test";

test("timed birthdays and other entry types retain details and reminders on reload", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "New entry", exact: true }).click();
  await page.getByLabel("What’s on your mind?").fill("Birthday dinner");
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("birthday");
  await expect(
    page.getByRole("combobox", { name: "Type", exact: true }).locator("option"),
  ).toHaveCount(11);
  await page.getByLabel("All day", { exact: true }).uncheck();
  await page.getByLabel("Due or start time", { exact: true }).fill("18:30");
  await page.getByLabel("End time (optional)", { exact: true }).fill("20:00");
  await page.getByLabel("Reminder", { exact: true }).selectOption("30");
  await page.getByLabel("Location (optional)").fill("At home");
  await page.getByLabel("Details (optional)").fill("Remember the cake");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.locator(".entry-body")).toContainText("Birthday");
  await expect(page.locator(".entry-body")).toContainText("18:30 – 20:00");
  await page.reload();
  await page.locator(".entry-body").click();
  await expect(page.getByLabel("Reminder", { exact: true })).toHaveValue("30");
  await expect(page.getByLabel("Details (optional)")).toHaveValue(
    "Remember the cake",
  );
  await page.getByLabel("All day", { exact: true }).check();
  await page
    .getByRole("combobox", { name: "Type", exact: true })
    .selectOption("other");
  await page.getByLabel("Reminder", { exact: true }).selectOption("off");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.locator(".entry-body")).toContainText("Other · All day");
});

test("system theme follows live OS changes and manual preference overrides them", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "My space", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Dark theme", exact: true })
    .click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "My space", exact: true }).click();
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("notification preferences persist and expose explicit background and test controls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.agenda = {
      notificationsState: async () => ({ supported: true, issue: "" }),
      testNotification: async () => ({ supported: true, issue: "" }),
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "My space", exact: true }).click();
  await page.getByLabel("Notify me about pending entries").check();
  await expect(
    page.getByLabel("Keep running in the background when closing"),
  ).toBeChecked();
  await page.getByLabel("Time for all-day entries").fill("08:15");
  await page
    .getByRole("button", { name: "Test notification", exact: true })
    .click();
  await expect(page.getByText(/Test notification sent/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My space", exact: true }).click();
  await expect(
    page.getByLabel("Notify me about pending entries"),
  ).toBeChecked();
  await expect(page.getByLabel("Time for all-day entries")).toHaveValue(
    "08:15",
  );
});

test("calendar preview can select entries, merge safely, cancel and skip duplicates", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    window.agenda = {
      calendarPreview: async (options) => ({
        from: options.from,
        to: options.to,
        skipped: 1,
        events: [
          {
            date,
            entry: {
              id: "cal-fixture",
              title: "Imported birthday",
              type: "birthday",
              subject: "",
              done: false,
              allDay: true,
              reminder: null,
              importKey: "fixture-key",
            },
          },
        ],
      }),
    };
  });
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: /Notes for/ }).first();
  await editor.fill("Keep my notes");
  async function openImport() {
    await page.getByRole("button", { name: "My space", exact: true }).click();
    await page.getByRole("button", { name: /Import calendar/ }).click();
    await page
      .getByRole("button", { name: "Choose file", exact: true })
      .click();
  }
  await openImport();
  await expect(page.getByText(/1 invalid, cancelled/)).toBeVisible();
  await page
    .getByRole("button", { name: "Import selected (1)", exact: true })
    .click();
  await expect(page.locator(".entry-body")).toContainText("Imported birthday");
  await expect(editor).toHaveText("Keep my notes");
  await openImport();
  await page
    .getByRole("button", { name: "Import selected (1)", exact: true })
    .click();
  await expect(page.locator(".entry-body")).toHaveCount(1);
  await expect(
    page.getByText("0 entries imported. 1 duplicates skipped."),
  ).toBeVisible();
  await openImport();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".entry-body")).toHaveCount(1);
});
