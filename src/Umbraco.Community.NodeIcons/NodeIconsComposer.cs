using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Umbraco.Community.NodeIcons;

public sealed class NodeIconsComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.Services.AddOptions<NodeIconsOptions>()
            .Bind(builder.Config.GetSection(NodeIconsOptions.SectionName));
        builder.Services.AddScoped<NodeIconsResultFilter>();
        builder.Services.Configure<MvcOptions>(options => options.Filters.Add<NodeIconsResultFilter>());
    }
}
