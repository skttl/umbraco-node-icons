# NodeIcons implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify the agreed NodeIcons package for Umbraco 18 and 17.

**Architecture:** Modify native document tree and item response instances through an MVC result filter. Reuse native icon-picker and entity-sign extensions. Package static assets and configuration schema through the Razor SDK and Umbraco's schema mechanism.

**Tech Stack:** .NET 10, Umbraco 18.0.0 and 17.0.0, TypeScript, Vite, SQLite, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-06-node-icons.md`.

## Global constraints

- Package ID and namespace: `Umbraco.Community.NodeIcons`.
- Configuration lives at `Umbraco:Community:NodeIcons`.
- `PropertyAlias` defaults to `umbracoNodeIcon`; `ShowOriginalIconAsSign` defaults to `true`.
- Missing properties, empty values and culture-variant icon properties use the document type's normal icon.
- A difference in color alone does not create a sign.
- Never change the persisted document type icon, replace the native tree or create customer properties automatically.
- `main` targets Umbraco 18; `v17/main` targets Umbraco 17. Both use .NET 10.
- No remote pushes, tags or publishing are included.

## Review focus

- Lazy item responses must serialize the same instances the filter changes.
- Mixed pages must preserve unrelated flags, icons and variant state.
- Culture-variant properties must never supply an icon accidentally.
- Async sign lookup must not show an old document type's icon after a context change.
- Installing the NuGet must register assets and merge schema without client tooling.

## Task 1: Server behavior and tests

**Files:** `src/Umbraco.Community.NodeIcons/{Umbraco.Community.NodeIcons.csproj,NodeIconsOptions.cs,NodeIconsComposer.cs,NodeIconsResultFilter.cs}`, `tests/Umbraco.Community.NodeIcons.Tests/*`.

**Interfaces:** Options expose the two agreed settings. The filter supplies a stable `NodeIcons.CustomIcon` entity flag only when the sign is enabled and the symbol differs. It accepts native paged tree, enumerable tree and document-item results.

- [ ] Write failing tests for lazy responses, custom alias, missing/blank/invariant/variant values, colors, disabled signs and preservation of other flags and document type data.
- [ ] Implement registration and response mutation. Call `IContentService.GetByIds(IEnumerable<Guid>)` once for distinct response IDs. Use `PropertyType.VariesByNothing()` and the saved invariant string value. No public property-only batch API was found; do not introduce raw SQL. Avoid persistent caches that become stale on save.
- [ ] Run server tests, build against 18.0.0 and review the task diff with an independent subagent.

## Task 2: Backoffice client and tests

**Files:** `src/Umbraco.Community.NodeIcons/Client/{package.json,package-lock.json,tsconfig.json,vite.config.ts,public/umbraco-package.json,src/entrypoint.ts,src/original-icon-sign.ts}` and relevant client tests.

**Interfaces:** Entry point registers the usable icon editor and the `NodeIcons.CustomIcon` sign. Assets use `/App_Plugins/NodeIcons/`; Umbraco modules remain external. Original icons come from native repositories.

- [ ] Test editor/schema association and sign behavior for original icon, changed document type, failed lookup and stale async result.
- [ ] Implement the smallest native extension using tree context, including picker trees. Selected document references display the selected main icon but have no native entity-sign bundle; preserve that behavior and document it.
- [ ] Run client tests, type checking and build. Exercise real native components and inspect assets. Review the task diff independently.

## Task 3: Repository, demo and NuGet installation

**Files:** solution, demo, schema, `buildTransitive/Umbraco.Community.NodeIcons.targets`, README files, license, icon, Marketplace files, `NuGet.Config`, `.gitignore`, `scripts/verify-package.*`.

**Interfaces:** Schema registration uses `UmbracoJsonSchemaFiles`; package verification accepts a built nupkg and expected version. Demo references the package project; installation test site references only the built package.

- [ ] Generate demo using the official Umbraco 18.0.0 template after checking template help. Record the exact command. Keep local credentials and databases ignored.
- [ ] Add schema with the agreed path, defaults and validation. Add documentation and artwork using the accepted palette.
- [ ] Build solution, run tests, pack and inspect actual nupkg. Assert required DLL, assets, README, icon, schema and target, and reject raw client sources, credentials and demo content.
- [ ] Generate a separate clean 18.0.0 site, install the nupkg, start it and verify asset URLs and generated schema reference. Review the task independently.

## Task 4: CI, release workflow and version 17

**Files:** `.github/workflows/{ci.yml,publish.yml}`, release validation script, branch-specific project/client/demo versions, compatibility documentation.

- [ ] Verify current official action versions and Marketplace schema. CI restores locked client dependencies, tests/builds client and solution, packs, then runs the shared package check.
- [ ] Test release validation with stable/prerelease tags, invalid identifiers, mismatched majors and wrong ancestry. Publishing uses OIDC, environment `release`, `NUGET_USER` and no permanent API key. Document required external configuration.
- [ ] Prepare local version 17 branch using matching dependencies and official template. Repeat build, tests, pack and clean NuGet installation against 17.0.0.
- [ ] Obtain independent final review and fix material findings. Record actual verification and outstanding browser limitations. Leave all remote branches and releases untouched.
