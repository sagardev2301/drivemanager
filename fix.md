Diagnosis: the Tailwind base/reset layer is loading correctly (background color and margin resets from `index.css` are visible), but utility classes (`bg-primary`, `rounded-xl`, `p-4`, `shadow`, etc.) are not being generated at all — buttons and inputs render as plain unstyled browser defaults. This means Tailwind's content scanner isn't finding the utility classes used in the actual component code. Please check and fix both of the following:

**1. Confirm the `content` glob in `tailwind.config.js` actually matches where component files live.**
Current config scans: `"./index.html"` and `"./src/**/*.{js,ts,jsx,tsx}"`. Run a listing of the actual project structure and confirm every page/component file (Login, Dashboard, Attendance Log, Enrolled Customers, Customer Detail) is genuinely inside `src/` with one of those extensions. If any live outside `src/` (e.g. in a root-level `app/`, `pages/`, or `components/` folder, or use an extension not listed like `.mtsx`), either move them into `src/` or update the `content` array to include their actual path.

**2. Check for dynamically-constructed Tailwind class names and replace them with static literals.**
Search the codebase for any className built via template strings or concatenation, e.g.:
```jsx
// BAD — Tailwind's scanner can't see this at build time
className={`bg-${statusColor}-500`}
className={"text-" + variant}
```
Given how much of this app depends on status-driven coloring (payment status: paid/partial/unpaid, course status: active/completed/dropped, class status: done/not_completed/cancelled), this is the most likely place dynamic class construction crept in. Replace every instance with a lookup object mapping each status to a complete, static class string, e.g.:
```jsx
const paymentStatusClasses = {
  paid: "bg-tertiary text-on-tertiary",
  partial: "bg-tertiary-container text-on-tertiary-container",
  unpaid: "bg-error text-on-error",
};
// usage: className={paymentStatusClasses[status]}
```
This is required — Tailwind's JIT compiler only works with complete, literal class strings it can find via static text search across the project. Audit every status/variant-driven style in Dashboard, Attendance Log, Enrolled Customers, and Customer Detail for this pattern.

**3. After fixing both, do a clean rebuild:**
- Delete the Vite cache: `rm -rf node_modules/.vite`
- Restart the dev server fully (stop and start, not hot-reload).
- Confirm in the browser dev tools' Network tab that the compiled CSS file now contains rules for classes like `.bg-primary` — if it still doesn't, list out the exact classNames used in the Login screen component so we can check them directly.

---