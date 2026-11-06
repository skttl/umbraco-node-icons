using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Options;
using Moq;
using Umbraco.Cms.Api.Common.ViewModels.Pagination;
using Umbraco.Cms.Api.Management.ViewModels;
using Umbraco.Cms.Api.Management.ViewModels.Document.Item;
using Umbraco.Cms.Api.Management.ViewModels.DocumentType;
using Umbraco.Cms.Api.Management.ViewModels.Tree;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Xunit;

namespace Umbraco.Community.NodeIcons.Tests;

public class NodeIconsResultFilterTests
{
    [Theory]
    [InlineData("page")]
    [InlineData("tree")]
    [InlineData("items")]
    public void LazyResponsesSerializeMutatedInstancesAndBatchDistinctIds(string shape)
    {
        var id = Guid.NewGuid();
        var fixture = new Fixture();
        fixture.AddContent(id, "icon-star color-red");
        IEnumerable<DocumentTreeItemResponseModel> Trees() =>
            Enumerable.Range(0, 2).Select(_ => Tree(id));
        IEnumerable<DocumentItemResponseModel> Items() =>
            Enumerable.Range(0, 2).Select(_ => new DocumentItemResponseModel
            {
                Id = id, DocumentType = new() { Icon = "icon-document" }
            });
        object value = shape switch
        {
            "page" => new PagedViewModel<DocumentTreeItemResponseModel> { Total = 2, Items = Trees() },
            "tree" => Trees(),
            _ => Items()
        };

        var result = fixture.Apply(value);
        var rows = result.Value switch
        {
            PagedViewModel<DocumentTreeItemResponseModel> page => page.Items.Select(x => (x.DocumentType, Flags: (IHasFlags)x)),
            IEnumerable<DocumentTreeItemResponseModel> tree => tree.Select(x => (x.DocumentType, Flags: (IHasFlags)x)),
            IEnumerable<DocumentItemResponseModel> items => items.Select(x => (x.DocumentType, Flags: (IHasFlags)x)),
            _ => throw new InvalidOperationException()
        };
        Assert.All(rows, row =>
        {
            Assert.Equal("icon-star color-red", row.DocumentType.Icon);
            Assert.Contains(row.Flags.Flags, x => x.Alias == "NodeIcons.CustomIcon");
        });
        fixture.Service.Verify(x => x.GetByIds(It.Is<IEnumerable<Guid>>(ids => ids.SequenceEqual(new[] { id }))), Times.Once);
        if (result.Value is PagedViewModel<DocumentTreeItemResponseModel> paged)
            Assert.Equal(2, paged.Total);
    }

    [Fact]
    public void CustomAliasUsesSavedInvariantValueAndPreservesTypeDataAndFlags()
    {
        var fixture = new Fixture(new() { PropertyAlias = "customIcon" });
        var id = Guid.NewGuid();
        var content = fixture.AddContent(id, "icon-star color-red", alias: "customIcon", publishedValue: "icon-heart");
        var row = Tree(id);
        row.DocumentType.Id = Guid.NewGuid();
        row.DocumentType.Collection = new() { Id = Guid.NewGuid() };
        var typeId = row.DocumentType.Id;
        var collection = row.DocumentType.Collection;
        row.AddFlag("Umb.IsProtected");

        fixture.Apply(new[] { row });

        Assert.Equal("icon-star color-red", row.DocumentType.Icon);
        Assert.Equal(typeId, row.DocumentType.Id);
        Assert.Same(collection, row.DocumentType.Collection);
        Assert.Equal(new[] { "Umb.IsProtected", "NodeIcons.CustomIcon" }, row.Flags.Select(x => x.Alias));
        Assert.Equal("icon-document", content.ContentType.Icon);
        Assert.Equal("icon-star color-red", content.Properties["customIcon"]!.GetValue());
        Assert.Equal("icon-heart", content.Properties["customIcon"]!.GetValue(published: true));
    }

    [Theory]
    [InlineData(null, ContentVariation.Nothing)]
    [InlineData("", ContentVariation.Nothing)]
    [InlineData("   ", ContentVariation.Nothing)]
    [InlineData("icon-star", ContentVariation.Culture)]
    [InlineData("icon-star", ContentVariation.Segment)]
    public void MissingBlankOrVariantPropertiesKeepNormalIcon(string? icon, ContentVariation variation)
    {
        var fixture = new Fixture();
        var id = Guid.NewGuid();
        fixture.AddContent(id, icon, variation);
        var row = Tree(id);
        fixture.Apply(new[] { row });
        Assert.Equal("icon-document", row.DocumentType.Icon);
        Assert.Empty(row.Flags);
    }

    [Theory]
    [InlineData("icon-document color-red", true)]
    [InlineData("icon-document", true)]
    [InlineData("icon-star color-red", false)]
    public void ColorOnlyChangesAndDisabledSignsDoNotAddFlag(string icon, bool showSign)
    {
        var fixture = new Fixture(new() { ShowOriginalIconAsSign = showSign });
        var id = Guid.NewGuid();
        fixture.AddContent(id, icon);
        var row = Tree(id);
        row.AddFlag("Umb.IsProtected");
        fixture.Apply(new[] { row });
        Assert.Equal(icon, row.DocumentType.Icon);
        Assert.Equal("Umb.IsProtected", Assert.Single(row.Flags).Alias);
    }

    [Fact]
    public void MissingDocumentsLeaveResponseUnchanged()
    {
        var fixture = new Fixture();
        var row = Tree(Guid.NewGuid());
        fixture.Apply(new[] { row });
        Assert.Equal("icon-document", row.DocumentType.Icon);
        Assert.Empty(row.Flags);
    }

    [Fact]
    public void EmptyOrUnrelatedResponsesDoNotReadContent()
    {
        var fixture = new Fixture();
        fixture.Apply(Array.Empty<DocumentTreeItemResponseModel>());
        fixture.Apply(new { Icon = "unrelated" });
        var filter = new NodeIconsResultFilter(fixture.Service.Object, Options.Create(new NodeIconsOptions()));
        filter.OnResultExecuting(Context(new EmptyResult()));
        fixture.Service.Verify(x => x.GetByIds(It.IsAny<IEnumerable<Guid>>()), Times.Never);
    }

    [Fact]
    public void SeparateRequestsReadLatestSavedValueWithoutCache()
    {
        var fixture = new Fixture();
        var id = Guid.NewGuid();
        var content = fixture.AddContent(id, "icon-star");
        var first = Tree(id);
        fixture.Apply(new[] { first });
        content.Properties["umbracoNodeIcon"]!.SetValue("icon-heart");
        var next = Tree(id);
        fixture.Apply(new[] { next });
        Assert.Equal("icon-star", first.DocumentType.Icon);
        Assert.Equal("icon-heart", next.DocumentType.Icon);
        fixture.Service.Verify(x => x.GetByIds(It.IsAny<IEnumerable<Guid>>()), Times.Exactly(2));
    }

    private static DocumentTreeItemResponseModel Tree(Guid id) =>
        new() { Id = id, DocumentType = new() { Icon = "icon-document" } };

    private static ResultExecutingContext Context(IActionResult result) =>
        new(new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor()), [], result, new object());

    private sealed class Fixture(NodeIconsOptions? options = null)
    {
        public Mock<IContentService> Service { get; } = new(MockBehavior.Strict);
        private readonly List<IContent> _contents = [];
        private bool _initialized;

        public IContent AddContent(Guid id, string? icon, ContentVariation variation = ContentVariation.Nothing,
            string alias = "umbracoNodeIcon", string? publishedValue = null)
        {
            var content = new Mock<IContent>();
            var type = new Mock<ISimpleContentType>();
            type.SetupGet(x => x.Icon).Returns("icon-document");
            content.SetupGet(x => x.Key).Returns(id);
            content.SetupGet(x => x.ContentType).Returns(type.Object);
            var properties = new PropertyCollection();
            if (icon is not null)
            {
                var propertyType = new Mock<IPropertyType>();
                propertyType.SetupGet(x => x.Alias).Returns(alias);
                propertyType.SetupGet(x => x.SupportsPublishing).Returns(true);
                propertyType.SetupGet(x => x.Variations).Returns(variation);
                propertyType.Setup(x => x.SupportsVariation(null, null, false)).Returns(true);
                propertyType.SetupGet(x => x.ValueStorageType).Returns(ValueStorageType.Nvarchar);
                var property = new Property(propertyType.Object);
                // A variant fixture deliberately includes an invariant value to prove the schema guard wins.
                property.Values = new List<IPropertyValue>
                {
                    new Property.PropertyValue { EditedValue = icon, PublishedValue = publishedValue }
                };
                properties.Add(property);
            }
            content.SetupGet(x => x.Properties).Returns(properties);
            _contents.Add(content.Object);
            return content.Object;
        }

        public ObjectResult Apply(object value)
        {
            if (!_initialized)
            {
                Service.Setup(x => x.GetByIds(It.IsAny<IEnumerable<Guid>>()))
                    .Returns((IEnumerable<Guid> ids) => _contents.Where(x => ids.Contains(x.Key)).ToArray());
                _initialized = true;
            }
            var result = new ObjectResult(value);
            new NodeIconsResultFilter(Service.Object, Options.Create(options ?? new())).OnResultExecuting(Context(result));
            return result;
        }
    }
}
