import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Check, X, ArrowRight, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { authService } from '../services/auth.service';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || searchParams.get('otp') || '';

  const [codeOrToken, setCodeOrToken] = useState(urlToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasNumber && hasSpecialChar && passwordsMatch && codeOrToken.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeOrToken.trim()) {
      setErrorMessage('Verification code (OTP) is required. Please check your email.');
      return;
    }
    if (!isFormValid) {
      setErrorMessage('Please ensure your password satisfies all security requirements.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword({
        otp: codeOrToken.trim(),
        token: codeOrToken.trim(),
        newPassword
      });
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error ||
          err.message ||
          'Failed to reset password. The code may be expired or invalid.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative">
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto shadow-glow-cyan text-cyan-400">
              <KeyRound className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white tracking-wide">
              Create New Password
            </h2>
            <p className="text-xs text-slate-400">
              Choose a strong, unique password to safeguard your LeagueForge tournament profile.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-heading font-bold text-white mb-2">Password Updated!</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Your credentials have been securely reset. You can now log into LeagueForge with your new password.
                </p>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-cyan-400 font-mono">
                  ✓ Token invalidated & session updated
                </div>
              </div>

              <Link
                to="/login"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2"
              >
                <span>Proceed to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  6-Digit Verification Code (OTP)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={codeOrToken}
                    onChange={(e) => setCodeOrToken(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              {/* Security Requirements Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block uppercase tracking-wider">
                  Password Strength Requirements
                </span>
                <div className="grid grid-cols-1 gap-1.5 text-xs">
                  <div className={`flex items-center space-x-2 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasMinLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Minimum 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>At least 1 numeric character (0-9)</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${hasSpecialChar ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {hasSpecialChar ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>At least 1 special character (!@#$%...)</span>
                  </div>
                  <div className={`flex items-center space-x-2 ${passwordsMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer note */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-center space-x-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-cyan-400/70" />
            <span>End-to-end encrypted password verification</span>
          </div>
        </div>
      </div>
    </div>
  );
};
