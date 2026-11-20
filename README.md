# release-playbook

The canonical **[Changesets](https://changesets.dev) release guide** for
collana-solutions, plus copy-paste templates for adopting it in any repository that publishes
public **npm** packages (npmjs.com) or **NuGet** packages (nuget.org).

Targets **Changesets v3** (`@changesets/cli@^3`) with **`changesets/action@v2`** and pnpm 11, which
need Node.js `^22.11 || ^24 || >=26`. Both registries are reached through trusted publishing, so no
registry token is stored anywhere.

- 📖 **[docs/CHANGESETS.md](docs/CHANGESETS.md)**: the full guide. For contributors (adding
  changesets) and maintainers (releases, previews, prereleases, backports, Dependabot automation,
  npm and NuGet publishing, workflow security, per-repo setup). Read this.
- 📦 **[templates/](templates/)**: two ready-to-copy variants, [`npm/`](templates/npm/) and
  [`nuget/`](templates/nuget/), with the workflows, the Dependabot configuration, the changesets
  config and the scripts. Built from
  [csag-blueprint-react](https://github.com/collana-solutions/csag-blueprint-react),
  [Csag.Blueprint](https://github.com/collana-solutions/Csag.Blueprint) and
  [Csag.WorkloadIdentity](https://github.com/collana-solutions/Csag.WorkloadIdentity).

This repo is documentation only. It does not itself publish any package.

## Already on Changesets v2?

Follow [Upgrading from Changesets v2](docs/CHANGESETS.md#upgrading-from-changesets-v2). The CLI and
the GitHub Action have to move in the same PR, and Changesets v3 stops versioning private packages
unless you opt back in. Then bring the workflows up to the current templates.

## Adopt it in a new repo

1. Move the repo to pnpm 11 if it uses Yarn or npm
   ([Step 1](docs/CHANGESETS.md#step-1-move-to-pnpm) of the Migration Guide).
2. Copy one variant from [`templates/`](templates/) into your repo root and customize the marked
   spots (see [templates/README.md](templates/README.md)).
3. Set each package's `package.json` `version` to its current published version.
4. Work through the [Per-repo setup checklist](docs/CHANGESETS.md#per-repo-setup-checklist):
   previews, the `production` environment, rulesets, SHA pinning, immutable releases and the
   trust connection to npmjs.com or nuget.org.
5. Open a PR with a changeset and verify the flow end-to-end.

The full walkthrough is in the [Migration Guide](docs/CHANGESETS.md#migration-guide). Only test
packages still publish to GitHub Packages, see
[Publishing to GitHub Packages](docs/CHANGESETS.md#publishing-to-github-packages).
