import { UmbConditionBase } from '@umbraco-cms/backoffice/extension-registry';
import { UMB_TREE_ITEM_CONTEXT } from '@umbraco-cms/backoffice/tree';
import type { UmbConditionConfigBase, UmbConditionControllerArguments, UmbExtensionElementAndApiInitializer } from '@umbraco-cms/backoffice/extension-api';
import type { NodeIconsOriginalIconSign } from './original-icon-sign';

export class NodeIconsTreeContextCondition extends UmbConditionBase<UmbConditionConfigBase> {
  #generation = 0;
  #destroyed = false;

  constructor(host: UmbExtensionElementAndApiInitializer, args: UmbConditionControllerArguments) {
    super(host, args);
    this.permitted = true;
    this.consumeContext(UMB_TREE_ITEM_CONTEXT, async (context) => {
      const generation = ++this.#generation;
      await host.asPromise();
      if (this.#destroyed || generation !== this.#generation) return;
      // Overflow sign elements stay detached, so bridge context from their connected initializer.
      (host.component as NodeIconsOriginalIconSign | undefined)?.setTreeContext(context);
    });
  }

  override destroy() {
    this.#destroyed = true;
    super.destroy();
  }
}

export { NodeIconsTreeContextCondition as api };
