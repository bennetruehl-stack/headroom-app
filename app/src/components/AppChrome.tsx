import { t, type Language } from '../i18n/translations';

export function AppHeader({
  language,
  onHome,
  onLanguage,
}: {
  language: Language;
  onHome: () => void;
  onLanguage: (language: Language) => void;
}) {
  return (
    <header className="app-header">
      <button className="brand-mark" type="button" onClick={onHome} aria-label={t(language, 'brand')}>
        <span className="brand-symbol" aria-hidden="true">h<span>·</span></span>
        <span className="brand-word">{t(language, 'brand')}</span>
      </button>
      <label className="language-select">
        <span className="sr-only">{t(language, 'chooseLanguage')}</span>
        <select value={language} onChange={(event) => onLanguage(event.target.value as Language)}>
          <option value="de">{t(language, 'languageGerman')}</option>
          <option value="en">{t(language, 'languageEnglish')}</option>
        </select>
      </label>
    </header>
  );
}

export function AppFooter({ language }: { language: Language }) {
  return <footer className="app-footer">{t(language, 'infoOnly')}</footer>;
}
