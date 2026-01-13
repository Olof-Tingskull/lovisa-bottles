'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import type { BottleBlock } from '@/lib/types'
import { api } from '@/lib/trpc/client'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const utils = api.useUtils()

  // ✅ Replace manual fetch with tRPC queries
  const { data: bottlesData, isLoading: loadingBottles, error: bottlesError } = api.bottles.listAll.useQuery(undefined, {
    enabled: !!user, // Only run when user is loaded
  })

  const { data: usersData, isLoading: loadingUsers } = api.users.list.useQuery(undefined, {
    enabled: !!user,
  })

  // Form state
  const [bottleName, setBottleName] = useState('')
  const [description, setDescription] = useState('')
  const [blocks, setBlocks] = useState<BottleBlock[]>([{ type: 'text', content: '' }])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState<number | null>(null)
  const [assignedViewerId, setAssignedViewerId] = useState<number | null>(null)

  // ✅ Replace manual fetch mutation with tRPC mutation
  const createBottle = api.bottles.create.useMutation({
    onSuccess: () => {
      setMessage('Bottle created successfully!')
      setBottleName('')
      setDescription('')
      setBlocks([{ type: 'text', content: '' }])
      setAssignedViewerId(null)
      // Refetch bottles list
      utils.bottles.listAll.invalidate()
    },
    onError: (error) => {
      setMessage(error.message)
    },
  })

  const bottles = (bottlesData?.bottles || []) as any[]
  const users = usersData?.users || []
  const error = bottlesError?.message || ''

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  const addBlock = (type: BottleBlock['type']) => {
    const newBlock: BottleBlock =
      type === 'text'
        ? { type: 'text', content: '' }
        : type === 'image'
          ? { type: 'image', url: '', caption: '' }
          : type === 'video'
            ? { type: 'video', url: '', caption: '' }
            : { type: 'voice', url: '', duration: 0 }

    setBlocks([...blocks, newBlock])
  }

  const removeBlock = (index: number) => {
    setBlocks(blocks.filter((_, i) => i !== index))
  }

  const updateBlock = (index: number, field: string, value: any) => {
    const newBlocks = [...blocks]
    ;(newBlocks[index] as any)[field] = value
    setBlocks(newBlocks)
  }

  const handleFileUpload = async (index: number, file: File) => {
    setUploading(index)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to upload file')
      }

      const data = await res.json()
      // Upload now returns { id, filename, size, contentType }
      // Store the image access URL
      updateBlock(index, 'url', `/api/images/${data.id}`)
      // Also store the image ID for access granting
      updateBlock(index, 'imageId', data.id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    try {
      // Filter out empty blocks
      const validBlocks = blocks.filter((block) => {
        if (block.type === 'text') return block.content.trim() !== ''
        if (block.type === 'image' || block.type === 'video' || block.type === 'voice') {
          return block.url.trim() !== ''
        }
        return false
      })

      if (validBlocks.length === 0) {
        throw new Error('Please add at least one block with content')
      }

      if (!assignedViewerId) {
        throw new Error('Please select an assigned viewer')
      }

      // ✅ Use tRPC mutation instead of fetch
      await createBottle.mutateAsync({
        name: bottleName,
        content: { blocks: validBlocks },
        description: description.trim() || undefined,
        assignedViewerId,
      })

      // Grant access to uploaded images for the assigned viewer
      const imageBlocks = validBlocks.filter(
        (block) => block.type === 'image' && (block as any).imageId
      )

      for (const block of imageBlocks) {
        const imageId = (block as any).imageId
        try {
          await fetch(`/api/images/${imageId}/grant-access`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ userId: assignedViewerId }),
          })
        } catch (err) {
          console.error(`Failed to grant access for image ${imageId}:`, err)
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  if (isLoading || loadingBottles || loadingUsers) {
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-base sm:text-lg text-[#ff006e] font-mono tracking-wider">ADMIN</h1>
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.push('/info')}
              className="text-white/60 hover:text-[#ff006e] transition text-xs sm:text-sm font-mono whitespace-nowrap"
            >
              help
            </button>
            <button
              onClick={() => router.push('/')}
              className="text-white/60 hover:text-[#ff006e] transition text-xs sm:text-sm font-mono whitespace-nowrap"
            >
              {`< back`}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Create Bottle Form */}
        <div className="mb-8 sm:mb-12">
          <h2 className="text-sm sm:text-base text-white/70 font-mono mb-4 sm:mb-8">{`> CREATE_BOTTLE`}</h2>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-xs sm:text-sm text-white/60 font-mono mb-2">name:</label>
              <input
                type="text"
                required
                value={bottleName}
                onChange={(e) => setBottleName(e.target.value)}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                placeholder="bottle name..."
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-white/60 font-mono mb-2">
                description (optional):
              </label>
              <p className="text-xs text-white/40 font-mono mb-2">
                context for AI mood generation (not shown to user)
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                placeholder="additional context to guide the mood generation..."
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm text-white/60 font-mono mb-2">assigned viewer:</label>
              <select
                required
                value={assignedViewerId || ''}
                onChange={(e) => setAssignedViewerId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
              >
                <option value="" disabled>select user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} {u.isAdmin ? '(admin)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Content Blocks */}
            <div className="space-y-3 sm:space-y-4">
              <label className="block text-xs sm:text-sm text-white/60 font-mono">blocks:</label>

              {blocks.map((block, index) => (
                <div key={index} className="border border-white/20 p-3 sm:p-4 space-y-2 sm:space-y-3">
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
                      value={block.content || ''}
                      onChange={(e) => updateBlock(index, 'content', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                      placeholder="text content..."
                    />
                  )}

                  {(block.type === 'image' || block.type === 'video' || block.type === 'voice') && (
                    <>
                      {block.type === 'image' && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleFileUpload(index, file)
                              }}
                              className="hidden"
                              id={`file-upload-${index}`}
                            />
                            <label
                              htmlFor={`file-upload-${index}`}
                              className="flex-1 px-3 py-2 border border-white/20 bg-black hover:border-[#ff006e] text-white/60 hover:text-[#ff006e] font-mono text-base cursor-pointer transition text-center"
                            >
                              {uploading === index ? 'uploading...' : '[upload image]'}
                            </label>
                          </div>
                          <input
                            value={block.url || ''}
                            onChange={(e) => updateBlock(index, 'url', e.target.value)}
                            className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                            placeholder="or paste url..."
                          />
                          {block.url && (
                            <img
                              src={block.url}
                              alt="preview"
                              className="w-full h-auto max-h-48 object-contain border border-white/10"
                            />
                          )}
                        </div>
                      )}
                      {(block.type === 'video' || block.type === 'voice') && (
                        <input
                          type="url"
                          value={block.url || ''}
                          onChange={(e) => updateBlock(index, 'url', e.target.value)}
                          className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                          placeholder="url..."
                        />
                      )}
                      {(block.type === 'image' || block.type === 'video') && (
                        <input
                          type="text"
                          value={(block.caption ?? '') || ''}
                          onChange={(e) => updateBlock(index, 'caption', e.target.value)}
                          className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
                          placeholder="caption (optional)..."
                        />
                      )}
                      {block.type === 'voice' && (
                        <input
                          type="number"
                          value={(block.duration ?? 0) || 0}
                          onChange={(e) =>
                            updateBlock(index, 'duration', parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base"
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
              <div className="text-[#ff006e] text-xs sm:text-sm font-mono border border-[#ff006e] px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={createBottle.isPending}
              className="w-full py-2 text-xs sm:text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition disabled:opacity-50 font-mono"
            >
              {createBottle.isPending ? 'CREATING...' : 'CREATE'}
            </button>
          </form>
        </div>

        {/* All Bottles List */}
        <div>
          <h2 className="text-sm sm:text-base text-white/70 font-mono mb-4 sm:mb-8">{`> ALL_BOTTLES`}</h2>

          {bottles.length === 0 ? (
            <p className="text-white/40 font-mono text-xs sm:text-sm">no bottles found.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {bottles.map((bottle) => (
                <div key={bottle.id} className="border border-white/20 p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm sm:text-base text-white/80 font-mono">{bottle.name}</h3>
                      <p className="text-xs text-white/40 mt-1 font-mono">
                        {new Date(bottle.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/bottle/${bottle.id}`)}
                      className="px-3 py-1 text-xs text-white/60 border border-white/20 hover:border-[#ff006e] hover:text-[#ff006e] transition font-mono self-start sm:self-auto whitespace-nowrap"
                    >
                      [view]
                    </button>
                  </div>
                  <div className="text-xs text-white/50 font-mono space-y-1">
                    <p>blocks: {(bottle.content as any)?.blocks?.length || 0}</p>
                    <p>opens: {bottle.opens.length}</p>
                  </div>
                  {bottle.opens.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-xs text-white/50 mb-2 font-mono">recent:</p>
                      <ul className="space-y-1">
                        {bottle.opens.slice(0, 3).map((open: any, idx: number) => (
                          <li key={idx} className="text-xs text-white/40 font-mono break-all">
                            {open.user.email} /{' '}
                            {new Date(open.openedAt).toLocaleDateString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
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
