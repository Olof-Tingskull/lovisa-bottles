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
      setMessage(data.message)

      // Refresh journals
      fetchJournals()

      // If a bottle was opened, redirect to it
      if (data.bottleId) {
        setTimeout(() => {
          router.push(`/bottle/${data.bottleId}`)
        }, 1500)
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-purple-700 font-semibold">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md shadow-lg border-b-2 border-purple-200">
        <div className="max-w-4xl mx-auto px-4 py-5 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Message in a Bottle
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-base text-purple-800 font-medium">{user.email}</span>
            {user.isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="text-base font-semibold text-purple-700 hover:text-pink-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition"
              >
                Admin
              </button>
            )}
            <button
              onClick={logout}
              className="text-base font-semibold text-red-600 hover:text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Journal Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border-2 border-pink-200">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">✨</div>
            <h2 className="text-2xl font-bold text-purple-900">Write Your Journal</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="entry"
                className="block text-base font-semibold text-purple-900 mb-2"
              >
                How was your day?
              </label>
              <textarea
                id="entry"
                required
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border-2 border-purple-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-purple-900 placeholder-purple-400"
                placeholder="Write about your day..."
              />
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
              {submitting ? 'Submitting...' : 'Submit & Open Bottle'}
            </button>
          </form>
        </div>

        {/* Journal History */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border-2 border-blue-200">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">📖</div>
            <h2 className="text-2xl font-bold text-purple-900">Your Journal History</h2>
          </div>

          {loadingJournals ? (
            <p className="text-purple-700 text-center font-medium text-lg">Loading...</p>
          ) : journals.length === 0 ? (
            <p className="text-purple-600 text-center font-medium text-lg">No journal entries yet.</p>
          ) : (
            <div className="space-y-4">
              {journals.map((journal) => (
                <div
                  key={journal.id}
                  className="border-2 border-purple-200 rounded-2xl p-5 hover:bg-pink-50 bg-white transition-all hover:shadow-lg hover:border-pink-300"
                >
                  <div className="flex justify-between items-start mb-3">
                    <p className="text-sm text-purple-600 font-semibold">
                      {new Date(journal.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <button
                      onClick={() => handleDeleteJournal(journal.id)}
                      className="text-red-600 hover:text-red-700 font-semibold text-sm px-3 py-1 rounded-lg hover:bg-red-50 transition"
                      title="Delete this journal entry"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mb-4">
                    <p className="text-base text-purple-900 whitespace-pre-wrap leading-relaxed">
                      {journal.entry}
                    </p>
                  </div>
                  {journal.bottleOpen && (
                    <div className="pt-3 border-t border-purple-200">
                      <button
                        onClick={() =>
                          router.push(`/bottle/${journal.bottleOpen!.bottle.id}`)
                        }
                        className="text-base text-blue-700 hover:text-pink-600 font-bold transition flex items-center gap-1"
                      >
                        🍾 View Bottle: {journal.bottleOpen.bottle.name}
                      </button>
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
