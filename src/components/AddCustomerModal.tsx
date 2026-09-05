import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onClose: () => void
  onSaved: () => void
}

export default function AddCustomerModal({ onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    package_classes: '10',
    total_fee: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    course_status: 'active' as const,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) { setError('Name is required'); return }
    if (!form.phone_number.trim()) { setError('Phone number is required'); return }
    if (!form.total_fee || isNaN(Number(form.total_fee))) { setError('Valid total fee is required'); return }

    setSaving(true)
    const { error: err } = await supabase.from('customers').insert({
      full_name: form.full_name.trim(),
      phone_number: form.phone_number.trim(),
      package_classes: parseInt(form.package_classes) || 10,
      total_fee: parseFloat(form.total_fee),
      enrollment_date: form.enrollment_date,
      course_status: form.course_status,
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
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 pb-8 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-[#141b2b]">Enroll New Customer</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-[#434654] hover:bg-[#e9edff]">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Eg. Priya Sharma"
              className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-[#737686]"
            />
          </div>
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Phone Number *</label>
            <input
              type="tel"
              required
              value={form.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-[#737686]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Package Classes</label>
              <input
                type="number"
                min="1"
                value={form.package_classes}
                onChange={e => set('package_classes', e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Total Fee (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={form.total_fee}
                onChange={e => set('total_fee', e.target.value)}
                placeholder="5000"
                className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-[#737686]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Enrollment Date</label>
            <input
              type="date"
              value={form.enrollment_date}
              onChange={e => set('enrollment_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white transition-all"
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
              <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>Enrolling...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">person_add</span>Enroll Customer</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

