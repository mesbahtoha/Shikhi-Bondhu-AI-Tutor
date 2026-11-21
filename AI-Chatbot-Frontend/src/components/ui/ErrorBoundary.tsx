import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render errors below it so one broken page shows a recoverable
 * message instead of a blank screen. Mount it with a `key` tied to the route
 * so navigating elsewhere resets it.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" style={{ maxWidth: 520, margin: '64px auto', padding: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          This page could not be loaded. This is often caused by a slow or interrupted internet connection.
          Please reload the page and try again.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button variant="secondary" onClick={this.reset}>Try again</Button>
          <Button variant="secondary" onClick={() => { window.location.href = '/'; }}>Go home</Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
