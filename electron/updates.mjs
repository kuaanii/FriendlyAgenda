export const RELEASES_URL =
  "https://github.com/kuaanii/FriendlyAgenda/releases";
const API_URL =
  "https://api.github.com/repos/kuaanii/FriendlyAgenda/releases/latest";
function versionParts(value) {
  if (
    typeof value !== "string" ||
    !/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)
  )
    return null;
  const parts = value.replace(/^v/, "").split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}
function newerRelease(release, currentVersion) {
  if (!release || release.draft !== false || release.prerelease !== false)
    return null;
  const next = versionParts(release.tag_name),
    current = versionParts(currentVersion);
  if (!next || !current) return null;
  const different = next.findIndex((part, index) => part !== current[index]);
  if (different < 0 || next[different] < current[different]) return null;
  const version = next.join(".");
  return version;
}
export function releaseUpdate(release, currentVersion) {
  const version = newerRelease(release, currentVersion);
  if (!version) return null;
  const expectedName = `FriendlyAgenda-${version}-Windows.exe`;
  const expectedDownload = `${RELEASES_URL}/download/${release.tag_name}/${expectedName}`;
  const asset =
    Array.isArray(release.assets) &&
    release.assets.find(
      (item) =>
        item?.name === expectedName &&
        item.browser_download_url === expectedDownload,
    );
  if (!asset) return null;
  return { version, url: expectedDownload };
}
export function createUpdateChecker({
  currentVersion,
  request = fetch,
  now = Date.now,
}) {
  let lastCheck = -Infinity,
    cached = null,
    inFlight = null;
  async function fetchLatestPage() {
    const options = {
      method: "HEAD",
      headers: { "User-Agent": "FriendlyAgenda-update-check" },
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    };
    const latest = await request(`${RELEASES_URL}/latest`, options);
    if (latest.status === 404) return { status: "no-release" };
    if (latest.status !== 302) throw new Error("Release page unavailable");
    const location = new URL(
      latest.headers.get("location") || "",
      RELEASES_URL,
    );
    const tag = location.pathname.match(
      /^\/kuaanii\/FriendlyAgenda\/releases\/tag\/(v?\d+\.\d+\.\d+)$/,
    )?.[1];
    if (
      location.origin !== "https://github.com" ||
      location.search ||
      location.hash ||
      !tag
    )
      throw new Error("Invalid release redirect");
    const candidate = { tag_name: tag, draft: false, prerelease: false };
    const version = newerRelease(candidate, currentVersion);
    if (!version) return { status: "current" };
    const url = `${RELEASES_URL}/download/${tag}/FriendlyAgenda-${version}-Windows.exe`;
    const asset = await request(url, {
      ...options,
      signal: AbortSignal.timeout(8000),
    });
    if (asset.status === 404) return { status: "no-download" };
    if (asset.status !== 302) throw new Error("Download unavailable");
    const target = new URL(asset.headers.get("location") || "");
    if (
      target.protocol !== "https:" ||
      target.hostname !== "release-assets.githubusercontent.com" ||
      target.username ||
      target.password ||
      target.port ||
      !target.pathname.startsWith("/github-production-release-asset/")
    )
      throw new Error("Invalid asset redirect");
    return { status: "available", update: { version, url } };
  }
  async function fetchRelease() {
    lastCheck = now();
    try {
      const response = await request(API_URL, {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "FriendlyAgenda-update-check",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        redirect: "error",
        signal: AbortSignal.timeout(8000),
      });
      if (response.status === 404) return { status: "no-release" };
      if (!response.ok) throw new Error("GitHub unavailable");
      if (Number(response.headers.get("content-length")) > 1024 * 1024)
        throw new Error("Response too large");
      const reader = response.body.getReader();
      let size = 0;
      const chunks = [];
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 1024 * 1024) throw new Error("Response too large");
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const release = JSON.parse(new TextDecoder().decode(bytes));
      const update = releaseUpdate(release, currentVersion);
      return update
        ? { status: "available", update }
        : {
            status: newerRelease(release, currentVersion)
              ? "no-download"
              : "current",
          };
    } catch {
      return fetchLatestPage().catch(() => ({ status: "unavailable" }));
    }
  }
  return {
    check() {
      if (inFlight) return inFlight;
      if (
        cached &&
        cached.status !== "unavailable" &&
        now() - lastCheck < 5 * 60 * 1000
      )
        return Promise.resolve(cached);
      inFlight = fetchRelease()
        .then((result) => {
          cached = result;
          return result;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    downloadUrl() {
      return cached?.status === "available" ? cached.update.url : null;
    },
  };
}
