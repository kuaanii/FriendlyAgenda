import test from "node:test";
import assert from "node:assert/strict";
import { _electron as electron } from "@playwright/test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { execFileSync } from "node:child_process";

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
      if (process.platform === "win32") {
        const handle = await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0]
            .getNativeWindowHandle()
            .readBigUInt64LE()
            .toString(),
        );
        const identity = JSON.parse(
          execFileSync(
            "powershell.exe",
            [
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              `& {${await readFile(new URL("windows-branding.ps1", import.meta.url), "utf8")}} -Handle ${handle}`,
            ],
            { encoding: "utf8", windowsHide: true },
          ),
        );
        assert.equal(identity.appId, "org.friendlyagenda.desktop");
        assert.equal(identity.name, "FriendlyAgenda");
        assert.ok(
          identity.icon.includes(
            join(userData, "branding", "FriendlyAgenda.ico"),
          ),
        );
        assert.ok(
          identity.command
            .replaceAll("\\", "/")
            .toLowerCase()
            .includes(
              (process.env.FRIENDLY_AGENDA_EXE || "electron")
                .replaceAll("\\", "/")
                .toLowerCase(),
            ),
        );
      }
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

test(
  "calendar worker, reminder journal and tray lifecycle work through real desktop IPC",
  { timeout: 60000 },
  async () => {
    const userData = await mkdtemp(
      join(tmpdir(), "friendly-agenda-desktop-mega-"),
    );
    const environment = { ...process.env, FRIENDLY_AGENDA_DATA_DIR: userData };
    delete environment.ELECTRON_RUN_AS_NODE;
    let application;
    try {
      const file = join(userData, "fixture.ics");
      await writeFile(
        file,
        "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:fixture-worker\r\nDTSTART;VALUE=DATE:20261022\r\nDTEND;VALUE=DATE:20261023\r\nSUMMARY:Birthday fixture\r\nEND:VEVENT\r\nEND:VCALENDAR",
      );
      application = await electron.launch({
        env: environment,
        ...(process.env.FRIENDLY_AGENDA_EXE
          ? { executablePath: process.env.FRIENDLY_AGENDA_EXE, args: [] }
          : { args: ["."] }),
      });
      const page = await application.firstWindow();
      await page.locator(".book").waitFor();
      await application.evaluate(({ dialog, Notification, app }, file) => {
        dialog.showOpenDialog = async () => ({
          canceled: false,
          filePaths: [file],
        });
        // Keep test OS integration inside its temporary profile. Delivery is deterministic,
        // so CI never needs a user's system notification permission or displays real alerts.
        app.setPath("appData", app.getPath("userData"));
        globalThis.fixtureNotifications = 0;
        Notification.prototype.show = function () {
          globalThis.fixtureNotifications++;
          this.emit("show");
        };
      }, file);
      const preview = await page.evaluate(() =>
        window.agenda.calendarPreview({
          from: "2026-01-01",
          to: "2027-12-31",
          dateFormat: "dmy",
        }),
      );
      assert.equal(preview.events.length, 1);
      assert.equal(preview.events[0].date, "2026-10-22");
      assert.equal(preview.events[0].entry.type, "birthday");
      const data = await page.evaluate(async () => {
        const { data } = await window.agenda.load();
        const d = new Date();
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        data.notifications = {
          enabled: true,
          background: true,
          allDayTime: "00:00",
        };
        data.days[date] = {
          note: { type: "doc", content: [{ type: "paragraph" }] },
          entries: [
            {
              id: "fixture-reminder",
              title: "Pending fixture",
              type: "homework",
              done: false,
              subject: "",
              allDay: true,
              reminder: 0,
            },
          ],
        };
        await window.agenda.save(data);
        return data;
      });
      await page.waitForFunction(async () => {
        const result = await window.agenda.notificationsState();
        return result.supported && !result.issue;
      });
      for (let attempt = 0; attempt < 50; attempt++) {
        try {
          const journal = JSON.parse(
            await readFile(join(userData, "data", "reminders.json"), "utf8"),
          );
          if (Object.keys(journal).length) break;
        } catch {}
        if (attempt === 49) assert.fail("Reminder journal was not written");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(
        await application.evaluate(() => globalThis.fixtureNotifications),
        1,
      );
      await page.evaluate((data) => window.agenda.save(data), data);
      assert.equal(
        await application.evaluate(() => globalThis.fixtureNotifications),
        1,
      );
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].close(),
      );
      assert.equal(
        await application.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        false,
      );
      await application.evaluate(({ app }) => app.emit("second-instance"));
      assert.equal(
        await application.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isVisible(),
        ),
        true,
      );
      const state = await page.evaluate(() => window.agenda.testNotification());
      assert.equal(state.issue, "");
      assert.equal(
        await application.evaluate(() => globalThis.fixtureNotifications),
        2,
      );
    } finally {
      if (application) await application.close();
      assert.ok(
        resolve(userData).startsWith(
          resolve(tmpdir()) + sep + "friendly-agenda-desktop-mega-",
        ),
      );
      await rm(userData, { recursive: true, force: true });
    }
  },
);
