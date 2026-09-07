import { useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { isDemoMode, setDemoMode } from '../lib/demoStore'

const MOCK_DEMO_SESSION: Session = {
  access_token: 'demo-access-token',
  refresh_token: 'demo-refresh-token',
  expires_in: 999999999,
  token_type: 'bearer',
  user: {
    id: 'demo-user-id',
    app_metadata: { provider: 'demo' },
    user_metadata: { full_name: 'Demo Instructor' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'demo@sagarkumar.tech',
  } as any,
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => {
    return isDemoMode() ? MOCK_DEMO_SESSION : null
  })
  const [loading, setLoading] = useState(!isDemoMode())
  const [isDemo, setIsDemo] = useState(isDemoMode)

  useEffect(() => {
    function handleDemoChange() {
      const active = isDemoMode()
      setIsDemo(active)
      if (active) {
        setSession(MOCK_DEMO_SESSION)
        setLoading(false)
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          setSession(session)
          setLoading(false)
        })
      }
    }

    window.addEventListener('demo-mode-change', handleDemoChange)

    if (!isDemoMode()) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setLoading(false)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isDemoMode()) {
          setSession(session)
        }
      })

      return () => {
        subscription.unsubscribe()
        window.removeEventListener('demo-mode-change', handleDemoChange)
      }
    }

    return () => {
      window.removeEventListener('demo-mode-change', handleDemoChange)
    }
  }, [])

  const enterDemo = useCallback(() => {
    setDemoMode(true)
  }, [])

  const exitDemo = useCallback(() => {
    setDemoMode(false)
  }, [])

  return { session, loading, isDemo, enterDemo, exitDemo }
}
