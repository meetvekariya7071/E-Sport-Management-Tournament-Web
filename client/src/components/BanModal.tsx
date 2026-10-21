import React, { useState } from 'react';
import { Ban, AlertTriangle, X } from 'lucide-react';
import { adminService } from '../services/admin.service';

interface BanModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export const BanModal: React.FC<BanModalProps> = ({
  isOpen,
  onClose,
  userId,
  username,
  onSuccess
}) => {
  const [violation, setViolation] = useState('Cheating');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('Permanent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const fullReason = `[${violation}] (${duration}): ${reason || 'Administrative penalty applied.'}`;
      await adminService.toggleUserBan(userId, true, fullReason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to ban user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 gaming-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-2.5 text-red-400">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">BAN USER</h3>
              <p className="text-xs text-slate-400">Target Account: <span className="text-red-400 font-semibold">{username}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Violation
            </label>
            <select
              value={violation}
              onChange={(e) => setViolation(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="Cheating">Cheating / Third-Party Tools</option>
              <option value="Toxic Behavior">Toxic Behavior / Harassment</option>
              <option value="Account Sharing">Account Sharing / Smurfing</option>
              <option value="Match Fixing">Match Fixing / Griefing</option>
              <option value="Other">Other Platform Violation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason for Ban
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the specifics of the violation here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 placeholder-slate-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Ban Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
            >
              <option value="24 Hours">24 Hours</option>
              <option value="7 Days">7 Days</option>
              <option value="30 Days">30 Days</option>
              <option value="Permanent">Permanent</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-glow-red transition-all flex items-center space-x-2"
            >
              <Ban className="w-4 h-4" />
              <span>{isSubmitting ? 'Applying Ban...' : 'Confirm Ban'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
