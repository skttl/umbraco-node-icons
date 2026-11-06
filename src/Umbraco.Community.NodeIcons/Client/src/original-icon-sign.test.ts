import { beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import { BehaviorSubject } from '@umbraco-cms/backoffice/external/rxjs';
import type { TemplateResult } from '@umbraco-cms/backoffice/external/lit';

const boundary = vi.hoisted(() => ({
  context: undefined as undefined | ((context: unknown) => void),
  item: undefined as undefined | ((item: unknown) => Promise<void>),
  requestItems: vi.fn(), requestUpdate: vi.fn(),
}));
vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class {
    consumeContext(_token: unknown, callback: typeof boundary.context) { boundary.context = callback; }
    #observers = new Map<unknown, { unsubscribe(): void }>();
    observe(source: { subscribe?: (callback: unknown) => { unsubscribe(): void } } | undefined,
      callback: typeof boundary.item, alias: unknown) {
      boundary.item = callback;
      this.#observers.get(alias)?.unsubscribe();
      if (source?.subscribe) this.#observers.set(alias, source.subscribe(callback));
      else if (!source) callback?.(undefined);
    }
    requestUpdate() { boundary.requestUpdate(); }
    destroy() { this.#observers.forEach((observer) => observer.unsubscribe()); }
  },
}));
vi.mock('@umbraco-cms/backoffice/tree', () => ({ UMB_TREE_ITEM_CONTEXT: Symbol() }));
vi.mock('@umbraco-cms/backoffice/document-type', () => ({
  UmbDocumentTypeItemRepository: class { requestItems = boundary.requestItems; },
}));
vi.stubGlobal('customElements', { define: vi.fn() });
const signModule = await import('./original-icon-sign');
const { NodeIconsOriginalIconSign } = signModule;

beforeEach(() => {
  boundary.context = undefined;
  boundary.item = undefined;
  boundary.requestItems.mockReset(); boundary.requestUpdate.mockClear();
});

function mount() {
  const element = new NodeIconsOriginalIconSign();
  boundary.context?.({ treeItem: {} });
  return element;
}
async function change(type?: string) {
  await boundary.item?.(type ? { documentType: { unique: type } } : undefined);
}
function renderedIcon(element: InstanceType<typeof NodeIconsOriginalIconSign>) {
  const template = element.render() as TemplateResult | null;
  return template?.values[0];
}
function deferred() {
  let resolve!: (result: { data: { icon: string; name?: string }[] }) => void;
  const promise = new Promise<{ data: { icon: string; name?: string }[] }>((done) => { resolve = done; });
  return { promise, resolve };
}

it('renders the original document-type icon from the native repository with an accessible label', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ unique: 'type-a', name: 'Article', icon: 'icon-home color-blue' }] });
  const element = mount();
  await change('type-a');
  expect(boundary.requestItems).toHaveBeenCalledWith(['type-a']);
  expect(renderedIcon(element)).toBe('icon-home color-blue');
  const template = element.render() as TemplateResult;
  expect(template.strings.join('')).toContain('aria-label=');
  expect(template.values[1]).toBe('Article');
});

it('clears the previous icon immediately when document type changes', async () => {
  boundary.requestItems.mockResolvedValueOnce({ data: [{ icon: 'icon-home' }] });
  const element = mount();
  await change('type-a');
  const next = deferred();
  boundary.requestItems.mockReturnValue(next.promise);
  const loading = change('type-b');
  expect(renderedIcon(element)).toBeUndefined();
  next.resolve({ data: [{ icon: 'icon-globe' }] });
  await loading;
  expect(renderedIcon(element)).toBe('icon-globe');
});

it('clears the icon when the tree item no longer has a document type', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ icon: 'icon-home' }] });
  const element = mount();
  await change('type-a');
  await change();
  expect(renderedIcon(element)).toBeUndefined();
});

it('keeps the icon empty after a failed repository result', async () => {
  boundary.requestItems.mockResolvedValueOnce({ data: [{ icon: 'icon-home' }] })
    .mockResolvedValueOnce({ error: new Error('lookup failed') });
  const element = mount();
  await change('type-a');
  await change('type-b');
  expect(renderedIcon(element)).toBeUndefined();
});

it('keeps the icon empty when the repository throws', async () => {
  boundary.requestItems.mockRejectedValue(new Error('network failure'));
  const element = mount();
  await expect(change('type-a')).resolves.toBeUndefined();
  expect(renderedIcon(element)).toBeUndefined();
});

it('ignores a stale lookup after a newer document type resolves', async () => {
  const old = deferred();
  boundary.requestItems.mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce({ data: [{ icon: 'icon-globe' }] });
  const element = mount();
  const loading = change('type-a');
  await change('type-b');
  old.resolve({ data: [{ icon: 'icon-home' }] });
  await loading;
  expect(renderedIcon(element)).toBe('icon-globe');
});

it('ignores an obsolete result when a recycled item returns to the first document type', async () => {
  const first = deferred();
  boundary.requestItems.mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ data: [{ icon: 'icon-globe' }] })
    .mockResolvedValueOnce({ data: [{ icon: 'icon-new-home' }] });
  const element = mount();
  const loading = change('type-a');
  await change('type-b');
  await change('type-a');
  first.resolve({ data: [{ icon: 'icon-old-home' }] });
  await loading;
  expect(renderedIcon(element)).toBe('icon-new-home');
});

it('ignores a pending result after the item is cleared', async () => {
  const pending = deferred();
  boundary.requestItems.mockReturnValue(pending.promise);
  const element = mount();
  const loading = change('type-a');
  await change();
  pending.resolve({ data: [{ icon: 'icon-home' }] });
  await loading;
  expect(renderedIcon(element)).toBeUndefined();
});

function tooltip(element: InstanceType<typeof NodeIconsOriginalIconSign>) {
  const api = new signModule.api(element);
  let label: string | undefined;
  const subscription = api.label.subscribe((value) => { label = value; });
  onTestFinished(() => subscription.unsubscribe());
  return () => label;
}

it('publishes the actual document type name through the native sign API label observable', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ name: 'Article', icon: 'icon-document' }] });
  const element = mount();
  const label = tooltip(element);
  expect(label()).toBe('');
  await change('type-a');
  expect(label()).toBe('Article');
  expect(boundary.requestItems).toHaveBeenCalledTimes(1);
});

it('clears the old tooltip while a changed document type lookup is pending', async () => {
  boundary.requestItems.mockResolvedValueOnce({ data: [{ name: 'Article', icon: 'icon-document' }] });
  const element = mount();
  const label = tooltip(element);
  await change('type-a');
  const next = deferred();
  boundary.requestItems.mockReturnValue(next.promise);
  const loading = change('type-b');
  expect(label()).toBe('');
  next.resolve({ data: [{ name: 'Landing page', icon: 'icon-home' }] });
  await loading;
  expect(label()).toBe('Landing page');
  expect((element.render() as TemplateResult).values[1]).toBe('Landing page');
});

it('clears the tooltip when the tree item loses its document type', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ name: 'Article', icon: 'icon-document' }] });
  const element = mount();
  const label = tooltip(element);
  await change('type-a');
  expect(label()).toBe('Article');
  await change();
  expect(label()).toBe('');
});

it.each([
  { name: 'failed response', result: () => Promise.resolve({ error: new Error('lookup failed') }) },
  { name: 'rejected request', result: () => Promise.reject(new Error('network failed')) },
  { name: 'missing result', result: () => Promise.resolve({ data: [] }) },
])('clears the tooltip after $name', async ({ result }) => {
  boundary.requestItems.mockResolvedValueOnce({ data: [{ name: 'Article', icon: 'icon-document' }] })
    .mockImplementationOnce(result);
  const element = mount();
  const label = tooltip(element);
  await change('type-a');
  expect(label()).toBe('Article');
  await change('type-b');
  expect(label()).toBe('');
  expect(element.render()).toBeNull();
});

it('ignores an obsolete document type name after a recycled item returns to the first type', async () => {
  const first = deferred();
  boundary.requestItems.mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce({ data: [{ name: 'Landing page', icon: 'icon-home' }] })
    .mockResolvedValueOnce({ data: [{ name: 'Updated article', icon: 'icon-document' }] });
  const element = mount();
  const label = tooltip(element);
  const loading = change('type-a');
  await change('type-b');
  await change('type-a');
  first.resolve({ data: [{ name: 'Old article', icon: 'icon-old-document' }] });
  await loading;
  expect(label()).toBe('Updated article');
  expect((element.render() as TemplateResult).values[1]).toBe('Updated article');
});

it('ignores a pending document type name after the item is cleared', async () => {
  const pending = deferred();
  boundary.requestItems.mockReturnValue(pending.promise);
  const element = mount();
  const label = tooltip(element);
  const loading = change('type-a');
  await change();
  pending.resolve({ data: [{ name: 'Article', icon: 'icon-document' }] });
  await loading;
  expect(label()).toBe('');
  expect(element.render()).toBeNull();
});

it('observes a detached sign context and replaces its previous row subscription', async () => {
  boundary.requestItems.mockImplementation(([type]) => Promise.resolve({ data: [{ name: type, icon: 'icon-' + type }] }));
  const element = mount();
  const label = tooltip(element);
  const first = new BehaviorSubject({ documentType: { unique: 'first' } });
  const second = new BehaviorSubject({ documentType: { unique: 'second' } });
  expect(element.setTreeContext).toBeTypeOf('function');
  element.setTreeContext({ treeItem: first } as never);
  await vi.waitFor(() => expect(label()).toBe('first'));
  element.setTreeContext({ treeItem: second } as never);
  await vi.waitFor(() => expect(label()).toBe('second'));
  first.next({ documentType: { unique: 'obsolete' } });
  expect(boundary.requestItems).toHaveBeenCalledTimes(2);
  expect(label()).toBe('second');
});

it('clears the detached sign when its context is removed without another item emission', async () => {
  const pending = deferred();
  boundary.requestItems.mockReturnValue(pending.promise);
  const element = mount();
  const label = tooltip(element);
  expect(element.setTreeContext).toBeTypeOf('function');
  const source = new BehaviorSubject({ documentType: { unique: 'type-a' } });
  element.setTreeContext({ treeItem: source } as never);
  element.setTreeContext(undefined);
  pending.resolve({ data: [{ name: 'Article', icon: 'icon-document' }] });
  await Promise.resolve();
  expect(label()).toBe('');
  expect(element.render()).toBeNull();
  source.next({ documentType: { unique: 'obsolete' } });
  expect(boundary.requestItems).toHaveBeenCalledTimes(1);
});

it('does not repeat the lookup when the connected preview receives the bridged context again', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ name: 'Article', icon: 'icon-document' }] });
  const element = mount();
  const label = tooltip(element);
  expect(element.setTreeContext).toBeTypeOf('function');
  const context = { treeItem: new BehaviorSubject({ documentType: { unique: 'type-a' } }) };
  element.setTreeContext(context as never);
  await vi.waitFor(() => expect(label()).toBe('Article'));
  element.setTreeContext(context as never);
  expect(boundary.requestItems).toHaveBeenCalledTimes(1);
});

it('ignores pending lookups and row emissions after the sign is destroyed', async () => {
  const pending = deferred();
  boundary.requestItems.mockReturnValue(pending.promise);
  const element = mount();
  const label = tooltip(element);
  expect(element.setTreeContext).toBeTypeOf('function');
  const source = new BehaviorSubject({ documentType: { unique: 'type-a' } });
  element.setTreeContext({ treeItem: source } as never);
  element.destroy();
  boundary.requestUpdate.mockClear();
  pending.resolve({ data: [{ name: 'Article', icon: 'icon-document' }] });
  await Promise.resolve();
  source.next({ documentType: { unique: 'obsolete' } });
  expect(label()).toBe('');
  expect(element.render()).toBeNull();
  expect(boundary.requestUpdate).not.toHaveBeenCalled();
  expect(boundary.requestItems).toHaveBeenCalledTimes(1);
});
