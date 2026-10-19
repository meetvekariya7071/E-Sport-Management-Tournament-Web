import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tournamentService, OrganizerStats } from '../api/tournament.service';
import { TournamentCreatorModal } from '../components/TournamentCreatorModal';
import { Tournament } from '../types';
import {
  Trophy,
  PlusCircle,
  Calendar,
  Users,
  Gamepad2,
  Trash2,
  Edit2,
  Database,
  Swords,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const OrganizerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<OrganizerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatorModal, setShowCreatorModal] = useState(false);

  // Quick Edit State
  const [editTarget, setEditTarget] = useState<Tournament | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrize, setEditPrize] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tourneys, statsData] = await Promise.all([
        tournamentService.getOrganizerTournaments(),
        tournamentService.getOrganizerStats()
      ]);
      setTournaments(tourneys);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load organizer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete tournament "${title}"?`)) return;
    try {
      await tournamentService.deleteOrganizerTournament(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete tournament');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      setIsUpdating(true);
      await tournamentService.updateTournament(editTarget.id, {
        title: editTitle,
        prizePool: editPrize,
        status: editStatus
      });
      setEditTarget(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update tournament');
    } finally {
      setIsUpdating(false);
    }
  };

  const openEditModal = (t: Tournament) => {
    setEditTarget(t);
    setEditTitle(t.title);
    setEditPrize((t as any).prizePool || '');
    setEditStatus(t.status);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Organizer Workspace
          </span>
          <h1 className="text-3xl font-heading font-extrabold text-white mt-1">
            Tournament Command & Scoped Hosting
          </h1>
          <p className="text-xs text-slate-400">
            Create brackets, inspect isolated tournament databases, and commit live match results.
          </p>
        </div>

        <button
          onClick={() => setShowCreatorModal(true)}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-black font-heading font-bold text-xs shadow-glow-cyan flex items-center space-x-2 transition-all transform hover:-translate-y-0.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Launch New Tournament</span>
        </button>
      </div>

      {/* Organizer Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gaming-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Hosted Tournaments
            </span>
            <Trophy className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {stats?.totalHosted || 0}
          </div>
          <span className="text-[10px] text-cyan-400 font-mono">Total events created</span>
        </div>

        <div className="gaming-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Tournaments
            </span>
            <Clock className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {stats?.activeTournaments || 0}
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Open / in progress</span>
        </div>

        <div className="gaming-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Enrolled Players
            </span>
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {stats?.enrolledParticipants || 0}
          </div>
          <span className="text-[10px] text-blue-400 font-mono">Across your brackets</span>
        </div>

        <div className="gaming-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Active Matches
            </span>
            <Swords className="w-5 h-5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-heading font-extrabold text-white font-mono">
            {stats?.pendingMatches || 0}
          </div>
          <span className="text-[10px] text-purple-400 font-mono">Pending score commits</span>
        </div>
      </div>

      {/* My Tournaments Table */}
      <div className="gaming-card rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-white">
              My Tournaments Database
            </h2>
            <p className="text-xs text-slate-400">
              Select any tournament to access its isolated relational database view and score matrix.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Tournament Title</th>
                <th className="py-3 px-4">Game</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Schedule</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading your tournaments...
                  </td>
                </tr>
              ) : tournaments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No tournaments created yet. Click "Launch New Tournament" to deploy one!
                  </td>
                </tr>
              ) : (
                tournaments.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <span>{t.title}</span>
                      <span className="text-[11px] text-slate-500 block font-mono">
                        slug: {t.slug}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-medium">
                      {t.game?.title || 'Game'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                        {t.format}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {t.currentCount} / {t.maxParticipants} slots
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {new Date(t.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          t.status === 'COMPLETED'
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                            : t.status === 'CANCELLED'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Link
                        to={`/organizer/tournaments/${t.id}/database`}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold inline-flex items-center space-x-1 transition-colors"
                        title="Open Dedicated Tournament Database"
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>Database</span>
                      </Link>

                      <button
                        onClick={() => openEditModal(t)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Edit Metadata"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(t.id, t.title)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30 transition-colors"
                        title="Delete Tournament"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showCreatorModal && (
        <TournamentCreatorModal
          isOpen={showCreatorModal}
          onClose={() => setShowCreatorModal(false)}
          onSuccess={loadData}
        />
      )}

      {/* Quick Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 space-y-4 gaming-card">
            <h3 className="font-heading font-bold text-lg text-white">Edit Tournament Metadata</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Prize Pool</label>
                <input
                  type="text"
                  value={editPrize}
                  onChange={(e) => setEditPrize(e.target.value)}
                  placeholder="$1,000 USD"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="REGISTRATION_OPEN">REGISTRATION_OPEN</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 text-xs font-heading font-bold bg-cyan-400 text-black rounded-lg shadow-glow-cyan"
                >
                  {isUpdating ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
