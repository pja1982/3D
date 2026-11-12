import React, { useState, useEffect, useRef } from 'react';
import type { Part, Filament, Printer, GeneralSettings } from '../types';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import CubeIcon from './icons/CubeIcon';
import PhotoIcon from './icons/PhotoIcon';
import CameraIcon from './icons/CameraIcon';
import MarkdownIcon from './icons/MarkdownIcon';
import ImageModal from './ImageModal';
import { compressAndFormatImage, isValidImageFile } from '../utils/imageUtils';
import {
  generatePartMarkdown,
  generateAllPartsMarkdown,
  downloadMarkdownFile,
} from '../utils/markdownExport';
import { getFilamentBackgroundStyle } from '../utils/filamentProfilesSync';
import { SquareExportModal } from './SquareExportModal';
import { calculatePartPricing } from '../utils/partPricing';

interface PartsPageProps {
  parts: Part[];
  filaments?: Filament[];
  printers?: Printer[];
  generalSettings?: GeneralSettings;
  onAdd: (part: Omit<Part, 'id'>) => void;
  onUpdate: (part: Part) => void;
  onDelete: (id: string) => void;
}

const emptyPart: Omit<Part, 'id'> = {
  name: '',
  description: '',
  filamentGrams: 50,
  printHours: 2.5,
  postProcessingHours: 0.25,
  hardwareCost: 0,
  imageUrl: '',
  customUnitPrice: null,
  filamentId: null,
  isPrintOnDemand: false,
  licensingTermsAccepted: false,
  sku: '',
  category: '',
  isCommercialLicense: false,
  licenseTierName: '',
  licenseFeePerUnit: null,
  licenseMonthlyCost: null,
  licenseEstimatedUnitsPerMonth: null,
  maxPartsPerBuildPlate: null,
};

const formatDuration = (hours: number) => {
  const h = Math.floor(hours || 0);
  const m = Math.round(((hours || 0) - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const PartsPage: React.FC<PartsPageProps> = ({
  parts,
  filaments = [],
  printers = [],
  generalSettings,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [editingPart, setEditingPart] = useState<Omit<Part, 'id'> | Part>(emptyPart);
  const [isEditing, setIsEditing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [modalImage, setModalImage] = useState<{ url: string; title: string } | null>(null);
  const [showSquareModal, setShowSquareModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && 'id' in editingPart && !parts.find(p => p.id === editingPart.id)) {
      handleCancelEdit();
    }
  }, [parts, isEditing, editingPart]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name, value } = target;
    const type = 'type' in target ? target.type : '';
    const checked = 'checked' in target ? (target as HTMLInputElement).checked : false;

    if (type === 'checkbox') {
      setEditingPart(prev => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    if (name === 'customUnitPrice') {
      const trimmed = value.trim();
      const numVal = trimmed === '' ? null : parseFloat(trimmed);
      setEditingPart(prev => ({
        ...prev,
        customUnitPrice: numVal === null || isNaN(numVal) ? null : Math.max(0, numVal),
      }));
    } else if (name === 'maxPartsPerBuildPlate') {
      const trimmed = value.trim();
      const numVal = trimmed === '' ? null : parseInt(trimmed, 10);
      setEditingPart(prev => ({
        ...prev,
        maxPartsPerBuildPlate: numVal === null || isNaN(numVal) || numVal < 1 ? null : numVal,
      }));
    } else if (name === 'licenseFeePerUnit' || name === 'licenseMonthlyCost' || name === 'licenseEstimatedUnitsPerMonth') {
      const trimmed = value.trim();
      const numVal = trimmed === '' ? null : parseFloat(trimmed);
      setEditingPart(prev => ({
        ...prev,
        [name]: numVal === null || isNaN(numVal) ? null : Math.max(0, numVal),
      }));
    } else {
      const isNumeric = ['filamentGrams', 'hardwareCost'].includes(name);
      setEditingPart(prev => ({
        ...prev,
        [name]: isNumeric ? parseFloat(value) || 0 : value,
      }));
    }
  };

  // Multi-Color Handlers for Parts Catalog
  const isPartMultiColor = Boolean(editingPart.colors && editingPart.colors.length > 1);
  const partColors = editingPart.colors || [];

  const findWhiteFilament = () => {
    return filaments.find(f => 
      f.colorName?.toLowerCase().includes('white') || 
      f.colorHex?.toLowerCase() === '#ffffff' || 
      f.colorHex?.toLowerCase() === '#f8fafc' ||
      f.colorHex?.toLowerCase() === '#fff'
    );
  };

  const handleEnableMultiColor = () => {
    const totalG = editingPart.filamentGrams || 50;
    const primaryGrams = Math.round(totalG * 0.7) || 35;
    const secondaryGrams = Math.max(5, totalG - primaryGrams) || 15;
    const primaryFilId = filaments[0]?.id || null;
    const whiteFil = findWhiteFilament();
    const secondaryFil = whiteFil || filaments.find(f => f.id !== primaryFilId) || filaments[0];

    const initialColors = [
      {
        id: `color-${Date.now()}-1`,
        filamentId: primaryFilId,
        grams: primaryGrams,
      },
      {
        id: `color-${Date.now()}-2`,
        filamentId: secondaryFil ? secondaryFil.id : primaryFilId,
        grams: secondaryGrams,
      }
    ];

    setEditingPart(prev => ({
      ...prev,
      colors: initialColors,
      filamentGrams: primaryGrams + secondaryGrams,
    }));
  };

  const handleSwitchToSingleColor = () => {
    setEditingPart(prev => {
      const total = prev.colors?.reduce((sum, c) => sum + (c.grams || 0), 0) || prev.filamentGrams || 50;
      return {
        ...prev,
        colors: undefined,
        filamentGrams: total,
      };
    });
  };

  const handleAddColor = () => {
    setEditingPart(prev => {
      const existing = prev.colors || [];
      const usedIds = new Set(existing.map(c => c.filamentId));
      const whiteFil = findWhiteFilament();
      const nextFil = (whiteFil && !usedIds.has(whiteFil.id)) ? whiteFil : filaments.find(f => !usedIds.has(f.id)) || filaments[0];

      const newColor = {
        id: `color-${Date.now()}-${existing.length + 1}`,
        filamentId: nextFil ? nextFil.id : (filaments[0]?.id || null),
        grams: 20,
      };
      const updated = [...existing, newColor];
      const total = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
      return {
        ...prev,
        colors: updated,
        filamentGrams: total,
      };
    });
  };

  const handleRemoveColor = (colorId: string) => {
    setEditingPart(prev => {
      const updated = (prev.colors || []).filter(c => c.id !== colorId);
      const total = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
      return {
        ...prev,
        colors: updated.length <= 1 ? undefined : updated,
        filamentGrams: total,
      };
    });
  };

  const handleColorFilamentChange = (colorId: string, filamentId: string) => {
    setEditingPart(prev => ({
      ...prev,
      colors: (prev.colors || []).map(c => c.id === colorId ? { ...c, filamentId } : c),
    }));
  };

  const handleColorGramsChange = (colorId: string, grams: number) => {
    setEditingPart(prev => {
      const updated = (prev.colors || []).map(c => c.id === colorId ? { ...c, grams: Math.max(0, grams) } : c);
      const total = updated.reduce((sum, c) => sum + (c.grams || 0), 0);
      return {
        ...prev,
        colors: updated,
        filamentGrams: total,
      };
    });
  };

  const handleAutoDistributeWeights = () => {
    setEditingPart(prev => {
      if (!prev.colors || prev.colors.length === 0) return prev;
      const totalTarget = prev.filamentGrams || 100;
      const count = prev.colors.length;
      const base = Math.floor(totalTarget / count);
      const remainder = totalTarget - (base * count);
      const updated = prev.colors.map((c, i) => ({
        ...c,
        grams: base + (i === 0 ? remainder : 0),
      }));
      return { ...prev, colors: updated };
    });
  };

  const handleFillUpWeights = () => {
    setEditingPart(prev => {
      if (!prev.colors || prev.colors.length === 0) return prev;
      const totalTarget = prev.filamentGrams || 100;
      const currentSum = prev.colors.reduce((sum, c) => sum + (c.grams || 0), 0);
      const emptySlots = prev.colors.filter(c => !c.grams || c.grams <= 0);

      if (emptySlots.length > 0 && totalTarget > currentSum) {
        const remaining = totalTarget - currentSum;
        const each = Math.max(5, Math.floor(remaining / emptySlots.length));
        const remPart = remaining - (each * emptySlots.length);
        let firstEmpty = true;
        const updated = prev.colors.map(c => {
          if (!c.grams || c.grams <= 0) {
            const add = each + (firstEmpty ? remPart : 0);
            firstEmpty = false;
            return { ...c, grams: add };
          }
          return c;
        });
        const finalSum = updated.reduce((s, c) => s + (c.grams || 0), 0);
        return { ...prev, colors: updated, filamentGrams: finalSum };
      } else {
        const base = Math.floor(totalTarget / prev.colors.length);
        const rem = totalTarget - (base * prev.colors.length);
        const updated = prev.colors.map((c, i) => ({
          ...c,
          grams: base + (i === 0 ? rem : 0),
        }));
        return { ...prev, colors: updated };
      }
    });
  };

  const handleFillWhiteAccent = () => {
    const whiteFil = findWhiteFilament();
    const whiteId = whiteFil ? whiteFil.id : (filaments[0]?.id || null);
    setEditingPart(prev => {
      const colors = prev.colors || [];
      if (colors.length === 0) {
        const total = prev.filamentGrams || 50;
        const whiteGrams = Math.max(10, Math.round(total * 0.3));
        const primaryGrams = Math.max(10, total - whiteGrams);
        return {
          ...prev,
          colors: [
            { id: `color-${Date.now()}-1`, filamentId: filaments[0]?.id || null, grams: primaryGrams },
            { id: `color-${Date.now()}-2`, filamentId: whiteId, grams: whiteGrams },
          ],
          filamentGrams: primaryGrams + whiteGrams,
        };
      }
      
      const existingWhiteIdx = colors.findIndex(c => {
        const fil = filaments.find(f => f.id === c.filamentId);
        return fil?.colorName?.toLowerCase().includes('white') || fil?.colorHex?.toLowerCase() === '#ffffff' || fil?.colorHex?.toLowerCase() === '#f8fafc';
      });

      if (existingWhiteIdx >= 0) {
        const updated = [...colors];
        if (!updated[existingWhiteIdx].grams || updated[existingWhiteIdx].grams < 10) {
          updated[existingWhiteIdx] = { ...updated[existingWhiteIdx], grams: 25 };
        }
        const total = updated.reduce((s, c) => s + (c.grams || 0), 0);
        return { ...prev, colors: updated, filamentGrams: total };
      } else {
        const updated = [
          ...colors,
          { id: `color-${Date.now()}-${colors.length + 1}`, filamentId: whiteId, grams: 25 }
        ];
        const total = updated.reduce((s, c) => s + (c.grams || 0), 0);
        return { ...prev, colors: updated, filamentGrams: total };
      }
    });
  };

  const totalPartMaterialCost = isPartMultiColor
    ? partColors.reduce((sum, c) => {
        const fil = filaments.find(f => f.id === c.filamentId);
        return sum + ((c.grams || 0) / 1000) * (fil?.costPerKg || 0);
      }, 0)
    : ((editingPart.filamentGrams || 0) / 1000) * (filaments[0]?.costPerKg || 20);

  // Photo handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isValidImageFile(file)) {
      alert('Please choose a valid image file (JPG, PNG, WEBP, etc.)');
      return;
    }

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressAndFormatImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.82,
      });
      setEditingPart(prev => ({ ...prev, imageUrl: compressedDataUrl }));
    } catch (err) {
      console.error('Failed to compress image', err);
      alert('Error processing photo. Please try a different image.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApplyUrl = () => {
    if (urlInput.trim()) {
      setEditingPart(prev => ({ ...prev, imageUrl: urlInput.trim() }));
      setUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleRemovePhoto = () => {
    setEditingPart(prev => ({ ...prev, imageUrl: '' }));
  };

  // Print Time: Hours and Minutes
  let displayPrintHours = Math.floor(editingPart.printHours || 0);
  let displayPrintMinutes = Math.round(((editingPart.printHours || 0) - displayPrintHours) * 60);
  if (displayPrintMinutes === 60) {
    displayPrintHours += 1;
    displayPrintMinutes = 0;
  }

  const handlePrintHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hours = parseInt(e.target.value, 10) || 0;
    if (hours < 0) hours = 0;
    const newHours = hours + displayPrintMinutes / 60;
    setEditingPart(prev => ({ ...prev, printHours: parseFloat(newHours.toFixed(4)) }));
  };

  const handlePrintMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newHours = displayPrintHours + minutes / 60;
    setEditingPart(prev => ({ ...prev, printHours: parseFloat(newHours.toFixed(4)) }));
  };

  // Post-Processing Time: Hours and Minutes
  let displayPostHours = Math.floor(editingPart.postProcessingHours || 0);
  let displayPostMinutes = Math.round(((editingPart.postProcessingHours || 0) - displayPostHours) * 60);
  if (displayPostMinutes === 60) {
    displayPostHours += 1;
    displayPostMinutes = 0;
  }

  const handlePostHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let hours = parseInt(e.target.value, 10) || 0;
    if (hours < 0) hours = 0;
    const newHours = hours + displayPostMinutes / 60;
    setEditingPart(prev => ({ ...prev, postProcessingHours: parseFloat(newHours.toFixed(4)) }));
  };

  const handlePostMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let minutes = parseInt(e.target.value, 10) || 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    const newHours = displayPostHours + minutes / 60;
    setEditingPart(prev => ({ ...prev, postProcessingHours: parseFloat(newHours.toFixed(4)) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart.name) return;

    if (isEditing && 'id' in editingPart) {
      onUpdate(editingPart as Part);
    } else {
      onAdd(editingPart);
    }
    handleCancelEdit();
  };

  const handleSaveAsNewFromTemplate = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!editingPart.name) return;

    const baseName = editingPart.name;
    const newName = baseName.includes('(Copy)') || baseName.includes('(New)') 
      ? baseName 
      : `${baseName} (Copy)`;

    const { id: _unusedId, ...restPart } = editingPart as any;
    onAdd({
      ...restPart,
      name: newName,
    });
    handleCancelEdit();
  };
  
  const handleEdit = (part: Part) => {
    setEditingPart({
      ...part,
      colors: part.colors ? part.colors.map(c => ({ ...c })) : undefined,
    });
    setIsEditing(true);
    setShowUrlInput(false);
  };

  const handleUseAsTemplate = (part: Part) => {
    setEditingPart({
      ...part,
      name: `${part.name} (Copy)`,
      colors: part.colors ? part.colors.map(c => ({ ...c, id: `color-${Date.now()}-${Math.random()}` })) : undefined,
    });
    setIsEditing(false); // In add mode, pre-filled with this template!
    setShowUrlInput(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleCancelEdit = () => {
    setEditingPart(emptyPart);
    setIsEditing(false);
    setShowUrlInput(false);
    setUrlInput('');
  };

  // Markdown Export handlers
  const handleExportSinglePart = (part: Part) => {
    const cleanName = (part.name || 'Part').replace(/[^a-zA-Z0-9_-]/g, '_');
    const md = generatePartMarkdown(part, filaments, printers);
    downloadMarkdownFile(`Part_${cleanName}.md`, md);
  };

  const handleExportAllMarkdown = () => {
    if (parts.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllPartsMarkdown(parts, filaments, printers);
    downloadMarkdownFile(`3D_Print_Parts_Catalog_Obsidian_${today}.md`, md);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 pb-12">
      {/* Form Column */}
      <div className="md:col-span-1 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
        <h2 className="flex items-center gap-3 text-2xl font-semibold text-cyan-400 border-b border-slate-600 pb-2 mb-4">
          <CubeIcon className="w-7 h-7" />
          {isEditing ? 'Edit Part' : 'Add New Part'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Part Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={editingPart.name}
              onChange={handleChange}
              placeholder="e.g., Benchy, Filament Spool Roller"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={editingPart.description}
              onChange={handleChange}
              placeholder="e.g., Calibration boat or assembly part details"
              rows={2}
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Part Photo Section */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80">
            <label className="block text-sm font-medium text-cyan-300 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <PhotoIcon className="w-4 h-4 text-cyan-400" />
                Part Photo / Model Render
              </span>
              {editingPart.imageUrl && (
                <span className="text-[11px] text-green-400 font-normal">✓ Photo attached</span>
              )}
            </label>

            {editingPart.imageUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 flex flex-col items-center">
                <img
                  src={editingPart.imageUrl}
                  alt={editingPart.name || 'Part Photo'}
                  className="w-full h-36 object-contain bg-slate-950/80 cursor-pointer"
                  onClick={() => setModalImage({ url: editingPart.imageUrl!, title: editingPart.name || 'Part Photo' })}
                  title="Click to view full size"
                />
                <div className="w-full flex items-center justify-between p-2 bg-slate-900/90 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                  >
                    Change Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-red-400 hover:text-red-300 font-medium transition flex items-center gap-1"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="w-full border-2 border-dashed border-slate-600 hover:border-cyan-400/80 hover:bg-slate-800/60 rounded-xl p-3 text-center transition flex flex-col items-center justify-center gap-1.5 text-slate-300 cursor-pointer"
                  >
                    <CameraIcon className="w-6 h-6 text-cyan-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      {isCompressing ? 'Compressing photo...' : 'Upload Photo / Camera'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      JPG, PNG, WEBP (auto-compressed)
                    </span>
                  </button>

                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Or use web link</span>
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-cyan-400 hover:text-cyan-300 font-medium"
                    >
                      {showUrlInput ? 'Cancel' : '+ Paste Image URL'}
                    </button>
                  </div>

                  {showUrlInput && (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/part.jpg"
                        className="flex-1 bg-slate-800 border border-slate-600 rounded-md py-1 px-2.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                      <button
                        type="button"
                        onClick={handleApplyUrl}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded-md font-medium transition"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filament Weight & Multi-Color Section */}
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🧵</span>
                <span className="text-sm font-semibold text-slate-200">
                  {isPartMultiColor ? `Multi-Color Setup (${partColors.length} Colors)` : 'Filament & Weight'}
                </span>
                {isPartMultiColor ? (
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-600/50 px-2 py-0.5 rounded-full font-bold">
                    Multi-Color Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full">
                    Single Color
                  </span>
                )}
              </div>

              {!isPartMultiColor ? (
                <button
                  type="button"
                  onClick={handleEnableMultiColor}
                  className="text-xs bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 hover:text-white px-2.5 py-1 rounded-md border border-purple-500/40 transition font-medium flex items-center gap-1 shadow-xs"
                  title="Enable multi-color print with individual filament weights"
                >
                  <span>🎨 + Multi-Color (AMS / MMU)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSwitchToSingleColor}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded-md border border-slate-700 transition"
                  title="Switch back to single filament color"
                >
                  Switch to Single
                </button>
              )}
            </div>

            {!isPartMultiColor ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="filamentId" className="block text-xs font-medium text-slate-300 mb-1">
                    Base Filament / Material
                  </label>
                  <select
                    id="filamentId"
                    name="filamentId"
                    value={editingPart.filamentId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditingPart(prev => ({ ...prev, filamentId: val || null }));
                    }}
                    className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-xs"
                  >
                    <option value="">Default Material (Quote Fallback)</option>
                    {filaments.map(fil => (
                      <option key={fil.id} value={fil.id}>
                        {fil.brand} - {fil.type}{fil.colorName ? ` (${fil.colorName})` : ''} — ${fil.costPerKg.toFixed(2)}/kg
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="filamentGrams" className="block text-xs font-medium text-slate-300 mb-1">
                    Total Filament Weight (grams)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="filamentGrams"
                      name="filamentGrams"
                      value={editingPart.filamentGrams}
                      onChange={handleChange}
                      min="0"
                      step="0.1"
                      className="w-full bg-slate-800 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400">grams</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Multi-Color Slots */
              <div className="space-y-2.5">
                <div className="space-y-2">
                  {partColors.map((colorItem, index) => {
                    const fil = filaments.find(f => f.id === colorItem.filamentId);
                    const itemCost = fil ? ((colorItem.grams || 0) / 1000) * fil.costPerKg : 0;

                    return (
                      <div
                        key={colorItem.id}
                        className="p-2.5 bg-slate-800/90 border border-slate-700 rounded-lg space-y-2 relative group hover:border-slate-600 transition"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-500 shadow-xs flex-shrink-0"
                              style={getFilamentBackgroundStyle(fil?.colorHex, fil?.rgb)}
                            />
                            <span className="font-semibold text-slate-200">
                              Color #{index + 1} {index === 0 ? '(Primary / Base)' : ''}
                            </span>
                            {fil?.colorName && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                ({fil.colorName})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-400 text-xs">
                              ${itemCost.toFixed(2)}
                            </span>
                            {partColors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveColor(colorItem.id)}
                                className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-700 transition"
                                title="Remove this color slot"
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="sm:col-span-2">
                            <select
                              value={colorItem.filamentId || ''}
                              onChange={(e) => handleColorFilamentChange(colorItem.id, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 rounded-md py-1.5 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 truncate"
                            >
                              {filaments.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.brand} - {f.type || f.name}{f.colorName ? ` (${f.colorName})` : ''} (${f.costPerKg.toFixed(2)}/kg)
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={colorItem.grams}
                              onChange={(e) => handleColorGramsChange(colorItem.id, parseFloat(e.target.value) || 0)}
                              placeholder="Weight (g)"
                              className="w-full bg-slate-900 border border-slate-600 rounded-md py-1.5 px-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 text-right font-mono"
                            />
                            <span className="text-xs text-slate-400">g</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multi-Color Action Buttons: Add, Distribute Weights, Fill Weights, Fill White */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white font-medium py-1 px-2.5 rounded-lg transition flex items-center gap-1 shadow-xs"
                    title="Add another filament color slot"
                  >
                    <span>+ Add Color</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAutoDistributeWeights}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 px-2.5 rounded-lg border border-slate-700 transition"
                    title="Evenly divide the total weight across all selected colors"
                  >
                    <span>⚖️ Distribute Weights</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillUpWeights}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 py-1 px-2.5 rounded-lg border border-slate-700 transition"
                    title="Fill in missing or remaining weights to match total weight"
                  >
                    <span>⚡ Fill Weights</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillWhiteAccent}
                    className="text-xs bg-slate-100 hover:bg-white text-slate-900 font-semibold py-1 px-2.5 rounded-lg transition shadow-xs flex items-center gap-1"
                    title="Ensure a White filament slot is selected and filled with weight"
                  >
                    <span>⚪ Fill with White</span>
                  </button>
                </div>

                {/* Total Summary Footer */}
                <div className="flex justify-between items-center text-xs bg-slate-950/80 p-2 rounded-lg border border-slate-800 text-slate-300">
                  <span>
                    Total Part Weight: <strong className="text-white font-mono">{editingPart.filamentGrams}g</strong>
                  </span>
                  <span>
                    Est. Material Cost: <strong className="text-cyan-400 font-mono">${totalPartMaterialCost.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Print Time: Hours and Minutes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Print Time</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    id="partPrintHours"
                    value={displayPrintHours}
                    onChange={handlePrintHoursChange}
                    min="0"
                    step="1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-xs text-slate-400">hours</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    id="partPrintMinutes"
                    value={displayPrintMinutes}
                    onChange={handlePrintMinutesChange}
                    min="0"
                    max="59"
                    step="1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-xs text-slate-400">minutes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Post-Processing Time: Hours and Minutes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Post-Processing Time</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    id="partPostHours"
                    value={displayPostHours}
                    onChange={handlePostHoursChange}
                    min="0"
                    step="1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-xs text-slate-400">hours</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center">
                  <input
                    type="number"
                    id="partPostMinutes"
                    value={displayPostMinutes}
                    onChange={handlePostMinutesChange}
                    min="0"
                    max="59"
                    step="1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="ml-2 text-xs text-slate-400">minutes</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="hardwareCost" className="block text-sm font-medium text-slate-300 mb-1">
              Additional Hardware Cost ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                id="hardwareCost"
                name="hardwareCost"
                value={editingPart.hardwareCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 pl-7 pr-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
          </div>

          {/* Max Parts per Build Plate / Bed */}
          <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/80">
            <label htmlFor="maxPartsPerBuildPlate" className="block text-sm font-medium text-slate-200 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold">
                <span>🔲 Max Parts per Build Plate / Bed</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Optional</span>
            </label>
            <div className="relative">
              <input
                type="number"
                id="maxPartsPerBuildPlate"
                name="maxPartsPerBuildPlate"
                value={editingPart.maxPartsPerBuildPlate ?? ''}
                onChange={handleChange}
                min="1"
                step="1"
                placeholder="e.g. 4 (leave blank for unlimited)"
                className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Maximum copies that fit on one build plate. Automatically calculates required bed batches in quotes.
            </span>
          </div>

          {/* Custom Selling Price Section with Cal Price & Markup % */}
          {(() => {
            const formPricing = calculatePartPricing(editingPart, filaments, printers, generalSettings);

            return (
              <div className="bg-slate-900/80 p-3.5 rounded-xl border border-amber-500/50 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="customUnitPrice" className="block text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <span>💵 Custom Selling Price ($/unit)</span>
                  </label>
                  {typeof editingPart.customUnitPrice === 'number' && (
                    <button
                      type="button"
                      onClick={() => setEditingPart(prev => ({ ...prev, customUnitPrice: null }))}
                      className="text-xs text-amber-400 hover:text-amber-200 underline"
                      title="Clear custom unit price and use automatic calculation"
                    >
                      ↺ Reset to Auto
                    </button>
                  )}
                </div>

                {/* Real-time Cost, Cal Price & Markup % Display */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Est. Cost</span>
                    <span className="font-mono font-semibold text-slate-300">${formPricing.costWithFailureRate.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-cyan-400 block font-semibold flex items-center gap-1">
                      <span>Cal Price</span>
                      <span className="text-[9px] text-cyan-500 font-normal">({generalSettings?.profitMargin ?? 30}%)</span>
                    </span>
                    <span className="font-mono font-bold text-cyan-300">${formPricing.calculatedPrice.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Markup %</span>
                    <span className={`font-mono font-bold ${
                      formPricing.markupPercent >= 50 ? 'text-emerald-400' :
                      formPricing.markupPercent >= 20 ? 'text-cyan-400' :
                      formPricing.markupPercent >= 0 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {formPricing.markupPercent >= 0 ? `+${formPricing.markupPercent.toFixed(1)}%` : `${formPricing.markupPercent.toFixed(1)}%`}
                    </span>
                  </div>
                </div>

                {formPricing.licenseCost > 0 && (
                  <div className="flex items-center justify-between text-[11px] bg-purple-950/60 border border-purple-800/60 px-2.5 py-1 rounded text-purple-200">
                    <span className="flex items-center gap-1">
                      <span>📜</span>
                      <span>Commercial License Overhead:</span>
                    </span>
                    <span className="font-mono font-bold text-purple-300">
                      +${formPricing.licenseCost.toFixed(2)} / unit absorbed
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 font-mono font-bold">$</span>
                    <input
                      type="number"
                      id="customUnitPrice"
                      name="customUnitPrice"
                      value={editingPart.customUnitPrice !== undefined && editingPart.customUnitPrice !== null ? editingPart.customUnitPrice : ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      placeholder={`Auto: $${formPricing.calculatedPrice.toFixed(2)}`}
                      className="w-full bg-slate-800 border border-amber-500/60 rounded-lg py-2 pl-7 pr-3 text-amber-300 font-bold placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>

                  {formPricing.calculatedPrice > 0 && (
                    <button
                      type="button"
                      onClick={() => setEditingPart(prev => ({ ...prev, customUnitPrice: formPricing.calculatedPrice }))}
                      className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-700/60 text-xs px-2.5 py-2 rounded-lg transition font-mono shrink-0 flex items-center gap-1"
                      title="Set custom price to calculated formula price"
                    >
                      <span>⚡ Cal Price</span>
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug">
                  Set the price charged for this part. Used on customer quotes and exported directly to Square POS as the item price.
                </p>
              </div>
            );
          })()}

          {/* Commercial Subscription License (Creator Tier Overhead) */}
          <div className="bg-slate-900/75 p-3.5 rounded-xl border border-purple-500/50 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="isCommercialLicense"
                  name="isCommercialLicense"
                  checked={Boolean(editingPart.isCommercialLicense || (editingPart.licenseFeePerUnit && editingPart.licenseFeePerUnit > 0))}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditingPart(prev => ({
                      ...prev,
                      isCommercialLicense: checked,
                      licenseFeePerUnit: checked ? (prev.licenseFeePerUnit ?? 1.50) : null,
                    }));
                  }}
                  className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500 bg-slate-800"
                />
                <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>📜 Commercial Subscription License</span>
                  <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-700/60 px-1.5 py-0.2 rounded font-medium">
                    Creator Tier
                  </span>
                </span>
              </label>
              {(editingPart.isCommercialLicense || (editingPart.licenseFeePerUnit && editingPart.licenseFeePerUnit > 0)) && (
                <span className="text-[11px] text-purple-300 font-mono font-bold">
                  ${(editingPart.licenseFeePerUnit || 0).toFixed(2)} / print
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Commercial rights from a recurring designer subscription (Patreon, Thangs, Printables Club). This overhead is <strong>invisibly absorbed into your unit cost and retail price</strong>—never itemized as a separate line item on customer invoices.
            </p>

            {(editingPart.isCommercialLicense || (editingPart.licenseFeePerUnit && editingPart.licenseFeePerUnit > 0)) && (
              <div className="pt-2 border-t border-purple-900/60 space-y-3 animate-fade-in">
                {/* Designer / Tier Name */}
                <div>
                  <label htmlFor="licenseTierName" className="block text-[11px] font-medium text-slate-300 mb-1">
                    Designer / Commercial Tier Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="licenseTierName"
                    name="licenseTierName"
                    value={editingPart.licenseTierName || ''}
                    onChange={handleChange}
                    placeholder="e.g. FlexiFactory Patreon, Zou3D Commercial, Printables Club"
                    className="w-full bg-slate-800 border border-slate-600 rounded py-1.5 px-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* Direct Allocated Fee Per Unit */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="licenseFeePerUnit" className="block text-[11px] font-bold text-purple-300">
                      Allocated License Fee Per Unit ($/print)
                    </label>
                    <span className="text-[10px] text-slate-400">Absorbed before markup</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      id="licenseFeePerUnit"
                      name="licenseFeePerUnit"
                      value={editingPart.licenseFeePerUnit !== undefined && editingPart.licenseFeePerUnit !== null ? editingPart.licenseFeePerUnit : ''}
                      onChange={handleChange}
                      min="0"
                      step="0.05"
                      placeholder="1.50"
                      className="w-full bg-slate-800 border border-purple-500/70 rounded-md py-1.5 pl-7 pr-3 text-purple-200 font-mono text-xs font-bold focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Built-in Subscription Amortization Allocator (Quick Calculator) */}
                <div className="bg-slate-950/80 p-3 rounded-lg border border-purple-950/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-purple-300 flex items-center gap-1">
                      <span>⚡</span>
                      <span>Quick Subscription Cost Allocator</span>
                    </span>
                    <span className="text-[10px] text-slate-400">Monthly Tier ÷ Expected Volume</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="licenseMonthlyCost" className="block text-[10px] text-slate-400 mb-0.5">
                        Monthly Subscription ($/mo)
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-slate-500 text-[11px]">$</span>
                        <input
                          type="number"
                          id="licenseMonthlyCost"
                          name="licenseMonthlyCost"
                          value={editingPart.licenseMonthlyCost !== undefined && editingPart.licenseMonthlyCost !== null ? editingPart.licenseMonthlyCost : ''}
                          onChange={handleChange}
                          min="0"
                          step="1"
                          placeholder="30.00"
                          className="w-full bg-slate-900 border border-slate-700 rounded py-1 pl-6 pr-2 text-xs text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="licenseEstimatedUnitsPerMonth" className="block text-[10px] text-slate-400 mb-0.5">
                        Est. Prints Sold / Month
                      </label>
                      <input
                        type="number"
                        id="licenseEstimatedUnitsPerMonth"
                        name="licenseEstimatedUnitsPerMonth"
                        value={editingPart.licenseEstimatedUnitsPerMonth !== undefined && editingPart.licenseEstimatedUnitsPerMonth !== null ? editingPart.licenseEstimatedUnitsPerMonth : ''}
                        onChange={handleChange}
                        min="1"
                        step="1"
                        placeholder="20"
                        className="w-full bg-slate-900 border border-slate-700 rounded py-1 px-2.5 text-xs text-slate-100 font-mono text-right"
                      />
                    </div>
                  </div>

                  {(() => {
                    const monthly = editingPart.licenseMonthlyCost || 0;
                    const units = editingPart.licenseEstimatedUnitsPerMonth || 0;
                    const calculatedPerUnit = (monthly > 0 && units > 0)
                      ? parseFloat((monthly / units).toFixed(2))
                      : null;

                    return calculatedPerUnit !== null ? (
                      <div className="flex items-center justify-between pt-1 border-t border-purple-950/60">
                        <span className="text-[11px] text-slate-300">
                          Formula: <strong className="text-white">${monthly.toFixed(2)}</strong> ÷ <strong className="text-white">{units} prints</strong> = <strong className="text-purple-300">${calculatedPerUnit.toFixed(2)} / print</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingPart(prev => ({ ...prev, licenseFeePerUnit: calculatedPerUnit }))}
                          className="bg-purple-700 hover:bg-purple-600 text-white text-[11px] px-2.5 py-1 rounded font-semibold transition flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Apply this calculated per-unit fee to the part"
                        >
                          <span>⚡ Apply ${calculatedPerUnit.toFixed(2)}/u</span>
                        </button>
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Print on Demand & Customer Licensing Section */}
          <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="isPrintOnDemand"
                  name="isPrintOnDemand"
                  checked={Boolean(editingPart.isPrintOnDemand)}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-800"
                />
                <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span>🖨️ Print on Demand</span>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-700/60 px-1.5 py-0.2 rounded font-medium">Customer Supplied Model</span>
                </span>
              </label>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              Customer has provided their own 3D model files (.STL / .STEP / .3MF) for fabrication rather than purchasing an in-house model.
            </p>

            {editingPart.isPrintOnDemand && (
              <div className="pt-2 border-t border-slate-800 space-y-2.5 animate-fade-in">
                <label className="flex items-start gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    id="licensingTermsAccepted"
                    name="licensingTermsAccepted"
                    checked={Boolean(editingPart.licensingTermsAccepted)}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 rounded border-slate-600 text-cyan-600 focus:ring-cyan-500 bg-slate-800 shrink-0"
                  />
                  <div className="text-[11px] text-slate-300 leading-snug">
                    <strong className="text-white block font-semibold mb-0.5">
                      Licensing &amp; IP Conditions Accepted
                    </strong>
                    Customer warrants they hold valid commercial fabrication rights, Creative Commons authorization, or original design ownership.
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label htmlFor="sku" className="block text-[11px] font-medium text-slate-300 mb-0.5">
                      SKU / Item Code (for Square POS)
                    </label>
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      value={editingPart.sku || ''}
                      onChange={handleChange}
                      placeholder="e.g. POD-001"
                      className="w-full bg-slate-800 border border-slate-600 rounded py-1 px-2 text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-[11px] font-medium text-slate-300 mb-0.5">
                      Category (for Square POS)
                    </label>
                    <input
                      type="text"
                      id="category"
                      name="category"
                      value={editingPart.category || ''}
                      onChange={handleChange}
                      placeholder="Print on Demand"
                      className="w-full bg-slate-800 border border-slate-600 rounded py-1 px-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                  title="Update the existing part with your changes"
                >
                  <span>🔄 Update Part</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveAsNewFromTemplate}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-lg transition-colors shadow text-xs flex items-center justify-center gap-1.5"
                  title="Create a new part using this part's settings as a template"
                >
                  <span>📋 Save as New (from Template)</span>
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
                Add Part
              </button>
              {editingPart.name && (
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

      {/* Saved Parts List */}
      <div className="md:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700 flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-600 pb-2 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-cyan-400">
                Saved Parts
              </h2>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">
                {parts.length} {parts.length === 1 ? 'part' : 'parts'}
              </span>
            </div>

            {parts.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSquareModal(true)}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-emerald-100 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs shadow-sm"
                  title="Export parts to Square POS Item Library CSV format"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
                    <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth="2" />
                  </svg>
                  <span>Export to Square (CSV)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportAllMarkdown}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs shadow-sm"
                  title="Export all parts as Obsidian Markdown catalog notes (.md) linking to parts/ directory"
                >
                  <MarkdownIcon className="w-3.5 h-3.5" />
                  <span>Export Parts to Markdown</span>
                </button>
              </div>
            )}
          </div>

          {/* Obsidian Vault Tip */}
          <div className="bg-purple-950/30 border border-purple-800/40 rounded-xl px-3.5 py-2 mb-4 text-xs text-purple-200 flex items-center justify-between gap-2">
            <span>
              📁 <strong>Obsidian Directory:</strong> Saved parts export into your vault's <code className="bg-purple-900/60 px-1 py-0.5 rounded text-purple-300">parts/</code> directory. All quotes and orders automatically create bidirectional links to <code className="bg-purple-900/60 px-1 py-0.5 rounded text-purple-300">[[parts/Part Name]]</code>.
            </span>
          </div>

          {parts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <p>You have no saved parts.</p>
              <p className="text-sm">Use the form to add one to your catalog.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {parts.map(part => (
                <li
                  key={part.id}
                  className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 flex justify-between items-center transition gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Part Photo Thumbnail */}
                    {part.imageUrl ? (
                      <div
                        onClick={() => setModalImage({ url: part.imageUrl!, title: part.name })}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-700 hover:border-cyan-400/80 bg-slate-950 flex-shrink-0 cursor-pointer group transition shadow-sm"
                        title="Click to view full photo"
                      >
                        <img
                          src={part.imageUrl}
                          alt={part.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <PhotoIcon className="w-4 h-4 text-cyan-300 drop-shadow" />
                        </div>
                      </div>
                    ) : (
                      <div
                        className="w-16 h-16 rounded-xl bg-slate-900 border border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 flex-shrink-0"
                        title="No photo attached"
                      >
                        <CubeIcon className="w-6 h-6 text-slate-600" />
                        <span className="text-[9px] text-slate-500 mt-0.5">No photo</span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-100 text-base truncate flex flex-wrap items-center gap-2">
                        <span>{part.name}</span>
                        {part.isPrintOnDemand && (
                          <span
                            className="text-[10px] text-emerald-300 bg-emerald-950/80 border border-emerald-600/70 px-2 py-0.5 rounded font-medium flex items-center gap-1 shadow-sm"
                            title="Print on Demand: Customer supplied 3D model with licensing terms accepted"
                          >
                            <span>🖨️ POD</span>
                            {part.licensingTermsAccepted && <span className="text-emerald-400 font-bold">✓ License</span>}
                          </span>
                        )}
                        {(part.isCommercialLicense || (typeof part.licenseFeePerUnit === 'number' && part.licenseFeePerUnit > 0)) && (
                          <span
                            className="text-[10px] text-purple-300 bg-purple-950/80 border border-purple-600/70 px-2 py-0.5 rounded font-medium flex items-center gap-1 shadow-sm"
                            title={`Commercial Creator Subscription License: ${part.licenseTierName || 'Creator Tier'} (+$${(part.licenseFeePerUnit || 0).toFixed(2)}/u allocated overhead absorbed into price)`}
                          >
                            <span>📜 {part.licenseTierName ? part.licenseTierName : 'Commercial License'}</span>
                            {typeof part.licenseFeePerUnit === 'number' && part.licenseFeePerUnit > 0 && (
                              <span className="text-purple-400 font-mono font-bold">+${part.licenseFeePerUnit.toFixed(2)}/u</span>
                            )}
                          </span>
                        )}
                        {part.sku && (
                          <span className="text-[10px] text-slate-300 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded font-mono">
                            SKU: {part.sku}
                          </span>
                        )}
                        {part.category && (
                          <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded">
                            📁 {part.category}
                          </span>
                        )}
                        {part.imageUrl && (
                          <span className="text-[10px] text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <PhotoIcon className="w-3 h-3" />
                            Photo
                          </span>
                        )}
                      </h3>
                      {part.description && (
                        <p className="text-sm text-slate-400 mt-0.5 line-clamp-1">{part.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs mt-2.5 text-slate-400">
                        <span className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                          🧵 {part.filamentGrams}g
                        </span>
                        <span className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-cyan-300 font-medium">
                          ⏱️ {formatDuration(part.printHours)} print
                        </span>
                        <span className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
                          🛠️ {formatDuration(part.postProcessingHours)} post-proc
                        </span>
                        {part.hardwareCost > 0 && (
                          <span className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-mono">
                            🔩 ${part.hardwareCost.toFixed(2)} h/w
                          </span>
                        )}
                        {(typeof part.licenseFeePerUnit === 'number' && part.licenseFeePerUnit > 0) && (
                          <span 
                            className="bg-purple-950/70 border border-purple-700/60 px-2 py-0.5 rounded text-purple-300 font-mono text-xs"
                            title={`Allocated commercial creator subscription overhead: $${part.licenseFeePerUnit.toFixed(2)} per unit (absorbed into cost & price)`}
                          >
                            📜 +${part.licenseFeePerUnit.toFixed(2)} lic
                          </span>
                        )}
                        {(typeof part.maxPartsPerBuildPlate === 'number' && part.maxPartsPerBuildPlate > 0) && (
                          <span 
                            className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-indigo-300 font-mono text-xs"
                            title={`Maximum copies that fit on one build plate / bed: ${part.maxPartsPerBuildPlate}`}
                          >
                            🔲 Max {part.maxPartsPerBuildPlate}/bed
                          </span>
                        )}
                        {/* Pricing Metrics: Cost, Cal Price, Selling Price, and Markup % */}
                        {(() => {
                          const cardPricing = calculatePartPricing(part, filaments, printers, generalSettings);

                          return (
                            <>
                              <span 
                                className="bg-slate-900/60 border border-slate-700 px-2 py-0.5 rounded text-slate-400 text-xs font-mono"
                                title="Estimated manufacturing unit cost (material + energy + wear + labor + failure buffer)"
                              >
                                Cost: ${cardPricing.costWithFailureRate.toFixed(2)}
                              </span>

                              <span
                                className="inline-flex items-center gap-1 bg-cyan-950/70 border border-cyan-700/60 px-2 py-0.5 rounded text-cyan-300 font-mono text-xs shadow-xs"
                                title={`Calculated formula price based on cost ($${cardPricing.costWithFailureRate.toFixed(2)}) + standard profit margin (${generalSettings?.profitMargin ?? 30}%)`}
                              >
                                <span className="text-[10px] text-cyan-400 font-sans font-medium">Cal Price:</span>
                                <span className="font-bold">${cardPricing.calculatedPrice.toFixed(2)}</span>
                              </span>

                              {/* Interactive Quick Selling Price Setter on card */}
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 bg-slate-900 border border-amber-600/60 rounded px-2 py-0.5 shadow-sm"
                                title="Custom selling price for Quotes & Square POS export. Click to edit (Enter or click outside to save)"
                              >
                                <span className="text-[11px] text-amber-300 font-bold">💵 Price: $</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  key={`price-${part.id}-${part.customUnitPrice}`}
                                  defaultValue={typeof part.customUnitPrice === 'number' && part.customUnitPrice >= 0 ? part.customUnitPrice : ''}
                                  placeholder={`Auto ($${cardPricing.calculatedPrice.toFixed(2)})`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const valStr = e.target.value.trim();
                                    const parsed = valStr === '' ? null : parseFloat(valStr);
                                    const cleanVal = (parsed === null || isNaN(parsed)) ? null : Math.max(0, parsed);
                                    if (cleanVal !== part.customUnitPrice) {
                                      onUpdate({
                                        ...part,
                                        customUnitPrice: cleanVal,
                                      });
                                    }
                                  }}
                                  className="w-16 bg-slate-950 text-amber-300 font-mono text-xs font-bold rounded px-1.5 py-0.5 border border-slate-700 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  title="Directly edit selling price (auto-saves)"
                                />
                              </div>

                              {/* Markup % Badge */}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs font-bold border ${
                                  cardPricing.markupPercent >= 50
                                    ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                                    : cardPricing.markupPercent >= 20
                                    ? 'bg-cyan-950/70 border-cyan-600/60 text-cyan-300'
                                    : cardPricing.markupPercent >= 0
                                    ? 'bg-amber-950/70 border-amber-600/60 text-amber-300'
                                    : 'bg-rose-950/80 border-rose-600/70 text-rose-300'
                                }`}
                                title={`Effective Markup over estimated cost ($${cardPricing.costWithFailureRate.toFixed(2)}): ${cardPricing.markupPercent >= 0 ? '+' : ''}${cardPricing.markupPercent.toFixed(1)}% (Profit: $${cardPricing.profitAmount.toFixed(2)} / unit)`}
                              >
                                <span className="text-[10px] font-sans font-medium text-slate-300">Markup:</span>
                                <span>{cardPricing.markupPercent >= 0 ? `+${cardPricing.markupPercent.toFixed(1)}%` : `${cardPricing.markupPercent.toFixed(1)}%`}</span>
                              </span>
                            </>
                          );
                        })()}
                        {part.colors && part.colors.length > 1 && (
                          <span className="bg-purple-950/80 border border-purple-600/50 px-2 py-0.5 rounded text-purple-300 font-semibold flex items-center gap-1">
                            🎨 {part.colors.length} Colors
                          </span>
                        )}
                      </div>

                      {/* Expanded Multi-Color swatch list */}
                      {part.colors && part.colors.length > 1 && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-1 border-t border-slate-700/50">
                          {part.colors.map((c, ci) => {
                            const fil = filaments.find(f => f.id === c.filamentId);
                            return (
                              <span
                                key={c.id || ci}
                                className="inline-flex items-center gap-1 text-[11px] bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-slate-300"
                              >
                                <span
                                  className="w-2.5 h-2.5 rounded-full border border-slate-600 flex-shrink-0"
                                  style={getFilamentBackgroundStyle(fil?.colorHex, fil?.rgb)}
                                />
                                <span className="font-medium text-slate-200 truncate max-w-[120px]">
                                  {fil?.colorName || fil?.brand || 'Color'}
                                </span>
                                <span className="text-cyan-300 font-mono font-semibold">
                                  {c.grams}g
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <button
                      onClick={() => handleExportSinglePart(part)}
                      className="p-2 rounded-full bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 transition-colors"
                      title="Export this part as Obsidian Markdown note (into parts/ directory)"
                    >
                      <MarkdownIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUseAsTemplate(part)}
                      className="p-2 rounded-full bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                      title="Use as Template to create new Part"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(part)}
                      className="p-2 rounded-full bg-slate-700 hover:bg-cyan-500/40 text-slate-300 hover:text-cyan-300 transition-colors"
                      title="Edit Part (including Photo)"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(part.id)}
                      className="p-2 rounded-full bg-slate-700 hover:bg-red-500/40 text-slate-300 hover:text-red-300 transition-colors"
                      title="Delete Part"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {modalImage && (
        <ImageModal
          isOpen={true}
          onClose={() => setModalImage(null)}
          imageUrl={modalImage.url}
          title={modalImage.title}
          subtitle="Part catalog model & prototype photo"
        />
      )}

      {/* Square Catalog Export Modal */}
      <SquareExportModal
        isOpen={showSquareModal}
        onClose={() => setShowSquareModal(false)}
        parts={parts}
        filaments={filaments}
        printers={printers}
      />
    </div>
  );
};

export default PartsPage;
