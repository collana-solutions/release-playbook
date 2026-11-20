# Adoption templates

Copy-paste-ready files for adding the [Changesets release setup](../docs/CHANGESETS.md) to a
collana-solutions repository, in two variants:

| Variant              | For                                    | Publishes to | Built from                                                                                                                                                                     |
| -------------------- | -------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`npm/`](npm/)       | npm packages in a pnpm workspace       | npmjs.com    | [csag-blueprint-react](https://github.com/collana-solutions/csag-blueprint-react)                                                                                              |
| [`nuget/`](nuget/)   | .NET packages, versioned by changesets | nuget.org    | [Csag.Blueprint](https://github.com/collana-solutions/Csag.Blueprint) (multi-package) and [Csag.WorkloadIdentity](https://github.com/collana-solutions/Csag.WorkloadIdentity) |

Both publish through trusted publishing, so no registry token is stored. Both use pnpm 11
(`"packageManager": "pnpm@11.22.0"`), **Changesets v3** (`@changesets/cli@^3`,
`@changesets/changelog-github@^1`) and **`changesets/action@v2`**, which need Node.js
`^22.11 || ^24 || >=26`.

Copy the contents of **one** variant folder into the repository root. The files land in their
normal locations (`.github/workflows/…`, `.changeset/…`, `scripts/…`). They live under `templates/`
so that this playbook repo does not run them. Do **not** copy this `README.md`.

## Files

```
npm/                                         nuget/
├── .changeset/config.json                   ├── .changeset/config.json
├── .github/                                 ├── .github/
│   ├── dependabot.yml                       │   ├── dependabot.yml
│   └── workflows/                           │   └── workflows/
│       ├── ci.yml                           │       ├── ci.yml
│       ├── dependabot-changeset.yml         │       ├── dependabot-changeset.yml
│       ├── pkg.pr.new.yml                   │       ├── nuget-dependency-submission.yml
│       ├── refresh-lockfiles.yml            │       ├── nuget-preview.yml
│       └── release.yml                      │       ├── nuget-publish.yml
├── .npmrc                                   │       ├── refresh-lockfiles.yml
├── package.json                             │       └── release.yml
├── pnpm-workspace.yaml                      ├── package.json
└── scripts/                                 ├── pnpm-workspace.yaml
    └── generate-dependabot-changeset.mjs    └── scripts/
                                                 ├── build-dependency-snapshot.mjs
                                                 ├── generate-dependabot-changeset.mjs
                                                 └── sync-versions.mjs
```

`package.json` holds what the release setup needs in the root manifest. Merge it into an existing
root `package.json` instead of replacing it.

## What you must customize

Every spot that needs a change is marked with a `CUSTOMIZE` comment or a `YOUR-…` placeholder.
`grep -rn "CUSTOMIZE\|YOUR" .` after copying finds them all. JSON files cannot carry comments, so
their placeholders are listed here.

### Both variants

| File                                         | Change                                                                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.changeset/config.json`                     | `collana-solutions/YOUR-REPO` → the repository. The `fixed` array → the repo's packages. A single package goes into a one-element group (`[["@collana-solutions/my-pkg"]]`), see below.            |
| `package.json`                               | `YOUR-REPO` → a name for the root manifest, for example the repository name in lowercase.                                                                                                         |
| `pnpm-workspace.yaml`                        | `packages` → the directories of the published packages (npm) or of the packed projects (NuGet).                                                                                                   |
| `.github/workflows/dependabot-changeset.yml` | The path in the detect step → the same directories.                                                                                                                                               |
| `.github/dependabot.yml`                     | npm: `directories` → the root and the package directories. NuGet: the `ignore` list for packages whose major version is held back on purpose.                                                    |
| `.github/workflows/ci.yml`                   | The **Check for changesets** step skips only Version Packages PRs opened by `csag-changesets-bot[bot]`. Keep the job names, because the branch ruleset requires them.                            |

### npm

| File                                  | Change                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`            | The steps of the **Verify** job after **Install Dependencies** are placeholders. Replace them with the repo's own checks.                                                        |
| `.github/workflows/release.yml`       | The **Build** steps of `pack` and `backport` run the root `build` script, which has to build every released package.                                                             |
| `.github/workflows/pkg.pr.new.yml`    | The `./packages/*` glob → the directories of the published packages.                                                                                                             |
| `pnpm-workspace.yaml`                 | `allowBuilds` → the dependencies whose install scripts the build needs, nothing else.                                                                                            |

### NuGet

| File                                      | Change                                                                                                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `.changeset/config.json`                  | Exactly one fixed group, which holds every packed project (or the single package). NuGet Publish packs and pushes only for the anchor package's release, so a package outside that group is never published. `@collana-solutions/YOUR-ANCHOR-PACKAGE` → the changeset name of the anchor package, one of the packages in that group. With one package, that package. |
| `.github/workflows/nuget-publish.yml`     | `@collana-solutions/YOUR-ANCHOR-PACKAGE` (the tag gate and the dispatch example) and `YOUR.ANCHOR.PACKAGE.ID` (`ANCHOR` in **Verify packages**, the NuGet ID of the anchor package).                                                                          |
| `.github/workflows/nuget-preview.yml`     | `YOUR-FEED` → the feedz.io feed (the repository name in lowercase, dots as dashes). `YOUR-ANCHOR-PROJECT` → the anchor project's directory. `YOUR.PACKAGE.PREFIX.*` and `YOUR.ANCHOR.PACKAGE.ID` in the PR comment. The comment links to a "Preview packages" section of the README, so add one. |
| `.github/workflows/refresh-lockfiles.yml` | The `packages/*/packages.lock.json` path in **Add changeset** → the lock files of the packed projects.                                                                                                                                                        |
| `.github/workflows/ci.yml`                | **Test** uses the `GitHubActions` logger, which needs the `GitHubActionsTestLogger` package in every test project. Drop `--logger GitHubActions` otherwise.                                                                                                   |
| `Directory.Build.props`                   | Merge the [package metadata block](../docs/CHANGESETS.md#package-metadata) (project URL, symbols, Source Link, icon, `ContinuousIntegrationBuild`).                                                                                                          |

The NuGet workflows expect a `global.json` that pins the .NET SDK, NuGet lock files
(`RestorePackagesWithLockFile`), a single solution or project file at the repository root, and a
private `package.json` next to every packed `.csproj`
(see [Repository structure](../docs/CHANGESETS.md#repository-structure)).

## Action pins

Every action is pinned to a full commit SHA with its version as a comment
(`actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`), as the
[workflow security conventions](../docs/CHANGESETS.md#workflow-security-conventions) require. The
pins are the ones of the reference repos at the time of copying. Dependabot updates them in the
adopting repo after its 30-day cooldown.

## Required secrets and settings

The workflows authenticate as the `csag-changesets-bot` GitHub App, so their pushes and PRs start
CI. Its secrets `CHANGESETS_BOT_CLIENT_ID` and `CHANGESETS_BOT_PRIVATE_KEY` exist at org level for
Actions and for Dependabot. The NuGet variant also uses the org secret `FEEDZ_TOKEN` and the org
variable `NUGET_USER`.

Everything else (the `production` environment, rulesets, the trust connection to the registry, the
preview feed or App) is in the [Per-repo setup checklist](../docs/CHANGESETS.md#per-repo-setup-checklist).

## Single-package repos & no fixed group

`scripts/generate-dependabot-changeset.mjs` bumps the configured `fixed` group. If you have a single
package, put it in a one-element `fixed` group (e.g. `[["@collana-solutions/my-pkg"]]`) so Dependabot
updates get a real bump. The script **fails loudly** if a workspace package changed while no `fixed`
group is configured, rather than silently emitting a no-op changeset.
