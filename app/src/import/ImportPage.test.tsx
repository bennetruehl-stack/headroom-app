import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyState, type AppState } from '../lib/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const feed = vi.hoisted(() => ({ fetchCalendarFeed: vi.fn() }));
vi.mock('../lib/shiftImport', async (original) => ({ ...(await original<typeof import('../lib/shiftImport')>()), fetchCalendarFeed: feed.fetchCalendarFeed }));

const { ImportPage } = await import('./ImportPage');

const LINK = 'https://calendar.google.com/calendar/ical/x/private-abc/basic.ics';
const job = { id: 'pub', title: 'Kneipe', type: 'mini-job' as const, wage: 13.9, startDate: '2026-01-01' };
const withJob = (extra: Partial<AppState> = {}): AppState => ({ ...createEmptyState(), onboarded: true, jobs: [job], ...extra });
let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  feed.fetchCalendarFeed.mockReset().mockResolvedValue('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n');
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(data: AppState, onUpdate = vi.fn()) {
  act(() => root.render(<ImportPage data={data} language="de" onUpdate={onUpdate} onDone={vi.fn()} />));
  return onUpdate;
}

const button = (text: string) => [...container.querySelectorAll('button')].find((item) => item.textContent?.trim().startsWith(text)) as HTMLButtonElement | undefined;
const consentBox = () => [...container.querySelectorAll('label')].find((label) => label.textContent?.includes('einverstanden'))?.querySelector('input[type="checkbox"]') as HTMLInputElement | undefined;

function typeLink(value: string) {
  const input = container.querySelector('input[type="url"]') as HTMLInputElement;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
  act(() => input.dispatchEvent(new Event('input', { bubbles: true })));
}

describe('Einwilligung zum Kalender-Abruf', () => {
  it('ruft einen Kalender-Link erst nach der Einwilligung ab und merkt sie sich', async () => {
    const onUpdate = render(withJob());
    typeLink(LINK);
    expect(container.textContent).toContain('Kalenderinhalt');
    expect(button('Verbinden')!.disabled).toBe(true);

    act(() => consentBox()!.click());
    expect(button('Verbinden')!.disabled).toBe(false);
    await act(async () => button('Verbinden')!.click());

    expect(feed.fetchCalendarFeed).toHaveBeenCalledWith(LINK);
    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ calendarConsent: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) }));
  });

  it('fragt nicht erneut, wenn die Einwilligung vorliegt, und lässt sie widerrufen', () => {
    const onUpdate = render(withJob({ calendarConsent: '2026-11-03' }));
    typeLink(LINK);
    expect(consentBox()).toBeUndefined();
    expect(button('Verbinden')!.disabled).toBe(false);
    act(() => button('Einwilligung widerrufen')!.click());
    expect(onUpdate).toHaveBeenCalledWith({ calendarConsent: undefined });
  });

  it('braucht für den Import einer Datei keine Einwilligung', () => {
    render(withJob());
    expect(container.querySelector('input[type="file"]')).not.toBeNull();
    expect(feed.fetchCalendarFeed).not.toHaveBeenCalled();
  });
});
