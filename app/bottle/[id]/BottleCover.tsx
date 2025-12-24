'use client'

import { useState } from 'react'

export default function BottleCover({
  bottleName,
  children,
}: {
  bottleName: string
  children: React.ReactNode
}) {
  const [showBottle, setShowBottle] = useState(false)

  if (showBottle) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="text-center space-y-6 sm:space-y-8 max-w-md">
        <div className="text-5xl sm:text-6xl mb-6 sm:mb-8">🍾</div>
        <h1 className="text-lg sm:text-xl text-[#ff006e] font-mono tracking-wider">{bottleName}</h1>
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
