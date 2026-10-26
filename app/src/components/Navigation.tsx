import type { ReactNode } from 'react';
import type { Screen } from '../app/types';
import { t, type Language, type MessageKey } from '../i18n/translations';

/** Linien-Icons im Stil der iOS-Tab-Leiste: 24 px, runde Enden, eine Strichstärke. */
const icons: Record<'Dashboard' | 'Shifts' | 'Jobs' | 'Limits' | 'More', ReactNode> = {
  Dashboard: (
    <>
      <path d="M4.5 16.5a7.5 7.5 0 1 1 15 0" />
      <path d="M12 16.5l3.6-4.6" />
      <circle cx="12" cy="16.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  Shifts: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="3" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  Jobs: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="3" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
    </>
  ),
  Limits: (
    <>
      <path d="M12 3.5l7 2.8v5.2c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9V6.3z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </>
  ),
  More: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="8.2" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
};

const items: { screen: keyof typeof icons; key: MessageKey }[] = [
  { screen: 'Dashboard', key: 'dashboard' },
  { screen: 'Shifts', key: 'shifts' },
  { screen: 'Jobs', key: 'jobs' },
  { screen: 'Limits', key: 'limits' },
  { screen: 'More', key: 'more' },
];

const moreScreens: Screen[] = ['Settings', 'Trends', 'WageCheck', 'Developer', 'JobBoard', 'PeerStats', 'Premium'];

export function Navigation({
  language,
  current,
  onNavigate,
}: {
  language: Language;
  current: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  const selected = moreScreens.includes(current) ? 'More' : current === 'Import' ? 'Shifts' : current;

  return (
    <nav className="bottom-nav" aria-label={t(language, 'mainNavigation')}>
      {items.map((item) => (
        <button
          type="button"
          key={item.screen}
          className={selected === item.screen ? 'nav-item is-current' : 'nav-item'}
          aria-current={selected === item.screen ? 'page' : undefined}
          onClick={() => onNavigate(item.screen)}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {icons[item.screen]}
          </svg>
          <span>{t(language, item.key)}</span>
        </button>
      ))}
    </nav>
  );
}
