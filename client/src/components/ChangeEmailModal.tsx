import React, { useState, useEffect, useRef } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, AlertCircle, CheckCircle2, RotateCw, X, ArrowLeft } from 'lucide-react';
import { userService } from '../services/user.service';
import { useAuth } from '../context/AuthContext';

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newEmail: string) => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, login } = useAuth();

  // Step: 1 = Password & New Email, 2 = 6-digit OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setNewEmail('');
      setCurrentPassword('');
      setDigits(['', '', '', '', '', '']);
      setErrorMessage(null);
      setSuccessToast(null);
    }
  }, [isOpen]);

  // 60s cooldown timer when step 2 starts
  useEffect(() => {
    if (step !== 2 || countdown <= 0) return;

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
  }, [step, countdown]);

  // Focus on first box in step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [step]);

  const otpCode = digits.join('');
  const isOtpComplete = otpCode.length === 6 && /^\d{6}$/.test(otpCode);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail || !currentPassword) {
      setErrorMessage('Please provide both your new email and current password.');
      return;
    }

    if (cleanEmail === user?.email?.toLowerCase()) {
      setErrorMessage('New email cannot be the same as your current email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await userService.requestEmailChange(cleanEmail, currentPassword);
      setSuccessToast(res.message || `Verification code sent to ${cleanEmail}`);
      setStep(2);
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to request email change.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    if (!cleanVal) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    const char = cleanVal.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = char;
    setDigits(nextDigits);
    setErrorMessage(null);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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

  const handleStep2Submit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await userService.confirmEmailChange(otpCode);
      login(res.data.token, res.data.user);
      if (onSuccess) onSuccess(res.data.user.email);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Verification code failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || isResending) return;

    setIsResending(true);
    setErrorMessage(null);
    setSuccessToast(null);

    try {
      const res = await userService.requestEmailChange(newEmail.trim().toLowerCase(), currentPassword);
      setSuccessToast(res.message || 'A fresh verification code has been dispatched.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl p-7 border border-slate-800 bg-[#0B0E14]/95 shadow-[0_0_50px_rgba(0,240,255,0.15)] text-center overflow-hidden">
        {/* Glow corner accents */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-blue-600/10 to-transparent blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-5">
          <div
            className={`w-7 h-1.5 rounded-full transition-all ${
              step === 1 ? 'bg-cyan-400 shadow-glow-cyan' : 'bg-slate-700'
            }`}
          />
          <div
            className={`w-7 h-1.5 rounded-full transition-all ${
              step === 2 ? 'bg-cyan-400 shadow-glow-cyan' : 'bg-slate-700'
            }`}
          />
        </div>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-glow-cyan">
          {step === 1 ? <Mail className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7 animate-pulse" />}
        </div>

        <h2 className="text-xl font-heading font-bold text-white tracking-wide mb-1">
          {step === 1 ? 'Update Email Address' : 'Confirm New Email'}
        </h2>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          {step === 1
            ? 'Enter your new email address and confirm your current password to receive a 6-digit security code.'
            : `Enter the 6-digit confirmation code dispatched to ${newEmail}`}
        </p>

        {/* Success Toast */}
        {successToast && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-center space-x-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Email + Password Input */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new.player@esports.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Password (Verification)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !newEmail || !currentPassword}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Verifying & Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: 6-Box Segmented PIN Input */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
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
                  className={`w-10 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-bold rounded-2xl bg-slate-900 border transition-all outline-none ${
                    digit
                      ? 'border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.25)] bg-cyan-950/20'
                      : 'border-slate-800 text-white focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/70'
                  }`}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={!isOtpComplete || isLoading}
              className={`w-full py-3 rounded-xl font-heading font-bold text-xs tracking-wider transition-all flex items-center justify-center space-x-2 ${
                isOtpComplete && !isLoading
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black shadow-glow-cyan cursor-pointer'
                  : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-slate-800'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Confirming Change...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Update Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend OTP Button with Countdown */}
            <div className="pt-2 text-center">
              {countdown > 0 ? (
                <span className="text-xs text-slate-500 font-mono flex items-center justify-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-cyan-400/60" />
                  Resend Code in <strong className="text-cyan-400">00:{countdown < 10 ? `0${countdown}` : countdown}</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending}
                  className="inline-flex items-center space-x-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Sending...' : "Didn't receive code? Resend"}</span>
                </button>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800/60">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to email entry</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
