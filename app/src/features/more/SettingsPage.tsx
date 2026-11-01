import { useState } from 'react';
import { inputRules, isStudentMode, validateDateRange, validateNumber, type ProfileStatus } from '@headroom/core';
import { profileChoices } from '../../app/constants';
import type { Screen } from '../../app/types';
import { PageHeading } from '../../components/PageHeading';
import { sanitizeFeatures, type FeatureName } from '@headroom/core';
import { t, type Language } from '../../i18n/translations';
import { dateError, numberError } from '../../lib/inputErrors';
import { localToday } from '../../lib/format';
import { YouthProfileFields } from '../youth/YouthProfileFields';
import { bafoegRelevant } from '../../config/studentMode';
import { createBackup, type AppState } from '../../lib/storage';
import { parseBackup } from '../../lib/db/migrateV1';
import type { QuarantinedRecord } from '@headroom/core';

export function SettingsPage({
  data,
  language,
  features,
  advancedMode,
  onAdvanced,
  onUpdate,
  onFeatureUpdate,
  onNavigate,
  onReset,
  onDelete,
  quarantine,
  onImportQuarantine,
  onDiscardQuarantine,
}: {
  data: AppState;
  language: Language;
  features: Record<FeatureName, boolean>;
  advancedMode: boolean;
  onAdvanced: (value: boolean) => void;
  onUpdate: (values: Partial<AppState>) => void;
  onFeatureUpdate: (values: Record<FeatureName, boolean>) => void;
  onNavigate: (screen: Screen) => void;
  onReset: () => void;
  onDelete: () => void;
  quarantine: QuarantinedRecord[];
  onImportQuarantine: (items: QuarantinedRecord[]) => void;
  onDiscardQuarantine: () => void;
}) {
  const [ageText, setAgeText] = useState(String(data.profile.age));
  const ageMessage = numberError(validateNumber(ageText, inputRules.age), t(language, 'age'), language);
  const semester = data.profile.semesterPeriods?.[0];
  const semesterMessage = semester && (semester.start || semester.end)
    ? dateError(validateDateRange(semester.start, semester.end, false), t(language, 'lecturePeriod'), language)
    : '';
  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { state?: unknown; featureFlags?: unknown };
      // Jeder Eintrag wird einzeln geprüft: Ungültige werden aussortiert und aufbewahrt, der Rest übernommen.
      const imported = parseBackup(parsed?.state ?? parsed);
      if (!imported) throw new Error('Invalid backup');
      onUpdate({ ...imported.state, onboarded: true });
      onImportQuarantine(imported.quarantine);
      if (parsed.featureFlags && typeof parsed.featureFlags === 'object') {
        onFeatureUpdate(sanitizeFeatures(parsed.featureFlags));
        const advanced = (parsed.featureFlags as { advancedMode?: unknown }).advancedMode;
        if (typeof advanced === 'boolean') onAdvanced(advanced);
      }
      window.alert(imported.quarantine.length
        ? t(language, 'importPartial', { count: imported.quarantine.length })
        : t(language, 'importSuccess'));
    } catch {
      window.alert(t(language, 'importError'));
    }
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(createBackup(data, quarantine, { ...features, advancedMode }), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headroom-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'controlKicker')} title={t(language, 'settingsTitle')} />
      <div className="surface settings-card">
        <p className="muted">{t(language, 'localData')}</p>
        <label className="field">
          <span>{t(language, 'profileStatus')}</span>
          <select
            value={data.profile.status}
            onChange={(event) => {
              const status = event.target.value as ProfileStatus;
              onUpdate({
                profile: {
                  ...data.profile,
                  status,
                  hasMainJob: status === 'Employee' ? data.profile.hasMainJob ?? true : data.profile.hasMainJob,
                },
              });
            }}
          >
            {profileChoices.map((choice) => <option value={choice.value} key={choice.value}>{t(language, choice.key)}</option>)}
          </select>
        </label>
        <label className="field">
          <span>{t(language, 'age')}</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={ageText}
            aria-invalid={Boolean(ageMessage) || undefined}
            aria-describedby={ageMessage ? 'settings-age-error' : undefined}
            onChange={(event) => {
              setAgeText(event.target.value);
              const parsed = validateNumber(event.target.value, inputRules.age);
              // Nur gültige Werte speichern; sonst bleibt das letzte gültige Alter erhalten.
              if (parsed.ok && parsed.value !== null) onUpdate({ profile: { ...data.profile, age: parsed.value } });
            }}
          />
          {ageMessage && <small id="settings-age-error" className="form-error" role="alert">{ageMessage}</small>}
        </label>
        <label className="check-row">
          <input type="checkbox" checked={data.profile.familyInsured} onChange={(event) => onUpdate({ profile: { ...data.profile, familyInsured: event.target.checked } })} />
          <span>{t(language, 'familyInsured')}</span>
        </label>
        {bafoegRelevant(data.profile.status) && <label className="check-row">
          <input type="checkbox" checked={data.profile.bafoeg} onChange={(event) => onUpdate({ profile: { ...data.profile, bafoeg: event.target.checked } })} />
          <span>{t(language, 'bafoeg')}</span>
        </label>}
        {data.profile.status === 'Working student' && (
          <div className="form-grid two-columns">
            <label className="field"><span>{t(language, 'lectureStart')}</span><input type="date" value={data.profile.semesterPeriods?.[0]?.start ?? ''} onChange={(event) => onUpdate({ profile: { ...data.profile, semesterPeriods: [{ start: event.target.value, end: data.profile.semesterPeriods?.[0]?.end ?? '' }] } })} /></label>
            <label className="field"><span>{t(language, 'lectureEnd')}</span><input type="date" value={data.profile.semesterPeriods?.[0]?.end ?? ''} onChange={(event) => onUpdate({ profile: { ...data.profile, semesterPeriods: [{ start: data.profile.semesterPeriods?.[0]?.start ?? '', end: event.target.value }] } })} /></label>
            {semesterMessage && <p role="alert" className="form-error wide-hint">{semesterMessage}</p>}
          </div>
        )}
        {(isStudentMode(data.profile, localToday()) || data.profile.status === 'School leaver') && (
          <YouthProfileFields profile={data.profile} language={language} onChange={(profile) => onUpdate({ profile })} />
        )}
        <label className="check-row">
          <input type="checkbox" checked={data.darkMode} onChange={(event) => onUpdate({ darkMode: event.target.checked })} />
          <span>{t(language, 'darkMode')}</span>
        </label>
        <label className="flag-row advanced-row">
          <span>
            <strong>{t(language, 'advancedMode')} <span className="badge-demo">{t(language, 'demoBadge')}</span></strong>
            <small>{t(language, 'advancedModeHint')}</small>
          </span>
          <input type="checkbox" checked={advancedMode} onChange={(event) => onAdvanced(event.target.checked)} />
        </label>
        <div className="settings-actions">
          <button className="button button-quiet" type="button" onClick={exportData}>{t(language, 'export')}</button>
          <label className="button button-quiet file-button">
            {t(language, 'import')}
            <input type="file" accept="application/json,.json" onChange={(event) => void importFile(event.target.files?.[0])} />
          </label>
          <button className="button button-quiet" type="button" onClick={() => onNavigate('Trends')}>{t(language, 'trends')}</button>
          {advancedMode && (
            <details className="developer-disclosure">
              <summary>{t(language, 'developer')}</summary>
              <p className="muted">{t(language, 'developerIntro')}</p>
              <button className="button button-quiet" type="button" onClick={() => onNavigate('Developer')}>{t(language, 'openDeveloper')}</button>
            </details>
          )}
          {quarantine.length > 0 && (
            <div className="quarantine-box">
              <p><span className="status-badge status-close"><span className="status-dot" aria-hidden="true" />{t(language, 'quarantineStatus')}</span> {t(language, 'quarantineCount', { count: quarantine.length })}</p>
              <p className="muted">{t(language, 'quarantineHint')}</p>
              <button className="button button-quiet" type="button" onClick={() => {
                if (window.confirm(t(language, 'confirmQuarantineDiscard'))) onDiscardQuarantine();
              }}>{t(language, 'quarantineDiscard')}</button>
            </div>
          )}
          <button className="button button-quiet" type="button" onClick={() => onReset()}>{t(language, 'resetDemo')}</button>
          <button className="button button-danger" type="button" onClick={() => {
            if (window.confirm(t(language, 'confirmDeleteAll'))) onDelete();
          }}>{t(language, 'deleteAll')}</button>
        </div>
      </div>
    </section>
  );
}
