import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Run changeset version first
execSync("pnpm exec changeset version", { stdio: "inherit" });

// Each pnpm workspace package is a .NET project directory carrying a package.json
// that exists solely so changesets can track its version. Mirror that version
// into the project's .csproj so the Version Packages PR bumps both. The list
// also holds the repository root, which has no version and no .csproj.
const workspacePackages = JSON.parse(
  execSync("pnpm ls --recursive --depth -1 --json", { encoding: "utf8" }),
);

for (const { path: projDir, version } of workspacePackages) {
  if (!version) continue;

  for (const csproj of fs.readdirSync(projDir).filter((f) => f.endsWith(".csproj"))) {
    const csprojPath = path.join(projDir, csproj);
    let content = fs.readFileSync(csprojPath, "utf8");
    const eol = content.includes("\r\n") ? "\r\n" : "\n";

    if (content.includes("<Version>")) {
      content = content.replace(/<Version>[^<]*<\/Version>/g, `<Version>${version}</Version>`);
    } else {
      // Add Version to the first PropertyGroup
      content = content.replace(/<PropertyGroup>/, `<PropertyGroup>${eol}    <Version>${version}</Version>`);
    }

    fs.writeFileSync(csprojPath, content);
    console.log(`Updated ${csproj} to version ${version}`);
  }
}

// A packages.lock.json records the version of every project the project references.
// Neither a locked nor a plain restore notices when that version is out of date, so
// only a forced re-evaluation brings the lock files up to the new versions. Without
// references between the packed projects nothing changes here.
execSync("dotnet restore --force-evaluate", { stdio: "inherit" });
