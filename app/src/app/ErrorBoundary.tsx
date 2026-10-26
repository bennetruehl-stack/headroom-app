import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t, type Language } from '../i18n/translations';

type Props = {
  language: Language;
  /** Wechselt die Ansicht, wird der Fehlerzustand zurückgesetzt. */
  resetKey: string;
  children: ReactNode;
};

type State = { failed: boolean; resetKey: string };

/** Fängt Fehler einer Ansicht ab, damit Navigation und Daten weiter erreichbar bleiben. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, resetKey: this.props.resetKey };

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { failed: false, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Headroom view failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { language } = this.props;
    return (
      <section className="error-panel" role="alert">
        <h1>{t(language, 'errorTitle')}</h1>
        <p>{t(language, 'errorHint')}</p>
        <button className="button button-primary" type="button" onClick={() => window.location.reload()}>
          {t(language, 'errorReload')}
        </button>
      </section>
    );
  }
}
