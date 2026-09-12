import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Lead, LeadStatus } from '../lib/supabase'
import { toLocalDateString } from '../lib/dateUtils'
import { invalidateCustomerCache } from '../lib/customerCache'

interface Props {
  lead: Lead
  onClose: () => void
  onUpdated: (msg: string) => void
}

const PRESET_SOURCES = [
  'Instagram Ad',
  'Referral',
  'Walk-in',
  'Google Maps',
  'Website Form',
  'Phone Enquiry',
  'Other',
]

export default function LeadDetailModal({ lead, onClose, onUpdated }: Props) {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState(lead.full_name)
  const [phone, setPhone] = useState(lead.phone_number)
  const isKnownPreset = PRESET_SOURCES.slice(0, -1).includes(lead.source ?? '')
  const [source, setSource] = useState(
    lead.source ? (isKnownPreset ? lead.source : 'Other') : 'Instagram Ad'
  )
  const [customSource, setCustomSource] = useState(!isKnownPreset && lead.source ? lead.source : '')
  const [location, setLocation] = useState(lead.location ?? '')
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.notes ?? '')

  // Optional conversion package override
  const [showOverride, setShowOverride] = useState(false)
  const [packageClasses, setPackageClasses] = useState('10')
  const [totalFee, setTotalFee] = useState('3500')

  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [warning, setWarning] = useState('')

  const isConverted = status === 'converted' || Boolean(lead.converted_customer_id)
  const cleanPhoneForCall = phone.replace(/[^\d+]/g, '')

  async function handleSaveChanges() {
    setError('')
    setWarning('')

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

    const finalSource = source === 'Other' ? (customSource.trim() || null) : source

    setSaving(true)
    try {
      const { error: updateErr } = await supabase
        .from('leads')
        .update({
          full_name: trimmedName,
          phone_number: trimmedPhone,
          source: finalSource,
          location: location.trim() || null,
          status,
          notes: notes.trim() || null,
        })
        .eq('id', lead.id)

      if (updateErr) {
        setError(updateErr.message || 'Failed to update lead details.')
        setSaving(false)
        return
      }

      onUpdated('Lead details updated successfully!')
      onClose()
    } catch {
      setError('Network error occurred. Please try again.')
      setSaving(false)
    }
  }

  async function handleConvertToCustomer() {
    setError('')
    setWarning('')

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

    setConverting(true)
    try {
      // Step a: Check customers.phone_number for an existing match
      const digits = trimmedPhone.replace(/\D/g, '')
      const last10 = digits.length >= 10 ? digits.slice(-10) : digits

      const { data: existing, error: checkErr } = await supabase
        .from('customers')
        .select('id, full_name, phone_number')
        .or(`phone_number.eq.${trimmedPhone},phone_number.ilike.%${last10}%`)

      if (checkErr) {
        setError('Error checking existing customers: ' + checkErr.message)
        setConverting(false)
        return
      }

      if (existing && existing.length > 0) {
        const match = existing[0]
        setWarning(
          `Customer already exists with this phone number: ${match.full_name} (${match.phone_number}). Please update phone or check Customers tab.`
        )
        setConverting(false)
        return
      }

      // Step b: Insert into customers
      const pkgClasses = parseInt(packageClasses, 10) || 10
      const fee = parseFloat(totalFee) || 3500
      const today = toLocalDateString(new Date())

      const { data: newCustomer, error: insertErr } = await supabase
        .from('customers')
        .insert({
          full_name: trimmedName,
          phone_number: trimmedPhone,
          location: location.trim() || null,
          enrollment_date: today,
          package_classes: pkgClasses,
          total_fee: fee,
          course_status: 'active',
        })
        .select('id')
        .single()

      if (insertErr || !newCustomer) {
        setError(insertErr?.message || 'Failed to enroll new customer.')
        setConverting(false)
        return
      }

      // Step c: Update the leads row
      const { error: leadUpdateErr } = await supabase
        .from('leads')
        .update({
          full_name: trimmedName,
          phone_number: trimmedPhone,
          source: source === 'Other' ? (customSource.trim() || null) : source,
          location: location.trim() || null,
          notes: notes.trim() || null,
          converted_customer_id: newCustomer.id,
          status: 'converted',
        })
        .eq('id', lead.id)

      if (leadUpdateErr) {
        console.error('Lead update error after customer insert:', leadUpdateErr)
      }

      invalidateCustomerCache()
      onUpdated(`Lead converted to enrolled customer!`)
      onClose()

      // Step d: Navigate to the new customer's detail page in Customers
      navigate(`/customers/${newCustomer.id}`)
    } catch {
      setError('An unexpected error occurred during conversion.')
      setConverting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end justify-center transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl p-5 pt-3 pb-8 shadow-drawer max-h-[88vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div
          className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-[18px] font-bold text-slate-900 leading-tight">
              Lead Details &amp; Edit
            </h2>
            <p className="text-[12px] text-slate-500">Update inquiry status or enroll student</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] flex-shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {warning && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] flex-shrink-0 text-amber-600 mt-0.5">
              warning
            </span>
            <span>{warning}</span>
          </div>
        )}

        {/* Form Elements */}
        <div className="mt-4 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Phone Number with Call action */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Phone Number
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-[14px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              {cleanPhoneForCall && (
                <a
                  href={`tel:${cleanPhoneForCall}`}
                  className="w-11 h-11 rounded-xl bg-brand-50/50 border border-brand-100 text-brand-600 flex items-center justify-center flex-shrink-0 hover:bg-brand-50 transition-colors"
                  title="Call directly"
                >
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </a>
              )}
            </div>
          </div>

          {/* Source & Status Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Source
              </label>
              <select
                value={source}
                onChange={e => setSource(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                {PRESET_SOURCES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as LeadStatus)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="booked">Booked</option>
                <option value="converted">Converted</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </div>

          {source === 'Other' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Specify Source
              </label>
              <input
                type="text"
                value={customSource}
                onChange={e => setCustomSource(e.target.value)}
                placeholder="e.g. Newspaper, Banner..."
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

          {/* Instructor Notes */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Instructor Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[13px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white resize-none"
              placeholder="Add follow-up notes, trial feedback, or vehicle preference..."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            {/* Convert to Customer Button or Converted Notice */}
            {!isConverted ? (
              <div className="space-y-2">
                {/* Optional package toggle */}
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setShowOverride(!showOverride)}
                    className="text-[12px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <span>{showOverride ? 'Hide course defaults' : 'Customize course package (defaults: 10 classes / ₹3,500)'}</span>
                    <span className="material-symbols-outlined text-[16px]">
                      {showOverride ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>

                {showOverride && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Package Classes
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={packageClasses}
                        onChange={e => setPackageClasses(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Total Fee (₹)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={totalFee}
                        onChange={e => setTotalFee(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-slate-900"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={converting}
                  onClick={handleConvertToCustomer}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-900/90 disabled:opacity-50 text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {converting ? 'hourglass_top' : 'how_to_reg'}
                  </span>
                  <span>{converting ? 'Converting to Customer...' : 'Convert to Customer'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <p className="text-[13px] font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
                  <span>Already Converted to Customer</span>
                </p>
                <p className="text-[11px] text-emerald-600">
                  Enrolled student record is active in Customers tab
                </p>
                {lead.converted_customer_id && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      navigate(`/customers/${lead.converted_customer_id}`)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-600/90 text-white text-[12px] font-semibold shadow-sm transition-colors"
                  >
                    <span>View Customer Profile</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
              </div>
            )}

            {/* Save Changes & Cancel */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveChanges}
                className="py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-[13px] transition-colors flex items-center justify-center gap-1"
              >
                {saving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[13px] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
