const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const run = (...args) =>
  execFileSync("git", args, { maxBuffer: 128 * 1024 * 1024 });
const findings = [];
const sensitiveName =
  /(^|\/)(?:\.env(?:\..+)?|\.npmrc|credentials[^/]*\.json|secrets[^/]*\.json|agenda\.json[^/]*|[^/]+\.(?:pem|key|p12|pfx|keystore|sqlite|sqlite3|db))$/i;
const patterns = [
  [
    "personal-path",
    /[A-Z]:[\\/]Users[\\/][^\s"'<>]+|\/Users\/[^\s/]+|\/home\/[^\s/]+/i,
  ],
  ["private-key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "github-token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  ],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  [
    "credential-literal",
    /(?:password|api[_-]?key|access[_-]?token|client[_-]?secret)\s*[:=]\s*["'][A-Za-z0-9_+/=-]{16,}["']/i,
  ],
];
function inspect(name, buffer, scope) {
  if (sensitiveName.test(name) && !name.endsWith(".env.example"))
    findings.push({ scope, file: name, kind: "sensitive-filename" });
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    for (let p = 8; p + 12 <= buffer.length;) {
      const length = buffer.readUInt32BE(p);
      const type = buffer.toString("ascii", p + 4, p + 8);
      if (["tEXt", "iTXt", "zTXt", "eXIf"].includes(type))
        findings.push({ scope, file: name, kind: "image-metadata" });
      p += 12 + length;
    }
    return;
  }
  if (buffer.includes(0)) return;
  const text = buffer.toString("utf8");
  for (const [kind, pattern] of patterns)
    if (pattern.test(text)) findings.push({ scope, file: name, kind });
  const emails = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  if (
    emails.some(
      (email) =>
        email !== "contributors@friendlyagenda.local" &&
        !email.endsWith("@example.com") &&
        !(
          name === "pnpm-lock.yaml" &&
          email.endsWith("@izs.me") &&
          text.includes("glob@7.2.3")
        ),
    )
  )
    findings.push({ scope, file: name, kind: "email-address" });
}
const files = run(
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
)
  .toString()
  .split("\0")
  .filter(Boolean);
for (const file of files)
  if (fs.existsSync(file) && fs.statSync(file).isFile())
    inspect(file, fs.readFileSync(file), "working-tree");
const historicalPaths = new Set(
  run("log", "--all", "--format=", "--name-only", "-z", "--no-renames")
    .toString()
    .split("\0")
    .map((name) => name.replace(/^\n+/, ""))
    .filter(Boolean),
);
for (const file of historicalPaths) {
  if (sensitiveName.test(file) && !file.endsWith(".env.example"))
    findings.push({ scope: "git-history", file, kind: "sensitive-filename" });
}
let builtFiles = 0;
function inspectBuild(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = `${folder}/${entry.name}`;
    if (entry.isDirectory()) inspectBuild(file);
    else if (entry.isFile()) {
      builtFiles++;
      inspect(file, fs.readFileSync(file), "production-build");
    }
  }
}
if (fs.existsSync("dist")) inspectBuild("dist");
const entries = run("rev-list", "--objects", "--all")
  .toString()
  .trim()
  .split("\n")
  .filter(Boolean);
const names = new Map(
  entries.map((line) => {
    const space = line.indexOf(" ");
    return [
      space < 0 ? line : line.slice(0, space),
      space < 0 ? "" : line.slice(space + 1),
    ];
  }),
);
const batch = execFileSync("git", ["cat-file", "--batch"], {
  input: [...names.keys()].join("\n") + "\n",
  maxBuffer: 128 * 1024 * 1024,
});
let cursor = 0,
  blobs = 0;
while (cursor < batch.length) {
  const end = batch.indexOf(10, cursor);
  if (end < 0) break;
  const [id, type, size] = batch.toString("utf8", cursor, end).split(" ");
  const length = Number(size);
  cursor = end + 1;
  if (!Number.isFinite(length)) throw new Error("Cannot inspect Git object");
  if (type === "blob") {
    blobs++;
    inspect(
      names.get(id) || id,
      batch.subarray(cursor, cursor + length),
      "git-history",
    );
  }
  cursor += length + 1;
}
const identities = run("log", "--all", "--format=%an <%ae> | %cn <%ce>")
  .toString()
  .trim()
  .split("\n");
if (
  identities.some(
    (identity) =>
      identity !==
      "FriendlyAgenda contributors <contributors@friendlyagenda.local> | FriendlyAgenda contributors <contributors@friendlyagenda.local>",
  )
)
  findings.push({ scope: "git-history", kind: "review-author-identity" });
const unique = [
  ...new Map(findings.map((item) => [JSON.stringify(item), item])).values(),
];
console.log(
  JSON.stringify(
    {
      filesInspected: files.length,
      historicalBlobsInspected: blobs,
      historicalPathsInspected: historicalPaths.size,
      builtFilesInspected: builtFiles,
      findings: unique,
    },
    null,
    2,
  ),
);
process.exitCode = unique.length ? 1 : 0;
