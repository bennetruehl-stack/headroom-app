import { useEffect, useState } from 'react';
import { activeLimits, annualMiniProjection, consentAgeRule, hoursInWeek, isInLecturePeriod, limitValue, limitsForYear, monthlyIncomeForLimit, workingHoursCheck, type Job, type Shift } from '@headroom/core';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { dateText, id, localToday, money, preciseMoney } from '../../lib/format';
import { monthlyAmountForLimit } from '../../lib/limitText';
import type { AppState } from '../../lib/storage';
import { demoJobPartners, demoListings, jobPartnerFor } from '../../mock/data';

export function JobBoardPage({
  language,
  data,
}: {
  language: Language;
  data: AppState;
}) {
  type Listing = { id: string; title: string; city: string; date: string; hours: number; hourlyWage: number; demo?: boolean };
  const [showPost, setShowPost] = useState(false);
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('Frankfurt');
  const [date, setDate] = useState(localToday());
  const [hours, setHours] = useState('4');
  const [wage, setWage] = useState(String(limitValue('minimumWage')));
  const [posted, setPosted] = useState<Listing[]>([]);
  const [serverListings, setServerListings] = useState<Listing[] | null>(null);
  const [serverError, setServerError] = useState(false);
  useEffect(() => {
    if (data.profile.age < consentAgeRule.minimumAge) return;
    let cancelled = false;
    void fetch('/api/listings')
      .then(async (response) => {
        if (!response.ok) throw new Error('Listings are unavailable');
        const payload = await response.json() as { listings?: Listing[] };
        if (!Array.isArray(payload.listings)) throw new Error('Listings response is invalid');
        if (!cancelled) setServerListings(payload.listings);
      })
      .catch(() => {
        if (!cancelled) setServerError(true);
      });
    return () => { cancelled = true; };
  }, [data.profile.age]);
  const today = localToday();
  const [partnerFilter, setPartnerFilter] = useState('');
  const allListings: Listing[] = [...posted, ...(serverListings ?? demoListings)];
  const listings = partnerFilter ? allListings.filter((listing) => jobPartnerFor(listing)?.id === partnerFilter) : allListings;
  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'demoKicker')} title={t(language, 'jobBoardTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <p className="page-intro">{t(language, 'jobBoardIntro')}</p>
      {serverError && <p className="field-hint">{t(language, 'jobBoardLocalFallback')}</p>}
      <section className="surface job-partners">
        <div className="partner-panel-head">
          <div><p className="eyebrow">{t(language, 'jobPartnersKicker')}</p><h2>{t(language, 'jobPartnersTitle')}</h2></div>
          <span className="badge-demo">{t(language, 'demoBadge')}</span>
        </div>
        <p className="field-hint">{t(language, 'jobPartnersIntro')}</p>
        <div className="partner-chips" role="group" aria-label={t(language, 'jobPartnersTitle')}>
          <button type="button" className={partnerFilter === '' ? 'chip is-selected' : 'chip'} aria-pressed={partnerFilter === ''} onClick={() => setPartnerFilter('')}>
            {t(language, 'jobPartnersAll')}
          </button>
          {demoJobPartners.map((partner) => (
            <button
              type="button"
              key={partner.id}
              className={partnerFilter === partner.id ? 'chip is-selected' : 'chip'}
              aria-pressed={partnerFilter === partner.id}
              onClick={() => setPartnerFilter(partner.id)}
            >
              <strong>{partner.name}</strong> <small>{language === 'de' ? partner.focus : partner.focus_en}</small>
            </button>
          ))}
        </div>
      </section>
      {data.profile.age < consentAgeRule.minimumAge ? (
        <p className="notice notice-amber">{t(language, 'optInsBlocked')}</p>
      ) : (
        <button className="button button-primary" type="button" onClick={() => setShowPost((current) => !current)}>{t(language, 'postShift')} <span aria-hidden="true">+</span></button>
      )}
      {showPost && data.profile.age >= consentAgeRule.minimumAge && (
        <form className="surface form-surface form-grid" onSubmit={(event) => {
          event.preventDefault();
          const listing = { title: title.trim(), city: city.trim(), date, hours: Number(hours), hourlyWage: Number(wage) };
          if (!listing.title || !listing.city || !listing.date || listing.hours <= 0 || listing.hourlyWage < 0) return;
          void fetch('/api/listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(listing),
          }).then(async (response) => {
            if (!response.ok) throw new Error('Could not save listing');
            const saved = await response.json() as Listing;
            setServerListings((items) => [saved, ...(items ?? [])]);
          }).catch(() => {
            setPosted((items) => [{ ...listing, id: id(), demo: true }, ...items]);
            setServerError(true);
          });
          setTitle('');
          setShowPost(false);
        }}>
          <label className="field"><span>{t(language, 'listingTitle')}</span><input value={title} onChange={(event) => setTitle(event.target.value)} required /></label>
          <label className="field"><span>{t(language, 'listingCity')}</span><input value={city} onChange={(event) => setCity(event.target.value)} required /></label>
          <label className="field"><span>{t(language, 'shiftDate')}</span><input type="date" min={today} value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <div className="form-grid two-columns">
            <label className="field"><span>{t(language, 'listingHours')}</span><input type="number" min="1" step=".5" value={hours} onChange={(event) => setHours(event.target.value)} /></label>
            <label className="field"><span>{t(language, 'listingWage')}</span><input type="number" min="0" step=".1" value={wage} onChange={(event) => setWage(event.target.value)} /></label>
          </div>
          <button className="button button-dark" type="submit">{t(language, 'postShift')}</button>
        </form>
      )}
      <div className="stack-list">
        {listings.slice(0, 40).map((listing) => {
          const earnings = listing.hourlyWage * listing.hours;
          const listingYear = Number(listing.date.slice(0, 4));
          const listingMonth = listing.date.slice(0, 7);
          const activeProfileLimits = activeLimits(data.profile, listingYear);
          const monthLimitRecord = limitsForYear(listingYear).find((limit) => limit.id === 'miniJobMonthly');
          const yearLimitRecord = limitsForYear(listingYear).find((limit) => limit.id === 'miniJobYearly');
          const applicableMonthlyLimits = activeProfileLimits
            .filter((limit) => limit.period === 'month' && limit.verified)
            .map((limit) => monthlyAmountForLimit(limit, data.profile, data.jobs, data.shifts, listingMonth, listingYear))
            .filter((value): value is { total: number; cap: number } => value !== null);
          const headroom = applicableMonthlyLimits.length
            ? Math.max(0, Math.min(...applicableMonthlyLimits.map((limit) => limit.cap - limit.total)))
            : Math.max(0, limitValue('miniJobMonthly', listingYear) - monthlyIncomeForLimit(data.shifts, data.jobs, 'miniJobMonthly', listingMonth));
          const listingJob: Job = { id: 'listing-' + listing.id, title: listing.title, type: 'mini-job', wage: listing.hourlyWage, startDate: listing.date };
          const listingShift: Shift = { jobId: listingJob.id, date: listing.date, hours: listing.hours, planned: true };
          const currentMonthNumber = listingYear === Number(today.slice(0, 4)) ? Number(today.slice(5, 7)) : 1;
          const annualMini = annualMiniProjection([...data.shifts, listingShift], [...data.jobs, listingJob], listingYear, currentMonthNumber);
          const annualExceeded = Boolean(yearLimitRecord?.verified && yearLimitRecord.value !== null && annualMini > yearLimitRecord.value);
          const secondMiniJob = activeProfileLimits.some((limit) => limit.id === 'miniJobAlongsideMainJob') &&
            data.jobs.some((job) => job.type === 'mini-job' && job.startDate <= listing.date && (!job.endDate || job.endDate >= listing.date));
          const hasLectureDates = (data.profile.semesterPeriods ?? []).some((period) => period.start && period.end);
          const workingStudentNeedsDates = data.profile.status === 'Working student' && !hasLectureDates;
          const workingStudentOverHours = data.profile.status === 'Working student' && hasLectureDates &&
            isInLecturePeriod(listing.date, data.profile) &&
            workingHoursCheck(hoursInWeek(data.shifts, listing.date) + listing.hours, true).over;
          const monthlyExceeded = Boolean(monthLimitRecord?.verified) && earnings > headroom;
          const unknownCoreLimit = !monthLimitRecord?.verified || !yearLimitRecord?.verified;
          const unverifiedProfileLimit = activeProfileLimits.some((limit) =>
            !limit.verified && ['familyInsurance', 'bafoegSideIncome'].includes(limit.id),
          );
          const tooLong = monthlyExceeded || annualExceeded || secondMiniJob || workingStudentOverHours;
          const needsReview = !tooLong && (unknownCoreLimit || unverifiedProfileLimit || workingStudentNeedsDates);
          const reviewReason = unverifiedProfileLimit
            ? 'jobBoardUnverifiedLimit'
            : workingStudentNeedsDates
              ? 'jobBoardNeedSemesterDates'
              : 'jobBoardUnknownLimit';
          const fits = !tooLong && !needsReview;
          return (
            <article className="surface listing-card" key={listing.id}>
              <div className="metric-topline">
                <div><p className="eyebrow">{listing.city}</p><h2>{listing.title}</h2></div>
                <span className={fits ? 'fit-badge' : needsReview ? 'review-badge' : 'over-badge'}>{fits ? t(language, 'fits') : needsReview ? t(language, 'needsReview') : t(language, 'tooLong')}</span>
              </div>
              <div className="listing-detail-row">
                <span>{dateText(listing.date, language)}</span>
                <span>{listing.hours} {t(language, 'hourShort')}</span>
                <span>{preciseMoney(listing.hourlyWage, language)} / {t(language, 'hourShort')}</span>
                <strong>{money(earnings, language)}</strong>
              </div>
              {!fits && <p className="field-hint">{t(language, needsReview ? reviewReason : secondMiniJob ? 'jobBoardSecondMiniJob' : annualExceeded ? 'jobBoardAnnualCap' : workingStudentOverHours ? 'jobBoardWeeklyHours' : 'jobBoardExceedsHeadroom')}</p>}
              <span className="listing-tags">
                <span className="pill-subtle">{t(language, 'typeMini')}</span>
                {jobPartnerFor(listing) && (
                  <span className="pill-subtle pill-partner">{t(language, 'jobPartnerVia', { name: jobPartnerFor(listing)!.name })} · {t(language, 'partnerBadge')}</span>
                )}
              </span>
              <p className="privacy-note">{t(language, 'applicationPrivacy')}</p>
              <a className="button button-quiet" href={'mailto:?subject=' + encodeURIComponent(t(language, 'applicationSubject', { title: listing.title }))}>{t(language, 'contact')} ↗</a>
              <span className="sr-only">{t(language, 'demoBadge')}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
