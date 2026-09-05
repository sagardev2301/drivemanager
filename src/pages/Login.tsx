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
    <div className="min-h-screen bg-[#f9f9ff] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#003fb1] flex items-center justify-center mb-3 shadow-lg">
            <span className="material-symbols-outlined text-white text-[28px]">directions_car</span>
          </div>
          <h1 className="text-[20px] font-semibold text-[#141b2b] tracking-tight">DriveManager</h1>
          <p className="text-[13px] text-[#434654] mt-1">Driving School Operations</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-[16px] font-semibold text-[#141b2b] mb-1">Sign in</h2>
          <p className="text-[13px] text-[#434654] mb-6">Enter your instructor credentials</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@drivingschool.com"
                className="w-full h-11 px-3 rounded-lg bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#003fb1]/20 transition-all placeholder:text-[#737686]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#434654] block mb-1 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3 rounded-lg bg-[#f1f3ff] text-[#141b2b] text-[14px] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#003fb1]/20 transition-all placeholder:text-[#737686]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-[#ffdad6] text-[#93000a] px-3 py-2 rounded-lg text-[13px]">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#003fb1] text-white rounded-xl font-semibold text-[14px] flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
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

        <p className="text-center text-[11px] text-[#737686] mt-6">
          Contact your administrator to get access
        </p>
      </div>
    </div>
  )
}

