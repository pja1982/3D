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
import { detectMaterialCategory, DEFAULT_MATERIAL_FAILURE_RATES } from '../utils/filamentFailureRates';
import { FilamentMasterCodeModal } from './FilamentMasterCodeModal';
import {
  decodeMasterCode,
  suggestMasterCode,
  MASTER_CODE_BRANDS,
  MASTER_CODE_POLYMERS,
} from '../utils/filamentMasterCode';
import { isFilamentPla } from '../utils/randomFilamentSelector';

interface ConfigurationPageProps {
  filaments: Filament[];
  onAdd: (filament: Omit<Filament, 'id'>) => void;
  onUpdate: (filament: Filament) => void;
  onDelete: (id: string) => void;
  onBatchAdd?: (newFilaments: Filament[], mode: 'merge' | 'replace') => void;
  onReorder?: (filaments: Filament[]) => void;
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
  actual_spool_weight: 1240,
  td_value: null,
  location: 'Shelf: Home',
  masterCode: '',
  isRandomEligible: true,
};

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
  filaments,
  onAdd,
  onUpdate,
  onDelete,
  onBatchAdd,
  onReorder,
}) => {
  const [editingFilament, setEditingFilament] = useState<Omit<Filament, 'id'> | Filament>(emptyFilament);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAdvancedSpoolFields, setShowAdvancedSpoolFields] = useState(false);
  const [showMasterCodeBuilder, setShowMasterCodeBuilder] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [weighingFilament, setWeighingFilament] = useState<Filament | null>(null);
  const [scaleWeightInput, setScaleWeightInput] = useState<string>('');

  const handleOpenWeighModal = (filament: Filament) => {
    setWeighingFilament(filament);
    setScaleWeightInput(
      filament.actual_spool_weight !== null && filament.actual_spool_weight !== undefined
        ? String(filament.actual_spool_weight)
        : (typeof filament.remaining_grams === 'number' && typeof filament.empty_spool_weight === 'number'
            ? String(filament.remaining_grams + filament.empty_spool_weight)
            : '')
    );
  };

  const handleSaveScaleWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!weighingFilament) return;
    const grossVal = scaleWeightInput.trim() === '' ? null : parseFloat(scaleWeightInput);
    if (grossVal !== null && isNaN(grossVal)) return;

    const tare = weighingFilament.empty_spool_weight ?? 0;
    const newRemaining = grossVal !== null
      ? Math.max(0, parseFloat((grossVal - tare).toFixed(1)))
      : weighingFilament.remaining_grams;

    const updated: Filament = {
      ...weighingFilament,
      actual_spool_weight: grossVal,
      remaining_grams: newRemaining,
      updated_at: new Date().toISOString(),
    };

    onUpdate(updated);
    setToastMessage(`Updated ${weighingFilament.brand} ${weighingFilament.type || weighingFilament.name}: Scale Weight ${grossVal !== null ? `${grossVal}g` : 'Cleared'} (Net: ${newRemaining ?? 0}g)`);
    setTimeout(() => setToastMessage(null), 3000);
    setWeighingFilament(null);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const sourceIndex = filaments.findIndex(f => f.id === draggedId);
    const targetIndex = filaments.findIndex(f => f.id === dropTargetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const reordered = [...filaments];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const updated = reordered.map((f, idx) => ({
      ...f,
      sortOrder: idx,
      isDefault: idx === 0,
    }));

    setDraggedId(null);
    setDragOverId(null);
    if (onReorder) {
      onReorder(updated);
    }
    setToastMessage(`Reordered: ${moved.brand} ${moved.type || moved.name} moved`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSetDefault = (filamentId: string) => {
    const updated = filaments.map(f => ({
      ...f,
      isDefault: f.id === filamentId,
    }));

    if (onReorder) {
      onReorder(updated);
    }
    const target = filaments.find(f => f.id === filamentId);
    setToastMessage(`⭐ Set ${target?.brand || ''} ${target?.type || target?.name || ''} as Default Filament`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMove = (filamentId: string, direction: 'up' | 'down') => {
    const index = filaments.findIndex(f => f.id === filamentId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= filaments.length) return;

    const reordered = [...filaments];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const updated = reordered.map((f, idx) => ({
      ...f,
      sortOrder: idx,
      isDefault: idx === 0,
    }));

    if (onReorder) {
      onReorder(updated);
    }
  };

  useEffect(() => {
    // If the filament being edited is deleted from the main list, reset the form.
    if (isEditing && 'id' in editingFilament && !filaments.find(m => m.id === editingFilament.id)) {
      handleCancelEdit();
    }
  }, [filaments]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'actual_spool_weight') {
      const gross = value === '' ? null : parseFloat(value) || 0;
      setEditingFilament(prev => {
        const tare = prev.empty_spool_weight;
        const newRemaining = gross !== null && typeof tare === 'number'
          ? Math.max(0, parseFloat((gross - tare).toFixed(1)))
          : prev.remaining_grams;
        return {
          ...prev,
          actual_spool_weight: gross,
          remaining_grams: newRemaining,
        };
      });
      return;
    }

    if (name === 'remaining_grams') {
      const net = value === '' ? 0 : parseFloat(value) || 0;
      setEditingFilament(prev => {
        const tare = prev.empty_spool_weight;
        const newGross = typeof tare === 'number'
          ? parseFloat((net + tare).toFixed(1))
          : prev.actual_spool_weight;
        return {
          ...prev,
          remaining_grams: net,
          actual_spool_weight: newGross,
        };
      });
      return;
    }

    if (name === 'empty_spool_weight') {
      const tare = value === '' ? null : parseFloat(value) || 0;
      setEditingFilament(prev => {
        if (tare !== null) {
          if (typeof prev.actual_spool_weight === 'number' && prev.actual_spool_weight > 0) {
            return {
              ...prev,
              empty_spool_weight: tare,
              remaining_grams: Math.max(0, parseFloat((prev.actual_spool_weight - tare).toFixed(1))),
            };
          } else if (typeof prev.remaining_grams === 'number') {
            return {
              ...prev,
              empty_spool_weight: tare,
              actual_spool_weight: parseFloat((prev.remaining_grams + tare).toFixed(1)),
            };
          }
        }
        return {
          ...prev,
          empty_spool_weight: tare,
        };
      });
      return;
    }

    setEditingFilament(prev => ({
      ...prev,
      [name]: name === 'costPerKg' || name === 'td_value' || name === 'failureRate'
        ? value === '' ? (name === 'td_value' || name === 'failureRate' ? null : 0) : parseFloat(value) || 0
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
      colorName: (!prev.colorName || POPULAR_COLORS.some(p => p.name === preset.name)) ? preset.name : prev.colorName,
    }));
  };

  const handleApplyMasterCode = (code: string, autoFillAttributes: boolean = true) => {
    const cleanCode = code.trim().toUpperCase();
    setEditingFilament(prev => {
      const next = { ...prev, masterCode: cleanCode };
      if (autoFillAttributes && cleanCode.length === 4) {
        const decoded = decodeMasterCode(cleanCode);
        if (decoded.brandCode in MASTER_CODE_BRANDS) {
          next.brand = MASTER_CODE_BRANDS[decoded.brandCode].name;
        }
        if (decoded.polymerCode in MASTER_CODE_POLYMERS) {
          next.type = MASTER_CODE_POLYMERS[decoded.polymerCode].short;
          if (decoded.polymerCode === '1') next.material_type = 'Silk';
          else if (decoded.polymerCode === '2' || decoded.polymerCode === '4') next.material_type = 'Matte';
          else if (decoded.polymerCode === '0' || decoded.polymerCode === '3') next.material_type = 'Basic';
        }
        if (decoded.isSpecialty && decoded.specialtyLabel) {
          if (!next.colorName) next.colorName = decoded.specialtyLabel;
        }
      }
      return next;
    });
    setToastMessage(`Assigned Master Code #${cleanCode}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAutoSuggestMasterCode = () => {
    const suggestion = suggestMasterCode(editingFilament);
    handleApplyMasterCode(suggestion.code, false);
    setToastMessage(`Auto-suggested Master Code #${suggestion.code} (${suggestion.decoded.summary})`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filType = (editingFilament.type || (editingFilament as any).name || '').trim();
    const brand = editingFilament.brand.trim();
    if (!filType || !brand) return;

    const normalizedColor = normalizeHex(editingFilament.colorHex || '#3b82f6');
    const colorName = (editingFilament.colorName || '').trim();

    const finalActualWeight = typeof editingFilament.actual_spool_weight === 'number'
      ? editingFilament.actual_spool_weight
      : (typeof editingFilament.remaining_grams === 'number' && typeof editingFilament.empty_spool_weight === 'number'
          ? editingFilament.remaining_grams + editingFilament.empty_spool_weight
          : null);

    const filamentData = {
      ...editingFilament,
      type: filType,
      name: filType,
      brand,
      colorName,
      colorHex: normalizedColor,
      rgb: editingFilament.rgb || normalizedColor,
      remaining_grams: editingFilament.remaining_grams ?? 1000,
      actual_spool_weight: finalActualWeight,
      masterCode: (editingFilament.masterCode || '').trim().toUpperCase(),
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

  const handleToggleRandomEligible = (filamentId: string) => {
    const target = filaments.find(f => f.id === filamentId);
    if (!target) return;
    const newStatus = !target.isRandomEligible;
    onUpdate({ ...target, isRandomEligible: newStatus });
    setToastMessage(newStatus 
      ? `✓ Added "${target.brand} ${target.type || target.name}" to Random PLA Pool` 
      : `Removed "${target.brand} ${target.type || target.name}" from Random PLA Pool`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCheckAllPlaRandom = () => {
    const plaFilaments = filaments.filter(f => isFilamentPla(f));
    if (plaFilaments.length === 0) {
      alert("No PLA filaments found in library.");
      return;
    }
    const allAlreadyChecked = plaFilaments.every(f => f.isRandomEligible);
    const newStatus = !allAlreadyChecked;
    
    plaFilaments.forEach(f => {
      onUpdate({ ...f, isRandomEligible: newStatus });
    });

    setToastMessage(newStatus 
      ? `✓ Checked all ${plaFilaments.length} PLA spools for Random Mystery Pool!` 
      : `Unchecked all PLA spools from Random Pool`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Dynamic material categories from collection
  const availableMaterialTypes = useMemo(() => {
    const types = new Set<string>();
    filaments.forEach(f => {
      const raw = (f.type || (f as any).name || '').trim();
      if (!raw) return;
      const upper = raw.toUpperCase();
      if (upper.includes('PLA')) types.add('PLA');
      else if (upper.includes('PETG')) types.add('PETG');
      else if (upper.includes('ABS')) types.add('ABS');
      else if (upper.includes('TPU')) types.add('TPU');
      else if (upper.includes('ASA')) types.add('ASA');
      else if (upper.includes('PC')) types.add('PC');
      else if (upper.includes('NYLON') || upper.includes('PA')) types.add('Nylon');
      else {
        const clean = raw.split(/[\s-_]+/)[0];
        if (clean && clean.length >= 2 && clean.length <= 10) types.add(clean);
      }
    });
    return Array.from(types).sort();
  }, [filaments]);

  // Search, Filtered, and Sorted Filaments
  const filteredFilaments = useMemo(() => {
    const list = filaments.filter(f => {
      const q = searchQuery.toLowerCase().trim();
      const brand = (f.brand || '').toLowerCase();
      const type = (f.type || (f as any).name || '').toLowerCase();
      const color = (f.colorName || '').toLowerCase();
      const location = (f.location || '').toLowerCase();
      const shortCode = (f.short_code || '').toLowerCase();
      const masterCode = (f.masterCode || '').toLowerCase();

      const matchesSearch = !q || brand.includes(q) || type.includes(q) || color.includes(q) || location.includes(q) || shortCode.includes(q) || masterCode.includes(q);
      if (!matchesSearch) return false;

      if (activeFilterTag === 'all') return true;
      if (activeFilterTag === 'randompool') return Boolean(f.isRandomEligible);
      if (activeFilterTag === 'lowstock') return (f.remaining_grams !== undefined && f.remaining_grams < 250);
      if (activeFilterTag === 'instock') return (f.remaining_grams === undefined || f.remaining_grams >= 250);
      if (activeFilterTag === 'multicolor') return Boolean(f.rgb && f.rgb.includes(','));
      if (activeFilterTag.startsWith('brand:')) {
        const targetBrand = activeFilterTag.replace('brand:', '').toLowerCase();
        return brand.includes(targetBrand);
      }
      return type.includes(activeFilterTag.toLowerCase());
    });

    if (sortBy === 'default') {
      return list;
    }

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'mastercode-asc':
          return (a.masterCode || 'ZZZZ').localeCompare(b.masterCode || 'ZZZZ');
        case 'mastercode-desc':
          return (b.masterCode || '').localeCompare(a.masterCode || '');
        case 'brand-asc':
          return (a.brand || '').localeCompare(b.brand || '');
        case 'brand-desc':
          return (b.brand || '').localeCompare(a.brand || '');
        case 'type-asc':
          return (a.type || (a as any).name || '').localeCompare(b.type || (b as any).name || '');
        case 'color-asc':
          return (a.colorName || '').localeCompare(b.colorName || '');
        case 'price-asc':
          return (a.costPerKg || 0) - (b.costPerKg || 0);
        case 'price-desc':
          return (b.costPerKg || 0) - (a.costPerKg || 0);
        case 'weight-desc':
          return (b.remaining_grams ?? 1000) - (a.remaining_grams ?? 1000);
        case 'weight-asc':
          return (a.remaining_grams ?? 1000) - (b.remaining_grams ?? 1000);
        default:
          return 0;
      }
    });
  }, [filaments, searchQuery, activeFilterTag, sortBy]);

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
            {/* Filament Master Code v0.1 Card */}
            <div className="bg-slate-900/90 border border-cyan-500/40 rounded-xl p-3.5 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/60">
                    ID
                  </span>
                  <label htmlFor="masterCode" className="text-xs font-bold text-slate-200 tracking-wide">
                    Master Code <span className="text-cyan-400 font-mono text-[10px]">v0.1</span>
                  </label>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleAutoSuggestMasterCode}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2 py-1 rounded border border-slate-700 transition font-semibold flex items-center gap-1 cursor-pointer"
                    title="Auto-detect 4-digit master code based on brand, material, and color name"
                  >
                    <span>⚡ Auto-Detect</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMasterCodeBuilder(true)}
                    className="text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white px-2 py-1 rounded font-semibold transition flex items-center gap-1 shadow cursor-pointer"
                    title="Open interactive 4-digit code builder modal"
                  >
                    <span>🛠️ Builder</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 font-mono text-cyan-400 font-bold text-sm">#</span>
                  <input
                    type="text"
                    id="masterCode"
                    name="masterCode"
                    maxLength={4}
                    value={editingFilament.masterCode || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 4);
                      setEditingFilament(prev => ({ ...prev, masterCode: val }));
                    }}
                    placeholder="e.g. 00G1, 10W1, 2301"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 pl-7 pr-3 font-mono text-sm tracking-widest text-cyan-300 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase placeholder-slate-600"
                  />
                </div>
                {editingFilament.masterCode && (
                  <button
                    type="button"
                    onClick={() => setEditingFilament(prev => ({ ...prev, masterCode: '' }))}
                    className="p-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                    title="Clear master code"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Live decoded breakdown badge */}
              {(() => {
                const code = (editingFilament.masterCode || '').trim();
                if (!code) {
                  return (
                    <p className="text-[10px] text-slate-400 leading-tight">
                      System: <span className="text-slate-300 font-mono">D1</span> Brand (0-5) • <span className="text-slate-300 font-mono">D2</span> Polymer (0-6) • <span className="text-slate-300 font-mono">D3-4</span> Color (01-99 or G1, R1, T1, D1, L1, W1, C1)
                    </p>
                  );
                }
                const decoded = decodeMasterCode(code);
                return (
                  <div className={`p-2 rounded-lg text-[11px] leading-snug border ${
                    decoded.isValid 
                      ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-200' 
                      : 'bg-amber-950/40 border-amber-600/40 text-amber-200'
                  }`}>
                    <div className="font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        {decoded.isValid ? '✓ Valid Master Code' : '⚠️ Partial / Custom Code'}
                      </span>
                      <span className="font-mono text-[10px] bg-slate-900 px-1.5 py-0.2 rounded text-cyan-300 border border-slate-700">
                        #{code}
                      </span>
                    </div>
                    <div className="mt-0.5 text-slate-300 text-[10.5px]">
                      {decoded.summary}
                    </div>
                  </div>
                );
              })()}
            </div>

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
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                required
              />
            </div>

            {/* Spool Weight & Scale Inventory Section */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <span>⚖️ Spool Weight & Scale Inventory</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  Gross Scale − Tare = Usable Filament
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Actual Spool Weight on Scale */}
                <div>
                  <label htmlFor="actual_spool_weight" className="text-xs font-semibold text-slate-200 block mb-1">
                    ⚖️ Actual Spool (g)
                  </label>
                  <input
                    type="number"
                    id="actual_spool_weight"
                    name="actual_spool_weight"
                    value={editingFilament.actual_spool_weight ?? ''}
                    onChange={handleChange}
                    placeholder="Scale gross (e.g. 1240)"
                    min="0"
                    step="1"
                    className="w-full bg-slate-800 border border-cyan-500/50 rounded-md py-1.5 px-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    title="Total weight of spool + filament measured on digital scale"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Scale gross reading</span>
                </div>

                {/* 2. Empty Spool / Tare Weight */}
                <div>
                  <label htmlFor="empty_spool_weight" className="text-xs font-semibold text-slate-200 block mb-1">
                    📦 Empty Tare (g)
                  </label>
                  <input
                    type="number"
                    id="empty_spool_weight"
                    name="empty_spool_weight"
                    value={editingFilament.empty_spool_weight ?? ''}
                    onChange={handleChange}
                    placeholder="Empty spool (e.g. 240)"
                    min="0"
                    step="1"
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-1.5 px-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    title="Weight of empty plastic/cardboard spool alone (default 240g)"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Empty spool alone</span>
                </div>

                {/* 3. Remaining Net Filament */}
                <div>
                  <label htmlFor="remaining_grams" className="text-xs font-semibold text-slate-200 block mb-1">
                    🧵 Usable Net (g)
                  </label>
                  <input
                    type="number"
                    id="remaining_grams"
                    name="remaining_grams"
                    value={editingFilament.remaining_grams ?? ''}
                    onChange={handleChange}
                    placeholder="Remaining (e.g. 1000)"
                    min="0"
                    step="10"
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-1.5 px-2.5 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                    title="Net usable filament remaining"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Usable filament left</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                <span className="text-slate-400 text-[11px] mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    const tare = typeof editingFilament.empty_spool_weight === 'number' ? editingFilament.empty_spool_weight : 240;
                    setEditingFilament(prev => ({
                      ...prev,
                      empty_spool_weight: tare,
                      remaining_grams: 1000,
                      actual_spool_weight: 1000 + tare,
                    }));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  Full (1kg+Tare)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tare = typeof editingFilament.empty_spool_weight === 'number' ? editingFilament.empty_spool_weight : 240;
                    setEditingFilament(prev => ({
                      ...prev,
                      empty_spool_weight: tare,
                      remaining_grams: 750,
                      actual_spool_weight: 750 + tare,
                    }));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  750g
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tare = typeof editingFilament.empty_spool_weight === 'number' ? editingFilament.empty_spool_weight : 240;
                    setEditingFilament(prev => ({
                      ...prev,
                      empty_spool_weight: tare,
                      remaining_grams: 500,
                      actual_spool_weight: 500 + tare,
                    }));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  Half (500g)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tare = typeof editingFilament.empty_spool_weight === 'number' ? editingFilament.empty_spool_weight : 240;
                    setEditingFilament(prev => ({
                      ...prev,
                      empty_spool_weight: tare,
                      remaining_grams: 250,
                      actual_spool_weight: 250 + tare,
                    }));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  250g
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tare = typeof editingFilament.empty_spool_weight === 'number' ? editingFilament.empty_spool_weight : 240;
                    setEditingFilament(prev => ({
                      ...prev,
                      empty_spool_weight: tare,
                      remaining_grams: 0,
                      actual_spool_weight: tare,
                    }));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-rose-300 px-2 py-0.5 rounded text-[11px] border border-slate-700 transition cursor-pointer"
                >
                  Empty Spool (0g)
                </button>
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
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="failureRate" className="text-slate-300 text-xs font-medium flex items-center gap-1.5">
                      <span>⚡ Technical Failure Buffer (%)</span>
                      <span className="text-[10px] text-amber-300 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                        TPU / ABS Risk
                      </span>
                    </label>
                    {(() => {
                      const detected = detectMaterialCategory((editingFilament.type || (editingFilament as any).name || '') + ' ' + (editingFilament.material || ''));
                      if (detected !== 'standard') {
                        return (
                          <span className="text-[11px] text-amber-300 font-medium">
                            Auto: {DEFAULT_MATERIAL_FAILURE_RATES[detected]}% ({detected.toUpperCase()})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      id="failureRate"
                      name="failureRate"
                      min="0"
                      max="100"
                      step="1"
                      value={editingFilament.failureRate ?? ''}
                      onChange={handleChange}
                      placeholder={(() => {
                        const detected = detectMaterialCategory((editingFilament.type || (editingFilament as any).name || '') + ' ' + (editingFilament.material || ''));
                        return detected !== 'standard' ? `Auto: ${DEFAULT_MATERIAL_FAILURE_RATES[detected]}%` : 'Base: 5% (Leave blank for auto-detection)';
                      })()}
                      className="w-full bg-slate-800 border border-slate-600 rounded p-1.5 text-slate-100 placeholder-slate-500 text-xs font-mono"
                    />
                    <span className="text-xs text-slate-400 font-mono">%</span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Custom risk buffer for this spool. If blank, automatically applies preset rate when difficult material (e.g. TPU: 15%, ABS: 18%) is detected.
                  </span>
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

            {/* Surprise / Random PLA Selector Eligibility */}
            {isFilamentPla(editingFilament as Filament) && (
              <div className="p-3 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🎲</span>
                  <div>
                    <div className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                      <span>Random Selector Eligible (Maker's Choice PLA)</span>
                      <span className="text-[10px] bg-purple-800 text-purple-100 px-1.5 py-0.5 rounded font-mono">PLA Only</span>
                    </div>
                    <p className="text-[11px] text-purple-300/80">
                      Include this spool in the random color pool for decorative prints when client specifies no color.
                    </p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="isRandomEligible"
                    checked={editingFilament.isRandomEligible !== false}
                    onChange={(e) => setEditingFilament(prev => ({ ...prev, isRandomEligible: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    editingFilament.isRandomEligible !== false
                      ? 'bg-purple-600 border-purple-400 text-white shadow-sm'
                      : 'bg-slate-800 border-slate-600 text-transparent'
                  }`}>
                    <span className="text-xs font-bold text-white">✓</span>
                  </div>
                  <span className="text-xs font-medium text-slate-300">Eligible</span>
                </label>
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

              <div className="flex flex-wrap items-center gap-2.5">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <label htmlFor="filamentSort" className="text-xs text-slate-400 font-medium whitespace-nowrap">Sort:</label>
                  <select
                    id="filamentSort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                  >
                    <option value="default">Default / Custom Order</option>
                    <option value="mastercode-asc">Master Code (0000 → 9999)</option>
                    <option value="mastercode-desc">Master Code (9999 → 0000)</option>
                    <option value="brand-asc">Brand (A → Z)</option>
                    <option value="brand-desc">Brand (Z → A)</option>
                    <option value="type-asc">Material / Type (A → Z)</option>
                    <option value="color-asc">Color Name (A → Z)</option>
                    <option value="price-asc">Price ($/kg: Low to High)</option>
                    <option value="price-desc">Price ($/kg: High to Low)</option>
                    <option value="weight-desc">Spool Net: High to Low</option>
                    <option value="weight-asc">Spool Net: Low to High</option>
                  </select>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-52">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search brand, type, color..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Material & Inventory Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveFilterTag('all')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeFilterTag === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                }`}
              >
                All Spools ({filaments.length})
              </button>

              {availableMaterialTypes.map(mat => (
                <button
                  key={mat}
                  type="button"
                  onClick={() => setActiveFilterTag(activeFilterTag === mat.toLowerCase() ? 'all' : mat.toLowerCase())}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                    activeFilterTag === mat.toLowerCase()
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-700/60 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {mat}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setActiveFilterTag(activeFilterTag === 'multicolor' ? 'all' : 'multicolor')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeFilterTag === 'multicolor'
                    ? 'bg-purple-500 text-white font-bold shadow-sm'
                    : 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800/40'
                }`}
              >
                🌈 Multi-Color
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTag(activeFilterTag === 'instock' ? 'all' : 'instock')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeFilterTag === 'instock'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40'
                }`}
              >
                ✓ In Stock (≥250g)
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTag(activeFilterTag === 'lowstock' ? 'all' : 'lowstock')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                  activeFilterTag === 'lowstock'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-800/40'
                }`}
              >
                ⚠️ Low Stock (&lt;250g)
              </button>

              <button
                type="button"
                onClick={() => setActiveFilterTag(activeFilterTag === 'randompool' ? 'all' : 'randompool')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeFilterTag === 'randompool'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-sm'
                    : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                }`}
                title="Show only PLA spools eligible for Random / Mystery Picker"
              >
                <span className="w-2.5 h-2.5 rounded bg-white text-slate-950 text-[9px] flex items-center justify-center font-black">✓</span>
                <span>🎲 Random Pool ({filaments.filter(f => f.isRandomEligible).length})</span>
              </button>

              <button
                type="button"
                onClick={handleCheckAllPlaRandom}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-600 transition font-medium flex items-center gap-1 cursor-pointer ml-auto"
                title="Toggle all PLA spools for Random Pool"
              >
                <span>✓ Tag All PLAs</span>
              </button>
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
                const mainIndex = filaments.findIndex(f => f.id === filament.id);
                const hasExplicitDefault = filaments.some(f => f.isDefault);
                const isDefaultSpool = Boolean(filament.isDefault || (!hasExplicitDefault && mainIndex === 0));
                const isBeingDragged = draggedId === filament.id;
                const isDragTarget = dragOverId === filament.id;
                const materialCat = detectMaterialCategory(filament.type || filament.material || filament.name);
                const isTechnicalRisk = (typeof filament.failureRate === 'number' && filament.failureRate > 5) || materialCat !== 'standard';
                const displayRiskRate = typeof filament.failureRate === 'number'
                  ? filament.failureRate
                  : (materialCat !== 'standard' ? DEFAULT_MATERIAL_FAILURE_RATES[materialCat] : null);

                return (
                  <li
                    key={filament.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, filament.id)}
                    onDragOver={(e) => handleDragOver(e, filament.id)}
                    onDrop={(e) => handleDrop(e, filament.id)}
                    onDragEnd={() => {
                      setDraggedId(null);
                      setDragOverId(null);
                    }}
                    style={bgStyle}
                    className={`p-3.5 rounded-xl border shadow-md flex justify-between items-center transition-all hover:shadow-lg relative select-none ${
                      isLightBg
                        ? 'border-black/20 text-slate-900 shadow-slate-950/5'
                        : 'border-white/20 text-white shadow-black/40'
                    } ${isBeingDragged ? 'opacity-40 scale-[0.99] border-dashed border-cyan-400' : ''} ${
                      isDragTarget && !isBeingDragged ? 'ring-2 ring-cyan-400 border-cyan-400' : ''
                    } ${isDefaultSpool ? 'ring-1 ring-amber-400/50' : ''}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Drag Handle & Nudge Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div
                          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-white p-1 rounded hover:bg-black/20 select-none flex-shrink-0"
                          title="Drag to reorder spools (Top spool is default for new quotes)"
                        >
                          <span className="text-sm font-mono font-bold">⠿</span>
                        </div>
                        <div className="flex flex-col">
                          {mainIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMove(filament.id, 'up')}
                              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-black/20 text-[9px] leading-none"
                              title="Move spool up"
                            >
                              ▲
                            </button>
                          )}
                          {mainIndex < filaments.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMove(filament.id, 'down')}
                              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-black/20 text-[9px] leading-none"
                              title="Move spool down"
                            >
                              ▼
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Swatch indicator */}
                      <span
                        className={`w-7 h-7 rounded-full border shadow-inner flex-shrink-0 ${
                          isLightBg ? 'border-black/30 ring-1 ring-black/10' : 'border-white/40 ring-1 ring-white/20'
                        }`}
                        style={bgStyle}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {filament.masterCode && (
                            <span
                              className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-950/90 border border-cyan-400/80 text-cyan-300 shadow-sm flex items-center gap-0.5 flex-shrink-0"
                              title={`Master Code v0.1: #${filament.masterCode} (${decodeMasterCode(filament.masterCode).summary})`}
                            >
                              <span className="text-[10px] text-cyan-400/70">#</span>
                              {filament.masterCode}
                            </span>
                          )}
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

                          {isDefaultSpool && (
                            <span className="text-[10px] bg-amber-500/25 border border-amber-400/50 text-amber-200 px-2 py-0.2 rounded-full font-bold flex-shrink-0 flex items-center gap-1 shadow-xs">
                              <span>⭐ Default Spool</span>
                            </span>
                          )}

                          {isTechnicalRisk && displayRiskRate !== null && (
                            <span
                              className="text-[10px] bg-amber-950/90 border border-amber-500/60 text-amber-300 px-2 py-0.2 rounded-full font-bold flex-shrink-0 flex items-center gap-1"
                              title={`Elevated failure risk rate applied in quotes: ${displayRiskRate}%`}
                            >
                              <span>⚡ {materialCat.toUpperCase()} ({displayRiskRate}%)</span>
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

                          {filament.actual_spool_weight !== null && filament.actual_spool_weight !== undefined && (
                            <span className={`px-1.5 py-0.2 rounded border text-[11px] font-mono ${
                              isLightBg ? 'bg-black/10 border-black/20 text-slate-900 font-medium' : 'bg-cyan-950/70 border-cyan-500/40 text-cyan-300'
                            }`} title="Measured gross spool weight on digital scale">
                              ⚖️ Scale: {filament.actual_spool_weight}g
                            </span>
                          )}

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

                          {isFilamentPla(filament) && filament.isRandomEligible && (
                            <span className={`px-1.5 py-0.2 rounded border text-[11px] font-medium flex items-center gap-1 ${
                              isLightBg ? 'bg-purple-600/15 border-purple-600/30 text-purple-900' : 'bg-purple-900/60 border-purple-400/50 text-purple-200'
                            }`} title="Included in Random Maker's Choice PLA pool">
                              <span>🎲 Random Pool</span>
                              <span className="font-bold">✓</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      {isFilamentPla(filament) && (
                        <button
                          type="button"
                          onClick={() => handleToggleRandomEligible(filament.id)}
                          className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                            filament.isRandomEligible
                              ? 'bg-purple-600/90 hover:bg-purple-500 border-purple-300 text-white shadow-sm'
                              : isLightBg
                                ? 'bg-black/5 hover:bg-black/10 border-black/20 text-slate-700'
                                : 'bg-slate-800/80 hover:bg-slate-700 border-slate-600 text-slate-300'
                          }`}
                          title={filament.isRandomEligible ? "Eligible for Surprise / Maker's Choice PLA (Click to exclude)" : "Excluded from Surprise / Maker's Choice PLA (Click to include)"}
                        >
                          <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[10px] font-bold ${
                            filament.isRandomEligible 
                              ? 'bg-white text-purple-700 border-white shadow-xs' 
                              : 'border-slate-400/60 bg-transparent text-transparent'
                          }`}>
                            ✓
                          </span>
                          <span className="text-[11px] hidden sm:inline">Random</span>
                        </button>
                      )}
                      {!isDefaultSpool && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(filament.id)}
                          className={`text-[11px] font-medium px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                            isLightBg
                              ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                              : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-200'
                          }`}
                          title="Make this spool the default for new quotes"
                        >
                          <span>⭐ Set Default</span>
                        </button>
                      )}
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
                        type="button"
                        onClick={() => handleOpenWeighModal(filament)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          isLightBg
                            ? 'bg-black/10 hover:bg-black/20 text-slate-900'
                            : 'bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300'
                        }`}
                        title="Weigh this spool on your digital scale to update actual weight & usable filament"
                      >
                        <span className="text-sm">⚖️</span>
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

      {/* Quick Weigh Modal */}
      {weighingFilament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Weigh Spool on Scale</h3>
                  <p className="text-xs text-slate-400">Record actual gross weight from digital scale</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWeighingFilament(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-lg transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Spool Info */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center gap-3">
              <span
                className="w-8 h-8 rounded-full border border-white/20 shadow-inner flex-shrink-0"
                style={{ backgroundColor: weighingFilament.colorHex || '#3b82f6' }}
              />
              <div className="min-w-0">
                <div className="font-bold text-slate-100 text-sm truncate">
                  {weighingFilament.brand} {weighingFilament.type || weighingFilament.name}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span>{weighingFilament.colorName || 'Default Color'}</span>
                  <span>•</span>
                  <span>Tare: {weighingFilament.empty_spool_weight ?? 240}g</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveScaleWeight} className="space-y-4">
              <div>
                <label htmlFor="modalScaleWeight" className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Scale Reading (Gross Grams)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="modalScaleWeight"
                    autoFocus
                    value={scaleWeightInput}
                    onChange={(e) => setScaleWeightInput(e.target.value)}
                    placeholder="e.g. 1240"
                    step="1"
                    min="0"
                    className="w-full bg-slate-800 border border-cyan-500/70 rounded-xl py-2.5 px-3.5 text-xl font-mono font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
                  />
                  <span className="absolute right-3.5 top-3 text-sm font-semibold text-slate-400">grams</span>
                </div>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Weigh the entire spool on your digital scale and enter the gross reading.
                </span>
              </div>

              {/* Live Math Calculation Preview */}
              {(() => {
                const parsedGross = parseFloat(scaleWeightInput);
                const tare = weighingFilament.empty_spool_weight ?? 240;
                const hasValidGross = !isNaN(parsedGross) && parsedGross >= 0;
                const calcNet = hasValidGross ? Math.max(0, parseFloat((parsedGross - tare).toFixed(1))) : (weighingFilament.remaining_grams ?? 0);
                const isUnderTare = hasValidGross && parsedGross < tare;

                return (
                  <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Scale Gross Reading:</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {hasValidGross ? `${parsedGross}g` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Empty Spool Tare:</span>
                      <span className="font-mono font-semibold text-slate-300">− {tare}g</span>
                    </div>
                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                      <span className="font-bold text-slate-200">Net Usable Filament:</span>
                      <span className={`font-mono font-extrabold text-base ${isUnderTare ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {hasValidGross ? `${calcNet}g` : `${weighingFilament.remaining_grams ?? 0}g (current)`}
                      </span>
                    </div>
                    {isUnderTare && (
                      <div className="text-[11px] text-amber-300 bg-amber-950/50 p-1.5 rounded border border-amber-800">
                        ⚠️ Scale reading is lower than tare ({tare}g). Double-check tare or zero your scale.
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Quick Presets */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Quick Presets:</label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const tare = weighingFilament.empty_spool_weight ?? 240;
                      setScaleWeightInput(String(1000 + tare));
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-700 transition font-medium cursor-pointer"
                  >
                    Full (1kg+Tare)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tare = weighingFilament.empty_spool_weight ?? 240;
                      setScaleWeightInput(String(500 + tare));
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 px-2 rounded-lg border border-slate-700 transition font-medium cursor-pointer"
                  >
                    Half (500g+Tare)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tare = weighingFilament.empty_spool_weight ?? 240;
                      setScaleWeightInput(String(tare));
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-rose-300 py-1.5 px-2 rounded-lg border border-slate-700 transition font-medium cursor-pointer"
                  >
                    Empty ({weighingFilament.empty_spool_weight ?? 240}g)
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setWeighingFilament(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>✓ Save Spool Weight</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Code Visual Builder Modal */}
      {showMasterCodeBuilder && (
        <FilamentMasterCodeModal
          isOpen={showMasterCodeBuilder}
          onClose={() => setShowMasterCodeBuilder(false)}
          initialCode={editingFilament.masterCode}
          onApplyCode={handleApplyMasterCode}
        />
      )}
    </div>
  );
};

export default ConfigurationPage;
