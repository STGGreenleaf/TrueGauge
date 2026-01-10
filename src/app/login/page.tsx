'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, Loader2 } from 'lucide-react'

type AuthMode = 'signin' | 'signup' | 'magic'

export default function LoginPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Check your email for the magic link!' })
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        setMessage({ type: 'success', text: 'Check your email to confirm your account!' })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        window.location.href = '/'
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
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

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-xs text-zinc-500 uppercase">or</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
              </div>

              {mode !== 'magic' && (
                <div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                  </div>
                </div>
              )}

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'magic' ? 'Send Magic Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
              </button>
            </form>

            {/* Mode Toggles */}
            <div className="flex flex-col items-center gap-2 text-sm">
              {mode === 'signin' && (
                <>
                  <button
                    onClick={() => setMode('magic')}
                    className="text-zinc-400 hover:text-cyan-400 transition-colors"
                  >
                    Sign in with magic link instead
                  </button>
                  <button
                    onClick={() => setMode('signup')}
                    className="text-zinc-400 hover:text-cyan-400 transition-colors"
                  >
                    Don&apos;t have an account? <span className="text-cyan-400">Sign up</span>
                  </button>
                </>
              )}
              {mode === 'signup' && (
                <button
                  onClick={() => setMode('signin')}
                  className="text-zinc-400 hover:text-cyan-400 transition-colors"
                >
                  Already have an account? <span className="text-cyan-400">Sign in</span>
                </button>
              )}
              {mode === 'magic' && (
                <button
                  onClick={() => setMode('signin')}
                  className="text-zinc-400 hover:text-cyan-400 transition-colors"
                >
                  Sign in with password instead
                </button>
              )}
            </div>
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
