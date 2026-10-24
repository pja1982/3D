export interface ChangeLogSection {
  category: 'Added' | 'Improved' | 'Fixed' | 'Optimized';
  items: string[];
}

export interface ChangeLogEntry {
  version: string;
  releaseDate: string;
  title: string;
  isLatest?: boolean;
  tag?: 'major' | 'minor' | 'patch';
  highlights: string[];
  sections: ChangeLogSection[];
}

export const APP_VERSION = '2.7.1';
export const APP_RELEASE_DATE = 'October 24, 2026';
export const APP_CODENAME = 'Custom Invoice Business Profile & Branding';

export const CHANGELOG_DATA: ChangeLogEntry[] = [
  {
    version: '2.7.1',
    releaseDate: 'October 24, 2026',
    title: 'Customizable Business & Invoice Branding Profile with Live Preview',
    isLatest: true,
    tag: 'patch',
    highlights: [
      'Dedicated Business & Invoice Branding Profile configuration card in General Settings',
      'Workshop checklist per-print fabrication and quality milestones with quick single-line checkboxes',
      'One line for each quantity required / unit copy with Slicing, Spool checked, Build plate clean, First layer, Print completed, Post-processing, QA, and Documentation',
      'Real-time interactive white paper header preview showing exactly how invoices render before printing',
      'Full print container reset eliminating black boundary boxes and scrollbars from PDF exports'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          '📋 Workshop Fabrication Checklist now features a per-print milestone workflow with a line for each quantity required',
          '☑️ 8 quick and basic single-line checkbox checkpoints per print: Slicing, Spool checked, Build plate clean, First layer, Print completed, Post-processing completed, QA, and Documentation',
          'Option to toggle between "Line per Unit Copy" and "Grouped by Model" in Print drawer',
          '🏢 Dedicated Business & Invoice Branding Profile panel in General Configuration with real-time editing',
          'Custom inputs for Business Name, Tagline/Subtitle, Physical Workshop Address, Phone, Email, and Website/Portfolio',
          'Multi-line editor for Default Invoice & Quote Terms & Conditions appearing above payment instructions',
          '📄 Interactive live print header preview card that renders changes instantaneously as you type'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Website/portfolio links and physical shop address now displayed seamlessly on all PDF and paper printouts',
          'Workshop Job Checklists now incorporate custom studio branding in the production traveler header',
          'Firebase Firestore and local storage automatically persist and restore studio branding across devices'
        ]
      }
    ]
  },
  {
    version: '2.7.0',
    releaseDate: 'October 24, 2026',
    title: 'Print-to-PDF & Paper: Customer Quotes, Invoices & Workshop Fabrication Checklists',
    isLatest: false,
    tag: 'minor',
    highlights: [
      'Print to PDF or physical paper directly from Calculator, Saved Jobs, and Production Orders',
      'Professional Customer Quote & Invoice documents with studio branding, itemized parts, costs, and customer totals',
      'Comprehensive Workshop Fabrication Checklist & Job Traveler with step-by-step production milestones and QA sign-off',
      'Interactive Print Preview modal with document switcher, live paper rendering, and customizable studio profile',
      'Dedicated @media print stylesheets ensuring crisp, ink-friendly output without dark website backgrounds or UI chrome'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          '🖨️ "Print / PDF" button on Calculator price card for immediate quotation export before or after saving',
          '🖨️ Print Customer Quote action button on every saved job and order row in the jobs and orders tables',
          '📋 Print Workshop Fabrication Checklist action button on every saved job and order row for shop tracking',
          'Dedicated Customer Quote & Invoice print layout displaying itemized model lines, material, unit prices, multi-color fees, and bold grand total',
          'Workshop Job Checklist sheet featuring printer assignment, required filament grams, unit counts, progress counters, and 8-stage production milestone checklist',
          'Interactive Print Preview modal with real-time switching between Customer Quote and Workshop Checklist',
          'Configurable Studio Profile (Studio Name, Tagline, Phone, Email, Address, and Custom Terms & Conditions) with persistent local memory',
          'Ink-friendly @media print CSS optimization removing all navigation chrome and dark background colors'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Full-fidelity paper formatting optimized for standard Letter and A4 page sizes with anti-break table row rules',
          'Expanded Job & Order detail drawers now feature quick one-click "Print Quote (PDF)" and "Print Checklist (PDF)" buttons'
        ]
      }
    ]
  },
  {
    version: '2.6.0',
    releaseDate: 'October 22, 2026',
    title: 'Job & Order Archiving with Dedicated Filter Views and Fast Search',
    isLatest: false,
    tag: 'minor',
    highlights: [
      'Archive & Restore options for both Saved Jobs (Quotes) and Active Orders',
      'Clean active workspace: archived items are safely hidden by default and preserved indefinitely',
      'Fast tab filtering: switch seamlessly between Active, Archived, and All views with instant counts',
      'Visual archive badges and quick Restore / Archive buttons directly on table rows and detail drawers',
      'Instant search filter by job/order number, part/job name, or customer name across any view'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Archive and Restore action buttons on every Job row, Order row, and expandable detail drawer',
          'Active, Archived, and All filter tabs with live counters on both the Jobs and Orders tracking pages',
          'Instant keyword search bar for Jobs and Orders matching job #, order #, job name, and customer',
          'Visual 🗄️ Archived badge indicator on archived job and order cards',
          'Persistent isArchived and archivedAt fields synchronized across cloud Firestore and local data',
          'Export to CSV and Obsidian Markdown updated to respect the currently active view filter (Active, Archived, or All)'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Default view shows active jobs and orders so completed/historical data never clutters daily production',
          'Contextual empty state messages informing users when all items are archived or when search yields no matches'
        ]
      }
    ]
  },
  {
    version: '2.5.0',
    releaseDate: 'October 20, 2026',
    title: 'Digital Scale Inventory, Drag-and-Drop Defaults & Technical Resin Risk',
    isLatest: false,
    tag: 'minor',
    highlights: [
      'Digital Scale Spool Weight tracking with gross weight reading and empty spool tare subtraction',
      'Interactive 1-click Quick Weigh Modal with real-time usable filament calculation and presets',
      'HTML5 Drag-and-Drop reordering for both Printers and Filaments with dedicated drag handles and nudge buttons',
      'Flexible Default selection: designate any printer or spool as default anywhere in the list with ⭐ Set Default',
      'Technical Material Failure Risk Rate auto-charging for TPU, ABS/ASA, Nylon/PA, Polycarbonate, and Composites',
      'Interactive Version Number & Detailed In-App Change Log viewer'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Actual Spool Weight (Gross on Scale) field in filament configuration and inventory',
          'Empty Spool Tare Weight field (defaults to 240g, customizable for cardboard or lightweight reels)',
          'Bidirectional real-time auto-calculation: Scale Gross − Tare = Net Usable Filament',
          'Quick Scale Presets: Full (1kg + Tare), 750g, Half (500g), 250g, and Empty Spool (0g)',
          'Dedicated Quick Weigh Modal accessible via ⚖️ button on every filament card',
          'Scale Gross Weight indicator badge on filament inventory cards and quote calculator selectors',
          'Drag-and-Drop reordering for printers and filaments using HTML5 drag events and ⠿ grab handles',
          'Directional up/down nudging buttons on printer and filament cards for fine reordering',
          '⭐ Set as Default button to designate any printer or filament as default without moving its position in the list',
          'Technical difficulty failure rate settings toggle in General Settings with dedicated percentage inputs for TPU (15%), ABS/ASA (18%), Nylon/PA (20%), PC (20%), and Composites (12%)',
          'Per-spool failure rate override in filament configuration with auto-detection of material family',
          'Visual risk badges (⚡ TPU 15%, ⚡ ABS 18%) across inventory cards and quote cost breakdowns'
        ]
      },
      {
        category: 'Improved',
        items: [
          'New quote initialization and part addition automatically pick the user-designated default printer and filament',
          'Quote cost breakdown displays distinct material technical risk adjustments and specific failure buffers',
          'Filament selector in quote calculator now shows live usable grams and measured scale gross weight'
        ]
      },
      {
        category: 'Fixed',
        items: [
          'Fixed issue where reordering printers was not persisted to database because onReorder handler was omitted',
          'Fixed hardcoded default selection index [0] to respect explicit isDefault flags across printers and filaments',
          'Fixed tare weight inconsistency when updating gross scale weight in filament form'
        ]
      }
    ]
  },
  {
    version: '2.4.0',
    releaseDate: 'October 15, 2026',
    title: 'Multi-Color Batching & Shared Bed Purge Optimization',
    tag: 'minor',
    highlights: [
      'Multi-Color single bed batching mode to eliminate redundant purge tower and setup fees across parts',
      'Bed plate count multiplier and real-time savings calculator',
      'Dual Simple and Complex multi-color fee calculation modes'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Multi-Color Batching Mode toggle: Single Batch per Bed Plate vs Per-Part Copy charging',
          'Plate / Bed count selector with proportional fee distribution across multi-color parts',
          'Visual "Saved $X.XX by batching on 1 bed" callout in financial summary and cost breakdown',
          'Complex multi-color fee calculation incorporating toolhead swap count, purge waste %, and spool handling fees'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Color palette swatch bar displaying multi-tone filament splits and color percentage allocation',
          'Quote parts table highlights multi-color parts with dedicated badges and unbatched vs batched comparisons'
        ]
      }
    ]
  },
  {
    version: '2.3.0',
    releaseDate: 'October 2, 2026',
    title: 'Machine Depreciation & Wear Accounting',
    tag: 'minor',
    highlights: [
      'Machine capital acquisition depreciation accounting ($/hour based on purchase cost and expected lifespan)',
      'Printer wear-and-tear & maintenance accounting ($/hour for nozzles, belts, rods, lubricants)',
      'General settings fallback hourly machine rates and equipment usage fees'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Printer purchase cost and lifespan hours input fields with automatic hourly depreciation calculation',
          'Maintenance cost per hour field to budget for nozzles, build plates, belts, and bearings',
          'General Settings toggle to enable or disable machine depreciation in quote pricing',
          'Granular breakdown in quote financial summary showing raw machine depreciation vs wear costs'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Support for custom hourly rate override on specialized high-end printers',
          'Automatic wattage-based electricity cost calculation integrated with local kWh rates'
        ]
      }
    ]
  },
  {
    version: '2.2.0',
    releaseDate: 'September 20, 2026',
    title: 'Obsidian Vault & Markdown Documentation Engine',
    tag: 'minor',
    highlights: [
      'Obsidian-formatted Markdown export for job records, customer invoices, and parts catalog',
      'Internal wikilinks (`[[parts/part-name]]`) linking invoices and jobs to part specifications',
      'One-click ZIP archive export of entire 3D printing documentation vault'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Export Job (.md) button generating formatted Obsidian markdown note with YAML frontmatter',
          'Export Customer Invoice (.md) button formatted for client billing with internal wikilinks',
          'Export Parts Catalog (.md) generating individual part files with specifications and photos',
          'Full Vault ZIP Download bundling all jobs, orders, and parts into a ready-to-open Obsidian vault'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Quick Copy Markdown to clipboard buttons with visual feedback',
          'Obsidian callouts and metadata tags formatted for Dataview community plugin compatibility'
        ]
      }
    ]
  },
  {
    version: '2.1.0',
    releaseDate: 'September 5, 2026',
    title: 'Google Sheets Live Sync & Hybrid Storage',
    tag: 'minor',
    highlights: [
      'Bi-directional sync with Google Sheets for spreadsheet reporting and accounting',
      'Google OAuth integration with automated sheet provisioning and tab formatting',
      'Local Docker JSON storage mode (`data/print-tracker-db.json`) for fully offline self-hosting'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Google Sheets sync modal with automated header generation and job row append',
          'Docker setup modal with Docker Compose configuration instructions for local server storage',
          'Status indicator bar showing whether connected to Cloud Firestore, Local Docker, or Browser Storage',
          'One-click JSON backup export and restore utility'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Cloud Firestore authentication with Google Sign-In and auto-sync status feedback',
          'Offline fallback ensuring app operates seamlessly without network connection'
        ]
      }
    ]
  },
  {
    version: '2.0.0',
    releaseDate: 'August 15, 2026',
    title: 'Multi-Part Quotes, Catalog & Order Workflow',
    tag: 'major',
    highlights: [
      'Multi-part quoting engine allowing distinct printers, filaments, and quantities per part in one job',
      'Catalog parts repository with photo prototype uploads and image lightbox modal',
      'Order fulfillment lifecycle tracking (Pending, Accepted, Rejected) with completed print photo capture'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Multi-part quotes allowing multiple 3D models with different materials and print times per job',
          'Saved Parts catalog page with reusable part templates and one-click import into calculator',
          'Photo upload with client-side canvas compression for prototypes and finished orders',
          'Lightbox modal to view full-resolution part images and reference photos',
          'Orders page with status workflow, order dates, and photo confirmation of finished prints'
        ]
      },
      {
        category: 'Improved',
        items: [
          'Full-featured financial summary with profit margin calculations and average cost per unit',
          'Job revision mode to update existing quotes without creating duplicates'
        ]
      }
    ]
  },
  {
    version: '1.0.0',
    releaseDate: 'June 10, 2026',
    title: 'Initial Release: 3D Print Cost & Quote Engine',
    tag: 'major',
    highlights: [
      'Accurate filament consumption and cost calculation',
      'Printer energy consumption and electricity cost estimation',
      'Post-processing labor fees and hardware costs',
      'Custom profit margin pricing and printable quote generation'
    ],
    sections: [
      {
        category: 'Added',
        items: [
          'Core cost calculator with filament grams, print hours, post-processing time, and hardware costs',
          'Printer library with wattage ratings and filament library with cost-per-kg tracking',
          'Labor rate and electricity kWh cost configuration',
          'Profit margin percentage slider and selling price calculation',
          'Job history saving and CSV export'
        ]
      }
    ]
  }
];
