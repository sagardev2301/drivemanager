// Lead sources shared by the Leads list, Add Lead and Lead Details, so a lead
// always reopens with the source it was saved with.

/** Written by the public marketing site's booking form. Keep this exact value:
 *  the database only accepts website leads with this source. */
export const WEBSITE_SOURCE = 'website_contact_form'

/** Choices offered when adding or editing a lead by hand. */
export const PRESET_SOURCES = ['Just Dial', 'Referred', 'Walk-in', 'Phone Enquiry', 'Instagram Ad', 'Google Maps', 'Other']

/** Human label for a stored source value. */
export function sourceLabel(source: string | null): string {
  if (!source) return 'Direct'
  if (source === WEBSITE_SOURCE) return 'Website'
  return source
}

/**
 * Options for the source dropdown. A lead's current value is always included
 * as its own option (e.g. website bookings, or older values like "Referral"),
 * so it never falls back to "Other" + a free-text field.
 */
export function sourceOptions(current: string | null): { value: string; label: string }[] {
  const values = current && !PRESET_SOURCES.includes(current) ? [current, ...PRESET_SOURCES] : PRESET_SOURCES
  return values.map(v => ({ value: v, label: sourceLabel(v) }))
}
