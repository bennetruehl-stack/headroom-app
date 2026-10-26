import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Broken(): never {
  throw new Error('kaputt');
}

describe('ErrorBoundary', () => {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  afterEach(() => vi.restoreAllMocks());

  it('zeigt einen Hinweis statt einer leeren Seite, wenn eine Ansicht abstürzt', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => root.render(<ErrorBoundary language="de" resetKey="Trends"><Broken /></ErrorBoundary>));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Diese Ansicht konnte nicht geladen werden.');
  });

  it('setzt sich beim Wechsel der Ansicht zurück', () => {
    act(() => root.render(<ErrorBoundary language="de" resetKey="Jobs"><p>Jobs</p></ErrorBoundary>));
    expect(container.textContent).toBe('Jobs');
  });
});
