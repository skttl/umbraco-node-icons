# Verification

The implementation was checked against Umbraco 18.0.0 on .NET 10. The solution, including the official-template SQLite demo, builds. Server tests pass 15/15; client tests pass 10/10; TypeScript checking and production Vite build pass.

The built NuGet package was installed into a separate official-template 18.0.0 site using only a package reference. Startup and `/umbraco` returned HTTP 200. A temporary diagnostic endpoint confirmed automatic composer registration of the MVC result filter. The manifest, main JavaScript and hashed dynamic sign chunk all returned HTTP 200 from `/App_Plugins/NodeIcons/`. The build copied the settings schema and referenced it from `appsettings-schema.json`.

The package verification script accepts the complete artifact and rejects a missing dynamic chunk or incorrect expected version. Schema validation accepts omitted settings and valid overrides, and rejects an empty alias, a string instead of a boolean and unknown NodeIcons settings.

Native browser component checks also passed all 15 cases against the separately installed NuGet consumer, with no browser console errors or warnings. These covered the production entrypoint and dynamic chunk including the registered property editor manifest, native icon-picker symbol/color rendering, native tree sign composition and preservation of other signs. These checks use recorded transport and native refresh events. Actual editor Save-button testing remains outstanding following an OAuth login failure in the test browser. Selected references display only the main icon, as documented.

Additional authenticated integration checks against the installed 18.0.0 package passed 36 assertions using the normal HTTPS development certificate and disposable content. These covered Management API saves followed by tree/item reads, icon/sign behavior, fallbacks, color-only changes, paging, preserved flags and unchanged stored document type icons. This verifies the real save API; clicking Save in the actual content editor remains unverified.

The CI command sequence also passed locally. The shared release validation self-check covers stable/prerelease tags, complete identifier rules, package/dependency major agreement, exclusive dependency intervals and positive/negative remote-branch ancestry. Checksum-verified actionlint 1.7.12 accepted both workflows. No GitHub workflow or NuGet OIDC exchange was run.

The locked client install reports six upstream npm vulnerabilities (one low, four high, one critical). Minimum-version builds report upstream NuGet advisories, including CMS, SQLite and cryptography dependencies. They remain visible. Use maintained CMS patch releases within the supported major for real deployments; no dependency overrides or audit suppression were added.

