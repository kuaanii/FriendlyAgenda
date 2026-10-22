import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, writeFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
test("la revisión detecta un .env histórico aunque el mismo contenido tenga ahora un nombre permitido", async () => {
  const folder = await mkdtemp(join(tmpdir(), "friendly-agenda-audit-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: folder, stdio: "pipe" });
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=FriendlyAgenda contributors",
      "-c",
      "user.email=contributors@friendlyagenda.local",
      "commit",
      "-m",
      "fixture",
    );
  };
  try {
    git("init");
    await writeFile(join(folder, "template.txt"), "placeholder");
    commit();
    await rename(join(folder, "template.txt"), join(folder, ".env"));
    commit();
    await rename(join(folder, ".env"), join(folder, "template.txt"));
    commit();
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/audit-publication.cjs")],
      { cwd: folder, encoding: "utf8" },
    );
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.ok(
      report.findings.some(
        (f) =>
          f.scope === "git-history" &&
          f.file === ".env" &&
          f.kind === "sensitive-filename",
      ),
    );
  } finally {
    assert.ok(
      resolve(folder).startsWith(
        resolve(tmpdir()) + sep + "friendly-agenda-audit-",
      ),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
