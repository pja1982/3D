import React, { useState, useEffect, useMemo } from 'react';
import type { Filament } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import { FilamentProfilesModal } from './FilamentProfilesModal';
import {
  getFilamentBackgroundStyle,
  getContrastTheme,
  normalizeHex,
  USER_SAMPLE_3D_FILAMENT_PROFILES_JSON,
  parse3DFilamentProfiles,
  download3DFilamentProfilesJson,
} from '../utils/filamentProfilesSync';

interface ConfigurationPageProps {
  filaments: Filament[];
  onAdd: (filament: Omit<Filament, 'id'>) => void;
  onUpdate: (filament: Filament) => void;
  onDelete: (id: string) => void;
  onBatchAdd?: (newFilaments: Filament[], mode: 'merge' | 'replace') => void;
}

const POPULAR_COLORS = [
  { name: 'Black', hex: '#18181b' },
  { name: 'White', hex: '#f8fafc' },
  { name: 'Slate Gray', hex: '#64748b' },
  { name: 'Fire Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Lime Green', hex: '#10b981' },
  { name: 'Forest Green', hex: '#047857' },
  { name: 'Cyan Blue', hex: '#06b6d4' },
  { name: 'Royal Blue', hex: '#3b82f6' },
  { name: 'Deep Purple', hex: '#8b5cf6' },
  { name: 'Magenta Pink', hex: '#ec4899' },
];

const emptyFilament: Omit<Filament, 'id'> = {
  type: '',
  brand: '',
  colorName: '',
  costPerKg: 22,
  colorHex: '#3b82f6',
  material_type: 'Basic',
  remaining_grams: 1000,
  empty_spool_weight: 240,
  td_value: null,
  location: 'Shelf: Home',
};

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
  filaments,
  onAdd,
  onUpdate,
  onDelete,
  onBatchAdd,
}) => {
  const [editingFilament, setEditingFilament] = useState<Omit<Filament, 'id'> | Filament>(emptyFilament);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedSpoolFields, setShowAdvancedSpoolFields] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // If the filament being edited is deleted from the main list, reset the form.
    if (isEditing && 'id' in editingFilament && !filaments.find(m => m.id === editingFilament.id)) {
      handleCancelEdit();
    }
  }, [filaments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditingFilament(prev => ({
      ...prev,
      [name]: name === 'costPerKg' || name === 'remaining_grams' || name === 'empty_spool_weight' || name === 'td_value'
        ? value === '' ? (name === 'td_value' || name === 'empty_spool_weight' ? null : 0) : parseFloat(value) || 0
        : value,
    }));
  };

  const handleColorHexChange = (value: string) => {
    setEditingFilament(prev => ({
      ...prev,
      colorHex: value,
      rgb: value,
    }));
  };

  const handleSelectPreset = (preset: { name: string; hex: string }) => {
    setEditingFilament(prev => ({
      ...prev,
      colorHex: preset.hex,
      rgb: preset.hex,
      colorName: (!prev.colorName || POPULAR_COLORS.some(p => p.name === prev.colorName)) ? preset.name : prev.colorName,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filType = (editingFilament.type || (editingFilament as any).name || '').trim();
    const brand = editingFilament.brand.trim();
    if (!filType || !brand) return;

    const normalizedColor = normalizeHex(editingFilament.colorHex || '#3b82f6');
    const colorName = (editingFilament.colorName || '').trim();

    const filamentData = {
      ...editingFilament,
      type: filType,
      name: filType,
      brand,
      colorName,
      colorHex: normalizedColor,
      rgb: editingFilament.rgb || normalizedColor,
      remaining_grams: editingFilament.remaining_grams ?? 1000,
    };

    if (isEditing && 'id' in editingFilament) {
      onUpdate(filamentData as Filament);
      setToastMessage(`Updated ${brand} ${filType}`);
    } else {
      onAdd(filamentData);
      setToastMessage(`Added ${brand} ${filType}`);
    }
    setTimeout(() => setToastMessage(null), 3000);
    handleCancelEdit();
  };

  const handleSaveAsNewFromTemplate = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    const filType = (editingFilament.type || (editingFilament as any).name || '').trim();
    const brand = editingFilament.brand.trim();
    if (!filType || !brand) return;

    const baseType = filType;
    const newType = baseType.includes('(Copy)') ? baseType : `${baseType} (Copy)`;
    const normalizedColor = normalizeHex(editingFilament.colorHex || '#3b82f6');
    const colorName = (editingFilament.colorName || '').trim();

    const { id: _unusedId, ...restFilament } = editingFilament as any;
    onAdd({
      ...restFilament,
      type: newType,
      name: newType,
      brand,
      colorName: colorName ? (colorName.includes('(Copy)') ? colorName : `${colorName} (Copy)`) : '',
      colorHex: normalizedColor,
      rgb: editingFilament.rgb || normalizedColor,
    });
    setToastMessage(`Created clone: ${brand} ${newType}`);
    setTimeout(() => setToastMessage(null), 3000);
    handleCancelEdit();
  };

  const handleUseAsTemplate = (filament: Filament) => {
    const filType = filament.type || (filament as any).name || '';
    setEditingFilament({
      ...filament,
      type: filType.includes('(Copy)') ? filType : `${filType} (Copy)`,
      colorName: filament.colorName || '',
      colorHex: filament.colorHex || '#3b82f6',
      rgb: filament.rgb || filament.colorHex || '#3b82f6',
    });
    setIsEditing(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleEdit = (filament: Filament) => {
    setEditingFilament({
      ...filament,
      type: filament.type || (filament as any).name || '',
      colorName: filament.colorName || '',
      colorHex: filament.colorHex || '#3b82f6',
      rgb: filament.rgb || filament.colorHex || '#3b82f6',
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingFilament(emptyFilament);
    setIsEditing(false);
  };

  // Quick 1-click loader for the user's provided sample
  const handleQuickLoadSample = () => {
    const parsed = parse3DFilamentProfiles(USER_SAMPLE_3D_FILAMENT_PROFILES_JSON, 22);
    if (parsed.filaments.length > 0) {
      if (onBatchAdd) {
        onBatchAdd(parsed.filaments, 'merge');
      } else {
        parsed.filaments.forEach(f => onAdd(f));
      }
      setToastMessage(`Imported ${parsed.filaments.length} spools from 3dfilamentprofiles.com sample!`);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  // Search & Filtered Filaments
  const filteredFilaments = useMemo(() => {
    return filaments.filter(f => {
      const q = searchQuery.toLowerCase().trim();
      const brand = (f.brand || '').toLowerCase();
      const type = (f.type || f.name || '').toLowerCase();
      const color = (f.colorName || '').toLowerCase();
      const location = (f.location || '').toLowerCase();
      const shortCode = (f.short_code || '').toLowerCase();

      const matchesSearch = !q || brand.includes(q) || type.includes(q) || color.includes(q) || location.includes(q) || shortCode.includes(q);
      if (!matchesSearch) return false;

      if (activeFilterTag === 'pla') return type.includes('pla');
      if (activeFilterTag === 'petg') return type.includes('petg');
      if (activeFilterTag === 'bambu') return brand.includes('bambu');
      if (activeFilterTag === 'sunlu') return brand.includes('sunlu');
      if (activeFilterTag === 'multicolor') return Boolean(f.rgb && f.rgb.includes(','));
      if (activeFilterTag === 'lowstock') return (f.remaining_grams !== undefined && f.remaining_grams < 250);

      return true;
    });
  }, [filaments, searchQuery, activeFilterTag]);

  const currentPreviewHex = normalizeHex(editingFilament.colorHex || '#3b82f6');
  const previewBgStyle = getFilamentBackgroundStyle(editingFilament.colorHex, editingFilament.rgb);
  const previewTheme = getContrastTheme(editingFilament.rgb || currentPreviewHex);
  const isPreviewLight = previewTheme === 'dark-on-light';

  return (
    <div className="space-y-6 mt-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-cyan-950/90 border border-cyan-500/50 text-cyan-200 text-xs rounded-xl flex items-center justify-between shadow-lg animate-fadeIn">
          <span>✨ {toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-cyan-400 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Top Banner Toolbar: 3DFilamentProfiles Integration */}
      <div className="bg-gradient-to-r from-slate-800/90 via-slate-800/70 to-cyan-950/40 p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-700/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🧵</span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Filament Spool Library
            </h2>
            <span className="text-[11px] bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono px-2 py-0.5 rounded-full">
              {filaments.length} spools
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage materials, colors, tare weights, and inventory. Compatible with <a href="https://3dfilamentprofiles.com/" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">3dfilamentprofiles.com</a> & SpoolDB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-none bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs py-2 px-3.5 rounded-xl transition shadow flex items-center justify-center gap-1.5"
            title="Import or Export JSON spools compatible with 3dfilamentprofiles.com"
          >
            <span>📥 Import / 📤 Export JSON</span>
          </button>
          <button
            type="button"
            onClick={() => download3DFilamentProfilesJson(filaments)}
            className="flex-1 sm:flex-none bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs py-2 px-3 rounded-xl transition border border-slate-600 flex items-center justify-center gap-1.5"
            title="1-click download of all spools in standard 3DFilamentProfiles JSON format"
          >
            <span>💾 Quick Export</span>
          </button>
          <button
            type="button"
            onClick={handleQuickLoadSample}
            className="flex-1 sm:flex-none bg-purple-900/50 hover:bg-purple-800/60 border border-purple-500/40 text-purple-200 text-xs font-semibold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
            title="Load the 20 Bambu Lab, ProTech, SUNLU & ELEGOO spools from 3dfilamentprofiles.com"
          >
            <span>⚡ Load Sample 20 Spools</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Filament Form */}
        <div className="lg:col-span-1 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 h-fit">
          <h2 className="text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
            {isEditing ? 'Edit Filament Spool' : 'Add New Filament'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="brand" className="block text-sm font-medium text-slate-300 mb-1">Brand</label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={editingFilament.brand}
                onChange={handleChange}
                placeholder="e.g., Bambu Lab, Polymaker, SUNLU, ELEGOO"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-slate-300 mb-1">Material</label>
                <input
                  type="text"
                  id="type"
                  name="type"
                  value={editingFilament.type || (editingFilament as any).name || ''}
                  onChange={handleChange}
                  placeholder="e.g., PLA, PETG, ABS"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="material_type" className="block text-sm font-medium text-slate-300 mb-1">Finish / Type</label>
                <input
                  type="text"
                  id="material_type"
                  name="material_type"
                  value={editingFilament.material_type || ''}
                  onChange={handleChange}
                  placeholder="Basic, Matte, Silk"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="colorName" className="block text-sm font-medium text-slate-300 mb-1">
                Colour Name
              </label>
              <input
                type="text"
                id="colorName"
                name="colorName"
                value={editingFilament.colorName || ''}
                onChange={handleChange}
                placeholder="e.g., Maroon Red (10205), Sunshine Yellow"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="colorHex" className="block text-sm font-medium text-slate-300 mb-1">
                Color (Hex or Multi-Color RGB)
              </label>
              <div className="flex items-center gap-3">
                {/* Native color picker */}
                <div className="relative flex-shrink-0">
                  <input
                    type="color"
                    id="colorPicker"
                    value={
                      /^#[0-9A-Fa-f]{6}$/.test(normalizeHex(editingFilament.colorHex || ''))
                        ? normalizeHex(editingFilament.colorHex || '')
                        : '#3b82f6'
                    }
                    onChange={(e) => handleColorHexChange(e.target.value.toLowerCase())}
                    className="w-11 h-10 rounded-lg cursor-pointer border border-slate-600 bg-slate-700 p-0.5 shadow-sm"
                    title="Click to open color palette"
                  />
                </div>

                {/* Text input for hex code or comma-separated hex codes */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="colorHex"
                    name="colorHex"
                    value={editingFilament.rgb || editingFilament.colorHex || ''}
                    onChange={(e) => handleColorHexChange(e.target.value)}
                    placeholder="#3B82F6 or #1839F0,#EF25F0"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Popular presets */}
              <div className="mt-3">
                <div className="text-xs text-slate-400 mb-1.5 flex justify-between items-center">
                  <span>Presets:</span>
                  <span className="font-mono text-[11px] text-cyan-400">
                    {currentPreviewHex.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => handleSelectPreset(c)}
                      className={`w-6 h-6 rounded-md border transition-all transform hover:scale-110 ${
                        (editingFilament.colorHex || '').toLowerCase() === c.hex.toLowerCase()
                          ? 'ring-2 ring-cyan-400 scale-105 border-white shadow'
                          : 'border-slate-600 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={`${c.name} (${c.hex})`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="costPerKg" className="block text-sm font-medium text-slate-300 mb-1">Cost / Kg ($)</label>
                <input
                  type="number"
                  id="costPerKg"
                  name="costPerKg"
                  value={editingFilament.costPerKg}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="remaining_grams" className="block text-sm font-medium text-slate-300 mb-1">
                  Remaining (g)
                </label>
                <input
                  type="number"
                  id="remaining_grams"
                  name="remaining_grams"
                  value={editingFilament.remaining_grams ?? 1000}
                  onChange={handleChange}
                  min="0"
                  step="10"
                  className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>

            {/* Toggle Advanced SpoolDB Fields */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedSpoolFields(!showAdvancedSpoolFields)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1"
              >
                <span>{showAdvancedSpoolFields ? '▼ Hide SpoolDB / Inventory Details' : '▶ Show SpoolDB / Inventory Details (Tare, TD, Location)'}</span>
              </button>
            </div>

            {showAdvancedSpoolFields && (
              <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-700/80 space-y-3 animate-fadeIn text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="empty_spool_weight" className="block text-slate-300 mb-1">Tare / Empty Spool (g)</label>
                    <input
                      type="number"
                      id="empty_spool_weight"
                      name="empty_spool_weight"
                      value={editingFilament.empty_spool_weight ?? ''}
                      onChange={handleChange}
                      placeholder="e.g. 240"
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="td_value" className="block text-slate-300 mb-1">TD Value (Lithophane)</label>
                    <input
                      type="number"
                      id="td_value"
                      name="td_value"
                      step="0.1"
                      value={editingFilament.td_value ?? ''}
                      onChange={handleChange}
                      placeholder="e.g. 3.7"
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="location" className="block text-slate-300 mb-1">Storage Location</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={editingFilament.location || ''}
                    onChange={handleChange}
                    placeholder="e.g., Shelf: Home, AMS Slot 1"
                    className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="short_code" className="block text-slate-300 mb-1">SpoolDB Short Code</label>
                  <input
                    type="text"
                    id="short_code"
                    name="short_code"
                    value={editingFilament.short_code || ''}
                    onChange={handleChange}
                    placeholder="e.g. QRA77jN43"
                    className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-slate-100 font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {/* Live Card Preview */}
            <div className="pt-2 border-t border-slate-700/60">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Live Background Preview</span>
              <div
                style={previewBgStyle}
                className={`p-3.5 rounded-xl border shadow-md flex justify-between items-center transition-all ${
                  isPreviewLight ? 'border-black/15 text-slate-900 shadow-slate-900/10' : 'border-white/20 text-white shadow-black/30'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-4 h-4 rounded-full border shadow-inner flex-shrink-0 ${
                      isPreviewLight ? 'border-black/30' : 'border-white/40'
                    }`}
                    style={previewBgStyle}
                  />
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-sm truncate flex items-center gap-1.5">
                      <span>{(editingFilament.brand || 'Brand')} - {(editingFilament.type || (editingFilament as any).name || 'Filament Type')}</span>
                      {editingFilament.colorName && (
                        <span className={`text-[11px] px-1.5 py-0.2 rounded font-medium border ${
                          isPreviewLight ? 'bg-black/10 border-black/20 text-slate-900' : 'bg-white/15 border-white/20 text-white'
                        }`}>
                          {editingFilament.colorName}
                        </span>
                      )}
                    </div>
                    <div className={`text-xs ${isPreviewLight ? 'text-slate-800 font-medium' : 'text-slate-200'}`}>
                      ${(editingFilament.costPerKg || 0).toFixed(2)}/kg • {editingFilament.remaining_grams ?? 1000}g left
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                    title="Update the existing filament record"
                  >
                    <span>🔄 Update Filament</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAsNewFromTemplate}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                    title="Create a new filament record using this as a template"
                  >
                    <span>📋 Save as New</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs"
                >
                  Cancel Edit
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors shadow text-sm"
                >
                  Add Filament
                </button>
                {Boolean(editingFilament.brand || editingFilament.type) && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors text-xs"
                  >
                    Clear Form
                  </button>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Saved Filaments List */}
        <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col">
          {/* Header & Filter Controls */}
          <div className="border-b border-slate-700 pb-4 mb-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-cyan-400">Saved Spools</h2>
                <span className="text-xs text-slate-400">
                  Showing {filteredFilaments.length} of {filaments.length} spools
                </span>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search brand, material, color..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {[
                { id: 'all', label: 'All Spools' },
                { id: 'pla', label: 'PLA' },
                { id: 'petg', label: 'PETG' },
                { id: 'bambu', label: 'Bambu Lab' },
                { id: 'sunlu', label: 'SUNLU' },
                { id: 'multicolor', label: '🌈 Multi-Color' },
                { id: 'lowstock', label: '⚠️ Low Stock (<250g)' },
              ].map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setActiveFilterTag(tag.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition ${
                    activeFilterTag === tag.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Spool Items */}
          {filteredFilaments.length === 0 ? (
            <div className="text-center py-14 text-slate-500">
              <span className="text-3xl block mb-2">🧵</span>
              <p className="font-medium text-slate-400">No filaments match your search or filter.</p>
              <p className="text-xs mt-1">Try clearing filters or click &ldquo;Load Sample 20 Spools&rdquo; above.</p>
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto max-h-[750px] pr-1">
              {filteredFilaments.map(filament => {
                const filType = filament.type || filament.name || 'Filament';
                const bgStyle = getFilamentBackgroundStyle(filament.colorHex, filament.rgb);
                const isMultiColor = Boolean(filament.rgb && filament.rgb.includes(','));
                const theme = getContrastTheme(filament.rgb || filament.colorHex);
                const isLightBg = theme === 'dark-on-light';
                const remainingGrams = filament.remaining_grams ?? 1000;
                const isLowStock = remainingGrams < 250;

                return (
                  <li
                    key={filament.id}
                    style={bgStyle}
                    className={`p-3.5 rounded-xl border shadow-md flex justify-between items-center transition-all hover:shadow-lg ${
                      isLightBg
                        ? 'border-black/20 text-slate-900 shadow-slate-950/5'
                        : 'border-white/20 text-white shadow-black/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Swatch indicator */}
                      <span
                        className={`w-7 h-7 rounded-full border shadow-inner flex-shrink-0 ${
                          isLightBg ? 'border-black/30 ring-1 ring-black/10' : 'border-white/40 ring-1 ring-white/20'
                        }`}
                        style={bgStyle}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-base tracking-tight truncate">
                            {filament.brand} - {filType}
                          </span>
                          {filament.colorName && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded font-medium border flex-shrink-0 ${
                                isLightBg
                                  ? 'bg-black/10 border-black/20 text-slate-900'
                                  : 'bg-white/15 border-white/20 text-white'
                              }`}
                            >
                              {filament.colorName}
                            </span>
                          )}
                          {isMultiColor && (
                            <span className="text-[10px] bg-purple-950/80 border border-purple-400/40 text-purple-200 px-1.5 py-0.2 rounded font-semibold flex-shrink-0">
                              🌈 Multi-color
                            </span>
                          )}
                          {filament.material_type && filament.material_type.toLowerCase() !== 'basic' && (
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border flex-shrink-0 ${
                              isLightBg ? 'bg-black/10 border-black/20' : 'bg-white/10 border-white/20'
                            }`}>
                              {filament.material_type}
                            </span>
                          )}
                        </div>

                        {/* Secondary metadata badges */}
                        <div className={`text-xs mt-1 flex flex-wrap items-center gap-2.5 ${
                          isLightBg ? 'text-slate-800' : 'text-slate-200'
                        }`}>
                          <span className="font-semibold">${filament.costPerKg.toFixed(2)}/kg</span>
                          
                          <span className={`flex items-center gap-1 px-1.5 py-0.2 rounded ${
                            isLowStock 
                              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30' 
                              : isLightBg ? 'bg-black/5' : 'bg-white/10'
                          }`}>
                            <span>⚖️ {remainingGrams}g left</span>
                          </span>

                          {filament.empty_spool_weight && (
                            <span className="opacity-90">📦 Tare: {filament.empty_spool_weight}g</span>
                          )}

                          {filament.td_value !== null && filament.td_value !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded border text-[11px] ${
                              isLightBg ? 'bg-black/10 border-black/20 font-medium' : 'bg-white/15 border-white/20'
                            }`} title="HueForge lithophane transmission distance">
                              💡 TD: {filament.td_value}
                            </span>
                          )}

                          {filament.location && (
                            <span className="opacity-90">📍 {filament.location}</span>
                          )}

                          {filament.short_code && (
                            <a
                              href={filament.spool_url || `https://spooldb.com/s/${filament.short_code}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`text-[11px] font-mono px-1.5 py-0.2 rounded border hover:underline flex items-center gap-1 ${
                                isLightBg ? 'bg-black/10 border-black/20 text-slate-900' : 'bg-white/15 border-white/20 text-white'
                              }`}
                              title="Open profile on SpoolDB"
                            >
                              <span>{filament.short_code}</span>
                              <span className="text-[10px]">↗</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleUseAsTemplate(filament)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLightBg
                            ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300'
                        }`}
                        title="Use as Template to create new Filament"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(filament)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLightBg
                            ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                            : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                        title="Edit Filament"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(filament.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          isLightBg
                            ? 'bg-red-600/20 hover:bg-red-600/30 text-red-950'
                            : 'bg-red-500/30 hover:bg-red-500/50 text-red-200'
                        }`}
                        title="Delete Filament"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 3DFilamentProfiles Modal */}
      <FilamentProfilesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        filaments={filaments}
        onImportFilaments={(newFilaments, mode) => {
          if (onBatchAdd) {
            onBatchAdd(newFilaments, mode);
          } else {
            newFilaments.forEach(f => onAdd(f));
          }
          setToastMessage(`Successfully imported ${newFilaments.length} spools (${mode === 'replace' ? 'replaced list' : 'merged'})!`);
          setTimeout(() => setToastMessage(null), 4000);
        }}
      />
    </div>
  );
};

export default ConfigurationPage;
