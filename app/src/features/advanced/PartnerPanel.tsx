import { annualIncomeProjection, annualMiniProjection, limitValue, limitsForYear, recommendationLevel } from '@headroom/core';
import { t, type Language, type MessageKey } from '../../i18n/translations';
import { localToday } from '../../lib/format';
import { getAgeBoundary } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { demoPartners } from '../../mock/data';

export function PartnerPanel({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  const year = Number(localToday().slice(0, 4));
  const annual = annualMiniProjection(data.shifts, data.jobs, year, Number(localToday().slice(5, 7)));
  const annualLimit = limitValue('miniJobYearly', year);
  const taxLimitRecord = limitsForYear(year).find((limit) => limit.id === 'incomeTaxThreshold');
  const taxLimit = taxLimitRecord?.value ?? 0;
  const month = localToday().slice(0, 7);
  const secondRegular = data.jobs.filter((job) => job.type === 'regular').length > 1;
  const familyLimit = limitsForYear(year).find((limit) => limit.id === 'familyInsurance');
  const familyThreshold = getAgeBoundary(familyLimit);
  const familyIncome = data.shifts.reduce((sum, shift) => {
    if (!shift.date.startsWith(month)) return sum;
    const job = data.jobs.find((entry) => entry.id === shift.jobId);
    return sum + (job ? shift.hours * job.wage : 0);
  }, 0);
  const currentFacts = {
    regularSecondJob: Boolean(taxLimitRecord?.verified) && secondRegular && annualIncomeProjection(data.shifts, data.jobs, year, ['regular']) <= taxLimit,
    underTaxThreshold: Boolean(taxLimitRecord?.verified) && annualIncomeProjection(data.shifts, data.jobs, year, ['regular', 'working student']) <= taxLimit,
    familyInsuranceEnds: data.profile.familyInsured && (
      (familyThreshold !== null && data.profile.age >= familyThreshold) ||
      familyIncome > (
        data.shifts.some((shift) => shift.date.startsWith(month) && data.jobs.find((job) => job.id === shift.jobId)?.type !== 'mini-job')
          ? familyLimit?.value ?? Infinity
          : limitValue('miniJobMonthly', year)
      )
    ),
    overMiniJobPermanently: annual > annualLimit,
    unclassified: secondRegular && (!taxLimitRecord?.verified || annualIncomeProjection(data.shifts, data.jobs, year, ['regular']) > taxLimit),
  };
  const level = recommendationLevel(currentFacts);
  const isOpen = level > 0 && !data.dismissedRecommendations.includes(level);
  const partnerIds: Record<number, string[]> = {
    1: ['ELSTER', 'TaxLeaf'],
    2: ['HealthCompare'],
    3: ['SafeCover'],
    4: ['Advisor Map'],
  };
  const titleKey: Record<number, MessageKey> = {
    1: 'partnerLevel1',
    2: 'partnerLevel2',
    3: 'partnerLevel3',
    4: 'partnerLevel4',
  };
  const partners = demoPartners.filter((partner) => partnerIds[level]?.includes(partner.name));

  if (level === 0) return null;
  if (!isOpen) return null;

  return (
    <section className="surface partner-panel">
      <div className="partner-panel-head">
        <span className="badge-demo">{t(language, 'partnerBadge')}</span>
        <button className="icon-button" type="button" aria-label={t(language, 'dismiss')} onClick={() => {
          onUpdate({ dismissedRecommendations: [...data.dismissedRecommendations, level] });
        }}>×</button>
      </div>
      <p>{t(language, titleKey[level])}</p>
      <div className="partner-links">
        {partners.map((partner) => (
          <a href={partner.fictional ? '#' : partner.url} key={partner.name} target={partner.fictional ? undefined : '_blank'} rel="noreferrer" onClick={(event) => {
            if (partner.fictional) event.preventDefault();
          }}>
            {partner.name === 'ELSTER' ? t(language, 'elsterFree') : partner.name} <span>· {t(language, 'partnerBadge')}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
