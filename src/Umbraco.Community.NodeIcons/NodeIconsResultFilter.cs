using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Api.Common.ViewModels.Pagination;
using Umbraco.Cms.Api.Management.ViewModels;
using Umbraco.Cms.Api.Management.ViewModels.Document.Item;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Api.Management.ViewModels.Tree;
using Umbraco.Extensions;

namespace Umbraco.Community.NodeIcons;

public sealed class NodeIconsResultFilter(IContentService contentService, IOptions<NodeIconsOptions> options) : IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is not ObjectResult result)
            return;

        // Native responses may be lazy: serialize the same instances that we modify.
        if (result.Value is IEnumerable<DocumentItemResponseModel> documents)
            result.Value = documents.ToArray();
        if (result.Value is IEnumerable<DocumentTreeItemResponseModel> tree)
            result.Value = tree.ToArray();
        if (result.Value is PagedViewModel<DocumentTreeItemResponseModel> page)
            page.Items = page.Items.ToArray();

        if (result.Value is SubsetViewModel<DocumentTreeItemResponseModel> subset)
            subset.Items = subset.Items.ToArray();

        var rows = (result.Value switch
        {
            PagedViewModel<DocumentTreeItemResponseModel> paged => paged.Items.Select(x => (x.Id, x.DocumentType, Flags: (IHasFlags)x)),
            SubsetViewModel<DocumentTreeItemResponseModel> subsetPage => subsetPage.Items.Select(x => (x.Id, x.DocumentType, Flags: (IHasFlags)x)),
            IEnumerable<DocumentTreeItemResponseModel> items => items.Select(x => (x.Id, x.DocumentType, Flags: (IHasFlags)x)),
            IEnumerable<DocumentItemResponseModel> items => items.Select(x => (x.Id, x.DocumentType, Flags: (IHasFlags)x)),
            _ => []
        }).ToArray();
        if (rows.Length == 0)
            return;

        var settings = options.Value;
        // shortcut: load full documents for this response, use a targeted public batch API if Umbraco adds one.
        var contentById = contentService.GetByIds(rows.Select(x => x.Id).Distinct()).ToDictionary(x => x.Key);
        foreach (var (id, documentType, flags) in rows)
        {
            if (!contentById.TryGetValue(id, out var content))
                continue;
            content.Properties.TryGetValue(settings.PropertyAlias, out var property);
            if (property is null || !property.PropertyType.VariesByNothing()
                || property.GetValue(published: false) is not string icon || string.IsNullOrWhiteSpace(icon))
                continue;

            if (settings.ShowOriginalIconAsSign && Symbol(icon) != Symbol(documentType.Icon))
                flags.AddFlag("NodeIcons.CustomIcon");
            documentType.Icon = icon;
        }
    }

    private static string Symbol(string icon) =>
        icon.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? string.Empty;

    public void OnResultExecuted(ResultExecutedContext context) { }
}
