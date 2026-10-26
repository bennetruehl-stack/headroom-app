import type { Limit } from '@headroom/core';
import { t, type Language } from '../i18n/translations';
import { dateText } from '../lib/format';
import { limitSourceName, shortSourceName } from '../lib/limitText';

export function SourceStamp({ limit, language }: { limit: Limit; language: Language }) {
  const full = limitSourceName(limit, language);
  const short = shortSourceName(limit, language);
  return (
    <small className="source-stamp">
      {t(language, 'source')}: {limit.sourceUrl
        ? <a href={limit.sourceUrl} target="_blank" rel="noreferrer" title={full}>{short}</a>
        : <span title={full}>{short}</span>}
      {' · '}{t(language, 'asOf', { date: dateText(limit.asOf, language) })}
    </small>
  );
}
