import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

