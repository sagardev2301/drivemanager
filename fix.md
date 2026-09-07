## 1. Delete dead code

`src/pages/Dashboard.tsx` is not imported or referenced anywhere in the app (confirmed — it's not in `App.tsx`'s routes, and no other file imports from it). Delete this file entirely.

## 2. Enforce the existing design tokens instead of raw hex values

`tailwind.config.js` already defines a full semantic color palette (`primary`, `on-primary`, `primary-container`, `surface`, `on-surface`, `surface-container`, `surface-container-high`, `on-surface-variant`, `outline`, `error`, `on-error`, `tertiary`, `on-tertiary`, etc. — read the actual file for the complete list). **None of the pages or components currently use these tokens** — every file hardcodes the equivalent raw hex value instead (e.g. `text-[#003fb1]` instead of `text-primary`, `bg-[#f9f9ff]` instead of `bg-background`, `text-[#141b2b]` instead of `text-on-surface`).

Go through every file in `src/pages/` and `src/components/` and replace every arbitrary hex Tailwind class with its matching token from `tailwind.config.js`. Concretely:
- `#003fb1` → `primary`
- `#f9f9ff` → `background` (or `surface`, check which is semantically correct per context)
- `#141b2b` → `on-surface` (or `on-background`)
- `#434654` → `on-surface-variant`
- `#e1e8fd` → `surface-container-high`
- `#f1f3ff` → `surface-container-low`
- `#e9edff` → `surface-container`
- `#ba1a1a` / `#93000a` → `error` / `on-error`
- `#005623` / `#6bff8f` → `tertiary` / `tertiary-fixed` (success states)
- Map every other hardcoded hex to its nearest existing token — do not introduce new arbitrary values.

Do this as a careful find-and-replace across every file, verifying each replacement doesn't change the visual result (since the token hex values should match exactly what's already there).

## 3. Normalize border radius and button height to a fixed scale

Currently in use: `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-t`, `rounded-full` — and button heights `h-9`, `h-10`, `h-11`, `h-12`, `h-14`. Pick ONE scale and apply it consistently:
- **Radius:** `rounded-xl` for cards, `rounded-full` for pills/badges/avatars/circular icon buttons, `rounded-2xl` for modals/sheets only. Eliminate `rounded`, `rounded-lg`, `rounded-3xl`, and bare `rounded-t` unless there's a specific documented reason (e.g. a bottom sheet's top-only rounding, which can stay as `rounded-t-3xl` for that one case).
- **Button height:** `h-11` (44px) for all primary actions (Mark Done, Add Customer, Log Class, Record Payment, Save/Submit). `h-9` for secondary/compact buttons only (icon-only buttons, small inline actions). Eliminate `h-10`, `h-12`, and `h-14` unless there's a clear, single documented exception.

Audit every button and card across `Home.tsx`, `AnalyticsDashboard.tsx`, `Attendance.tsx`, `Customers.tsx`, `CustomerDetail.tsx`, and every component in `src/components/`, and normalize to this scale.

## 4. After fixing, verify

- Run `npx tsc --noEmit` to confirm nothing broke.
- Run the app and visually spot-check each screen to confirm no color/spacing regressions — the goal is identical visual output, just referencing tokens instead of raw hex.
- Report back: how many hex values were replaced per file, and any cases where a hex value didn't cleanly map to an existing token (flag these rather than inventing a new token silently).

---