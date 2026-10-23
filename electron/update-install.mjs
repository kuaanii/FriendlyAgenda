import { mkdir, open, readFile, writeFile, rm, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { RELEASES_URL, releaseAssetName } from "./updates.mjs";
const run = promisify(execFile);
const MAX_PACKAGE = 512 * 1024 * 1024;
const REDIRECT_HOST = "release-assets.githubusercontent.com";

export function installTarget({ platform, packaged, executable, portable }) {
  if (!packaged) throw Error("updateInstallUnsupported");
  if (platform === "win32" && portable && path.isAbsolute(portable))
    return portable;
  if (platform === "darwin") {
    const match = executable.match(
      /^(.*\/FriendlyAgenda\.app)\/Contents\/MacOS\/FriendlyAgenda$/,
    );
    if (match && !match[1].startsWith("/Volumes/")) return match[1];
  }
  throw Error("updateInstallUnsupported");
}
export function checksumFor(text, name) {
  const matches = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => line.match(/^([a-f0-9]{64})  ([^/\\]+)$/i))
    .filter(Boolean)
    .filter((line) => line[2] === name);
  if (matches.length !== 1) throw Error("updateIntegrityError");
  return matches[0][1].toLowerCase();
}
export async function downloadVerified(
  url,
  destination,
  { request = fetch, limit = MAX_PACKAGE, digest, onProgress = () => {} } = {},
) {
  let current = new URL(url);
  if (
    current.origin !== "https://github.com" ||
    current.username ||
    current.password ||
    !current.pathname.startsWith(
      "/kuaanii/FriendlyAgenda/releases/download/",
    ) ||
    current.search ||
    current.hash
  )
    throw Error("updateIntegrityError");
  let response;
  for (let redirects = 0; redirects < 4; redirects++) {
    response = await request(current.href, {
      redirect: "manual",
      headers: { "User-Agent": "FriendlyAgenda-update-install" },
      signal: AbortSignal.timeout(10 * 60 * 1000),
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const next = new URL(response.headers.get("location") || "", current);
    await response.body?.cancel();
    if (
      next.protocol !== "https:" ||
      next.hostname !== REDIRECT_HOST ||
      next.username ||
      next.password ||
      next.port ||
      !next.pathname.startsWith("/github-production-release-asset/")
    )
      throw Error("updateIntegrityError");
    current = next;
    response = null;
  }
  if (!response?.ok || !response.body) throw Error("updateDownloadError");
  const total = Number(response.headers.get("content-length")) || 0;
  if (total > limit) {
    await response.body.cancel();
    throw Error("updateIntegrityError");
  }
  const file = await open(destination, "wx");
  const hash = createHash("sha256");
  let size = 0;
  try {
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > limit) throw Error("updateIntegrityError");
      hash.update(chunk);
      await file.writeFile(chunk);
      onProgress(size, total);
    }
    await file.sync();
    if (
      !size ||
      (total && size !== total) ||
      (digest && hash.digest("hex") !== digest)
    )
      throw Error("updateIntegrityError");
  } catch (error) {
    await file.close();
    await rm(destination, { force: true });
    throw error;
  }
  await file.close();
}

export function createInstaller({
  folder,
  platform = process.platform,
  arch = process.arch,
  currentVersion,
  target,
  request = fetch,
  execute = run,
  launch = spawn,
  pid = process.pid,
}) {
  const receipt = path.join(folder, "install.json");
  let ready = null,
    busy = false,
    state = { status: "idle", progress: 0 };
  async function prepare(update) {
    if (busy) throw Error("updateBusy");
    if (ready?.version === update.version) return state;
    if (!target) throw Error("updateInstallUnsupported");
    const name = releaseAssetName(update.version, platform, arch);
    const tag = update.url.match(
      /\/releases\/download\/(v?\d+\.\d+\.\d+)\//,
    )?.[1];
    if (
      !/^\d+\.\d+\.\d+$/.test(update.version) ||
      !tag ||
      tag.replace(/^v/, "") !== update.version ||
      update.url !== `${RELEASES_URL}/download/${tag}/${name}`
    )
      throw Error("updateIntegrityError");
    busy = true;
    ready = null;
    state = { status: "downloading", progress: 0 };
    const token = randomUUID();
    const work = path.join(folder, token);
    let mounted = false;
    const staged = path.join(
      path.dirname(target),
      `.FriendlyAgenda-next-${token}${platform === "darwin" ? ".app" : ""}`,
    );
    try {
      await access(path.dirname(target), constants.W_OK);
      await mkdir(work, { recursive: true });
      const sums = path.join(work, "checksums.txt");
      await downloadVerified(
        `${RELEASES_URL}/download/${tag}/SHA256SUMS-${update.version}.txt`,
        sums,
        { request, limit: 64 * 1024 },
      );
      const digest = checksumFor(await readFile(sums, "utf8"), name);
      const packageFile = path.join(work, name);
      await downloadVerified(update.url, packageFile, {
        request,
        digest,
        onProgress: (size, total) => {
          state = {
            status: "downloading",
            progress: total
              ? Math.min(99, Math.floor((size / total) * 100))
              : 0,
          };
        },
      });
      state = { status: "verifying", progress: 100 };
      if (platform === "darwin") {
        const mount = path.join(work, "mount");
        await mkdir(mount);
        await execute("/usr/bin/hdiutil", [
          "attach",
          "-readonly",
          "-nobrowse",
          "-mountpoint",
          mount,
          packageFile,
        ]);
        mounted = true;
        try {
          const bundle = path.join(mount, "FriendlyAgenda.app");
          const plist = path.join(bundle, "Contents/Info.plist");
          for (const [key, value] of [
            ["CFBundleIdentifier", "org.friendlyagenda.desktop"],
            ["CFBundleShortVersionString", update.version],
          ]) {
            const result = await execute("/usr/libexec/PlistBuddy", [
              "-c",
              `Print :${key}`,
              plist,
            ]);
            if (result.stdout.trim() !== value)
              throw Error("updateIntegrityError");
          }
          await execute("/usr/bin/codesign", [
            "--verify",
            "--deep",
            "--strict",
            bundle,
          ]);
          const architecture = await execute("/usr/bin/lipo", [
            "-archs",
            path.join(bundle, "Contents/MacOS/FriendlyAgenda"),
          ]);
          if (
            !architecture.stdout
              .trim()
              .split(/\s+/)
              .includes(arch === "x64" ? "x86_64" : arch)
          )
            throw Error("updateIntegrityError");
          await execute("/usr/bin/ditto", [bundle, staged]);
        } finally {
          await execute("/usr/bin/hdiutil", ["detach", mount]);
          mounted = false;
        }
      }
      ready = {
        version: update.version,
        platform,
        target,
        staged,
        packageFile,
        digest,
        token,
        work,
        pid,
        receipt,
        backup: path.join(
          path.dirname(target),
          `.FriendlyAgenda-previous-${token}${platform === "darwin" ? ".app" : ""}`,
        ),
      };
      await writeFile(path.join(work, "plan.json"), JSON.stringify(ready));
      state = { status: "ready", progress: 100, version: update.version };
      return state;
    } catch (error) {
      state = {
        status: "error",
        error: error.message?.startsWith("update")
          ? error.message
          : "updateDownloadError",
      };
      // Never recursively remove a directory while its DMG is still mounted.
      if (!mounted) {
        await rm(work, { recursive: true, force: true }).catch(() => {});
        await rm(staged, {
          recursive: platform === "darwin",
          force: true,
        }).catch(() => {});
      }
      throw Error(state.error);
    } finally {
      busy = false;
    }
  }
  return {
    state: () => state,
    prepare,
    async install() {
      if (busy || state.status !== "ready" || !ready)
        throw Error("updateNotReady");
      busy = true;
      try {
        const scriptName =
          platform === "win32" ? "update-windows.ps1" : "update-mac.sh";
        const script = await readFile(
          new URL(scriptName, import.meta.url),
          "utf8",
        );
        await writeFile(
          receipt,
          JSON.stringify({ ...ready, status: "pending" }),
        );
        let file, args;
        if (platform === "win32") {
          const plan = Buffer.from(JSON.stringify(ready)).toString("base64");
          const command = `$planJson=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${plan}'));\n${script}`;
          const worker = path.join(ready.work, "worker.ps1");
          await writeFile(worker, command);
          const workerPath = Buffer.from(worker).toString("base64");
          const loadWorker = `& ([scriptblock]::Create([IO.File]::ReadAllText([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${workerPath}')))))`;
          const encodedWorker = Buffer.from(loadWorker, "utf16le").toString(
            "base64",
          );
          const bootstrap = `Start-Process -FilePath ([IO.Path]::Combine($PSHOME,'powershell.exe')) -ArgumentList @('-NoProfile','-NonInteractive','-EncodedCommand','${encodedWorker}') -WindowStyle Hidden -ErrorAction Stop`;
          file = "powershell.exe";
          args = [
            "-NoProfile",
            "-NonInteractive",
            "-EncodedCommand",
            Buffer.from(bootstrap, "utf16le").toString("base64"),
          ];
        } else {
          file = "/bin/sh";
          const helper = path.join(ready.work, "install.sh");
          await writeFile(helper, script, { mode: 0o700 });
          args = [
            helper,
            String(pid),
            target,
            ready.staged,
            ready.backup,
            receipt,
          ];
        }
        const child = launch(file, args, {
          // Windows PowerShell exits without executing -EncodedCommand when launched
          // with DETACHED_PROCESS. Start-Process owns the independent hidden worker.
          detached: platform !== "win32",
          stdio: "ignore",
          windowsHide: true,
        });
        await new Promise((resolve, reject) => {
          if (platform === "win32")
            child.once("exit", (code) =>
              code === 0 ? resolve() : reject(Error("updateInstallError")),
            );
          else child.once("spawn", resolve);
          child.once("error", reject);
        });
        child.unref();
        state = { status: "installing", progress: 100 };
        return true;
      } finally {
        busy = false;
      }
    },
    async finish() {
      let previous;
      try {
        previous = JSON.parse(
          (await readFile(receipt, "utf8")).replace(/^\uFEFF/, ""),
        );
      } catch {
        return;
      }
      if (previous.status === "error") {
        state = { status: "error", error: "updateInstallError" };
        return;
      }
      if (
        !target ||
        previous.target !== target ||
        !/^[a-f0-9-]{36}$/.test(previous.token || "")
      )
        return;
      if (previous.version !== currentVersion) {
        state = { status: "error", error: "updateInstallError" };
        return;
      }
      const suffix = platform === "darwin" ? ".app" : "";
      const backup = path.join(
        path.dirname(target),
        `.FriendlyAgenda-previous-${previous.token}${suffix}`,
      );
      const work = path.join(folder, previous.token);
      if (backup !== previous.backup || work !== previous.work) return;
      await rm(backup, { recursive: platform === "darwin", force: true });
      await writeFile(
        receipt,
        JSON.stringify({ status: "complete", version: currentVersion }),
      );
      // Windows may still be finishing the helper; it needs no files from this directory.
      await rm(work, { recursive: true, force: true }).catch(() => {});
    },
  };
}
