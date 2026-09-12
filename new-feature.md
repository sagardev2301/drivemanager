In the DriveManager repo (sagardev2301/drivemanager), add time-period
filtering to the Dashboard's "School Overview" section. Reuse existing
Dashboard component structure, Supabase client, and card styling — don't
introduce new hardcoded colors/radii, reuse what's already used on this page.

DATA MODEL (for reference, no schema changes needed):
- customers.enrollment_date (date)
- classes.class_date (date), classes.status (enum: scheduled/done/
  not_completed/cancelled)
- payments.amount (numeric), payments.payment_date (timestamptz)

IMPORTANT — timezone: this app already had one IST date bug from using
`.toISOString().split('T')[0]` for date math (it shifts dates backward in
IST). Do NOT repeat that pattern here. Compute period boundaries using local
date components (getFullYear/getMonth/getDate) or a timezone-safe date
library already in the project, not raw ISO string slicing.

SPLIT THE DASHBOARD INTO TWO ZONES:

1. Lifetime cards (unchanged, no filter applies): Total Enrolled, Completed,
   Active, Dropped, and the Pending Payments card (₹X still pending from Y
   students) — these are current-state snapshots, not period activity, so
   leave them exactly as they are today.

2. Period-filtered section (new): add a segmented control / pill row above
   this section with options — "This Month" | "3M" | "6M" | "Year" | "All
   Time" — default to "This Month" on page load. Below it, three cards that
   recompute on filter change:
   a. New Enrollments — count of customers where enrollment_date falls
      within the selected period
   b. Classes Conducted — count of classes where class_date falls within
      the period AND status = 'done'
   c. Revenue Collected — sum of payments.amount where payment_date falls
      within the period

PERIOD BOUNDARIES:
- This Month: from the 1st of the current calendar month to today
- 3M / 6M: rolling window — today minus 3 or 6 calendar months, to today
- Year: from Jan 1 of the current year to today
- All Time: no lower bound (equivalent to today's lifetime totals for these
  three metrics — should match what Total Enrolled/Classes Done showed
  before this change)

IMPLEMENTATION:
- Data volumes are small (~535 customers, ~5,000 classes, ~530 payments) —
  plain filtered Supabase queries are fine, no materialized view needed
- Fetch on period change (or fetch all three metrics' underlying data once
  and filter client-side if that's more consistent with how this page
  already loads data — follow whatever pattern the existing Dashboard uses
  for its current lifetime queries)
- Show a loading state on the three period cards while refetching, without
  blocking or re-rendering the lifetime cards above them

UI:
- Segmented control: same pill/chip visual treatment as elsewhere in the
  app (match the Leads page's filter chip style: rounded pill, active
  option filled dark navy with white text, inactive outlined)
- The three period cards should visually match the existing lifetime card
  style (white background, rounded corners, icon top-right, big number,
  label underneath) so they read as part of the same dashboard, not a
  bolted-on section