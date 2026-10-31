import { featureLabels } from '../../app/constants';
import { PageHeading } from '../../components/PageHeading';
import { defaultFeatures, type FeatureName } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';

export function DeveloperPage({
  language,
  features,
  onChange,
}: {
  language: Language;
  features: Record<FeatureName, boolean>;
  onChange: (features: Record<FeatureName, boolean>) => void;
}) {
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'demoKicker')} title={t(language, 'developer')} />
      <p className="page-intro">{t(language, 'developerIntro')}</p>
      <section className="surface settings-card">
        <div className="section-heading">
          <h2>{t(language, 'flags')}</h2>
          <button className="text-button" type="button" onClick={() => onChange({ ...defaultFeatures })}>{t(language, 'resetFlags')}</button>
        </div>
        {Object.entries(features).map(([name, value]) => (
          <label className="flag-row" key={name}>
            <span><strong>{t(language, featureLabels[name as FeatureName])}</strong><small>{name}</small></span>
            <input
              type="checkbox"
              checked={value}
              onChange={(event) => onChange({ ...features, [name]: event.target.checked })}
            />
          </label>
        ))}
      </section>
    </section>
  );
}
