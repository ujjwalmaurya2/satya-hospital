import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-center bg-canvas">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-line shadow-sm space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-leaf-50 text-leaf-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-leaf-700" />
            </div>
            <h2 className="text-xl font-bold text-ink-900">
              {this.props.fallbackTitle || 'Something interrupted this page'}
            </h2>
            <p className="text-xs text-ink-500 leading-relaxed">
              We encountered a temporary rendering issue. All hospital records and appointments remain completely safe.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="md"
                className="w-full font-bold"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
