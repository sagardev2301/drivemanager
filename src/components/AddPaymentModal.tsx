import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import type { PaymentMode } from '../lib/supabase'
import { useModalBackButton } from '../hooks/useModalBackButton'

interface Props {
  onClose: () => void
  onSaved: () => void
  customerId: string
  customerName: string
  amountPending: number
  classId?: string
}

const MODES: { key: PaymentMode; label: string }[] = [
  { key: 'upi', label: 'UPI / GPay' },
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'netbank', label: 'Net Banking' },
  { key: 'other', label: 'Other' },
]

export default function AddPaymentModal({ onClose, onSaved, customerId, customerName, amountPending, classId }: Props) {
  const [amount, setAmount] = useState(amountPending > 0 ? String(amountPending) : '')
  const [mode, setMode] = useState<PaymentMode>('upi')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { requestClose } = useModalBackButton(true, onClose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (amountPending > 0 && amt > amountPending) {
      setError(`Amount exceeds the remaining balance of ₹${amountPending.toLocaleString('en-IN')}`)
      return
    }

    setSaving(true)
    try {
      const { error: err } = classId
        ? await supabase.rpc('collect_payment_and_mark_done', {
            p_class_id: classId,
            p_customer_id: customerId,
            p_amount: amt,
            p_payment_mode: mode,
            p_reference_note: null,
          })
        : await supabase.from('payments').insert({
            customer_id: customerId,
            amount: amt,
            payment_mode: mode,
          })
      if (err) {
        if (err.message?.includes('payment_exceeds_fee')) {
          setError('This payment would exceed the remaining balance for this customer.')
        } else {
          setError('Something went wrong saving this. Please try again.')
        }
        setSaving(false)
        return
      }
      onSaved()
      requestClose()
    } catch {
      setError('Something went wrong saving this. Please try again.')
      setSaving(false)
      return
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={requestClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-semibold text-on-surface">Record Payment</h2>
            <p className="text-[13px] text-on-surface-variant mt-0.5">For {customerName}</p>
          </div>
          <button onClick={requestClose} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {amountPending > 0 && (
          <div className="flex items-center gap-2 bg-primary-fixed-dim/20 text-on-secondary-fixed-variant px-3 py-2 rounded-xl text-[13px] mb-4">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>Outstanding balance: ₹{amountPending.toLocaleString('en-IN')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Amount Received (₹) *</label>
            <input
              type="number"
              required
              min="1"
              max={amountPending > 0 ? amountPending : undefined}
              value={amount}
              onChange={e => {
                setAmount(e.target.value)
                setError('')
              }}
              placeholder="0"
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[20px] font-bold focus:outline-none focus:bg-white transition-all placeholder:text-outline placeholder:font-normal placeholder:text-[14px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-2 uppercase tracking-wider">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${mode === m.key ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-[13px]">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 mt-1 bg-primary text-on-primary rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
            ) : classId ? (
              <>
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Collect & Mark Done
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                Confirm ₹{parseFloat(amount || '0').toLocaleString('en-IN') || '0'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

