import { AppData, Quote, Part, Filament, Printer, Order, GeneralSettings, QuoteStatus, OrderStatus } from '../types';

export interface GoogleSheetsSyncResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  quotesCount: number;
  partsCount: number;
  printersCount: number;
  filamentsCount: number;
  ordersCount: number;
  timestamp: string;
}

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Creates a brand new Google Spreadsheet in the user's Google Drive with styled tabs
 */
export async function create3DPrintingSpreadsheet(
  accessToken: string,
  appData: AppData,
  customTitle?: string
): Promise<GoogleSheetsSyncResult> {
  const title = customTitle || `3D Print Quotes & Parts Manager (${new Date().toLocaleDateString()})`;

  // 1. Create spreadsheet with all sheets defined
  const createPayload = {
    properties: {
      title,
      locale: 'en_US',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    },
    sheets: [
      {
        properties: {
          title: 'Overview',
          gridProperties: { rowCount: 50, columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Quotes & Jobs',
          gridProperties: { rowCount: Math.max(appData.quotes.length + 15, 50), columnCount: 16, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Parts Catalog',
          gridProperties: { rowCount: Math.max(appData.parts.length + 15, 50), columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Filaments',
          gridProperties: { rowCount: Math.max(appData.filaments.length + 15, 30), columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: '3D Printers',
          gridProperties: { rowCount: Math.max(appData.printers.length + 15, 30), columnCount: 10, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Orders',
          gridProperties: { rowCount: Math.max(appData.orders.length + 15, 30), columnCount: 8, frozenRowCount: 1 },
        },
      },
      {
        properties: {
          title: 'Rates & Settings',
          gridProperties: { rowCount: 30, columnCount: 5, frozenRowCount: 1 },
        },
      },
    ],
  };

  const createRes = await fetch(SHEETS_API_BASE, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${createRes.status} ${errText}`);
  }

  const createdSheet = await createRes.json();
  const spreadsheetId = createdSheet.spreadsheetId;
  const spreadsheetUrl = createdSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate data into the newly created sheet
  await syncDataToSpreadsheet(accessToken, spreadsheetId, appData);

  // 3. Format header styling & column widths
  await formatSpreadsheetStyle(accessToken, spreadsheetId, createdSheet);

  return {
    spreadsheetId,
    spreadsheetUrl,
    quotesCount: appData.quotes.length,
    partsCount: appData.parts.length,
    printersCount: appData.printers.length,
    filamentsCount: appData.filaments.length,
    ordersCount: appData.orders.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pushes all quotes, parts, filaments, printers, and settings to an existing Google Spreadsheet
 */
export async function syncDataToSpreadsheet(
  accessToken: string,
  spreadsheetId: string,
  appData: AppData
): Promise<void> {
  const { quotes, parts, filaments, printers, orders, generalSettings } = appData;

  // Build Overview sheet data
  const totalQuoted = quotes.reduce((acc, q) => acc + (q.quotePrice || 0), 0);
  const acceptedQuotes = quotes.filter((q) => q.status === QuoteStatus.Accepted);
  const acceptedTotal = acceptedQuotes.reduce((acc, q) => acc + (q.quotePrice || 0), 0);
  const pendingQuotes = quotes.filter((q) => q.status === QuoteStatus.Pending);

  const overviewRows = [
    ['📊 3D PRINTING WORKSHOP SUMMARY & DASHBOARD', '', '', '', ''],
    ['Metric', 'Value', '', 'Workshop Fleet', 'Count'],
    ['Total Quotes Generated', quotes.length, '', 'Printers Configured', printers.length],
    ['Total Value of Quotes', `$${totalQuoted.toFixed(2)}`, '', 'Filament Spools in Catalog', filaments.length],
    ['Accepted Revenue Booked', `$${acceptedTotal.toFixed(2)}`, '', 'Catalog Parts Designed', parts.length],
    ['Pending Quotes Awaiting Approval', pendingQuotes.length, '', 'Active Production Orders', orders.length],
    ['Default Electricity Rate', `$${generalSettings.electricityCostKwh}/kWh`, '', 'Shop Labor Rate', `$${generalSettings.laborCostPerHour}/hr`],
    ['Failure Rate Risk Buffer', `${generalSettings.failureRate}%`, '', 'Default Target Profit Margin', `${generalSettings.profitMargin}%`],
    ['Last Synced From App', new Date().toLocaleString(), '', 'Sync Source', '3D Print Cost & Quote Tracker Web App'],
    ['', '', '', '', ''],
    ['💡 TIP:', 'This sheet was synced automatically with your 3D printing calculator. You can link this Sheet to Google Data Studio or share with your team.', '', '', '']
  ];

  // Build Quotes & Jobs sheet data
  const quoteRows = [
    [
      'Job #',
      'Job Name',
      'Customer',
      'Date',
      'Status',
      'Total Price ($)',
      'Print Hours',
      'Post-Proc (hrs)',
      'Filament (g)',
      'Filament Cost ($)',
      'Machine Wear & Electricity ($)',
      'Labor Cost ($)',
      'Hardware Cost ($)',
      'Subtotal ($)',
      'Profit ($)',
      'Itemized Parts Summary',
    ],
    ...quotes.map((q) => {
      const partsSummary = (q.parts || [])
        .map((p) => `${p.quantity || 1}x ${p.name} (${p.filamentGrams}g, ${p.printHours}h)`)
        .join('; ');

      const machineAndPower =
        (q.costBreakdown.electricityCost || 0) + (q.costBreakdown.printerCost || 0);

      return [
        q.jobNumber,
        q.jobName,
        q.customerName || 'Standard Client',
        q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '',
        q.status,
        Number((q.quotePrice || 0).toFixed(2)),
        q.parameters.printHours,
        q.parameters.postProcessingHours,
        q.parameters.filamentGrams,
        Number((q.costBreakdown.filamentCost || 0).toFixed(2)),
        Number(machineAndPower.toFixed(2)),
        Number((q.costBreakdown.laborCost || 0).toFixed(2)),
        Number((q.costBreakdown.hardwareCost || 0).toFixed(2)),
        Number((q.costBreakdown.subtotal || 0).toFixed(2)),
        Number((q.costBreakdown.profit || 0).toFixed(2)),
        partsSummary || '1x Custom Print',
      ];
    }),
  ];

  // Build Parts Catalog sheet data
  const partRows = [
    [
      'Part Name',
      'Description',
      'Filament (g)',
      'Print Hours',
      'Post-Proc Hours',
      'Hardware Cost ($)',
      'Multimaterial / Colors',
      'Image Preview URL',
      'Catalog Part ID',
    ],
    ...parts.map((p) => [
      p.name,
      p.description || '',
      p.filamentGrams,
      p.printHours,
      p.postProcessingHours,
      Number(p.hardwareCost || 0),
      p.colors && p.colors.length > 0 ? `${p.colors.length} color(s)` : 'Single Material',
      p.imageUrl || '',
      p.id,
    ]),
  ];

  // Build Filaments sheet data
  const filamentRows = [
    ['Material Type', 'Brand', 'Color Name', 'Color Hex Code', 'Cost per kg ($)', 'Remaining (g)', 'Actual Spool (g)', 'Tare (g)', 'Filament ID'],
    ...filaments.map((f) => [
      f.type,
      f.brand,
      f.colorName || '',
      f.colorHex || '',
      Number(f.costPerKg || 0),
      f.remaining_grams ?? '',
      f.actual_spool_weight ?? '',
      f.empty_spool_weight ?? '',
      f.id,
    ]),
  ];

  // Build 3D Printers sheet data
  const printerRows = [
    [
      'Printer Name',
      'Brand',
      'Power (Watts)',
      'Purchase Cost ($)',
      'Lifespan (hours)',
      'Hourly Depreciation ($/hr)',
      'Maintenance Wear ($/hr)',
      'Hourly Usage Fee ($/hr)',
      'Total Calculated Hourly Rate ($/hr)',
      'Printer ID',
    ],
    ...printers.map((pr) => {
      const dep = pr.hourlyDepreciation || (pr.purchaseCost && pr.lifespanHours ? pr.purchaseCost / pr.lifespanHours : 0.15);
      const maint = pr.maintenanceCostPerHour || 0.12;
      const usage = pr.hourlyUsageFee || 0.50;
      const totalHourly = dep + maint + usage;

      return [
        pr.name,
        pr.brand,
        pr.watts,
        Number(pr.purchaseCost || 0),
        Number(pr.lifespanHours || 0),
        Number(dep.toFixed(4)),
        Number(maint.toFixed(4)),
        Number(usage.toFixed(4)),
        Number(totalHourly.toFixed(4)),
        pr.id,
      ];
    }),
  ];

  // Build Orders sheet data
  const orderRows = [
    ['Order #', 'Linked Quote ID', 'Status', 'Date Created', 'Date Completed', 'Finished Photo URL', 'Inspection / Completion Notes'],
    ...orders.map((o) => [
      o.orderNumber,
      o.quoteId,
      o.status,
      o.createdAt ? new Date(o.createdAt).toLocaleDateString() : '',
      o.completedAt ? new Date(o.completedAt).toLocaleDateString() : '',
      o.completedImageUrl || '',
      o.completionNotes || '',
    ]),
  ];

  // Build Rates & Settings sheet data
  const settingsRows = [
    ['Workshop Parameter', 'Configured Value', 'Unit / Note'],
    ['Electricity Cost', generalSettings.electricityCostKwh, '$/kWh'],
    ['Labor Cost', generalSettings.laborCostPerHour, '$/hour'],
    ['Failure Buffer Rate', generalSettings.failureRate, '% (added to subtotal before profit)'],
    ['Target Profit Margin', generalSettings.profitMargin, '% of final sale price'],
    ['Printer Depreciation Enabled', generalSettings.enablePrinterDepreciation ? 'Yes' : 'No', 'Include machine lifespan wear in quotes'],
    ['Default Printer Hourly Rate', generalSettings.defaultPrinterHourlyRate || 0.5, '$/hr fallback rate'],
    ['Multi-Color Pricing Mode', generalSettings.multiColorPricingMode || 'simple', 'none | simple | complex'],
    ['Multi-Color Simple Fee Type', generalSettings.simpleMultiColorType || 'per_additional_color', 'flat_per_part | per_additional_color | percentage'],
    ['Multi-Color Simple Fee Amount', generalSettings.simpleMultiColorFee || 3.0, '$ or %'],
    ['Complex Spool Setup Fee', generalSettings.complexSpoolSetupFee || 2.5, '$ per spool loaded'],
    ['Complex Purge Waste Percent', generalSettings.complexPurgeWastePercent || 15, '% extra filament purged'],
    ['Complex Cost per Color Change', generalSettings.complexCostPerColorChange || 0.05, '$/purge wipe tower layer switch'],
  ];

  const batchUpdateValuesPayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Overview!A1:E12', values: overviewRows },
      { range: `Quotes & Jobs!A1:P${Math.max(quoteRows.length, 1)}`, values: quoteRows },
      { range: `Parts Catalog!A1:I${Math.max(partRows.length, 1)}`, values: partRows },
      { range: `Filaments!A1:F${Math.max(filamentRows.length, 1)}`, values: filamentRows },
      { range: `3D Printers!A1:J${Math.max(printerRows.length, 1)}`, values: printerRows },
      { range: `Orders!A1:G${Math.max(orderRows.length, 1)}`, values: orderRows },
      { range: `Rates & Settings!A1:C${settingsRows.length}`, values: settingsRows },
    ],
  };

  const updateRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batchUpdateValuesPayload),
  });

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Failed to update Google Sheet data: ${updateRes.status} ${errText}`);
  }
}

/**
 * Apply styling, frozen header rows, and colors to tabs in the spreadsheet
 */
async function formatSpreadsheetStyle(
  accessToken: string,
  spreadsheetId: string,
  createdSheetMeta: any
): Promise<void> {
  const requests: any[] = [];
  const sheets = createdSheetMeta.sheets || [];

  for (const sheet of sheets) {
    const sheetId = sheet.properties.sheetId;
    const sheetTitle = sheet.properties.title;

    // Bold header row styling with dark slate/teal background
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.08, green: 0.15, blue: 0.24 }, // Dark Navy Slate (#14263d)
            textFormat: {
              bold: true,
              foregroundColor: { red: 0.22, green: 0.85, blue: 0.95 }, // Cyan (#37d9f2)
              fontSize: 10,
            },
            horizontalAlignment: 'LEFT',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
      },
    });

    // Auto-resize dimensions for readability
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 12,
        },
      },
    });
  }

  try {
    await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  } catch (err) {
    console.warn('Could not apply advanced formatting, but data was saved:', err);
  }
}

/**
 * Pull parts and filaments from an existing Google Sheet to sync back into the app
 */
export async function pullDataFromSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<{ parts: Part[]; filaments: Filament[] }> {
  // Read Parts Catalog tab
  const partsRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Parts Catalog!A2:I100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const parts: Part[] = [];
  if (partsRes.ok) {
    const data = await partsRes.json();
    const rows: any[][] = data.values || [];
    for (const r of rows) {
      if (!r[0]) continue;
      parts.push({
        name: String(r[0]),
        description: String(r[1] || ''),
        filamentGrams: parseFloat(r[2]) || 0,
        printHours: parseFloat(r[3]) || 0,
        postProcessingHours: parseFloat(r[4]) || 0,
        hardwareCost: parseFloat(r[5]) || 0,
        imageUrl: r[7] ? String(r[7]) : undefined,
        id: r[8] ? String(r[8]) : `part-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      });
    }
  }

  // Read Filaments tab
  const filamentsRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}/values/Filaments!A2:F100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const filaments: Filament[] = [];
  if (filamentsRes.ok) {
    const data = await filamentsRes.json();
    const rows: any[][] = data.values || [];
    for (const r of rows) {
      if (!r[0]) continue;
      filaments.push({
        id: r[5] ? String(r[5]) : `fil-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: String(r[0]),
        brand: String(r[1] || 'Generic'),
        colorName: String(r[2] || 'White'),
        colorHex: String(r[3] || '#ffffff'),
        costPerKg: parseFloat(r[4]) || 20,
      });
    }
  }

  return { parts, filaments };
}

/**
 * Generate formatted Tab-Separated Values (TSV) ready to paste directly (Ctrl+V) into any blank Google Sheet or Excel!
 */
export function generateTSVForClipboard(appData: AppData, table: 'quotes' | 'parts' | 'filaments' | 'printers'): string {
  if (table === 'quotes') {
    const headers = ['Job #', 'Job Name', 'Customer', 'Date', 'Status', 'Price ($)', 'Print Time (hrs)', 'Filament (g)', 'Subtotal ($)', 'Profit ($)'];
    const rows = appData.quotes.map((q) => [
      q.jobNumber,
      q.jobName,
      q.customerName || '',
      q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '',
      q.status,
      q.quotePrice.toFixed(2),
      q.parameters.printHours,
      q.parameters.filamentGrams,
      q.costBreakdown.subtotal.toFixed(2),
      q.costBreakdown.profit.toFixed(2),
    ]);
    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  }

  if (table === 'parts') {
    const headers = ['Part Name', 'Description', 'Filament (g)', 'Print Hours', 'Post-Proc Hours', 'Hardware Cost ($)', 'Image URL'];
    const rows = appData.parts.map((p) => [
      p.name,
      p.description || '',
      p.filamentGrams,
      p.printHours,
      p.postProcessingHours,
      p.hardwareCost,
      p.imageUrl || '',
    ]);
    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  }

  if (table === 'filaments') {
    const headers = ['Material', 'Brand', 'Color', 'Color Hex', 'Cost / kg ($)', 'Remaining (g)', 'Actual Spool (g)', 'Tare (g)'];
    const rows = appData.filaments.map((f) => [
      f.type,
      f.brand,
      f.colorName || '',
      f.colorHex || '',
      f.costPerKg,
      f.remaining_grams ?? '',
      f.actual_spool_weight ?? '',
      f.empty_spool_weight ?? '',
    ]);
    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  }

  // printers
  const headers = ['Printer Name', 'Brand', 'Watts', 'Purchase Cost ($)', 'Lifespan (hrs)', 'Depreciation ($/hr)', 'Maintenance ($/hr)', 'Usage Fee ($/hr)'];
  const rows = appData.printers.map((pr) => [
    pr.name,
    pr.brand,
    pr.watts,
    pr.purchaseCost || 0,
    pr.lifespanHours || 0,
    pr.hourlyDepreciation || 0,
    pr.maintenanceCostPerHour || 0,
    pr.hourlyUsageFee || 0,
  ]);
  return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
}

/**
 * Download CSV for Google Sheets import
 */
export function downloadCSV(appData: AppData, table: 'quotes' | 'parts' | 'filaments' | 'printers') {
  const tsv = generateTSVForClipboard(appData, table);
  // Convert TSV to standard CSV with proper quotes
  const lines = tsv.split('\n');
  const csv = lines
    .map((line) =>
      line
        .split('\t')
        .map((cell) => `"${cell.replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `3d-print-${table}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
