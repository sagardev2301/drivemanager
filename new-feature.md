Implement the "Leads & Bookings" feature in the DriveManager repo
(sagardev2301/drivemanager). Follow the existing codebase's file structure,
component patterns, Supabase client usage, and Tailwind conventions used in
the Customers and Attendance pages — reuse existing hooks/utilities rather
than duplicating logic.

DATABASE (already migrated, do not recreate — just wire up to it):

Table: public.leads
  id                     uuid        PK, default gen_random_uuid()
  full_name              text        not null
  phone_number           text        not null
  source                 text        nullable   -- free text, e.g. "Instagram Ad",
                                                  "Referral", "Walk-in",
                                                  "Google Maps", "Website Form"
  status                 lead_status_enum   not null, default 'new'
                                     -- enum values: 'new' | 'contacted' |
                                     -- 'booked' | 'converted' | 'dropped'
  notes                  text        nullable
  converted_customer_id  uuid        nullable, FK -> public.customers(id)
  created_at             timestamptz not null, default now()
  updated_at             timestamptz not null, default now() (auto-updated
                                     via trg_leads_updated_at trigger)

RLS is already enabled with the same "authenticated users can manage" policy
used on customers/classes/payments — no auth changes needed.

UI TO BUILD (reference the attached approved Stitch mockup exactly — light
theme, white header/cards on light gray background, matching the existing
Dashboard/Customers visual style):

1. New bottom-nav tab "Leads" with a person+magnifying-glass icon, positioned
   between Dashboard and Attendance: Dashboard, Leads, Attendance, Customers.

2. Leads list screen:
   - Header: "DriveManager / Leads & Bookings" (same header component style
     as other pages), "X Active Inquiries" pill showing count of leads NOT
     in 'converted' or 'dropped' status
   - Horizontal-scroll status filter chips: All, New, Contacted, Booked,
     Converted, Dropped — each showing a live count from the leads table,
     filtering the list client-side or via query param
   - Lead card per row: avatar with initials + colored ring by status
     (New=blue #3B82F6, Contacted=amber #F59E0B, Booked=purple #A855F7,
     Converted=green #10B981, Dropped=red #EF4444), name, phone, a status
     badge pill in the same color, a source tag with an icon (map known
     source strings to icons: "Instagram Ad"→megaphone, "Referral"→people,
     "Walk-in"→storefront, "Google Maps"→pin, "Website Form"→globe; fall
     back to a generic tag icon for any other source string), relative
     timestamp from created_at, and a chevron
   - Floating "+" action button bottom-right, opens an add-lead bottom sheet
     (Name, Phone, Source as free-text or a small preset dropdown, Notes,
     Save) that inserts into leads

3. Lead detail view (on card tap): editable name/phone/source/notes, a
   status dropdown (updates leads.status on change), and a "Convert to
   Customer" button — hidden/disabled when status is already 'converted'.
   On convert:
     a. Check customers.phone_number for an existing match; if found, warn
        instead of creating a duplicate (phone_number is unique on customers)
     b. Insert into customers: full_name = leads.full_name,
        phone_number = leads.phone_number, enrollment_date = today,
        package_classes and total_fee left at their table defaults (10 /
        3500) unless the instructor overrides them in this step
     c. Update the leads row: converted_customer_id = new customer's id,
        status = 'converted'
     d. Navigate to the new customer's detail page in Customers

Keep everything mobile-first and consistent with the app's existing spacing,
shadows, and typography scale.