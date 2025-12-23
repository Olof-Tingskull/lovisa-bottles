/* eslint-disable @typescript-eslint/no-explicit-any */
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 font-mono">loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 px-4">
        <p className="text-[#ff006e] font-mono text-center border border-[#ff006e] px-4 py-2">ERROR: {error}</p>
        {error.includes('restart') && (
          <div className="border border-white/20 text-white/60 px-6 py-4 max-w-md font-mono text-sm">
            <p className="mb-2">{`> fix:`}</p>
            <p>1. ctrl+c</p>
            <p>2. npm run dev</p>
            <p>3. refresh</p>
          </div>
        )}
        <button
          onClick={() => router.push('/')}
          className="text-sm text-white/60 hover:text-[#ff006e] font-mono transition"
        >
          {`< back`}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg text-[#ff006e] font-mono tracking-wider">
            ADMIN
          </h1>
          <button
            onClick={() => router.push('/')}
            className="text-white/60 hover:text-[#ff006e] transition text-sm font-mono"
          >
            {`< back`}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Create Bottle Form */}
        <div className="mb-12">
          <h2 className="text-base text-white/70 font-mono mb-8">{`> CREATE_BOTTLE`}</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-white/60 font-mono mb-2">
                name:
              </label>
              <input
                type="text"
                required
                value={bottleName}
                onChange={(e) => setBottleName(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono"
                placeholder="bottle name..."
              />
            </div>

            {/* Content Blocks */}
            <div className="space-y-4">
              <label className="block text-sm text-white/60 font-mono">
                blocks:
              </label>

              {blocks.map((block, index) => (
                <div key={index} className="border border-white/20 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/50 font-mono">[{block.type}]</span>
                    <button
                      type="button"
                      onClick={() => removeBlock(index)}
                      className="text-white/40 hover:text-[#ff006e] text-xs font-mono"
                    >
                      [x]
                    </button>
                  </div>

                  {block.type === 'text' && (
                    <textarea
                      value={block.content}
                      onChange={(e) => updateBlock(index, 'content', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-sm"
                      placeholder="text content..."
                    />
                  )}

                  {(block.type === 'image' || block.type === 'video' || block.type === 'voice') && (
                    <>
                      <input
                        type="url"
                        value={block.url}
                        onChange={(e) => updateBlock(index, 'url', e.target.value)}
                        className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-sm"
                        placeholder="url..."
                      />
                      {(block.type === 'image' || block.type === 'video') && (
                        <input
                          type="text"
                          value={block.caption || ''}
                          onChange={(e) => updateBlock(index, 'caption', e.target.value)}
                          className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-sm"
                          placeholder="caption (optional)..."
                        />
                      )}
                      {block.type === 'voice' && (
                        <input
                          type="number"
                          value={block.duration || 0}
                          onChange={(e) => updateBlock(index, 'duration', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-sm"
                          placeholder="duration (sec)..."
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
                  className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono"
                >
                  [+text]
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('image')}
                  className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono"
                >
                  [+image]
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('video')}
                  className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono"
                >
                  [+video]
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('voice')}
                  className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono"
                >
                  [+voice]
                </button>
              </div>
            </div>

            {message && (
              <div className="text-[#ff006e] text-sm font-mono border border-[#ff006e] px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition disabled:opacity-50 font-mono"
            >
              {submitting ? 'CREATING...' : 'CREATE'}
            </button>
          </form>
        </div>

        {/* All Bottles List */}
        <div>
          <h2 className="text-base text-white/70 font-mono mb-8">{`> ALL_BOTTLES`}</h2>

          {bottles.length === 0 ? (
            <p className="text-white/40 font-mono">no bottles found.</p>
          ) : (
            <div className="space-y-4">
              {bottles.map((bottle) => (
                <div
                  key={bottle.id}
                  className="border border-white/20 p-4"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-base text-white/80 font-mono">{bottle.name}</h3>
                      <p className="text-xs text-white/40 mt-1 font-mono">
                        {new Date(bottle.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/bottle/${bottle.id}`)}
                      className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono"
                    >
                      [view]
                    </button>
                  </div>
                  <div className="text-xs text-white/50 font-mono space-y-1">
                    <p>blocks: {bottle.content.blocks.length}</p>
                    <p>opens: {bottle.opens.length}</p>
                  </div>
                  {bottle.opens.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/50 mb-2 font-mono">recent:</p>
                      <ul className="space-y-1">
                        {bottle.opens.slice(0, 3).map((open) => (
                          <li key={open.id} className="text-xs text-white/40 font-mono">
                            {open.user.email} / {new Date(open.openedAt).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit'
                            })}
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
