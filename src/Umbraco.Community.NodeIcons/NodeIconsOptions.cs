namespace Umbraco.Community.NodeIcons;

public sealed class NodeIconsOptions
{
    public const string SectionName = "Umbraco:Community:NodeIcons";
    public string PropertyAlias { get; set; } = "umbracoNodeIcon";
    public bool ShowOriginalIconAsSign { get; set; } = true;
}
