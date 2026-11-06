# NodeIcons

Give individual Umbraco documents their own icons, using the native icon picker and content tree. An optional sign keeps the document type's original symbol visible. No custom tree or client build is required in consuming sites.

Create a Node Icon Picker data type, add an invariant `umbracoNodeIcon` property to a document type, and choose an icon on a document. The same invariant property works on multilingual document types.

[Installation, configuration and usage](https://github.com/skttl/umbraco-node-icons/blob/main/docs/nuget-readme.md)

Use package 18.x for Umbraco 18 or package 17.x for Umbraco 17. Both require .NET 10. Selected document references show the chosen main icon; picker trees can also show the original icon sign.
