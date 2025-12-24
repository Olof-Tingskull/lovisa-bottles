'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

function OpeningContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { token } = useAuth()
  const entry = searchParams.get('entry')
  const [dots, setDots] = useState('')
  const [bottleId, setBottleId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(!!entry)

  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`))
    }, 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Submit journal entry if we have one
    if (entry && token && submitting) {
      const submit = async () => {
        try {
          const res = await fetch('/api/journal/submit', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ entry }),
          })

          const data = await res.json()

          if (!res.ok) {
            throw new Error(data.error || 'Failed to submit journal')
          }

          if (data.bottleId) {
            setBottleId(data.bottleId.toString())
          } else {
            setError(data.message || 'no bottles available')
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
          setSubmitting(false)
        }
      }

      submit()
    }
  }, [entry, token, submitting])

  // Show opening animation while submitting or if we have a bottle
  if (submitting || bottleId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="text-5xl sm:text-6xl mb-6 sm:mb-8 animate-pulse">🍾</div>
          <p className="text-[#ff006e] font-mono text-base sm:text-lg">opening bottle{dots}</p>
          <p className="text-white/40 font-mono text-xs sm:text-sm">preparing your message</p>
        </div>
        {bottleId && (
          <button
            onClick={() => router.push(`/bottle/${bottleId}`)}
            className="mt-8 px-8 py-3 text-sm sm:text-base text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
          >
            SHOW
          </button>
        )}
      </div>
    )
  }

  // No bottle found - show error message
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 sm:gap-8 px-4">
      <div className="border border-white/20 p-6 sm:p-8 max-w-md w-full text-center space-y-3 sm:space-y-4">
        <p className="text-white/70 font-mono text-sm sm:text-base">{error || 'no bottles available'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 sm:mt-6 w-full sm:w-auto px-6 py-2 text-xs sm:text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
        >
          BACK
        </button>
      </div>
    </div>
  )
}

export default function OpeningPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
          <div className="text-center space-y-4 sm:space-y-6">
            <div className="text-5xl sm:text-6xl mb-6 sm:mb-8 animate-pulse">🍾</div>
            <p className="text-[#ff006e] font-mono text-base sm:text-lg">loading...</p>
          </div>
        </div>
      }
    >
      <OpeningContent />
    </Suspense>
  )
}
