import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Gamepad2, AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Global UI Error Boundary]', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
          {/* Ambient Cyber Neon Background Gradients */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-lg w-full bg-slate-900/90 border border-red-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 text-center space-y-6">
            {/* Glitch Icon Container */}
            <div className="relative inline-block mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center shadow-lg shadow-red-500/20 mx-auto">
                <ShieldAlert className="w-10 h-10 text-red-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 rounded-md bg-slate-800 border border-slate-700">
                <Gamepad2 className="w-4 h-4 text-cyan-400" />
              </div>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono tracking-widest text-red-400 uppercase font-bold px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                SYSTEM ANOMALY ENCOUNTERED
              </span>
              <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-white tracking-wide">
                CLIENT CRITICAL FAULT
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                An unexpected render exception was trapped by the client application error boundary. Application state has been shielded.
              </p>
            </div>

            {/* Error Message Snippet */}
            {this.state.error && (
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-left overflow-x-auto text-[11px] font-mono text-red-400/90 max-h-32">
                <p className="font-bold text-slate-300">Exception Message:</p>
                <p className="mt-1">{this.state.error.message || String(this.state.error)}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-heading font-semibold text-xs border border-slate-700 flex items-center justify-center space-x-2 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-cyan-400" />
                <span>Reload Application</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs shadow-glow-cyan flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
              >
                <Home className="w-4 h-4" />
                <span>Return to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
