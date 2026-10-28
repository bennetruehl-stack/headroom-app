import { ageOn, jobTagFindings, youthLaborApplies, type Job, type Profile, type RuleViolation } from '@headroom/core';
import type { Language } from '../../i18n/translations';
import { localToday } from '../../lib/format';
import { ViolationItem } from './ViolationList';

/** Hinweise zu den Merkmalen eines Jobs (Akkord, gefährlich, Bar, Alkohol). Die Zuordnung steht im Core. */
export function JobTagFindings({ job, profile, language }: { job: Job; profile: Profile; language: Language }) {
  const today = localToday();
  if (!youthLaborApplies(profile, today)) return null;
  const findings = jobTagFindings(job, ageOn(profile, today));
  if (!findings.length) return null;
  return (
    <div className="youth-violations job-tag-findings">
      {findings.map((rule) => {
        const violation: RuleViolation = { ruleId: rule.ruleId, severity: rule.severity, message: rule.message, message_en: rule.message_en, lawRef: rule.lawRef, url: rule.url, shiftIds: [] };
        return <ViolationItem key={rule.ruleId} violation={violation} language={language} />;
      })}
    </div>
  );
}
