import { test, expect } from "@playwright/test";

test("English default and quick language changes retain formatted notes, dates and user subjects", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { name: "Make room for what matters." }),
  ).toBeVisible();
  const picker = page.locator(".language-picker select");
  const editor = page.getByRole("textbox", { name: /Notes for/ }).first();
  await editor.click();
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await page.keyboard.type("My unchanged note");
  await picker.selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("button", { name: "Nouvelle tâche", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".note-editor strong").first()).toHaveText(
    "My unchanged note",
  );
  await expect(
    page.locator(".subject").filter({ hasText: "Mathematics" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Agrandir l’agenda", exact: true })
    .click();
  await expect(picker).toBeVisible();
  await picker.selectOption("es");
  await expect(
    page.getByRole("button", { name: "Salir del modo agenda", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("textbox", { name: /Notas del/ })
      .first()
      .locator("strong"),
  ).toHaveText("My unchanged note");
  await page.reload();
  await expect(picker).toHaveValue("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator(".note-editor strong").first()).toHaveText(
    "My unchanged note",
  );
});

test("legacy backups open in English without altering user content", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "friendly-agenda-v1",
      JSON.stringify({
        version: 1,
        theme: "light",
        days: {},
        subjects: [{ id: "personal", name: "Mi materia", color: "#123456" }],
      }),
    ),
  );
  await page.goto("/");
  await expect(page.locator(".language-picker select")).toHaveValue("en");
  await expect(
    page.locator(".subject").filter({ hasText: "Mi materia" }),
  ).toBeVisible();
});
