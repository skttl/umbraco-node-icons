import { UmbExtensionManifestInitializer } from '@umbraco-cms/backoffice/extension-api';
import type { ManifestCondition, UmbEntryPointOnInit } from '@umbraco-cms/backoffice/extension-api';
import type { ManifestPropertyEditorUi } from '@umbraco-cms/backoffice/property-editor';

export const onInit: UmbEntryPointOnInit = (host, registry) => {
  const treeContextCondition: ManifestCondition = {
    type: 'condition',
    alias: 'NodeIcons.Condition.TreeContext',
    name: 'Node Icons Tree Context Bridge',
    api: () => import('./tree-context.condition'),
  };
  registry.register(treeContextCondition);
  const sign = {
    type: 'entitySign',
    kind: 'icon',
    alias: 'NodeIcons.EntitySign.OriginalIcon',
    name: 'Original Document Type Icon',
    forEntityTypes: ['document'],
    forEntityFlags: ['NodeIcons.CustomIcon'],
    conditions: [{ alias: 'NodeIcons.Condition.TreeContext' }],
    element: () => import('./original-icon-sign'),
    api: () => import('./original-icon-sign'),
    meta: { iconName: 'icon-document', label: '' },
  } satisfies UmbExtensionManifest;
  registry.register(sign);

  new UmbExtensionManifestInitializer<ManifestPropertyEditorUi>(
    host, registry, 'Umb.PropertyEditorUi.IconPicker', (permitted, controller) => {
      const native: ManifestPropertyEditorUi | undefined = controller.manifest;
      if (!permitted || !native) return;
      const picker: ManifestPropertyEditorUi = {
        ...native,
        alias: 'NodeIcons.PropertyEditorUi.IconPicker',
        name: 'Node Icon Picker Property Editor UI',
        meta: {
          ...native.meta,
          label: 'Node Icon Picker',
          propertyEditorSchemaAlias: 'Umbraco.Plain.String',
        },
      };
      registry.register(picker);
    },
  );
};
