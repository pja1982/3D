# Implementation Plan: Randomized Filament Selector ("Maker's Choice / Surprise PLA") & Small White Check Controls

## 1. Overview & Objective
Build an integrated **Randomized Filament Selector** designed for decorative prints when clients do not specify a color (or request "Maker's Choice"). This allows the maker to burn down surplus PLA inventory, offer a fun "Surprise Color" option, and streamline quoting when color choice is open.

### User Requirements Grounding
- **Pool Eligibility:** Manual checkbox on individual spools in the Filament Library (`isRandomEligible?: boolean`).
- **Quick Card Toggling:** Small white check toggles directly on the spool cards in the library for instant 1-click pool inclusion without opening edit modals.
- **Material Restriction:** PLA family only for now (Standard/Basic PLA, Silk PLA, Matte PLA, PLA+, PLA-Lite).
- **Quote Workflow:** Support **both** Instant Roll (picks a concrete spool immediately with a 🎲 Re-roll button) and Mystery Placeholder (retains "Mystery Color" placeholder until fabrication).
- **Customer Presentation:** Clear, attractive badge on customer invoices/quotes: `🎨 Surprise / Maker's Choice PLA`.
- **Workshop Traveler & Checklists:** Explicitly indicates the selected physical spool (with brand, color, and Master Code) with small white check boxes (`[✓]`) for operator pull-and-load verification.

---

## 2. Architecture & File Breakdown

### A. Data Schema (`types.ts`)
1. **`Filament`:**
   - `isRandomEligible?: boolean` — Opt-in flag marking spool as available for the random / mystery color pool.
2. **`PartFilamentColor`, `QuotePartConfig`, `Part`:**
   - `isMysteryColor?: boolean` — Whether this color/material slot was set to Surprise / Maker's Choice.
   - `mysteryColorType?: 'pla_surprise'` — Material family category (defaulting to PLA).
   - `resolvedFilamentId?: string | null` — The concrete filament ID rolled from the pool (if locked in or rolled).
3. **`GeneralSettings`:**
   - `defaultRandomColorMode?: 'instant' | 'placeholder'` — Default behavior when rolling in the Quote Builder.

### B. Randomizer Engine (`utils/randomFilamentSelector.ts`)
Create a dedicated utility module:
- `isFilamentPla(filament: Filament): boolean` — Validates polymer type against PLA variants (`Basic PLA`, `Silk PLA`, `Matte PLA`, `PLA+`, `PLA-Lite`, `pla`).
- `getEligibleRandomFilaments(filaments: Filament[], requiredGrams?: number): Filament[]` — Filters library for PLA spools where `isRandomEligible === true` (falls back gracefully to all in-stock PLAs if none are explicitly toggled).
- `rollRandomFilament(filaments: Filament[], currentFilamentId?: string, requiredGrams?: number): Filament | null` — Picks a pseudo-random spool from eligible inventory with weighted or uniform distribution, ensuring variety.
- `getAveragePlaCostPerKg(filaments: Filament[]): number` — Computes realistic average material cost for placeholder quotes.

### C. Filament Library Management & Small White Check Toggles (`components/ConfigurationPage.tsx`)
- **Direct 1-Click Small White Check on Spool Cards:**
  - Add an interactive small white check button / checkbox directly on each spool card:
    - Unchecked: Subtle outline square `[ ]`
    - Checked: Crisp white checkmark `[✓]` with active cyan/emerald glow indicating `Random Pool: Eligible`
    - Clicking toggles `isRandomEligible` instantly and auto-saves to storage/Firestore.
- **Spool Edit Modal:**
  - Dedicated toggle card with a styled white check box: `🎲 Eligible for Random / Mystery Picker (Surprise PLA Pool)`.
- **Library Quick Filter & Bulk Action:**
  - Filter chip: `🎲 Random Pool (X)` to view only eligible mystery spools.
  - One-click bulk button: *"🎲 Check All In-Stock PLAs for Random Pool"* to quickly populate inventory.

### D. Quote Builder & Calculator (`components/CalculatorForm.tsx`, `components/JobPartsTable.tsx`, `components/CostBreakdownDisplay.tsx`)
- **Filament Selector Enhancement:**
  - In material dropdowns (both single-material parts and multi-color part slots):
    - Pinned top option: `🎲 Surprise / Maker's Choice (PLA)`
  - Sub-action buttons in selector:
    - `🎲 Roll Random PLA Now`: Instantly selects an eligible spool and shows a `🎲 Re-roll` button next to the selection.
    - `🔮 Keep as Mystery Placeholder`: Uses the pool's average $/kg for accurate pricing while leaving the customer label as *Maker's Choice*.
  - When a spool is assigned via randomizer:
    - Visual badge: `🎲 Maker's Choice • [Brand] [Color Name] [#CODE]`
    - Small white check indicator: `✓ Assigned & Ready to Print`
    - Instant `🎲 Re-roll` button right on the card for quick re-spins.

### E. Customer Invoices, Quotes & Workshop Travelers (`components/PrintDocumentModal.tsx`, `utils/markdownExport.ts`)
- **Customer Quote / Invoice Document:**
  - Material description clearly displays: `🎨 Surprise / Maker's Choice PLA` with a decorative badge.
  - If a concrete color is selected: displays `🎨 Surprise / Maker's Choice PLA (Bambu Green #00S17)` or cleanly hides the internal spool choice based on document toggles.
- **Workshop Checklist Traveler & Manifest:**
  - Shows the exact spool to pull from the shelf (Brand, Type, Color, Master Code) along with `[🎲 Maker's Choice Pool]` label.
  - **Small White Check Boxes:** Printable physical check squares (`[ ]` / `[✓]` if completed digitally) for:
    - Spool pulled from Random PLA shelf
    - Slot / Bed loaded and verified
- **Markdown Export:**
  - Reflects `Maker's Choice PLA` in the Itemized Products table and Obsidian graph links.

### F. Settings & Versioning (`components/GeneralConfigurationPage.tsx`, `constants/version.ts`, `package.json`)
- Add setting in General Settings: Default Random Color Workflow (`Instant Roll` vs `Mystery Placeholder`).
- Bump version to `v2.10.0` and document release notes in the Change Log.

---

## 3. Verification & Testing
1. **Compilation & Linting:** Verify `tsc --noEmit` and `vite build` pass with zero errors.
2. **Library 1-Click Check Toggles:** Test clicking the small white check directly on spool cards in the library; verify immediate visual checkmark and data persistence.
3. **Instant Roll:** In Quote Builder, click *Roll Random PLA*, verify random selection from eligible pool, and test the *Re-roll* button.
4. **Mystery Placeholder:** Select *Keep as Mystery Placeholder*, verify cost breakdown calculates accurately with average PLA $/kg.
5. **PDF & Document Verification:** Open Print Document Modal, verify Customer Invoice displays "Surprise or Maker's Choice PLA" while the Workshop Checklist renders physical check boxes and identifies the physical spool.
