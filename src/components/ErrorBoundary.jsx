import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// Catches a render error so one broken component does not blank the whole
// app. React unmounts the entire tree on an uncaught error, which on a
// single-page app means a white screen and no way back — the person cannot
// even reach another page, because the router went with it.
//
// A class component because that is the only thing React lets catch errors.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept in the console rather than sent anywhere: there is no error
    // reporting service wired up, and inventing one silently would be worse.
    console.error('[ui] a component failed to render', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="panel max-w-md text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-gold-bg text-brand-gold-ink">
            <AlertTriangle size={22} />
          </div>
          <h1 className="title mt-4 text-xl">This part of the page stopped working</h1>
          <p className="helper">Nothing you did caused it and nothing was lost. Reload to carry on; if it keeps happening, tell us what you were doing and we will fix it.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="primary"><RefreshCw size={16} />Reload</button>
            <a href="/" className="secondary"><Home size={16} />Go home</a>
          </div>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-xl bg-brand-tint p-3 text-left text-xs text-brand-body">{String(this.state.error?.stack || this.state.error)}</pre>
          )}
        </div>
      </div>
    );
  }
}
