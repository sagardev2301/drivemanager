In the DriveManager repo (sagardev2301/drivemanager), change the "Mark Done"
flow on both the Home page and the Attendance page so it goes through a
confirmation step instead of marking a class done in one tap.

CURRENT BEHAVIOR: tapping "Mark Done" immediately sets classes.status =
'done' with no confirmation and no way to log a payment at the same time.

NEW FLOW:

1. Tapping "Mark Done" opens a confirmation modal/bottom-sheet (reuse the
   app's existing modal/drawer styling) showing the class's details
   (student name, "Class X of Y", time slot) with two actions:
     - "Confirm" — marks the class done only, no payment (same effect as
       the current one-tap behavior). Simple `update classes set status =
       'done' where id = ...`.
     - "Collect Payment" — opens the SAME payment-collection modal already
       used on the Customer Detail page. Do not duplicate that modal;
       extend the existing shared component with an optional `classId`
       prop instead.

2. Extend the shared payment modal component:
   - When opened WITHOUT a classId (existing Customer Detail usage): behave
     exactly as it does today — primary button reads "Collect", payment is
     inserted with class_id = null, no class status is touched.
   - When opened WITH a classId (new Mark-Done-flow usage): primary button
     reads "Collect & Mark Done" instead of "Collect". On submit, instead
     of a plain payments insert, call the new Supabase RPC:
       supabase.rpc('collect_payment_and_mark_done', {
         p_class_id: classId,
         p_customer_id: customerId,
         p_amount: amount,
         p_payment_mode: paymentMode,
         p_reference_note: referenceNote ?? null
       })
     This one call both records the payment (linked to that specific class)
     and sets that class's status to 'done' atomically — do not call two
     separate insert/update requests for this path, use the RPC so it's
     one transaction.
   - Surface the RPC's error message if it fails (e.g. the existing
     overpay-rejection trigger fires) — same error-handling pattern already
     used for the existing "Collect" path's insert errors.

3. After either "Confirm" or a successful "Collect & Mark Done", close all
   open modals, refresh the affected class row's status in the UI
   (Scheduled -> Done pill, "Fee Pending" -> "Fully Paid"/updated amount if
   relevant), and show the existing success-toast pattern.

Apply this to both Home.tsx's "Today's Classes" card and the Attendance
page's class list — they should call the same confirmation modal + payment
modal components rather than each having their own copy of this logic.
```