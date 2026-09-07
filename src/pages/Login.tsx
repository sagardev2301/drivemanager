import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { setDemoMode } from '../lib/demoStore'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Direct access if demo credentials entered
    if (email.trim().toLowerCase().includes('demo')) {
      setDemoMode(true)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface flex flex-col items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-lg">
            <span className="material-symbols-outlined text-on-primary text-[28px]">directions_car</span>
          </div>
          <h1 className="text-headline-md font-semibold text-on-surface tracking-tight">DriveManager</h1>
          <p className="text-body-sm text-on-surface-variant mt-1">Driving School Operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6">
          <h2 className="text-headline-sm font-semibold text-on-surface mb-1">Sign in</h2>
          <p className="text-body-sm text-on-surface-variant mb-6">Enter your instructor credentials</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-caption-xs text-on-surface-variant block mb-1 uppercase tracking-wider font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@drivingschool.com"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface text-body-base focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-outline border border-outline-variant/30"
              />
            </div>
            <div>
              <label className="text-caption-xs text-on-surface-variant block mb-1 uppercase tracking-wider font-semibold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                  Signing in...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">login</span>
                  Sign In
                </>
              )}
            </button>

            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant/30" />
              </div>
              <div className="relative flex justify-center text-caption-xs uppercase">
                <span className="bg-surface-container-lowest px-2 text-on-surface-variant font-medium">Or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDemoMode(true)}
              className="w-full h-11 bg-surface-container-high hover:bg-surface-container text-primary rounded-xl font-semibold text-body-base flex items-center justify-center gap-2 border border-primary/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              Explore Demo Mode (Sandbox)
            </button>
          </form>
        </div>

        <p className="text-center text-caption-xs text-outline mt-6">
          Contact your administrator to get access
          Demo mode is a safe client-side sandbox with realistic mock data (max 20 records).
        </p>
      </div>
    </div>
  )
}
