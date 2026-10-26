import { useEffect, useRef, useState } from 'react';
import type { Language } from '../i18n/translations';
import { money, prefersReducedMotion } from '../lib/format';

/** Zählt sanft (250 ms) vom alten zum neuen Betrag; ohne Animation bei reduzierter Bewegung. */
export function AnimatedMoney({ value, language }: { value: number; language: Language }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value || prefersReducedMotion()) {
      from.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / 250);
      const eased = 1 - Math.pow(1 - progress, 3);
      setShown(start + (value - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value]);
  return <>{money(shown, language)}</>;
}
