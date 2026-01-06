/**
 * EXAMPLE: How to use tRPC in your components
 *
 * This file shows common patterns for using tRPC with React Query
 * Copy these patterns when migrating your existing components
 */

'use client'

import { api } from '@/lib/trpc/client'

// ============================================================================
// EXAMPLE 1: Simple Query (Read data)
// ============================================================================

export function BottleListExample() {
  // ✅ Fully typed! data, isLoading, error are all typed
  const { data, isLoading, error } = api.bottles.list.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  return (
    <div>
      <p>Count: {'totalCount' in data ? data.totalCount : data.unopenedCount}</p>
      {data.bottles.map((bottle) => (
        <div key={bottle.id}>{bottle.name}</div>
      ))}
    </div>
  )
}

// ============================================================================
// EXAMPLE 2: Mutation (Create/Update/Delete)
// ============================================================================

export function CreateBottleExample() {
  const utils = api.useUtils()

  // ✅ Mutation hook
  const createBottle = api.bottles.create.useMutation({
    // Automatically refetch bottles list after creating
    onSuccess: () => {
      utils.bottles.list.invalidate()
    },
    onError: (error) => {
      alert(`Error: ${error.message}`)
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ Fully typed input! TypeScript will error if wrong shape
    await createBottle.mutateAsync({
      name: 'My Bottle',
      content: {
        blocks: [
          { type: 'text', content: 'Hello world!' },
        ],
      },
      assignedViewerId: 1,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={createBottle.isPending}>
        {createBottle.isPending ? 'Creating...' : 'Create Bottle'}
      </button>
    </form>
  )
}

// ============================================================================
// EXAMPLE 3: Query with Input Parameters
// ============================================================================

export function BottleDetailExample({ bottleId }: { bottleId: number }) {
  const { data: bottle } = api.bottles.getById.useQuery({ id: bottleId })

  if (!bottle) return null

  return (
    <div>
      <h1>{bottle.name}</h1>
      <p>Assigned to: {bottle.assignedViewer.email}</p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Optimistic Updates
// ============================================================================

export function OpenBottleExample({ bottleId }: { bottleId: number }) {
  const utils = api.useUtils()

  const openBottle = api.bottles.open.useMutation({
    onSuccess: () => {
      // Refetch bottles list after opening
      utils.bottles.list.invalidate()
    },
  })

  const handleOpen = async () => {
    await openBottle.mutateAsync({
      bottleId,
      entry: 'My journal entry',
    })
  }

  return (
    <button onClick={handleOpen} disabled={openBottle.isPending}>
      Open Bottle
    </button>
  )
}

// ============================================================================
// EXAMPLE 5: Conditional Queries (enabled option)
// ============================================================================

export function ConditionalQueryExample({ userId }: { userId: number | null }) {
  // Only fetch when userId is available
  const { data } = api.bottles.list.useQuery(undefined, {
    enabled: !!userId, // Won't run until userId exists
  })

  const count = data ? ('totalCount' in data ? data.totalCount : data.unopenedCount) : 0
  return <div>{data ? `${count} bottles` : 'No user selected'}</div>
}

// ============================================================================
// EXAMPLE 6: Manual Refetch
// ============================================================================

export function ManualRefetchExample() {
  const { data, refetch, isFetching } = api.bottles.list.useQuery()

  const count = data ? ('totalCount' in data ? data.totalCount : data.unopenedCount) : 0

  return (
    <div>
      <button onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </button>
      <p>{count} bottles</p>
    </div>
  )
}

// ============================================================================
// EXAMPLE 7: Auth Endpoints (Login/Logout)
// ============================================================================

export function LoginExample() {
  const login = api.auth.login.useMutation({
    onSuccess: (data) => {
      console.log('Logged in:', data.email)
      // Router redirect handled by auth context
    },
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    await login.mutateAsync({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={login.isPending}>
        {login.isPending ? 'Logging in...' : 'Login'}
      </button>
      {login.error && <p>Error: {login.error.message}</p>}
    </form>
  )
}

// ============================================================================
// EXAMPLE 8: Accessing Utils for Advanced Operations
// ============================================================================

export function AdvancedExample() {
  const utils = api.useUtils()

  const handleInvalidateAll = () => {
    // Invalidate all queries
    utils.invalidate()
  }

  const handleInvalidateBottles = () => {
    // Invalidate just bottles queries
    utils.bottles.invalidate()
  }

  const handlePrefetch = async () => {
    // Prefetch data before navigating
    await utils.bottles.list.prefetch()
  }

  return (
    <div>
      <button onClick={handleInvalidateAll}>Invalidate All</button>
      <button onClick={handleInvalidateBottles}>Invalidate Bottles</button>
      <button onClick={handlePrefetch}>Prefetch Bottles</button>
    </div>
  )
}
