import { supabase } from './supabase'
import { toLocalDateString } from './dateUtils'

export interface ActiveCustomerOption {
  id: string
  full_name: string
  phone_number: string
  enrollment_date: string
  classes_completed?: number
  package_classes?: number
  classes_remaining?: number
}

// In-memory cache of active customers who haven't completed all their classes
let cachedActiveCustomers: ActiveCustomerOption[] | null = null
let inFlightPromise: Promise<ActiveCustomerOption[]> | null = null
let lastFetchedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes TTL for freshness

/**
 * Invalidate the cache so the next request fetches fresh data from DB.
 * Called when a customer is added, or a class is logged / marked done.
 */
export function invalidateCustomerCache() {
  cachedActiveCustomers = null
  inFlightPromise = null
  lastFetchedAt = 0
}

/**
 * Fetch active customers whose classes are NOT completed,
 * ordered by recent enrollment date descending.
 * 
 * Performance:
 * Returns the in-memory cached list immediately if available,
 * avoiding repeated DB queries when opening "+ Add Unscheduled Class".
 */
export async function getActiveCustomers(forceRefresh = false): Promise<ActiveCustomerOption[]> {
  const now = Date.now()
  if (!forceRefresh && cachedActiveCustomers !== null && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedActiveCustomers
  }

  if (inFlightPromise && !forceRefresh) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    try {
      // Limit to customers enrolled within the last 45 days
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - 45)
      const cutoffDate = toLocalDateString(cutoff)

      const { data, error } = await supabase
        .from('customer_summary')
        .select('customer_id, full_name, phone_number, enrollment_date, course_status, classes_completed, package_classes, classes_remaining')
        .eq('course_status', 'active')
        .gte('enrollment_date', cutoffDate)
        .order('enrollment_date', { ascending: false })

      if (error) {
        console.error('Failed to fetch active customers:', error)
        if (cachedActiveCustomers) return cachedActiveCustomers
        return []
      }

      // Filter out customers whose classes are completed or enrolled before 45 days:
      // 1. Course status must be active
      // 2. Enrolled within last 45 days
      // 3. Classes completed must be less than package classes (if package_classes > 0)
      // 4. Classes remaining must be > 0 (if provided)
      const activeList: ActiveCustomerOption[] = (data || [])
        .filter((c: any) => {
          if (c.course_status !== 'active') return false
          if (c.enrollment_date && c.enrollment_date < cutoffDate) return false
          if (c.package_classes > 0 && c.classes_completed >= c.package_classes) return false
          if (typeof c.classes_remaining === 'number' && c.classes_remaining <= 0) return false
          return true
        })
        .map((c: any) => ({
          id: c.customer_id,
          full_name: c.full_name,
          phone_number: c.phone_number ?? '',
          enrollment_date: c.enrollment_date,
          classes_completed: c.classes_completed,
          package_classes: c.package_classes,
          classes_remaining: c.classes_remaining,
        }))

      cachedActiveCustomers = activeList
      lastFetchedAt = Date.now()
      return activeList
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}
