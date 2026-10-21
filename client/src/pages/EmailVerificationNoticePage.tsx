import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { authService } from '../services/auth.service';

export const EmailVerificationNoticePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage('Please provide an email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await authService.resendVerification(email);
      setSuccessMessage(res.message || 'Verification link re-sent! Please check your inbox.');
      setCooldown(60);

      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to resend verification link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative text-center">
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-6 shadow-glow-cyan text-cyan-400">
            <Mail className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-2xl font-heading font-bold text-white tracking-wide mb-2">
            Verify Your Email
          </h2>
          <p className="text-sm text-slate-300 mb-6 leading-relaxed">
            We've sent a verification link to your email.{' '}
            {email ? (
              <span className="font-semibold text-cyan-400 block mt-1 font-mono text-xs bg-slate-900/80 py-1 px-3 rounded-lg border border-slate-800 inline-block">
                {email}
              </span>
            ) : null}
            <span className="block mt-2 text-xs text-slate-400">
              Please check your inbox (and spam folder) to activate your LeagueForge account.
            </span>
          </p>

          {/* Status Alerts */}
          {successMessage && (
            <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center space-x-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Email Input if not pre-filled */}
          {!initialEmail && (
            <div className="mb-4 text-left">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Your Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@example.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleResend()}
              disabled={isLoading || cooldown > 0}
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-white font-heading font-medium text-xs tracking-wider transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>
                {isLoading
                  ? 'Sending Link...'
                  : cooldown > 0
                  ? `Resend available in ${cooldown}s`
                  : 'Resend Verification Email'}
              </span>
            </button>

            <Link
              to={`/verify-otp?email=${encodeURIComponent(email)}`}
              className="w-full py-3 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-heading font-medium text-xs tracking-wider transition-all flex items-center justify-center space-x-2"
            >
              <span>Enter 6-Digit Code</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/login"
              className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-mono transition-colors block text-center"
            >
              Proceed to Login
            </Link>
          </div>


          {/* Support Note */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-cyan-400/70" />
            <span>Secure account protection powered by LeagueForge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
