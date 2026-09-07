import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { toLocalDateString } from '../lib/dateUtils'
import { invalidateCustomerCache } from '../lib/customerCache'

export interface CustomerEditData {
  id: string
  full_name: string
  phone_number: string
  package_classes: number
  total_fee: number
  enrollment_date: string
  course_status?: 'active' | 'completed' | 'dropped'
  location?: string | null
  classes_completed?: number
}

interface Props {
  onClose: () => void
  onSaved: () => void
  customer?: CustomerEditData | null
}

export default function AddCustomerModal({ onClose, onSaved, customer }: Props) {
  const isEditing = Boolean(customer)
  const [form, setForm] = useState({
    full_name: customer?.full_name ?? '',
    phone_number: customer?.phone_number ?? '',
    package_classes: customer ? String(customer.package_classes) : '10',
    total_fee: customer ? String(customer.total_fee) : '',
    enrollment_date: customer?.enrollment_date ?? toLocalDateString(new Date()),
    course_status: (customer?.course_status ?? 'active') as 'active' | 'completed' | 'dropped',
    location: customer?.location ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (customer) {
      setForm({
        full_name: customer.full_name,
        phone_number: customer.phone_number,
        package_classes: String(customer.package_classes),
        total_fee: String(customer.total_fee),
        enrollment_date: customer.enrollment_date,
        course_status: (customer.course_status ?? 'active') as 'active' | 'completed' | 'dropped',
        location: customer.location ?? '',
      })
    }
  }, [customer])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.full_name.trim()) { setError('Name is required'); return }
    if (!form.phone_number.trim()) { setError('Phone number is required'); return }
    if (!form.total_fee || isNaN(Number(form.total_fee))) { setError('Valid total fee is required'); return }

    const pkgClasses = parseInt(form.package_classes) || 10
    if (isEditing && customer && customer.classes_completed !== undefined && pkgClasses < customer.classes_completed) {
      setError(`Package classes cannot be less than completed classes (${customer.classes_completed})`)
      return
    }

    setSaving(true)
    try {
      if (isEditing && customer) {
        const { error: err } = await supabase
          .from('customers')
          .update({
            full_name: form.full_name.trim(),
            phone_number: form.phone_number.trim(),
            package_classes: pkgClasses,
            total_fee: parseFloat(form.total_fee),
            enrollment_date: form.enrollment_date,
            course_status: form.course_status,
            location: form.location.trim() || null,
          })
          .eq('id', customer.id)

        if (err) {
          setError(err.message || 'Something went wrong saving this. Please try again.')
          setSaving(false)
          return
        }
      } else {
        const { error: err } = await supabase.from('customers').insert({
          full_name: form.full_name.trim(),
          phone_number: form.phone_number.trim(),
          package_classes: pkgClasses,
          total_fee: parseFloat(form.total_fee),
          enrollment_date: form.enrollment_date,
          course_status: form.course_status,
          location: form.location.trim() || null,
        })
        if (err) {
          setError('Something went wrong saving this. Please try again.')
          setError(err.message || 'Something went wrong saving this. Please try again.')
          setSaving(false)
          return
        }
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
        className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl p-6 pb-8 max-h-[90dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[20px] font-semibold text-on-surface">
            {isEditing ? 'Edit Customer Details' : 'Enroll New Customer'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              placeholder="Eg. Priya Sharma"
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Phone Number *</label>
            <input
              type="tel"
              required
              value={form.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
            />
          </div>

          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Completed Classes</label>
                  <div className="relative">
                    <input
                      type="number"
                      readOnly
                      disabled
                      value={customer?.classes_completed ?? 0}
                      className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-outline text-[14px] font-semibold cursor-not-allowed select-none border border-surface-variant opacity-80"
                    />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-outline">lock</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Package Classes</label>
                  <input
                    type="number"
                    min={customer?.classes_completed ?? 1}
                    value={form.package_classes}
                    onChange={e => set('package_classes', e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Total Fee (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.total_fee}
                  onChange={e => set('total_fee', e.target.value)}
                  placeholder="5000"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Package Classes</label>
                <input
                  type="number"
                  min="1"
                  value={form.package_classes}
                  onChange={e => set('package_classes', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Total Fee (₹) *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.total_fee}
                  onChange={e => set('total_fee', e.target.value)}
                  placeholder="5000"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">Enrollment Date</label>
            <input
              type="date"
              value={form.enrollment_date}
              onChange={e => set('enrollment_date', e.target.value)}
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] text-on-surface-variant block mb-1 uppercase tracking-wider">
              Location (Pickup / Drop)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">location_on</span>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="Eg. Sector 15, Noida"
                className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface-container-low text-on-surface text-[14px] focus:outline-none focus:bg-white transition-all placeholder:text-outline"
              />
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
            ) : isEditing ? (
              <><span className="material-symbols-outlined text-[18px]">check</span>Save Changes</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">person_add</span>Enroll Customer</>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )
}

