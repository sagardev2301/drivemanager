import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { normalizePhoneNumber } from '../lib/phoneUtils'
import { useModalBackButton } from '../hooks/useModalBackButton'
import { backdropVariants, sheetVariants } from '../lib/motionPresets'

interface Props {
  onClose: () => void
  onSaved: (leadName: string) => void
}

const PRESET_SOURCES = [
  'Just Dial',
  'Referred',
  'Walk-in',
  'Phone Enquiry',
  'Other',
]

export default function AddLeadModal({ onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [source, setSource] = useState('Instagram Ad')
  const [customSource, setCustomSource] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { requestClose } = useModalBackButton(true, onClose)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const trimmedName = fullName.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      setError('Full name is required')
      return
    }
    if (!trimmedPhone) {
      setError('Phone number is required')
      return
    }

    // Format phone: if 10 digits without prefix, prepend +91
    const normalizedPhone = normalizePhoneNumber(trimmedPhone)
    const digits = normalizedPhone.replace(/\D/g, '')
    let formattedPhone = normalizedPhone
    if (digits.length === 10) {
      formattedPhone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    } else if (digits.length === 12 && digits.startsWith('91')) {
      formattedPhone = `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    }

    const finalSource = source === 'Other' ? (customSource.trim() || null) : source

    setSaving(true)
    try {
      const { error: insertErr } = await supabase.from('leads').insert({
        full_name: trimmedName,
        phone_number: formattedPhone,
        source: finalSource,
        location: location.trim() || null,
        status: 'new',
        notes: notes.trim() || null,
      })

      if (insertErr) {
        setError(insertErr.message || 'Failed to create lead. Please try again.')
        setSaving(false)
        return
      }

      onSaved(trimmedName)
      requestClose()
    } catch {
      setError('Network error occurred. Please try again.')
      setSaving(false)
    }
  }

  return createPortal(
    <motion.div
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
      onClick={requestClose}
    >
      <motion.div
        variants={sheetVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-lg bg-white rounded-t-3xl p-5 pt-3 pb-8 shadow-2xl max-h-[90vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 cursor-pointer"
          onClick={requestClose}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900 leading-tight">Add New Lead</h2>
            <p className="text-[12px] text-slate-500">Log fresh inquiry before scheduling trial</p>
          </div>
          <button
            onClick={requestClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Add Lead Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              placeholder="e.g. Vikram Malhotra"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Phone Number *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-slate-500">
                +91
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full pl-12 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
                placeholder="98765 43210"
              />
            </div>
          </div>

          {/* Source Dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Lead Source (Optional)
            </label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            >
              {PRESET_SOURCES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Custom Source if Other */}
          {source === 'Other' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Specify Source
              </label>
              <input
                type="text"
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
                placeholder="e.g. Pamphlet, Banner, Newspaper..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          )}

          {/* Location (Pickup / Drop) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Location (Pickup / Drop)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[18px] text-slate-400 pointer-events-none">
                location_on
              </span>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Eg. Sector 15, Noida"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[14px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
              placeholder="Preferred timing, vehicle manual/auto, pickup location..."
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 px-4 rounded-xl bg-on-surface hover:bg-on-surface/90 disabled:opacity-50 text-on-primary font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">
                {saving ? 'hourglass_top' : 'person_add'}
              </span>
              <span>{saving ? 'Saving Lead...' : 'Save Lead'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  )
}

