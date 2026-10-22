import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";

test(
  "la aplicación de escritorio guarda en disco y vuelve a abrir sin red",
  { timeout: 60000 },
  async () => {
    const userData = await mkdtemp(join(tmpdir(), "friendly-agenda-desktop-"));
    let app;
    const environment = { ...process.env, FRIENDLY_AGENDA_DATA_DIR: userData };
    delete environment.ELECTRON_RUN_AS_NODE;
    const options = {
      env: environment,
      ...(process.env.FRIENDLY_AGENDA_EXE
        ? { executablePath: process.env.FRIENDLY_AGENDA_EXE, args: [] }
        : { args: ["."] }),
    };
    try {
      app = await electron.launch(options);
      let page = await app.firstWindow();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page
        .getByRole("heading", { name: "Make room for what matters." })
        .waitFor();
      await page
        .getByRole("combobox", { name: "Language", exact: true })
        .selectOption("es");
      const updateState = await page.evaluate(() =>
        window.agenda.checkUpdates(),
      );
      assert.ok(
        [
          "available",
          "current",
          "no-release",
          "no-download",
          "unavailable",
        ].includes(updateState.status),
      );
      if (updateState.status === "available")
        await page
          .getByRole("button", { name: "Ahora no", exact: true })
          .click();
      await page.context().setOffline(true);
      assert.equal(await page.locator(".book .day").count(), 4);
      await page.getByRole("button", { name: "Nuevo apunte" }).click();
      await page
        .getByLabel("¿Qué tienes en mente?")
        .fill("Prueba local de escritorio");
      await page.getByRole("button", { name: "Guardar apunte" }).click();
      await page
        .getByRole("button", {
          name: "Completar: Prueba local de escritorio",
          exact: true,
        })
        .click();
      const editor = page.getByRole("textbox", { name: /Notas del/ }).first();
      await editor.click();
      await page.getByRole("button", { name: "Negrita", exact: true }).click();
      await page.keyboard.type("Nota privada");
      await page
        .getByRole("status")
        .filter({ hasText: "Todo guardado" })
        .waitFor();
      await page
        .getByRole("button", { name: "Ocultar menú lateral", exact: true })
        .click();
      assert.equal(await page.locator(".sidebar").isVisible(), false);
      await page
        .getByRole("button", { name: "Ampliar agenda", exact: true })
        .click();
      assert.equal(await page.locator(".welcome").isVisible(), false);
      const book = await page.locator(".book").boundingBox();
      assert.ok(book.width > (await page.evaluate(() => innerWidth * 0.9)));
      await page.screenshot({
        path: "docs/screenshots/escritorio-inmersivo-verificado.png",
      });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator(".welcome").isVisible(), true);
      assert.equal(await page.locator(".sidebar").isVisible(), false);
      await page
        .getByRole("button", { name: "Mostrar menú lateral", exact: true })
        .click();
      await app.close();
      app = null;
      const saved = JSON.parse(
        await readFile(join(userData, "data", "agenda.json"), "utf8"),
      );
      const day = Object.values(saved.days).find((d) => d.entries.length);
      assert.equal(day.entries[0].done, true);
      assert.equal(day.note.content[0].content[0].text, "Nota privada");
      app = await electron.launch(options);
      page = await app.firstWindow();
      const reopenedUpdateState = await page.evaluate(() =>
        window.agenda.checkUpdates(),
      );
      if (reopenedUpdateState.status === "available")
        await page
          .getByRole("button", { name: "Ahora no", exact: true })
          .click();
      await page
        .getByRole("button", {
          name: "Marcar pendiente: Prueba local de escritorio",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("textbox", { name: /Notas del/ })
          .first()
          .locator("strong")
          .innerText(),
        "Nota privada",
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: "docs/screenshots/escritorio-verificado.png",
        fullPage: true,
      });
      const firstDay = page.locator(".day").first();
      const nextDay = page.locator(".day").nth(1);
      const beforeNote = await nextDay.boundingBox();
      await firstDay
        .getByRole("textbox")
        .fill(
          Array.from({ length: 80 }, (_, i) => `Línea ${i + 1}`).join("\n"),
        );
      const afterNote = await nextDay.boundingBox();
      assert.ok(Math.abs(afterNote.y - beforeNote.y) < 2);
      assert.equal(
        await firstDay.evaluate(
          (e) =>
            e.scrollHeight > e.clientHeight &&
            getComputedStyle(e).overflowY === "auto" &&
            getComputedStyle(e).scrollbarWidth === "none",
        ),
        true,
      );
      await page
        .getByRole("status")
        .filter({ hasText: "Todo guardado" })
        .waitFor();
      if (process.platform === "darwin") {
        const newWindow = app.waitForEvent("window");
        await app.evaluate(async ({ app, BrowserWindow }) => {
          const current = BrowserWindow.getAllWindows()[0];
          await new Promise((resolve) => {
            current.once("closed", resolve);
            current.close();
          });
          app.emit("activate");
        });
        page = await newWindow;
        await page.locator(".language-picker select").waitFor();
        assert.equal(
          await page.locator(".language-picker select").inputValue(),
          "es",
        );
      }
    } finally {
      if (app) await app.close();
      assert.ok(
        resolve(userData).startsWith(
          resolve(tmpdir()) + sep + "friendly-agenda-desktop-",
        ),
      );
      await rm(userData, { recursive: true, force: true });
    }
  },
);
