'use client'

import { useRouter } from 'next/navigation'

export default function BottleNav({ bottleName }: { bottleName: string }) {
  const router = useRouter()

  return (
    <header className="border-b border-white/10">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <button
          onClick={() => router.push('/')}
          className="text-white/60 hover:text-[#ff006e] transition text-xs sm:text-sm font-mono whitespace-nowrap"
        >
          {`< back`}
        </button>
        <h1 className="text-sm sm:text-lg text-[#ff006e] font-mono tracking-wider truncate px-2 sm:px-4">
          {bottleName}
        </h1>
        <button
          onClick={() => router.push('/info')}
          className="text-white/60 hover:text-[#ff006e] transition text-xs sm:text-sm font-mono whitespace-nowrap"
        >
          help
        </button>
      </div>
    </header>
  )
}
