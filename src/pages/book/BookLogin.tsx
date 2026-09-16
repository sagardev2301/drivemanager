import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { normalizePhoneNumber } from '../../lib/phoneUtils'
import { IconAlert, IconArrowLeft, IconCar } from '../../components/book/icons'

function toE164(phone: string): string {
  const digits = normalizePhoneNumber(phone).replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

const RESEND_SECONDS = 30

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
  const [resendIn, setResendIn] = useState(0)
  const otpRef = useRef<HTMLInputElement>(null)

  const phoneDigits = normalizePhoneNumber(phone).replace(/\D/g, '')
  const phoneLooksValid = phoneDigits.length === 10 || (phoneDigits.length === 12 && phoneDigits.startsWith('91'))

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn(s => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus()
  }, [step])

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault()
    setError('')
    setLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: toE164(phone) })
    setLoading(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    setStep('otp')
    setResendIn(RESEND_SECONDS)
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: 'sms',
    })
    if (verifyError) {
      setError('That code didn’t match. Check it and try again.')
      setLoading(false)
      return
    }
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ phone_number: toE164(phone), full_name: fullName.trim() || null })
        .eq('id', data.user.id)
    }
    setLoading(false)
    navigate(returnTo, { replace: true })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5">
      <div className="flex h-14 items-center" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <button
          onClick={() => (step === 'otp' ? setStep('phone') : navigate(-1))}
          aria-label="Go back"
          className="rd-ink2 -ml-2 grid h-11 w-11 place-items-center rounded-full transition-colors active:bg-[#e7ebf3]"
        >
          <IconArrowLeft size={20} />
        </button>
      </div>

      <div className="flex flex-1 flex-col pt-6">
        <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[var(--brand)] text-white">
          <IconCar size={24} />
        </span>

        <h1 className="rd-display mt-5 text-[30px] font-extrabold leading-[1.05]">
          {step === 'phone' ? 'Sign in to book' : 'Enter your code'}
        </h1>
        <p className="rd-ink2 mt-2 max-w-[32ch] text-[15px] leading-[23px]">
          {step === 'phone'
            ? 'We’ll text you a one-time code. No password to remember.'
            : `Sent to ${toE164(phone)}. It can take a few seconds to arrive.`}
        </p>

        {step === 'phone' ? (
          <form onSubmit={sendCode} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-[13px] font-semibold">
                Your name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className="rd-field"
              />
            </div>

            <div>
              <label htmlFor="phone" className="mb-2 block text-[13px] font-semibold">
                Mobile number
              </label>
              <div className="relative">
                <span className="rd-ink2 pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[16px] font-medium">
                  +91
                </span>
                <input
                  id="phone"
                  type="tel"
                  required
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="rd-field pl-[52px]"
                />
              </div>
            </div>

            {error && (
              <p className="rd-chip rd-chip-stop h-auto w-full justify-start gap-2 px-3 py-2 text-[13px] leading-[19px]">
                <IconAlert size={15} />
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || !phoneLooksValid} className="rd-btn mt-1 h-[52px] w-full text-[15px]">
              {loading ? 'Sending code…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-7 flex flex-col gap-4">
            <div>
              <label htmlFor="otp" className="mb-2 block text-[13px] font-semibold">
                6-digit code
              </label>
              <input
                id="otp"
                ref={otpRef}
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="······"
                className="rd-field rd-display text-center text-[26px] font-bold tracking-[0.4em]"
              />
            </div>

            {error && (
              <p className="rd-chip rd-chip-stop h-auto w-full justify-start gap-2 px-3 py-2 text-[13px] leading-[19px]">
                <IconAlert size={15} />
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || otp.length < 6} className="rd-btn mt-1 h-[52px] w-full text-[15px]">
              {loading ? 'Checking…' : 'Verify and continue'}
            </button>

            <button
              type="button"
              disabled={resendIn > 0 || loading}
              onClick={() => sendCode()}
              className="rd-ink2 h-10 text-[13px] font-semibold disabled:opacity-60"
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
          </form>
        )}
      </div>

      <p className="rd-ink3 py-6 text-center text-[12px] leading-[18px]">
        Booking a class never charges you here — you pay your instructor at the lesson.
      </p>
    </div>
  )
}
