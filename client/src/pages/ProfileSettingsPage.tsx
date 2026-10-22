import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ChangeEmailModal } from '../components/ChangeEmailModal';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import {
  Mail,
  ShieldCheck,
  Key,
  Shield,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  Sparkles,
  Smartphone,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfileSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [isChangeEmailOpen, setIsChangeEmailOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleEmailSuccess = (newEmail: string) => {
    setToastMessage(`Email address successfully updated to ${newEmail}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 6000);
  };

  const getRoleBadgeColor = () => {
    switch (user?.role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'ORGANIZER':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'PLAYER':
      default:
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center space-x-3 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 px-5 py-3.5 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md animate-slide-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400/70 hover:text-emerald-200 text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-wider mb-2">
          <Shield className="w-3.5 h-3.5" />
          <span>Security & Profile Management</span>
        </div>
        <h1 className="text-3xl font-heading font-bold text-white tracking-wide">
          Account Settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your LeagueForge credentials, primary verified email, and competitive profile.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 p-0.5 shadow-glow-cyan">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center font-heading font-bold text-xl text-cyan-400">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'LF'}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-heading font-bold text-white tracking-wide">
                  {user?.username}
                </h2>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-mono uppercase tracking-wider ${getRoleBadgeColor()}`}
                >
                  {user?.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                User ID: <span className="text-slate-500">{user?.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
              Account Active
            </span>
          </div>
        </div>
      </div>

      {/* Email Address Section */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                Email Address
              </h3>
              <p className="text-xs text-slate-400">
                The primary email linked to your tournament notifications and bracket access.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
              Primary Account Email
            </span>
            <div className="flex items-center space-x-3">
              <span className="text-base font-semibold text-white font-mono">
                {user?.email}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Verified ✓
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsChangeEmailOpen(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 font-heading font-semibold text-xs tracking-wider transition-all flex items-center space-x-2 cursor-pointer shadow-sm hover:shadow-glow-cyan"
          >
            <Mail className="w-4 h-4" />
            <span>Change Email</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          * Changing your email address requires password verification and entering a 6-digit one-time code dispatched to the new address.
        </p>
      </div>

      {/* Security & Authentication Credentials */}
      <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold text-white">
                Password & Security Credentials
              </h3>
              <p className="text-xs text-slate-400">
                Protect your competitive account and administrative privileges.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-medium text-sm mb-1">
                <Key className="w-4 h-4 text-purple-400" />
                <span>Account Password</span>
              </div>
              <p className="text-xs text-slate-400">
                Password is encrypted with salted bcrypt hashing.
              </p>
            </div>
            <div>
              <Link
                to="/forgot-password"
                className="inline-flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
              >
                <span>Request password reset</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center space-x-2 text-white font-medium text-sm mb-1">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Email 2-Step OTP Verification</span>
              </div>
              <p className="text-xs text-slate-400">
                6-digit numeric verification codes protect critical account updates and password resets.
              </p>
            </div>
            <div className="inline-flex items-center text-xs font-mono text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Active Protection</span>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="border border-red-500/30 bg-red-950/20 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-heading font-bold text-white tracking-wide">
                Delete Account & Data
              </h3>
            </div>
            <p className="text-xs text-red-300/80 leading-relaxed max-w-2xl">
              Once confirmed, this action cannot be undone. Your active registrations, player roster links, and profile records will be permanently removed or anonymized.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete My Account</span>
          </button>
        </div>
      </div>

      {/* Change Email Modal */}
      <ChangeEmailModal
        isOpen={isChangeEmailOpen}
        onClose={() => setIsChangeEmailOpen(false)}
        onSuccess={handleEmailSuccess}
      />

      {/* Delete Account Confirmation Modal */}
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

export default ProfileSettingsPage;
