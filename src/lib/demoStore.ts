import { getInitialDemoData } from './demoData'
import { toLocalDateString } from './dateUtils'
import type { Customer, Class, Payment, CustomerSummary } from './supabase'

const STORAGE_KEY = 'DRIVEMANAGER_DEMO_DATA'
const DEMO_MODE_KEY = 'DRIVEMANAGER_IS_DEMO_MODE'
export const MAX_DEMO_CUSTOMERS = 20

export interface DemoState {
  anchorDate?: string
  customers: Customer[]
  classes: Class[]
  payments: Payment[]
}

// Check if currently running in demo mode
export function isDemoMode(): boolean {
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

// Toggle demo mode
export function setDemoMode(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(DEMO_MODE_KEY, 'true')
      // Initialize demo data if not already present
      getDemoData()
    } else {
      localStorage.removeItem(DEMO_MODE_KEY)
    }
    window.dispatchEvent(new Event('demo-mode-change'))
  } catch (err) {
    console.error('Failed to set demo mode flag in localStorage', err)
  }
}

// Retrieve demo state from localStorage or load defaults
export function getDemoData(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const state: DemoState = JSON.parse(raw)
      const today = toLocalDateString(new Date())

      // If missing anchorDate (older demo schema), reload with fresh data
      if (!state.anchorDate) {
        const fresh = getInitialDemoData()
        saveDemoData(fresh)
        return fresh
      }

      // If anchor date differs from today, shift all dates by the day difference
      if (state.anchorDate !== today) {
        const [oy, om, od] = state.anchorDate.split('-').map(Number)
        const [ty, tm, td] = today.split('-').map(Number)
        const oldAnchor = new Date(oy, om - 1, od, 12, 0, 0)
        const newAnchor = new Date(ty, tm - 1, td, 12, 0, 0)
        const diffDays = Math.round((newAnchor.getTime() - oldAnchor.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays !== 0) {
          const shiftDate = (dStr: string | null | undefined) => {
            if (!dStr) return dStr
            const [y, m, d] = dStr.split('-').map(Number)
            const shifted = new Date(y, m - 1, d + diffDays, 12, 0, 0)
            return toLocalDateString(shifted)
          }

          state.classes = (state.classes || []).map(c => ({
            ...c,
            class_date: shiftDate(c.class_date) || c.class_date,
          }))
          state.customers = (state.customers || []).map(cust => ({
            ...cust,
            enrollment_date: shiftDate(cust.enrollment_date) || cust.enrollment_date,
          }))
          state.anchorDate = today
          saveDemoData(state)
        }
      }

      return state
    }
  } catch (err) {
    console.error('Failed to parse demo data from localStorage, resetting to defaults', err)
  }

  const initial = getInitialDemoData()
  saveDemoData(initial)
  return initial
}

// Save demo state to localStorage
export function saveDemoData(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new Event('demo-data-change'))
  } catch (err) {
    console.error('Failed to save demo data to localStorage', err)
  }
}

// Reset demo data back to clean pre-seeded state
export function resetDemoData(): void {
  const initial = getInitialDemoData()
  saveDemoData(initial)
}

// Compute customer_summary dynamically from customers, classes, payments
export function computeCustomerSummary(
  customers: Customer[],
  classes: Class[],
  payments: Payment[]
): (CustomerSummary & { location?: string | null })[] {
  return customers.map(cust => {
    const custClasses = classes.filter(c => c.customer_id === cust.id)
    const custPayments = payments.filter(p => p.customer_id === cust.id)

    const classes_completed = custClasses.filter(c => c.status === 'done').length
    const classes_remaining = Math.max(0, cust.package_classes - classes_completed)

    const amount_paid = custPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    const amount_pending = Math.max(0, cust.total_fee - amount_paid)

    let payment_status: 'paid' | 'partial' | 'unpaid' = 'unpaid'
    if (amount_pending <= 0) {
      payment_status = 'paid'
    } else if (amount_paid > 0) {
      payment_status = 'partial'
    }

    return {
      customer_id: cust.id,
      customer_code: cust.customer_code,
      full_name: cust.full_name,
      phone_number: cust.phone_number,
      enrollment_date: cust.enrollment_date,
      package_classes: cust.package_classes,
      total_fee: cust.total_fee,
      course_status: cust.course_status,
      review_flag: cust.review_flag,
      location: cust.location,
      classes_completed,
      classes_remaining,
      amount_paid,
      amount_pending,
      payment_status,
    }
  })
}

// Store operations with validation and caps
export const demoStore = {
  getCustomers(): Customer[] {
    return getDemoData().customers
  },

  getClasses(): Class[] {
    return getDemoData().classes
  },

  getPayments(): Payment[] {
    return getDemoData().payments
  },

  getSummary(): (CustomerSummary & { location?: string | null })[] {
    const state = getDemoData()
    return computeCustomerSummary(state.customers, state.classes, state.payments)
  },

  insertCustomer(newCustomer: Omit<Customer, 'id' | 'customer_code'> & { id?: string }): Customer {
    const state = getDemoData()
    if (state.customers.length >= MAX_DEMO_CUSTOMERS) {
      throw new Error(`Demo limit reached! Maximum of ${MAX_DEMO_CUSTOMERS} customers allowed in demo mode.`)
    }

    const created: Customer = {
      ...newCustomer,
      id: newCustomer.id || `demo-cust-${Date.now()}`,
      customer_code: `CUST-${String(state.customers.length + 1).padStart(3, '0')}`,
    }

    state.customers.unshift(created)
    saveDemoData(state)
    return created
  },

  updateCustomer(id: string, patch: Partial<Customer>): Customer {
    const state = getDemoData()
    const index = state.customers.findIndex(c => c.id === id)
    if (index === -1) throw new Error(`Customer ${id} not found in demo data`)

    state.customers[index] = { ...state.customers[index], ...patch }
    saveDemoData(state)
    return state.customers[index]
  },

  insertClass(newClass: Omit<Class, 'id'> & { id?: string }): Class {
    const state = getDemoData()
    const created: Class = {
      ...newClass,
      id: newClass.id || `demo-cls-${Date.now()}`,
    }

    state.classes.unshift(created)
    saveDemoData(state)
    return created
  },

  updateClass(id: string, patch: Partial<Class>): Class {
    const state = getDemoData()
    const index = state.classes.findIndex(c => c.id === id)
    if (index === -1) throw new Error(`Class ${id} not found in demo data`)

    state.classes[index] = { ...state.classes[index], ...patch }
    saveDemoData(state)
    return state.classes[index]
  },

  deleteClass(id: string): void {
    const state = getDemoData()
    state.classes = state.classes.filter(c => c.id !== id)
    saveDemoData(state)
  },

  insertPayment(newPayment: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }): Payment {
    const state = getDemoData()
    const created: Payment = {
      ...newPayment,
      id: newPayment.id || `demo-pay-${Date.now()}`,
      created_at: newPayment.created_at || new Date().toISOString(),
    }

    state.payments.unshift(created)
    saveDemoData(state)
    return created
  },
}

