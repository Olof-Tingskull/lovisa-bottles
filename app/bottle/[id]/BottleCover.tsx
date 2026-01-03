'use client'

import { useState } from 'react'

export default function BottleCover({
  bottleName,
  isLoading,
  children,
}: {
  bottleName?: string
  isLoading: boolean
  children: React.ReactNode
}) {
  const [showBottle, setShowBottle] = useState(false)

  // If user clicked SHOW but content is still loading, show loading screen
  if (showBottle && isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 font-mono">loading...</p>
      </div>
    )
  }

  // If content is loaded and user clicked SHOW, reveal the bottle
  if (showBottle) {
    return <>{children}</>
  }

  // Show the cover with bottle name and SHOW button (acts as loading screen while fetching)
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 sm:space-y-8 max-w-md">
        <div className="text-5xl sm:text-6xl mb-6 sm:mb-8">🍾</div>
        <h1 className="text-lg sm:text-xl text-[#ff006e] font-mono tracking-wider">{bottleName ?? "..."}</h1>
        <p className="text-white/40 font-mono text-xs sm:text-sm">
          your message is ready
        </p>
        <button
          onClick={() => setShowBottle(true)}
          className="mt-8 px-8 py-3 text-sm sm:text-base text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
        >
          SHOW
        </button>
      </div>
    </div>
  )
}
