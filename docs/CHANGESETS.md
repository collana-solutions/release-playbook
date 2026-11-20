# Changesets Guide

This is the collana-solutions guide for working with changesets. It covers **every scenario** for both **contributors** (who add changes) and **maintainers** (who manage releases), and how to adopt the setup in a new repository.

---

## Table of Contents

- [Changesets Guide](#changesets-guide)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [For Contributors](#for-contributors)
    - [What Is a Changeset?](#what-is-a-changeset)
    - [Adding a Changeset](#adding-a-changeset)
    - [Choosing the Right Semver Bump](#choosing-the-right-semver-bump)
    - [Empty Changesets (Non-Releasable Changes)](#empty-changesets-non-releasable-changes)
    - [Multiple Changesets per PR](#multiple-changesets-per-pr)
    - [What Happens If You Forget a Changeset](#what-happens-if-you-forget-a-changeset)
    - [Changeset File Format](#changeset-file-format)
    - [Editing or Removing a Changeset](#editing-or-removing-a-changeset)
  - [For Maintainers](#for-maintainers)
    - [Regular Release Flow](#regular-release-flow)
    - [How Fixed Packages Work](#how-fixed-packages-work)
    - [Testing before release](#testing-before-release)
      - [pkg.pr.new (npm)](#pkgprnew-npm)
      - [feedz.io preview feed (NuGet)](#feedzio-preview-feed-nuget)
    - [Prereleases / Release Candidates](#prereleases--release-candidates)
      - [How it works](#how-it-works)
      - [Step-by-step walkthrough](#step-by-step-walkthrough)
      - [Summary](#summary)
      - [Switching between prerelease phases](#switching-between-prerelease-phases)
      - [When to use prereleases](#when-to-use-prereleases)
      - [Emergency patches during a prerelease](#emergency-patches-during-a-prerelease)
      - [Pivoting from a minor to a major prerelease](#pivoting-from-a-minor-to-a-major-prerelease)
    - [Backporting / Hotfixes on Older Versions](#backporting--hotfixes-on-older-versions)
      - [Understanding the `release/v1.x` branch](#understanding-the-releasev1x-branch)
      - [Setting up a release branch (manual fallback)](#setting-up-a-release-branch-manual-fallback)
      - [Releasing a backport](#releasing-a-backport)
      - [Timeline example](#timeline-example)
    - [Recovering From a Failed Publish](#recovering-from-a-failed-publish)
    - [Manual Publish Fallback](#manual-publish-fallback)
    - [Reverting a Changeset](#reverting-a-changeset)
    - [Reverting a Release](#reverting-a-release)
    - [Skipping a Package From Release](#skipping-a-package-from-release)
    - [Force-Publishing Without Changes](#force-publishing-without-changes)
    - [Dependabot Automation](#dependabot-automation)
      - [How it works](#how-it-works-1)
      - [What gets generated](#what-gets-generated)
      - [Setup](#setup)
  - [Publishing to public npm](#publishing-to-public-npm)
    - [Release job layout](#release-job-layout)
    - [Registry configuration](#registry-configuration)
    - [Connecting the trusted publisher](#connecting-the-trusted-publisher)
  - [Adapting for NuGet Packages](#adapting-for-nuget-packages)
    - [Architecture](#architecture)
    - [Repository structure](#repository-structure)
    - [Version sync script](#version-sync-script)
    - [NuGet publish workflow](#nuget-publish-workflow)
    - [Trusted publishing on nuget.org](#trusted-publishing-on-nugetorg)
    - [Package metadata](#package-metadata)
    - [Dependabot changesets for NuGet](#dependabot-changesets-for-nuget)
    - [What stays the same](#what-stays-the-same)
  - [Publishing to GitHub Packages](#publishing-to-github-packages)
  - [Workflow security conventions](#workflow-security-conventions)
  - [Per-repo setup checklist](#per-repo-setup-checklist)
  - [Upgrading from Changesets v2](#upgrading-from-changesets-v2)
    - [Step 1: Check Node and package manager versions](#step-1-check-node-and-package-manager-versions)
    - [Step 2: Update the packages](#step-2-update-the-packages)
    - [Step 3: Update `.changeset/config.json`](#step-3-update-changesetconfigjson)
    - [Step 4: Update the GitHub Actions workflows](#step-4-update-the-github-actions-workflows)
    - [Step 5: Update CLI commands and flags](#step-5-update-cli-commands-and-flags)
    - [Step 6: Migrate prerelease state](#step-6-migrate-prerelease-state)
    - [Step 7: Review the remaining behavior changes](#step-7-review-the-remaining-behavior-changes)
  - [Migration Guide](#migration-guide)
    - [Prerequisites](#prerequisites)
    - [Step 1: Move to pnpm](#step-1-move-to-pnpm)
    - [Step 2: Install changesets](#step-2-install-changesets)
    - [Step 3: Configure changesets](#step-3-configure-changesets)
    - [Step 4: Set the initial version](#step-4-set-the-initial-version)
    - [Step 5: Copy the template variant](#step-5-copy-the-template-variant)
    - [Step 6: Set up the GitHub App](#step-6-set-up-the-github-app)
    - [Step 7: Configure the repository](#step-7-configure-the-repository)
    - [Step 8: Remove old release tooling](#step-8-remove-old-release-tooling)
    - [Step 9: First changeset](#step-9-first-changeset)
  - [Reference](#reference)
    - [Configuration File](#configuration-file)
    - [CI Workflows](#ci-workflows)
    - [Branch Protection](#branch-protection)
    - [Useful Commands](#useful-commands)
    - [Further Reading](#further-reading)

---

## Overview

This is the collana-solutions standard for managing versioning and changelogs with [Changesets](https://changesets.dev). It applies to every repo that publishes public packages, in two variants:

| Variant   | Registry                            | Templates                                  | Publishes through                                                                  |
| --------- | ----------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| **npm**   | [npmjs.com](https://www.npmjs.com)  | [`templates/npm/`](../templates/npm/)      | npm trusted publishing from `release.yml`                                          |
| **NuGet** | [nuget.org](https://www.nuget.org)  | [`templates/nuget/`](../templates/nuget/)  | nuget.org trusted publishing from `nuget-publish.yml`, after each GitHub Release   |

Neither variant stores a registry token. Both exchange a short-lived GitHub OIDC token for the publish credential, in a job that runs in the `production` environment. Only test packages still publish to GitHub Packages, see [Publishing to GitHub Packages](#publishing-to-github-packages).

The examples below use two illustrative packages, `@collana-solutions/pkg-a` and `@collana-solutions/pkg-b`, configured as a **fixed** group. Substitute your own package names. In a NuGet repo these are the names of the private `package.json` files that changesets versions next to each project, see [Adapting for NuGet Packages](#adapting-for-nuget-packages).

| Package (example)          | Path             |
| -------------------------- | ---------------- |
| `@collana-solutions/pkg-a` | `packages/pkg-a` |
| `@collana-solutions/pkg-b` | `packages/pkg-b` |

A **fixed** group means the packages always share the same version number: when one is bumped, the others are bumped to the same version too, even if they have no changes. A repo can have a single package, one fixed group, or several — adjust the `fixed` array in `.changeset/config.json`.

GitHub Releases are created automatically on publish.

This guide targets **Changesets v3** (`@changesets/cli@^3`, `@changesets/changelog-github@^1`) driven by **`changesets/action@v2`**. Changesets v3 ships as ES modules and requires Node.js `^22.11 || ^24 || >=26`, npm `>=10.9.0`, pnpm `>=10.0.0`, or Yarn `>=4.5.2`. Both templates use pnpm 11 (`"packageManager": "pnpm@11.22.0"`), so the commands below use `pnpm`. Already running v2? Start at [Upgrading from Changesets v2](#upgrading-from-changesets-v2).

> **Adopting this in your repo?** Copy the variant from [`templates/`](../templates/) and follow the [Migration Guide](#migration-guide). [`templates/README.md`](../templates/README.md) lists every spot marked `CUSTOMIZE`, and the [Per-repo setup checklist](#per-repo-setup-checklist) covers the settings outside the repository.

---

## For Contributors

### What Is a Changeset?

A changeset is a Markdown file committed to the `.changeset/` directory that describes:

1. **Which packages** are affected
2. **What type of version bump** is needed (major, minor, or patch)
3. **A human-readable description** of the change (added to the changelog)

### Adding a Changeset

After making your code changes, run:

```bash
pnpm changeset
```

You will be prompted to:

1. **Select the package(s)** affected by your change — use arrow keys and space to select
2. **Choose the bump type** for each selected package (major / minor / patch)
3. **Write a summary** of what changed

This creates a new file in `.changeset/` with a random name like `.changeset/brave-dogs-dance.md`. There is no confirmation step — the file is written as soon as you finish the summary. Edit or delete it afterwards if you got it wrong.

> **Tip:** Because our packages are configured as **fixed**, you only need to select one package. The other will be bumped automatically to the same version.

To skip the prompts entirely — handy in scripts — pass the bump and message as flags:

```bash
pnpm changeset --patch @collana-solutions/pkg-a -m "Fix the off-by-one in the paginator"
```

**Commit this file alongside your code changes.**

### Choosing the Right Semver Bump

| Bump                          | When to use                                                                    | Example                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **patch** (`1.0.0` → `1.0.1`) | Bug fixes, documentation updates, internal refactors that don't change the API | Fix a typo in output, correct a calculation                                     |
| **minor** (`1.0.0` → `1.1.0`) | New features that are backwards-compatible                                     | Add a new exported function, add a new option                                   |
| **major** (`1.0.0` → `2.0.0`) | Breaking changes                                                               | Rename/remove a public function, change return types, drop Node version support |

When in doubt, prefer the **smallest** bump type that is accurate.

### Empty Changesets (Non-Releasable Changes)

The CI check only requires a changeset when your PR **changes files inside a package** (e.g. `packages/pkg-a/`). PRs that touch only non-package files pass automatically with no changeset — for example:

- Updating CI configuration
- Changing test files that live outside a package
- Modifying documentation that isn't in a package
- Refactoring root-level build scripts

You only need an **empty changeset** when you changed a package but intentionally don't want a release (for example, a comment-only or test-only change *inside* a package):

```bash
pnpm changeset --empty
```

This creates a changeset file that tells CI "I intentionally have no release." It will not trigger any version bumps or changelog entries.

### Multiple Changesets per PR

You can add **multiple changesets** to a single PR. This is useful when:

- You made multiple distinct changes that should have separate changelog entries
- You want to bump different packages at different levels

Just run `pnpm changeset` multiple times. Each creates a separate file.

### What Happens If You Forget a Changeset

If your PR **changed a package** but has no changeset, the **CI workflow fails**. The `Changeset Check` job runs `changeset status --since=origin/<base>`, which exits with code 1 only when a versionable package changed and no changeset exists. (A PR that changed no package passes without one.)

> **"Versionable"** excludes private (`"private": true`) packages. Changesets v3 neither versions nor tags them unless you opt in with `"privatePackages": { "version": true, "tag": true }` in `.changeset/config.json` — which repos that use changesets purely for versioning, such as [NuGet repos](#adapting-for-nuget-packages), have to do.

To fix it:
1. Run `pnpm changeset` (or `pnpm changeset --empty` if the package change intentionally has no release)
2. Commit and push the generated file

The commit is not optional: `--since` compares committed history, so an unstaged or uncommitted `.changeset/*.md` does not satisfy the check.

### Changeset File Format

A changeset file looks like this:

```markdown
---
"@collana-solutions/pkg-a": minor
---

Add support for custom configuration options
```

The YAML frontmatter declares which packages are bumped and at what level. The body is the changelog entry (supports full Markdown).

### Editing or Removing a Changeset

- **Edit**: Simply modify the `.changeset/*.md` file — change the bump type in the YAML frontmatter or update the description
- **Remove**: Delete the `.changeset/*.md` file if the change is no longer needed

---

## For Maintainers

### Regular Release Flow

This is the standard release workflow that happens automatically:

```
Developer opens PR → adds changeset → PR merged to main
                                           ↓
                              Release workflow runs
                                           ↓
                          changesets/action detects changesets
                                           ↓
                    Creates/updates "chore: version packages" PR
                        (bumps versions, updates CHANGELOGs)
                                           ↓
                      Maintainer reviews and merges the PR
                                           ↓
                        Release workflow runs again on main
                                           ↓
                   changesets publishes the new versions
                                           ↓
         npm:   packages on npmjs.com, git tags and GitHub Releases
         NuGet: git tags and GitHub Releases → NuGet Publish → nuget.org
```

**Step by step:**

1. PRs with changesets get merged into `main`
2. The Release workflow automatically creates (or updates) a PR titled **"chore: version packages"**
3. This PR contains all the version bumps and CHANGELOG updates
4. When you're ready to release, **merge the Version Packages PR**
5. The Release workflow runs again, finds no pending changesets, and publishes. In the npm variant the `pack` and `publish` jobs push the new versions to npm (see [Release job layout](#release-job-layout)). In the NuGet variant `changeset publish` only creates the git tags.
6. GitHub Releases are created for the new tags. In the NuGet variant the release of the anchor package starts **NuGet Publish**, which pushes every package to nuget.org (see [NuGet publish workflow](#nuget-publish-workflow)).

> **Batching releases:** You can merge multiple PRs with changesets before merging the Version Packages PR. All changesets will be combined into a single release.

### How Fixed Packages Work

Both `@collana-solutions/pkg-a` and `@collana-solutions/pkg-b` are in a **fixed** group. This means:

- They **always share the same version number**
- When a changeset bumps one package, the other gets bumped to the same version automatically
- The **highest bump type wins** — if `pkg-a` gets a `minor` bump and `pkg-b` gets a `patch`, both end up with a `minor` bump
- As long as **at least one** package in the group has a changeset, **both are bumped and published** to the same version — even if the other has no changes (with no changeset for any group member, nothing is published)

**Example:**

Starting state: both at `0.0.0`

| Changeset says               | Result                      |
| ---------------------------- | --------------------------- |
| `pkg-a: patch`               | Both → `0.0.1`              |
| `pkg-a: minor`               | Both → `0.1.0`              |
| `pkg-a: minor, pkg-b: patch` | Both → `0.1.0` (minor wins) |
| `pkg-b: major`               | Both → `1.0.0`              |

### Testing before release

A published version is permanent: neither npm nor nuget.org lets you publish the same version number twice. To test a change in a real application before it is released, each variant publishes previews from its pull requests to a separate place, so no registry version is spent on them.

| Variant | Previews on                                 | Workflow                              | Per-repo setup                                   |
| ------- | ------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| npm     | [pkg.pr.new](https://pkg.pr.new)            | `.github/workflows/pkg.pr.new.yml`    | Install the pkg.pr.new GitHub App on the repo    |
| NuGet   | a [feedz.io](https://feedz.io) feed per repo | `.github/workflows/nuget-preview.yml` | Create the feed with a 30-day retention rule     |

#### pkg.pr.new (npm)

[pkg.pr.new](https://pkg.pr.new/) serves an installable tarball of every package for every commit, without publishing anything to npm. It needs **both** parts:

1. The [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) installed on the repository.
2. The `pkg.pr.new.yml` workflow from the npm template, which builds the packages and runs `pkg-pr-new publish` on every pull request and every push to `main`.

Without the App the publish step fails with `There is no workflow defined for <id>` (HTTP 404). `pkg-pr-new` is a locked dev dependency in the root `package.json`, not a `pnpm dlx` call, so it goes through the lockfile and the `minimumReleaseAge` floor like every other tool.

pkg.pr.new comments on the PR with install instructions like:

```bash
npm install https://pkg.pr.new/@collana-solutions/pkg-a@<commit-sha>
```

> **No `--compact`.** With `--compact`, pkg.pr.new prints shorter URLs, but those resolve the package through npm, so they fail for a package that has never been released. The template leaves the flag off.

#### feedz.io preview feed (NuGet)

NuGet has no counterpart to pkg.pr.new, so every NuGet repo has its own public preview feed on feedz.io:

- **One feed per repo** in the `collana-solutions` feedz.io organization, named after the repository in lowercase with dots as dashes (`Csag.Blueprint` → `csag-blueprint`, `Csag.WorkloadIdentity` → `csag-workloadidentity`). Its URL, `https://f.feedz.io/collana-solutions/<feed>/nuget/index.json`, goes into `FEED_URL` in `nuget-preview.yml`.
- **Public read access**, so consumers restore without credentials.
- **A retention rule that removes versions after 30 days.** The workflow never deletes anything itself.
- **The org secret `FEEDZ_TOKEN`** authenticates the push. feedz.io has no trusted publishing, which is why `.github/zizmor.yml` exempts `nuget-preview.yml` from the `use-trusted-publishing` audit. Pull requests from forks and from Dependabot cannot read the secret, so they publish no preview.

`nuget-preview.yml` runs on every pull request to `main` or `release/**` that is not a draft. It packs every package with a preview version, pushes the `.nupkg` and `.snupkg` files to the feed, and keeps one comment on the PR updated with the version of the latest push.

**How previews are numbered.** The version comes from the anchor package's `package.json`:

| Pull request                                  | Preview version                           | Example, with `1.4.2` released |
| --------------------------------------------- | ----------------------------------------- | ------------------------------ |
| Any feature PR                                | one patch above the current release       | `1.4.3-pr.42.183`              |
| The Version Packages PR (`changeset-release/*`) | release candidate of the upcoming version | `1.5.0-pr.73.190`              |

`42` and `73` are PR numbers, `183` and `190` workflow run numbers. The run number gives every push a new version, because NuGet caches a package by ID and version and never downloads the same version twice. Every preview sorts above the current release, and all packages of the repo get the same preview version. A consumer that moves only some packages of a fixed group to a preview therefore gets a `NU1605` downgrade error instead of a silent mix.

**Using a preview.** Add the feed to the application's `nuget.config`, with package source mapping:

```xml
<packageSources>
  <clear />
  <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
  <add key="csag-blueprint-previews" value="https://f.feedz.io/collana-solutions/csag-blueprint/nuget/index.json" />
</packageSources>
<packageSourceMapping>
  <packageSource key="nuget.org">
    <package pattern="*" />
    <package pattern="Csag.Blueprint.*" />
  </packageSource>
  <packageSource key="csag-blueprint-previews">
    <package pattern="Csag.Blueprint.*" />
  </packageSource>
</packageSourceMapping>
```

The package pattern has to appear under nuget.org as well. NuGet only asks the sources of a package's most specific pattern, so without it the released versions stop restoring. Then set the packages to the preview version, and update the `packages.lock.json` files if the application restores in locked mode.

Add the feed only on the branch that tests the preview, never on the application's main branch, so its everyday restores do not depend on feedz.io.

### Prereleases / Release Candidates

For planned major releases or beta periods, use changesets' built-in prerelease mode.

> **Note:** Prerelease mode is stored in `.changeset/pre.json`, created by `changeset pre enter`. A fresh repo should **not** have this file. If you inherit a repo that's stuck in prerelease mode, run `pnpm changeset pre exit` before cutting a stable release.
>
> While prerelease mode is active, every changeset that has already shipped in a prerelease is moved from `.changeset/` into `.changeset/pre/`. Those files stay there to build the changelog of the eventual stable release; edit or delete them directly if an entry is no longer relevant. `.changeset/pre.json` never has to be hand-edited to keep up.

**Allowed prerelease tags:**

| Tag     | Purpose                                                              | Version example |
| ------- | -------------------------------------------------------------------- | --------------- |
| `alpha` | Early unstable builds for internal testing — APIs may still change   | `2.0.0-alpha.0` |
| `beta`  | Feature-complete preview for broader testing — APIs mostly stable    | `2.0.0-beta.0`  |
| `rc`    | Release candidate, believed ready — only critical fixes before final | `2.0.0-rc.0`    |

#### How it works

Prereleases always happen **on `main`**. While prerelease mode is active, every release from `main` produces prerelease versions (e.g., `2.0.0-beta.0`) instead of stable ones. No stable releases can happen until you exit prerelease mode.

If you need to maintain the previous major version during the beta period, branch it off **before** entering prerelease mode. The Release workflow automatically creates a `release/vX.x` branch when a major version is published, so in most cases this is already done for you (see [Backporting / Hotfixes](#backporting--hotfixes-on-older-versions)).

```
main:              1.4.0 → 2.0.0-beta.0 → 2.0.0-beta.1 → 2.0.0 (stable)
release/v1.x:         └→ 1.4.1 → 1.4.2  (maintenance, stable)
```

#### Step-by-step walkthrough

This example assumes packages are at `1.4.0` and you want to beta-test `2.0.0`.

**1. Enter prerelease mode (via PR):**

```bash
git checkout -b chore/enter-beta
pnpm changeset pre enter beta
git add .changeset/pre.json
git commit -m "Enter prerelease mode (beta)"
git push -u origin chore/enter-beta
# Open PR → main, merge it
```

**2. The Release workflow takes over:**

Once `pre.json` is on `main`, the existing changesets (with major bumps) are versioned as `2.0.0-beta.0` instead of `2.0.0`. The workflow creates a Version Packages PR → you merge it → packages are published to the `beta` dist-tag automatically.

Users running `npm install @collana-solutions/pkg-a` still get `1.4.0`. Only `npm install @collana-solutions/pkg-a@beta` gets `2.0.0-beta.0`.

**3. More betas (normal development continues):**

Merge more PRs with changesets into `main` as usual. Each time you merge the Version Packages PR, the next beta is published: `2.0.0-beta.1`, `2.0.0-beta.2`, etc.

The version stays `2.0.0-beta.X` — new patch or minor changesets during the beta just increment the beta counter, they don't change the base version.

**4. Exit prerelease mode (via PR):**

```bash
git checkout -b chore/exit-beta
pnpm changeset pre exit
git add .changeset/pre.json
git commit -m "Exit prerelease mode"
git push -u origin chore/exit-beta
# Open PR → main, merge it
```

The Version Packages PR now shows `2.0.0` (stable). Merge it → published to `latest`.

#### Summary

```
1.4.0 (stable, latest)
  │
  ├── PR: enter prerelease mode (beta)     → merge to main
  ├── Version Packages PR                  → 2.0.0-beta.0 published @beta
  │
  ├── (more PRs with changesets)
  ├── Version Packages PR                  → 2.0.0-beta.1 published @beta
  │
  ├── PR: exit prerelease mode             → merge to main
  └── Version Packages PR                  → 2.0.0 published @latest
```

> **Important:** While prerelease mode is active on `main`, **no stable releases can ship from `main`**. For short beta cycles (days to a couple of weeks) this is fine. For very long betas, consider whether you need stable releases from `main` during that time.

#### Switching between prerelease phases

You can progress forward through prerelease phases: **alpha → beta → rc → stable**. To switch (e.g., from alpha to beta), edit the `tag` value in `.changeset/pre.json` — there is no need to exit and re-enter prerelease mode:

```bash
git checkout -b chore/switch-to-beta
# In .changeset/pre.json, change "tag": "alpha" to "tag": "beta"
git add .changeset/pre.json
git commit -m "Switch from alpha to beta"
git push -u origin chore/switch-to-beta
# Open PR → main, merge it
```

If you already published versions under the previous phase (e.g., `2.0.0-alpha.3`), you need at least one pending changeset for the Release workflow to produce `2.0.0-beta.0` — the changesets already consumed by the alphas now live in `.changeset/pre/` and don't count. If there are no pending changesets, add one:

```bash
pnpm changeset
# Select any package, choose patch, write "Promote to beta"
```

**Full progression example:**

```
2.0.0-alpha.0 → 2.0.0-alpha.1 → 2.0.0-alpha.2
    ↓ switch to beta (exit + re-enter)
2.0.0-beta.0  → 2.0.0-beta.1
    ↓ switch to rc (exit + re-enter)
2.0.0-rc.0    → 2.0.0-rc.1
    ↓ exit prerelease mode
2.0.0 (stable)
```

> **Never go backwards** (e.g., beta → alpha). Semver sorts `alpha` before `beta`, so `2.0.0-alpha.0` is considered a *lower* version than `2.0.0-beta.0`. Package managers won't upgrade users from beta to alpha because it looks like a downgrade. If you promoted to beta too early, just keep publishing more betas (`beta.1`, `beta.2`, ...) — the counter is unlimited.

#### When to use prereleases

Prereleases block stable releases from `main`. Before entering prerelease mode, consider whether it's actually needed:

| Scenario                                               | Recommendation                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **Major release** (breaking changes)                   | Prereleases make sense — consumers need time to adapt                            |
| **Minor release** (new features, backwards-compatible) | Usually unnecessary — just release stable and ship a patch if something is wrong |
| **Patch release**                                      | Never needs a prerelease                                                         |

For minor releases, the [preview packages](#testing-before-release) from pkg.pr.new or the feedz.io feed often cover the "test before shipping" need without blocking `main`.

If you do run a prerelease for a minor version and then need an emergency patch on the current stable version, see [Emergency patches during a prerelease](#emergency-patches-during-a-prerelease).

#### Emergency patches during a prerelease

If `main` is in prerelease mode (e.g., shipping `1.3.0-beta.0`) and you need to release an urgent patch on top of the current stable version (`1.2.3` → `1.2.4`), you can't do it from `main` — versions there are already `1.3.0-beta.X`.

Instead, create a release branch from the last stable tag and use the normal backport flow:

**1. Create the release branch (one-time):**

```bash
git checkout -b release/v1.2.x @collana-solutions/pkg-a@1.2.3
git push -u origin release/v1.2.x
```

**2. Fix, changeset, PR — same as any backport:**

```bash
git checkout release/v1.2.x && git pull
git checkout -b fix/urgent-bug
# Apply the fix
pnpm changeset   # select patch
git push -u origin fix/urgent-bug
# Open PR → release/v1.2.x (not main!)
```

**3. Merge → Version Packages PR → merge → `1.2.4` published.**

**4. Cherry-pick the fix to `main`** so it's also included in the upcoming `1.3.0`:

```bash
git checkout main && git pull
git checkout -b fix/cherry-pick-urgent-bug
git cherry-pick <commit-sha>
pnpm changeset   # select patch
git push -u origin fix/cherry-pick-urgent-bug
# Open PR → main
```

The timeline looks like this:

```
main:              1.2.3 → 1.3.0-beta.0 → 1.3.0-beta.1 (includes cherry-picked fix) → 1.3.0
                      │
release/v1.2.x:       └→ 1.2.4 (emergency patch)
```

> **Note:** Unlike major version release branches (which are auto-created), you must create this branch manually. This is intentional — minor prereleases are rare, and the branch naming uses the full minor version (`v1.2.x`) to distinguish it from the major version branch (`v1.x`).

#### Pivoting from a minor to a major prerelease

If you entered prerelease mode for a minor version (e.g., `2.1.0-beta.0`) but then realize you need breaking changes, you can add a major changeset. The next `changeset version` will produce `3.0.0-beta.0` — changesets recalculates the base version from all pending changesets each time.

Consumers on the `@beta` tag will jump from `2.1.0-beta.0` to `3.0.0-beta.0`. This is valid semver (3.0.0 > 2.1.0) but may surprise beta users.

**If you still need stable `2.1.0`** (the minor features from the beta, without the breaking changes), you can ship it from a release branch:

1. Create `release/v2.x` from the last beta tag before the major change was added:
   ```bash
   git checkout -b release/v2.x @collana-solutions/pkg-a@2.1.0-beta.0
   git push -u origin release/v2.x
   ```

2. Exit prerelease mode on that branch (via PR targeting `release/v2.x`):
   ```bash
   git checkout -b chore/exit-beta-v2
   pnpm changeset pre exit
   git add .changeset/pre.json
   git commit -m "Exit prerelease mode"
   git push -u origin chore/exit-beta-v2
   # Open PR → release/v2.x
   ```

3. Merge → Version Packages PR shows `2.1.0` (stable) → merge → published with `v2` dist-tag.

The timeline:

```
main:           2.0.0 → 2.1.0-beta.0 → 3.0.0-beta.0 → 3.0.0 (stable)
                             │
release/v2.x:                └→ exit beta → 2.1.0 (stable) → 2.1.1 (patches)
```

> **No conflict with auto-creation:** When `3.0.0` is published from `main`, the workflow tries to auto-create `release/v2.x` but sees it already exists and skips it.

### Backporting / Hotfixes on Older Versions

When `main` has moved on to a new major version (e.g., v2.x) but you need to release a fix for an older major version (e.g., v1.x), you use a **release branch**. This covers both planned backports and urgent hotfixes — the process is identical.

#### Understanding the `release/v1.x` branch

`release/v1.x` is a **long-lived maintenance branch** for the entire v1 line. The naming convention is:

- `release/v1.x` — maintains all v1 releases
- `release/v2.x` — maintains all v2 releases (when v3 is on `main`)
- etc.

The `.x` is just a naming convention meaning "this branch handles all releases for this major version." It is **not** a git pattern or wildcard — it's a plain branch name.

**Key rules:**
- The Release workflow **automatically creates** this branch when a new major version is published from `main` (e.g., publishing `2.0.0` creates `release/v1.x` from the highest stable `1.x.y` tag of the published packages)
- You **reuse** it for all subsequent patches and minor releases for that major version
- It accumulates releases linearly: v1.5.2 → v1.5.3 → v1.6.0 → v1.6.1 → ...
- The CI and Release workflows are configured to run on `release/**` branches, so the process is fully automated — just like `main`

#### Setting up a release branch (manual fallback)

In most cases the release branch is created automatically. Create one manually when you need it retroactively, or when the Release run shows a "Could not create release/vX.x" warning. GitHub can refuse the workflow token when branching from an older commit (HTTP 403), and the warning then prints the exact `git push` command to run instead:

```bash
# Create the release branch from the last v1 tag
git checkout -b release/v1.x @collana-solutions/pkg-a@1.5.2
git push -u origin release/v1.x
```

> **Tags from before the scope rename:** the organization was called `neolution-ch` before, and older release tags read `@neolution-ch/<pkg>@<version>`. The Release workflow only looks at tags of the packages it just published, so the first major release after the rename finds no tag of the previous major and creates no release branch. Create it by hand from the last `@neolution-ch/...` tag of that major. The NuGet tag gate also skips these tags, which is fine because their versions are on nuget.org already.

> **Tip:** After pushing, configure **branch protection rules** for `release/**` in GitHub Settings (same rules as `main` — require status checks, require PR reviews). This ensures backports go through CI and code review.

#### Releasing a backport

The process is the same as a normal release — just target the release branch instead of `main`:

1. **Create a feature branch** from the release branch:
   ```bash
   git checkout release/v1.x
   git pull
   git checkout -b fix/backport-my-fix
   ```

2. **Cherry-pick or apply the fix:**
   ```bash
   git cherry-pick <commit-sha>
   # or make the fix directly
   ```

3. **Add a changeset:**
   ```bash
   pnpm changeset
   # Select the affected package(s) and bump type (usually patch)
   ```

4. **Push and open a PR targeting `release/v1.x`** (not `main`):
   ```bash
   git push -u origin fix/backport-my-fix
   # Open PR: fix/backport-my-fix → release/v1.x
   ```

5. **CI runs automatically** — the Changeset Check validates against `release/v1.x`

6. **Merge the PR** — the Release workflow runs on `release/v1.x`, creating a Version Packages PR targeting that branch

7. **Merge the Version Packages PR**: the packages are published (npm through the `backport` job, NuGet through NuGet Publish) and a GitHub Release is created

8. **Cherry-pick back to `main`** if the fix also applies to the current version

#### Timeline example

```
main:          v1.5.2 ──── v2.0.0 ──── v2.1.0 ──── v2.2.0
                  │
release/v1.x:     └──── v1.5.3 ──── v1.5.4 ──── v1.6.0
                        (backport)  (backport)  (backport)
```

All releases from `release/v1.x` go through the same automated flow: PR → CI check → merge → Version Packages PR → merge → publish.

> **Dist-tags (npm):** Backport releases are published with a version-specific dist-tag (e.g., `release-v1`) instead of `latest`. NuGet has no dist-tags, so a backport is simply a lower version on nuget.org. This means `npm install @collana-solutions/pkg-a` always returns the highest stable version from `main`, while `npm install @collana-solutions/pkg-a@release-v1` returns the latest v1 release.

> **Don't combine a release branch with prerelease mode.** `changeset publish --tag <name>` is rejected outright while `pre.json` is in `pre` mode ("Releasing under custom tag is not allowed in pre mode!", exit 1). Since the npm `backport` job adds `--tag release-vN` on every `release/**` branch, a prerelease there will fail the publish step. Exit prerelease mode before the Version Packages PR is merged, or drop the `--tag` for that branch. Prereleases on `main` are unaffected: no `--tag` is passed there, and changesets publishes under the prerelease tag by itself. The NuGet Release workflow passes no `--tag` at all, so this does not apply to NuGet repos.

> **Changelogs:** Each branch maintains its own `CHANGELOG.md`. The changelog on `release/v1.x` only contains v1 entries, while `main` only contains entries from `main`. The **GitHub Release page** is the canonical cross-branch reference for all release notes.

### Recovering From a Failed Publish

If a publish fails (network error, registry outage, a trust configuration that does not match the workflow):

1. **Check what was published:** the package pages on npmjs.com or nuget.org, and the git tags and GitHub Releases of the repo.
2. **npm:** re-run the failed Release run from the Actions tab. `select-mode` compares the `package.json` versions with npm again, so the publish plan contains only what is still missing.
3. **NuGet:** once the Release run has created the tags and GitHub Releases, re-run the failed **NuGet Publish** run, or start **NuGet Publish** from the Actions tab with the anchor package's release tag. Pushes use `--skip-duplicate`, so packages that already went through are skipped. If the Release run itself failed before tagging, re-run that first.
4. **If some packages were published**: Changesets is idempotent. Running `changeset publish` again skips already-published versions and publishes the remaining ones. Git tags are checked both locally and against the remote, so a re-run reports existing tags rather than trying to recreate them.
5. **If versions were bumped but not published**: The Version Packages PR was already merged, so versions are bumped in `main`. Just re-run the publish.

### Manual Publish Fallback

Use this only when the workflows cannot publish, the release cannot wait, and a [re-run](#recovering-from-a-failed-publish) has failed. No registry token is stored anywhere, so a manual publish runs with a maintainer's own credentials. It loses the provenance that the workflows add, and the [tag ruleset](#per-repo-setup-checklist) lets only admins push release tags by hand.

**npm.** The Version Packages PR is merged, so `main` carries the new versions:

```bash
# 1. A clean checkout of main
git checkout main && git pull
pnpm install --frozen-lockfile

# 2. Log in with an account that may publish the packages. With "Require two-factor
#    authentication and disallow tokens" set, publishing works interactively with a one-time code.
npm login

# 3. Build, then publish what is not on npm yet. This also creates the git tags locally.
pnpm run build
pnpm changeset publish --otp=<code>

# 4. Push the tags (needs an admin, see the tag ruleset)
git push --follow-tags
```

Then create the GitHub Releases by hand, for example with `gh release create <tag> --notes "<CHANGELOG entry>"`.

**NuGet.** Run **NuGet Publish** from the Actions tab with the anchor package's release tag first. If trusted publishing itself is broken, publish from a clean clone:

```bash
# 1. The release tag of the anchor package
git checkout "@collana-solutions/<anchor-package>@1.2.3"

# 2. Remove the changesets stubs and pack. CI builds are deterministic only with ContinuousIntegrationBuild.
find . -name package.json -not -path "*/node_modules/*" -delete
dotnet pack --configuration Release -p:ContinuousIntegrationBuild=true -o ./nupkgs

# 3. Push with a short-lived API key
dotnet nuget push "./nupkgs/*.nupkg" --api-key "<key>" --source https://api.nuget.org/v3/index.json --skip-duplicate
```

Create the API key on nuget.org for the owner `collana-solutions`, with the **Push** scope, a glob that matches only the repo's package IDs and the shortest expiry, and delete it right after the push. If the release tags do not exist yet, run `pnpm changeset publish` on `main` first: the packages are private, so it only creates the tags. Push them with `git push --follow-tags`.

> **Tags without a registry:** `changeset publish` creates the git tags as part of publishing. If you only need the tags (a failed publish that already went through, or a repo that publishes elsewhere), run `pnpm changeset git-tag`.

### Reverting a Changeset

If a changeset was added by mistake (before it's been versioned):

```bash
# Simply delete the changeset file
rm .changeset/brave-dogs-dance.md
git add . && git commit -m "Remove incorrect changeset"
```

### Reverting a Release

If a version was published that needs to be undone:

1. **A published version cannot be replaced.** npm allows unpublishing only in narrow cases and nuget.org not at all, and neither registry ever accepts the same version number again.
2. Instead, publish a **new patch version** with the fix or revert:
   ```bash
   git revert <commit-of-bad-change>
   pnpm changeset  # add a patch changeset describing the revert
   # Merge to main, let the regular release flow publish the fix
   ```
3. If the version is truly broken, **deprecate** it:
   - npm: `npm deprecate @collana-solutions/pkg-a@1.2.0 "This version has a critical bug, use 1.2.1"`
   - nuget.org: on the package's **Manage** page, select the version under **Deprecation**, choose the reason, and name the fixed version as the alternate.

### Skipping a Package From Release

To temporarily prevent a package from being published (e.g., it's not ready):

Add it to the `ignore` array in `.changeset/config.json`:

```json
{
  "ignore": ["@collana-solutions/pkg-b"]
}
```

> **Warning:** This is for **temporary** use only. If a changeset references both an ignored and non-ignored package, publishing will fail. Remove the package from `ignore` when you're ready to publish it again.

> **Dependents have to be ignored too.** As soon as `ignore` is non-empty (or private packages are excluded from versioning), config validation walks the dependency graph and errors if anything that depends on a skipped package is not itself skipped. `devDependencies` are exempt.

> **Permanent exclusion:** If a package should never be published, set `"private": true` in its `package.json` instead. Changesets v3 skips private packages entirely — no version bump, no git tag — unless `privatePackages` opts them back in.

### Force-Publishing Without Changes

Sometimes you need to publish a new version even with no code changes (e.g., to update metadata, rebuild with a new toolchain):

```bash
pnpm changeset
# Select the package(s) and choose "patch"
# Write something like "Rebuild with updated toolchain"
```

Since the packages are **fixed**, bumping either one will bump both.

### Dependabot Automation

Dependabot PRs don't include changeset files, so CI will initially fail. A dedicated workflow automatically generates a changeset for every Dependabot PR — no manual intervention needed.

#### How it works

```
Dependabot opens PR
  → CI fails (no changeset)
  → Dependabot Changeset workflow triggers:
      1. Checks if a changeset already exists → skips if yes
      2. Checks if any workspace package.json files changed (git diff),
         or in a NuGet repo the .csproj, lock and Directory.Packages.props files
      3. Parses the PR title and body to extract dependency update info
      4. Generates a changeset file
      5. Commits and pushes it (via GitHub App token)
  → Push triggers CI re-run → CI passes ✓
```

The workflow determines the changeset type based on what changed:

| What changed                                             | Changeset type                            | Effect                                                                                                                     |
| -------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Workspace `package.json` (direct dependency update)      | `patch` bump for all fixed-group packages | Triggers a release — consumers' dependency tree changes                                                                    |
| Only lockfile or root `package.json` (transitive update) | Empty changeset (no bump)                 | Passes CI but does **not** trigger a release — consumers are unaffected because published packages don't include lockfiles |

#### What gets generated

The script parses the PR body to build a summary table. Dependabot's phrasing varies by PR type, so the parser accepts a few forms:

- **Single / security PRs**: `Bumps [package](url) from X to Y`
- **Grouped PRs**: one line per dependency reading `Updates <name> from X to Y`, where `<name>` is either a markdown link `[package](url)` or written in backticks

The generated changeset includes the PR title and a table with emoji bump indicators:

**Single dependency update:**

```markdown
---
"@collana-solutions/pkg-a": patch
"@collana-solutions/pkg-b": patch
---

Bump jws from 4.0.0 to 4.0.1

| Package | From  | To    | Bump    |
| ------- | ----- | ----- | ------- |
| jws     | 4.0.0 | 4.0.1 | 🟢 patch |
```

**Grouped dependency update:**

```markdown
---
"@collana-solutions/pkg-a": patch
"@collana-solutions/pkg-b": patch
---

Bump the npm-ecosystem group with 3 updates

| Package    | From   | To     | Bump    |
| ---------- | ------ | ------ | ------- |
| react      | 17.0.2 | 18.0.0 | 🔴 major |
| typescript | 5.3.0  | 5.4.0  | 🟡 minor |
| eslint     | 8.56.0 | 8.57.0 | 🟢 patch |
```

If the PR body can't be parsed (unexpected format), the changeset falls back to using just the PR title — it never fails.

#### Setup

The workflow (`.github/workflows/dependabot-changeset.yml`), the script (`scripts/generate-dependabot-changeset.mjs`) and `.github/dependabot.yml` are part of both template variants. `dependabot.yml` waits 30 days before it proposes a GitHub Actions update and 14 days for npm and NuGet packages (`cooldown`), and groups all updates of an ecosystem into one PR, with a separate group for security updates, which skip the cooldown.

The workflow authenticates with the `CHANGESETS_BOT_CLIENT_ID` and `CHANGESETS_BOT_PRIVATE_KEY` secrets. Both exist at org level, as **Actions** secrets and as **Dependabot** secrets. Check that the repository has access to them under **Organization settings** → **Secrets and variables**.

> **Why Dependabot secrets?** Dependabot PRs cannot access regular Actions secrets for security reasons. GitHub provides a separate secrets store specifically for Dependabot-triggered workflows. This avoids using `pull_request_target` (which runs with elevated privileges and is a security risk).

> **Note:** The workflow uses the GitHub App token (not `GITHUB_TOKEN`) to push commits, so the pushed changeset triggers a CI re-run, the same pattern as the Release workflow. The token is passed to `git push` explicitly and never stored in the git config.

---

## Publishing to public npm

The npm template publishes to the public registry (`registry.npmjs.org`) through [trusted publishing](https://docs.npmjs.com/trusted-publishers). npmjs.com trusts the repository, the workflow file `release.yml` and the environment `production`, and pnpm exchanges the job's GitHub OIDC token for a short-lived publish token. No npm token is stored anywhere, and the published versions carry [provenance](https://docs.npmjs.com/generating-provenance-statements) without any extra flag.

### Release job layout

`release.yml` follows the [changesets automating guide](https://changesets.dev/guide/automating) and splits the release on `main` into jobs, so only one job can ever request an npm credential:

```text
push to main
  select-mode         contents: read                       version, publish or none
    version           App token                            opens or updates the version PR
    pack              contents: read                       builds, uploads the tarballs
      publish         id-token: write, env production      no build, install with --ignore-scripts
        release-branch    App token                        major bumps only
push to release/**
  backport            id-token: write, env production      one job, publishes to release-vN
```

- **`select-mode`** decides what the run does: `version` while changesets are pending, `publish` when a `package.json` version is not on npm yet, `none` otherwise.
- **`version`** opens or updates the Version Packages PR with the App token, so CI runs on it.
- **`pack`** installs with the install scripts that `allowBuilds` in `pnpm-workspace.yaml` permits, builds, and uploads the tarballs of the publish plan as an artifact. It has no publish credentials.
- **`publish`** is the only job with `id-token: write`, and it runs in the environment `production`. It installs with `pnpm install --frozen-lockfile --ignore-scripts`, because the publish sub-action runs the changesets CLI from `node_modules`, builds nothing, and publishes the packed tarballs. Code from the dependency tree therefore never runs next to the publish credential. It creates the git tags and GitHub Releases with the App token, so the [tag ruleset](#per-repo-setup-checklist) can allow the App alone.
- **`release-branch`** creates `release/vN.x` after a major release (see [Backporting](#backporting--hotfixes-on-older-versions)).
- **Every release job** sets `package-manager-cache: false` on `actions/setup-node`, so no job restores a dependency cache that a pull request run could have written.

**Backports run as a single `backport` job.** Changesets refuses a custom dist-tag in artifact mode ("Releasing under custom tag is not allowed in artifact mode"), and `publish-plan` has no tag option. A push to `release/**` therefore runs one job that versions, builds and publishes with `changeset publish --tag release-vN`, also through trusted publishing in the environment `production`. Building next to the publish credential is accepted there because backports are rare.

### Registry configuration

- **`.changeset/config.json`:** `"access": "public"`. Scoped packages default to private on npm, and the first publish returns HTTP 403 without it.
- **`.npmrc`:** commit it with `registry=https://registry.npmjs.org/` and `@collana-solutions:registry=https://registry.npmjs.org/`. When changesets checks whether a version is already published, it follows pnpm's registry resolution and ignores `publishConfig.registry` in `package.json`, so the registry has to be named in `.npmrc`.
- **No `registry-url` on `actions/setup-node`.** With it, setup-node writes an auth line for a `NODE_AUTH_TOKEN` that the workflow does not have.
- **pnpm 11.1.3 or later.** pnpm supports trusted publishing since 11.0.7, and 11.1.3 fixed the clash with the `.npmrc` that setup-node writes. Changesets publishes through `pnpm publish` in a pnpm repo. The template pins `pnpm@11.22.0`.

> **On the `access` field:** `access` is an npm CLI flag (`npm publish --access <value>`). It controls scoped-package visibility on **npmjs.org only** (`restricted` = private, `public` = public). GitHub Packages **ignores** it: there, visibility comes from the repository and package settings.

### Connecting the trusted publisher

Every package needs a trusted publisher on npmjs.com that names the repository, `release.yml` and the environment `production`. Register it for all packages of the repo with `npm trust`, logged in as a maintainer of the packages:

```bash
for p in pkg-a pkg-b; do
  npm trust github "@collana-solutions/$p" --repo collana-solutions/<repo> \
    --file release.yml --env production --allow-publish --yes
  sleep 2
done
```

- **`--allow-publish` is required.** A new trusted publisher configuration allows only staged publishing unless it is set, and the workflow publishes directly.
- **Publish within 2 days.** A new configuration has to publish within 2 days, so register it right before merging the Version Packages PR.
- **The package has to exist.** `npm trust` only accepts packages that are already on npm. If npmjs.com offers no way to add a trusted publisher to an unpublished name, publish its first version by hand (see [Manual Publish Fallback](#manual-publish-fallback)) and register the trusted publisher afterwards.

**After the first trusted publish**, set every package to **Require two-factor authentication and disallow tokens** (package **Settings** on npmjs.com). Trusted publishing keeps working, and no token can publish any more. Then delete the npm token secrets the repo used, and remove the org secret once nothing else uses it.

---

## Adapting for NuGet Packages

Changesets is an npm tool, but it can manage versioning and changelogs for .NET (NuGet) packages with a thin bridge. The key insight: let changesets handle what it's good at (changeset files, CI checks, changelogs, GitHub Releases) and use a separate workflow for the actual NuGet publish.

Changesets supports this officially. See [Beyond npm](https://changesets.dev/guide/beyond-npm), which names NuGet explicitly, and the [Publish Git Tags Only](https://changesets.dev/guide/automating) recipe. The NuGet template is that pattern with the collana-solutions workflows wired in, publishing to nuget.org through trusted publishing.

### Architecture

```
Changesets handles:                    nuget-publish.yml handles:
├── Changeset files (.changeset/*.md)  ├── Triggers on: GitHub Release published
├── CI changeset check                 ├── Runs only for the anchor package's tag
├── Version Packages PR                ├── Restore, build, test, dotnet pack
├── Changelog generation               ├── NuGet/login: OIDC token → 1-hour API key
├── Git tags                           └── dotnet nuget push to nuget.org (.nupkg and .snupkg)
└── GitHub Releases
```

Changesets creates GitHub Releases with tags like `@collana-solutions/pkg-a@1.2.3`. The NuGet publish workflow triggers on `release: published` and extracts the version from the tag.

### Repository structure

Each packed .NET project needs a minimal `package.json` so changesets can track its version:

```
├── .changeset/
│   └── config.json
├── packages/
│   └── MyDotnetLib/
│       ├── MyDotnetLib.csproj
│       ├── package.json          ← minimal, for changesets only
│       └── README.md             ← packed into the .nupkg
├── Directory.Build.props         ← shared package metadata
├── global.json                   ← the SDK version the workflows install
├── icon.png                      ← package icon
├── package.json                  ← root: pnpm version and the changesets CLI
├── pnpm-workspace.yaml           ← lists the project directories
└── .github/workflows/
    ├── ci.yml
    ├── release.yml               ← version PR, tags, GitHub Releases
    ├── nuget-publish.yml         ← pushes to nuget.org on a GitHub Release
    └── nuget-preview.yml         ← pushes PR previews to feedz.io
```

The projects do not have to live under `packages/`. A single-package repo often keeps its project folder at the root. List the directories in `pnpm-workspace.yaml` and adjust the paths marked `CUSTOMIZE` in the templates.

The per-project `package.json` is minimal:

```json
{
  "name": "@collana-solutions/my-dotnet-lib",
  "version": "1.0.0",
  "private": true
}
```

> **Note:** `"private": true` prevents accidental npm publishing. This file exists solely for changesets version tracking.

Because every package here is private, `.changeset/config.json` **must** opt them back in. Changesets v3 skips private packages by default, and without this the whole setup goes quiet rather than failing:

```json
{
  "privatePackages": { "version": true, "tag": true }
}
```

`version: true` lets `changeset version` bump the `package.json` versions; `tag: true` lets `changeset publish` create the `@scope/pkg@1.2.3` git tags that `nuget-publish.yml` triggers on. Nothing is sent to npm — `changeset publish` skips private packages and only tags them. (`changeset git-tag` does the tagging on its own if you ever need it outside the release flow.)

Both sub-options matter, and each fails differently:

| Missing         | Symptom                                                                                                                                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version: true` | `changeset status` treats every package as unversionable, so the **Changeset Check passes on every PR** — the gate is a silent no-op, not a failure. `changeset` and `changeset --empty` meanwhile exit 1 with an error that never mentions `privatePackages`, so contributors can't add one either |
| `tag: true`     | `changeset publish` prints "No unpublished projects to publish.", exits 0, and creates no git tags — so no GitHub Release, and `nuget-publish.yml` never triggers                                                                                                                                   |

> The upstream migration guide suggests `{ "version": true, "tag": false }` for restoring v2 behavior. That is the right value for a repo whose private packages are internal fixtures; it is the **wrong** value here, because the git tags are the trigger for the NuGet publish.

> **Commit `pnpm-workspace.yaml`.** Changesets finds the packages through the pnpm workspace, which it recognizes by `pnpm-workspace.yaml` at the repo root. Without it the repo collapses to a single root package: `changeset` fails with "No versionable packages found", and any tag that does get created is named `v1.2.3` instead of `@scope/pkg@1.2.3`, which the version parsing in `nuget-publish.yml` relies on. Commit `pnpm-lock.yaml` as well, because every workflow installs with `--frozen-lockfile`.

### Version sync script

`changeset version` only bumps the `package.json` files. [`scripts/sync-versions.mjs`](../templates/nuget/scripts/sync-versions.mjs) wraps it, and the Release workflow runs it as its `version-script`. The script:

1. runs `pnpm exec changeset version`,
2. writes each workspace package's new version into the `<Version>` of the `.csproj` in the same directory (or adds a `<Version>` to its first `PropertyGroup`),
3. runs `dotnet restore --force-evaluate`. A `packages.lock.json` records the version of every project its project references, and neither a locked nor a plain restore notices when that version is out of date. Without references between the packed projects nothing changes in this step.

The Version Packages PR therefore carries the `package.json`, `.csproj`, CHANGELOG and lock file changes together. The restore runs at the repository root, so it needs exactly one solution or project file there.

`release.yml` is a single job. `changesets/action` runs with `version-script: node scripts/sync-versions.mjs` and `publish-script: pnpm exec changeset publish`. Nothing goes to npm: the packages are private, so `changeset publish` only creates the git tags, and the action creates one GitHub Release per tag. All of that is pushed with the App token, so the releases start NuGet Publish (a release created with `GITHUB_TOKEN` would start no workflow). No npm dist-tag is passed on `release/**` branches, so prereleases work there as well.

### NuGet publish workflow

[`nuget-publish.yml`](../templates/nuget/.github/workflows/nuget-publish.yml) runs on `release: published`:

- **Only the anchor package's tag publishes.** A fixed group produces one GitHub Release per package for the same version, and each one starts the workflow. The job runs only when the tag starts with the anchor package's name (`@collana-solutions/<anchor>@`), and it then packs and pushes every package of the repo. Any package of the fixed group can be the anchor, for example the one the others depend on. With a single package, that package is the anchor.
- **Environment `production`.** The job requests the OIDC token (`id-token: write`) in the environment `production`, which the nuget.org policy names. The environment's [deployment rules](#per-repo-setup-checklist) limit it to release tags and `main`.
- **Checks before the push.** It restores in locked mode, builds, tests and packs, then verifies that the anchor package's `.nupkg` carries the version from the tag. The version comes from the `.csproj` files, so this fails when the tag and the projects disagree.
- **Login last.** `NuGet/login` exchanges the OIDC token for an API key that is valid for one hour, so it runs only once the packages are built. Its `user` input is the org variable `NUGET_USER`.
- **Symbols too.** `dotnet nuget push "./nupkgs/*.nupkg"` also pushes the `.snupkg` next to each `.nupkg` to the nuget.org symbol server, with the same key.
- **Safe to repeat.** Runs are serialized and pushes use `--skip-duplicate`. To publish an existing release again, for example after a failed push, run **NuGet Publish** from the Actions tab with the anchor package's release tag.

> **Key detail:** The workflow deletes every `package.json` before packing, so none ends up inside a `.nupkg`. Leave the generated `CHANGELOG.md` files alone: `changesets/action` reads the entry for the released version out of the `CHANGELOG.md` beside each tagged `package.json` to build the GitHub Release body, and errors if the file exists without a matching entry.

### Trusted publishing on nuget.org

nuget.org trusts the workflow through a [trusted publishing policy](https://learn.microsoft.com/nuget/nuget-org/trusted-publishing). The account named in the org variable `NUGET_USER` creates it on nuget.org under its user name → **Trusted Publishing**:

| Field            | Value                                                            |
| ---------------- | ---------------------------------------------------------------- |
| Package owner    | `collana-solutions`                                              |
| Repository owner | `collana-solutions`                                              |
| Repository       | the repository name, for example `Csag.Blueprint`                |
| Workflow file    | `nuget-publish.yml` (the file name only)                         |
| Environment      | `production`                                                     |
| Packages         | a glob of the repo's package IDs, for example `Csag.Blueprint.*` |

- **`NUGET_USER`** is an org variable (not a secret) that holds the nuget.org profile name of the member of the `collana-solutions` nuget.org organization who owns the policies. `NuGet/login` sends it along with the OIDC token. If that account leaves the organization, its policies become inactive. Moving the policies to another account means recreating them there and changing this one variable.
- **The package owner has to own the package IDs.** A policy covers only packages that its package owner owns. If `collana-solutions` does not own an existing ID, the login works but the push returns HTTP 403. Add `collana-solutions` as an owner of every existing ID before the first trusted publish.
- **A repository rename needs a policy edit.** The policy matches the repository owner and name as well as their numeric GitHub IDs. A rename keeps the IDs but changes the name, so edit the policy right after renaming the repository.

### Package metadata

The packages need a project URL, a README, an icon, symbols and Source Link. Put the shared part into `Directory.Build.props` at the repository root and merge this block into the existing file:

```xml
<PropertyGroup>
  <!-- Deterministic builds with normalized source paths, in CI only. Local builds keep real paths for debugging. -->
  <ContinuousIntegrationBuild Condition="'$(GITHUB_ACTIONS)' == 'true'">true</ContinuousIntegrationBuild>
</PropertyGroup>

<!-- Package metadata shared by every packable project. -->
<PropertyGroup>
  <Authors>collana solutions AG</Authors>
  <Company>collana solutions AG</Company>
  <PackageLicenseExpression>MIT</PackageLicenseExpression>
  <PackageReadmeFile>README.md</PackageReadmeFile>
  <PackageIcon>icon.png</PackageIcon>
  <!-- CUSTOMIZE: the repository URL. -->
  <PackageProjectUrl>https://github.com/collana-solutions/YOUR-REPO</PackageProjectUrl>
  <RepositoryUrl>https://github.com/collana-solutions/YOUR-REPO</RepositoryUrl>
  <RepositoryType>git</RepositoryType>
  <!-- Source Link: the repository URL and commit go into the package, files outside git into the PDB. -->
  <PublishRepositoryUrl>true</PublishRepositoryUrl>
  <EmbedUntrackedSources>true</EmbedUntrackedSources>
  <!-- A .snupkg symbol package next to every .nupkg. -->
  <IncludeSymbols>true</IncludeSymbols>
  <SymbolPackageFormat>snupkg</SymbolPackageFormat>
</PropertyGroup>

<ItemGroup>
  <!-- Relative to each project, so every packed project brings its own README.md. -->
  <None Include="README.md" Pack="true" PackagePath="\" />
  <!-- One icon at the repository root for all packages. -->
  <None Include="$(MSBuildThisFileDirectory)icon.png" Pack="true" PackagePath="\" Visible="false" />
</ItemGroup>
```

- The .NET 8 SDK and later include Source Link for GitHub, so no package reference is needed.
- Use the collana-solutions package icon, for example `icon.png` from Csag.Blueprint.
- A project that ships only as an analyzer or source generator has no library symbols to pack. Set `<IncludeSymbols>false</IncludeSymbols>` in that project, otherwise pack fails with NU5017.
- `Description` and `PackageTags` belong in each project.
- Test, sample and demo projects must not be packed. Test projects set `<IsPackable>false</IsPackable>` through the test SDK, other projects need it set explicitly.

### Dependabot changesets for NuGet

The npm template's [Dependabot Changeset](#dependabot-automation) workflow decides between a real bump and an empty changeset by looking for changed `packages/*/package.json` files. In a NuGet repo those files are version-tracking stubs that Dependabot never touches. The NuGet template's detect step watches the files that do change a shipped package:

- the `.csproj` of a packed project,
- its `packages.lock.json`, the resolved dependency graph,
- `Directory.Packages.props`, the central package versions.

Any other Dependabot update (root npm tooling, GitHub Actions) gets an empty changeset. Adjust the `packages/*` paths to where the packed projects live. Keep the step's `id` and output name, because the **Generate changeset** step passes the result to the script as `WORKSPACE_PACKAGES_CHANGED`. The monthly `refresh-lockfiles.yml` applies the same rule to the lock files it refreshes.

### What stays the same

Everything documented in this guide works identically for NuGet repos:

- Contributors run `pnpm changeset` to add changeset files
- CI blocks PRs without changesets
- The Version Packages PR shows version bumps and changelog updates
- Prereleases, backporting, and fixed packages all work the same
- The differences are the version sync script, the `nuget-publish.yml` and `nuget-preview.yml` workflows, and the Dependabot detection paths above

---

## Publishing to GitHub Packages

Only test packages (`pkg-a`, `pkg-b`, `release-process-test`) still publish to GitHub Packages. GitHub Packages has no trusted publishing, so such a repo differs from the templates:

- **npm:** `.npmrc` routes the scope there (`@collana-solutions:registry=https://npm.pkg.github.com`), and `"access"` has no effect, because visibility comes from the repository and package settings. Without an OIDC credential to isolate, `release.yml` needs no job split. A single job modeled on the template's `backport` job is enough, with `packages: write` instead of `id-token: write`, no environment, `registry-url: https://npm.pkg.github.com` on `actions/setup-node`, `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` on the changesets step, and `--tag release-vN` on `release/**` branches only.
- **NuGet:** `nuget-publish.yml` gets `packages: write` instead of `id-token: write` and no environment, drops `NuGet/login`, and pushes with `GITHUB_TOKEN` to `https://nuget.pkg.github.com/collana-solutions/index.json`.
- **Consumers** need a token with `read:packages`, even for public packages.

---

## Workflow security conventions

Both templates follow these rules, and so should every workflow an adopting repo adds. The `zizmor` job in `ci.yml` enforces most of them.

- **Pin every action to a full commit SHA, with the exact version as a comment:** `uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`. Dependabot then updates the SHA and the comment together. Pick the newest release that is older than 30 days, the Dependabot cooldown for actions. Sub-actions such as `changesets/action/publish` use the same SHA as their parent action.
- **`permissions: {}` at the top of every workflow,** and each job lists only what it needs. A job that does everything with an App token needs no `GITHUB_TOKEN` permission at all.
- **No `${{ }}` inside scripts.** Values reach `run:` and `actions/github-script` through `env:` and are read as `"$NAME"` or `process.env.NAME`. An expression inside a script is substituted before the script runs, so a crafted branch name or PR title would become code.
- **`persist-credentials: false` on every checkout.** A job that pushes passes its token explicitly (`git push "https://x-access-token:${APP_TOKEN}@github.com/${REPOSITORY}.git" ...`) instead of keeping it in the git config. The exception is a checkout for `changesets/action` with `push-with-git-cli: true`, which pushes with the stored credentials. It carries `# zizmor: ignore[artipacked]` with the reason, and its job uploads no artifact.
- **A `zizmor` job in `ci.yml`,** named `zizmor` so the branch ruleset can require it, with `advanced-security: false` so a finding fails the check instead of only landing in code scanning. Every ignore carries its reason, inline as `# zizmor: ignore[<audit>] <reason>` or in `.github/zizmor.yml`.
- **No dependency cache in release jobs.** Every job that versions or publishes sets `package-manager-cache: false` on `actions/setup-node`, so it never restores a cache that a pull request run could have written (zizmor's `cache-poisoning` audit).
- **No install scripts where nothing is built.** Jobs that only run the changesets CLI install with `pnpm install --frozen-lockfile --ignore-scripts`. Jobs that build allow only the install scripts listed under `allowBuilds` in `pnpm-workspace.yaml`.
- **Check Dependabot by PR author:** `github.event.pull_request.user.login == 'dependabot[bot]'`, never `github.actor`. The actor is whoever triggered the run, for example by pushing to a Dependabot branch.
- **App tokens with explicit permissions.** Every `actions/create-github-app-token` step lists `permission-*` inputs, for example `permission-contents: write`, so the token gets only those instead of everything the App may do.
- **Publishing jobs run in the environment `production`,** whose deployment rules limit which refs reach the registry credential.
- **Waiting periods for new releases.** Dependabot waits 30 days for GitHub Actions and 14 days for npm and NuGet packages, pnpm refuses package versions younger than 14 days (`minimumReleaseAge: 20160` with `minimumReleaseAgeStrict: true`), and **Refresh lockfiles** re-resolves transitive dependencies once a month within those limits. Security updates skip the cooldown.

Run zizmor locally before pushing. The `zizmor` job uses zizmor-action v0.7.1, which runs zizmor 1.31.1. `GH_TOKEN` enables the online audits, such as the check for action versions with known vulnerabilities:

```bash
GH_TOKEN=$(gh auth token) zizmor .
```

---

## Per-repo setup checklist

The settings outside the repository files, in the order they are needed. Settings that would break the workflows a repo runs today (environment rules, SHA pinning) go on only after the PR with the templates is merged.

**Already in place at org level:** the `csag-changesets-bot` GitHub App, the `CHANGESETS_BOT_CLIENT_ID` and `CHANGESETS_BOT_PRIVATE_KEY` secrets for Actions and for Dependabot, the `FEEDZ_TOKEN` secret and the `NUGET_USER` variable. Check that the App is installed on the repository and that the repository has access to the secrets and the variable.

**Before the template PR, so its previews work:**

- [ ] npm: install the [pkg.pr.new App](https://github.com/apps/pkg-pr-new) on the repository.
- [ ] NuGet: create the feedz.io feed, named after the repository in lowercase with dots as dashes, readable without credentials, with a retention rule of 30 days. Set its URL as `FEED_URL` in `nuget-preview.yml`. See [Testing before release](#testing-before-release).

**Right after the template PR is merged:**

- [ ] **Environment `production`** (Settings → Environments), with deployment rules:
  - NuGet: tags `@collana-solutions/*` and the branch `main`. Releases run on tags, and a manual **NuGet Publish** runs from `main`.
  - npm: the branches `main` and `release/**`.
- [ ] **Tag ruleset** for `@collana-solutions/*`: restrict creations, updates and deletions. Only the changesets App and repository admins may bypass it.
- [ ] **Branch ruleset** for `main` and `release/**`: require a pull request and the status checks **Changeset Check**, the CI build check (**Verify** for npm, **Build, Test & Pack** for NuGet) and **zizmor**.
- [ ] **"Require actions to be pinned to a full-length commit SHA"** (Settings → Actions → General). It also checks the actions that other actions use.
- [ ] **Immutable releases** (Settings → General → Releases). A published release's tag can then no longer be moved or deleted. Deleting the release frees the tag, but its name can never be used again.

**Before the first release:**

- [ ] NuGet: the [nuget.org trusted publishing policy](#trusted-publishing-on-nugetorg), and `collana-solutions` as owner of every existing package ID.
- [ ] npm: the [`npm trust` loop](#connecting-the-trusted-publisher) for every package, right before merging the Version Packages PR, because a new configuration has to publish within 2 days.

**After the first trusted publish:**

- [ ] npm: every package set to "Require two-factor authentication and disallow tokens".
- [ ] npm and NuGet: the token and API key secrets the old workflows used are org secrets that other repos share. Delete them, and revoke the keys on npmjs.com and nuget.org, only once no repository uses them any more.

---

## Upgrading from Changesets v2

Existing repos on Changesets v2 need a handful of coordinated changes. Do them in **one PR** — the CLI and the GitHub Action have to move together, because `changesets/action@v1` only works with Changesets v2 and `changesets/action@v2` only works with Changesets v3.

### Step 1: Check Node and package manager versions

Changesets v3 requires:

- **Node.js** `^22.11 || ^24 || >=26`
- **npm** `>=10.9.0`, **pnpm** `>=10.0.0`, or **Yarn** `>=4.5.2` (Yarn Classic is no longer supported, so a Yarn Classic repo [moves to pnpm](#step-1-move-to-pnpm) first)

Bump `node-version` in every workflow that runs the CLI (`ci.yml`, `release.yml`, `dependabot-changeset.yml`) and in any `.nvmrc` or `engines` field. Bolt workspaces are no longer detected at all — migrate to npm, pnpm, or Yarn workspaces first.

> **Check that your lockfile is committed.** Workspace detection got stricter: an npm workspace is now recognized only when the repo root has both a `workspaces` field and a `package-lock.json`, and Yarn likewise needs `yarn.lock`. v2 was happy with the `workspaces` field alone. If the lockfile is missing or gitignored, the repo silently degrades to a single root package — `changeset` reports "No versionable packages found", and git tags come out as `v1.2.3` instead of `@scope/pkg@1.2.3`.

### Step 2: Update the packages

```bash
pnpm add -D -w @changesets/cli@^3 @changesets/changelog-github@^1
```

All `@changesets/*` packages now ship as **ES modules** — there is no CommonJS entry point left. If you only invoke `changeset` from npm scripts or CI, that changes nothing. A CommonJS custom changelog generator still loads, because Changesets imports it dynamically, but no file anywhere can `require()` a `@changesets/*` package any more; convert those to ESM.

If you need more time, the v2 line stays available under the `maintenance-v2` dist-tag (`npm install -D @changesets/cli@maintenance-v2`).

### Step 3: Update `.changeset/config.json`

| v2                                                                                                  | v3                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"$schema": ".../@changesets/config@3.x/schema.json"`                                               | `"$schema": "https://unpkg.com/@changesets/config@4.0.0/schema.json"`                                                                                                                     |
| `"prettier": false`                                                                                 | `"format": false` — the new option also covers Oxfmt, Deno, and dprint, and defaults to `"auto"` detection                                                                                |
| `"access": "private"`                                                                               | `"access": "restricted"`                                                                                                                                                                  |
| `"___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": { "useCalculatedVersionForSnapshots": true }` | `"snapshot": { "useCalculatedVersion": true }`                                                                                                                                            |
| `"baseBranch": "main"`                                                                              | Optional — `main` is now the default. Keep an explicit `"master"` if that is your default branch                                                                                          |
| private packages versioned implicitly                                                               | `"privatePackages": { "version": true, "tag": false }` to keep that behavior — but use `"tag": true` if you rely on the git tags, as the [NuGet setup](#adapting-for-nuget-packages) does |

> **The private-package default is the one that bites.** v2 versioned private packages (without tagging them); v3 does neither unless you ask. A repo that uses changesets purely to version things it never publishes to npm — the [NuGet setup](#adapting-for-nuget-packages) is exactly this — will otherwise go quiet: no version bumps, no tags, no GitHub Releases, and no downstream publish. If you worked around the v2 default by listing fixtures in `ignore`, you can drop those entries now.

> **Nothing warns you about a stale config.** Unknown keys are neither rejected by the JSON schema nor flagged at runtime, and v1-format configs are now ignored silently. A leftover `"prettier": false` is therefore dropped on the floor while `format` falls back to `"auto"` — silently re-enabling the formatting you had turned off. Delete the old keys instead of leaving them next to the new ones.

### Step 4: Update the GitHub Actions workflows

`changesets/action@v2` renamed every input and output to kebab-case, and it no longer reads the `GITHUB_TOKEN` environment variable:

| v1                          | v2                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `with: publish:`            | `with: publish-script:`                                                                                                  |
| `with: version:`            | `with: version-script:`                                                                                                  |
| `with: commit:`             | `with: commit-message:`                                                                                                  |
| `with: title:`              | `with: pr-title:`                                                                                                        |
| `with: branch:`             | `with: pr-base-branch:`                                                                                                  |
| `with: commitMode:`         | `with: push-with-git-cli:` — a boolean, not an enum                                                                      |
| `with: setupGitUser:`       | Gone. Git identity is handled automatically: an identity you already configured is kept, otherwise `github-actions[bot]` |
| `env: GITHUB_TOKEN:`        | `with: github-token:`                                                                                                    |
| `outputs.publishedPackages` | `outputs.published-packages`                                                                                             |
| `outputs.hasChangesets`     | `outputs.has-changesets`                                                                                                 |
| `outputs.pullRequestNumber` | `outputs.pr-number`                                                                                                      |

You don't have to find them all by reading: v2 **fails the step with a migration error** naming any old input it was handed, and it refuses to run at all against a Changesets v2 CLI. That is why the CLI and the action have to move in the same PR.

Four behavior changes are worth knowing about:

- Release commits and tags are pushed through the **GitHub API** by default, so they are signed with GitHub's GPG key and attributed to whoever owns `github-token`. Set `push-with-git-cli: true` to push with the Git CLI instead.
- Git tags are now controlled separately by `push-git-tags` (default `true`). Setting `create-github-releases: false` no longer suppresses tags as a side effect — turn `push-git-tags` off explicitly if that is what you relied on.
- The action no longer writes an `.npmrc` when `NPM_TOKEN` is set. Registry auth has to come from elsewhere: the npm template uses trusted publishing with a committed `.npmrc` (see [Publishing to public npm](#publishing-to-public-npm)), and a token-based setup uses `actions/setup-node`'s `registry-url` plus `NODE_AUTH_TOKEN`.
- Published packages are no longer detected by scraping `changeset publish` stdout. The CLI writes them to the file named by the `CHANGESETS_OUTPUT` environment variable. A plain `publish-script: pnpm changeset publish` handles that itself, but a **wrapper script** has to pass `CHANGESETS_OUTPUT` through to the CLI it calls, otherwise the action merely warns, and skips the git tags and GitHub Releases.

The v2 action also exposes sub-actions (`select-mode`, `version`, `pack`, `publish`, `pr-status`, `pr-comment`) so a release workflow can be split across jobs and grant `id-token: write` only where it publishes. The npm template uses them (see [Release job layout](#release-job-layout)). The single combined `changesets/action@v2` step, which the NuGet template and the npm `backport` job use, remains supported. Two notes if you go the sub-action route: pin the sub-actions to the same commit SHA as `changesets/action`, from `v2.1.0` or later (the `cwd` input was dropped in `v2.0.0` and restored in `v2.1.0`), and remember that `changesets/action/version` calls `changeset version` unconditionally, so it runs into the new exit-code-1 behavior on an empty release unless `select-mode` gates it.

### Step 5: Update CLI commands and flags

`changeset tag` is now `changeset git-tag` — the name makes it clear it creates **git** tags, not npm dist-tags. The old name still resolves, with a deprecation warning, so nothing breaks the moment you upgrade. Rename it anyway.

Stale **flags** do break immediately. v3 parses arguments with a library that rejects anything it doesn't recognize, so `--sinceMaster`, `--updateChangelog`, `--isPublic`, `--skipCI`, and `--commit` now fail the command outright instead of printing a deprecation warning. Grep your workflows and package scripts for them; `changeset status --sinceMaster` becomes `changeset status --since=main`.

`--since` still accepts any git ref rather than only a local branch name, so the `--since=origin/<base>` used by the templates' `ci.yml` keeps working.

### Step 6: Migrate prerelease state

Only relevant if the branch you're upgrading is currently in prerelease mode. Run:

```bash
pnpm changeset status
```

Changesets moves the already-versioned changesets from `.changeset/` into `.changeset/pre/`, and drops their IDs and the removed `initialVersions` key from `.changeset/pre.json`. Commit the result. See [Prereleases](#prereleases--release-candidates) for how the directory is used from here on.

> `.changeset/pre/` has to be **committed** — those files are the changelog entries for the eventual stable release. Check that no `.gitignore` rule (a bare `pre/` pattern, say) swallows it, or the stable changelog comes out empty.

> Do this migration deliberately, in a PR. Any command that reads the prerelease state — `status`, `version`, `publish`, `add` — performs the migration as a side effect, so the first CI run on an unmigrated branch will move files in its own checkout and then throw the result away.

### Step 7: Review the remaining behavior changes

- **`changeset version` now exits with code 1** when there are no unreleased changesets; v2 exited `0` silently. Any script that runs it unconditionally under `set -e` will now fail on an empty release. The Release workflow is unaffected — the action only versions when there are changesets to consume.
- **A peer dependency bump now gives dependents a `patch`**, not a `major`. If a peer bump really is breaking for a dependent, add an explicit `major` changeset for it.
- **pnpm repos only:** the "is this version already published" check now follows pnpm's registry resolution and ignores `publishConfig.registry` and scope-based registry overrides in `package.json`. Move those to `.npmrc`.
- **Non-npm registries:** a package that has only ever published prereleases now gets the configured prerelease tag rather than `latest`. npm assigns `latest` itself, so nothing changes there.

---

## Migration Guide

This guide walks through adopting changesets in an existing repository that previously used a different release workflow (manual versioning, semantic-release, release-it, Nerdbank.GitVersioning, etc.).

> Already using Changesets v2? Go to [Upgrading from Changesets v2](#upgrading-from-changesets-v2) instead, then replace the workflows with the current templates as in [Step 5](#step-5-copy-the-template-variant).

### Prerequisites

- Node.js 24 and Corepack, which installs the pnpm version the repo pins. The changesets CLI needs them even in .NET repos.
- Repository uses GitHub and GitHub Actions
- You have admin access to the repo (for rulesets, environments and the Actions settings)
- NuGet repos: a `global.json` that pins the .NET SDK, and NuGet lock files (`<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>`), because the workflows restore with `--locked-mode`

### Step 1: Move to pnpm

Both templates use pnpm 11, and Changesets v3 no longer supports Yarn Classic. Copy the variant's `packageManager` field and its `changeset`, `version-packages` and `release` scripts into the root `package.json`, copy its `pnpm-workspace.yaml` next to it, and run `corepack enable`. A NuGet repo without a root `package.json` copies the whole file.

**Converting from Yarn or npm.** `pnpm import` turns the existing lockfile into `pnpm-lock.yaml`, so the dependency versions stay as they are:

1. Create `pnpm-workspace.yaml` from the template, list the workspace directories under `packages`, and delete the `workspaces` field from `package.json`. pnpm reads the workspace only from `pnpm-workspace.yaml`.
2. Set `"packageManager": "pnpm@11.22.0"` in the root `package.json` and run `corepack enable`.
3. Run `pnpm import`. It reads `yarn.lock` or `package-lock.json` and writes `pnpm-lock.yaml`.
4. Delete `yarn.lock`, `package-lock.json`, `.yarnrc` and `.yarnrc.yml`, then run `pnpm install`.
5. Move `resolutions` (Yarn) or `overrides` (npm) from `package.json` to `overrides` in `pnpm-workspace.yaml`.
6. Replace `yarn`, `npm run` and `npx` in the package scripts, the workflows and the README with `pnpm`, `pnpm run` and `pnpm exec`.
7. Build and test. pnpm does not hoist undeclared dependencies, so a package that imports something it does not declare fails now. Declare the dependency. pnpm also runs no dependency install scripts except those listed under `allowBuilds` in `pnpm-workspace.yaml`, so list what the build needs there.

### Step 2: Install changesets

```bash
pnpm add -D -w @changesets/cli@^3 @changesets/changelog-github@^1
```

`-w` adds them to the workspace root. The npm template's root `package.json` also lists `pkg-pr-new` for the [preview workflow](#pkgprnew-npm).

### Step 3: Configure changesets

```bash
pnpm changeset init
```

This prompts for the changelog generator, commit behavior, publish access, and base branch, then writes `.changeset/config.json` and `.changeset/README.md`. Because it is interactive it cannot run unattended. Replace the generated `config.json` with the variant's [`templates/npm/.changeset/config.json`](../templates/npm/.changeset/config.json) or [`templates/nuget/.changeset/config.json`](../templates/nuget/.changeset/config.json). For npm it looks like this:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@4.0.0/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "collana-solutions/your-repo" }
  ],
  "commit": false,
  "fixed": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

Adjust as needed:
- **`fixed`**: Add package groups that should always share the same version (e.g., `[["@collana-solutions/pkg-a", "@collana-solutions/pkg-b"]]`). The Dependabot changeset script bumps this group, so put a single package into a one-element group.
- **`access`**: `"public"` for npm. NuGet repos keep the template's value, which has no effect on private packages.
- **`baseBranch`**: `main` is the default, so this line is optional — set it if your default branch is something else
- **`privatePackages`**: NuGet repos need `{ "version": true, "tag": true }`, see [Adapting for NuGet Packages](#adapting-for-nuget-packages)
- **`format`**: Defaults to `"auto"`, which picks up Prettier, Oxfmt, Deno, or dprint from your project. Set it to `false` to leave generated files unformatted

### Step 4: Set the initial version

Each package's `package.json` must have the **current published version**. If your package is currently at `3.2.1`, make sure `package.json` says `"version": "3.2.1"`. Changesets increments from whatever version is in `package.json`.

For .NET repos, also ensure the `package.json` version matches the `.csproj` `<Version>`.

### Step 5: Copy the template variant

Copy the contents of [`templates/npm/`](../templates/npm/) or [`templates/nuget/`](../templates/nuget/) into the repository root and customize every spot marked `CUSTOMIZE` or `YOUR-…`. [`templates/README.md`](../templates/README.md) lists them per file. Then:

- Replace any `.npmrc` that routes the scope to GitHub Packages with the template's `.npmrc` (npm).
- Merge the [package metadata block](#package-metadata) into `Directory.Build.props`, and add a "Preview packages" section to the README that the preview comment links to (NuGet).
- Run zizmor locally (see [Workflow security conventions](#workflow-security-conventions)) on the result, including any workflow of the repo that does not come from the templates.

### Step 6: Set up the GitHub App

The workflows authenticate as the `csag-changesets-bot` GitHub App, so that the PRs, commits and releases they create start other workflows. The App and its secrets exist at org level. A repo only needs the App installed and access to the `CHANGESETS_BOT_CLIENT_ID` and `CHANGESETS_BOT_PRIVATE_KEY` secrets, for Actions and for Dependabot.

For a new organization, the setup is:

1. Create a GitHub App at `https://github.com/organizations/<org>/settings/apps`
   - **Permissions:** Contents (Read & write), Pull requests (Read & write)
   - **Webhook:** Disabled
2. Generate a private key and note the Client ID
3. Install the App on the repositories that release
4. Add `CHANGESETS_BOT_CLIENT_ID` and `CHANGESETS_BOT_PRIVATE_KEY` as org secrets, both for Actions and for Dependabot

### Step 7: Configure the repository

Work through the [Per-repo setup checklist](#per-repo-setup-checklist): previews, the `production` environment, the rulesets, SHA pinning, immutable releases and the trust connection to the registry.

> **Note:** A status check can be added to the branch ruleset only after it has run at least once, so add the rulesets after the first CI run on the template PR.

### Step 8: Remove old release tooling

Remove whatever you were using before:

| Previous tool                        | What to remove                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **semantic-release**                 | `.releaserc`, `@semantic-release/*` packages, release workflow steps                                                   |
| **release-it**                       | `.release-it.json`, `release-it` and its plugins, release workflow steps                                               |
| **Nerdbank.GitVersioning**           | `version.json`, `nbgv` tool references, `Nerdbank.GitVersioning` NuGet package                                         |
| **MinVer**                           | `MinVer` NuGet package from `.csproj`                                                                                  |
| **Manual versioning**                | Any scripts or CI steps that bump versions                                                                             |
| **Registry tokens**                  | `NPM_TOKEN` and NuGet API key secrets, once the first trusted publish worked                                           |
| **Yarn or npm**                      | `yarn.lock`, `package-lock.json`, `.yarnrc`, `.yarnrc.yml`, `workspaces` in `package.json`                             |
| **Conventional commits enforcement** | `commitlint`, `husky` commit hooks (optional — you can keep them for commit hygiene, but changesets doesn't need them) |

### Step 9: First changeset

Create a PR with any change and add a changeset:

```bash
pnpm changeset
# Select your package(s), choose the bump type, write a description
```

Push and verify:
- CI passes with the changeset check, the build check and zizmor
- The preview workflow publishes a preview of the PR
- After merging, the Release workflow creates a Version Packages PR
- Merging the Version Packages PR publishes the package through trusted publishing

Once this works end-to-end, the migration is complete. All the scenarios documented in this guide (prereleases, backporting, etc.) are now available.

---

## Reference

### Configuration File

The changesets config lives at `.changeset/config.json`:

| Option                       | Value                                                        | Meaning                                                                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changelog`                  | `@changesets/changelog-github`                               | Changelogs include PR links and contributor attribution. The `repo` option defaults to `$GITHUB_REPOSITORY`, so it only strictly matters when running `changeset version` outside Actions, but keep it set so local runs behave the same |
| `commit`                     | `false`                                                      | Changeset commands don't auto-commit                                                                                                                                                                                                  |
| `fixed`                      | `[["@collana-solutions/pkg-a", "@collana-solutions/pkg-b"]]` | Both packages always share the same version                                                                                                                                                                                           |
| `access`                     | `public` (npm template)                                      | npm CLI publish flag. On npmjs.org `restricted` = private and `public` = public. It has no effect on the private packages of a NuGet repo, and GitHub Packages ignores it. See [Publishing to public npm](#publishing-to-public-npm). |
| `baseBranch`                 | `main`                                                       | Comparisons are made against `main`. `main` is also the default, so the line can be omitted                                                                                                                                           |
| `updateInternalDependencies` | `patch`                                                      | Internal dependency ranges are updated on every release                                                                                                                                                                               |
| `format`                     | _(unset → `"auto"`)_                                         | Formatter for generated changesets and changelogs. `"auto"` detects Prettier, Oxfmt, Deno, or dprint, and `false` disables it                                                                                                         |
| `privatePackages`            | _(unset → `{ "version": false, "tag": false }`)_             | Whether `"private": true` packages are versioned and tagged. The NuGet template sets `{ "version": true, "tag": true }`, because it versions packages it never publishes to npm                                                       |

### CI Workflows

| Workflow                        | File                              | Variant | Trigger                                                     | Purpose                                                                  |
| ------------------------------- | --------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| **CI**                          | `ci.yml`                          | both    | Pull requests to `main` and `release/**` (npm also manual)  | Changeset Check, build and tests, zizmor                                 |
| **Release**                     | `release.yml`                     | both    | Push to `main` and `release/**`                             | Version Packages PR, then publish (npm) or tags and GitHub Releases (NuGet) |
| **NuGet Publish**               | `nuget-publish.yml`               | NuGet   | GitHub Release published, manual with a release tag         | Pushes every package to nuget.org                                        |
| **PKG PR New**                  | `pkg.pr.new.yml`                  | npm     | Pull requests, push to `main`, manual                       | Preview packages on pkg.pr.new                                           |
| **NuGet Preview**               | `nuget-preview.yml`               | NuGet   | Pull requests to `main` and `release/**`                    | Preview packages on the feedz.io feed                                    |
| **Dependabot Changeset**        | `dependabot-changeset.yml`        | both    | Pull requests from Dependabot                               | Auto-generates changeset for dependency updates                          |
| **Refresh lockfiles**           | `refresh-lockfiles.yml`           | both    | Monthly, manual                                             | Re-resolves transitive dependencies within the declared ranges           |
| **NuGet Dependency Submission** | `nuget-dependency-submission.yml` | NuGet   | Push to `main`, manual                                      | Submits the resolved NuGet graph to the dependency graph                 |

All files live in `.github/workflows/`. The Release workflow uses a **GitHub App token** (not `GITHUB_TOKEN`) so that PRs it creates trigger CI checks. It also:

- **Publishes backports with a dist-tag** (e.g., `release-v1`) so the `latest` npm tag stays on the highest stable version from `main`
- **Auto-creates `release/vX.x` branches** when a new major version is published from `main`

### Branch Protection

Protect `main` and `release/**` with a **branch ruleset** (Settings → Rules → Rulesets) that requires a pull request and the status checks **Changeset Check**, the CI build check (**Verify** for npm, **Build, Test & Pack** for NuGet) and **zizmor**. The [Per-repo setup checklist](#per-repo-setup-checklist) lists it together with the tag ruleset and the other settings.

### Useful Commands

```bash
# Add a changeset interactively
pnpm changeset

# Add a changeset without prompts
pnpm changeset --patch @collana-solutions/pkg-a -m "Fix the thing"

# Add an empty changeset (no release)
pnpm changeset --empty

# Check if changesets exist (used by CI; exits 1 when a changed package has none)
pnpm changeset status --since=origin/main

# Preview what versions would be bumped
pnpm changeset status --verbose

# Apply changesets (bump versions + update changelogs; exits 1 when there is nothing to release)
pnpm changeset version

# Publish packages and create git tags
pnpm changeset publish

# Create the git tags only, without publishing to a registry
pnpm changeset git-tag

# Write the publish plan to a file instead of publishing
pnpm changeset publish-plan --output publish-plan.json

# Enter prerelease mode (allowed tags: alpha, beta, rc)
pnpm changeset pre enter <alpha|beta|rc>

# Exit prerelease mode
pnpm changeset pre exit

# Connect an npm package to the release workflow (see "Connecting the trusted publisher")
npm trust github @collana-solutions/pkg-a --repo collana-solutions/<repo> --file release.yml --env production --allow-publish

# Audit the workflows like the zizmor job does
GH_TOKEN=$(gh auth token) zizmor .
```

### Further Reading

- [Changesets Documentation](https://changesets.dev)
- [CLI Reference](https://changesets.dev/guide/cli)
- [Config File Options](https://changesets.dev/guide/config)
- [Fixed Packages](https://changesets.dev/guide/fixed-packages)
- [Prereleases](https://changesets.dev/guide/prereleases)
- [Backporting Changes](https://changesets.dev/guide/backporting-changes)
- [Automating Changesets](https://changesets.dev/guide/automating)
- [Beyond npm](https://changesets.dev/guide/beyond-npm) — using changesets for artifacts npm doesn't publish
- [Migrating from v2 to v3](https://changesets.dev/guide/migration)
- [Changesets GitHub Action](https://github.com/changesets/action)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
- [nuget.org trusted publishing](https://learn.microsoft.com/nuget/nuget-org/trusted-publishing)
- [pnpm import](https://pnpm.io/cli/import) and [pnpm settings](https://pnpm.io/settings) (`minimumReleaseAge`, `allowBuilds`)
- [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new)
- [feedz.io documentation](https://feedz.io/docs)
- [zizmor audits](https://docs.zizmor.sh/audits/)
- [Dependabot cooldown](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)
- [GitHub Packages npm Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [GitHub Packages NuGet Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-nuget-registry)
