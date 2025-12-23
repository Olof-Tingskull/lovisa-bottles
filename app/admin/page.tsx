'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { BottleContent, BottleBlock } from '@/lib/types'

interface Bottle {
  id: number
  name: string
  content: BottleContent
  createdAt: string
  opens: {
    id: number
    openedAt: string
    user: {
      email: string
    }
  }[]
}

export default function AdminPage() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [loadingBottles, setLoadingBottles] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [bottleName, setBottleName] = useState('')
  const [blocks, setBlocks] = useState<BottleBlock[]>([{ type: 'text', content: '' }])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && token) {
      fetchBottles()
    }
  }, [user, token])

  const fetchBottles = async () => {
    try {
      const res = await fetch('/api/admin/bottles', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        // Try to parse as JSON, but handle HTML errors
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          throw new Error(data.error || 'Failed to fetch bottles')
        } catch {
          console.error('API returned HTML:', text.substring(0, 200))
          throw new Error('API error - Please restart the dev server')
        }
      }

      const data = await res.json()
      setBottles(data.bottles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoadingBottles(false)
    }
  }

  const addBlock = (type: BottleBlock['type']) => {
    const newBlock: BottleBlock =
      type === 'text' ? { type: 'text', content: '' } :
      type === 'image' ? { type: 'image', url: '', caption: '' } :
      type === 'video' ? { type: 'video', url: '', caption: '' } :
      { type: 'voice', url: '', duration: 0 }

    setBlocks([...blocks, newBlock])
  }

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index))
  }

  const updateBlock = (index: number, field: string, value: any) => {
    const newBlocks = [...blocks];
    (newBlocks[index] as any)[field] = value
    setBlocks(newBlocks)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)

    try {
      // Filter out empty blocks
      const validBlocks = blocks.filter(block => {
        if (block.type === 'text') return block.content.trim() !== ''
        if (block.type === 'image' || block.type === 'video' || block.type === 'voice') {
          return block.url.trim() !== ''
        }
        return false
      })

      if (validBlocks.length === 0) {
        throw new Error('Please add at least one block with content')
      }

      const res = await fetch('/api/admin/bottles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: bottleName,
          content: { blocks: validBlocks },
        }),
      })

      if (!res.ok) {
        // Try to parse as JSON, but handle HTML errors
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          throw new Error(data.error || 'Failed to create bottle')
        } catch {
          console.error('API returned HTML:', text.substring(0, 200))
          throw new Error('API error - Please restart the dev server')
        }
      }

      const data = await res.json()

      setMessage('Bottle created successfully!')
      setBottleName('')
      setBlocks([{ type: 'text', content: '' }])
      fetchBottles()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || loadingBottles) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-purple-700 font-semibold">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <div className="text-6xl">🔒</div>
        <p className="text-2xl text-red-700 font-bold text-center">{error}</p>
        {error.includes('restart') && (
          <div className="bg-yellow-100 border-2 border-yellow-400 text-yellow-900 px-6 py-4 rounded-2xl max-w-md text-center">
            <p className="font-semibold mb-2">How to fix:</p>
            <p className="text-sm">1. Stop your dev server (Ctrl+C)</p>
            <p className="text-sm">2. Run: <code className="bg-yellow-200 px-2 py-1 rounded">npm run dev</code></p>
            <p className="text-sm">3. Refresh this page</p>
          </div>
        )}
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white rounded-2xl hover:from-purple-700 hover:via-pink-600 hover:to-red-600 font-bold shadow-lg transform transition hover:scale-105"
        >
          Go Back Home
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-lg border-b-2 border-purple-200">
        <div className="max-w-6xl mx-auto px-4 py-5 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Admin Panel
          </h1>
          <button
            onClick={() => router.push('/')}
            className="text-lg font-semibold text-blue-700 hover:text-pink-600 transition"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Create Bottle Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border-2 border-pink-200">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🍾</div>
            <h2 className="text-2xl font-bold text-purple-900">Create New Bottle</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-base font-semibold text-purple-900 mb-2">
                Bottle Name
              </label>
              <input
                type="text"
                required
                value={bottleName}
                onChange={(e) => setBottleName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-purple-900 placeholder-purple-400"
                placeholder="e.g., Birthday Surprise 2024"
              />
            </div>

            {/* Content Blocks */}
            <div className="space-y-4">
              <label className="block text-base font-semibold text-purple-900">
                Content Blocks
              </label>

              {blocks.map((block, index) => (
                <div key={index} className="bg-purple-50 p-5 rounded-2xl border-2 border-purple-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-purple-900 uppercase">{block.type} Block</span>
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(index, 'content', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white text-purple-900 placeholder-purple-400"
                      placeholder="Enter your text content..."
                    />
                  )}

                  {(block.type === 'image' || block.type === 'video' || block.type === 'voice') && (
                    <>
                      <input
                        type="url"
                        value={block.url}
                        onChange={(e) => updateBlock(index, 'url', e.target.value)}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white text-purple-900 placeholder-purple-400"
                        placeholder="Enter URL..."
                      />
                      {(block.type === 'image' || block.type === 'video') && (
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => updateBlock(index, 'caption', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white text-purple-900 placeholder-purple-400"
                          placeholder="Caption (optional)..."
                        />
                      )}
                      {block.type === 'voice' && (
                        <input
                          type="number"
                          value={block.duration || 0}
                          onChange={(e) => updateBlock(index, 'duration', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-purple-300 rounded-xl bg-white text-purple-900 placeholder-purple-400"
                          placeholder="Duration in seconds (optional)..."
                        />
                      )}
                    </>
                  )}
                </div>
              ))}

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-semibold"
                >
                  + Text
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 font-semibold"
                >
                  + Image
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('video')}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                >
                  + Video
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('voice')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
                >
                  + Voice
                </button>
              </div>
            </div>

            {message && (
              <div
                className={`px-5 py-4 rounded-2xl font-semibold border-2 ${
                  message.includes('error') || message.includes('failed')
                    ? 'bg-red-100 border-red-400 text-red-800'
                    : 'bg-pink-100 border-pink-400 text-pink-800'
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 hover:from-purple-700 hover:via-pink-600 hover:to-red-600 text-white font-bold rounded-2xl shadow-lg disabled:opacity-50 transform transition hover:scale-105"
            >
              {submitting ? 'Creating...' : 'Create Bottle'}
            </button>
          </form>
        </div>

        {/* All Bottles List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border-2 border-blue-200">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📦</div>
            <h2 className="text-2xl font-bold text-purple-900">All Bottles</h2>
          </div>

          {bottles.length === 0 ? (
            <p className="text-purple-600 text-center font-medium text-lg">No bottles created yet.</p>
          ) : (
            <div className="space-y-4">
              {bottles.map((bottle) => (
                <div
                  key={bottle.id}
                  className="border-2 border-purple-200 rounded-2xl p-5 bg-white hover:bg-pink-50 transition-all"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-purple-900">{bottle.name}</h3>
                      <p className="text-sm text-purple-600 mt-1">
                        Created: {new Date(bottle.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/bottle/${bottle.id}`)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
                    >
                      View
                    </button>
                  </div>
                  <div className="text-sm text-purple-700">
                    <p className="font-semibold">Blocks: {bottle.content.blocks.length}</p>
                    <p className="font-semibold">Opened by: {bottle.opens.length} users</p>
                  </div>
                  {bottle.opens.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <p className="text-sm font-semibold text-purple-900 mb-2">Recent opens:</p>
                      <ul className="space-y-1">
                        {bottle.opens.slice(0, 3).map((open) => (
                          <li key={open.id} className="text-sm text-purple-700">
                            {open.user.email} - {new Date(open.openedAt).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
