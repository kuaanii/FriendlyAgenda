import { test, expect } from "@playwright/test";

async function mockDesktop(page, mode) {
  await page.addInitScript((mode) => {
    window.updateChecks = 0;
    window.updateDownloads = 0;
    window.agenda = {
      load: async () => ({
        data: { version: 1, theme: "light", subjects: [], days: {} },
      }),
      save: async () => true,
      checkUpdates: async () => {
        window.updateChecks++;
        if (mode === "offline") throw new Error("offline");
        return mode === "available" || window.updateChecks > 1
          ? { status: "available", update: { version: "99.0.0" } }
          : { status: "current" };
      },
      downloadUpdate: async () => {
        window.updateDownloads++;
        return true;
      },
    };
  }, mode);
}
test("avisa de la nueva versión al abrir y descarga solo cuando el usuario lo elige", async ({
  page,
}) => {
  await mockDesktop(page, "available");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hay una nueva versión" }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.updateDownloads)).toBe(0);
  await page.getByRole("button", { name: "Ahora no", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar actualización", exact: true })
    .click();
  expect(await page.evaluate(() => window.updateDownloads)).toBe(1);
});
test("la comprobación manual detecta una nueva versión sin cerrar la agenda", async ({
  page,
}) => {
  await mockDesktop(page, "manual");
  await page.goto("/");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await page
    .getByRole("button", { name: "Buscar actualizaciones", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toHaveText(
    "La versión 99.0.0 está disponible.",
  );
  await page
    .getByRole("button", { name: "Descargar actualización", exact: true })
    .click();
  expect(await page.evaluate(() => window.updateDownloads)).toBe(1);
});
test("sin conexión se puede seguir escribiendo y se explica el estado de las actualizaciones", async ({
  page,
}) => {
  await mockDesktop(page, "offline");
  await page.goto("/");
  await page
    .getByRole("textbox", { name: /Notas del/ })
    .first()
    .fill("La agenda sigue funcionando.");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "sin conexión",
  );
});
