In the DriveManager repo (sagardev2301/drivemanager), fix the edit/delete
controls on the Attendance page (Attendance.tsx) so mistakes can be
corrected properly, based on the viewed date and the class's status.

CURRENT BEHAVIOR: edit (pencil) and delete (trash) icons show up
inconsistently — a class marked "Done" currently shows no edit/delete
option at all, so a done-by-mistake entry can't be corrected.

REQUIRED BEHAVIOR:
- If the viewed date == today's actual calendar date (the real system date,
  not just whatever date happens to be selected): show BOTH edit and
  delete icons on every class row for that date, regardless of status
  (scheduled, done, not_completed, cancelled). This covers both
  "scheduled by mistake" and "marked done by mistake" on the current day.
- If the viewed date is in the FUTURE (after today): show DELETE ONLY,
  never edit — even if that row somehow has status = 'done' (shouldn't
  normally happen, but this is a safety case).
- Assumption for PAST dates (before today) — I'm treating these the same
  as future (delete only, no edit), since editing a closed historical
  record isn't something that should happen casually. Flag it back to me
  if you'd rather past dates have no controls at all instead.

IMPLEMENTATION NOTES:
- Compare dates using local date components (year/month/day), not
  `.toISOString().split('T')[0]` — this file has had an IST date-shift bug
  from that exact pattern before, don't reintroduce it
- Compute isToday/isFuture/isPast once per date group, and derive simple
  `canEdit` / `canDelete` booleans per row rather than nested ternaries
  inline in JSX (also a past source of bugs in this file)
- Check the delete path against the schema: payments.class_id is a
  nullable FK to classes with no explicit cascade rule, so deleting a
  'done' class that already has a payment logged against it may fail or
  orphan that payment depending on how the FK is set up. If a class row
  has a linked payment, either block the delete with a clear message
  ("this class has a payment recorded — remove the payment first") or
  handle it explicitly — don't let it fail silently or leave a dangling
  payment. Flag this to me if it needs a schema-level decision.

Do this as a standalone fix before starting the app-wide design-consistency
pass we discussed separately.