import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Driver, CoursePackage, DriverAvailability } from '../lib/supabase'
import Toast from '../components/Toast'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function DriverProfile({ session }: { session: Session | null }) {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [packages, setPackages] = useState<CoursePackage[]>([])
  const [availability, setAvailability] = useState<DriverAvailability[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Profile form fields
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [years, setYears] = useState('')
  const [specialties, setSpecialties] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [saving, setSaving] = useState(false)

  // New package form
  const [pkgName, setPkgName] = useState('')
  const [pkgCount, setPkgCount] = useState('')
  const [pkgDuration, setPkgDuration] = useState('60')
  const [pkgPrice, setPkgPrice] = useState('')
  const [pkgDesc, setPkgDesc] = useState('')

  // New availability form
  const [availDay, setAvailDay] = useState('1')
  const [availStart, setAvailStart] = useState('09:00')
  const [availEnd, setAvailEnd] = useState('17:00')

  function showToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(prev => (prev === msg ? null : prev)), 2500)
  }

  async function load() {
    if (!session) return
    const { data: driverRow } = await supabase.from('drivers').select('*').eq('auth_user_id', session.user.id).maybeSingle()
    if (driverRow) {
      const d = driverRow as Driver
      setDriver(d)
      setFullName(d.full_name)
      setBio(d.bio ?? '')
      setYears(d.years_experience?.toString() ?? '')
      setSpecialties(d.specialties.join(', '))
      setPhotoUrl(d.photo_url ?? '')

      const [pkgRes, availRes] = await Promise.all([
        supabase.from('course_packages').select('*').eq('driver_id', d.id).order('price'),
        supabase.from('driver_availability').select('*').eq('driver_id', d.id).order('day_of_week'),
      ])
      setPackages((pkgRes.data as CoursePackage[] | null) ?? [])
      setAvailability((availRes.data as DriverAvailability[] | null) ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    const specialtiesArr = specialties.split(',').map(s => s.trim()).filter(Boolean)
    const payload = {
      full_name: fullName,
      bio: bio || null,
      years_experience: years ? parseInt(years, 10) : null,
      specialties: specialtiesArr,
      photo_url: photoUrl || null,
      auth_user_id: session.user.id,
    }

    if (driver) {
      const { error } = await supabase.from('drivers').update(payload).eq('id', driver.id)
      setSaving(false)
      if (error) return showToast(`Could not save: ${error.message}`)
      showToast('Profile updated')
    } else {
      const { error } = await supabase.from('drivers').insert(payload)
      setSaving(false)
      if (error) return showToast(`Could not create profile: ${error.message}`)
      showToast('Driver profile created')
    }
    load()
  }

  async function handleAddPackage(e: React.FormEvent) {
    e.preventDefault()
    if (!driver) return
    const { error } = await supabase.from('course_packages').insert({
      driver_id: driver.id,
      name: pkgName,
      class_count: parseInt(pkgCount, 10),
      class_duration_minutes: parseInt(pkgDuration, 10) || 60,
      price: parseFloat(pkgPrice),
      description: pkgDesc || null,
    })
    if (error) return showToast(`Could not add package: ${error.message}`)
    setPkgName('')
    setPkgCount('')
    setPkgDuration('60')
    setPkgPrice('')
    setPkgDesc('')
    showToast('Package added')
    load()
  }

  async function handleTogglePackage(pkg: CoursePackage) {
    await supabase.from('course_packages').update({ is_active: !pkg.is_active }).eq('id', pkg.id)
    load()
  }

  async function handleAddAvailability(e: React.FormEvent) {
    e.preventDefault()
    if (!driver) return
    const { error } = await supabase.from('driver_availability').insert({
      driver_id: driver.id,
      day_of_week: parseInt(availDay, 10),
      start_time: availStart,
      end_time: availEnd,
    })
    if (error) return showToast(`Could not add slot: ${error.message}`)
    showToast('Availability added')
    load()
  }

  async function handleRemoveAvailability(id: string) {
    await supabase.from('driver_availability').delete().eq('id', id)
    load()
  }

  if (loading) {
    return <div className="pt-6 space-y-3"><div className="h-40 bg-surface-container-low rounded-xl animate-pulse" /></div>
  }

  return (
    <div className="flex flex-col space-y-4 pb-12">
      <Toast message={toastMessage} />

      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h2 className="text-[15px] font-semibold text-on-surface mb-3">
          {driver ? 'Your driver profile' : 'Create your driver profile'}
        </h2>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
          <input
            required
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
          />
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Short bio"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30 resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              value={years}
              onChange={e => setYears(e.target.value)}
              placeholder="Years experience"
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
            />
            <input
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="Photo URL"
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
            />
          </div>
          <input
            value={specialties}
            onChange={e => setSpecialties(e.target.value)}
            placeholder="Specialties, comma separated"
            className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
          />
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-xl bg-primary text-on-primary text-[13px] font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : driver ? 'Save changes' : 'Create profile'}
          </button>
        </form>
      </div>

      {driver && (
        <>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-[15px] font-semibold text-on-surface mb-3">Course packages</h2>
            <div className="space-y-2 mb-3">
              {packages.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-on-surface truncate">{p.name}</p>
                    <p className="text-[11px] text-on-surface-variant">{p.class_count} classes · ₹{p.price}</p>
                  </div>
                  <button
                    onClick={() => handleTogglePackage(p)}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              ))}
              {packages.length === 0 && <p className="text-[12px] text-on-surface-variant">No packages yet.</p>}
            </div>
            <form onSubmit={handleAddPackage} className="grid grid-cols-2 gap-2">
              <input
                required
                value={pkgName}
                onChange={e => setPkgName(e.target.value)}
                placeholder="Package name"
                className="col-span-2 h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <input
                required
                type="number"
                min="1"
                value={pkgCount}
                onChange={e => setPkgCount(e.target.value)}
                placeholder="Classes"
                className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <input
                type="number"
                min="1"
                value={pkgDuration}
                onChange={e => setPkgDuration(e.target.value)}
                placeholder="Minutes each"
                className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <input
                required
                type="number"
                min="0"
                value={pkgPrice}
                onChange={e => setPkgPrice(e.target.value)}
                placeholder="Price ₹"
                className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <input
                value={pkgDesc}
                onChange={e => setPkgDesc(e.target.value)}
                placeholder="Description (optional)"
                className="h-10 px-3 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <button
                type="submit"
                className="col-span-2 h-10 rounded-xl bg-primary text-on-primary text-[13px] font-semibold"
              >
                Add package
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="text-[15px] font-semibold text-on-surface mb-3">Weekly availability</h2>
            <div className="space-y-2 mb-3">
              {availability.map(a => (
                <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-container-low">
                  <span className="text-[13px] text-on-surface">
                    {WEEKDAY_LABELS[a.day_of_week]} · {a.start_time}–{a.end_time}
                  </span>
                  <button
                    onClick={() => handleRemoveAvailability(a.id)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    aria-label="Remove slot"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              ))}
              {availability.length === 0 && <p className="text-[12px] text-on-surface-variant">No recurring availability set.</p>}
            </div>
            <form onSubmit={handleAddAvailability} className="grid grid-cols-3 gap-2">
              <select
                value={availDay}
                onChange={e => setAvailDay(e.target.value)}
                className="h-10 px-2 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              >
                {WEEKDAY_LABELS.map((label, idx) => (
                  <option key={label} value={idx}>{label}</option>
                ))}
              </select>
              <input
                type="time"
                value={availStart}
                onChange={e => setAvailStart(e.target.value)}
                className="h-10 px-2 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <input
                type="time"
                value={availEnd}
                onChange={e => setAvailEnd(e.target.value)}
                className="h-10 px-2 rounded-xl bg-surface-container-low text-on-surface text-[13px] border border-outline-variant/30"
              />
              <button
                type="submit"
                className="col-span-3 h-10 rounded-xl bg-primary text-on-primary text-[13px] font-semibold"
              >
                Add slot
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
