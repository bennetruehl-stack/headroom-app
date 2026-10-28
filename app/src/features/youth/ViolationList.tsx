import { explainViolation, type RuleViolation } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';

const severityKey: Record<RuleViolation['severity'], MessageKey> = {
  error: 'youthSeverityError',
  warning: 'youthSeverityWarning',
  info: 'youthSeverityInfo',
};

const severityClass: Record<RuleViolation['severity'], string> = {
  error: 'result-over',
  warning: 'result-close',
  info: 'result-neutral',
};

/** Eine Jugendschutz-Meldung: Wort plus Farbe, Rechtsgrundlage und aufklappbare Erklärung. */
export function ViolationItem({ violation, language }: { violation: RuleViolation; language: Language }) {
  const explanation = explainViolation(violation, language);
  return (
    <div className={'result-line youth-violation ' + severityClass[violation.severity]} data-rule={violation.ruleId}>
      <strong>
        <span className={'youth-severity youth-severity-' + violation.severity}>{t(language, severityKey[violation.severity])}</span>
        {' '}{explanation.title}
      </strong>
      <span>{language === 'de' ? violation.message : violation.message_en}</span>
      <details className="row-explain">
        <summary>{t(language, 'youthWhy')} · {violation.lawRef}</summary>
        <p>{explanation.text}</p>
        <a href={violation.url} target="_blank" rel="noreferrer">{t(language, 'youthLawLink')} ↗</a>
      </details>
    </div>
  );
}

export function ViolationList({ violations, language }: { violations: RuleViolation[]; language: Language }) {
  return (
    <div className="youth-violations">
      {violations.map((violation, index) => (
        <ViolationItem key={violation.ruleId + (violation.date ?? '') + index} violation={violation} language={language} />
      ))}
    </div>
  );
}
