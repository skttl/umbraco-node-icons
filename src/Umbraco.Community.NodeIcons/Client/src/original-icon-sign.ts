import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { html } from '@umbraco-cms/backoffice/external/lit';
import { UMB_TREE_ITEM_CONTEXT } from '@umbraco-cms/backoffice/tree';
import { UmbDocumentTypeItemRepository } from '@umbraco-cms/backoffice/document-type';
import type { UmbDocumentTreeItemModel } from '@umbraco-cms/backoffice/document';

export class NodeIconsOriginalIconSign extends UmbLitElement {
  #repository = new UmbDocumentTypeItemRepository(this);
  #icon?: string;
  #request = 0;

  constructor() {
    super();
    this.consumeContext(UMB_TREE_ITEM_CONTEXT, (context) => {
      this.observe(context?.treeItem, async (item) => {
        const type = (item as UmbDocumentTreeItemModel | undefined)?.documentType?.unique;
        const request = ++this.#request;
        this.#icon = undefined;
        this.requestUpdate();
        if (!type) return;
        try {
          const { data, error } = await this.#repository.requestItems([type]);
          if (request !== this.#request || error) return;
          this.#icon = data?.[0]?.icon;
          this.requestUpdate();
        } catch {
          // A missing original icon must not interrupt the native tree.
        }
      }, 'node-icons-tree-item');
    });
  }

  override render() {
    return this.#icon
      ? html`<umb-icon name=${this.#icon} role="img" aria-label="Original document type icon"></umb-icon>`
      : null;
  }
}

customElements.define('node-icons-original-icon-sign', NodeIconsOriginalIconSign);
export { NodeIconsOriginalIconSign as element };
