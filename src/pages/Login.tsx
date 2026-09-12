import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-surface text-slate-900 flex flex-col items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-3 shadow-lg">
            <span className="material-symbols-outlined text-white text-[28px]">directions_car</span>
          </div>
          <h1 className="text-headline-md font-semibold text-slate-900 tracking-tight">DriveManager</h1>
          <p className="text-body-sm text-slate-500 mt-1">Driving School Operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface rounded-xl shadow-sm p-6">
          <h2 className="text-headline-sm font-semibold text-slate-900 mb-1">Sign in</h2>
          <p className="text-body-sm text-slate-500 mb-6">Enter your instructor credentials</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-caption-xs text-slate-500 block mb-1 uppercase tracking-wider font-semibold">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@drivingschool.com"
                className="w-full h-11 px-3 rounded-xl bg-slate-50 text-slate-900 text-body-base focus:outline-none focus:bg-surface focus:ring-2 focus:ring-brand-600/20 transition-all placeholder:text-slate-300 border border-slate-200/30"
              />
            </div>
            <div>
              <label className="text-caption-xs text-slate-500 block mb-1 uppercase tracking-wider font-semibold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 rounded-xl bg-slate-50 text-slate-900 text-body-base focus:outline-none focus:bg-surface focus:ring-2 focus:ring-brand-600/20 transition-all placeholder:text-slate-300 border border-slate-200/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-600 text-white px-3 py-2 rounded-xl text-body-sm">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-body-base flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
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
          </form>
        </div>

        <p className="text-center text-caption-xs text-slate-300 mt-6">
          Contact your administrator to get access
        </p>
      </div>
    </div>
  )
}
