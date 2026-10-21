import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { authService } from '../services/auth.service';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  // Step 1: Request Code (Email)
  // Step 2: Verify 6-Digit OTP
  // Step 3: Set New Password
  // Step 4: Success Screen
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Focus first OTP field when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Password validation indicators
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const otpValue = otp.join('');
  const isOtpComplete = otpValue.length === 6;

  // Handle Step 1: Send OTP to Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authService.forgotPassword(email.trim());
      setStep(2);
      setResendCooldown(60);
      setSuccessNotice(res.message || '6-digit verification code dispatched to your email.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Failed to dispatch verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Resending OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);

    try {
      const res = await authService.forgotPassword(email.trim());
      setResendCooldown(60);
      setSuccessNotice(res.message || 'A fresh 6-digit code has been sent to your email.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Failed to resend verification code. Please wait.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // OTP inputs handling
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '');
    if (!digit) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit[digit.length - 1];
    setOtp(newOtp);

    // Auto-advance to next input
    if (index < 5 && digit) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pastedData.length >= 6) {
      const digits = pastedData.slice(0, 6).split('');
      setOtp(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOtpComplete) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authService.verifyResetOtp(email.trim().toLowerCase(), otpValue);
      setStep(3);
      setSuccessNotice(res.message || 'Code verified successfully. Now create your new password.');
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Step 3: Set New Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinLength || !hasNumber || !hasSpecialChar) {
      setErrorMessage('Please ensure your password satisfies all security criteria.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authService.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otpValue,
        newPassword
      });
      setStep(4);
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error || err.message || 'Failed to update password. Please request a new verification code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 animate-fadeIn">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative">
          
          {/* Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center mx-auto shadow-glow-amber text-amber-400">
              {step === 3 ? (
                <Lock className="w-6 h-6 text-cyan-400" />
              ) : step === 4 ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <KeyRound className="w-6 h-6" />
              )}
            </div>

            <h2 className="text-2xl font-heading font-bold text-white tracking-wide">
              {step === 1 && 'Reset Password'}
              {step === 2 && 'Enter Verification Code'}
              {step === 3 && 'Create New Password'}
              {step === 4 && 'Password Reset Complete'}
            </h2>

            <p className="text-xs text-slate-400">
              {step === 1 && 'Enter your email to receive a secure 6-digit verification code.'}
              {step === 2 && 'Enter the 6-digit verification code sent to your email.'}
              {step === 3 && 'Your code is verified! Enter and confirm your new secure password.'}
              {step === 4 && 'Your credentials have been securely updated.'}
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Notice */}
          {successNotice && (step === 2 || step === 3) && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center space-x-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* STEP 1: Enter Email to Request OTP */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="player@example.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Sending Code...' : 'Send Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-4 border-t border-slate-800 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Remembered your password? Log in</span>
                </Link>
              </div>
            </form>
          )}

          {/* STEP 2: Enter 6-digit OTP ONLY */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Email Pill with Change option */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                <div className="flex items-center space-x-2 truncate">
                  <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="font-mono text-cyan-300 truncate">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setOtp(['', '', '', '', '', '']);
                    setErrorMessage(null);
                    setSuccessNotice(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-cyan-400 underline ml-2 shrink-0 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 6-Digit OTP Box */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                  6-Digit Verification Code (Valid for 10 min)
                </label>
                <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (otpInputRefs.current[index] = el)}
                      type="text"
                      maxLength={1}
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-12 h-14 text-center text-xl font-mono font-bold text-cyan-400 bg-slate-900 border border-slate-700 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                disabled={isLoading || !isOtpComplete}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Verifying Code...' : 'Verify Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isLoading}
                  className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center space-x-1 transition-colors cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Code'}
                  </span>
                </button>

                <Link
                  to="/login"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            </form>
          )}

          {/* STEP 3: Set New Password (AFTER OTP is verified) */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Verified Email Banner */}
              <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-emerald-300 truncate">{email} (Verified)</span>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Password Requirement Badges */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                <div className="flex items-center space-x-1.5">
                  {hasMinLength ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                  <span className={hasMinLength ? 'text-slate-200' : 'text-slate-500'}>At least 8 characters</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {hasNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                  <span className={hasNumber ? 'text-slate-200' : 'text-slate-500'}>Contains at least 1 number</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {hasSpecialChar ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                  <span className={hasSpecialChar ? 'text-slate-200' : 'text-slate-500'}>Contains at least 1 special symbol</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-slate-600" />}
                  <span className={passwordsMatch ? 'text-slate-200' : 'text-slate-500'}>Passwords match</span>
                </div>
              </div>

              {/* Submit Password Button */}
              <button
                type="submit"
                disabled={isLoading || !hasMinLength || !hasNumber || !hasSpecialChar || !passwordsMatch}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Saving Password...' : 'Save New Password'}</span>
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 4: Success Confirmation */}
          {step === 4 && (
            <div className="space-y-6 text-center animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-emerald">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-heading font-bold text-white mb-2">Password Reset Complete!</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Your password has been securely updated. You can now log into your LeagueForge account with your new credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2"
                >
                  <span>Proceed to Login</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
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
