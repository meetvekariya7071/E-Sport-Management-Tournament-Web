import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, ShieldCheck, Mail } from 'lucide-react';
import { authService } from '../services/auth.service';

export const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState<string>(
    token ? 'Verifying your email token...' : 'No verification token provided in URL.'
  );

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    const verify = async () => {
      try {
        const res = await authService.verifyEmail(token);
        if (isMounted) {
          setStatus('success');
          setMessage(res.message || 'Your email address has been successfully verified!');
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setMessage(
            err.response?.data?.error ||
              err.message ||
              'This verification link is invalid, expired, or has already been used.'
          );
        }
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative text-center">
          {status === 'loading' && (
            <div className="py-8 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <h2 className="text-xl font-heading font-bold text-white tracking-wide">
                Verifying Account
              </h2>
              <p className="text-xs text-slate-400">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-white tracking-wide mb-2">
                  Account Verified!
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                  {message}
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono">
                  ✓ Full access unlocked to tournaments, matches & rankings
                </div>
              </div>

              <Link
                to="/login?verified=true"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2"
              >
                <span>Proceed to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400 shadow-glow-red">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-2xl font-heading font-bold text-white tracking-wide mb-2">
                  Verification Failed
                </h2>
                <p className="text-sm text-red-300 leading-relaxed mb-4">
                  {message}
                </p>
                <p className="text-xs text-slate-400">
                  Verification links are single-use and expire within 24 hours. You can request a fresh verification link below.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  to="/verify-notice"
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-white font-heading font-medium text-xs tracking-wider transition-all flex items-center justify-center space-x-2"
                >
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>Request New Verification Email</span>
                </Link>

                <Link
                  to="/login"
                  className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-mono transition-colors block text-center"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          )}

          {/* Footer badge */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-cyan-400/70" />
            <span>LeagueForge Identity & Fair-Play Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
};
