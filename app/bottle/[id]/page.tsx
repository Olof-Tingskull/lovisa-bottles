'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { BottleBlock, BottleContent } from '@/lib/types'

export default function BottlePage() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const bottleId = params.id as string

  const [bottle, setBottle] = useState<{
    id: number
    name: string
    content: BottleContent
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchBottle = useCallback(async () => {
    try {
      const res = await fetch(`/api/bottles/${bottleId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to fetch bottle')
      }

      const data = await res.json()
      setBottle(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [bottleId, token])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && token) {
      fetchBottle()
    }
  }, [user, token, fetchBottle])

  const renderBlock = (block: BottleBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={index}>
            <p className="text-sm sm:text-base text-white/80 whitespace-pre-wrap leading-relaxed font-mono">
              {block.content}
            </p>
          </div>
        )

      case 'image':
        return (
          <div key={index} className="space-y-2 sm:space-y-3">
            <div className="relative w-full overflow-hidden border border-white/10">
              <img
                src={block.url}
                alt={block.caption || 'Image'}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23000000"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23ff006e" font-family="monospace"%3E[image unavailable]%3C/text%3E%3C/svg%3E'
                }}
              />
            </div>
            {block.caption && <p className="text-xs sm:text-sm text-white/40 font-mono">{block.caption}</p>}
          </div>
        )

      case 'video':
        return (
          <div key={index} className="space-y-2 sm:space-y-3">
            <video src={block.url} controls className="w-full border border-white/10" />
            {block.caption && <p className="text-xs sm:text-sm text-white/40 font-mono">{block.caption}</p>}
          </div>
        )

      case 'voice':
        return (
          <div key={index} className="space-y-2 sm:space-y-3">
            <audio src={block.url} controls className="w-full" />
            {block.duration && (
              <p className="text-xs sm:text-sm text-white/40 font-mono">
                [{Math.floor(block.duration / 60)}:
                {(block.duration % 60).toString().padStart(2, '0')}]
              </p>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 font-mono">loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-4">
        <p className="text-[#ff006e] font-mono text-center border border-[#ff006e] px-4 py-2">
          ERROR: {error}
        </p>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-white/60 hover:text-[#ff006e] font-mono transition"
        >
          {`< back`}
        </button>
      </div>
    )
  }

  if (!bottle) {
    return null
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Minimal Header */}
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-white/60 hover:text-[#ff006e] transition text-xs sm:text-sm font-mono whitespace-nowrap"
          >
            {`< back`}
          </button>
          <h1 className="text-sm sm:text-lg text-[#ff006e] font-mono tracking-wider truncate px-2 sm:px-4">{bottle.name}</h1>
          <div className="w-12 sm:w-16"></div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Minimal Content */}
        <div className="space-y-8 sm:space-y-12">
          {bottle.content.blocks.map((block, index) => renderBlock(block, index))}
        </div>
      </main>
    </div>
  )
}
