# NodeIcons

Choose a different icon for each document in Umbraco's native content tree and document pickers.

[Installation, configuration and usage](docs/nuget-readme.md) · [Issues](https://github.com/skttl/umbraco-node-icons/issues)

## Development

`main` targets Umbraco 18 and package 18.x; `v17/main` targets Umbraco 17 and package 17.x. Both use .NET 10. Umbraco 19 support has not been evaluated. Use a maintained Umbraco patch release within your supported major in real sites. Minimum-version verification deliberately uses 18.0.0, whose upstream dependency advisories should be addressed by updating the host CMS.

Install .NET SDK 10 and Node.js 24.13 or newer with npm 11 or newer. NuGet consumers do not need Node.js.

- `src/Umbraco.Community.NodeIcons`: Razor package and Vite client.
- `tests/Umbraco.Community.NodeIcons.Tests`: server tests.
- `demo/Umbraco.Community.NodeIcons.TestSite`: official SQLite demo with a project reference.
- `buildTransitive/`: native Umbraco appsettings schema registration.
- `scripts/verify-package.ps1`: checks the actual NuGet artifact, shared by CI and publishing.

From the repository root:

```powershell
npm --prefix src/Umbraco.Community.NodeIcons/Client ci
npm --prefix src/Umbraco.Community.NodeIcons/Client test
npm --prefix src/Umbraco.Community.NodeIcons/Client run typecheck
npm --prefix src/Umbraco.Community.NodeIcons/Client run build
dotnet build Umbraco.Community.NodeIcons.slnx -c Release
dotnet test tests/Umbraco.Community.NodeIcons.Tests -c Release --no-build
dotnet pack src/Umbraco.Community.NodeIcons -c Release --no-build -o artifacts
pwsh -File scripts/verify-package.ps1 artifacts/Umbraco.Community.NodeIcons.18.0.0.nupkg 18.0.0
dotnet run --project demo/Umbraco.Community.NodeIcons.TestSite
```

Before the first run, configure unattended installation with local user secrets. Umbraco 18 needs to initialize the SQLite database before the backoffice can boot:

```powershell
dotnet user-secrets init --project demo/Umbraco.Community.NodeIcons.TestSite
dotnet user-secrets set "Umbraco:CMS:Unattended:InstallUnattended" "true" --project demo/Umbraco.Community.NodeIcons.TestSite
dotnet user-secrets set "Umbraco:CMS:Unattended:UnattendedUserName" "Local developer" --project demo/Umbraco.Community.NodeIcons.TestSite
dotnet user-secrets set "Umbraco:CMS:Unattended:UnattendedUserEmail" "your-email@example.com" --project demo/Umbraco.Community.NodeIcons.TestSite
dotnet user-secrets set "Umbraco:CMS:Unattended:UnattendedUserPassword" "<choose a strong local password>" --project demo/Umbraco.Community.NodeIcons.TestSite
dotnet run --project demo/Umbraco.Community.NodeIcons.TestSite
```

Open the demo URL printed by `dotnet run`, visit `/umbraco`, sign in with your local account, then follow the usage guide to add a data type and invariant property. The demo intentionally starts without customer document types. Do not commit passwords, databases or generated content. Use user secrets for local credentials.

## Demo provenance

The demo was generated with official `Umbraco.Templates` 18.0.0, after inspecting its help and a dry run. The template fixes the framework to net10.0 and does not expose a framework parameter. Its generated ICU, runtime and development settings are retained.

```powershell
dotnet new install Umbraco.Templates::18.0.0 --debug:custom-hive <isolated-hive>
dotnet new umbraco --debug:custom-hive <isolated-hive> --name Umbraco.Community.NodeIcons.TestSite --output demo/Umbraco.Community.NodeIcons.TestSite --development-database-type SQLite --package-management PerProject --no-restore --no-update-check
```

The 17.0.0 template uses per-project references by default; omit `--package-management PerProject` there.

## Release setup

Build and verify the package before creating a stable or prerelease version tag. Package majors follow Umbraco majors and dependencies exclude the next major. Releases use NuGet trusted publishing with GitHub OIDC. Configure a GitHub `release` environment and `NUGET_USER` secret containing the NuGet account name. Configure the NuGet trust policy for `skttl/umbraco-node-icons`, workflow `publish.yml`, environment `release`, and package ownership. No permanent NuGet API key is needed. Creating a tag and publishing require an explicit release decision.

MIT license. Artwork uses a tree with a star node in the package palette.
