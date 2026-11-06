import { beforeEach, expect, it, vi } from 'vitest';
import type { TemplateResult } from '@umbraco-cms/backoffice/external/lit';

const boundary = vi.hoisted(() => ({
  context: undefined as undefined | ((context: unknown) => void),
  item: undefined as undefined | ((item: unknown) => Promise<void>),
  requestItems: vi.fn(),
}));
vi.mock('@umbraco-cms/backoffice/lit-element', () => ({
  UmbLitElement: class {
    consumeContext(_token: unknown, callback: typeof boundary.context) { boundary.context = callback; }
    observe(_source: unknown, callback: typeof boundary.item) { boundary.item = callback; }
    requestUpdate() {}
  },
}));
vi.mock('@umbraco-cms/backoffice/tree', () => ({ UMB_TREE_ITEM_CONTEXT: Symbol() }));
vi.mock('@umbraco-cms/backoffice/document-type', () => ({
  UmbDocumentTypeItemRepository: class { requestItems = boundary.requestItems; },
}));
vi.stubGlobal('customElements', { define: vi.fn() });
const { NodeIconsOriginalIconSign } = await import('./original-icon-sign');

beforeEach(() => {
  boundary.context = undefined;
  boundary.item = undefined;
  boundary.requestItems.mockReset();
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
  let resolve!: (result: { data: { icon: string }[] }) => void;
  const promise = new Promise<{ data: { icon: string }[] }>((done) => { resolve = done; });
  return { promise, resolve };
}

it('renders the original document-type icon from the native repository with an accessible label', async () => {
  boundary.requestItems.mockResolvedValue({ data: [{ unique: 'type-a', icon: 'icon-home color-blue' }] });
  const element = mount();
  await change('type-a');
  expect(boundary.requestItems).toHaveBeenCalledWith(['type-a']);
  expect(renderedIcon(element)).toBe('icon-home color-blue');
  const template = element.render() as TemplateResult;
  expect(template.strings.join('')).toContain('aria-label="Original document type icon"');
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
