import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { CustomerSummary } from '../lib/supabase'
import AddPaymentModal from './AddPaymentModal'

interface Props {
  customer: CustomerSummary
  onClose: () => void
  onPaymentSaved: () => void
}

function getInitials(name: string) {
  return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
}

function getWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '')
  const fullNumber = digits.length === 10 ? '91' + digits : digits
  return 'https://wa.me/' + fullNumber + '?text=' + encodeURIComponent(message)
}

function formatDueDate(): string {
  const due = new Date()
  due.setDate(due.getDate() + 7)
  return due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function buildWhatsAppMessage(c: CustomerSummary): string {
  const lines = [
    'Hi! Here are your driving class details:',
    '',
    'Name: ' + c.full_name,
    'Classes Done: ' + c.classes_completed + ' / ' + c.package_classes,
    'Payment Pending: \u20b9' + c.amount_pending.toLocaleString('en-IN'),
    '',
    'Please clear the dues by ' + formatDueDate() + '.',
    '',
    'Thank you! \uD83D\uDE4F',
    '\u2014 Sagar Driving School',
  ]
  return lines.join('\n')
}

export default function CustomerActionSheet({ customer, onClose, onPaymentSaved }: Props) {
  const navigate = useNavigate()
  const [showPayment, setShowPayment] = useState(false)

  const hasPending = customer.amount_pending > 0
  const hasPhone = !!customer.phone_number && customer.phone_number.trim().length >= 5

  function handleViewProfile() {
    onClose()
    navigate('/customers/' + customer.customer_id)
  }

  function handleWhatsApp() {
    const msg = buildWhatsAppMessage(customer)
    window.open(getWhatsAppUrl(customer.phone_number, msg), '_blank', 'noopener,noreferrer')
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="w-full max-w-lg bg-white rounded-t-3xl shadow-drawer"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-100" />
          </div>

          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
            <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center text-[16px] font-bold shrink-0">
              {getInitials(customer.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold text-slate-900 truncate">{customer.full_name}</p>
              <p className="text-[12px] text-slate-500">{customer.phone_number}</p>
            </div>
            {hasPending ? (
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[12px] font-semibold shrink-0">
                Rs.{customer.amount_pending.toLocaleString('en-IN')} Pending
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50/30 text-emerald-600 text-[12px] font-semibold shrink-0">
                Paid
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 px-5 pt-4">
            <button
              onClick={() => setShowPayment(true)}
              disabled={!hasPending}
              className={'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.98] ' + (hasPending ? 'bg-brand-600 text-white shadow-sm' : 'bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed')}
            >
              <span className="material-symbols-outlined text-[22px]">payments</span>
              <div>
                <p className="text-[14px] font-semibold leading-tight">
                  {hasPending ? 'Collect Payment' : 'No Payment Due'}
                </p>
                {hasPending && (
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Rs.{customer.amount_pending.toLocaleString('en-IN')} outstanding
                  </p>
                )}
              </div>
            </button>

            <button
              onClick={handleWhatsApp}
              disabled={!hasPhone || !hasPending}
              className={'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.98] ' + (hasPhone && hasPending ? 'bg-emerald-50/30 text-emerald-600' : 'bg-slate-50 text-slate-300 opacity-60 cursor-not-allowed')}
            >
              <svg className="w-[22px] h-[22px] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.08C19.42 7.64 20.28 9.7 20.28 11.9C20.28 16.44 16.58 20.14 12.04 20.14C10.56 20.14 9.11 19.74 7.84 18.99L7.54 18.81L4.42 19.63L5.25 16.59L5.05 16.28C4.24 14.99 3.8 13.47 3.8 11.91C3.8 7.37 7.5 3.67 12.05 3.67ZM8.52 7.08C8.33 7.08 8.1 7.15 7.88 7.39C7.66 7.64 7.02 8.23 7.02 9.44C7.02 10.65 7.9 11.82 8.02 11.98C8.15 12.15 9.72 14.65 12.2 15.66C12.79 15.9 13.25 16.05 13.61 16.16C14.21 16.35 14.75 16.32 15.18 16.26C15.66 16.19 16.65 15.66 16.86 15.08C17.07 14.5 17.07 14.01 17.01 13.9C16.95 13.8 16.79 13.73 16.55 13.61C16.31 13.49 15.08 12.88 14.86 12.8C14.63 12.72 14.46 12.67 14.29 12.93C14.12 13.18 13.63 13.74 13.48 13.91C13.33 14.08 13.18 14.1 12.94 13.98C12.69 13.86 11.9 13.6 10.95 12.76C10.22 12.11 9.72 11.3 9.58 11.05C9.43 10.8 9.56 10.67 9.68 10.55C9.79 10.44 9.93 10.26 10.05 10.12C10.17 9.97 10.22 9.87 10.3 9.7C10.38 9.53 10.34 9.39 10.28 9.27C10.22 9.14 9.71 7.89 9.49 7.38C9.28 6.89 9.07 6.95 8.91 6.94L8.52 7.08Z" />
              </svg>
              <div>
                <p className="text-[14px] font-semibold leading-tight">Send Payment Reminder</p>
                <p className="text-[11px] opacity-75 mt-0.5">WhatsApp with due date (+7 days)</p>
              </div>
            </button>

            <button
              onClick={handleViewProfile}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-slate-50 text-slate-900 text-left transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[22px] text-brand-600">person</span>
              <div>
                <p className="text-[14px] font-semibold leading-tight">View Profile</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {customer.classes_completed} of {customer.package_classes} classes done
                </p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-slate-300 ml-auto">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <AddPaymentModal
          onClose={() => setShowPayment(false)}
          onSaved={() => {
            setShowPayment(false)
            onClose()
            onPaymentSaved()
          }}
          customerId={customer.customer_id}
          customerName={customer.full_name}
          amountPending={customer.amount_pending}
        />
      )}
    </>,
    document.body
  )
}
