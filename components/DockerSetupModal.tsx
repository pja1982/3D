import React, { useState } from 'react';

interface DockerSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverStatus: {
    available: boolean;
    mode: 'docker-local' | 'browser-only';
    storagePath?: string;
  };
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DockerSetupModal: React.FC<DockerSetupModalProps> = ({
  isOpen,
  onClose,
  serverStatus,
  onExportBackup,
  onImportBackup,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const dockerComposeYaml = `services:
  print-tracker:
    build: .
    container_name: 3d-print-tracker
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DATA_DIR=/app/data
    volumes:
      # Persistent local host storage for all quotes, parts & settings:
      - ./data:/app/data`;

  const dockerRunCmd = `docker run -d \\
  --name 3d-print-tracker \\
  -p 3000:3000 \\
  -v $(pwd)/data:/app/data \\
  --restart unless-stopped \\
  3d-print-tracker`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-slate-200 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center text-xl font-bold">
              🐳
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Local Docker & LAN Storage
              </h2>
              <p className="text-xs text-slate-400">
                100% private, self-hosted on your home network — zero cloud or Google login required.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Connection Status */}
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 ${
            serverStatus.available
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}
        >
          <span className="text-2xl">{serverStatus.available ? '✅' : '💾'}</span>
          <div className="text-xs">
            <p className="font-semibold text-sm">
              {serverStatus.available
                ? 'Local Backend Storage Connected'
                : 'Browser Storage Mode (Offline)'}
            </p>
            <p className="text-slate-400 mt-0.5">
              {serverStatus.available
                ? `Quotes and parts are automatically saving to ${serverStatus.storagePath || 'data/print-tracker-db.json'} on your local machine.`
                : 'Changes are currently cached in your browser. Run with the local Docker server to persist data on your host disk.'}
            </p>
          </div>
        </div>

        {/* Why Google says Unauthorized */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 space-y-2 text-xs">
          <h3 className="font-semibold text-amber-400 flex items-center gap-1.5 text-sm">
            <span>⚠️</span> Why Google Auth fails on Local IP addresses (e.g. 192.168.x.x)
          </h3>
          <p className="text-slate-300 leading-relaxed">
            Google Firebase OAuth strictly requires a registered public domain or standard <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">localhost</code>.
            When you run on your local network (e.g., <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">http://192.168.1.50:3000</code>),
            Google blocks the sign-in redirect with an <em>Unauthorized domain</em> or <em>unreachable address</em> security error.
          </p>
          <p className="text-emerald-400 font-medium">
            💡 <strong>Good news:</strong> You do <em>not</em> need Google or the cloud at all! With local Docker storage, your host machine stores everything locally in a standard JSON file.
          </p>
        </div>

        {/* Docker Setup Guide */}
        <div className="space-y-3">
          <h3 className="font-semibold text-white text-sm flex items-center gap-2">
            <span>🚀</span> How to run on your local Docker computer
          </h3>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Option 1: Using Docker Compose (Recommended)</span>
              <button
                type="button"
                onClick={() => copyToClipboard(dockerComposeYaml, 'compose')}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
              >
                {copiedType === 'compose' ? '✓ Copied!' : '📋 Copy YAML'}
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto">
              {dockerComposeYaml}
            </pre>
            <p className="text-[11px] text-slate-400">
              Run <code className="bg-slate-800 text-slate-200 px-1 rounded">docker compose up -d</code> in the app directory. All your quotes and catalog parts will be saved inside your host machine&apos;s <code className="bg-slate-800 text-slate-200 px-1 rounded">./data</code> directory!
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300">Option 2: Using Docker Run command</span>
              <button
                type="button"
                onClick={() => copyToClipboard(dockerRunCmd, 'run')}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
              >
                {copiedType === 'run' ? '✓ Copied!' : '📋 Copy Command'}
              </button>
            </div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-cyan-200 overflow-x-auto">
              {dockerRunCmd}
            </pre>
          </div>
        </div>

        {/* Accessing from other devices on LAN */}
        <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-4 text-xs space-y-1.5">
          <h4 className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <span>📱</span> Access from any phone, laptop, or tablet on your Wi-Fi
          </h4>
          <p className="text-slate-300">
            Find your Docker computer&apos;s local IP address (e.g. <code className="bg-slate-900 px-1 py-0.5 rounded text-cyan-300">192.168.1.150</code>).
            Open any browser on your Wi-Fi and navigate to:
          </p>
          <div className="bg-slate-950 p-2 rounded border border-cyan-900/60 font-mono text-center text-cyan-300 font-bold">
            http://192.168.1.150:3000
          </div>
          <p className="text-[11px] text-slate-400">
            Every device connects to the same local database on your computer. Bookmark this link on your phone or tablet for instant access in your 3D printing workshop!
          </p>
        </div>

        {/* Manual Backup & Restore */}
        <div className="border-t border-slate-800 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <h4 className="font-medium text-white">Manual Backup & Migration</h4>
            <p className="text-slate-400 text-[11px]">Download all data as a standalone JSON file anytime.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportBackup}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 font-medium"
            >
              <span>📥</span> Export Backup JSON
            </button>
            <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 font-medium cursor-pointer">
              <span>📤</span> Restore Backup
              <input
                type="file"
                accept=".json"
                onChange={onImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Close Button */}
        <div className="border-t border-slate-800 pt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-4 py-2 rounded-xl transition text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
