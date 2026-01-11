'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Github } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [splashPhase, setSplashPhase] = useState<'visible' | 'fading' | 'done'>('visible')

  // Splash timing: hold 1s, fade out 0.5s
  useEffect(() => {
    const holdTimer = setTimeout(() => setSplashPhase('fading'), 1000)
    const doneTimer = setTimeout(() => setSplashPhase('done'), 1500)
    return () => {
      clearTimeout(holdTimer)
      clearTimeout(doneTimer)
    }
  }, [])

  // Check if user is already logged in, redirect to dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/')
      }
    }
    checkAuth()
  }, [supabase, router])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleGitHubLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      {/* Splash overlay - matches PWA splash */}
      {splashPhase !== 'done' && (
        <div 
          className={`fixed inset-0 z-50 bg-black flex items-center justify-center transition-opacity duration-500 ${
            splashPhase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <Image
            src="/truegauge_icon.png"
            alt="TrueGauge"
            width={192}
            height={192}
            priority
          />
        </div>
      )}

      <div className="w-full max-w-md p-8">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          <h1 className="text-4xl uppercase tracking-[0.25em] text-zinc-400 mb-2">
            <span className="font-bold text-cyan-400" style={{ textShadow: '0 0 20px #22d3ee, 0 0 40px #22d3ee, 0 0 60px #22d3ee50' }}>TRUE</span>
            <span className="font-light">GAUGE</span>
          </h1>
          <p className="text-zinc-500 text-sm uppercase tracking-widest">
            Business Health Dashboard
          </p>
        </div>

        {/* Glass Card */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 backdrop-blur-md">
          {/* Shine line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Welcome</h2>
              <p className="text-zinc-400 text-sm">
                Sign in to access your dashboard
              </p>
            </div>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white hover:bg-zinc-100 text-black font-medium transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* GitHub OAuth */}
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors border border-zinc-700"
            >
              <Github className="w-5 h-5" />
              Continue with GitHub
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-8">
          Your data stays private. Each business gets its own secure space.
        </p>
      </div>
    </div>
  )
}
