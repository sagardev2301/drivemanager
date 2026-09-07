import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { toLocalDateString } from '../lib/dateUtils'
import { getActiveCustomers, invalidateCustomerCache } from '../lib/customerCache'
import type { ActiveCustomerOption } from '../lib/customerCache'

interface Props {
  onClose: () => void
  onSaved: () => void
  defaultDate?: string
  defaultCustomerId?: string
  mode?: 'log' | 'schedule'
}

export default function AddClassModal({ onClose, onSaved, defaultDate, defaultCustomerId, mode = 'log' }: Props) {
  const [customers, setCustomers] = useState<ActiveCustomerOption[]>([])
  const [form, setForm] = useState({
    customer_id: defaultCustomerId ?? '',
    class_date: defaultDate ?? toLocalDateString(new Date()),
    start_time: '08:00',
    end_time: '08:50',
    notes: '',
    status: 'scheduled' as const,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (defaultCustomerId) return
    getActiveCustomers().then(setCustomers)
  }, [defaultCustomerId])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const newErrors: Record<string, string> = {}
    if (!form.customer_id.trim()) {
      newErrors.customer_id = 'Please select a customer'
    }
    if (!form.class_date.trim()) {
      newErrors.class_date = 'Date is required'
    }
    if (!form.start_time.trim()) {
      newErrors.start_time = 'Start time is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

    setSaving(true)
    try {
      const { error: err } = await supabase.from('classes').insert({
        customer_id: form.customer_id,
        class_date: form.class_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        notes: form.notes || null,
        status: form.status,
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
      invalidateCustomerCache()
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
          <h2 className="text-[20px] font-semibold text-on-surface">{mode === 'schedule' ? 'Schedule a Class' : 'Log a Class'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!defaultCustomerId && (
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Customer *</label>
              <select
                value={form.customer_id}
                onChange={e => set('customer_id', e.target.value)}
                className={`w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all ${errors.customer_id ? 'border border-error' : ''}`}
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name}{c.phone_number ? ` (${c.phone_number})` : ''}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-[12px] text-error mt-1">{errors.customer_id}</p>
              )}
            </div>
          )}
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Date *</label>
            <input
              type="date"
              value={form.class_date}
              onChange={e => set('class_date', e.target.value)}
              className={`w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all ${errors.class_date ? 'border border-error' : ''}`}
            />
            {errors.class_date && (
              <p className="text-[12px] text-error mt-1">{errors.class_date}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Start Time *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className={`w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all ${errors.start_time ? 'border border-error' : ''}`}
              />
              {errors.start_time && (
                <p className="text-[12px] text-error mt-1">{errors.start_time}</p>
              )}
            </div>
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all"
              />
            </div>
          </div>
          {mode !== 'schedule' && (
            <div>
              <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(['scheduled', 'done'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set('status', s)}
                    className={`h-9 rounded-xl text-[12px] font-semibold transition-all ${form.status === s ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface'}`}
                  >
                    {s === 'scheduled' ? 'Scheduled' : 'Mark Done'}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Eg. Parking practice"
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
            />
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
            ) : mode === 'schedule' ? (
              <><span className="material-symbols-outlined text-[18px]">calendar_add_on</span>Schedule Class</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">add_circle</span>Log Class</>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

