
On mobile, the "Enroll New Customer" modal (and likely "Log a Class" too, since it's probably the same modal pattern) has its primary Save/Continue button hidden underneath the fixed bottom navigation bar — the button is there, but visually obscured/unreachable because the bottom nav renders on top of it or the modal doesn't leave enough space above the nav.

Please fix this by checking both of the following:

**1. Z-index stacking — the modal should always render above the bottom nav.**
- Check the bottom nav bar's z-index (e.g. `z-40`) and the modal overlay's z-index. The modal container (the fixed overlay wrapping the whole "Enroll New Customer" sheet) must have a **higher** z-index than the bottom nav — e.g. bottom nav at `z-40`, modal overlay at `z-50` or higher.
- The cleanest fix: when any modal is open, the bottom nav should not be visible at all underneath it — the modal should be a full-screen overlay (`fixed inset-0`) that completely covers the nav, not a partial-height sheet that shares screen space with it.

**2. Bottom padding/safe area — ensure the button isn't clipped even if the modal's content scrolls.**
- The modal's action button area (Save/Continue) should have bottom padding of at least the bottom nav's height plus normal spacing, e.g. using the `bottom-nav-height` value already defined in `tailwind.config.js` (`4rem`): add `pb-[calc(4rem+1rem)]` (or reference the theme value) to the modal's button container, OR simpler — since the modal fully overlays the nav per fix #1, just ensure normal safe-area bottom padding (`pb-6` or `pb-[env(safe-area-inset-bottom)]`) so the button isn't flush against the very edge of the screen on devices with home-indicator bars.
- If the modal's form content can be long (scrollable), make sure the button is either sticky at the bottom of the modal (not scrolled away) or the scroll container has enough bottom padding that scrolling reveals the button fully above the screen edge.

**Apply this fix to every modal in the app that has this same bottom-nav layout** (Enroll New Customer, Log a Class/Add Unscheduled Class, Record Payment on Customer Detail, and any others) — this is a shared layout bug, not a one-off in a single component, so check the shared Modal wrapper component if there is one and fix it there rather than patching each modal individually.

After fixing, verify on a real mobile-width viewport (not just resizing a desktop browser window) that the Save button is fully visible and tappable without the bottom nav overlapping it.

