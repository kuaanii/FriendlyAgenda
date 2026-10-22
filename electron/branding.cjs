const path = require("node:path");
const fs = require("node:fs/promises");
const { promisify } = require("node:util");
const execFile = promisify(require("node:child_process").execFile);
const APP_ID = "org.friendlyagenda.desktop";

function createBranding({
  app,
  shell,
  platform = process.platform,
  environment = process.env,
  run = execFile,
}) {
  const source = path.join(__dirname, "../build");
  const folder = path.join(app.getPath("userData"), "branding");
  const stableIcon = path.join(folder, "FriendlyAgenda.ico");
  const stableImage = path.join(folder, "FriendlyAgenda.png");
  const target = environment.PORTABLE_EXECUTABLE_FILE || process.execPath;
  const args = app.isPackaged ? "" : `"${app.getAppPath()}"`;
  let prepared = false;
  let registered = false;
  async function registerWindows() {
    if (platform !== "win32" || registered) return;
    if (!prepared) throw Error("notificationSetupError");
    // Explicit data profiles isolate OS integration as well as journal files in tests.
    const appData = environment.FRIENDLY_AGENDA_DATA_DIR
      ? app.getPath("userData")
      : app.getPath("appData");
    const shortcuts = path.join(
      appData,
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
    );
    await fs.mkdir(shortcuts, { recursive: true });
    if (
      !shell.writeShortcutLink(
        path.join(shortcuts, "FriendlyAgenda.lnk"),
        "create",
        {
          target,
          args,
          description: "FriendlyAgenda",
          appUserModelId: APP_ID,
          toastActivatorClsid: app.toastActivatorCLSID,
          icon: stableIcon,
          iconIndex: 0,
        },
      )
    )
      throw Error("notificationSetupError");
    if (!environment.FRIENDLY_AGENDA_DATA_DIR) {
      const key = `HKCU\\Software\\Classes\\AppUserModelId\\${APP_ID}`;
      for (const [name, value] of [
        ["DisplayName", "FriendlyAgenda"],
        ["IconUri", stableImage],
      ]) {
        await run(
          "reg.exe",
          ["add", key, "/v", name, "/t", "REG_SZ", "/d", value, "/f"],
          { windowsHide: true, timeout: 10000 },
        );
      }
    }
    registered = true;
  }
  return {
    async prepare() {
      if (platform !== "win32") return;
      await fs.mkdir(folder, { recursive: true });
      await fs.copyFile(path.join(source, "icon.ico"), stableIcon);
      await fs.copyFile(path.join(source, "icon.png"), stableImage);
      prepared = true;
      await registerWindows();
    },
    registerWindows,
    get windowIcon() {
      return platform === "win32" && prepared
        ? stableIcon
        : path.join(source, "icon.png");
    },
    get notificationIcon() {
      return platform === "win32" && prepared
        ? stableImage
        : path.join(source, "icon.png");
    },
    applyWindow(window) {
      if (platform !== "win32") return;
      window.setIcon(this.windowIcon);
      window.setAppDetails({
        appId: APP_ID,
        appIconPath: prepared ? stableIcon : target,
        appIconIndex: 0,
        relaunchCommand: `"${target}"${args ? ` ${args}` : ""}`,
        relaunchDisplayName: "FriendlyAgenda",
      });
    },
  };
}
module.exports = { APP_ID, createBranding };
