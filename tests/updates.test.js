import test from "node:test";
import assert from "node:assert/strict";
import { createUpdateChecker, releaseUpdate } from "../electron/updates.mjs";
const release = (version = "0.4.0") => ({
  tag_name: `v${version}`,
  draft: false,
  prerelease: false,
  html_url: `https://github.com/kuaanii/FriendlyAgenda/releases/tag/v${version}`,
  assets: [
    {
      name: `FriendlyAgenda-${version}-Windows.exe`,
      browser_download_url: `https://github.com/kuaanii/FriendlyAgenda/releases/download/v${version}/FriendlyAgenda-${version}-Windows.exe`,
    },
  ],
});
test("solo ofrece versiones estables más recientes y un ejecutable del repositorio correcto", () => {
  assert.equal(releaseUpdate(release(), "0.3.0").version, "0.4.0");
  assert.equal(releaseUpdate(release("0.10.0"), "0.9.0").version, "0.10.0");
  assert.equal(releaseUpdate(release("0.3.0"), "0.3.0"), null);
  assert.equal(
    releaseUpdate({ ...release(), prerelease: true }, "0.3.0"),
    null,
  );
  assert.equal(releaseUpdate({ ...release(), draft: true }, "0.3.0"), null);
  assert.equal(releaseUpdate({ ...release(), assets: [] }, "0.3.0"), null);
  const unsafe = release();
  unsafe.assets[0].browser_download_url = "https://example.com/installer.exe";
  assert.equal(releaseUpdate(unsafe, "0.3.0"), null);
});
test("comprueba GitHub sin enviar notas, credenciales ni identificadores y limita las peticiones", async () => {
  let calls = 0;
  let time = 0;
  const checker = createUpdateChecker({
    currentVersion: "0.3.0",
    now: () => time,
    request: async (url, options) => {
      calls++;
      assert.equal(
        url,
        "https://api.github.com/repos/kuaanii/FriendlyAgenda/releases/latest",
      );
      assert.equal(options.method, "GET");
      assert.equal(options.body, undefined);
      assert.equal(options.headers.Authorization, undefined);
      return new Response(JSON.stringify(release()));
    },
  });
  assert.equal((await checker.check()).status, "available");
  assert.equal((await checker.check()).status, "available");
  assert.equal(calls, 1);
  time += 6 * 60 * 60 * 1000;
  await checker.check();
  assert.equal(calls, 2);
});
test("no tener releases o estar sin red no impide utilizar la agenda", async () => {
  const noReleases = createUpdateChecker({
    currentVersion: "0.3.0",
    request: async () => new Response("", { status: 404 }),
  });
  assert.equal((await noReleases.check()).status, "no-release");
  const offline = createUpdateChecker({
    currentVersion: "0.3.0",
    request: async () => {
      throw new Error("offline");
    },
  });
  assert.equal((await offline.check()).status, "unavailable");
});
test("si la API limita peticiones comprueba la release pública y la existencia del ejecutable sin descargarlo", async () => {
  const calls = [];
  const checker = createUpdateChecker({
    currentVersion: "0.3.0",
    request: async (url, options) => {
      calls.push(url);
      assert.equal(options.body, undefined);
      assert.equal(options.headers.Authorization, undefined);
      if (calls.length === 1) return new Response("", { status: 403 });
      assert.equal(options.method, "HEAD");
      assert.equal(options.redirect, "manual");
      if (calls.length === 2)
        return new Response(null, {
          status: 302,
          headers: {
            location:
              "https://github.com/kuaanii/FriendlyAgenda/releases/tag/v0.4.0",
          },
        });
      assert.equal(
        url,
        "https://github.com/kuaanii/FriendlyAgenda/releases/download/v0.4.0/FriendlyAgenda-0.4.0-Windows.exe",
      );
      return new Response(null, {
        status: 302,
        headers: {
          location:
            "https://release-assets.githubusercontent.com/github-production-release-asset/123/file?signature=fixture",
        },
      });
    },
  });
  assert.equal((await checker.check()).status, "available");
  assert.equal(calls.length, 3);
});
test("la alternativa pública rechaza redirecciones ajenas al repositorio o a los assets de GitHub", async () => {
  for (const unsafeStep of [2, 3]) {
    let calls = 0;
    const checker = createUpdateChecker({
      currentVersion: "0.3.0",
      request: async () => {
        calls++;
        if (calls === 1) return new Response("", { status: 403 });
        const location =
          calls === unsafeStep
            ? "https://example.com/file.exe"
            : calls === 2
              ? "https://github.com/kuaanii/FriendlyAgenda/releases/tag/v0.4.0"
              : "https://release-assets.githubusercontent.com/github-production-release-asset/123/file";
        return new Response(null, { status: 302, headers: { location } });
      },
    });
    assert.equal((await checker.check()).status, "unavailable");
    assert.equal(checker.downloadUrl(), null);
  }
});
