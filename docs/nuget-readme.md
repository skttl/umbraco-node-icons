# NodeIcons for Umbraco

Choose individual document icons in the native content tree and document picker trees. The document type's normal icon can appear as a small sign beside a custom icon.

## Compatibility and installation

Use NodeIcons 18.x with Umbraco 18, or NodeIcons 17.x with Umbraco 17. Both require .NET 10. Use the latest maintained patch release of your CMS major. The package supports the interval `[18.0.0,19.0.0)` on this branch; minimum-version verification uses 18.0.0. Umbraco 19 compatibility has not been evaluated.

```shell
dotnet add package Umbraco.Community.NodeIcons --version 18.0.0
```

Rebuild and restart the site. Umbraco discovers the composer and backoffice extensions automatically; no registration code or Node.js installation is required. The package adds appsettings schema support during build.

## Set up the icon property

1. In Settings, create a data type and select **Node Icon Picker**. Its editor alias is `NodeIcons.PropertyEditorUi.IconPicker`; it uses Umbraco's existing icon picker and `Umbraco.Plain.String` storage.
2. Add a property to the document types that need individual icons, using that data type and alias `umbracoNodeIcon`.
3. Keep the property invariant, including on multilingual document types. A culture-variant icon property is ignored.
4. Open a document, pick an icon and optional color, then save the document. Saving a draft is sufficient. Normal Umbraco refresh events update its icon.

For example, give a News document type the usual `icon-document` icon, then select `icon-star color-yellow` on one article. That article shows a star and a sign with the document type's document symbol. Other articles keep their document type icon until an icon is selected.

Any property editor can supply an ordinary Umbraco icon string through the configured property. The editor itself does not decide which property controls the icon.

## Configuration

Defaults work without configuration. To change them, add this to `appsettings.json`:

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

`PropertyAlias` selects the shared content property. `ShowOriginalIconAsSign` shows the original document type symbol when the chosen symbol differs; set it to `false` to hide that sign. A color change alone does not create a sign. Other signs, flags and variant states remain intact.

Missing properties, empty values and culture-variant properties fall back to the normal document type icon. The package does not create properties or modify stored document type icons.

Picker trees use the native tree and can show signs. Selected document references show the selected main icon only, because core reference components do not provide entity-sign context.

[Source and developer instructions](https://github.com/skttl/umbraco-node-icons) · [Report an issue](https://github.com/skttl/umbraco-node-icons/issues)
