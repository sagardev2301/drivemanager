import { createClient } from '@supabase/supabase-js'
import { isDemoMode, setDemoMode } from './demoStore'
import { DemoQueryBuilder } from './demoQueryBuilder'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

const realSupabase = createClient(supabaseUrl, supabaseAnonKey)

export const supabase = new Proxy(realSupabase, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => {
        if (isDemoMode()) {
          return new DemoQueryBuilder(table)
        }
        return target.from(table)
      }
    }
    if (prop === 'auth') {
      const realAuth = target.auth
      return new Proxy(realAuth, {
        get(authTarget, authProp, authReceiver) {
          if (authProp === 'signOut') {
            return async (...args: any[]) => {
              if (isDemoMode()) {
                setDemoMode(false)
                return { error: null }
              }
              return (authTarget.signOut as any)(...args)
            }
          }
          return Reflect.get(authTarget, authProp, authReceiver)
        },
      })
    }
    return Reflect.get(target, prop, receiver)
  },
}) as unknown as typeof realSupabase

// Type helpers based on actual schema
export type CourseStatus = 'active' | 'completed' | 'dropped'
export type ClassStatus = 'scheduled' | 'done' | 'not_completed' | 'cancelled'
export type PaymentMode = 'cash' | 'upi' | 'card' | 'netbank' | 'other'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'

export interface Customer {
  id: string
  customer_code: string
  full_name: string
  phone_number: string
  enrollment_date: string
  package_classes: number
  total_fee: number
  course_status: CourseStatus
  review_flag: boolean
  location: string | null
}

export interface Class {
  id: string
  customer_id: string
  status: ClassStatus
  class_date: string
  start_time: string | null
  end_time: string | null
  notes: string | null
  customers?: { full_name: string; phone_number: string }
}

export interface Payment {
  id: string
  customer_id: string
  class_id: string | null
  amount: number
  payment_mode: PaymentMode
  created_at: string
}

export interface CustomerSummary {
  customer_id: string
  full_name: string
  phone_number: string
  enrollment_date: string
  package_classes: number
  total_fee: number
  course_status: CourseStatus
  classes_completed: number
  classes_remaining: number
  amount_paid: number
  amount_pending: number
  payment_status: PaymentStatus
  location: string | null
}

