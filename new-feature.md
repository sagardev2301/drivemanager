I'm working on the Attendance page (`src/pages/Attendance.tsx`) of a React + TypeScript + Tailwind + Vite app (Supabase backend). I want two related UX upgrades to the date navigation area at the top of the page. This is a mobile-first app — the primary user is on a phone.

## Current behavior
- The top of the page has a date navigation bar: a left arrow, a center block showing a calendar icon + the selected date (e.g. "Sat, 5 Sept") + an "Instructor Log" subtitle, and a right arrow.
- Below that is a "Daily Progress" summary bar (e.g. "7 of 7 Completed").
- Below that is the scrollable list of attendance cards (one per class/customer for the selected date).
- Currently the ENTIRE page — including the date nav and daily progress bar — scrolls together with the attendance list. Left/right arrows are the only way to change the date.

## What I want changed

### 1. Sticky header
- Make the date navigation block AND the "Daily Progress" bar fixed/sticky at the top of the viewport.
- Only the attendance card list below should scroll; the header stays pinned as the user scrolls through the day's classes.
- Preserve the existing page header ("DriveManager" / "Attendance" title bar with the profile icon) — clarify with me whether that outer header should also stay fixed or is already fixed/separate, based on the current Layout component structure, before assuming.
- Make sure the sticky header doesn't overlap content or cause a jump when the list scrolls under it (correct z-index, background color so list items don't show through, and appropriate padding-top on the scrollable list so the first card isn't hidden behind the sticky header on load).

### 2. Functional calendar date picker
- Currently the center date text + calendar icon are purely decorative/static — only the left/right chevrons change the date.
- Make the calendar icon + date text tappable. On tap, open a calendar date-picker (a popover on desktop-width, a bottom sheet/modal on mobile) where the instructor can pick any date directly, instead of only stepping day-by-day.
- On date selection, close the picker and reload the attendance list for the selected date, exactly as the arrow navigation already does today — reuse the existing date-change logic/state (whatever function currently runs when the arrows are clicked) rather than duplicating the data-fetch logic.
- Respect the existing IST timezone handling already fixed in this file — do not reintroduce the `.toISOString().split('T')[0]` UTC-shift bug when wiring up the new picker's date value.
- Keep the arrows working as-is alongside the new picker — this is additive, not a replacement.
- Match the existing visual style (colors, border-radius, spacing) already used elsewhere on this page rather than introducing a default/unstyled picker component.

## Implementation notes
- Check what's already installed in package.json before adding a new date-picker dependency — reuse an existing library if one is already in the project; otherwise pick a small, well-maintained one (e.g. `react-day-picker`) and tell me what you added.
- Keep this change scoped to the Attendance page and its date-nav sub-component — don't touch Dashboard, Customers, or CustomerDetail.

## After implementing
- Run the dev server and confirm:
  - Scrolling the attendance list keeps the date nav + progress bar pinned at the top.
  - Tapping the date opens the calendar, picking a date loads that date's attendance correctly (verify against a date with known data if possible).
  - Left/right arrow navigation still works and stays in sync with the picker (e.g. if you arrow forward, then open the picker, it should show the current date highlighted, not the old one).
- Give me a summary of files changed and any new dependency added.