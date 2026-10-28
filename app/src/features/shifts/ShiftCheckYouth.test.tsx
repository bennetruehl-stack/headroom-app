import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createDemoState, type AppState } from '../../lib/storage';
import { ShiftCheckDialog } from './ShiftCheckDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setValue(input: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event(input instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
}

function pupilState(): AppState {
  const state = createDemoState();
  return {
    ...state,
    profile: { status: 'Pupil', age: 16, birthDate: '2010-03-15', familyInsured: true, bafoeg: false, isFullTimeSchoolObligated: false },
    jobs: [{ id: 'office', title: 'Bürohilfe', type: 'mini-job', wage: 10, startDate: '2026-01-01', tags: ['lightWork'] }],
    shifts: [],
    payments: [],
  };
}

describe('ShiftCheckDialog im Schüler-Modus', () => {
  it('zeigt Uhrzeiten und meldet einen Verstoß gegen die Nachtruhe mit Rechtsgrundlage', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    act(() => root.render(<ShiftCheckDialog data={pupilState()} language="de" onClose={() => undefined} />));
    const inputs = () => [...container.querySelectorAll<HTMLInputElement>('input')];
    act(() => setValue(inputs().find((input) => input.type === 'date')!, '2026-11-03'));
    const times = inputs().filter((input) => input.type === 'time');
    expect(times).toHaveLength(2);
    act(() => setValue(times[0], '17:00'));
    act(() => setValue(times[1], '21:00'));

    const night = container.querySelector('[data-rule="nightRest"]');
    expect(night?.textContent).toContain('Nicht erlaubt');
    expect(night?.textContent).toContain('§ 14 Abs. 1 JArbSchG');
    act(() => root.unmount());
  });

  it('zeigt keinen Jugendschutz-Teil für Erwachsene', () => {
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const adult = { ...pupilState(), profile: { ...pupilState().profile, status: 'Student' as const, birthDate: '2000-01-01', age: 26 } };
    act(() => root.render(<ShiftCheckDialog data={adult} language="de" onClose={() => undefined} />));
    expect(container.querySelectorAll('input[type="time"]')).toHaveLength(0);
    act(() => root.unmount());
  });
});
