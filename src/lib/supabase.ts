import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type helpers based on actual schema
export type CourseStatus = 'active' | 'completed' | 'dropped'
export type ClassStatus = 'scheduled' | 'done' | 'not_completed' | 'cancelled'
export type PaymentMode = 'cash' | 'upi' | 'card' | 'netbank' | 'other'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'converted' | 'dropped'
export type UserRole = 'staff' | 'learner'
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface Lead {
  id: string
  full_name: string
  phone_number: string
  source: string | null
  location: string | null
  status: LeadStatus
  notes: string | null
  converted_customer_id: string | null
  created_at: string
  updated_at: string
}

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

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone_number: string | null
  created_at: string
}

export interface Driver {
  id: string
  auth_user_id: string | null
  full_name: string
  photo_url: string | null
  bio: string | null
  years_experience: number | null
  specialties: string[]
  is_active: boolean
  created_at: string
}

export interface CoursePackage {
  id: string
  driver_id: string
  name: string
  class_count: number
  class_duration_minutes: number
  price: number
  description: string | null
  is_active: boolean
}

export interface DriverAvailability {
  id: string
  driver_id: string
  day_of_week: number // 0 = Sunday
  start_time: string
  end_time: string
  is_active: boolean
}

export interface Booking {
  id: string
  learner_id: string
  driver_id: string
  course_package_id: string
  requested_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  customer_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  drivers?: { full_name: string; photo_url: string | null }
  course_packages?: { name: string; price: number }
}

export interface Review {
  id: string
  learner_id: string
  driver_id: string
  booking_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface DriverRatingSummary {
  driver_id: string
  average_rating: number
  review_count: number
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

