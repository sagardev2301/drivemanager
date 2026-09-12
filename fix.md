In the DriveManager repo (sagardev2301/drivemanager), add a "Location" field
to the Leads & Bookings feature to match the existing leads table, which now
has a nullable `location` text column (same shape as customers.location —
customer pickup/drop location).

Changes needed:

1. Update the Lead TypeScript type/interface to include:
     location: string | null;

2. Add-lead bottom sheet: add a "Location" text input, styled and positioned
   the same as the Location field on the Customer add/edit form — place it
   after Source and before Notes. Optional field, no validation required.

3. Lead detail/edit view: show and allow editing the Location field the same
   way the Customer detail page shows/edits location — same input style,
   placed near Source/Notes.

4. Convert-to-Customer flow: when inserting the new row into `customers`,
   set customers.location = leads.location (carry it over directly; if null,
   leave customers.location