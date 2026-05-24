import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('React render error', {
      error: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          height: '100dvh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(160deg, #032a1e 0%, #074b36 100%)',
          color: 'white',
          padding: '2rem',
          textAlign: 'center',
          gap: '1rem',
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ color: '#d4af37', margin: 0 }}>حدث خطأ غير متوقع</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: 400 }}>
            حدث عطل مفاجئ. تم تسجيل الخطأ تلقائياً. 
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 2rem',
              background: '#d4af37',
              color: '#032a1e',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
