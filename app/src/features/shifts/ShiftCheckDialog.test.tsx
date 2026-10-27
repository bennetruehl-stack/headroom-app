import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createDemoState } from '../../lib/storage';
import { ShiftCheckDialog } from './ShiftCheckDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" id="trigger" onClick={() => setOpen(true)}>Öffnen</button>
      {open && <ShiftCheckDialog data={createDemoState()} language="de" onClose={() => setOpen(false)} />}
    </>
  );
}

const tab = (shiftKey = false) =>
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true, cancelable: true }));

describe('ShiftCheckDialog Fokusführung', () => {
  const original = Element.prototype.getClientRects;
  // jsdom berechnet kein Layout; für den Test gelten alle Elemente als sichtbar.
  beforeAll(() => { Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList; });
  afterAll(() => { Element.prototype.getClientRects = original; });

  it('setzt den Fokus beim Öffnen, hält ihn im Dialog und gibt ihn zurück', () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<Harness />));
    const trigger = container.querySelector<HTMLButtonElement>('#trigger')!;
    trigger.focus();
    act(() => trigger.click());

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(document.activeElement).toBe(dialog);

    const focusables = [...dialog.querySelectorAll<HTMLElement>('button, select, input, a[href]')];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    last.focus();
    act(() => tab());
    expect(document.activeElement).toBe(first);
    act(() => tab(true));
    expect(document.activeElement).toBe(last);

    // Fokus außerhalb wird zurückgeholt.
    act(() => trigger.focus());
    expect(dialog.contains(document.activeElement)).toBe(true);

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); vi.runAllTimers(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    act(() => root.unmount());
    vi.useRealTimers();
  });
});
