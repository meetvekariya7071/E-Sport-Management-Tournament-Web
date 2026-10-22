import React, { useState, useEffect } from 'react';
import { AlertTriangle, Lock, Trash2, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { userService } from '../services/user.service';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmWord('');
      setShowPassword(false);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDeleteConfirmed = confirmWord.trim() === 'DELETE';
  const canSubmit = isDeleteConfirmed && password.trim().length > 0 && !isLoading;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your current password to confirm account deletion.');
      return;
    }
    if (!isDeleteConfirmed) {
      setErrorMessage('Please type DELETE to confirm your intention.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await userService.deleteAccount(password);
      logout();
      onClose();
      navigate('/?deleted=true', { replace: true });
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to delete account. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md bg-slate-950 border border-red-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(239,68,68,0.25)] relative overflow-hidden text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        {/* Glow backdrop accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 id="delete-account-title" className="text-xl font-heading font-bold text-white tracking-wide">
              Delete Account & Data
            </h3>
            <p className="text-xs text-red-400 font-mono uppercase tracking-wider">
              Irreversible Action
            </p>
          </div>
        </div>

        {/* Warning callout */}
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-xs text-red-200/90 space-y-2">
          <div className="flex items-center space-x-2 text-red-300 font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>Warning: This cannot be undone</span>
          </div>
          <p className="leading-relaxed text-red-200/80">
            Once confirmed, your account, player registrations, team links, and profile records will be permanently removed or anonymized. Ongoing tournament integrity is strictly preserved.
          </p>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start space-x-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-4">
          {/* Current Password Field */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Current Password <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your current password"
                required
                disabled={isLoading}
                className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Type DELETE confirmation */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Type <span className="text-red-400 font-bold">DELETE</span> to confirm intent <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              placeholder="DELETE"
              required
              disabled={isLoading}
              className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none font-mono uppercase tracking-wider transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center space-x-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Confirm Permanent Deletion</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
