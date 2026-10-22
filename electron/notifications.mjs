import { Notification, Tray, Menu, nativeImage, app, shell } from "electron";
import { readFile, writeFile, mkdir, rename, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReminderEngine } from "./reminders.mjs";
import { translate } from "../src/i18n.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export function createNotifications({ folder, showWindow }) {
  let tray = null,
    data = null,
    issue = "",
    registered = false,
    pendingDate = null,
    configurationRevision = 0;
  const live = new Set();
  const journal = path.join(folder, "reminders.json");
  const t = (key, values) => translate(data?.locale || "en", key, values);
  async function registerWindows() {
    if (process.platform !== "win32" || registered) return;
    const location = path.join(
      app.getPath("appData"),
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
    );
    await mkdir(location, { recursive: true });
    const target = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
    if (
      !shell.writeShortcutLink(
        path.join(location, "FriendlyAgenda.lnk"),
        "create",
        {
          target,
          args: app.isPackaged ? "" : `"${app.getAppPath()}"`,
          description: "FriendlyAgenda",
          appUserModelId: "org.friendlyagenda.desktop",
          toastActivatorClsid: app.toastActivatorCLSID,
          icon: target,
          iconIndex: 0,
        },
      )
    )
      throw Error("notificationSetupError");
    registered = true;
  }
  async function show(item, locale) {
    if (!Notification.isSupported()) {
      issue = "notificationsUnsupported";
      return false;
    }
    try {
      await registerWindows();
    } catch {
      issue = "notificationSetupError";
      return false;
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(ok);
      };
      const notification = new Notification({
        title: item ? item.entry.title : "FriendlyAgenda",
        body: item
          ? translate(
              locale,
              item.overdue ? "reminderOverdue" : "reminderDue",
              {
                date: item.date,
                time:
                  item.entry.allDay === false
                    ? item.entry.time
                    : t("Todo el día"),
              },
            )
          : t("notificationsTestBody"),
        silent: false,
      });
      live.add(notification);
      notification.on("show", () => {
        issue = "";
        finish(true);
      });
      notification.on("failed", () => {
        issue = "notificationsBlocked";
        finish(false);
        live.delete(notification);
      });
      notification.on("close", () => live.delete(notification));
      notification.on("click", () => {
        if (item) pendingDate = item.date;
        showWindow(item?.date);
        live.delete(notification);
      });
      const timeout = setTimeout(() => {
        issue = "notificationsBlocked";
        finish(false);
        live.delete(notification);
      }, 5000);
      notification.show();
    });
  }
  const engine = createReminderEngine({
    async loadJournal() {
      try {
        const value = JSON.parse(await readFile(journal, "utf8"));
        return value && typeof value === "object" && !Array.isArray(value)
          ? value
          : {};
      } catch {
        return {};
      }
    },
    async saveJournal(value) {
      await mkdir(folder, { recursive: true });
      try {
        await copyFile(journal, `${journal}.bak`);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      await writeFile(`${journal}.tmp`, JSON.stringify(value), {
        encoding: "utf8",
        flush: true,
      });
      await rename(`${journal}.tmp`, journal);
    },
    notify: show,
    onError: () => {
      issue = "notificationSaveError";
    },
  });
  const interval = setInterval(() => engine.tick(), 15000);
  app.on("will-quit", () => {
    clearInterval(interval);
    tray?.destroy();
  });
  return {
    async configure(next) {
      const revision = ++configurationRevision;
      data = next;
      engine.update(next);
      try {
        if (next.notifications?.enabled) {
          await registerWindows();
          if (revision !== configurationRevision) return;
          if (next.notifications.background) {
            if (!tray) {
              const icon = nativeImage
                .createFromPath(
                  path.join(
                    root,
                    "build",
                    process.platform === "darwin"
                      ? "trayTemplate.png"
                      : "icon.png",
                  ),
                )
                .resize({
                  width: process.platform === "darwin" ? 18 : 24,
                  height: process.platform === "darwin" ? 18 : 24,
                });
              if (process.platform === "darwin") icon.setTemplateImage(true);
              tray = new Tray(icon);
              tray.setToolTip("FriendlyAgenda");
              tray.on("click", () => showWindow());
            }
            tray.setContextMenu(
              Menu.buildFromTemplate([
                { label: t("Abrir agenda"), click: () => showWindow() },
                { type: "separator" },
                { label: t("Quit FriendlyAgenda"), click: () => app.quit() },
              ]),
            );
          } else if (tray) {
            tray.destroy();
            tray = null;
            showWindow();
          }
          engine.tick();
        } else if (tray) {
          tray.destroy();
          tray = null;
          showWindow();
        }
      } catch {
        issue = "notificationSetupError";
      }
    },
    background: () =>
      Boolean(
        data?.notifications?.enabled && data.notifications.background && tray,
      ),
    enabled: () => Boolean(data?.notifications?.enabled),
    state: () => ({ supported: Notification.isSupported(), issue }),
    async test() {
      await show(null, data?.locale || "en");
      return this.state();
    },
    takeDate() {
      const date = pendingDate;
      pendingDate = null;
      return date;
    },
  };
}
