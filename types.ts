export interface Filament {
  id: string;
  type: string;
  name?: string;
  brand: string;
  costPerKg: number;
  colorHex?: string;
  colorName?: string;
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
}

export type MultiColorPricingMode = 'simple' | 'complex' | 'none';
export type SimpleMultiColorType = 'flat_per_part' | 'per_additional_color' | 'percentage';

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
  subtotal: number;
  costWithFailureRate: number;
  profit: number;
}

export interface QuotePartConfig {
  id: string;
  name: string;
  quantity: number;
  filamentGrams: number;
  filamentId: string | null;
  printHours: number;
  printerId: string | null;
  postProcessingHours: number;
  hardwareCost: number;
  colors?: PartFilamentColor[];
  colorChanges?: number;
  imageUrl?: string; // Photo of this part
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
}

export interface AppData {
  filaments: Filament[];
  printers: Printer[];
  parts: Part[];
  orders: Order[];
  generalSettings: GeneralSettings;
  quotes: Quote[];
}
