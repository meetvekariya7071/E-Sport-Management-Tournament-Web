import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Gamepad2, Lock, Mail, ArrowRight, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const isExpired = query.get('expired');
  const isVerified = query.get('verified');
  const isReset = query.get('reset');


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.login({ emailOrUsername, password });
      login(data.token, data.user);

      // Check ban status right after login
      if (data.user.isBanned) {
        navigate('/banned');
        return;
      }

      // Redirect to proper role dashboard
      if (data.user.role === 'ADMIN') navigate('/admin');
      else if (data.user.role === 'ORGANIZER') navigate('/organizer');
      else if (data.user.role === 'REFEREE') navigate('/referee/portal');
      else navigate('/player');
    } catch (err: any) {
      // Intercept unverified account status without setting auth tokens
      if (err.response?.status === 403 && (err.response?.data?.requiresVerification || err.response?.data?.email)) {
        const targetEmail = err.response.data.email || (emailOrUsername.includes('@') ? emailOrUsername : '');
        navigate(`/verify-otp?email=${encodeURIComponent(targetEmail)}&reason=unverified_login`, {
          state: {
            email: targetEmail,
            message: err.response.data.message || 'Verification code required to finish sign-in.'
          }
        });
        return;
      }
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoFill = (email: string, pass: string) => {
    setEmailOrUsername(email);
    setPassword(pass);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {isExpired && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Session expired. Please log in again.</span>
          </div>
        )}

        {isVerified && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Account email verified! You may now log in to LeagueForge.</span>
          </div>
        )}

        {isReset && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Password successfully reset! Please log in with your new credentials.</span>
          </div>
        )}

        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative overflow-hidden">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto shadow-glow-cyan">
              <Gamepad2 className="w-7 h-7 text-black" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white tracking-wide">
              Welcome Back!
            </h2>
            <p className="text-xs text-slate-400">
              Log in to your account and continue your eSports journey.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="admin@esports.com or player1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>
            </div>


            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Authenticating...' : 'Login'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Fills */}
          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <span className="text-[11px] font-mono text-slate-400 block mb-2 uppercase tracking-wider">
              Fast Demo Accounts (Pre-configured)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@esports.com', 'PASSWORD123!')}
                className="py-1.5 px-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-medium"
              >
                Super Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('organizer@esports.com', 'PASSWORD123!')}
                className="py-1.5 px-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-medium"
              >
                Organizer
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('referee@esports.com', 'PASSWORD123!')}
                className="py-1.5 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium"
              >
                Referee
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('player1@esports.com', 'PASSWORD123!')}
                className="py-1.5 px-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium"
              >
                Player 1 (Solo)
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('player2@esports.com', 'PASSWORD123!')}
                className="py-1.5 px-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-medium col-span-2 sm:col-span-1"
              >
                Player 2 (Partner)
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <span className="text-xs text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:underline font-medium">
                Register
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
