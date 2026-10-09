import React from 'react';
import type { User } from '../firebase';

interface HeaderProps {
  user: User | null;
  authLoading: boolean;
  isSyncing: boolean;
  localServerAvailable: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncAllLocal: () => void;
  onOpenDockerModal: () => void;
  onExportBackup: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  authLoading,
  isSyncing,
  localServerAvailable,
  onSignIn,
  onSignOut,
  onSyncAllLocal,
  onOpenDockerModal,
  onExportBackup,
}) => {
  return (
    <header className="space-y-4 mb-4">
      {/* Storage & Network Status Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-2.5 sm:px-4 rounded-xl backdrop-blur-md text-xs shadow-lg">
        {/* Left Side: Active Storage Engine Indicator */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <span>☁️ Remote Cloud Firestore Connected</span>
              </span>
              {isSyncing && (
                <span className="text-cyan-400 font-mono text-[11px] animate-pulse">
                  (Syncing...)
                </span>
              )}
            </div>
          ) : localServerAvailable ? (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <div className="flex items-center gap-1.5 text-cyan-300 font-medium">
                <span className="font-semibold text-cyan-400">🐳 Local Docker Storage Connected</span>
                <span className="hidden md:inline text-slate-500">•</span>
                <span className="hidden md:inline text-slate-400 text-[11px]">
                  Auto-saving to host disk (<code className="text-cyan-200">data/print-tracker-db.json</code>)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span className="font-medium text-amber-300">💾 Browser Storage Mode</span>
              <span className="hidden md:inline text-slate-500">•</span>
              <span className="hidden md:inline text-slate-400">Data cached locally in browser</span>
            </div>
          )}
        </div>

        {/* Right Side: Docker Setup, Backup & Auth Controls */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {/* Docker & Local Host Modal Trigger */}
          <button
            type="button"
            onClick={onOpenDockerModal}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition flex items-center gap-1.5 font-medium text-[11px]"
            title="View instructions to run on Docker or local network without cloud involvement"
          >
            <span>🐳</span>
            <span>Docker & Local Setup</span>
          </button>

          {/* Quick Export Backup */}
          <button
            type="button"
            onClick={onExportBackup}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 text-[11px]"
            title="Download full JSON backup of all quotes, catalog parts, filaments, and settings"
          >
            <span>📥</span>
            <span className="hidden sm:inline">Backup</span>
          </button>

          {/* Cloud Auth / Profile Area */}
          {authLoading ? (
            <span className="text-slate-400 animate-pulse text-[11px]">Connecting...</span>
          ) : user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSyncAllLocal}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 font-medium text-[11px]"
                title="Upload all local quotes and catalog parts to your cloud Firestore database"
              >
                <span>⬆️ Push to Cloud</span>
              </button>

              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-2 py-1 rounded-lg">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-white text-[9px] font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-slate-200 font-medium max-w-[100px] truncate hidden sm:inline text-[11px]">
                  {user.displayName || user.email}
                </span>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-300 px-2 py-1 rounded-lg border border-slate-700 transition text-[11px]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition text-[11px]"
              title="Optional: Sign in if using Google Cloud on an authorized public domain"
            >
              <svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Cloud Sync (Google)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Branding */}
      <div className="flex flex-col items-center justify-center text-center pt-1">
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-1">
          <img
            src="/favicon.svg"
            alt="3D Print Cost & Quote Tracker Icon"
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl shadow-lg shadow-cyan-500/10 border border-cyan-500/30 hover:scale-105 transition-transform"
          />
          <h1 className="text-3xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 text-center sm:text-left">
            3D Print Cost & Quote Tracker
          </h1>
        </div>
        <p className="mt-1 text-sm sm:text-lg text-slate-400">
          Calculate fabrication costs and manage your additive manufacturing quotes with precision.
        </p>
      </div>
    </header>
  );
};

export default Header;
