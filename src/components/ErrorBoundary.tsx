// ═══════════════════════════════════════════════════════════════
// 🚨 Error Boundary Component
// Catches React errors and reports them through the error handler
// ═══════════════════════════════════════════════════════════════

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { errorHandler } from '../core/error/ErrorHandler';
import { LogContext } from '../core/logger/UnifiedLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Report error through our error handler
    errorHandler.handleCriticalError(error, LogContext.UI, {
      context: 'React Error Boundary',
      data: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
      userMessage: 'A UI error occurred. The application may be unstable.',
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#1e1e1e] text-white p-8">
          <div className="max-w-md w-full bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-gray-300 mb-4">
              The application encountered an unexpected error. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-black/50 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;