import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  rm,
  readdir,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createInstaller,
  downloadVerified,
  checksumFor,
  installTarget,
} from "../electron/update-install.mjs";
const run = promisify(execFile);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const base =
  "https://github.com/kuaanii/FriendlyAgenda/releases/download/v9.0.0/";
async function waitFor(condition) {
  for (let i = 0; i < 150; i++) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Update helper did not finish");
}
function requests(bytes, name = "FriendlyAgenda-9.0.0-Windows.exe") {
  return async (url) =>
    new Response(url.endsWith(".txt") ? `${hash(bytes)}  ${name}\n` : bytes, {
      headers: {
        "content-length": String(
          url.endsWith(".txt")
            ? `${hash(bytes)}  ${name}\n`.length
            : bytes.length,
        ),
      },
    });
}

test("installer only targets the actual portable or installed Mac app, never the Electron runtime or mounted DMG", () => {
  assert.throws(
    () =>
      installTarget({
        platform: "win32",
        packaged: false,
        portable: path.resolve("app.exe"),
      }),
    /Unsupported/,
  );
  assert.throws(
    () =>
      installTarget({
        platform: "win32",
        packaged: true,
        executable: path.resolve("electron.exe"),
      }),
    /Unsupported/,
  );
  assert.equal(
    installTarget({
      platform: "win32",
      packaged: true,
      portable: path.resolve("app.exe"),
    }),
    path.resolve("app.exe"),
  );
  assert.equal(
    installTarget({
      platform: "darwin",
      packaged: true,
      executable:
        "/Applications/FriendlyAgenda.app/Contents/MacOS/FriendlyAgenda",
    }),
    "/Applications/FriendlyAgenda.app",
  );
  assert.throws(
    () =>
      installTarget({
        platform: "darwin",
        packaged: true,
        executable:
          "/Volumes/Agenda/FriendlyAgenda.app/Contents/MacOS/FriendlyAgenda",
      }),
    /Unsupported/,
  );
});

test("download refuses forged redirects, wrong or duplicate checksums, oversize and corrupted payloads", async () => {
  const folder = await mkdtemp(
    path.join(tmpdir(), "friendly-update-security-"),
  );
  try {
    const name = "FriendlyAgenda-9.0.0-Windows.exe";
    const bytes = Buffer.from("verified update");
    assert.equal(checksumFor(`${hash(bytes)}  ${name}`, name), hash(bytes));
    assert.throws(
      () =>
        checksumFor(`${hash(bytes)}  ${name}\n${hash(bytes)}  ${name}`, name),
      /Integrity/,
    );
    assert.throws(
      () => checksumFor(`${hash(bytes)}  ../${name}`, name),
      /Integrity/,
    );
    const file = path.join(folder, "payload");
    await assert.rejects(
      downloadVerified(base + name, file, {
        request: async () =>
          new Response(null, {
            status: 302,
            headers: { location: "https://attacker.invalid/update" },
          }),
      }),
      /Integrity/,
    );
    await assert.rejects(
      downloadVerified(base + name, file, {
        request: async () => new Response(bytes),
        digest: "0".repeat(64),
      }),
      /Integrity/,
    );
    await assert.rejects(
      downloadVerified(base + name, file, {
        request: async () => new Response(bytes),
        limit: 2,
      }),
      /Integrity/,
    );
    assert.deepEqual(await readdir(folder), []);
    await downloadVerified(base + name, file, {
      request: requests(bytes),
      digest: hash(bytes),
    });
    assert.deepEqual(await readFile(file), bytes);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("verified download stays in private cache, preserves installed bytes, and blocks installation before ready", async () => {
  const folder = await mkdtemp(path.join(tmpdir(), "friendly-update-cache-"));
  const target = path.join(folder, "FriendlyAgenda.exe");
  await writeFile(target, "old application");
  const installer = createInstaller({
    folder: path.join(folder, "updates"),
    platform: "win32",
    arch: "x64",
    target,
    currentVersion: "1.0.0",
    request: requests(Buffer.from("new application")),
  });
  try {
    await assert.rejects(installer.install(), /NotReady/);
    await installer.prepare({
      version: "9.0.0",
      url: base + "FriendlyAgenda-9.0.0-Windows.exe",
    });
    assert.equal(installer.state().status, "ready");
    assert.equal(await readFile(target, "utf8"), "old application");
    assert.deepEqual((await readdir(folder)).sort(), [
      "FriendlyAgenda.exe",
      "updates",
    ]);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

for (const failure of [false, true])
  test(
    `Windows native helper ${failure ? "restores the old executable if starting the replacement fails" : "replaces the same executable and cleans backup after healthy startup"}`,
    { skip: process.platform !== "win32", timeout: 45000 },
    async () => {
      const folder = await mkdtemp(
        path.join(tmpdir(), "friendly-update-native-"),
      );
      const target = path.join(folder, "FriendlyAgenda.exe");
      await copyFile(
        path.join(process.env.SystemRoot, "System32/whoami.exe"),
        target,
      );
      const old = await readFile(target);
      const bytes = failure
        ? Buffer.from("not an executable")
        : await readFile(
            path.join(process.env.SystemRoot, "System32/where.exe"),
          );
      const oldProcess = spawn(
        process.execPath,
        ["-e", "setTimeout(()=>{},1000)"],
        { stdio: "ignore", windowsHide: true },
      );
      const cache = path.join(folder, "updates");
      const installer = createInstaller({
        folder: cache,
        platform: "win32",
        arch: "x64",
        target,
        currentVersion: "9.0.0",
        request: requests(bytes),
        pid: oldProcess.pid,
      });
      try {
        await installer.prepare({
          version: "9.0.0",
          url: base + "FriendlyAgenda-9.0.0-Windows.exe",
        });
        await installer.install();
        if (failure) {
          await waitFor(async () => {
            try {
              return (
                await readFile(path.join(cache, "install.json"), "utf8")
              ).includes('"error"');
            } catch {
              return false;
            }
          });
          assert.deepEqual(await readFile(target), old);
        } else {
          await waitFor(async () => {
            const receipt = JSON.parse(
              (
                await readFile(path.join(cache, "install.json"), "utf8")
              ).replace(/^\uFEFF/, ""),
            );
            assert.notEqual(receipt.status, "error", receipt.detail);
            return hash(await readFile(target)) === hash(bytes);
          });
          await installer.finish();
          assert.equal(
            (await readdir(folder)).filter((n) =>
              n.startsWith(".FriendlyAgenda-previous"),
            ).length,
            0,
          );
          assert.equal(
            (await readdir(folder)).filter((n) => n.endsWith(".exe")).length,
            1,
          );
        }
      } finally {
        await new Promise((r) => setTimeout(r, 300));
        await rm(folder, { recursive: true, force: true });
      }
    },
  );

test(
  "Windows replacement helper survives the application process exiting",
  { skip: process.platform !== "win32", timeout: 30000 },
  async () => {
    const folder = await mkdtemp(
      path.join(tmpdir(), "friendly-update-parent-"),
    );
    const target = path.join(folder, "FriendlyAgenda.exe");
    const cache = path.join(folder, "updates");
    const source = path.join(process.env.SystemRoot, "System32/where.exe");
    await copyFile(
      path.join(process.env.SystemRoot, "System32/whoami.exe"),
      target,
    );
    const program = `
    import {createInstaller} from ${JSON.stringify(new URL("../electron/update-install.mjs", import.meta.url).href)};
    import {readFile} from 'node:fs/promises'; import {createHash} from 'node:crypto';
    const bytes=await readFile(${JSON.stringify(source)});
    const name='FriendlyAgenda-9.0.0-Windows.exe';
    const sums=createHash('sha256').update(bytes).digest('hex')+'  '+name+'\\n';
    const installer=createInstaller({folder:${JSON.stringify(cache)},platform:'win32',arch:'x64',target:${JSON.stringify(target)},currentVersion:'1.0.0',request:async url=>new Response(url.endsWith('.txt')?sums:bytes)});
    await installer.prepare({version:'9.0.0',url:${JSON.stringify(base)}+name}); await installer.install();
  `;
    try {
      const child = spawn(
        process.execPath,
        ["--input-type=module", "-e", program],
        { stdio: "ignore", windowsHide: true },
      );
      assert.equal(
        await new Promise((resolve) => child.once("exit", resolve)),
        0,
      );
      const expected = hash(await readFile(source));
      await waitFor(async () => hash(await readFile(target)) === expected);
      await createInstaller({
        folder: cache,
        platform: "win32",
        target,
        currentVersion: "9.0.0",
      }).finish();
      assert.equal(
        (await readdir(folder)).filter((name) => name.endsWith(".exe")).length,
        1,
      );
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  },
);

test(
  "Mac native DMG staging and helper replace a signed app in the same location",
  { skip: process.platform !== "darwin", timeout: 90000 },
  async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "friendly-update-mac-"));
    async function bundle(parent, version) {
      const app = path.join(parent, "FriendlyAgenda.app");
      await mkdir(path.join(app, "Contents/MacOS"), { recursive: true });
      // System tools can be arm64e on Apple Silicon; the release and Node
      // runtime use arm64. Exercise the exact supported release architecture.
      await copyFile(
        process.execPath,
        path.join(app, "Contents/MacOS/FriendlyAgenda"),
      );
      await writeFile(
        path.join(app, "Contents/Info.plist"),
        `<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>org.friendlyagenda.desktop</string><key>CFBundleExecutable</key><string>FriendlyAgenda</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>${version}</string></dict></plist>`,
      );
      await run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", app]);
      return app;
    }
    try {
      const target = await bundle(folder, "1.0.0");
      const imageSource = path.join(folder, "image");
      await bundle(imageSource, "9.0.0");
      const dmg = path.join(folder, "fixture.dmg");
      await run("/usr/bin/hdiutil", [
        "create",
        "-srcfolder",
        imageSource,
        "-volname",
        "FriendlyAgendaFixture",
        "-format",
        "UDZO",
        dmg,
      ]);
      const bytes = await readFile(dmg);
      const oldProcess = spawn(
        process.execPath,
        ["-e", "setTimeout(()=>{},1000)"],
        { stdio: "ignore" },
      );
      const installer = createInstaller({
        folder: path.join(folder, "updates"),
        platform: "darwin",
        arch: process.arch,
        target,
        currentVersion: "9.0.0",
        request: requests(
          bytes,
          `FriendlyAgenda-9.0.0-macOS-${process.arch}.dmg`,
        ),
        pid: oldProcess.pid,
      });
      await installer.prepare({
        version: "9.0.0",
        url: base + `FriendlyAgenda-9.0.0-macOS-${process.arch}.dmg`,
      });
      await installer.install();
      await waitFor(async () => {
        try {
          return (
            await readFile(path.join(target, "Contents/Info.plist"), "utf8")
          ).includes("9.0.0");
        } catch {
          return false;
        }
      });
      await installer.finish();
      assert.equal(
        (await readdir(folder)).filter((n) =>
          n.startsWith(".FriendlyAgenda-previous"),
        ).length,
        0,
      );
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  },
);
