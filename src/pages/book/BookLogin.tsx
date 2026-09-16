import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { normalizePhoneNumber } from '../../lib/phoneUtils'

function toE164(phone: string): string {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

export default function BookLogin() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = (location.state as { from?: string } | null)?.from ?? '/book/my-bookings'

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(phone) })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: 'sms',
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ phone_number: toE164(phone), full_name: fullName || null })
        .eq('id', data.user.id)
    }
    setLoading(false)
    navigate(returnTo, { replace: true })
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 min-h-[70vh] px-1">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <span className="material-symbols-outlined text-on-primary text-[28px]">directions_car</span>
          </div>
          <h1 className="text-headline-md font-semibold text-on-surface tracking-tight">
            {step === 'phone' ? 'Sign in to book a class' : 'Verify your number'}
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1 text-center">
            {step === 'phone'
              ? "We'll text you a one-time code, no password needed"
              : `Enter the code sent to ${phone}`}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div>
                <label className="text-caption-xs text-on-surface-variant block mb-1 uppercase tracking-wider font-semibold">
                  Your name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Full name"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline border border-outline-variant/30"
                />
              </div>
              <div>
                <label className="text-caption-xs text-on-surface-variant block mb-1 uppercase tracking-wider font-semibold">
                  Phone number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline border border-outline-variant/30"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-semibold text-body-base flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Sending code...' : 'Send code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <label className="text-caption-xs text-on-surface-variant block mb-1 uppercase tracking-wider font-semibold">
                  6-digit code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  placeholder="123456"
                  className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-base tracking-[0.3em] text-center focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline border border-outline-variant/30"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-error-container text-on-error-container px-3 py-2 rounded-xl text-body-sm">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-semibold text-body-base flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? 'Verifying...' : 'Verify & continue'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-body-sm text-on-surface-variant text-center"
              >
                Change number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
