'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface JournalEntry {
  id: number
  date: string
  entry: string
  bottleOpen?: {
    bottle: {
      id: number
      name: string
    }
  }
}

export default function HomePage() {
  const { user, token, logout, isLoading } = useAuth()
  const router = useRouter()
  const [entry, setEntry] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loadingJournals, setLoadingJournals] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && token) {
      fetchJournals()
    }
  }, [user, token])

  const fetchJournals = async () => {
    try {
      const res = await fetch('/api/journal', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (res.ok) {
        const data = await res.json()
        setJournals(data.entries)
      }
    } catch (err) {
      console.error('Failed to fetch journals:', err)
    } finally {
      setLoadingJournals(false)
    }
  }

  const handleDeleteJournal = async (journalId: number) => {
    if (!confirm('Are you sure you want to delete this journal entry? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch(`/api/journal?id=${journalId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete journal')
      }

      // Refresh the journal list
      fetchJournals()
      setMessage('Journal entry deleted successfully')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete journal')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)

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

      // Clear form
      setEntry('')

      // Redirect to opening/result page
      if (data.bottleId) {
        router.push(`/opening?bottle=${data.bottleId}`)
      } else {
        // No bottle - show message on result page
        router.push(`/opening?message=${encodeURIComponent(data.message)}`)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred')
      setSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 font-mono">loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg text-[#ff006e] font-mono tracking-wider">
            BOTTLES
          </h1>
          <div className="flex items-center gap-6">
            <span className="text-sm text-white/40 font-mono">{user.email}</span>
            {user.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-sm text-white/60 hover:text-[#ff006e] font-mono transition"
              >
                [admin]
              </button>
            )}
            <button
              onClick={logout}
              className="text-sm text-white/60 hover:text-[#ff006e] font-mono transition"
            >
              exit
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Journal Form */}
        <div className="mb-16">
          <h2 className="text-base text-white/70 font-mono mb-6">{`> NEW_ENTRY`}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <textarea
                id="entry"
                required
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-sm resize-none"
                placeholder="write your entry..."
              />
            </div>

            {message && (
              <div className="text-[#ff006e] text-sm font-mono border border-[#ff006e] px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="py-2 px-6 text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition disabled:opacity-50 font-mono"
            >
              {submitting ? 'SUBMIT...' : 'SUBMIT'}
            </button>
          </form>
        </div>

        {/* Journal History */}
        <div>
          <h2 className="text-base text-white/70 font-mono mb-6">{`> HISTORY`}</h2>

          {loadingJournals ? (
            <p className="text-white/40 font-mono">loading...</p>
          ) : journals.length === 0 ? (
            <p className="text-white/40 font-mono">no entries found.</p>
          ) : (
            <div className="space-y-6">
              {journals.map((journal) => (
                <div
                  key={journal.id}
                  className="border border-white/10 p-4 bg-black/50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-xs text-white/40 font-mono">
                      {new Date(journal.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })}
                    </p>
{/*                    <button
                      onClick={() => handleDeleteJournal(journal.id)}
                      className="text-xs text-white/40 hover:text-[#ff006e] font-mono transition"
                      title="Delete"
                    >
                      [delete]
                    </button>*/}
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-mono">
                      {journal.entry}
                    </p>
                  </div>
                  {journal.bottleOpen && (
                    <button
                      onClick={() =>
                        router.push(`/bottle/${journal.bottleOpen!.bottle.id}`)
                      }
                      className="text-xs text-[#ff006e] hover:text-[#ff0080] font-mono transition"
                    >
                      {`> ${journal.bottleOpen.bottle.name}`}
                    </button>
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
