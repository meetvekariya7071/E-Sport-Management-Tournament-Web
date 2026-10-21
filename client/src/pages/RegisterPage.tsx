import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { Role } from '../types';
import { Gamepad2, User, Trophy, Shield, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [role, setRole] = useState<Role>('PLAYER');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.register({
        email,
        username,
        password,
        role,
        bio: bio || undefined
      });

      navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="gaming-card rounded-3xl p-8 border border-slate-800 bg-gaming-card/95 shadow-2xl relative">
          <div className="text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto shadow-glow-cyan">
              <Gamepad2 className="w-7 h-7 text-black" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-white tracking-wide">
              {role === 'PLAYER' ? 'Create Player Account' : 'Create Organizer Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {role === 'PLAYER'
                ? 'Join the community and start competing in LeagueForge tournaments.'
                : 'Manage tournaments, teams, and keep the game fair on LeagueForge.'}
            </p>
          </div>

          {/* Role Selector Pill */}
          <div className="mb-6">
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider text-center">
              Choose Account Type
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={() => setRole('PLAYER')}
                className={`py-2 px-3 rounded-lg text-xs font-heading font-bold transition-all flex items-center justify-center space-x-2 ${
                  role === 'PLAYER'
                    ? 'bg-cyan-500 text-black shadow-glow-cyan'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Player</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('ORGANIZER')}
                className={`py-2 px-3 rounded-lg text-xs font-heading font-bold transition-all flex items-center justify-center space-x-2 ${
                  role === 'ORGANIZER'
                    ? 'bg-blue-600 text-white shadow-glow-blue'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Organizer</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="GamerTag99"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@esports.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Bio / In-Game Profile Details
              </label>
              <textarea
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Competitive Valorant / PUBG player or Tournament Host"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-sm tracking-wider shadow-glow-cyan transition-all flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Creating Account...' : 'Register'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-cyan-400 hover:underline font-medium">
                Log In
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
