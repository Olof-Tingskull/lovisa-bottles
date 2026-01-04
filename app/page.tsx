'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
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
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()
  const [entry, setEntry] = useState('')
  const [message, setMessage] = useState('')
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [loadingJournals, setLoadingJournals] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/info')
    }
  }, [user, isLoading, router])

  // Animated dots for opening screen
  useEffect(() => {
    if (!submitting) return

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : `${prev}.`))
    }, 500)

    return () => clearInterval(interval)
  }, [submitting])

  const fetchJournals = useCallback(async () => {
    try {
      const res = await fetch('/api/journal', {
        credentials: 'include',
      })

      if (res.ok) {
        const data = await res.json()
        // Entries are already decrypted by the server
        setJournals(data.entries)
      }
    } catch (err) {
      console.error('Failed to fetch journals:', err)
    } finally {
      setLoadingJournals(false)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchJournals()
    }
  }, [fetchJournals, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    setSubmitting(true)

    try {
      // Send plaintext to server (server will encrypt before DB storage)
      const res = await fetch('/api/journal/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ entry }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit journal')
      }

      if (data.bottleId) {
        // Automatically redirect to the bottle page
        router.push(`/bottle/${data.bottleId}`)
      } else {
        // No bottle available
        setMessage(data.message || 'no bottles available')
        setSubmitting(false)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred')
      setSubmitting(false)
    }

    setEntry('')
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50 font-mono">loading...</p>
      </div>
    )
  }

  // Show opening animation while submitting
  if (submitting) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="text-5xl sm:text-6xl mb-6 sm:mb-8 animate-pulse">🍾</div>
          <p className="text-[#ff006e] font-mono text-base sm:text-lg">opening bottle{dots}</p>
          <p className="text-white/40 font-mono text-xs sm:text-sm">preparing your message</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
            <h1 className="text-base sm:text-lg text-[#ff006e] font-mono tracking-wider">LOVISA FLASKPOST</h1>
            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
              <span className="text-xs sm:text-sm text-white/40 font-mono truncate max-w-30 sm:max-w-none">{user.email}</span>
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  onClick={() => router.push('/info')}
                  className="text-xs sm:text-sm text-white/60 hover:text-[#ff006e] font-mono transition whitespace-nowrap"
                >
                  help
                </button>
                {user.isAdmin && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="text-xs sm:text-sm text-white/60 hover:text-[#ff006e] font-mono transition whitespace-nowrap"
                  >
                    [admin]
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-xs sm:text-sm text-white/60 hover:text-[#ff006e] font-mono transition whitespace-nowrap"
                >
                  exit
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Journal Form */}
        <div className="mb-12 sm:mb-16">
          <h2 className="text-sm sm:text-base text-white/70 font-mono mb-4 sm:mb-6">{`> NEW_ENTRY`}</h2>

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <textarea
                id="entry"
                required
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-white/20 bg-black focus:outline-none focus:border-[#ff006e] text-white placeholder-white/30 font-mono text-base resize-none"
                placeholder="write your entry..."
              />
            </div>

            {message && (
              <div className="text-[#ff006e] text-xs sm:text-sm font-mono border border-[#ff006e] px-3 py-2">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full sm:w-auto py-2 px-6 text-xs sm:text-sm text-black bg-[#ff006e] hover:bg-[#ff0080] transition font-mono"
            >
              SUBMIT
            </button>
          </form>
        </div>

        {/* Journal History */}
        <div>
          <h2 className="text-sm sm:text-base text-white/70 font-mono mb-4 sm:mb-6">{`> HISTORY`}</h2>

          {loadingJournals ? (
            <p className="text-white/40 font-mono text-xs sm:text-sm">loading...</p>
          ) : journals.length === 0 ? (
            <p className="text-white/40 font-mono text-xs sm:text-sm">no entries found.</p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {journals.map((journal) => (
                <div key={journal.id} className="border border-white/10 p-3 sm:p-4 bg-black/50">
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <p className="text-xs text-white/40 font-mono">
                      {new Date(journal.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
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
                  <div className="mb-2 sm:mb-3">
                    <p className="text-xs sm:text-sm text-white/80 whitespace-pre-wrap leading-relaxed font-mono">
                      {journal.entry}
                    </p>
                  </div>
                  {journal.bottleOpen && (
                    <button
                      onClick={() => router.push(`/bottle/${journal.bottleOpen?.bottle.id}`)}
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
