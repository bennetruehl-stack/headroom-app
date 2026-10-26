import { useState } from 'react';
import { PageHeading } from '../../components/PageHeading';
import { t, type Language } from '../../i18n/translations';
import { makeTextPdf } from '../../lib/pdf';
import type { AppState } from '../../lib/storage';

export function PremiumPage({
  data,
  language,
  onUpdate,
}: {
  data: AppState;
  language: Language;
  onUpdate: (values: Partial<AppState>) => void;
}) {
  const [pdfReady, setPdfReady] = useState(false);
  const createReport = () => {
    const year = new Date().getFullYear();
    const lines = [
      t(language, 'reportTitle') + ' ' + year,
      '',
      t(language, 'reportNotice'),
      '',
      ...data.jobs.map((job) => {
        const amount = data.shifts
          .filter((shift) => shift.jobId === job.id && shift.date.startsWith(String(year)))
          .reduce((sum, shift) => sum + shift.hours * job.wage, 0);
        return job.title + ': ' + amount.toFixed(2) + ' EUR';
      }),
    ];
    const content = lines.join('\n');
    const pdf = makeTextPdf(content);
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'headroom-jahresbericht-' + year + '.pdf';
    link.click();
    URL.revokeObjectURL(url);
    setPdfReady(true);
  };

  return (
    <section className="page-enter">
      <PageHeading kicker={t(language, 'premiumKicker')} title={t(language, 'premiumTitle')} trailing={<span className="badge-demo">{t(language, 'demoBadge')}</span>} />
      <section className="surface settings-card">
        <p>{t(language, 'premiumDescription')}</p>
        {data.isPremium ? (
          <p className="notice notice-lime">{t(language, 'premiumActive')}</p>
        ) : (
          <button className="button button-primary" type="button" onClick={() => onUpdate({ isPremium: true })}>{t(language, 'activatePremium')}</button>
        )}
        {data.isPremium && (
          <button className="button button-dark" type="button" onClick={createReport}>{t(language, 'pdfReport')}</button>
        )}
        {pdfReady && <p role="status" className="field-hint">{t(language, 'pdfCreated')}</p>}
      </section>
      {data.isPremium && (
        <section className="surface settings-card">
          <h2>{t(language, 'multiYearHistory')}</h2>
          {Array.from(new Set(data.shifts.map((shift) => shift.date.slice(0, 4)))).sort().map((year) => (
            <p className="data-row" key={year}><span>{year}</span><strong>{data.shifts.filter((shift) => shift.date.startsWith(year)).length} {t(language, 'shiftCount')}</strong></p>
          ))}
        </section>
      )}
    </section>
  );
}
