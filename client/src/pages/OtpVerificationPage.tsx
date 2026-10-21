import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowRight, Loader2, AlertCircle, CheckCircle2, RotateCw, ArrowLeft, Pencil } from 'lucide-react';
import { authService } from '../services/auth.service';
import { useAuth } from '../context/AuthContext';

export const OtpVerificationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const otpParam = searchParams.get('otp') || '';

  const [email, setEmail] = useState<string>(emailParam);
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);
  const [isVerified, setIsVerified] = useState(false);

  // Email Typo Correction States
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(emailParam);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
      setEditedEmail(emailParam);
    }
  }, [emailParam]);


  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Mask email for display: pla***@esports.com
  const maskEmail = (raw: string): string => {
    if (!raw) return 'your email';
    const [user, domain] = raw.split('@');
    if (!domain) return raw;
    if (user.length <= 3) {
      return `${user.charAt(0)}***@${domain}`;
    }
    return `${user.slice(0, 3)}***@${domain}`;
  };

  // 60-Second Cooldown Countdown Timer
  useEffect(() => {
    if (countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  // Handle URL pre-filled OTP
  useEffect(() => {
    if (otpParam && otpParam.length === 6 && /^\d{6}$/.test(otpParam)) {
      setDigits(otpParam.split(''));
    }
  }, [otpParam]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const otpCode = digits.join('');
  const isComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Single digit entry
    const char = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setErrorMessage(null);

    // Automatically advance to the next digit input box
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }
    setDigits(nextDigits);
    setErrorMessage(null);

    const focusIndex = Math.min(pasteData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!isComplete || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authService.verifyOtp(email, otpCode);
      setIsVerified(true);
      login(res.data.token, res.data.user);

      setTimeout(() => {
        if (res.data.user.role === 'ADMIN') navigate('/admin');
        else if (res.data.user.role === 'ORGANIZER') navigate('/organizer');
        else if (res.data.user.role === 'REFEREE') navigate('/referee/portal');
        else navigate('/player');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Invalid or expired 6-digit code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const res = await authService.resendOtp(email);
      setSuccessToast(res.message || 'A fresh verification code has been dispatched.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdateEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanNewEmail = editedEmail.trim().toLowerCase();
    if (!cleanNewEmail || cleanNewEmail === email.trim().toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    setIsUpdatingEmail(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const res = await authService.updateUnverifiedEmail(email, cleanNewEmail);
      setEmail(res.newEmail);
      setSearchParams({ email: res.newEmail });
      setIsEditingEmail(false);
      setSuccessToast(res.message || 'Email updated successfully. Fresh code dispatched.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to update email address.');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative text-center">
          {/* Header Icon */}
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-5 shadow-glow-cyan text-cyan-400">
            <ShieldCheck className="w-8 h-8 animate-pulse" />
          </div>

          <h2 className="text-2xl font-heading font-bold text-white tracking-wide mb-1.5">
            Verify Your LeagueForge Account
          </h2>

          {/* Masked Email & Inline Edit Trigger */}
          <div className="mb-6 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">
              We've dispatched a 6-digit confirmation code to:
            </p>

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-cyan-400 font-mono font-medium px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 inline-block text-xs">
                {maskEmail(email)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEditedEmail(email);
                  setIsEditingEmail((prev) => !prev);
                  setErrorMessage(null);
                }}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/30 transition-all cursor-pointer"
                title="Fix Email Typo"
              >
                <Pencil className="w-3 h-3" />
                <span>{isEditingEmail ? 'Cancel' : 'Edit Email'}</span>
              </button>
            </div>

            {/* Inline Email Typo Correction Form */}
            {isEditingEmail && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 text-left space-y-3 animate-fade-in shadow-glow-cyan">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-white flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-cyan-400" />
                    Correct Your Email Address
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(false)}
                    className="text-slate-500 hover:text-slate-300 text-xs font-mono"
                  >
                    Cancel
                  </button>
                </div>
                <div>
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    placeholder="correct.player@esports.com"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUpdateEmail}
                  disabled={isUpdatingEmail || !editedEmail || editedEmail.trim().toLowerCase() === email.trim().toLowerCase()}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black text-xs font-heading font-bold tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                      <span>Updating & Resending...</span>
                    </>
                  ) : (
                    <>
                      <span>Update & Resend Code</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            <span className="block text-[11px] text-slate-500">
              Enter the 6 digits below to activate your competitive status.
            </span>
          </div>


          {/* Email input if missing from query params */}
          {!emailParam && (
            <div className="mb-5 text-left">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Your Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@esports.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          )}

          {/* Success Toast Notification */}
          {successToast && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center space-x-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Verified State Feedback */}
          {isVerified ? (
            <div className="py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white">Identity Confirmed!</h3>
              <p className="text-xs text-slate-400 font-mono">
                Redirecting you to your competitive dashboard...
              </p>
            </div>
          ) : (
            <form onSubmit={handleVerify} className="space-y-6">
              {/* 6 Segmented PIN Digit Boxes */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoComplete="one-time-code"
                    className={`w-11 h-14 sm:w-13 sm:h-16 text-center text-2xl font-mono font-bold rounded-2xl bg-slate-900 border transition-all outline-none ${
                      digit
                        ? 'border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)] bg-cyan-950/20'
                        : 'border-slate-800 text-white focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70'
                    }`}
                  />
                ))}
              </div>

              {/* Verify CTA */}
              <button
                type="submit"
                disabled={!isComplete || isLoading}
                className={`w-full py-3.5 rounded-xl font-heading font-bold text-sm tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  isComplete && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan cursor-pointer'
                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Proceed</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Resend OTP Button with 60-Second Countdown */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            {countdown > 0 ? (
              <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 font-mono">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500/50" />
                <span>
                  Resend Code in{' '}
                  <strong className="text-cyan-400">
                    00:{countdown < 10 ? `0${countdown}` : countdown}
                  </strong>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending}
                className="inline-flex items-center space-x-2 text-xs font-heading font-medium text-cyan-400 hover:text-cyan-300 transition-colors py-1 px-3 rounded-lg hover:bg-cyan-500/10 cursor-pointer"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Dispatching fresh OTP...' : "Didn't receive code? Resend OTP"}</span>
              </button>
            )}
          </div>

          {/* Return Links */}
          <div className="mt-5 flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-800/50">
            <Link
              to="/login"
              className="inline-flex items-center space-x-1.5 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>

            <div className="flex items-center space-x-1 font-mono text-[11px]">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Valid for 10 mins</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
