import { UmbLitElement } from '@umbraco-cms/backoffice/lit-element';
import { html } from '@umbraco-cms/backoffice/external/lit';
import { UMB_TREE_ITEM_CONTEXT } from '@umbraco-cms/backoffice/tree';
import type { UmbTreeItemContext } from '@umbraco-cms/backoffice/tree';
import { UmbDocumentTypeItemRepository } from '@umbraco-cms/backoffice/document-type';
import { UmbStringState } from '@umbraco-cms/backoffice/observable-api';
import type { UmbEntitySignApi } from '@umbraco-cms/backoffice/entity-sign';
import type { UmbDocumentTreeItemModel } from '@umbraco-cms/backoffice/document';

export class NodeIconsOriginalIconSign extends UmbLitElement {
  #repository = new UmbDocumentTypeItemRepository(this);
  #icon?: string;
  #request = 0;
  #name = new UmbStringState('');
  #context?: UmbTreeItemContext;
  readonly label = this.#name.asObservable();

  constructor() {
    super();
    this.consumeContext(UMB_TREE_ITEM_CONTEXT, (context) => this.setTreeContext(context));
  }

  setTreeContext(context: UmbTreeItemContext | undefined, repository = this.#repository) {
    if (this.#context === context) return;
    this.#context = context;
    this.observe(context?.treeItem, async (item) => {
      const type = (item as UmbDocumentTreeItemModel | undefined)?.documentType?.unique;
      const request = ++this.#request;
      this.#icon = undefined;
      this.#name.setValue('');
      this.requestUpdate();
      if (!type) return;
      try {
        const { data, error } = await repository.requestItems([type]);
        if (request !== this.#request || error) return;
        this.#icon = data?.[0]?.icon;
        this.#name.setValue(data?.[0]?.name ?? '');
        this.requestUpdate();
      } catch {
        // A missing original icon must not interrupt the native tree.
      }
    }, 'node-icons-tree-item');
  }

  override destroy() {
    this.#request++;
    super.destroy();
  }

  override render() {
    return this.#icon
      ? html`<umb-icon name=${this.#icon} role="img" aria-label=${this.#name.getValue()}></umb-icon>`
      : null;
  }
}

customElements.define('node-icons-original-icon-sign', NodeIconsOriginalIconSign);
export { NodeIconsOriginalIconSign as element };

export class NodeIconsOriginalIconSignApi implements UmbEntitySignApi {
  readonly label;

  constructor(host: NodeIconsOriginalIconSign) {
    this.label = host.label;
  }

  destroy() {}
}

export { NodeIconsOriginalIconSignApi as api };
