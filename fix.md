The file design/leads-reference.html in this repo is the approved visual
design reference for the ENTIRE DriveManager app — not just the Leads page.
Use it as the single source of truth to bring Dashboard, Attendance,
Customers, Customer Detail, and all modals/drawers into visual consistency
with it. This is a styling-only pass — no changes to data logic, Supabase
queries, routing, or component behavior.

STEP 1 — Extract the design system from design/leads-reference.html:
  - Color scale: brand-{50,100,500,600,700,800,900} (#EFF6FF, #DBEAFE,
    #1D4ED8, #1A56DB, #1E40AF, #1E3A8A, #0F172A), canvas #F5F6F8 (page bg),
    surface #FFFFFF (card/header bg)
  - Status colors: blue-600 (New/info), amber-500/amber-800 (Contacted/
    warning), purple-600/700 (Booked), emerald-500/700 (Converted/success),
    rose-500/700 (Dropped/danger) — each used as: light bg (e.g. blue-50)
    + colored border + colored text for badges, and as ring-2 color for
    avatar rings
  - Text colors: slate-900 (headings), slate-700 (body), slate-500
    (secondary/meta), slate-400 (muted icons/placeholders)
  - Font: Inter (400/500/600/700/800) for text, Material Symbols Outlined
    for all icons
  - Type scale: page title 17px bold, section/modal header 18px bold, card
    title 15px bold, body/phone 13px medium, meta/badge text 11-12px
    semibold, form labels 11px bold uppercase tracking-wider
  - Radius: cards = rounded-2xl, buttons/inputs/avatars(square) = rounded-xl,
    chips/badges/circular avatars = rounded-full, bottom-sheet modals =
    rounded-t-3xl
  - Shadows: card-shadow (0 1px 3px rgba(15,23,42,.06), 0 1px 2px
    rgba(15,23,42,.04)), card-shadow-hover (0 4px 12px rgba(15,23,42,.08),
    0 2px 4px rgba(15,23,42,.04)), drawer-shadow for bottom sheets
  - Spacing: card padding p-4, page horizontal padding px-4/px-5, avatar
    w-12 h-12 in lists / w-10 h-10 in header, primary button py-3.5,
    secondary button py-2.5
  - Interaction: active:scale-[0.99] on cards, active:scale-95 on FAB,
    bottom-sheet drawers with a drag handle + slide-up + backdrop blur for
    add/edit flows, top-center toast for success messages

STEP 2 — Codify this as the shared design system:
  - Update tailwind.config.js so the brand/canvas/surface colors above
    become the actual theme tokens (replace whatever's there now)
  - Add the card-shadow / card-shadow-hover / drawer-shadow utilities
  - Standardize on rounded-2xl for cards and rounded-xl for buttons/inputs
    app-wide — remove the other border-radius variants currently in use
  - Standardize on the type scale above, replacing the currently
    inconsistent font-size/weight combinations
  - IMPORTANT decision point: this reference uses Material Symbols
    Outlined for every icon. Check what icon library the current app
    uses (e.g. lucide-react, heroicons) — if it differs, tell me before
    proceeding so we decide whether to switch the whole app to Material
    Symbols or map each icon in the reference to its closest equivalent
    in the existing library. Don't mix both in the same app.

STEP 3 — Apply screen by screen (Dashboard/AnalyticsDashboard, Attendance,
Customers, Customer Detail, and existing Leads if anything drifted from the
reference), swapping in the tokenized colors/radius/shadows/type from Step 2
in place of hardcoded values. Preserve each screen's existing layout and
functionality — only bring the visual language in line with the reference.

STEP 4 — Verify: grep for stray hex values or off-scale radius/shadow
classes to confirm nothing was missed, then run the app locally to confirm
nothing broke functionally.

Show me the Step 1/2 findings (especially the icon-library decision) before
applying changes across all screens.