import type { Screen } from '../../app/types';
import { PageHeading } from '../../components/PageHeading';
import type { ActiveFeatures } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';

export function MorePage({
  language,
  features,
  onNavigate,
}: {
  language: Language;
  features: ActiveFeatures;
  onNavigate: (screen: Screen) => void;
}) {
  const entries: { screen: Screen; title: MessageKey; description: MessageKey; visible?: boolean }[] = [
    { screen: 'Parents', title: 'parentsTitle', description: 'descParents', visible: features.parents },
    { screen: 'Import', title: 'importTitle', description: 'descImport' },
    { screen: 'Trends', title: 'trends', description: 'descTrends' },
    { screen: 'WageCheck', title: 'wageCheck', description: 'descWage' },
    { screen: 'Settings', title: 'settings', description: 'descSettings' },
    { screen: 'JobBoard', title: 'jobBoardTitle', description: 'descJobBoard', visible: features.jobBoard },
    { screen: 'PeerStats', title: 'peerTitle', description: 'descPeer', visible: features.peerStats },
    { screen: 'Premium', title: 'premiumTitle', description: 'descPremium', visible: features.premium },
    { screen: 'Privacy', title: 'privacyTitle', description: 'descPrivacy' },
    { screen: 'Imprint', title: 'imprintTitle', description: 'descImprint' },
  ];
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'controlKicker')} title={t(language, 'more')} />
      <div className="more-list">
        {entries.filter((entry) => entry.visible !== false).map((entry) => (
          <button className="more-link surface" key={entry.screen} type="button" onClick={() => onNavigate(entry.screen)}>
          <span><strong>{t(language, entry.title)}</strong><small>{t(language, entry.description)}</small></span>
            <span className="more-arrow" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
    </section>
  );
}
