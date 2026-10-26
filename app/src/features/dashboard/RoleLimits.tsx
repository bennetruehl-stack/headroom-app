import { activeLimits, employeeMiniJobStatus, hoursInWeek, isInLecturePeriod, roleLayouts, roleTier, statusFor, type Limit, type ProfileStatus, type RoleItem } from '@headroom/core';
import { ProgressBar } from '../../components/ProgressBar';
import { SourceStamp } from '../../components/SourceStamp';
import { StatusBadge } from '../../components/StatusBadge';
import { t, type Language } from '../../i18n/translations';
import { money } from '../../lib/format';
import { limitConsequence, limitName, monthlyAmountForLimit } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';

export type RoleRowData = {
  item: RoleItem;
  title: string;
  limit?: Limit;
  /** Text rechts, z. B. „487 € / 603 €“. */
  amount?: string;
  /** Verhältnis für Balken und Status; nur bei geprüften Werten. */
  ratio?: number;
  status?: 'Safe' | 'Close' | 'Over';
  note?: string;
  tone?: 'neutral' | 'amber';
};

/** Baut die Zeilen für alle Rollen-Einträge, die für dieses Profil gelten. */
export function roleRows(
  data: AppState,
  language: Language,
  month: string,
  year: number,
  today: string,
  daysUsed: number,
  annualRegular: number,
): RoleRowData[] {
  const active = activeLimits(data.profile, year);
  const find = (id: string) => active.find((limit) => limit.id === id);
  const items = [...roleLayouts[data.profile.status].primary, ...roleLayouts[data.profile.status].secondary];
  const rows: RoleRowData[] = [];
  for (const item of items) {
    const limit = find(item);
    if (item === 'taxClassInfo') {
      rows.push({ item, title: t(language, 'taxClassTitle'), note: t(language, 'taxClassInfo') });
      continue;
    }
    if (!limit) continue;
    const title = limitName(limit, language);
    const verified = limit.verified && limit.value !== null;
    switch (item) {
      case 'miniJobMonthly':
      case 'familyInsurance':
      case 'bafoegSideIncome': {
        const value = monthlyAmountForLimit(limit, data.profile, data.jobs, data.shifts, month, year);
        if (!value) { rows.push({ item, title, limit }); break; }
        const ratio = value.cap > 0 ? value.total / value.cap : 0;
        rows.push({ item, title, limit, ratio, status: statusFor(ratio), amount: money(value.total, language) + ' / ' + money(value.cap, language) });
        break;
      }
      case 'shortTermEmployment': {
        if (!verified || !limit.value) { rows.push({ item, title, limit }); break; }
        const ratio = daysUsed / limit.value;
        rows.push({ item, title, limit, ratio, status: statusFor(ratio), amount: t(language, 'daysOf', { used: daysUsed, limit: limit.value }) });
        break;
      }
      case 'workingStudentHours': {
        if (!verified || !limit.value) { rows.push({ item, title, limit }); break; }
        if (!isInLecturePeriod(today, data.profile)) {
          rows.push({ item, title, limit, note: t(language, 'outsideLecture') });
          break;
        }
        const hours = Math.round(hoursInWeek(data.shifts, today) * 10) / 10;
        const ratio = hours / limit.value;
        rows.push({ item, title, limit, ratio, status: statusFor(ratio), amount: t(language, 'hoursThisWeek', { used: hours, limit: limit.value }) });
        break;
      }
      case 'miniJobAlongsideMainJob': {
        const count = data.jobs.filter((job) => job.type === 'mini-job' && job.startDate <= today && (!job.endDate || job.endDate >= today)).length;
        const rule = employeeMiniJobStatus(count);
        rows.push({
          item, title, limit,
          amount: t(language, 'miniJobsBesideMain', { count, limit: limit.value ?? 1 }),
          status: verified ? (rule.over ? 'Over' : 'Safe') : undefined,
        });
        break;
      }
      case 'incomeTaxThreshold': {
        // Ungeprüft: Wert nur als Orientierung zeigen, ohne Status und ohne Warnung.
        rows.push({
          item, title, limit,
          amount: limit.value ? t(language, 'taxOrientationRow', { amount: money(annualRegular, language), limit: money(limit.value, language) }) : undefined,
          ...(verified && limit.value ? { ratio: annualRegular / limit.value, status: statusFor(annualRegular / limit.value) } : {}),
        });
        break;
      }
      case 'youthWorkProtection':
        rows.push({ item, title, limit, note: limitConsequence(limit, language), tone: 'amber' });
        break;
    }
  }
  return rows;
}

export function RoleRow({ row, language }: { row: RoleRowData; language: Language }) {
  const unverified = row.limit && !row.limit.verified;
  return (
    <article className="limit-progress-item">
      <div className="limit-row">
        <div>
          <strong>{row.title}</strong>
          {row.limit && <SourceStamp limit={row.limit} language={language} />}
        </div>
        <div className="limit-row-value">
          {row.amount && <span className="limit-amount">{row.amount}</span>}
          {row.status && !unverified && <StatusBadge status={row.status} language={language} />}
          {unverified && <span className="pill-unverified">{t(language, 'unverified')}</span>}
        </div>
      </div>
      {row.ratio !== undefined && row.status && !unverified && (
        <ProgressBar ratio={row.ratio} label={row.title} />
      )}
      {row.note && <p className={'row-note' + (row.tone === 'amber' ? ' row-note-amber' : '')}>{row.note}</p>}
      {row.limit && !row.note && (
        <details className="row-explain">
          <summary>{t(language, 'whatDoesItMean')}</summary>
          <p>{limitConsequence(row.limit, language)}</p>
        </details>
      )}
    </article>
  );
}

export function RoleLimits({ rows, status, language }: { rows: RoleRowData[]; status: ProfileStatus; language: Language }) {
  const primary = rows.filter((row) => roleTier(status, row.item) === 'primary');
  const secondary = rows.filter((row) => roleTier(status, row.item) !== 'primary');
  return (
    <>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t(language, 'forYouKicker')}</p>
            <h2>{t(language, 'forYou')}</h2>
          </div>
          <span className="small-count">{primary.length.toString().padStart(2, '0')}</span>
        </div>
        {primary.length === 0
          ? <p className="muted">{t(language, 'noLimits')}</p>
          : <div className="limit-progress-list">{primary.map((row) => <RoleRow key={row.item} row={row} language={language} />)}</div>}
      </section>
      {secondary.length > 0 && (
        <details className="more-limits">
          <summary>
            <span>{t(language, 'moreLimits')}</span>
            <span className="small-count">{secondary.length.toString().padStart(2, '0')}</span>
          </summary>
          <p className="muted">{t(language, 'moreLimitsHint')}</p>
          <div className="limit-progress-list">{secondary.map((row) => <RoleRow key={row.item} row={row} language={language} />)}</div>
        </details>
      )}
    </>
  );
}
