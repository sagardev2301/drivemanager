I'm working on the Customers page (`src/pages/Customers.tsx`, "Enrolled Customers" list) of a React + TypeScript + Tailwind + Vite app (Supabase backend). This is a mobile-first app.

## Current behavior
- The customer list is paginated (currently 25 customers per page, 529 total customers, so ~22 pages).
- The pagination control (prev arrow, page numbers, next arrow, "1/22" indicator) is currently always visible on screen — it appears to be fixed/anchored near the bottom of the viewport regardless of scroll position, which eats into the visible list area and is visible even when the instructor hasn't finished scrolling through the current page's results.

## What I want changed
- The pagination control should only become visible once the instructor has scrolled to the bottom of the current page's customer list (i.e. past the last customer card).
- While scrolling through the list, the pagination control should be hidden (or at least out of the way) so the list gets full screen space.
- Once pagination becomes visible, tapping a page number / prev / next should behave exactly as it does today (loads that page of customers) — don't change the pagination logic itself, only its visibility/positioning behavior.
- After switching pages, the list should scroll back to the top (so the instructor isn't left mid-scroll on the new page with the pagination control still showing from the old scroll position) — confirm with me if there's already scroll-restoration logic here before adding new logic.

## Implementation guidance
- Two reasonable approaches — pick whichever fits the existing layout structure better, and tell me which you used:
  1. **Inline at end of list**: render the pagination control as a normal block element after the last customer card (not fixed/sticky), so it naturally only becomes visible when the user scrolls to the bottom, then is part of normal document flow.
  2. **Scroll-triggered reveal**: keep it positioned at the bottom of the viewport but track scroll position (e.g. via an IntersectionObserver on a sentinel element placed after the last card, or a scroll-position check) and only render/show it once the bottom is reached, hiding it otherwise.
- Prefer the simplest approach that matches how the rest of the page is already structured — check whether the current pagination is using `fixed`/`sticky` positioning or is already in normal flow before deciding.
- Keep the visual style (colors, spacing, border-radius) of the existing pagination control unchanged — this is a visibility/positioning fix only, not a redesign.
- Don't touch the search bar, filter pills (All/Active/Pending Fee/Completed), or the customer card layout — scope this to the pagination control only.

## After implementing
- Run the dev server and confirm:
  - Pagination is not visible while scrolling through the middle of a customer page's list.
  - Pagination appears once the instructor scrolls to the bottom of the current page's results.
  - Changing pages via the pagination control still works correctly and loads the right customers.
- Give me a summary of what approach was used and which files changed.