import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
  defaultDate?: string
  defaultCustomerId?: string
}

export default function AddClassModal({ onClose, onSaved, defaultDate, defaultCustomerId }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [form, setForm] = useState({
    customer_id: defaultCustomerId ?? '',
    class_date: defaultDate ?? new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '08:50',
    notes: '',
    status: 'scheduled' as const,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('customers')
      .select('id, full_name, customer_code')
      .eq('course_status', 'active')
      .order('full_name')
      .then(({ data }) => { if (data) setCustomers(data as unknown as Customer[]) })
  }, [])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.customer_id) { setError('Please select a customer'); return }

    setSaving(true)
    const { error: err } = await supabase.from('classes').insert({
      customer_id: form.customer_id,
      class_date: form.class_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      notes: form.notes || null,
      status: form.status,
    })
    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-[#141b2b]">Log a Class</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#434654] hover:bg-[#e9edff]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!defaultCustomerId && (
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Customer *</label>
              <select
                required
                value={form.customer_id}
                onChange={e => set('customer_id', e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
              >
                <option value="">Select customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Date *</label>
            <input
              type="date"
              required
              value={form.class_date}
              onChange={e => set('class_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Start Time</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">End Time</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {(['scheduled', 'done'] as const).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`h-10 rounded-lg text-[12px] font-semibold transition-all ${form.status === s ? 'bg-[#003fb1] text-white' : 'bg-[#f1f3ff] text-[#141b2b]'}`}
                >
                  {s === 'scheduled' ? 'Scheduled' : 'Mark Done'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Eg. Parking practice"
              className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-[#737686]"
            />
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
              <><span className="material-symbols-outlined text-[18px]">add_circle</span>Log Class</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

