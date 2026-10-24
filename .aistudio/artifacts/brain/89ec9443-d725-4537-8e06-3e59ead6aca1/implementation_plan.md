# Implementation Plan: Bulk Quote Parts, Filament Sorting & Batch Milestones

Deliver three workflow enhancements requested for 3D Print Cost & Quote Tracker:
1. **Bulk Add Parts to Quote**: A modal picker dialog in the Quote Builder allowing one-click multi-selection of parts from the Parts catalog with quantity steppers and base filament preservation.
2. **Filament Sorting & Material Filters**: A comprehensive sorting dropdown (Brand, Type, Color, Price, Weight) and dynamic material filter chips in the Filaments management page.
3. **One-Click Batch Milestone Column Headers**: Interactive column headers in the Fabrication Milestones Tracker enabling batch check/uncheck for QA, Documentation, Slicing, etc. across all prints.

---

## User Review Required

> [!IMPORTANT]
> The three features will follow the preferences you selected:
> - **Bulk Add Parts**: Modal dialog with multi-select checkboxes and quantity steppers.
> - **Filament Organization**: Sort dropdown (Brand, Type, Color, Price, Weight) paired with dynamic material filter chips.
> - **Batch Milestones**: Clickable column headers in the milestones table with one-click toggle for QA, Documentation, and all fabrication steps.

---

## Proposed Changes

### 1. Types & Data Models (`types.ts`)
- Update `Part` interface to explicitly support optional `filamentId?: string | null` and `printerId?: string | null` so parts in the catalog retain a default base filament and printer assignment alongside existing multi-color configurations.

---

### 2. Bulk Add Parts from Library (`components/BulkAddPartsModal.tsx` & `components/CalculatorForm.tsx`)
- **New Component `components/BulkAddPartsModal.tsx`**:
  - Modal displaying all parts from the user's Parts library.
  - Multi-select checkboxes for each part.
  - Dedicated quantity stepper for each selected part (defaulting to 1).
  - Material preview badge showing each part's base filament or multi-color configuration.
  - Search filter within the modal to quickly find parts in large catalogs.
  - Live summary footer showing: `X parts selected | Y total units | ~Z g filament | ~W hrs print time`.
  - "Add Selected Parts to Quote" primary action button.
- **Integration in `components/CalculatorForm.tsx`**:
  - Add `+ Bulk Add from Library` button beside `+ Add Another Part` in the Quote Parts header.
  - Handler `handleBulkAddParts(selectedPartsWithQuantities)` that appends all chosen parts into `quoteParts` with their respective weights, print hours, hardware costs, images, and pre-selected base filaments.
- **Enhancement in `components/PartsPage.tsx`**:
  - In single-color mode, allow selecting a default base filament for catalog parts (in addition to existing multi-color slots) so new parts save with their preferred material attached.

---

### 3. Filament Sorting & Quick Material Filter Chips (`components/ConfigurationPage.tsx`)
- **Sorting Dropdown**:
  - Add a dedicated `<select>` sort control in the Saved Spools header:
    - *Default / Custom Order*
    - *Brand (A → Z)*
    - *Brand (Z → A)*
    - *Filament Type / Material (A → Z)*
    - *Color Name (A → Z)*
    - *Price per kg (Lowest first)*
    - *Price per kg (Highest first)*
    - *Remaining Spool Weight (Most first)*
    - *Remaining Spool Weight (Least first)*
- **Dynamic Quick Material Chips**:
  - Dynamically extract distinct material types present in the user's spool collection (e.g. `PLA`, `PETG`, `ABS`, `TPU`, `ASA`, `Nylon`).
  - Provide fast filter pill buttons for each material category, alongside `All`, `In Stock`, and `Low Stock (<250g)`.
- **Search & Filter Counter**:
  - Maintain real-time counter: `Showing X of Y spools`.

---

### 4. Clickable Milestone Column Headers with One-Click Batch Toggle (`components/OrderMilestonesTracker.tsx`)
- In `components/OrderMilestonesTracker.tsx`:
  - Calculate column completion state for each milestone:
    - `isColumnAllChecked = rows.length > 0 && rows.every(r => currentMilestones[r.id]?.[m.key]);`
    - `hasPartialChecked = rows.some(r => currentMilestones[r.id]?.[m.key]) && !isColumnAllChecked;`
  - Transform each milestone column header (`th`) into an interactive button:
    - Displays a clean visual indicator / mini checkbox in the header.
    - Hover state with tooltip: e.g. `Click to check QA for all 10 prints` or `Click to uncheck QA for all prints`.
  - Add `handleToggleColumn(key: MilestoneKey)` handler:
    - If all rows are already checked for that milestone, unchecks all rows for that milestone.
    - Otherwise, checks all rows for that milestone in one click.
  - Fully persists to `order.milestones` and syncs with Firestore and printed PDF checklists.

---

### 5. Verification & Versioning
- Update `constants/version.ts` to document v2.7.3.
- Run `lint_applet` and `compile_applet` to ensure zero compilation or type issues.

---

## Verification Plan

### Automated Tests & Checks
- Run `lint_applet` to verify TypeScript types and syntax.
- Run `compile_applet` to ensure Vite bundle builds cleanly.

### Manual Verification
1. **Bulk Add to Quote**:
   - Open Quote tab, click `Bulk Add from Library`.
   - Select 3 parts, set quantities (e.g., 2, 1, 3).
   - Click Add: verify all 3 parts appear in the quote with correct quantities, base filaments, and calculated costs.
2. **Filament Sorting & Filtering**:
   - Go to Filaments page.
   - Test sorting by Brand A-Z, Price per kg, and Remaining Weight.
   - Click material chips (e.g. PLA, PETG) to verify quick filtering.
3. **Batch Milestone Column Checking**:
   - Open an order with multiple parts/quantities on the Orders page.
   - Click the `QA` column header: verify all units immediately check QA.
   - Click the `Documentation` column header: verify all units check Documentation.
   - Open `Print Checklist`: verify the batch-checked items show with `✓` on the printable traveler.
