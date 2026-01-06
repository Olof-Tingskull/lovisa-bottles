'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/trpc/client'

export default function LoginPage() {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login, user } = useAuth()

  // ✅ tRPC mutations for auth
  const loginMutation = api.auth.login.useMutation({
    onSuccess: () => {
      router.push('/')
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  const signupMutation = api.auth.setup.useMutation({
    onSuccess: () => {
      router.push('/')
    },
    onError: (error) => {
      setError(error.message)
    },
  })

  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isSignup) {
        // ✅ Use tRPC mutation for signup
        await signupMutation.mutateAsync({ email, password })
      } else {
        // Keep existing login method from auth context
        await login(email, password)
        router.push('/')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  const loading = loginMutation.isPending || signupMutation.isPending

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="max-w-sm w-full space-y-8">
        <div>
          <h2 className="text-xl text-center text-[#ff006e] font-mono tracking-wider">
            {isSignup ? '> CREATE_ACCOUNT' : '> LOGIN'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-[#ff006e] text-sm font-mono text-center border border-[#ff006e] px-4 py-2">
              ERROR: {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-white/60 font-mono mb-2">
                email:
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono"
                placeholder="user@domain.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-white/60 font-mono mb-2">
                password:
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono"
                placeholder="********"
                minLength={8}
              />
              {isSignup && <p className="mt-1 text-xs text-white/40 font-mono">min 8 chars</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition disabled:opacity-50 font-mono"
          >
            {loading ? 'LOADING...' : isSignup ? 'CREATE' : 'ENTER'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup)
                setError('')
              }}
              className="text-sm text-white/50 hover:text-[#ff006e] font-mono transition"
            >
              {isSignup ? '< back to login' : '> create account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
