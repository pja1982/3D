import React, { useState, useEffect, useRef } from 'react';
import type { Part, Filament, Printer } from '../types';
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

interface PartsPageProps {
  parts: Part[];
  filaments?: Filament[];
  printers?: Printer[];
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && 'id' in editingPart && !parts.find(p => p.id === editingPart.id)) {
      handleCancelEdit();
    }
  }, [parts, isEditing, editingPart]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['filamentGrams', 'hardwareCost'].includes(name);
    setEditingPart(prev => ({
      ...prev,
      [name]: isNumeric ? parseFloat(value) || 0 : value,
    }));
  };

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
  
  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setIsEditing(true);
    setShowUrlInput(false);
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

          <div>
            <label htmlFor="filamentGrams" className="block text-sm font-medium text-slate-300 mb-1">
              Filament Weight (grams)
            </label>
            <input
              type="number"
              id="filamentGrams"
              name="filamentGrams"
              value={editingPart.filamentGrams}
              onChange={handleChange}
              min="0"
              step="0.1"
              className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              required
            />
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

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow"
            >
              {isEditing ? 'Update Part' : 'Add Part'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
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
              <button
                type="button"
                onClick={handleExportAllMarkdown}
                className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-purple-100 font-semibold py-1.5 px-3 rounded-lg transition-colors text-xs shadow-sm"
                title="Export all parts as Obsidian Markdown catalog notes (.md) linking to parts/ directory"
              >
                <MarkdownIcon className="w-3.5 h-3.5" />
                <span>Export Parts to Markdown</span>
              </button>
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
                      <h3 className="font-semibold text-slate-100 text-base truncate flex items-center gap-2">
                        <span>{part.name}</span>
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
                      </div>
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
    </div>
  );
};

export default PartsPage;
