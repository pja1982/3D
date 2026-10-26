import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PrintParameters, CostBreakdown, Filament, Printer, GeneralSettings, Quote, QuoteStatus, AppData, Part, Order, OrderStatus, QuotePartConfig, MultiColorBatchMode } from './types';
import { calculatePrinterRates } from './utils/printerRates';
import {
  generateAllJobsMarkdown,
  generateAllOrdersMarkdown,
  generateAllInvoicesMarkdown,
  generateAllPartsMarkdown,
  downloadObsidianVaultZip,
  downloadMarkdownFile,
} from './utils/markdownExport';
import useLocalStorage from './hooks/useLocalStorage';
import { auth, googleProvider, googleSignIn, logout, getAccessToken, setCachedAccessToken, onAuthStateChanged, User } from './firebase';
import {
  subscribeToUserData,
  saveQuoteToRemote,
  deleteQuoteFromRemote,
  savePartToRemote,
  deletePartFromRemote,
  savePrinterToRemote,
  savePrintersBatchToRemote,
  deletePrinterFromRemote,
  saveFilamentToRemote,
  saveFilamentsBatchToRemote,
  deleteFilamentFromRemote,
  saveOrderToRemote,
  deleteOrderFromRemote,
  saveSettingsToRemote,
  saveUserProfile,
  syncAllLocalDataToRemote,
  sanitizeDocId,
} from './services/firestoreService';
import { getFilamentEffectiveFailureRate, MaterialDifficultyRisk } from './utils/filamentFailureRates';
import { MYSTERY_PLA_ID, getAveragePlaCostPerKg } from './utils/randomFilamentSelector';
import Header from './components/Header';
import { DockerSetupModal } from './components/DockerSetupModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import ChangeLogModal from './components/ChangeLogModal';
import { APP_VERSION, APP_RELEASE_DATE } from './constants/version';
import {
  checkLocalServerStatus,
  fetchLocalServerData,
  saveLocalServerData,
  exportBackupJson,
  parseBackupFile,
  LocalServerStatus,
} from './services/localServerStorage';
import CalculatorForm from './components/CalculatorForm';
import CostBreakdownDisplay from './components/CostBreakdownDisplay';
import Nav from './components/Nav';
import ConfigurationPage from './components/ConfigurationPage';
import PrinterConfigurationPage from './components/PrinterConfigurationPage';
import GeneralConfigurationPage from './components/GeneralConfigurationPage';
import JobsPage from './components/JobsPage';
import PartsPage from './components/PartsPage';
import OrdersPage from './components/OrdersPage';

type View = 'calculator' | 'jobs' | 'orders' | 'parts' | 'filaments' | 'printers' | 'settings';

const DEFAULT_FILAMENTS: Filament[] = [
  { id: 'pla-white-default', type: 'PLA', brand: 'Generic', colorName: 'Jade White', colorHex: '#ffffff', costPerKg: 20 },
  { id: 'pla-default', type: 'PLA', brand: 'Generic', colorName: 'Royal Blue', colorHex: '#3b82f6', costPerKg: 20 },
  { id: 'petg-default', type: 'PETG', brand: 'Generic', colorName: 'Emerald Green', colorHex: '#10b981', costPerKg: 25 },
  { id: 'abs-default', type: 'ABS', brand: 'Generic', colorName: 'Amber Gold', colorHex: '#f59e0b', costPerKg: 22 },
];

const DEFAULT_PRINTERS: Printer[] = [
  {
    id: 'creality-k1-default',
    name: 'K1',
    brand: 'Creality',
    watts: 350,
    purchaseCost: 550,
    lifespanHours: 3000,
    hourlyDepreciation: 0.1833,
    maintenanceCostPerHour: 0.12,
    hourlyUsageFee: 0.50,
    customHourlyRate: false,
  },
  {
    id: 'anycubic-k3-combo-default',
    name: 'K3 Combo',
    brand: 'Anycubic',
    watts: 150,
    purchaseCost: 450,
    lifespanHours: 2500,
    hourlyDepreciation: 0.18,
    maintenanceCostPerHour: 0.10,
    hourlyUsageFee: 0.40,
    customHourlyRate: false,
  },
];

const DEFAULT_SETTINGS: GeneralSettings = {
  electricityCostKwh: 0.32,
  laborCostPerHour: 25,
  failureRate: 5,
  profitMargin: 30,
  enablePrinterDepreciation: true,
  defaultPrinterHourlyRate: 0.50,
  defaultPrinterLifespanHours: 3000,
  defaultMaintenanceCostPerHour: 0.15,
  defaultHourlyUsageFee: 0.50,
  multiColorPricingMode: 'simple',
  simpleMultiColorType: 'per_additional_color',
  simpleMultiColorFee: 3.00,
  complexSpoolSetupFee: 2.50,
  complexPurgeWastePercent: 15,
  complexCostPerColorChange: 0.05,
  complexHandlingFee: 4.00,
  studioName: '3D Printing Studio',
  studioTagline: 'Custom Additive Manufacturing & Rapid Prototyping',
  studioEmail: 'quotes@3dprintstudio.com',
  studioPhone: '(555) 019-3820',
  studioAddress: '123 Maker Way, Suite 4B',
  studioWebsite: 'www.3dprintstudio.com',
  studioTerms: 'Quotation valid for 30 days. Custom 3D fabricated parts are made to order. 50% deposit required for fabrication to begin.',
};

const DEFAULT_APP_DATA: AppData = {
  filaments: DEFAULT_FILAMENTS,
  printers: DEFAULT_PRINTERS,
  generalSettings: DEFAULT_SETTINGS,
  quotes: [],
  parts: [],
  orders: [],
};


function App() {
  const [view, setView] = useState<View>('calculator');
  const [appData, setAppData] = useLocalStorage<AppData>('appData', DEFAULT_APP_DATA);
  const { filaments, printers, generalSettings, quotes, parts, orders } = appData;

  // Firebase Remote Database & Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [remoteToast, setRemoteToast] = useState<string | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState<boolean>(false);
  const [cachedToken, setCachedToken] = useState<string | null>(null);

  // Local Docker / Host Network Storage state
  const [localServerStatus, setLocalServerStatus] = useState<LocalServerStatus>({
    available: false,
    mode: 'browser-only',
    lastChecked: 0,
  });
  const [isDockerModalOpen, setIsDockerModalOpen] = useState<boolean>(false);
  const [isChangeLogModalOpen, setIsChangeLogModalOpen] = useState<boolean>(false);

  // Check and connect to Local Docker Backend Storage
  useEffect(() => {
    checkLocalServerStatus().then(async (status) => {
      setLocalServerStatus(status);
      if (status.available) {
        const serverData = await fetchLocalServerData();
        if (serverData && (serverData.quotes?.length || serverData.parts?.length)) {
          setAppData(serverData);
          setRemoteToast('🐳 Connected to Local Docker Host storage! Loaded database from disk.');
          setTimeout(() => setRemoteToast(null), 3500);
        } else {
          // If server file is brand new, persist current data to host disk
          await saveLocalServerData(appData);
        }
      }
    });
  }, []);

  // Automatically persist changes to Local Docker Server when connected
  useEffect(() => {
    if (!localServerStatus.available) return;
    const timeout = setTimeout(() => {
      saveLocalServerData(appData);
    }, 400);
    return () => clearTimeout(timeout);
  }, [appData, localServerStatus.available]);

  // Monitor Firebase Auth state & cache Google Workspace OAuth token
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        saveUserProfile(currentUser).catch(console.error);
        const token = await getAccessToken();
        if (token) setCachedToken(token);
      } else {
        setCachedToken(null);
      }
    });
    return () => unsub();
  }, []);

  // Real-time synchronization with Firestore when user is authenticated
  useEffect(() => {
    if (!user) return;

    let isInitial = true;
    const unsub = subscribeToUserData(user.uid, {
      onQuotes: (remoteQuotes) => {
        setAppData((prev) => ({
          ...prev,
          quotes: remoteQuotes,
        }));
      },
      onParts: (remoteParts) => {
        if (remoteParts.length > 0 || !isInitial) {
          setAppData((prev) => ({
            ...prev,
            parts: remoteParts,
          }));
        }
      },
      onPrinters: (remotePrinters) => {
        if (remotePrinters.length > 0 || !isInitial) {
          setAppData((prev) => ({
            ...prev,
            printers: remotePrinters,
          }));
        }
      },
      onFilaments: (remoteFilaments) => {
        if (remoteFilaments.length > 0 || !isInitial) {
          setAppData((prev) => ({
            ...prev,
            filaments: remoteFilaments,
          }));
        }
      },
      onOrders: (remoteOrders) => {
        setAppData((prev) => ({
          ...prev,
          orders: remoteOrders,
        }));
      },
      onSettings: (remoteSettings) => {
        setAppData((prev) => ({
          ...prev,
          generalSettings: remoteSettings,
        }));
      },
      onError: (err) => {
        console.error('Remote sync listener error:', err);
      },
    });

    isInitial = false;
    return () => unsub();
  }, [user, setAppData]);

  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setCachedToken(res.accessToken);
      }
      setRemoteToast('Signed in successfully! Google Sheets & Cloud sync active.');
      setTimeout(() => setRemoteToast(null), 3500);
    } catch (err: any) {
      console.error('Sign in failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized')) {
          setRemoteToast(
            'Google blocks sign-in on private LAN IPs (192.168.x.x). Your app is already saving locally to your Docker disk!'
          );
          setIsDockerModalOpen(true);
        } else {
          setRemoteToast(`Sign in notice: ${err.message || String(err)}`);
        }
        setTimeout(() => setRemoteToast(null), 6000);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setCachedToken(null);
      setRemoteToast('Signed out. Local storage mode active.');
      setTimeout(() => setRemoteToast(null), 3500);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleSyncAllLocal = async () => {
    if (!user) {
      setRemoteToast('Please sign in with Google first to push data to your remote cloud database.');
      setTimeout(() => setRemoteToast(null), 3500);
      return;
    }
    setIsSyncing(true);
    try {
      await syncAllLocalDataToRemote(user.uid, appData);
      setRemoteToast('All local quotes, catalog parts, printers, and filaments uploaded to the remote cloud database!');
      setTimeout(() => setRemoteToast(null), 4000);
    } catch (err: any) {
      console.error('Push to cloud error:', err);
      setRemoteToast(`Sync failed: ${err.message || String(err)}`);
      setTimeout(() => setRemoteToast(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = () => {
    exportBackupJson(appData);
    setRemoteToast('Full database backup (.json) downloaded successfully!');
    setTimeout(() => setRemoteToast(null), 3000);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await parseBackupFile(file);
      setAppData(imported);
      if (localServerStatus.available) {
        await saveLocalServerData(imported);
      }
      setRemoteToast('Database backup restored successfully!');
      setTimeout(() => setRemoteToast(null), 3500);
    } catch (err: any) {
      setRemoteToast(`Failed to restore backup: ${err.message || 'Invalid format'}`);
      setTimeout(() => setRemoteToast(null), 4000);
    }
    e.target.value = '';
  };

  const [quoteParts, setQuoteParts] = useState<QuotePartConfig[]>(() => {
    const defaultFil = filaments.find(f => f.isDefault) || (filaments.length > 0 ? filaments[0] : null);
    const defaultPrn = printers.find(p => p.isDefault) || (printers.length > 0 ? printers[0] : null);
    const initialFilamentId = defaultFil ? defaultFil.id : null;
    const initialPrinterId = defaultPrn ? defaultPrn.id : null;
    return [
      {
        id: 'part-1',
        name: 'Part 1',
        quantity: 1,
        filamentGrams: 100,
        filamentId: initialFilamentId,
        printHours: 5,
        printerId: initialPrinterId,
        postProcessingHours: 0.5,
        hardwareCost: 0,
      }
    ];
  });
  const [activePartId, setActivePartId] = useState<string>('part-1');
  const [revisingQuote, setRevisingQuote] = useState<Quote | null>(null);
  const [multiColorBatchMode, setMultiColorBatchMode] = useState<MultiColorBatchMode>(
    generalSettings.defaultMultiColorBatchMode || 'single_batch_per_bed'
  );
  const [multiColorBedCount, setMultiColorBedCount] = useState<number>(1);

  const activePart = useMemo(() => {
    const defaultFil = filaments.find(f => f.isDefault) || (filaments.length > 0 ? filaments[0] : null);
    const defaultPrn = printers.find(p => p.isDefault) || (printers.length > 0 ? printers[0] : null);
    return quoteParts.find(p => p.id === activePartId) || quoteParts[0] || {
      id: 'part-1',
      name: 'Part 1',
      quantity: 1,
      filamentGrams: 100,
      filamentId: defaultFil ? defaultFil.id : null,
      printHours: 5,
      printerId: defaultPrn ? defaultPrn.id : null,
      postProcessingHours: 0.5,
      hardwareCost: 0,
    };
  }, [quoteParts, activePartId, filaments, printers]);

  // Ensure legacy filaments have `type`, `colorHex`, and `colorName`
  useEffect(() => {
    let needsUpdate = false;
    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#64748b'];
    const defaultColorNames = ['Royal Blue', 'Emerald Green', 'Amber Gold', 'Magenta Pink', 'Deep Purple', 'Cyan Blue', 'Fire Red', 'Slate Gray'];
    const updatedFilaments = filaments.map((f, idx) => {
      const legacyName = (f as any).name;
      const filType = f.type || legacyName || 'PLA';
      const colorHex = f.colorHex || defaultColors[idx % defaultColors.length];
      const colorName = f.colorName || defaultColorNames[idx % defaultColorNames.length];
      if (f.type !== filType || f.colorHex !== colorHex || !f.colorName) {
        needsUpdate = true;
        return { ...f, type: filType, name: filType, colorHex, colorName };
      }
      return f;
    });

    if (needsUpdate) {
      setAppData(prev => ({ ...prev, filaments: updatedFilaments }));
    }
  }, [filaments, setAppData]);

  // Ensure legacy printers have purchaseCost, lifespanHours, and depreciation rates
  useEffect(() => {
    let needsUpdate = false;
    const updatedPrinters = printers.map((p, idx) => {
      let changed = false;
      const updated = { ...p };
      if (updated.purchaseCost === undefined) {
        updated.purchaseCost = idx === 0 ? 550 : 450;
        changed = true;
      }
      if (updated.lifespanHours === undefined) {
        updated.lifespanHours = idx === 0 ? 3000 : 2500;
        changed = true;
      }
      if (updated.hourlyDepreciation === undefined) {
        const cost = updated.purchaseCost || 500;
        const hours = updated.lifespanHours || 3000;
        updated.hourlyDepreciation = parseFloat((cost / hours).toFixed(4));
        changed = true;
      }
      if (updated.maintenanceCostPerHour === undefined) {
        updated.maintenanceCostPerHour = 0.12;
        changed = true;
      }
      if (updated.hourlyUsageFee === undefined) {
        updated.hourlyUsageFee = 0.50;
        changed = true;
      }
      if (changed) {
        needsUpdate = true;
        return updated;
      }
      return p;
    });

    if (needsUpdate) {
      setAppData(prev => ({ ...prev, printers: updatedPrinters }));
    }
  }, [printers, setAppData]);

  const parameters = useMemo<PrintParameters>(() => {
    return {
      filamentGrams: activePart.filamentGrams,
      filamentId: activePart.filamentId,
      printHours: activePart.printHours,
      printerId: activePart.printerId,
      postProcessingHours: activePart.postProcessingHours,
      hardwareCost: activePart.hardwareCost,
      multiColorBatchMode,
      multiColorBedCount,
      ...generalSettings,
    };
  }, [activePart, generalSettings, multiColorBatchMode, multiColorBedCount]);

  const setParameters = useCallback((value: React.SetStateAction<PrintParameters>) => {
    setQuoteParts(prev => {
      return prev.map(p => {
        if (p.id === activePartId) {
          const currentParams: PrintParameters = {
            filamentGrams: p.filamentGrams,
            filamentId: p.filamentId,
            printHours: p.printHours,
            printerId: p.printerId,
            postProcessingHours: p.postProcessingHours,
            hardwareCost: p.hardwareCost,
            multiColorBatchMode,
            multiColorBedCount,
            ...generalSettings,
          };
          const nextParams = typeof value === 'function' ? value(currentParams) : value;
          if (nextParams.multiColorBatchMode !== undefined) {
            setMultiColorBatchMode(nextParams.multiColorBatchMode);
          }
          if (nextParams.multiColorBedCount !== undefined) {
            setMultiColorBedCount(nextParams.multiColorBedCount);
          }
          return {
            ...p,
            filamentGrams: nextParams.filamentGrams,
            filamentId: nextParams.filamentId,
            printHours: nextParams.printHours,
            printerId: nextParams.printerId,
            postProcessingHours: nextParams.postProcessingHours,
            hardwareCost: nextParams.hardwareCost,
          };
        }
        return p;
      });
    });
  }, [activePartId, generalSettings, multiColorBatchMode, multiColorBedCount]);

  const { partsBreakdowns, totalMultiColorFee, multiColorSavedFee } = useMemo(() => {
    const pricingMode = generalSettings.multiColorPricingMode || 'simple';
    const beds = Math.max(1, multiColorBedCount || 1);

    const initialParts = quoteParts.map(part => {
      const printer = printers.find(p => p.id === part.printerId) || null;
      const printerWatts = printer?.watts || 0;
      const printerRates = calculatePrinterRates(printer, generalSettings);

      const isDepreciationEnabled = generalSettings.enablePrinterDepreciation !== false;
      const effectivePrinterRate = isDepreciationEnabled ? printerRates.totalHourlyRate : 0;

      const printerCost = part.printHours * effectivePrinterRate * part.quantity;
      const printerDepreciationCost = isDepreciationEnabled 
        ? part.printHours * printerRates.depreciationPerHour * part.quantity 
        : 0;
      const printerMaintenanceCost = isDepreciationEnabled 
        ? part.printHours * (printerRates.maintenancePerHour + printerRates.usageFeePerHour) * part.quantity 
        : 0;

      // Multi-Color Filament calculation:
      let filamentCost = 0;
      let totalFilamentGrams = 0;
      const isMultiColor = Boolean(part.colors && part.colors.length > 1);
      const colorsCount = part.colors && part.colors.length > 0 ? part.colors.length : 1;

      const avgPlaRate = getAveragePlaCostPerKg(filaments);
      if (part.colors && part.colors.length > 0) {
        part.colors.forEach(col => {
          const fil = filaments.find(f => f.id === col.filamentId);
          const costPerKg = fil ? fil.costPerKg : (col.isMysteryColor || col.filamentId === MYSTERY_PLA_ID ? avgPlaRate : 0);
          filamentCost += (col.grams / 1000) * costPerKg * part.quantity;
          totalFilamentGrams += col.grams;
        });
      } else {
        const filament = filaments.find(f => f.id === part.filamentId) || null;
        const costPerKg = filament ? filament.costPerKg : (part.isMysteryColor || part.filamentId === MYSTERY_PLA_ID ? avgPlaRate : 0);
        filamentCost = (part.filamentGrams / 1000) * costPerKg * part.quantity;
        totalFilamentGrams = part.filamentGrams;
      }

      // Unbatched multicolor fee for this part:
      let unbatchedPartFee = 0;
      if (isMultiColor && pricingMode !== 'none') {
        if (pricingMode === 'simple') {
          const simpleType = generalSettings.simpleMultiColorType || 'per_additional_color';
          const feeRate = generalSettings.simpleMultiColorFee ?? 3.00;
          if (simpleType === 'flat_per_part') {
            unbatchedPartFee = feeRate * part.quantity;
          } else if (simpleType === 'percentage') {
            unbatchedPartFee = filamentCost * (feeRate / 100);
          } else {
            // per_additional_color
            const extraColors = Math.max(0, colorsCount - 1);
            unbatchedPartFee = extraColors * feeRate * part.quantity;
          }
        } else if (pricingMode === 'complex') {
          const spoolFee = colorsCount * (generalSettings.complexSpoolSetupFee ?? 2.50) * part.quantity;
          const purgeBuffer = filamentCost * ((generalSettings.complexPurgeWastePercent ?? 15) / 100);
          const swapFee = (part.colorChanges || 0) * (generalSettings.complexCostPerColorChange ?? 0.05) * part.quantity;
          const handlingFee = (generalSettings.complexHandlingFee ?? 4.00) * part.quantity;
          unbatchedPartFee = spoolFee + purgeBuffer + swapFee + handlingFee;
        }
      }

      const electricityCost = (part.printHours * (printerWatts / 1000)) * generalSettings.electricityCostKwh * part.quantity;
      const laborCost = part.postProcessingHours * generalSettings.laborCostPerHour * part.quantity;
      const hardwareCost = part.hardwareCost * part.quantity;

      return {
        partId: part.id,
        partQuantity: part.quantity,
        filamentCost,
        electricityCost,
        laborCost,
        hardwareCost,
        printerCost,
        printerDepreciationCost,
        printerMaintenanceCost,
        effectivePrinterRate,
        printerRates,
        unbatchedPartFee,
        totalFilamentGrams,
        isMultiColor,
        colorsCount,
        colorChanges: part.colorChanges || 0,
      };
    });

    const multiColorParts = initialParts.filter(p => p.isMultiColor);
    const hasMultiColor = multiColorParts.length > 0 && pricingMode !== 'none';

    let totalUnbatchedFee = initialParts.reduce((sum, p) => sum + p.unbatchedPartFee, 0);
    let totalBatchedFee = 0;
    let totalDifferentPlatesFee = 0;

    if (hasMultiColor) {
      const totalMulticolorFilamentCost = multiColorParts.reduce((sum, p) => sum + p.filamentCost, 0);

      // Unique spools across all multicolor parts on the bed:
      const uniqueFilamentIds = new Set<string>();
      quoteParts.forEach(qp => {
        if (qp.colors && qp.colors.length > 1) {
          qp.colors.forEach(c => {
            if (c.filamentId) uniqueFilamentIds.add(c.filamentId);
          });
        }
      });
      const maxPartColors = Math.max(0, ...multiColorParts.map(p => p.colorsCount));
      const bedColorsCount = Math.max(uniqueFilamentIds.size, maxPartColors);
      const extraBedColors = Math.max(0, bedColorsCount - 1);

      if (pricingMode === 'simple') {
        const simpleType = generalSettings.simpleMultiColorType || 'per_additional_color';
        const feeRate = generalSettings.simpleMultiColorFee ?? 3.00;
        if (simpleType === 'flat_per_part') {
          totalBatchedFee = feeRate * beds;
          totalDifferentPlatesFee = feeRate * beds;
        } else if (simpleType === 'percentage') {
          totalBatchedFee = totalMulticolorFilamentCost * (feeRate / 100);
          // Different plates has zero purge tower overhead, half the percentage fee
          totalDifferentPlatesFee = totalMulticolorFilamentCost * ((feeRate / 100) * 0.5);
        } else {
          totalBatchedFee = extraBedColors * feeRate * beds;
          totalDifferentPlatesFee = extraBedColors * feeRate;
        }
      } else if (pricingMode === 'complex') {
        const spoolFee = bedColorsCount * (generalSettings.complexSpoolSetupFee ?? 2.50) * beds;
        const purgeBuffer = totalMulticolorFilamentCost * ((generalSettings.complexPurgeWastePercent ?? 15) / 100);
        const maxSwaps = Math.max(0, ...multiColorParts.map(p => p.colorChanges));
        const swapFee = maxSwaps * (generalSettings.complexCostPerColorChange ?? 0.05) * beds;
        const handlingFee = (generalSettings.complexHandlingFee ?? 4.00) * beds;
        totalBatchedFee = spoolFee + purgeBuffer + swapFee + handlingFee;

        // Different Build Plates: printed plate-by-plate in solid colors with ZERO purge waste and ZERO color swaps!
        const plateHandlingRate = generalSettings.differentPlatesHandlingFee ?? generalSettings.complexHandlingFee ?? 3.00;
        const diffSpoolFee = bedColorsCount * (generalSettings.complexSpoolSetupFee ?? 2.50);
        const diffHandlingFee = plateHandlingRate * beds;
        totalDifferentPlatesFee = diffSpoolFee + diffHandlingFee;
      }
    }

    let finalMultiColorFee = 0;
    let multiColorSavedFee = 0;

    if (hasMultiColor) {
      if (multiColorBatchMode === 'different_plates') {
        finalMultiColorFee = totalDifferentPlatesFee;
        multiColorSavedFee = Math.max(0, totalUnbatchedFee - totalDifferentPlatesFee);
      } else if (multiColorBatchMode === 'single_batch_per_bed') {
        finalMultiColorFee = totalBatchedFee;
        multiColorSavedFee = Math.max(0, totalUnbatchedFee - totalBatchedFee);
      } else {
        finalMultiColorFee = totalUnbatchedFee;
        multiColorSavedFee = 0;
      }
    }

    // Distribute finalMultiColorFee proportionally across multicolor parts and compute technical material failure rates
    const partsBreakdowns = initialParts.map(ip => {
      let partMultiColorFee = 0;
      if (ip.isMultiColor && hasMultiColor) {
        if (totalUnbatchedFee > 0) {
          partMultiColorFee = (ip.unbatchedPartFee / totalUnbatchedFee) * finalMultiColorFee;
        } else {
          partMultiColorFee = finalMultiColorFee / multiColorParts.length;
        }
      }
      const subtotal = ip.filamentCost + ip.electricityCost + ip.laborCost + ip.hardwareCost + partMultiColorFee + ip.printerCost;

      // Effective material failure rate calculation
      const rawPart = quoteParts.find(qp => qp.id === ip.partId);
      let partRisk: MaterialDifficultyRisk;

      if (rawPart?.colors && rawPart.colors.length > 1) {
        let maxRisk: MaterialDifficultyRisk = getFilamentEffectiveFailureRate(null, generalSettings);
        rawPart.colors.forEach(col => {
          const fil = filaments.find(f => f.id === col.filamentId);
          const r = getFilamentEffectiveFailureRate(fil, generalSettings);
          if (r.rate > maxRisk.rate) {
            maxRisk = r;
          }
        });
        partRisk = maxRisk;
      } else {
        const fil = filaments.find(f => f.id === rawPart?.filamentId);
        partRisk = getFilamentEffectiveFailureRate(fil, generalSettings);
      }

      const effectiveFailureRate = partRisk.rate;
      const partCostWithFailureRate = effectiveFailureRate < 100 
        ? subtotal / (1 - (effectiveFailureRate / 100))
        : subtotal;

      return {
        ...ip,
        multiColorFee: partMultiColorFee,
        subtotal,
        effectiveFailureRate,
        costWithFailureRate: partCostWithFailureRate,
        isTechnical: partRisk.isTechnical,
        riskReason: partRisk.reason,
        riskBadge: partRisk.badgeLabel,
      };
    });

    return {
      partsBreakdowns,
      totalMultiColorFee: finalMultiColorFee,
      multiColorSavedFee,
    };
  }, [quoteParts, filaments, printers, generalSettings, multiColorBatchMode, multiColorBedCount]);

  const costBreakdown = useMemo<CostBreakdown & { quotePrice: number }>(() => {
    let filamentCost = 0;
    let electricityCost = 0;
    let laborCost = 0;
    let hardwareCost = 0;
    let printerCost = 0;
    let printerDepreciationCost = 0;
    let printerMaintenanceCost = 0;
    let subtotal = 0;
    let totalCostWithFailureRate = 0;

    partsBreakdowns.forEach(pb => {
      filamentCost += pb.filamentCost;
      electricityCost += pb.electricityCost;
      laborCost += pb.laborCost;
      hardwareCost += pb.hardwareCost;
      printerCost += (pb.printerCost || 0);
      printerDepreciationCost += (pb.printerDepreciationCost || 0);
      printerMaintenanceCost += (pb.printerMaintenanceCost || 0);
      subtotal += pb.subtotal;
      totalCostWithFailureRate += pb.costWithFailureRate;
    });

    const costWithFailureRate = totalCostWithFailureRate;
    const overallEffectiveFailureRate = costWithFailureRate > 0 && subtotal > 0
      ? parseFloat((((costWithFailureRate - subtotal) / costWithFailureRate) * 100).toFixed(1))
      : generalSettings.failureRate;

    const profit = costWithFailureRate * (generalSettings.profitMargin / 100);
    const quotePrice = parseFloat((costWithFailureRate + profit).toFixed(2));
    const materialRiskApplied = partsBreakdowns.some(pb => pb.isTechnical);
    const techPart = partsBreakdowns.find(pb => pb.isTechnical);
    const materialRiskReason = techPart ? techPart.riskReason : undefined;

    return {
      filamentCost,
      electricityCost,
      laborCost,
      hardwareCost,
      printerCost,
      printerDepreciationCost,
      printerMaintenanceCost,
      multiColorFee: totalMultiColorFee,
      multiColorBatchMode,
      multiColorBedCount,
      multiColorSavedFee,
      subtotal,
      costWithFailureRate,
      profit,
      quotePrice,
      effectiveFailureRate: overallEffectiveFailureRate,
      materialRiskApplied,
      materialRiskReason,
    };
  }, [partsBreakdowns, totalMultiColorFee, multiColorBatchMode, multiColorBedCount, multiColorSavedFee, generalSettings]);

  const nextJobNumber = useMemo(() => {
    if (quotes.length === 0) {
      return 1;
    }
    const maxJobNumber = quotes.reduce((max, q) => Math.max(max, q.jobNumber), 0);
    return maxJobNumber + 1;
  }, [quotes]);

  const nextOrderNumber = useMemo(() => {
    if (orders.length === 0) {
      return 1001;
    }
    const maxOrderNumber = orders.reduce((max, o) => Math.max(max, o.orderNumber), 0);
    return maxOrderNumber + 1;
  }, [orders]);


  // Quote Handlers
  const handleSaveQuote = useCallback((
    jobName: string, 
    customerName: string, 
    jobNumber: number, 
    finalQuotePrice: number, 
    params: PrintParameters, 
    breakdown: CostBreakdown,
    isCreateNew?: boolean
  ) => {
    if (quotes.some(q => q.jobNumber === jobNumber && (!revisingQuote || isCreateNew || q.id !== revisingQuote.id))) {
      alert(`Job number ${jobNumber} already exists. Please choose a unique job number.`);
      return;
    }
    const costWithFailureRate = breakdown.costWithFailureRate;
    const effectiveProfit = parseFloat((finalQuotePrice - costWithFailureRate).toFixed(2));
    const effectiveMargin = costWithFailureRate > 0
      ? parseFloat((((finalQuotePrice - costWithFailureRate) / costWithFailureRate) * 100).toFixed(1))
      : 0;

    let savedQuote: Quote;
    if (revisingQuote && !isCreateNew) {
      savedQuote = {
        ...revisingQuote,
        jobNumber,
        jobName,
        customerName,
        quotePrice: finalQuotePrice,
        parameters: {
          ...params,
          multiColorBatchMode,
          multiColorBedCount,
          profitMargin: effectiveMargin,
        },
        costBreakdown: {
          ...breakdown,
          multiColorBatchMode,
          multiColorBedCount,
          multiColorSavedFee,
          profit: effectiveProfit,
        },
        parts: quoteParts,
        oneOffFees: breakdown.oneOffFees || revisingQuote?.oneOffFees,
      };
      setAppData(prev => ({
        ...prev,
        quotes: prev.quotes.map(q => q.id === revisingQuote.id ? savedQuote : q).sort((a, b) => b.jobNumber - a.jobNumber)
      }));
      setRevisingQuote(null);
    } else {
      const generatedId = `quote_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      savedQuote = {
        id: generatedId,
        jobNumber,
        jobName,
        customerName,
        createdAt: new Date().toISOString(),
        quotePrice: finalQuotePrice,
        status: QuoteStatus.Pending,
        parameters: {
          ...params,
          multiColorBatchMode,
          multiColorBedCount,
          profitMargin: effectiveMargin,
        },
        costBreakdown: {
          ...breakdown,
          multiColorBatchMode,
          multiColorBedCount,
          multiColorSavedFee,
          profit: effectiveProfit,
        },
        parts: quoteParts,
        oneOffFees: breakdown.oneOffFees,
      };
      setAppData(prev => ({ ...prev, quotes: [...prev.quotes, savedQuote].sort((a, b) => b.jobNumber - a.jobNumber) }));
      setRevisingQuote(null);
    }

    if (user) {
      saveQuoteToRemote(user.uid, savedQuote).catch(console.error);
    }
    
    // Reset quote parts & multi-color batching
    setMultiColorBatchMode(generalSettings.defaultMultiColorBatchMode || 'single_batch_per_bed');
    setMultiColorBedCount(1);
    setQuoteParts([
      {
        id: 'part-1',
        name: 'Part 1',
        quantity: 1,
        filamentGrams: 100,
        filamentId: filaments.length > 0 ? filaments[0].id : null,
        printHours: 5,
        printerId: printers.length > 0 ? printers[0].id : null,
        postProcessingHours: 0.5,
        hardwareCost: 0,
      }
    ]);
    setActivePartId('part-1');
    setView('jobs');
  }, [quotes, revisingQuote, quoteParts, filaments, printers, setAppData, multiColorBatchMode, multiColorBedCount, multiColorSavedFee, generalSettings]);

  const handleReviseQuote = useCallback((quote: Quote) => {
    setRevisingQuote(quote);
    if (quote.parameters?.multiColorBatchMode) {
      setMultiColorBatchMode(quote.parameters.multiColorBatchMode);
    } else if (quote.costBreakdown?.multiColorBatchMode) {
      setMultiColorBatchMode(quote.costBreakdown.multiColorBatchMode);
    }
    if (quote.parameters?.multiColorBedCount) {
      setMultiColorBedCount(quote.parameters.multiColorBedCount);
    } else if (quote.costBreakdown?.multiColorBedCount) {
      setMultiColorBedCount(quote.costBreakdown.multiColorBedCount);
    }

    if (quote.parts && quote.parts.length > 0) {
      setQuoteParts(quote.parts);
      setActivePartId(quote.parts[0]?.id || 'part-1');
    } else {
      setQuoteParts([
        {
          id: 'part-1',
          name: quote.jobName || 'Part 1',
          quantity: 1,
          filamentGrams: quote.parameters.filamentGrams,
          filamentId: quote.parameters.filamentId,
          printHours: quote.parameters.printHours,
          printerId: quote.parameters.printerId,
          postProcessingHours: quote.parameters.postProcessingHours,
          hardwareCost: quote.parameters.hardwareCost,
        }
      ]);
      setActivePartId('part-1');
    }
    setView('calculator');
  }, [setQuoteParts, setActivePartId, setView]);

  const handleUseQuoteAsTemplate = useCallback((quote: Quote) => {
    setRevisingQuote(null); // Not a revision: this is creating a fresh new quote from a template!
    if (quote.parameters?.multiColorBatchMode) {
      setMultiColorBatchMode(quote.parameters.multiColorBatchMode);
    } else if (quote.costBreakdown?.multiColorBatchMode) {
      setMultiColorBatchMode(quote.costBreakdown.multiColorBatchMode);
    }
    if (quote.parameters?.multiColorBedCount) {
      setMultiColorBedCount(quote.parameters.multiColorBedCount);
    } else if (quote.costBreakdown?.multiColorBedCount) {
      setMultiColorBedCount(quote.costBreakdown.multiColorBedCount);
    }

    if (quote.parts && quote.parts.length > 0) {
      setQuoteParts(quote.parts.map(p => ({
        ...p,
        id: `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      })));
      setActivePartId(quote.parts[0]?.id || 'part-1');
    } else {
      const newPartId = `part-${Date.now()}`;
      setQuoteParts([
        {
          id: newPartId,
          name: quote.jobName ? `${quote.jobName} (Copy)` : 'Part 1',
          quantity: 1,
          filamentGrams: quote.parameters.filamentGrams,
          filamentId: quote.parameters.filamentId,
          printHours: quote.parameters.printHours,
          printerId: quote.parameters.printerId,
          postProcessingHours: quote.parameters.postProcessingHours,
          hardwareCost: quote.parameters.hardwareCost,
        }
      ]);
      setActivePartId(newPartId);
    }
    setView('calculator');
  }, [setQuoteParts, setActivePartId, setView]);

  const handleCancelRevision = useCallback(() => {
    setRevisingQuote(null);
  }, []);

  const handleUpdateQuotePrice = useCallback((id: string, newPrice: number) => {
    let updatedQuote: Quote | null = null;
    setAppData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => {
        if (q.id !== id) return q;
        const costWithFailureRate = q.costBreakdown?.costWithFailureRate || 0;
        const effectiveProfit = parseFloat((newPrice - costWithFailureRate).toFixed(2));
        const effectiveMargin = costWithFailureRate > 0
          ? parseFloat((((newPrice - costWithFailureRate) / costWithFailureRate) * 100).toFixed(1))
          : 0;
        updatedQuote = {
          ...q,
          quotePrice: newPrice,
          costBreakdown: {
            ...q.costBreakdown,
            profit: effectiveProfit,
          },
          parameters: {
            ...q.parameters,
            profitMargin: effectiveMargin,
          },
        };
        return updatedQuote;
      })
    }));
    if (user && updatedQuote) {
      saveQuoteToRemote(user.uid, updatedQuote).catch(console.error);
    }
  }, [setAppData, user]);

  const handleUpdateQuote = useCallback((updatedQuote: Quote) => {
    setAppData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
    }));
    if (user) {
      saveQuoteToRemote(user.uid, updatedQuote).catch(console.error);
    }
  }, [setAppData, user]);

  const handleDeleteQuote = (id: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this quote? This will also delete any associated order."
    );
    if (isConfirmed) {
      setAppData(prev => ({ 
        ...prev, 
        quotes: prev.quotes.filter(q => q.id !== id),
        orders: prev.orders.filter(o => o.quoteId !== id)
      }));
      if (user) {
        deleteQuoteFromRemote(user.uid, id).catch(console.error);
      }
    }
  };

  const handleUpdateQuoteStatus = (id: string, status: QuoteStatus) => {
    setAppData(prev => ({ ...prev, quotes: prev.quotes.map(q => (q.id === id ? { ...q, status } : q)) }));
    if (user) {
      const q = quotes.find(item => item.id === id);
      if (q) {
        saveQuoteToRemote(user.uid, { ...q, status }).catch(console.error);
      }
    }
  };

  const handleArchiveQuote = (id: string, archive: boolean) => {
    let targetQuote: Quote | null = null;
    setAppData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => {
        if (q.id === id) {
          targetQuote = {
            ...q,
            isArchived: archive,
            archivedAt: archive ? new Date().toISOString() : undefined,
          };
          return targetQuote;
        }
        return q;
      })
    }));
    if (user && targetQuote) {
      saveQuoteToRemote(user.uid, targetQuote).catch(console.error);
    }
  };

  // Part Handlers
  const handleAddPart = (part: Omit<Part, 'id'>) => {
    const newPart: Part = { ...part, id: `part_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` };
    setAppData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
    if (user) savePartToRemote(user.uid, newPart).catch(console.error);
  };
  const handleUpdatePart = (updatedPart: Part) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.map(p => p.id === updatedPart.id ? updatedPart : p) }));
    if (user) savePartToRemote(user.uid, updatedPart).catch(console.error);
  };
  const handleDeletePart = (id: string) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
    if (user) deletePartFromRemote(user.uid, id).catch(console.error);
  };
  const handlePartSelect = useCallback((part: Part | null) => {
      if (part) {
          setQuoteParts(prev => prev.map(p => {
              if (p.id === activePartId) {
                  return {
                      ...p,
                      name: part.name,
                      filamentGrams: part.filamentGrams,
                      printHours: part.printHours,
                      postProcessingHours: part.postProcessingHours,
                      hardwareCost: part.hardwareCost,
                      colors: part.colors ? [...part.colors] : undefined,
                      imageUrl: part.imageUrl,
                      customUnitPrice: typeof part.customUnitPrice === 'number' && part.customUnitPrice >= 0 ? part.customUnitPrice : undefined,
                  };
              }
              return p;
          }));
      }
  }, [activePartId]);

  const handleUpdatePartUnitPrice = useCallback((partId: string, unitPrice: number | null) => {
    setQuoteParts(prev => prev.map(p => {
      if (p.id === partId) {
        return {
          ...p,
          customUnitPrice: unitPrice !== null && !isNaN(unitPrice) && unitPrice >= 0 ? unitPrice : undefined,
        };
      }
      return p;
    }));
  }, []);

  const handleResetAllPartUnitPrices = useCallback(() => {
    setQuoteParts(prev => prev.map(p => ({
      ...p,
      customUnitPrice: undefined,
    })));
  }, []);

  // Order Handlers
  const handleCreateOrder = (quoteId: string) => {
    const newOrder: Order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      quoteId,
      orderNumber: nextOrderNumber,
      createdAt: new Date().toISOString(),
      status: OrderStatus.InProgress,
    };
    setAppData(prev => ({ ...prev, orders: [...prev.orders, newOrder].sort((a,b) => b.orderNumber - a.orderNumber) }));
    if (user) saveOrderToRemote(user.uid, newOrder).catch(console.error);
    setView('orders');
  };
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    let targetOrder: Order | null = null;
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id === orderId) {
          targetOrder = {
            ...o,
            status,
            completedAt: status === OrderStatus.Completed ? (o.completedAt || new Date().toISOString()) : o.completedAt,
          };
          return targetOrder;
        }
        return o;
      })
    }));
    if (user && targetOrder) saveOrderToRemote(user.uid, targetOrder).catch(console.error);
  };
  const handleUpdateOrderPhoto = (orderId: string, completedImageUrl?: string) => {
    let targetOrder: Order | null = null;
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id === orderId) {
          targetOrder = {
            ...o,
            completedImageUrl,
            completedAt: completedImageUrl ? (o.completedAt || new Date().toISOString()) : o.completedAt,
          };
          return targetOrder;
        }
        return o;
      })
    }));
    if (user && targetOrder) saveOrderToRemote(user.uid, targetOrder).catch(console.error);
  };
  const handleDeleteOrder = (orderId: string) => {
    setAppData(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== orderId) }));
    if (user) deleteOrderFromRemote(user.uid, orderId).catch(console.error);
  };

  const handleArchiveOrder = (orderId: string, archive: boolean) => {
    let targetOrder: Order | null = null;
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id === orderId) {
          targetOrder = {
            ...o,
            isArchived: archive,
            archivedAt: archive ? new Date().toISOString() : undefined,
          };
          return targetOrder;
        }
        return o;
      })
    }));
    if (user && targetOrder) {
      saveOrderToRemote(user.uid, targetOrder).catch(console.error);
    }
  };

  const handleUpdateOrderMilestones = (orderId: string, milestones: Record<string, Partial<Record<string, boolean>>>) => {
    let targetOrder: Order | null = null;
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => {
        if (o.id === orderId) {
          targetOrder = {
            ...o,
            milestones,
          };
          return targetOrder;
        }
        return o;
      })
    }));
    if (user && targetOrder) {
      saveOrderToRemote(user.uid, targetOrder).catch(console.error);
    }
  };

  // Filament Handlers
  const handleAddFilament = (filament: Omit<Filament, 'id'>) => {
    const newFilament: Filament = { ...filament, id: `filament_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` };
    setAppData(prev => ({ ...prev, filaments: [...prev.filaments, newFilament] }));
    if (user) saveFilamentToRemote(user.uid, newFilament).catch(console.error);
  };
  const handleUpdateFilament = (updatedFilament: Filament) => {
    setAppData(prev => ({ ...prev, filaments: prev.filaments.map(m => m.id === updatedFilament.id ? updatedFilament : m) }));
    if (user) saveFilamentToRemote(user.uid, updatedFilament).catch(console.error);
  };
  const handleDeleteFilament = (id: string) => {
    const newFilaments = filaments.filter(m => m.id !== id);
    setAppData(prev => ({ ...prev, filaments: newFilaments }));
    if (parameters.filamentId === id) {
      setParameters(p => ({ ...p, filamentId: newFilaments.length > 0 ? newFilaments[0].id : null }));
    }
    if (user) deleteFilamentFromRemote(user.uid, id).catch(console.error);
  };

  const handleBatchAddFilaments = useCallback((newFilaments: Filament[], mode: 'merge' | 'replace') => {
    let updatedList: Filament[] = [];
    if (mode === 'replace') {
      updatedList = newFilaments;
    } else {
      // Merge: deduplicate or update by short_code or brand+material+color
      const existingMap = new Map<string, Filament>();
      filaments.forEach(f => {
        const key = f.short_code ? `code_${f.short_code}` : `${f.brand}_${f.type}_${f.colorName || ''}`;
        existingMap.set(key, f);
      });
      newFilaments.forEach(nf => {
        const key = nf.short_code ? `code_${nf.short_code}` : `${nf.brand}_${nf.type}_${nf.colorName || ''}`;
        existingMap.set(key, nf);
      });
      updatedList = Array.from(existingMap.values());
    }

    setAppData(prev => ({ ...prev, filaments: updatedList }));

    if (user) {
      saveFilamentsBatchToRemote(user.uid, updatedList).catch(console.error);
    }
  }, [filaments, setAppData, user]);

  // Printer Handlers
  const handleAddPrinter = (printer: Omit<Printer, 'id'>) => {
    const newPrinter: Printer = { ...printer, id: `printer_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` };
    setAppData(prev => ({ ...prev, printers: [...prev.printers, newPrinter] }));
    if (user) savePrinterToRemote(user.uid, newPrinter).catch(console.error);
  };
  const handleUpdatePrinter = (updatedPrinter: Printer) => {
    setAppData(prev => ({ ...prev, printers: prev.printers.map(p => p.id === updatedPrinter.id ? updatedPrinter : p) }));
    if (user) savePrinterToRemote(user.uid, updatedPrinter).catch(console.error);
  };
  const handleDeletePrinter = (id: string) => {
    const newPrinters = printers.filter(p => p.id !== id);
    setAppData(prev => ({ ...prev, printers: newPrinters }));
    if (parameters.printerId === id) {
      setParameters(p => ({ ...p, printerId: newPrinters.length > 0 ? newPrinters[0].id : null }));
    }
    if (user) deletePrinterFromRemote(user.uid, id).catch(console.error);
  };

  const handleReorderPrinters = useCallback((reorderedPrinters: Printer[]) => {
    const updated = reorderedPrinters.map((p, idx) => ({
      ...p,
      sortOrder: idx,
      isDefault: idx === 0,
    }));
    setAppData(prev => ({ ...prev, printers: updated }));
    if (user) {
      savePrintersBatchToRemote(user.uid, updated).catch(console.error);
    }
  }, [setAppData, user]);

  const handleReorderFilaments = useCallback((reorderedFilaments: Filament[]) => {
    const updated = reorderedFilaments.map((f, idx) => ({
      ...f,
      sortOrder: idx,
      isDefault: idx === 0,
    }));
    setAppData(prev => ({ ...prev, filaments: updated }));
    if (user) {
      saveFilamentsBatchToRemote(user.uid, updated).catch(console.error);
    }
  }, [setAppData, user]);

  // Settings Handler
  const handleSaveSettings = (newSettings: GeneralSettings) => {
    setAppData(prev => ({ ...prev, generalSettings: newSettings }));
    setParameters(p => ({
      ...p,
      electricityCostKwh: newSettings.electricityCostKwh,
      laborCostPerHour: newSettings.laborCostPerHour,
      failureRate: newSettings.failureRate,
      profitMargin: newSettings.profitMargin,
    }));
    if (user) saveSettingsToRemote(user.uid, newSettings).catch(console.error);
  };

  const handleUpdatePartialSettings = useCallback((partial: Partial<GeneralSettings>) => {
    setAppData(prev => {
      const merged = { ...prev.generalSettings, ...partial };
      if (user) saveSettingsToRemote(user.uid, merged).catch(console.error);
      return { ...prev, generalSettings: merged };
    });
  }, [setAppData, user]);
  
  // Data Management Handlers
  const handleExportData = useCallback(() => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(appData, null, 2)
    )}`;
    const link = document.createElement("a");
    const today = new Date().toISOString().split('T')[0];
    link.href = jsonString;
    link.download = `3d_print_tracker_backup_${today}.json`;
    link.click();
  }, [appData]);

  const handleExportJobsMarkdown = useCallback(() => {
    if (quotes.length === 0) {
      alert("No saved jobs to export.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllJobsMarkdown(quotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Jobs_Obsidian_${today}.md`, md);
  }, [quotes, filaments, printers]);

  const handleExportOrdersMarkdown = useCallback(() => {
    if (orders.length === 0) {
      alert("No active orders to export.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllOrdersMarkdown(orders, quotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Orders_Obsidian_${today}.md`, md);
  }, [orders, quotes, filaments, printers]);

  const handleExportInvoicesMarkdown = useCallback(() => {
    if (quotes.length === 0) {
      alert("No quotes or invoices to export. Create a quote first.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllInvoicesMarkdown(quotes, filaments, printers);
    downloadMarkdownFile(`3D_Print_Invoices_Obsidian_${today}.md`, md);
  }, [quotes, filaments, printers]);

  const handleExportPartsMarkdown = useCallback(() => {
    if (parts.length === 0) {
      alert("No parts to export. Add parts to your catalog first.");
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const md = generateAllPartsMarkdown(parts, filaments, printers);
    downloadMarkdownFile(`3D_Print_Parts_Catalog_Obsidian_${today}.md`, md);
  }, [parts, filaments, printers]);

  const handleExportVaultZip = useCallback(async () => {
    try {
      await downloadObsidianVaultZip(quotes, orders, parts, filaments, printers);
    } catch (err) {
      console.error("Failed to export vault zip", err);
      alert("Error creating Obsidian vault archive");
    }
  }, [quotes, orders, parts, filaments, printers]);

  const handleImportData = useCallback((file: File) => {
    if (!file) {
      alert("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        alert("Could not read file.");
        return;
      }
      try {
        const importedData = JSON.parse(text) as AppData;

        const isValid = 
          importedData &&
          typeof importedData === 'object' &&
          !Array.isArray(importedData) &&
          Array.isArray(importedData.filaments) &&
          Array.isArray(importedData.printers) &&
          Array.isArray(importedData.quotes) &&
          Array.isArray(importedData.parts) &&
          Array.isArray(importedData.orders) &&
          importedData.generalSettings &&
          typeof importedData.generalSettings === 'object' &&
          !Array.isArray(importedData.generalSettings);

        if (!isValid) {
          throw new Error("Invalid data structure. The file must be a JSON object containing arrays for 'filaments', 'printers', 'quotes', 'parts', 'orders' and an object for 'generalSettings'.");
        }
        
        const isConfirmed = window.confirm(
          "Are you sure you want to import this data? This will overwrite all existing jobs, filaments, printers, and settings."
        );

        if (isConfirmed) {
          setAppData(importedData);

          // After import, reset the calculator state to use the new data as defaults.
          setParameters({
            filamentGrams: 100,
            filamentId: importedData.filaments.length > 0 ? importedData.filaments[0].id : null,
            printHours: 5,
            printerId: importedData.printers.length > 0 ? importedData.printers[0].id : null,
            postProcessingHours: 0.5,
            hardwareCost: 0,
            ...importedData.generalSettings,
          });
          
          alert("Data imported successfully!");
          setView('calculator');
        }
      } catch (error) {
        console.error("Failed to import data:", error);
        alert(`Failed to import data. Please check the file format.\nError: ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    reader.onerror = () => {
        alert("Error reading file.");
    };
    reader.readAsText(file);
  }, [setAppData, setParameters, setView]);


  const renderContent = () => {
    switch(view) {
      case 'calculator':
        return (
          <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
            <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
              <CalculatorForm 
                parameters={parameters} 
                setParameters={setParameters}
                filaments={filaments}
                printers={printers}
                parts={parts}
                onPartSelect={handlePartSelect}
                quoteParts={quoteParts}
                setQuoteParts={setQuoteParts}
                activePartId={activePartId}
                setActivePartId={setActivePartId}
                generalSettings={generalSettings}
                multiColorBatchMode={multiColorBatchMode}
                setMultiColorBatchMode={setMultiColorBatchMode}
                multiColorBedCount={multiColorBedCount}
                setMultiColorBedCount={setMultiColorBedCount}
                multiColorSavedFee={costBreakdown.multiColorSavedFee}
                totalMultiColorFee={costBreakdown.multiColorFee}
              />
            </div>
            <div className="lg:col-span-3">
              <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
                <CostBreakdownDisplay
                  parameters={parameters}
                  costBreakdown={costBreakdown}
                  quotePrice={costBreakdown.quotePrice}
                  onSaveQuote={handleSaveQuote}
                  nextJobNumber={nextJobNumber}
                  revisingQuote={revisingQuote}
                  onCancelRevision={handleCancelRevision}
                  quoteParts={quoteParts}
                  printers={printers}
                  filaments={filaments}
                  onUpdatePartUnitPrice={handleUpdatePartUnitPrice}
                  onResetAllPartUnitPrices={handleResetAllPartUnitPrices}
                  multiColorBatchMode={multiColorBatchMode}
                  onUpdateMultiColorBatchMode={setMultiColorBatchMode}
                  multiColorBedCount={multiColorBedCount}
                  onUpdateMultiColorBedCount={setMultiColorBedCount}
                  generalSettings={generalSettings}
                  onUpdateGeneralSettings={handleUpdatePartialSettings}
                />
              </div>
            </div>
          </main>
        );
      case 'jobs':
        return (
          <JobsPage 
            quotes={quotes}
            filaments={filaments}
            printers={printers}
            orders={orders}
            onDelete={handleDeleteQuote}
            onUpdateStatus={handleUpdateQuoteStatus}
            onCreateOrder={handleCreateOrder}
            onUpdatePrice={handleUpdateQuotePrice}
            onReviseQuote={handleReviseQuote}
            onUseAsTemplate={handleUseQuoteAsTemplate}
            onOpenGoogleSheets={() => setIsGoogleSheetsModalOpen(true)}
            onArchive={handleArchiveQuote}
            generalSettings={generalSettings}
            onUpdateGeneralSettings={handleUpdatePartialSettings}
            onUpdateQuote={handleUpdateQuote}
          />
        );
      case 'orders':
        return (
          <OrdersPage
            orders={orders}
            quotes={quotes}
            filaments={filaments}
            printers={printers}
            onDelete={handleDeleteOrder}
            onUpdateStatus={handleUpdateOrderStatus}
            onUpdateOrderPhoto={handleUpdateOrderPhoto}
            onArchive={handleArchiveOrder}
            onUpdateOrderMilestones={handleUpdateOrderMilestones}
            generalSettings={generalSettings}
            onUpdateGeneralSettings={handleUpdatePartialSettings}
            onUpdateQuote={handleUpdateQuote}
          />
        );
       case 'parts':
        return (
          <PartsPage 
            parts={parts}
            filaments={filaments}
            printers={printers}
            onAdd={handleAddPart}
            onUpdate={handleUpdatePart}
            onDelete={handleDeletePart}
          />
        );
      case 'filaments':
        return (
          <ConfigurationPage 
            filaments={filaments}
            onAdd={handleAddFilament}
            onUpdate={handleUpdateFilament}
            onDelete={handleDeleteFilament}
            onBatchAdd={handleBatchAddFilaments}
            onReorder={handleReorderFilaments}
          />
        );
      case 'printers':
        return (
           <PrinterConfigurationPage
            printers={printers}
            onAdd={handleAddPrinter}
            onUpdate={handleUpdatePrinter}
            onDelete={handleDeletePrinter}
            onReorder={handleReorderPrinters}
          />
        );
      case 'settings':
        return (
          <GeneralConfigurationPage 
            settings={generalSettings}
            onSave={handleSaveSettings}
            onExport={handleExportData}
            onImport={handleImportData}
            onExportJobsMarkdown={handleExportJobsMarkdown}
            onExportOrdersMarkdown={handleExportOrdersMarkdown}
            onExportInvoicesMarkdown={handleExportInvoicesMarkdown}
            onExportPartsMarkdown={handleExportPartsMarkdown}
            onExportVaultZip={handleExportVaultZip}
            onOpenChangeLogModal={() => setIsChangeLogModalOpen(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header
          user={user}
          authLoading={authLoading}
          isSyncing={isSyncing}
          localServerAvailable={localServerStatus.available}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onSyncAllLocal={handleSyncAllLocal}
          onOpenDockerModal={() => setIsDockerModalOpen(true)}
          onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
          onOpenChangeLogModal={() => setIsChangeLogModalOpen(true)}
          onExportBackup={handleExportBackup}
        />

        <DockerSetupModal
          isOpen={isDockerModalOpen}
          onClose={() => setIsDockerModalOpen(false)}
          serverStatus={localServerStatus}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />

        <GoogleSheetsModal
          isOpen={isGoogleSheetsModalOpen}
          onClose={() => setIsGoogleSheetsModalOpen(false)}
          user={user}
          appData={appData}
          onUpdateAppData={setAppData}
          onSignIn={handleSignIn}
          cachedToken={cachedToken}
          onSetToast={(msg) => {
            setRemoteToast(msg);
            setTimeout(() => setRemoteToast(null), 4000);
          }}
        />

        <ChangeLogModal
          isOpen={isChangeLogModalOpen}
          onClose={() => setIsChangeLogModalOpen(false)}
        />

        {remoteToast && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 text-sm rounded-xl flex items-center justify-between shadow-lg animate-fadeIn">
            <span className="flex items-center gap-2">
              <span>✨</span>
              <span>{remoteToast}</span>
            </span>
            <button
              onClick={() => setRemoteToast(null)}
              className="text-emerald-400 hover:text-emerald-100 font-bold ml-2 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <Nav currentView={view} onViewChange={setView} />
        {renderContent()}

        {/* Global Footer with Version & Change Log trigger */}
        <footer className="mt-14 pt-6 pb-8 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-2 text-slate-400">
            <span className="font-semibold text-slate-300">3D Print Cost &amp; Quote Tracker</span>
            <span>&bull;</span>
            <button
              type="button"
              onClick={() => setIsChangeLogModalOpen(true)}
              className="font-mono text-cyan-400 hover:text-cyan-300 font-semibold underline decoration-cyan-500/40 hover:decoration-cyan-300 transition cursor-pointer"
              title="Open full version change logs"
            >
              v{APP_VERSION} Change Log
            </button>
            <span>&bull;</span>
            <span>{APP_RELEASE_DATE}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Precision additive manufacturing cost estimation, quote generation, and print farm job management.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;