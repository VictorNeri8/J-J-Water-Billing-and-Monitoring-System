export type AdminRole = 'reader' | 'finance'

export function getAdminRoleLabel(role?: AdminRole | string | null): string {
  switch (role) {
    case "finance":
      return "Finance Admin"
    case "reader":
      return "Reader Admin"
    default:
      return "Unknown admin"
  }
}

export interface AdminProfile {
  id: string
  email: string
  role: AdminRole
  full_name?: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  account_number: string
  meter_id?: string | null
  customer_name: string
  contact_number: string
  stop_out: string
  stub_out_location_id?: string | null
  stub_out_locations?: {
    code: string
    name: string | null
    municipality: string
    barangay: string
    sitio: string | null
    purok: string | null
  } | null
  address: string | null
  municipality?: string | null
  barangay?: string | null
  sitio?: string | null
  purok?: string | null
  address_sitio_id?: string | null
  address_purok_id?: string | null
  date_registered: string
  is_active: boolean
  created_by: string | null
  created_by_user_id?: string | null
  created_by_email?: string | null
  created_by_role?: AdminRole | string | null
  archived_at?: string | null
  archived_by_user_id?: string | null
  archived_by_email?: string | null
  archived_by_role?: AdminRole | string | null
  archive_expires_at?: string | null
  meter_checked_at?: string | null
  meter_check_expires_at?: string | null
  meter_checked_by_user_id?: string | null
  meter_checked_by_email?: string | null
  meter_checked_by_role?: AdminRole | string | null
  created_at: string
  updated_at: string
}

export type StubOutStatus = 'active' | 'inactive'

export interface StubOutLocation {
  id: string
  code: string
  name: string | null
  municipality: string
  barangay: string
  sitio: string | null
  purok: string | null
  latitude: number
  longitude: number
  status: StubOutStatus
  notes: string | null
  created_by_user_id?: string | null
  created_by_email?: string | null
  created_by_role?: AdminRole | string | null
  created_at: string
  updated_at: string
}

export interface StubOutLocationSummary extends StubOutLocation {
  assigned_customer_count: number
}

export interface StubOutCustomer {
  id: string
  account_number: string
  meter_id?: string | null
  customer_name: string
  address: string | null
  contact_number: string | null
  stop_out: string | null
  is_active: boolean
  meter_checked_at?: string | null
  meter_check_expires_at?: string | null
  meter_checked_by_user_id?: string | null
  meter_checked_by_email?: string | null
  meter_checked_by_role?: AdminRole | string | null
  total_unpaid_balance: number
  is_overdue_account: boolean
}

export interface MeterReading {
  id: string
  customer_id: string
  previous_reading: number
  current_reading: number
  usage_cubic: number
  is_starting_reading: boolean
  reading_date: string
  recorded_by: string | null
  recorded_by_role: AdminRole | null
  created_at: string
}

export type BillingStatus = 'paid' | 'partial' | 'unpaid' | 'overdue'
export type PaymentMethod = 'cash' | 'online'

export interface Billing {
  id: string
  customer_id: string
  meter_reading_id: string
  usage_cubic: number
  amount: number
  amount_paid: number
  billing_date: string
  due_date: string
  status: BillingStatus
  paid_date: string | null
  payment_method?: PaymentMethod | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type SmsType = '60_day_reminder' | '76_day_final_warning' | 'custom'
export type SmsStatus = 'pending' | 'sent' | 'failed'

export interface SmsLog {
  id: string
  customer_id: string
  billing_id: string | null
  phone_number: string
  message: string
  sms_type: SmsType
  status: SmsStatus
  twilio_sid: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  subject: string
  message: string
  is_read: boolean
  created_at: string
}

// Extended types with relations
export interface BillingWithCustomer extends Billing {
  customer: Customer
}

export interface MeterReadingWithCustomer extends MeterReading {
  customer: Customer
}

export interface SmsLogWithCustomer extends SmsLog {
  customer: Customer
}

export interface OverdueBillingItem {
  id: string
  billingDate: string
  dueDate: string
  usageCubic: number
  amount: number
  amountPaid: number
  status: Exclude<BillingStatus, "paid"> | "paid"
}

export interface OverdueAccount {
  customerId: string
  accountNumber: string
  customerName: string
  address: string | null
  contactNumber: string | null
  stopOut: string | null
  totalUnpaid: number
  totalUnpaidConsumption: number
  penaltyFee: number
  totalDue: number
  openBillCount: number
  oldestUnpaidBillingDate: string
  latestOpenBillingDate?: string
  openBillings: OverdueBillingItem[]
}

// Dashboard statistics
export interface DashboardStats {
  totalCustomers: number
  paidAccounts: number
  unpaidAccounts: number
  overdueAccounts: number
}

export const WATER_BILL_BASE_RATE = 350
export const WATER_BILL_BASE_CUBIC = 10
export const WATER_BILL_EXCESS_RATE = 40

export interface WaterBillBreakdown {
  baseRate: number
  excessCharge: number
  excessCubic: number
  total: number
}

// Billing calculation helper
export function calculateWaterBill(usageCubic: number): number {
  if (usageCubic <= 0) {
    return 0
  }

  if (usageCubic <= WATER_BILL_BASE_CUBIC) {
    return WATER_BILL_BASE_RATE
  }

  return WATER_BILL_BASE_RATE + ((usageCubic - WATER_BILL_BASE_CUBIC) * WATER_BILL_EXCESS_RATE)
}

export function getWaterBillBreakdown(usageCubic: number): WaterBillBreakdown {
  if (usageCubic <= 0) {
    return {
      baseRate: 0,
      excessCubic: 0,
      excessCharge: 0,
      total: 0,
    }
  }

  const excessCubic = Math.max(usageCubic - WATER_BILL_BASE_CUBIC, 0)
  const excessCharge = excessCubic * WATER_BILL_EXCESS_RATE
  return {
    baseRate: WATER_BILL_BASE_RATE,
    excessCubic,
    excessCharge,
    total: calculateWaterBill(usageCubic),
  }
}

export const calculateBillingAmount = calculateWaterBill

// Format currency helper
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount)
}

// Format date helper
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date))
}
