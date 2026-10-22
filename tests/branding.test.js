import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import brandingModule from "../electron/branding.cjs";
const { createBranding, APP_ID } = brandingModule;

test("Windows taskbar, shortcut and toast use persistent brand assets and the same identity", async () => {
  const folder = await mkdtemp(join(tmpdir(), "friendly-branding-"));
  const commands = [],
    shortcuts = [];
  const app = {
    isPackaged: true,
    toastActivatorCLSID: "fixture-clsid",
    getPath: () => folder,
  };
  const branding = createBranding({
    app,
    platform: "win32",
    environment: {
      PORTABLE_EXECUTABLE_FILE: join(folder, "Portable Agenda.exe"),
    },
    shell: {
      writeShortcutLink: (...args) => {
        shortcuts.push(args);
        return true;
      },
    },
    run: async (...args) => commands.push(args),
  });
  try {
    await branding.prepare();
    const calls = {};
    branding.applyWindow({
      setIcon: (icon) => (calls.icon = icon),
      setAppDetails: (details) => (calls.details = details),
    });
    assert.equal(calls.details.appId, APP_ID);
    assert.equal(calls.details.appIconPath, branding.windowIcon);
    assert.equal(
      calls.details.relaunchCommand,
      `"${join(folder, "Portable Agenda.exe")}"`,
    );
    assert.equal(calls.icon, join(folder, "branding", "FriendlyAgenda.ico"));
    assert.deepEqual(
      await readFile(branding.windowIcon),
      await readFile(new URL("../build/icon.ico", import.meta.url)),
    );
    assert.deepEqual(
      await readFile(branding.notificationIcon),
      await readFile(new URL("../build/icon.png", import.meta.url)),
    );
    assert.equal(shortcuts[0][1], "create");
    assert.equal(shortcuts[0][2].icon, branding.windowIcon);
    assert.equal(shortcuts[0][2].appUserModelId, calls.details.appId);
    assert.equal(commands.length, 2);
    for (const [file, args, options] of commands) {
      assert.equal(file, "reg.exe");
      assert.equal(
        args[1],
        `HKCU\\Software\\Classes\\AppUserModelId\\${APP_ID}`,
      );
      assert.equal(options.windowsHide, true);
    }
    assert.equal(commands[1][1][7], branding.notificationIcon);
    await branding.registerWindows();
    assert.equal(shortcuts.length, 1);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("custom profiles isolate shortcuts and leave the user's Windows registry untouched", async () => {
  const folder = await mkdtemp(join(tmpdir(), "friendly-branding-isolated-"));
  let link;
  const branding = createBranding({
    platform: "win32",
    environment: { FRIENDLY_AGENDA_DATA_DIR: folder },
    app: {
      isPackaged: false,
      getPath: () => folder,
      getAppPath: () => "fixture-app",
    },
    shell: {
      writeShortcutLink: (...args) => {
        link = args;
        return true;
      },
    },
    run: () => assert.fail("Registry write in isolated profile"),
  });
  try {
    await branding.prepare();
    assert.ok(link[0].startsWith(folder));
    assert.equal(link[2].args, '"fixture-app"');
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("Mac keeps bundle branding without Windows integration", async () => {
  const branding = createBranding({
    platform: "darwin",
    environment: {},
    app: { getPath: () => tmpdir(), isPackaged: true },
    shell: {},
  });
  await branding.prepare();
  await branding.registerWindows();
  branding.applyWindow({
    setIcon: () => assert.fail("Changed Mac bundle icon"),
  });
  assert.ok(branding.notificationIcon.endsWith("icon.png"));
});
