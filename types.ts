export interface SpoolProperties {
  purchase_date?: string | null;
  last_dried_date?: string | null;
  purchase_price?: number | null;
  [key: string]: any;
}

export interface Filament {
  id: string;
  type: string;
  name?: string;
  brand: string;
  costPerKg: number;
  colorHex?: string;
  colorName?: string;

  // 3DFilamentProfiles / SpoolDB (https://3dfilamentprofiles.com/) fields
  short_code?: string;
  spool_url?: string;
  material?: string;
  material_type?: string;
  rgb?: string;
  td_value?: number | null;
  notes?: string | null;
  location?: string | null;
  remaining_grams?: number;
  empty_spool_weight?: number | null;
  actual_spool_weight?: number | null; // Total weight of spool + filament measured on scale (gross grams)
  updated_at?: string;
  spool_properties?: SpoolProperties;
  filament_id?: number;

  // Technical Difficulty & Ordering
  failureRate?: number | null; // Technical failure rate risk override (%) for difficult materials (e.g. 15% for TPU, 18% for ABS)
  sortOrder?: number;
  isDefault?: boolean;

  // Filament Master Code v0.1: 4-digit ID (Digit 1: Brand, Digit 2: Polymer, Digits 3-4: Color/Modifier)
  masterCode?: string;
}

export interface Printer {
  id: string;
  name: string;
  brand: string;
  watts: number;
  
  // Printer Use Time, Depreciation & Maintenance
  purchaseCost?: number;            // Initial acquisition cost ($)
  lifespanHours?: number;           // Expected operating lifespan (hours)
  hourlyDepreciation?: number;      // Calculated (purchaseCost / lifespanHours) or custom ($/hr)
  maintenanceCostPerHour?: number;  // Wear & tear, nozzles, belts, spare parts ($/hr)
  hourlyUsageFee?: number;          // Additional equipment usage/runtime fee ($/hr)
  customHourlyRate?: boolean;       // Whether user entered a direct hourly override
  sortOrder?: number;
  isDefault?: boolean;
}

export interface PartFilamentColor {
  id: string;
  filamentId: string | null;
  grams: number;
}

export interface Part {
  id: string;
  name: string;
  description: string;
  filamentGrams: number;
  printHours: number;
  postProcessingHours: number;
  hardwareCost: number;
  colors?: PartFilamentColor[];
  imageUrl?: string; // Photo of the part / prototype
  customUnitPrice?: number | null; // Optional default selling unit price ($)
  filamentId?: string | null; // Default / base material assigned to part
  printerId?: string | null;  // Default preferred printer
}

export type MultiColorPricingMode = 'simple' | 'complex' | 'none';
export type SimpleMultiColorType = 'flat_per_part' | 'per_additional_color' | 'percentage';
export type MultiColorBatchMode = 'single_batch_per_bed' | 'per_copy';

export interface GeneralSettings {
  electricityCostKwh: number;
  laborCostPerHour: number;
  failureRate: number;
  profitMargin: number;

  // Printer Use Time & Depreciation Settings
  enablePrinterDepreciation?: boolean;     // Enable/disable printer time & depreciation in quotes
  defaultPrinterHourlyRate?: number;       // Fallback machine hourly rate if not configured ($/hr)
  defaultPrinterLifespanHours?: number;    // Default lifespan for new printers (hours, e.g. 3000)
  defaultMaintenanceCostPerHour?: number;  // Default maintenance wear cost ($/hr, e.g. 0.15)
  defaultHourlyUsageFee?: number;          // Default equipment usage fee ($/hr, e.g. 0.50)

  // Multi-color print settings
  multiColorPricingMode?: MultiColorPricingMode;
  simpleMultiColorType?: SimpleMultiColorType;
  simpleMultiColorFee?: number;
  complexSpoolSetupFee?: number;
  complexPurgeWastePercent?: number;
  complexCostPerColorChange?: number;
  complexHandlingFee?: number;
  defaultMultiColorBatchMode?: MultiColorBatchMode; // Default bed batching mode

  // Material Difficulty & Technical Failure Rates (TPU, ABS, Nylon, PC, etc.)
  enableMaterialDifficultyRates?: boolean; // Whether material difficulty failure rate rules are active
  materialFailureRates?: {
    tpu?: number;    // e.g. 15% (TPU / TPE / Flexible)
    abs?: number;    // e.g. 18% (ABS / ASA - warping & delamination)
    nylon?: number;  // e.g. 20% (Nylon / PA)
    pc?: number;     // e.g. 20% (Polycarbonate)
    carbon?: number; // e.g. 12% (Carbon fiber filled)
    standard?: number; // e.g. 5% (PLA, PETG base fallback)
    [key: string]: number | undefined;
  };

  // Print & Invoicing Studio Profile
  studioName?: string;
  studioTagline?: string;
  studioEmail?: string;
  studioPhone?: string;
  studioWebsite?: string;
  studioAddress?: string;
  studioTerms?: string;
}

export interface PrintParameters {
  filamentGrams: number;
  filamentId: string | null;
  printHours: number;
  printerId: string | null;
  electricityCostKwh: number;
  postProcessingHours: number;
  laborCostPerHour: number;
  failureRate: number;
  profitMargin: number;
  hardwareCost: number;
  colors?: PartFilamentColor[];
  colorChanges?: number;
  multiColorBatchMode?: MultiColorBatchMode; // 'single_batch_per_bed' | 'per_copy'
  multiColorBedCount?: number;               // Number of beds/plates needed (default 1)
}

export interface CostBreakdown {
  filamentCost: number;
  electricityCost: number;
  laborCost: number;
  hardwareCost: number;
  printerCost?: number; // Total cost of printer use time & depreciation
  printerDepreciationCost?: number;
  printerMaintenanceCost?: number;
  multiColorFee?: number;
  multiColorBatchMode?: MultiColorBatchMode;
  multiColorBedCount?: number;
  multiColorSavedFee?: number; // Amount saved by batching on 1 bed
  subtotal: number;
  costWithFailureRate: number;
  profit: number;
  effectiveFailureRate?: number;
  materialRiskApplied?: boolean;
  materialRiskReason?: string;
}

export interface QuotePartConfig {
  id: string;
  name: string;
  quantity: number;
  quantityRequired?: number;
  filamentGrams: number;
  filamentId: string | null;
  printHours: number;
  printerId: string | null;
  postProcessingHours: number;
  hardwareCost: number;
  colors?: PartFilamentColor[];
  colorChanges?: number;
  imageUrl?: string; // Photo of this part
  customUnitPrice?: number | null; // User-adjusted manual unit price ($)
  failureRate?: number; // Technical failure rate applied for this part (%)
}

export enum QuoteStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}

export interface Quote {
  id: string;
  jobNumber: number;
  jobName: string;
  customerName: string;
  createdAt: string;
  quotePrice: number;
  status: QuoteStatus;
  parameters: PrintParameters;
  costBreakdown: CostBreakdown;
  parts?: QuotePartConfig[];
  isArchived?: boolean;
  archivedAt?: string;
}

export enum OrderStatus {
  InProgress = 'In Progress',
  Completed = 'Completed',
  Shipped = 'Shipped',
  Cancelled = 'Cancelled',
}

export interface Order {
  id: string;
  orderNumber: number;
  quoteId: string;
  createdAt: string;
  status: OrderStatus;
  completedImageUrl?: string; // Photo of the completed 3D print
  completedAt?: string;       // Timestamp when finished / photo attached
  completionNotes?: string;   // Optional notes on the finished print / inspection
  isArchived?: boolean;
  archivedAt?: string;
  milestones?: Record<string, Partial<Record<string, boolean>>>; // unitId -> { [milestoneKey]: boolean }
}

export interface AppData {
  filaments: Filament[];
  printers: Printer[];
  parts: Part[];
  orders: Order[];
  generalSettings: GeneralSettings;
  quotes: Quote[];
}
