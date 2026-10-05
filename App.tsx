import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { PrintParameters, CostBreakdown, Filament, Printer, GeneralSettings, Quote, QuoteStatus, AppData, Part, Order, OrderStatus, QuotePartConfig } from './types';
import { calculatePrinterRates } from './utils/printerRates';
import {
  generateAllJobsMarkdown,
  generateAllOrdersMarkdown,
  generateAllPartsMarkdown,
  downloadObsidianVaultZip,
  downloadMarkdownFile,
} from './utils/markdownExport';
import useLocalStorage from './hooks/useLocalStorage';
import Header from './components/Header';
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

  const [quoteParts, setQuoteParts] = useState<QuotePartConfig[]>(() => {
    const initialFilamentId = filaments.length > 0 ? filaments[0].id : null;
    const initialPrinterId = printers.length > 0 ? printers[0].id : null;
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

  const activePart = useMemo(() => {
    return quoteParts.find(p => p.id === activePartId) || quoteParts[0] || {
      id: 'part-1',
      name: 'Part 1',
      quantity: 1,
      filamentGrams: 100,
      filamentId: filaments.length > 0 ? filaments[0].id : null,
      printHours: 5,
      printerId: printers.length > 0 ? printers[0].id : null,
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
      ...generalSettings,
    };
  }, [activePart, generalSettings]);

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
            ...generalSettings,
          };
          const nextParams = typeof value === 'function' ? value(currentParams) : value;
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
  }, [activePartId, generalSettings]);

  const partsBreakdowns = useMemo(() => {
    return quoteParts.map(part => {
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

      if (part.colors && part.colors.length > 0) {
        part.colors.forEach(col => {
          const fil = filaments.find(f => f.id === col.filamentId);
          const costPerKg = fil?.costPerKg || 0;
          filamentCost += (col.grams / 1000) * costPerKg * part.quantity;
          totalFilamentGrams += col.grams;
        });
      } else {
        const filament = filaments.find(f => f.id === part.filamentId) || null;
        const costPerKg = filament?.costPerKg || 0;
        filamentCost = (part.filamentGrams / 1000) * costPerKg * part.quantity;
        totalFilamentGrams = part.filamentGrams;
      }

      // Multi-Color Extra Fee:
      let multiColorFee = 0;
      const pricingMode = generalSettings.multiColorPricingMode || 'simple';

      if (isMultiColor && pricingMode !== 'none') {
        if (pricingMode === 'simple') {
          const simpleType = generalSettings.simpleMultiColorType || 'per_additional_color';
          const feeRate = generalSettings.simpleMultiColorFee ?? 3.00;
          if (simpleType === 'flat_per_part') {
            multiColorFee = feeRate * part.quantity;
          } else if (simpleType === 'percentage') {
            multiColorFee = filamentCost * (feeRate / 100);
          } else {
            // per_additional_color
            const extraColors = Math.max(0, colorsCount - 1);
            multiColorFee = extraColors * feeRate * part.quantity;
          }
        } else if (pricingMode === 'complex') {
          const spoolFee = colorsCount * (generalSettings.complexSpoolSetupFee ?? 2.50);
          const purgeBuffer = filamentCost * ((generalSettings.complexPurgeWastePercent ?? 15) / 100);
          const swapFee = (part.colorChanges || 0) * (generalSettings.complexCostPerColorChange ?? 0.05) * part.quantity;
          const handlingFee = (generalSettings.complexHandlingFee ?? 4.00) * part.quantity;
          multiColorFee = spoolFee + purgeBuffer + swapFee + handlingFee;
        }
      }

      const electricityCost = (part.printHours * (printerWatts / 1000)) * generalSettings.electricityCostKwh * part.quantity;
      const laborCost = part.postProcessingHours * generalSettings.laborCostPerHour * part.quantity;
      const hardwareCost = part.hardwareCost * part.quantity;
      
      const subtotal = filamentCost + electricityCost + laborCost + hardwareCost + multiColorFee + printerCost;

      return {
        partId: part.id,
        filamentCost,
        electricityCost,
        laborCost,
        hardwareCost,
        printerCost,
        printerDepreciationCost,
        printerMaintenanceCost,
        effectivePrinterRate,
        printerRates,
        multiColorFee,
        subtotal,
        totalFilamentGrams,
        isMultiColor,
        colorsCount,
      };
    });
  }, [quoteParts, filaments, printers, generalSettings]);

  const costBreakdown = useMemo<CostBreakdown & { quotePrice: number }>(() => {
    let filamentCost = 0;
    let electricityCost = 0;
    let laborCost = 0;
    let hardwareCost = 0;
    let printerCost = 0;
    let printerDepreciationCost = 0;
    let printerMaintenanceCost = 0;
    let multiColorFee = 0;
    let subtotal = 0;

    partsBreakdowns.forEach(pb => {
      filamentCost += pb.filamentCost;
      electricityCost += pb.electricityCost;
      laborCost += pb.laborCost;
      hardwareCost += pb.hardwareCost;
      printerCost += (pb.printerCost || 0);
      printerDepreciationCost += (pb.printerDepreciationCost || 0);
      printerMaintenanceCost += (pb.printerMaintenanceCost || 0);
      multiColorFee += pb.multiColorFee;
      subtotal += pb.subtotal;
    });

    const costWithFailureRate = subtotal / (1 - (generalSettings.failureRate / 100));
    const profit = costWithFailureRate * (generalSettings.profitMargin / 100);
    const quotePrice = parseFloat((costWithFailureRate + profit).toFixed(2));

    return {
      filamentCost,
      electricityCost,
      laborCost,
      hardwareCost,
      printerCost,
      printerDepreciationCost,
      printerMaintenanceCost,
      multiColorFee,
      subtotal,
      costWithFailureRate,
      profit,
      quotePrice,
    };
  }, [partsBreakdowns, generalSettings]);

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
  const handleSaveQuote = useCallback((jobName: string, customerName: string, jobNumber: number, finalQuotePrice: number, params: PrintParameters, breakdown: CostBreakdown) => {
    if (quotes.some(q => q.jobNumber === jobNumber && (!revisingQuote || q.id !== revisingQuote.id))) {
      alert(`Job number ${jobNumber} already exists. Please choose a unique job number.`);
      return;
    }
    const costWithFailureRate = breakdown.costWithFailureRate;
    const effectiveProfit = parseFloat((finalQuotePrice - costWithFailureRate).toFixed(2));
    const effectiveMargin = costWithFailureRate > 0
      ? parseFloat((((finalQuotePrice - costWithFailureRate) / costWithFailureRate) * 100).toFixed(1))
      : 0;

    if (revisingQuote) {
      setAppData(prev => ({
        ...prev,
        quotes: prev.quotes.map(q => {
          if (q.id === revisingQuote.id) {
            return {
              ...q,
              jobNumber,
              jobName,
              customerName,
              quotePrice: finalQuotePrice,
              parameters: {
                ...params,
                profitMargin: effectiveMargin,
              },
              costBreakdown: {
                ...breakdown,
                profit: effectiveProfit,
              },
              parts: quoteParts,
            };
          }
          return q;
        }).sort((a, b) => b.jobNumber - a.jobNumber)
      }));
      setRevisingQuote(null);
    } else {
      const newQuote: Quote = {
        id: new Date().toISOString(),
        jobNumber,
        jobName,
        customerName,
        createdAt: new Date().toISOString(),
        quotePrice: finalQuotePrice,
        status: QuoteStatus.Pending,
        parameters: {
          ...params,
          profitMargin: effectiveMargin,
        },
        costBreakdown: {
          ...breakdown,
          profit: effectiveProfit,
        },
        parts: quoteParts,
      };
      setAppData(prev => ({ ...prev, quotes: [...prev.quotes, newQuote].sort((a, b) => b.jobNumber - a.jobNumber) }));
    }
    
    // Reset quote parts
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
  }, [quotes, revisingQuote, quoteParts, filaments, printers, setAppData]);

  const handleReviseQuote = useCallback((quote: Quote) => {
    setRevisingQuote(quote);
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

  const handleCancelRevision = useCallback(() => {
    setRevisingQuote(null);
  }, []);

  const handleUpdateQuotePrice = useCallback((id: string, newPrice: number) => {
    setAppData(prev => ({
      ...prev,
      quotes: prev.quotes.map(q => {
        if (q.id !== id) return q;
        const costWithFailureRate = q.costBreakdown?.costWithFailureRate || 0;
        const effectiveProfit = parseFloat((newPrice - costWithFailureRate).toFixed(2));
        const effectiveMargin = costWithFailureRate > 0
          ? parseFloat((((newPrice - costWithFailureRate) / costWithFailureRate) * 100).toFixed(1))
          : 0;
        return {
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
      })
    }));
  }, [setAppData]);

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
    }
  };

  const handleUpdateQuoteStatus = (id: string, status: QuoteStatus) => {
    setAppData(prev => ({ ...prev, quotes: prev.quotes.map(q => (q.id === id ? { ...q, status } : q)) }));
  };

  // Part Handlers
  const handleAddPart = (part: Omit<Part, 'id'>) => {
    const newPart = { ...part, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, parts: [...prev.parts, newPart] }));
  };
  const handleUpdatePart = (updatedPart: Part) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.map(p => p.id === updatedPart.id ? updatedPart : p) }));
  };
  const handleDeletePart = (id: string) => {
    setAppData(prev => ({ ...prev, parts: prev.parts.filter(p => p.id !== id) }));
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
                  };
              }
              return p;
          }));
      }
  }, [activePartId]);

  // Order Handlers
  const handleCreateOrder = (quoteId: string) => {
    const newOrder: Order = {
      id: new Date().toISOString(),
      quoteId,
      orderNumber: nextOrderNumber,
      createdAt: new Date().toISOString(),
      status: OrderStatus.InProgress,
    };
    setAppData(prev => ({ ...prev, orders: [...prev.orders, newOrder].sort((a,b) => b.orderNumber - a.orderNumber) }));
    setView('orders');
  };
  const handleUpdateOrderStatus = (orderId: string, status: OrderStatus) => {
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? {
        ...o,
        status,
        completedAt: status === OrderStatus.Completed ? (o.completedAt || new Date().toISOString()) : o.completedAt,
      } : o)
    }));
  };
  const handleUpdateOrderPhoto = (orderId: string, completedImageUrl?: string) => {
    setAppData(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? {
        ...o,
        completedImageUrl,
        completedAt: completedImageUrl ? (o.completedAt || new Date().toISOString()) : o.completedAt,
      } : o)
    }));
  };
  const handleDeleteOrder = (orderId: string) => {
    setAppData(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== orderId) }));
  };

  // Filament Handlers
  const handleAddFilament = (filament: Omit<Filament, 'id'>) => {
    const newFilament = { ...filament, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, filaments: [...prev.filaments, newFilament] }));
  };
  const handleUpdateFilament = (updatedFilament: Filament) => {
    setAppData(prev => ({ ...prev, filaments: prev.filaments.map(m => m.id === updatedFilament.id ? updatedFilament : m) }));
  };
  const handleDeleteFilament = (id: string) => {
    const newFilaments = filaments.filter(m => m.id !== id);
    setAppData(prev => ({ ...prev, filaments: newFilaments }));
    if (parameters.filamentId === id) {
      setParameters(p => ({ ...p, filamentId: newFilaments.length > 0 ? newFilaments[0].id : null }));
    }
  };

  // Printer Handlers
  const handleAddPrinter = (printer: Omit<Printer, 'id'>) => {
    const newPrinter = { ...printer, id: new Date().toISOString() };
    setAppData(prev => ({ ...prev, printers: [...prev.printers, newPrinter] }));
  };
  const handleUpdatePrinter = (updatedPrinter: Printer) => {
    setAppData(prev => ({ ...prev, printers: prev.printers.map(p => p.id === updatedPrinter.id ? updatedPrinter : p) }));
  };
  const handleDeletePrinter = (id: string) => {
    const newPrinters = printers.filter(p => p.id !== id);
    setAppData(prev => ({ ...prev, printers: newPrinters }));
    if (parameters.printerId === id) {
      setParameters(p => ({ ...p, printerId: newPrinters.length > 0 ? newPrinters[0].id : null }));
    }
  };

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
  };
  
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
          />
        );
      case 'printers':
        return (
           <PrinterConfigurationPage
            printers={printers}
            onAdd={handleAddPrinter}
            onUpdate={handleUpdatePrinter}
            onDelete={handleDeletePrinter}
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
            onExportPartsMarkdown={handleExportPartsMarkdown}
            onExportVaultZip={handleExportVaultZip}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header />
        <Nav currentView={view} onViewChange={setView} />
        {renderContent()}
      </div>
    </div>
  );
}

export default App;