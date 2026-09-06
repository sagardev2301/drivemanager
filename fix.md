

## Issue 1: Attendance date navigation — left arrow skips 2 days, right arrow does nothing

**Root cause:** classic JS timezone bug. Any code using this pattern is affected:
```js
const d = new Date(selectedDate + 'T00:00:00')  // parsed as LOCAL time
d.setDate(d.getDate() + delta)
setSelectedDate(d.toISOString().split('T')[0])  // toISOString() converts to UTC — shifts the date backward for any timezone ahead of UTC (like IST, UTC+5:30)
```
Since the app runs in IST, `toISOString()` silently shifts the date back by one day every time. That's why going back (-1) looks like -2, and going forward (+1) nets to 0.

**Fix:** add a shared local-date-formatting helper and use it everywhere a date string is derived from a `Date` object — never use `.toISOString().split('T')[0]` for local date logic.

```ts
function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
```

Replace:
- The initial `useState(new Date().toISOString().split('T')[0])` in Attendance.tsx
- The `changeDate` function's final line
- Any default-date logic in `AddClassModal` or elsewhere using the same `.toISOString().split('T')[0]` pattern

Audit the whole codebase for this exact pattern (`toISOString().split('T')[0]`) and replace every instance with `toLocalDateString(...)`.

**Additional feature — "copy previous day" for future dates:**
When the instructor navigates to a date with no classes scheduled (especially a future date), show a "Copy Yesterday's Schedule" button alongside "Add Unscheduled Class". Clicking it should:
1. Fetch all classes from the previous calendar day (any status).
2. Insert new rows for the selected date with the same customer_id and time slots, status reset to `scheduled` (never copy over `done`/`not_completed`/`cancelled` status or old notes).
3. After copying, the instructor can edit/remove individual entries normally before the day starts.

## Issue 2: "Log a Class" fails with a null class_number error, and empty fields aren't validated

**Database fix already applied** — `classes.class_number` is now auto-generated server-side via a trigger (same pattern as `customer_code`). **Remove any client-side logic that tries to compute or pass `class_number`** — just omit it entirely from the insert payload; the database fills it in automatically now.

**Add client-side required-field validation before submitting**, in both "Log a Class" and "Add Unscheduled Class" modals:
- Customer must be selected (not empty/placeholder).
- Date must not be empty.
- Start time must not be empty (end time can be optional if that's the intended UX, but flag clearly if required).
- Show an inline error message next to the specific missing field(s) and **do not fire the Supabase insert call** until all required fields are filled.

**Also fix generic error display:** the screenshot shows a raw Postgres error string ("null value in column...") surfaced directly to the user. Wrap all Supabase insert/update calls in try/catch and map known error codes/messages to friendly text, e.g.:
```js
if (error) {
  if (error.message.includes('payment_exceeds_fee')) {
    setError('This payment would exceed the remaining balance for this customer.')
  } else {
    setError('Something went wrong saving this. Please try again.')
  }
  return
}
```
Never show raw database error text in the UI.

## Issue 3: Payment amount has no upper-bound validation

**Database fix already applied** — a trigger now rejects any payment insert that would push the customer's total paid amount beyond their `total_fee`, so this can no longer corrupt data even if the UI has a bug.

**Add matching client-side validation** in the "Record Payment" form for immediate feedback (don't rely on the DB rejection alone — that should be a last-resort safety net, not the primary UX):
- Set the amount input's `max` attribute to the customer's current `amount_pending` (from `customer_summary`).
- Before submitting, check `amount <= amount_pending`; if not, show an inline error ("Amount exceeds the remaining balance of ₹X") and block submission.
- Also double check the **Customer Detail page's "Balance" card** — it currently shows ₹15,000 as "Balance" for a customer whose package is ₹3,500 (visible in the screenshot). This suggests the Balance card may be bound to `amount_paid` instead of `amount_pending`. Audit this binding against `customer_summary.amount_pending` specifically.

## Issue 4: Duplicate top bar on every page

The top bar ("DriveManager" + page title) appears to render twice — once from a fixed/persistent app shell layout, and again from each individual page component duplicating the same header markup. Fix:
- Identify the shared layout/app-shell component that should own the single top bar.
- That ONE component should dynamically show the correct title/subtitle based on the current route (e.g. "DriveManager / Dashboard", "DriveManager / Attendance", "DriveManager / Customers", "DriveManager / Customer Profile").
- Remove any duplicate header markup from individual page components (Dashboard.tsx, Attendance.tsx, Customers.tsx, CustomerDetail.tsx) — they should only render their own content, not their own copy of the top bar.

---

After applying all four fixes, run `npx tsc --noEmit` to catch any syntax issues before testing, then re-verify each flow: navigate attendance dates forward/backward across several days, log a class with an intentionally empty field (should block with inline error, not call the API), attempt an overpayment (should show a friendly client-side error), and confirm only one top bar renders per page.