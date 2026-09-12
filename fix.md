In the DriveManager repo (sagardev2301/drivemanager), the newly built Leads
page's filter chips and lead cards visually diverge from the existing
Customers page's chips and cards (different colors/spacing/radius, likely
because each screen hardcodes its own values instead of sharing a component
— this is a known issue in this codebase).

Fix this by making Leads reuse the Customers page's actual styling, not by
re-approximating it:

1. Open the Customers page component (wherever its filter chips and
   customer-card markup live — likely CustomerFilters/CustomerCard or inline
   in the Customers.tsx/CustomersPage file) and identify the exact classes,
   structure, and any shared sub-components used for:
     a. The status filter chip row (active/completed/dropped or similar)
     b. The customer list card (avatar circle, name, phone, status badge,
        meta row, chevron)

2. Refactor the Leads page's filter chips and lead cards to use the same
   underlying component(s) if one exists, OR — if the Customers page's
   chips/cards are inline JSX with no shared component — extract them into
   reusable components (e.g. FilterChip, FilterChipRow, EntityListCard) that
   both Customers and Leads import, rather than duplicating the markup again.

3. Apply that shared chip/card styling to Leads:
   - Chip row: same pill shape, spacing, active/inactive fill and border
     treatment, and count-badge style as Customers' chips
   - Lead card: same card padding, border-radius, shadow, avatar size, and
     name/phone typography as Customers' card — keep the Leads-specific
     status-colored avatar ring and status badge fill colors (blue/amber/
     purple/green/red) since that logic doesn't exist on Customers, but
     everything else (spacing, radius, shadow, font sizes) should be
     identical to the Customers card

4. Do not introduce any new hex values or radius/shadow values in this
   change — only reuse what's already defined for the Customers page.

The goal is that Leads and Customers look like they come from the same
design system, and future screens can reuse the same chip/card components
instead of hardcoding again.