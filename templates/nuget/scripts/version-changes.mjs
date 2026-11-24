import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Carries the changes of the version step from the job that makes them to the job that
// commits them. The Release workflow runs scripts/sync-versions.mjs in its prepare job,
// which holds no token that can write, because the restore there can run MSBuild code from
// NuGet packages. That job runs `collect`. The release job, which holds the App token, runs
// `apply` as the version-script of changesets/action, so the version PR gets exactly these
// changes.
//
// apply trusts nothing in the file, since anything that ran during the restore could have
// written it. Every change has to be one the version step makes (see allowedChanges) and
// fit the checkout, and nothing is written unless all of them do. apply only writes and
// deletes files: nothing in the file is ever run.
//
// Usage, at the repository root: VERSION_CHANGES=<file> node scripts/version-changes.mjs collect|apply

const [command] = process.argv.slice(2);
const file = process.env.VERSION_CHANGES;
if (!file || (command !== "collect" && command !== "apply")) {
  throw new Error("Usage: VERSION_CHANGES=<file> node scripts/version-changes.mjs collect|apply");
}

if (command === "collect") {
  collect(file);
} else {
  apply(file);
}

/**
 * Records every file the version step changed, added or deleted, with its new content.
 *
 * git status lists the same files changesets/action would commit: untracked files count
 * as added, and ignored ones (obj/, node_modules/) do not count.
 */
function collect(file) {
  const commit = git("rev-parse", "HEAD").trim();
  const entries = git("status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames")
    .split("\0")
    .filter(Boolean);

  const changes = entries.map((entry) => {
    const status = entry.slice(0, 2);
    const changed = entry.slice(3);
    const stat = lstat(changed);
    if (stat && !stat.isFile()) {
      throw new Error(`${JSON.stringify(changed)} is not a regular file`);
    }
    const change = !stat ? "deleted" : status === "??" || status[0] === "A" ? "added" : "modified";
    checkAllowed(changed, change);
    return change === "deleted"
      ? { path: changed, change }
      : { path: changed, change, content: fs.readFileSync(changed).toString("base64") };
  });

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ commit, changes }, null, 2)}\n`);
  for (const { path: changed, change } of changes) console.log(`${change} ${changed}`);
}

/**
 * Writes the recorded changes into the checkout, once every one of them has passed the
 * checks.
 */
function apply(file) {
  const { commit, changes } = readChanges(file);
  const head = git("rev-parse", "HEAD").trim();
  if (commit !== head) {
    throw new Error(`${file} holds the changes for ${JSON.stringify(commit)}, but the checkout is at ${head}`);
  }

  const seen = new Set();
  for (const { path: changed, change } of changes) {
    if (seen.has(changed)) throw new Error(`${JSON.stringify(changed)} is listed twice`);
    seen.add(changed);
    checkAllowed(changed, change);
    checkCheckout(changed, change);
  }

  for (const { path: changed, change, content } of changes) {
    if (change === "deleted") {
      fs.rmSync(changed);
    } else {
      if (change === "added") fs.mkdirSync(path.dirname(changed), { recursive: true });
      fs.writeFileSync(changed, Buffer.from(content, "base64"), { flag: change === "added" ? "wx" : "w" });
    }
    console.log(`${change} ${changed}`);
  }
}

function readChanges(file) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (typeof data?.commit !== "string" || !Array.isArray(data.changes)) {
    throw new Error(`${file} does not hold { commit, changes }`);
  }
  for (const change of data.changes) {
    const valid =
      typeof change?.path === "string" &&
      ["added", "modified", "deleted"].includes(change.change) &&
      (change.change === "deleted" ? change.content === undefined : typeof change.content === "string");
    if (!valid) throw new Error(`${file} holds a malformed change: ${JSON.stringify(change).slice(0, 200)}`);
  }
  return data;
}

// Paths are relative to the repository root, with forward slashes. Error messages quote
// them with JSON.stringify, so a crafted path cannot put a workflow command at the start
// of a log line.
function checkAllowed(file, change) {
  const segments = file.split("/");
  const plain =
    !/[\u0000-\u001f\u007f\\]/.test(file) &&
    !segments.some((s) => s === "" || s === "." || s === ".." || s.toLowerCase() === ".git" || s === "node_modules");
  if (!plain) throw new Error(`${JSON.stringify(file)} is not a plain path inside the repository`);

  const allowed = allowedChanges(file);
  if (!allowed.includes(change)) {
    const expected = allowed.length > 0 ? `it may only be ${allowed.join(" or ")}` : "the version step never touches it";
    throw new Error(`${JSON.stringify(file)} is ${change}, but ${expected}`);
  }
}

// The changes scripts/sync-versions.mjs makes: changeset version, the version sync into the
// .csproj files and the restore. A package directory is a directory below the root that
// holds a package.json in the checkout, and no change may add a package.json, so the set of
// package directories is the repository's own.
function allowedChanges(file) {
  const dir = path.posix.dirname(file);
  const name = path.posix.basename(file);
  const changeset = name.endsWith(".md") && !name.startsWith(".") && name.toLowerCase() !== "readme.md";

  // changeset version deletes the changesets it consumes. In prerelease mode it moves them
  // to .changeset/pre/ instead, and leaving prerelease mode deletes them there along with
  // pre.json. An older pre.json is rewritten in place.
  if (dir === ".changeset" && changeset) return ["deleted"];
  if (dir === ".changeset/pre" && changeset) return ["added", "deleted"];
  if (file === ".changeset/pre.json") return ["modified", "deleted"];

  // The restore rewrites the lock file of every project in the solution, tests included.
  if (name === "packages.lock.json") return ["modified"];

  if (dir !== "." && lstat(`${dir}/package.json`)?.isFile()) {
    if (name === "package.json" || name.endsWith(".csproj")) return ["modified"];
    if (name === "CHANGELOG.md") return ["added", "modified"];
  }
  return [];
}

// No directory on the way may be a symbolic link. A modified or deleted file has to be a
// regular file, and an added one must not exist yet.
function checkCheckout(file, change) {
  const segments = file.split("/");
  for (let i = 1; i < segments.length; i++) {
    const dir = segments.slice(0, i).join("/");
    const stat = lstat(dir);
    if (stat && !stat.isDirectory()) {
      throw new Error(`${JSON.stringify(file)}: ${JSON.stringify(dir)} is not a directory`);
    }
  }

  const stat = lstat(file);
  if (change === "added" && stat) {
    throw new Error(`${JSON.stringify(file)} is added, but it exists already`);
  }
  if (change !== "added" && !stat?.isFile()) {
    throw new Error(`${JSON.stringify(file)} is ${change}, but it is not a regular file in the checkout`);
  }
}

function lstat(file) {
  try {
    return fs.lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return undefined;
    throw error;
  }
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}
