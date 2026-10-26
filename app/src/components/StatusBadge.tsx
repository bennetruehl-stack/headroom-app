import { useEffect, useRef, useState } from 'react';
import { t, type Language } from '../i18n/translations';
import { statusKey } from '../lib/limitText';

export function StatusBadge({
  status,
  language,
}: {
  status: 'Safe' | 'Close' | 'Over';
  language: Language;
}) {
  // Animation nur bei einem echten Wechsel, nicht bei jedem Seitenaufruf.
  const previous = useRef(status);
  const [changes, setChanges] = useState(0);
  useEffect(() => {
    if (previous.current !== status) {
      previous.current = status;
      setChanges((count) => count + 1);
    }
  }, [status]);
  return (
    <span key={changes} className={'status-badge status-' + status.toLowerCase() + (changes ? ' status-changed' : '')}>
      <span className="status-dot" aria-hidden="true" />
      {t(language, statusKey(status))}
    </span>
  );
}
