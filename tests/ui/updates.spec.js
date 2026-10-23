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
        if (mode === "periodic" && window.updateChecks === 1)
          await new Promise((resolve) => setTimeout(resolve, 1000));
        return mode === "available" ||
          mode === "periodic" ||
          window.updateChecks > 1
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
  await page.locator(".language-picker select").selectOption("es");
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
  await page.locator(".language-picker select").selectOption("es");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await page
    .getByRole("button", { name: "Buscar actualizaciones", exact: true })
    .click();
  await expect(page.locator(".update-settings").getByRole("status")).toHaveText(
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
  await page.locator(".language-picker select").selectOption("es");
  await page
    .getByRole("textbox", { name: /Notas del/ })
    .first()
    .fill("La agenda sigue funcionando.");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await expect(
    page.locator(".update-settings").getByRole("status"),
  ).toContainText("sin conexión");
});
test("el recordatorio vuelve en la siguiente comprobación periódica aunque la primera respuesta tarde", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-22T10:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-22T11:00:00Z"));
  await mockDesktop(page, "periodic");
  await page.goto("/");
  await page.locator(".language-picker select").selectOption("es");
  await page.clock.runFor(1100);
  await expect(
    page.getByRole("heading", { name: "Hay una nueva versión" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ahora no", exact: true }).click();
  await page.clock.fastForward(6 * 60 * 60 * 1000 - 1100);
  await expect(
    page.getByRole("heading", { name: "Hay una nueva versión" }),
  ).toBeVisible();
});

test("an update stays inside the app and restarts only after saving the current notes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.installs = 0;
    window.prepared = false;
    window.savedNote = "";
    window.failSave = false;
    window.agenda = {
      load: async () => ({
        data: {
          version: 1,
          locale: "es",
          theme: "light",
          subjects: [],
          days: {},
        },
      }),
      save: async (data) => {
        if (window.failSave) throw Error("saveError");
        window.savedNote = JSON.stringify(data);
        return true;
      },
      checkUpdates: async () => ({
        status: "available",
        update: { version: "99.0.0" },
      }),
      downloadUpdate: async () => {
        window.prepared = true;
        return { status: "ready", progress: 100 };
      },
      updateState: async () => ({
        status: window.prepared ? "ready" : "idle",
        progress: window.prepared ? 100 : 0,
      }),
      installUpdate: async () => {
        window.installs++;
        return true;
      },
    };
    window.open = () => {
      throw Error("Updater opened an external browser");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Ahora no", exact: true }).click();
  await page
    .getByRole("textbox", { name: /Notas del/ })
    .first()
    .fill("Conservar antes de reiniciar");
  await page.getByRole("button", { name: "Mi espacio", exact: true }).click();
  await page
    .getByRole("button", { name: "Descargar actualización", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reiniciar para actualizar" }).last(),
  ).toBeVisible();
  expect(await page.evaluate(() => window.installs)).toBe(0);
  await page.evaluate(() => {
    window.failSave = true;
  });
  await page
    .getByRole("button", { name: "Reiniciar para actualizar" })
    .last()
    .click();
  await expect(page.getByRole("alert").last()).toBeVisible();
  expect(await page.evaluate(() => window.installs)).toBe(0);
  await page.evaluate(() => {
    window.failSave = false;
  });
  await page
    .getByRole("button", { name: "Reiniciar para actualizar" })
    .last()
    .click();
  expect(await page.evaluate(() => window.installs)).toBe(1);
  expect(await page.evaluate(() => window.savedNote)).toContain(
    "Conservar antes de reiniciar",
  );
});
