import { beforeEach, expect, it, vi } from 'vitest';
import type { UmbEntryPointOnInit } from '@umbraco-cms/backoffice/extension-api';

const boundary = vi.hoisted(() => ({ initialize: vi.fn() }));
vi.mock('@umbraco-cms/backoffice/extension-api', () => ({
  UmbExtensionManifestInitializer: class {
    constructor(...args: unknown[]) { boundary.initialize(...args); }
  },
}));
import { onInit } from './entrypoint';

beforeEach(() => boundary.initialize.mockClear());

it('registers a document-only sign for the server custom-icon flag', () => {
  const registry = { register: vi.fn() };
  (onInit as UmbEntryPointOnInit)({} as never, registry as never);
  expect(registry.register).toHaveBeenCalledWith(expect.objectContaining({
    type: 'entitySign', kind: 'icon', forEntityTypes: ['document'],
    forEntityFlags: ['NodeIcons.CustomIcon'], element: expect.any(Function),
  }));
});

it('clones the available native picker with its settings and plain-string schema', () => {
  const registry = { register: vi.fn() };
  const host = {};
  (onInit as UmbEntryPointOnInit)(host as never, registry as never);
  expect(boundary.initialize.mock.calls[0]?.slice(0, 3)).toEqual([
    host, registry, 'Umb.PropertyEditorUi.IconPicker',
  ]);
  const notify = boundary.initialize.mock.calls[0]?.[3];
  expect(notify).toBeTypeOf('function');
  const native = {
    type: 'propertyEditorUi', alias: 'Umb.PropertyEditorUi.IconPicker', name: 'Native picker',
    element: () => Promise.resolve({}),
    meta: { label: 'Icon Picker', icon: 'icon-autofill', group: 'common',
      settings: { properties: [
        { alias: 'placeholder', propertyEditorUiAlias: 'Umb.PropertyEditorUi.IconPicker' },
        { alias: 'hideColors', propertyEditorUiAlias: 'Umb.PropertyEditorUi.Toggle' },
      ] } },
  };
  notify(false, { manifest: native });
  expect(registry.register).toHaveBeenCalledTimes(1);
  notify(true, { manifest: native });
  const picker = registry.register.mock.calls[1][0];
  expect(picker).toMatchObject({
    type: 'propertyEditorUi', alias: 'NodeIcons.PropertyEditorUi.IconPicker',
    meta: { label: 'Node Icon Picker', propertyEditorSchemaAlias: 'Umbraco.Plain.String' },
  });
  expect(picker.element).toBe(native.element);
  expect(picker.meta.settings).toBe(native.meta.settings);
  expect(native.meta).not.toHaveProperty('propertyEditorSchemaAlias');
});
