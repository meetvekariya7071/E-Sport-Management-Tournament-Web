import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Terminal, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React application error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
          {/* Cyberpunk Grid Background Accents */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-slate-950 pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-amber-500 to-indigo-600 animate-pulse" />

          <div className="relative max-w-2xl w-full bg-slate-900/90 border border-red-500/30 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-red-950/40 text-center">
            {/* Holographic Badge */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-6 shadow-inner ring-4 ring-red-500/10 animate-bounce duration-1000">
              <ShieldAlert className="w-10 h-10" />
            </div>

            <div className="inline-block px-3 py-1 bg-red-950/80 border border-red-700/50 rounded-full text-xs font-mono uppercase tracking-widest text-red-400 mb-3">
              CRITICAL SYSTEM FAULT :: CODE 500
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-red-400 via-orange-300 to-amber-400 bg-clip-text text-transparent">
              MATCH DISRUPTED / RUNTIME EXCEPTION
            </h1>

            <p className="mt-3 text-slate-400 text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
              An unexpected anomaly occurred within the tournament command stream. The application failed safely to protect telemetry and match state.
            </p>

            {/* Error Message Details */}
            {this.state.error && (
              <div className="mt-6 text-left bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-hidden">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-2 border-b border-slate-800 pb-2">
                  <Terminal className="w-3.5 h-3.5 text-red-400" />
                  <span>EXCEPTION_TELEMETRY</span>
                </div>
                <p className="text-red-400 font-mono text-xs break-words">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-2 text-[10px] text-slate-500 font-mono overflow-x-auto max-h-32 scrollbar-thin">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Call to Actions */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 hover:border-slate-600 transition-all shadow-md hover:shadow-slate-800/50"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                Reload Arena
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50"
              >
                <Home className="w-4 h-4" />
                Return to Home
              </button>
            </div>

            <div className="mt-6 text-[11px] text-slate-600 font-mono">
              E-Sports Tournament Management Engine &bull; System Integrity Safeguard
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
