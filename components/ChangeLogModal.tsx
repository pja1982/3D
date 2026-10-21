import React, { useState, useEffect, useMemo } from 'react';
import { APP_VERSION, APP_RELEASE_DATE, CHANGELOG_DATA, type ChangeLogEntry } from '../constants/version';

interface ChangeLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialVersion?: string;
}

const ChangeLogModal: React.FC<ChangeLogModalProps> = ({
  isOpen,
  onClose,
  initialVersion,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'latest' | 'major'>('all');
  const [expandedVersion, setExpandedVersion] = useState<string | null>(initialVersion || APP_VERSION);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filter changelog entries
  const filteredEntries = useMemo(() => {
    let list = [...CHANGELOG_DATA];

    if (selectedFilter === 'latest') {
      list = list.filter(e => e.isLatest);
    } else if (selectedFilter === 'major') {
      list = list.filter(e => e.tag === 'major');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(entry => {
        const inVersion = entry.version.toLowerCase().includes(q);
        const inTitle = entry.title.toLowerCase().includes(q);
        const inHighlights = entry.highlights.some(h => h.toLowerCase().includes(q));
        const inItems = entry.sections.some(s => s.items.some(item => item.toLowerCase().includes(q)));
        return inVersion || inTitle || inHighlights || inItems;
      });
    }

    return list;
  }, [searchQuery, selectedFilter]);

  if (!isOpen) return null;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Added':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'Improved':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/40';
      case 'Fixed':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      case 'Optimized':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Added':
        return '✨';
      case 'Improved':
        return '⚡';
      case 'Fixed':
        return '🛠️';
      case 'Optimized':
        return '🚀';
      default:
        return '•';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 text-xl shadow-xs">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Version & Change Log</h2>
                <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-2.5 py-0.5 rounded-full shadow-xs">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Release history and complete feature update logs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition text-lg cursor-pointer"
            title="Close changelog (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:px-6 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedFilter === 'all'
                  ? 'bg-cyan-500 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Releases ({CHANGELOG_DATA.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('latest')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                selectedFilter === 'latest'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>⭐ Latest v{APP_VERSION}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('major')}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedFilter === 'major'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Major Milestones
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search changes (e.g. scale, TPU, sheets)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 text-xs"
            />
            <span className="absolute left-2.5 top-2 text-slate-500">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Change Log Entries List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="font-semibold text-slate-400 text-base">No change logs match your search</p>
              <p className="text-xs text-slate-500 mt-1">Try another search term or clear the filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilter('all');
                }}
                className="mt-3 text-cyan-400 hover:underline text-xs"
              >
                Reset filters
              </button>
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isExpanded = expandedVersion === entry.version || filteredEntries.length === 1;

              return (
                <div
                  key={entry.version}
                  className={`rounded-2xl border transition-all ${
                    entry.isLatest
                      ? 'bg-slate-800/80 border-cyan-500/50 shadow-lg shadow-cyan-950/30'
                      : 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  {/* Entry Header */}
                  <div
                    onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                    className="p-4 sm:p-5 flex items-center justify-between cursor-pointer select-none gap-4"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`font-mono font-bold text-sm sm:text-base px-2.5 py-1 rounded-lg border ${
                        entry.isLatest
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-400/60 shadow-xs'
                          : 'bg-slate-900 text-slate-300 border-slate-700'
                      }`}>
                        v{entry.version}
                      </span>

                      {entry.isLatest && (
                        <span className="text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Current Version</span>
                        </span>
                      )}

                      <span className="text-slate-400 text-xs font-medium">
                        {entry.releaseDate}
                      </span>

                      <h3 className="font-bold text-slate-100 text-base sm:text-lg block w-full sm:w-auto">
                        {entry.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      className="text-slate-400 hover:text-white p-1 rounded-lg text-xs font-mono flex-shrink-0"
                    >
                      {isExpanded ? '▲ Hide' : '▼ Details'}
                    </button>
                  </div>

                  {/* Highlights Summary */}
                  <div className="px-4 sm:px-5 pb-3">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                        ✨ Release Highlights:
                      </span>
                      <ul className="space-y-1 text-xs text-slate-300">
                        {entry.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-cyan-400 flex-shrink-0 font-bold">•</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Expanded Detailed Sections */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-700/60 space-y-4">
                      {entry.sections.map((section, sIdx) => (
                        <div key={sIdx} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(section.category)}`}>
                              {getCategoryIcon(section.category)} {section.category}
                            </span>
                          </div>
                          <ul className="space-y-1.5 text-xs text-slate-300 pl-2">
                            {section.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="flex items-start gap-2">
                                <span className="text-slate-500 flex-shrink-0 font-mono text-[11px]">↳</span>
                                <span className="leading-relaxed">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>3D Print Cost & Quote Tracker</span>
            <span>•</span>
            <span className="font-mono text-cyan-400 font-semibold">v{APP_VERSION}</span>
            <span>•</span>
            <span>{APP_RELEASE_DATE}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeLogModal;
