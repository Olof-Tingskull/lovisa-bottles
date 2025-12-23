'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function OpeningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const bottleId = searchParams.get('bottle')
  const message = searchParams.get('message')
  const [dots, setDots] = useState('')

  useEffect(() => {
    // Animate dots
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`))
    }, 500)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // If we have a bottle, redirect to it after 2 seconds
    if (bottleId) {
      const timer = setTimeout(() => {
        router.push(`/bottle/${bottleId}`)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [bottleId, router])

  if (bottleId) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-6">
          <div className="text-6xl mb-8 animate-pulse">🍾</div>
          <p className="text-[#ff006e] font-mono text-lg">opening bottle{dots}</p>
          <p className="text-white/40 font-mono text-sm">preparing your message</p>
        </div>
      </div>
    )
  }

  // No bottle found - show message
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-4">
      <div className="border border-white/20 p-8 max-w-md text-center space-y-4">
        <p className="text-white/70 font-mono text-base">{message || 'no bottles available'}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-2 text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
        >
          BACK
        </button>
      </div>
    </div>
  )
}
