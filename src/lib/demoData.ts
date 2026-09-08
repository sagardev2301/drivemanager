import { toLocalDateString } from './dateUtils'
import type { Customer, Class, Payment } from './supabase'

export function getInitialDemoData(): {
  anchorDate: string
  customers: Customer[]
  classes: Class[]
  payments: Payment[]
} {
  const today = toLocalDateString(new Date())

  // Calculate dates relative to today for realistic attendance
  const dYesterday = new Date()
  dYesterday.setDate(dYesterday.getDate() - 1)
  const yesterday = toLocalDateString(dYesterday)

  const dTwoDaysAgo = new Date()
  dTwoDaysAgo.setDate(dTwoDaysAgo.getDate() - 2)
  const twoDaysAgo = toLocalDateString(dTwoDaysAgo)

  const dTomorrow = new Date()
  dTomorrow.setDate(dTomorrow.getDate() + 1)
  const tomorrow = toLocalDateString(dTomorrow)

  const dDayAfterTomorrow = new Date()
  dDayAfterTomorrow.setDate(dDayAfterTomorrow.getDate() + 2)
  const dayAfterTomorrow = toLocalDateString(dDayAfterTomorrow)

  const dThreeDaysAgo = new Date()
  dThreeDaysAgo.setDate(dThreeDaysAgo.getDate() - 3)
  const threeDaysAgo = toLocalDateString(dThreeDaysAgo)

  const dFiveDaysAgo = new Date()
  dFiveDaysAgo.setDate(dFiveDaysAgo.getDate() - 5)
  const fiveDaysAgo = toLocalDateString(dFiveDaysAgo)

  const customers: Customer[] = [
    {
      id: 'demo-cust-001',
      customer_code: 'CUST-001',
      full_name: 'Rahul Sharma',
      phone_number: '9876543210',
      enrollment_date: fiveDaysAgo,
      package_classes: 15,
      total_fee: 7500,
      course_status: 'active',
      review_flag: false,
      location: 'Indiranagar',
    },
    {
      id: 'demo-cust-002',
      customer_code: 'CUST-002',
      full_name: 'Priya Patel',
      phone_number: '9845012345',
      enrollment_date: fiveDaysAgo,
      package_classes: 20,
      total_fee: 9500,
      course_status: 'active',
      review_flag: false,
      location: 'Koramangala',
    },
    {
      id: 'demo-cust-003',
      customer_code: 'CUST-003',
      full_name: 'Amit Verma',
      phone_number: '9988776655',
      enrollment_date: threeDaysAgo,
      package_classes: 15,
      total_fee: 7500,
      course_status: 'active',
      review_flag: false,
      location: 'HSR Layout',
    },
    {
      id: 'demo-cust-004',
      customer_code: 'CUST-004',
      full_name: 'Ananya Reddy',
      phone_number: '9731234567',
      enrollment_date: threeDaysAgo,
      package_classes: 15,
      total_fee: 7500,
      course_status: 'active',
      review_flag: false,
      location: 'Whitefield',
    },
    {
      id: 'demo-cust-005',
      customer_code: 'CUST-005',
      full_name: 'Vikram Joshi',
      phone_number: '9820098200',
      enrollment_date: fiveDaysAgo,
      package_classes: 10,
      total_fee: 5500,
      course_status: 'completed',
      review_flag: false,
      location: 'Jayanagar',
    },
    {
      id: 'demo-cust-006',
      customer_code: 'CUST-006',
      full_name: 'Sneha Kulkarni',
      phone_number: '9611223344',
      enrollment_date: yesterday,
      package_classes: 20,
      total_fee: 9500,
      course_status: 'active',
      review_flag: false,
      location: 'BTM Layout',
    },
  ]

  const classes: Class[] = [
    // Today's classes
    {
      id: 'demo-cls-101',
      customer_id: 'demo-cust-001',
      status: 'done',
      class_date: today,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Parallel parking practice',
    },
    {
      id: 'demo-cls-102',
      customer_id: 'demo-cust-002',
      status: 'done',
      class_date: today,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'Highway merging & lane discipline',
    },
    {
      id: 'demo-cls-103',
      customer_id: 'demo-cust-003',
      status: 'scheduled',
      class_date: today,
      start_time: '10:00',
      end_time: '10:45',
      notes: 'Traffic intersection & signals',
    },
    {
      id: 'demo-cls-104',
      customer_id: 'demo-cust-004',
      status: 'scheduled',
      class_date: today,
      start_time: '11:30',
      end_time: '12:15',
      notes: 'Reverse S-bend maneuver',
    },
    {
      id: 'demo-cls-105',
      customer_id: 'demo-cust-006',
      status: 'scheduled',
      class_date: today,
      start_time: '16:00',
      end_time: '16:45',
      notes: 'Clutch control on slope',
    },

    // Tomorrow's scheduled classes
    {
      id: 'demo-cls-301',
      customer_id: 'demo-cust-001',
      status: 'scheduled',
      class_date: tomorrow,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Highway merging & overtakes',
    },
    {
      id: 'demo-cls-302',
      customer_id: 'demo-cust-002',
      status: 'scheduled',
      class_date: tomorrow,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'Night/dusk driving simulation',
    },
    {
      id: 'demo-cls-303',
      customer_id: 'demo-cust-003',
      status: 'scheduled',
      class_date: tomorrow,
      start_time: '10:00',
      end_time: '10:45',
      notes: 'Emergency braking & hazards',
    },
    {
      id: 'demo-cls-304',
      customer_id: 'demo-cust-006',
      status: 'scheduled',
      class_date: tomorrow,
      start_time: '16:00',
      end_time: '16:45',
      notes: 'City peak traffic navigation',
    },

    // Day after tomorrow's scheduled classes
    {
      id: 'demo-cls-401',
      customer_id: 'demo-cust-001',
      status: 'scheduled',
      class_date: dayAfterTomorrow,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Flyover & speed management',
    },
    {
      id: 'demo-cls-402',
      customer_id: 'demo-cust-002',
      status: 'scheduled',
      class_date: dayAfterTomorrow,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'Parallel parking in tight spot',
    },
    {
      id: 'demo-cls-403',
      customer_id: 'demo-cust-004',
      status: 'scheduled',
      class_date: dayAfterTomorrow,
      start_time: '11:30',
      end_time: '12:15',
      notes: 'Main road merge & roundabout',
    },

    // Yesterday's classes
    {
      id: 'demo-cls-106',
      customer_id: 'demo-cust-001',
      status: 'done',
      class_date: yesterday,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Basic steering and pedals',
    },
    {
      id: 'demo-cls-108',
      customer_id: 'demo-cust-002',
      status: 'done',
      class_date: yesterday,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'Roundabout navigation',
    },
    {
      id: 'demo-cls-110',
      customer_id: 'demo-cust-003',
      status: 'done',
      class_date: yesterday,
      start_time: '10:00',
      end_time: '10:45',
      notes: 'Gear changing & clutch friction point',
    },
    {
      id: 'demo-cls-111',
      customer_id: 'demo-cust-006',
      status: 'done',
      class_date: yesterday,
      start_time: '16:00',
      end_time: '16:45',
      notes: 'First drive - cockpit drill & mirrors',
    },

    // 2 days ago classes
    {
      id: 'demo-cls-112',
      customer_id: 'demo-cust-001',
      status: 'done',
      class_date: twoDaysAgo,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Ground maneuvers & steering 8-shape',
    },
    {
      id: 'demo-cls-113',
      customer_id: 'demo-cust-002',
      status: 'done',
      class_date: twoDaysAgo,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'Pedal coordination & braking',
    },

    // Past classes for Rahul Sharma (cust 1)
    {
      id: 'demo-cls-107',
      customer_id: 'demo-cust-001',
      status: 'done',
      class_date: threeDaysAgo,
      start_time: '07:30',
      end_time: '08:15',
      notes: 'Cockpit drill & gear shifting',
    },

    // Past classes for Priya Patel (cust 2)
    {
      id: 'demo-cls-109',
      customer_id: 'demo-cust-002',
      status: 'done',
      class_date: threeDaysAgo,
      start_time: '08:30',
      end_time: '09:15',
      notes: 'U-turns and narrow streets',
    },

    // Completed student (Vikram Joshi)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `demo-cls-200-${i}`,
      customer_id: 'demo-cust-005',
      status: 'done' as const,
      class_date: fiveDaysAgo,
      start_time: '09:00',
      end_time: '09:45',
      notes: `Class ${i + 1} completed`,
    })),
  ]

  const payments: Payment[] = [
    {
      id: 'demo-pay-001',
      customer_id: 'demo-cust-001',
      class_id: null,
      amount: 4500,
      payment_mode: 'upi',
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    },
    {
      id: 'demo-pay-002',
      customer_id: 'demo-cust-002',
      class_id: null,
      amount: 9500,
      payment_mode: 'card',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'demo-pay-003',
      customer_id: 'demo-cust-003',
      class_id: null,
      amount: 3000,
      payment_mode: 'cash',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-pay-004',
      customer_id: 'demo-cust-004',
      class_id: null,
      amount: 7500,
      payment_mode: 'netbank',
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'demo-pay-005',
      customer_id: 'demo-cust-005',
      class_id: null,
      amount: 5500,
      payment_mode: 'upi',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
    {
      id: 'demo-pay-006',
      customer_id: 'demo-cust-006',
      class_id: null,
      amount: 5000,
      payment_mode: 'upi',
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
  ]

  return { anchorDate: today, customers, classes, payments }
}

