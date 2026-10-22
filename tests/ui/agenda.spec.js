import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("crear, completar, escribir con formato y conservar al volver a abrir", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Haz sitio a lo importante." }),
  ).toBeVisible();
  await expect(page.locator(".book .day")).toHaveCount(4);
  await page.getByRole("button", { name: "Nuevo apunte" }).click();
  await page.getByLabel("¿Qué tienes en mente?").fill("Repasar álgebra");
  await page
    .getByRole("combobox", { name: "Asignatura", exact: true })
    .selectOption("math");
  await page.getByRole("button", { name: "Guardar apunte" }).click();
  await page
    .getByRole("button", { name: "Completar: Repasar álgebra", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Marcar pendiente: Repasar álgebra",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  const editor = page.getByRole("textbox", { name: /Notas del/ }).first();
  await editor.click();
  await page.getByRole("button", { name: "Negrita", exact: true }).click();
  await page.keyboard.type("Recordar la calculadora");
  await expect(editor.locator("strong")).toHaveText("Recordar la calculadora");
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Marcar pendiente: Repasar álgebra",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("textbox", { name: /Notas del/ })
      .first()
      .locator("strong"),
  ).toHaveText("Recordar la calculadora");
  await page.getByRole("button", { name: "Buscar en tu agenda" }).click();
  await page.getByRole("textbox", { name: "Buscar texto" }).fill("calculadora");
  await expect(page.locator(".search-results strong")).toHaveText(
    "Recordar la calculadora",
  );
});
test("navegar cuatro días, volver a hoy y cambiar de tema", async ({
  page,
}) => {
  await page.goto("/");
  const first = await page.locator(".day-number").first().innerText();
  await page.getByRole("button", { name: "Cuatro días siguientes" }).click();
  await expect(page.locator(".day-number").first()).not.toHaveText(first);
  await page.getByRole("button", { name: "Cuatro días anteriores" }).click();
  await expect(page.locator(".day-number").first()).toHaveText(first);
  await page.getByRole("button", { name: "Tema oscuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
test("capturas de ambos temas y ventana compacta", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("status").first()).toHaveText("Todo guardado");
  await page.screenshot({
    path: "docs/screenshots/agenda-clara.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Tema oscuro", exact: true }).click();
  await page.screenshot({
    path: "docs/screenshots/agenda-oscura.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1000, height: 720 });
  await page.screenshot({
    path: "docs/screenshots/agenda-compacta.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("color, subrayado y listas se conservan al exportar y restaurar", async ({
  page,
}) => {
  await page.goto("/");
  const editor = page.getByRole("textbox", { name: /Notas del/ }).first();
  await editor.click();
  await page.getByRole("button", { name: "Subrayado", exact: true }).click();
  await page.getByLabel("Color del texto", { exact: true }).fill("#aa3300");
  await page.keyboard.type("Plan de estudio");
  await page
    .getByRole("button", { name: "Lista con viñetas", exact: true })
    .click();
  await expect(editor.locator("li u")).toHaveText("Plan de estudio");
  await expect(page.getByRole("status").first()).toHaveText("Todo guardado");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /Exportar copia de seguridad/ })
    .click();
  const file = await downloadPromise;
  const text = await readFile(await file.path(), "utf8");
  expect(text).toContain("#aa3300");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await editor.fill("Contenido posterior");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Restaurar una copia/ }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "copia.json",
    mimeType: "application/json",
    buffer: Buffer.from(text),
  });
  await page
    .getByRole("button", { name: "Restaurar copia", exact: true })
    .click();
  await expect(
    page
      .getByRole("textbox", { name: /Notas del/ })
      .first()
      .locator("li u"),
  ).toHaveText("Plan de estudio");
});
