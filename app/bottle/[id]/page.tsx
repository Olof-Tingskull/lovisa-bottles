'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { BottleContent, BottleBlock } from '@/lib/types'

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

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && token) {
      fetchBottle()
    }
  }, [user, token, bottleId])

  const fetchBottle = async () => {
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
  }

  const renderBlock = (block: BottleBlock, index: number) => {
    switch (block.type) {
      case 'text':
        return (
          <div key={index} className="prose max-w-none">
            <p className="text-lg text-purple-900 whitespace-pre-wrap leading-relaxed">{block.content}</p>
          </div>
        )

      case 'image':
        return (
          <div key={index} className="space-y-3">
            <div className="relative w-full rounded-2xl overflow-hidden shadow-lg border-2 border-pink-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.url}
                alt={block.caption || 'Bottle image'}
                className="w-full h-auto object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f3e5f5"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%238e24aa" font-size="20"%3EImage not available%3C/text%3E%3C/svg%3E'
                }}
              />
            </div>
            {block.caption && (
              <p className="text-base text-purple-700 italic font-medium">{block.caption}</p>
            )}
          </div>
        )

      case 'video':
        return (
          <div key={index} className="space-y-3">
            <video
              src={block.url}
              controls
              className="w-full rounded-2xl shadow-lg border-2 border-pink-200"
            />
            {block.caption && (
              <p className="text-base text-purple-700 italic font-medium">{block.caption}</p>
            )}
          </div>
        )

      case 'voice':
        return (
          <div key={index} className="space-y-3 bg-purple-50 p-5 rounded-2xl border-2 border-purple-200">
            <audio
              src={block.url}
              controls
              className="w-full"
            />
            {block.duration && (
              <p className="text-base text-purple-800 font-semibold">
                Duration: {Math.floor(block.duration / 60)}:
                {(block.duration % 60).toString().padStart(2, '0')}
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-purple-700 font-semibold">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">😞</div>
        <p className="text-2xl text-red-700 font-bold text-center">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white rounded-2xl hover:from-purple-700 hover:via-pink-600 hover:to-red-600 font-bold shadow-lg transform transition hover:scale-105"
        >
          Go Back Home
        </button>
      </div>
    )
  }

  if (!bottle) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-lg border-b-2 border-purple-200">
        <div className="max-w-4xl mx-auto px-4 py-5 flex justify-between items-center">
          <button
            onClick={() => router.push('/')}
            className="text-lg font-semibold text-blue-700 hover:text-pink-600 transition flex items-center gap-2"
          >
            ← Back to Journal
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">{bottle.name}</h1>
          <div className="w-24"></div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-10 border-2 border-pink-200">
          {/* Bottle Header */}
          <div className="mb-10 text-center">
            <div className="text-7xl mb-4">🍾</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent mb-3">
              {bottle.name}
            </h2>
            <p className="text-xl text-purple-700 font-medium">A message just for you</p>
          </div>

          {/* Bottle Content */}
          <div className="space-y-8">
            {bottle.content.blocks.map((block, index) => renderBlock(block, index))}
          </div>
        </div>
      </main>
    </div>
  )
}
