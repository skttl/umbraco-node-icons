# NodeIcons design

## Agreed behavior

Package ID and namespace: `Umbraco.Community.NodeIcons`.
Repository: https://github.com/skttl/umbraco-node-icons.
Working checkout: `C:\workspaces\umbraco\packages\umbraco-node-icons`.

The configured content property controls each document's displayed icon in the native content tree and document pickers. Its editor does not determine whether the property controls the icon. Reuse Umbraco's icon-picker UI and `Umbraco.Plain.String` storage schema rather than inventing a new storage format. Store ordinary Umbraco icon strings, including optional color.

Configuration lives at `Umbraco:Community:NodeIcons`:

```json
{
  "Umbraco": {
    "Community": {
      "NodeIcons": {
        "PropertyAlias": "umbracoNodeIcon",
        "ShowOriginalIconAsSign": true
      }
    }
  }
}
```

If the selected symbol differs from the document type's symbol, show the original document type icon as an entity sign. A difference in color alone does not create a sign. Disabling the option removes the sign. Preserve other signs, flags and variant states.

Missing properties, empty values and culture-variant icon properties use the document type's normal icon. Multilingual documents may use a shared, invariant icon property. Culture-specific icons are outside scope.

Saving a draft updates its icon using Umbraco's normal refresh events. Never change the persisted document type icon, replace the native tree or create customer properties automatically.

## Structure and compatibility

Follow the explicitly invoked `umbraco-package-repository` skill. `main` targets Umbraco 18 with version `18.0.0`; `v17/main` targets Umbraco 17 with version `17.0.0`. Both use .NET 10 and dependency intervals `[18.0.0,19.0.0)` and `[17.0.0,18.0.0)` respectively. Implement first on local `codex/node-icons`, then prepare local version branches after verification. No remote pushes, tags or publishing are included.

One Razor package project with a TypeScript/Vite client, one server test project and a clean SQLite demo generated with the official matching Umbraco template. Use the smallest Umbraco API dependency needed. No custom Management API is planned.

Ship an appsettings schema and native `UmbracoJsonSchemaFiles` registration target. Build client assets into the Razor project's `wwwroot`, served at `/App_Plugins/NodeIcons/`. Consumers need no Node.js.

Include user documentation, repository instructions, Marketplace metadata, CI, OIDC publishing workflow and package-content verification. Use MIT for the new package's own code. Package artwork uses a tree with a star node: background `#4A1832`, tree `#C6E6FF`, star `#C8EF63`.

## Evidence and limits

The previous disposable spikes passed authenticated API tests and isolated native-component browser tests on Umbraco 17.0.0 and 18.0.0. Production implementation must add the invariant-property guard, remove prototype names and verify the actual NuGet installation and schema registration.

The browser previously failed OAuth login. Actual editor Save-button testing remains outstanding. Picker trees use the native tree component and can display the sign. Selected document references have no native entity-sign bundle or item context; they display the selected main icon without a sign. Do not replace core reference components for this package. Umbraco 19 compatibility will be evaluated when available.
