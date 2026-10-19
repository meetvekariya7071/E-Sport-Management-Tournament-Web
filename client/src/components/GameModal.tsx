import React, { useState } from 'react';
import { adminService } from '../api/admin.service';
import { Game } from '../types';
import { X, Gamepad2, AlertCircle } from 'lucide-react';

interface GameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameToEdit?: Game | null;
  onSuccess: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
  isOpen,
  onClose,
  gameToEdit,
  onSuccess
}) => {
  const isEditing = !!gameToEdit;

  const [title, setTitle] = useState(gameToEdit?.title || '');
  const [slug, setSlug] = useState(gameToEdit?.slug || '');
  const [genre, setGenre] = useState(gameToEdit?.genre || 'Tactical FPS');
  const [platform, setPlatform] = useState((gameToEdit as any)?.platform || 'PC');
  const [coverImage, setCoverImage] = useState((gameToEdit as any)?.coverImage || '');
  const [isTeamBased, setIsTeamBased] = useState(gameToEdit?.isTeamBased || false);
  const [minTeamSize, setMinTeamSize] = useState(gameToEdit?.minTeamSize || 1);
  const [maxTeamSize, setMaxTeamSize] = useState(gameToEdit?.maxTeamSize || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        title,
        slug: slug.toLowerCase().replace(/\s+/g, '-'),
        genre,
        platform,
        coverImage: coverImage.trim() || undefined,
        isTeamBased,
        minTeamSize: isTeamBased ? Math.max(Number(minTeamSize), 2) : 1,
        maxTeamSize: isTeamBased ? Math.max(Number(maxTeamSize), Number(minTeamSize)) : 1
      };

      if (isEditing) {
        await adminService.updateGame(gameToEdit.id, payload);
      } else {
        await adminService.createGame(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-6 text-slate-100 gaming-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center space-x-3 text-cyan-400">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-white">
                {isEditing ? 'EDIT CATALOG GAME' : 'ADD NEW GAME TO CATALOG'}
              </h3>
              <p className="text-xs text-slate-400">Master esports game catalog definition</p>
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
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Game Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!isEditing && !slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }}
                placeholder="e.g. Apex Legends"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="apex-legends"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Genre / Category *
              </label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="Tactical FPS">Tactical FPS</option>
                <option value="Battle Royale">Battle Royale</option>
                <option value="MOBA">MOBA</option>
                <option value="Fighting">Fighting</option>
                <option value="Strategy">Strategy / RTS</option>
                <option value="Sports / Racing">Sports / Racing</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Target Platform *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="PC">PC</option>
                <option value="Console">Console (PlayStation / Xbox)</option>
                <option value="Mobile">Mobile (iOS / Android)</option>
                <option value="Cross-Platform">Cross-Platform</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Cover Image / Banner URL
            </label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isTeamBased"
                checked={isTeamBased}
                onChange={(e) => {
                  setIsTeamBased(e.target.checked);
                  if (!e.target.checked) {
                    setMinTeamSize(1);
                    setMaxTeamSize(1);
                  } else {
                    setMinTeamSize(2);
                    setMaxTeamSize(5);
                  }
                }}
                className="rounded bg-slate-800 border-slate-700 text-cyan-400 focus:ring-0"
              />
              <label htmlFor="isTeamBased" className="text-xs text-white font-medium cursor-pointer">
                Supports Team Formats (Duo / Squad)?
              </label>
            </div>

            {isTeamBased && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Min Team Size</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={minTeamSize}
                    onChange={(e) => setMinTeamSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Max Team Size</label>
                  <input
                    type="number"
                    min={minTeamSize}
                    max={10}
                    value={maxTeamSize}
                    onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-heading font-bold rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black shadow-glow-cyan transition-all"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Game' : 'Publish Game'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
