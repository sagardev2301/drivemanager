import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import type { PaymentMode } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
  customerId: string
  customerName: string
  amountPending: number
}

const MODES: { key: PaymentMode; label: string }[] = [
  { key: 'upi', label: 'UPI / GPay' },
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'netbank', label: 'Net Banking' },
  { key: 'other', label: 'Other' },
]

export default function AddPaymentModal({ onClose, onSaved, customerId, customerName, amountPending }: Props) {
  const [amount, setAmount] = useState(amountPending > 0 ? String(amountPending) : '')
  const [mode, setMode] = useState<PaymentMode>('upi')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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
      const { error: err } = await supabase.from('payments').insert({
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
      onClose()
    } catch {
      setError('Something went wrong saving this. Please try again.')
      setSaving(false)
      return
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-[20px] font-semibold text-[#141b2b]">Record Payment</h2>
            <p className="text-[13px] text-[#434654] mt-0.5">For {customerName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#434654] hover:bg-[#e9edff]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {amountPending > 0 && (
          <div className="flex items-center gap-2 bg-[#b5c4ff]/20 text-[#1a3f9c] px-3 py-2 rounded-xl text-[13px] mb-4">
            <span className="material-symbols-outlined text-[16px]">info</span>
            <span>Outstanding balance: ₹{amountPending.toLocaleString('en-IN')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Amount Received (₹) *</label>
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
              className="w-full h-12 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[20px] font-bold focus:outline-none focus:bg-white transition-all placeholder:text-[#737686] placeholder:font-normal placeholder:text-[14px]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#434654] block mb-2 uppercase tracking-wider">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`h-10 rounded-lg text-[12px] font-semibold transition-all active:scale-95 ${mode === m.key ? 'bg-[#003fb1] text-white' : 'bg-[#f1f3ff] text-[#141b2b]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-[#ffdad6] text-[#93000a] px-3 py-2 rounded-xl text-[13px]">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full h-12 mt-1 bg-[#003fb1] text-white rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {saving ? (
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Saving...</>
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

