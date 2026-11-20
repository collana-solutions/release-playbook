import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// The package version has to come from an unconditioned <Version> alone. PackageVersion
// overrides it, so dotnet pack would keep producing the old version while the tag carries
// the new one. VersionPrefix and VersionSuffix only apply while <Version> is empty, so a
// project that sets them expects a version this script does not produce. A <Version> with
// a Condition, on itself or on its PropertyGroup, is never updated here, and wherever the
// condition holds (in Release, for example) it replaces the version this script sets.
const versionOverrides = ["PackageVersion", "VersionPrefix", "VersionSuffix"];

// Comments, CDATA sections, processing instructions and a DOCTYPE are matched as a
// whole and skipped, so a <Version> inside a comment is never touched. Attribute values
// may contain ">" and quotes of the other kind, as MSBuild conditions do.
const xmlToken =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<\/([\w.:-]+)\s*>|<([\w.:-]+)((?:\s+[\w.:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;

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
    const content = fs.readFileSync(csprojPath, "utf8");
    fs.writeFileSync(csprojPath, setProjectVersion(content, version, csproj));

    const written = projectVersions(fs.readFileSync(csprojPath, "utf8"), csproj);
    if (written.length === 0 || written.some((v) => v !== version)) {
      throw new Error(`${csproj}: no unconditioned PropertyGroup sets <Version>${version}</Version>`);
    }
    console.log(`Updated ${csproj} to version ${version}`);
  }
}

// A packages.lock.json records the version of every project the project references.
// Neither a locked nor a plain restore notices when that version is out of date, so
// only a forced re-evaluation brings the lock files up to the new versions. Without
// references between the packed projects nothing changes here.
execSync("dotnet restore --force-evaluate", { stdio: "inherit" });

/**
 * Sets the project-level version of a .csproj and returns the new content.
 *
 * Only a <Version> property directly inside an unconditioned top-level
 * <PropertyGroup> is replaced. A <Version> anywhere else, such as the metadata of a
 * <PackageReference>, stays as it is. Without such a property, <Version> goes into the
 * first unconditioned top-level <PropertyGroup>, or into a new one at the start of
 * the project.
 */
function setProjectVersion(content, version, file) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const project = parseProject(content, file);

  for (const group of descendants(project, "PropertyGroup")) {
    for (const property of group.children) {
      const override = versionOverrides.find((name) => isNamed(property, name));
      if (override) {
        throw new Error(
          `${file} sets <${property.name}>. The package version comes from <Version>, which this script sets from package.json, so remove <${property.name}>.`,
        );
      }
      if (isNamed(property, "Version") && (group.conditioned || property.conditioned)) {
        throw new Error(
          `${file} sets <Version> under a Condition. Only an unconditioned <Version> is allowed, because this script sets that one from package.json, so remove the condition or the conditioned <Version>.`,
        );
      }
    }
  }

  const groups = topLevelPropertyGroups(project);
  const versions = groups.flatMap((group) => versionProperties(group));

  if (versions.length > 0) {
    let updated = content;
    for (const property of [...versions].reverse()) {
      updated = property.selfClosing
        ? splice(updated, property.start, property.end, `<Version>${version}</Version>`)
        : splice(updated, property.innerStart, property.innerEnd, version);
    }
    return updated;
  }

  const group = groups.find((g) => !g.selfClosing);
  if (group) {
    const indent = childIndent(content, group);
    return splice(content, group.innerStart, group.innerStart, `${eol}${indent}<Version>${version}</Version>`);
  }

  const indent = childIndent(content, project);
  const newGroup = [
    `${indent}<PropertyGroup>`,
    `${indent}${indent}<Version>${version}</Version>`,
    `${indent}</PropertyGroup>`,
  ].join(eol);
  return splice(content, project.innerStart, project.innerStart, `${eol}${newGroup}${eol}`);
}

// The values of every <Version> that setProjectVersion would replace.
function projectVersions(content, file) {
  return topLevelPropertyGroups(parseProject(content, file))
    .flatMap((group) => versionProperties(group))
    .map((property) => content.slice(property.innerStart, property.innerEnd).trim());
}

function topLevelPropertyGroups(project) {
  return project.children.filter((e) => isNamed(e, "PropertyGroup") && !e.conditioned);
}

function versionProperties(group) {
  return group.children.filter((e) => isNamed(e, "Version") && !e.conditioned);
}

// MSBuild treats element and property names case-insensitively.
function isNamed(element, name) {
  return element.name.toLowerCase() === name.toLowerCase();
}

function* descendants(element, name) {
  for (const child of element.children) {
    if (isNamed(child, name)) yield child;
    yield* descendants(child, name);
  }
}

function splice(text, start, end, insert) {
  return text.slice(0, start) + insert + text.slice(end);
}

// The indentation of the element's first child, or two spaces more than the element
// itself when it has no child.
function childIndent(content, element) {
  const firstChild = /^(?:[ \t]*\r?\n)+([ \t]*)</.exec(content.slice(element.innerStart));
  if (firstChild) return firstChild[1];
  const lineStart = content.lastIndexOf("\n", element.start) + 1;
  return /^[ \t]*/.exec(content.slice(lineStart))[0] + "  ";
}

// Returns the <Project> element as a tree of elements with the offsets of their tags
// and content in the file.
function parseProject(content, file) {
  const document = { name: "", children: [] };
  const open = [document];
  for (const match of content.matchAll(xmlToken)) {
    const [token, closingName, name, attributes, selfClosing] = match;
    if (closingName !== undefined) {
      const element = open.pop();
      if (element === document || element.name !== closingName) {
        throw new Error(`${file}: unexpected </${closingName}> at offset ${match.index}`);
      }
      element.innerEnd = match.index;
      element.end = match.index + token.length;
    } else if (name !== undefined) {
      const end = match.index + token.length;
      const element = {
        name,
        conditioned: /\sCondition\s*=/i.test(attributes),
        start: match.index,
        innerStart: end,
        innerEnd: end,
        end,
        selfClosing: selfClosing === "/",
        children: [],
      };
      open.at(-1).children.push(element);
      if (!element.selfClosing) open.push(element);
    }
  }
  if (open.length !== 1) {
    throw new Error(`${file}: <${open.at(-1).name}> is never closed`);
  }

  const project = document.children.find((e) => isNamed(e, "Project"));
  if (!project || project.selfClosing) {
    throw new Error(`${file}: no <Project> element with content`);
  }
  return project;
}
