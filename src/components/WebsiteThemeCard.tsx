import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

// Colour themes of the public marketing site (sagardrivingschool.vercel.app).
// Keep the keys in sync with the website's src/lib/themeConfig.ts and the
// site_settings check constraint (night | taxi | blue).
type ThemeKey = 'night' | 'taxi' | 'blue'

// Preview colours mirror the website: top bar, hero stage, instructor band.
const THEMES: { key: ThemeKey; name: string; note: string; nav: string; stage: string; band: string }[] = [
  { key: 'night', name: 'Night Drive', note: 'Navy and amber', nav: '#141A26', stage: '#1E2638', band: '#F59E0B' },
  { key: 'taxi', name: 'Taxi Yellow', note: 'Yellow and black', nav: '#16181D', stage: '#FFC629', band: '#16181D' },
  { key: 'blue', name: 'Brand Blue', note: 'Original blue', nav: '#1A56DB', stage: '#3B72E6', band: '#1A56DB' },
]

const SITE_URL = 'https://sagardrivingschool.vercel.app'

/**
 * Dashboard card that sets the website's colour theme. Stored in the
 * site_settings table (key 'theme'); the website reads it on every visit.
 */
export default function WebsiteThemeCard() {
  // null = loading, 'unavailable' = site_settings table not created yet
  const [current, setCurrent] = useState<ThemeKey | 'unavailable' | null>(null)
  const [saving, setSaving] = useState<ThemeKey | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let ignore = false
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'theme')
      .maybeSingle()
      .then(({ data, error }) => {
        if (ignore) return
        if (error) return setCurrent('unavailable')
        const v = data?.value
        setCurrent(v === 'taxi' || v === 'blue' || v === 'night' ? v : 'night')
      })
    return () => {
      ignore = true
    }
  }, [])

  async function choose(key: ThemeKey) {
    if (current === 'unavailable' || key === current || saving) return
    setSaving(key)
    setMessage('')
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'theme', value: key, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(null)
    if (error) {
      setMessage('Could not save. Check your connection and try again.')
      return
    }
    setCurrent(key)
    setMessage('Saved. Visitors see the new theme on their next visit.')
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            palette
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-on-surface">Website theme</p>
          <p className="text-[11px] text-on-surface-variant">
            {current === 'unavailable' ? 'Not set up yet: run the site_settings migration' : 'Colours of your public website'}
          </p>
        </div>
        <a
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold text-primary px-2 py-1.5 rounded-lg active:bg-surface-container-low"
        >
          View site
        </a>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3" role="radiogroup" aria-label="Website theme">
        {THEMES.map(t => {
          const active = current === t.key
          const disabled = current === null || current === 'unavailable'
          return (
            <button
              key={t.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => choose(t.key)}
              className={`relative rounded-xl border-2 p-2 text-left transition-colors active:scale-[0.97] disabled:opacity-50 ${
                active ? 'border-primary bg-primary/5' : 'border-outline-variant bg-white'
              }`}
            >
              {/* mini preview: top bar, stage and button colours */}
              <div className="h-14 rounded-lg overflow-hidden flex flex-col border border-outline-variant/50">
                <div className="h-2.5" style={{ background: t.nav }} />
                <div className="flex-1 flex justify-center pt-1" style={{ background: t.stage }}>
                  <div className="w-4 h-full rounded-t-[4px] bg-white" />
                </div>
                <div className="h-3" style={{ background: t.band }} />
              </div>
              <p className="mt-1.5 text-[12px] font-bold text-on-surface leading-tight">{t.name}</p>
              <p className="text-[10px] text-on-surface-variant leading-tight">{t.note}</p>
              {active && (
                <motion.span
                  layoutId="websiteThemeCheck"
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                >
                  <span className="material-symbols-outlined text-[14px]">check</span>
                </motion.span>
              )}
              {saving === t.key && (
                <span className="absolute inset-0 rounded-xl bg-white/60 flex items-center justify-center text-[11px] font-semibold text-primary">
                  Saving…
                </span>
              )}
            </button>
          )
        })}
      </div>

      {message && <p className="text-[11px] text-on-surface-variant mt-2" role="status">{message}</p>}
    </div>
  )
}
