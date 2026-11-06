import { beforeEach, expect, it, vi } from 'vitest';
import type { UmbExtensionElementAndApiInitializer } from '@umbraco-cms/backoffice/extension-api';

const boundary = vi.hoisted(() => ({
  consume: undefined as undefined | ((context: unknown) => Promise<void>),
  repositoryHosts: [] as unknown[],
}));
vi.mock('@umbraco-cms/backoffice/extension-registry', () => ({
  UmbConditionBase: class {
    permitted = false;
    consumeContext(_token: unknown, callback: typeof boundary.consume) { boundary.consume = callback; }
    destroy() {}
  },
}));
vi.mock('@umbraco-cms/backoffice/document-type', () => ({
  UmbDocumentTypeItemRepository: class {
    constructor(readonly host: unknown) { boundary.repositoryHosts.push(host); }
  },
}));
vi.mock('@umbraco-cms/backoffice/tree', () => ({ UMB_TREE_ITEM_CONTEXT: Symbol() }));
import { NodeIconsTreeContextCondition } from './tree-context.condition';

beforeEach(() => { boundary.consume = undefined; boundary.repositoryHosts = []; });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function mount(ready = Promise.resolve()) {
  const component = { isConnected: false, setTreeContext: vi.fn() };
  const host = { component, asPromise: vi.fn(() => ready) };
  const condition = new NodeIconsTreeContextCondition(host as unknown as UmbExtensionElementAndApiInitializer, {} as never);
  return { host, component, condition };
}

it('permits element creation before waiting for the initializer component', async () => {
  const ready = deferred();
  const { host, component, condition } = mount(ready.promise);
  expect(condition.permitted).toBe(true);
  const context = { treeItem: {} };
  const consuming = boundary.consume?.(context);
  expect(host.asPromise).toHaveBeenCalledOnce();
  expect(component.setTreeContext).not.toHaveBeenCalled();
  ready.resolve();
  await consuming;
  expect(component.setTreeContext).toHaveBeenCalledExactlyOnceWith(context, expect.any(Object));
});

it('bridges row context into an original sign that remains detached in overflow', async () => {
  const { component } = mount();
  const context = { treeItem: {} };
  await boundary.consume?.(context);
  expect(component.isConnected).toBe(false);
  expect(component.setTreeContext).toHaveBeenCalledExactlyOnceWith(context, expect.any(Object));
});

it('drops an obsolete context while initializer readiness is pending', async () => {
  const ready = deferred();
  const { component } = mount(ready.promise);
  const current = { treeItem: {} };
  const first = boundary.consume?.({ treeItem: {} });
  const second = boundary.consume?.(current);
  ready.resolve();
  await Promise.all([first, second]);
  expect(component.setTreeContext).toHaveBeenCalledExactlyOnceWith(current, expect.any(Object));
});

it('forwards lost parent context so the sign clears its pending state', async () => {
  const { component } = mount();
  await boundary.consume?.({ treeItem: {} });
  await boundary.consume?.(undefined);
  expect(component.setTreeContext).toHaveBeenLastCalledWith(undefined, expect.any(Object));
});

it('does not bridge after the condition is destroyed while waiting', async () => {
  const ready = deferred();
  const { component, condition } = mount(ready.promise);
  const consuming = boundary.consume?.({ treeItem: {} });
  condition.destroy();
  ready.resolve();
  await consuming;
  expect(component.setTreeContext).not.toHaveBeenCalled();
});

it('tolerates a component removed before initializer readiness resolves', async () => {
  const ready = deferred();
  const { host, component } = mount(ready.promise);
  const consuming = boundary.consume?.({ treeItem: {} });
  host.component = undefined as never;
  ready.resolve();
  await expect(consuming).resolves.toBeUndefined();
  expect(component.setTreeContext).not.toHaveBeenCalled();
});

it('hosts the lookup repository on the connected condition instead of the detached sign', async () => {
  const { component, condition } = mount();
  const context = { treeItem: {} };
  await boundary.consume?.(context);
  expect(boundary.repositoryHosts).toEqual([condition]);
  expect(component.setTreeContext.mock.calls[0][1].host).toBe(condition);
});
