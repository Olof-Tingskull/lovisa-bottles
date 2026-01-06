# tRPC Implementation Guide

✅ **tRPC is now fully set up and ready to use!**

This guide shows you how to use tRPC in your project and migrate existing routes.

---

## 🎯 What's Implemented

### Backend (Server-Side)
- ✅ **tRPC Router**: [lib/trpc/router.ts](lib/trpc/router.ts)
- ✅ **Context**: Authentication via HTTP-only cookies - [lib/trpc/context.ts](lib/trpc/context.ts)
- ✅ **Middleware**: `protectedProcedure`, `adminProcedure` - [lib/trpc/init.ts](lib/trpc/init.ts)
- ✅ **Example Routes**:
  - `auth.login` - Login with validation
  - `auth.setup` - User registration
  - `auth.checkSetup` - Check if setup complete
  - `bottles.list` - List bottles (admin/user views)
  - `bottles.getById` - Get bottle details
  - `bottles.create` - Create bottle (admin only)
  - `bottles.open` - Open bottle with journal entry

### Frontend (Client-Side)
- ✅ **React Query Integration**: Caching, refetching, loading states
- ✅ **tRPC Client**: Type-safe API calls - [lib/trpc/client.ts](lib/trpc/client.ts)
- ✅ **Providers Setup**: [app/providers.tsx](app/providers.tsx)

### API Endpoint
- ✅ **Handler**: `/api/trpc/*` - [app/api/trpc/[trpc]/route.ts](app/api/trpc/[trpc]/route.ts)

---

## 📚 Usage Examples

### 1. Simple Query (Fetch Data)

```tsx
'use client'

import { api } from '@/lib/trpc/client'

export function BottleList() {
  // ✅ Fully typed! Auto-complete, loading states, error handling
  const { data, isLoading, error } = api.bottles.list.useQuery()

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!data) return null

  return (
    <div>
      {data.bottles.map((bottle) => (
        <div key={bottle.id}>{bottle.name}</div>
      ))}
    </div>
  )
}
```

### 2. Mutation (Create/Update/Delete)

```tsx
'use client'

import { api } from '@/lib/trpc/client'

export function CreateBottle() {
  const utils = api.useUtils()

  const createBottle = api.bottles.create.useMutation({
    // Auto-refetch list after creating
    onSuccess: () => {
      utils.bottles.list.invalidate()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // ✅ TypeScript will error if shape is wrong!
    await createBottle.mutateAsync({
      name: 'My Bottle',
      content: {
        blocks: [
          { type: 'text', content: 'Hello!' },
        ],
      },
      assignedViewerId: 1,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <button disabled={createBottle.isPending}>
        {createBottle.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

### 3. Query with Parameters

```tsx
const { data: bottle } = api.bottles.getById.useQuery({ id: 123 })
```

### 4. Refetch on Window Focus

```tsx
const { data } = api.bottles.list.useQuery(undefined, {
  refetchOnWindowFocus: true,
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

### 5. Manual Refetch

```tsx
const { data, refetch, isFetching } = api.bottles.list.useQuery()

return (
  <button onClick={() => refetch()} disabled={isFetching}>
    Refresh
  </button>
)
```

### 6. Optimistic Updates

```tsx
const utils = api.useUtils()

const openBottle = api.bottles.open.useMutation({
  onSuccess: () => {
    // Invalidate and refetch
    utils.bottles.list.invalidate()
  },
})
```

---

## 🔄 Migration Guide

### How to Migrate Existing Routes

Let's say you have this old REST endpoint:

**Old: `app/api/journal/route.ts`**
```ts
export async function POST(request: NextRequest) {
  return withValidatedAuth(request, createJournalSchema, async (_req, user, data) => {
    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        entry: data.entry,
        date: new Date(),
      },
    })
    return NextResponse.json(entry)
  })
}
```

**Step 1: Create tRPC Router**

Create `lib/trpc/routers/journal.ts`:
```ts
import { router, protectedProcedure } from '../init'
import { createJournalSchema } from '@/lib/schemas'
import { prisma } from '@/lib/prisma'

export const journalRouter = router({
  create: protectedProcedure
    .input(createJournalSchema)
    .mutation(async ({ ctx, input }) => {
      const entry = await prisma.journalEntry.create({
        data: {
          userId: ctx.user.id,
          entry: input.entry,
          date: new Date(),
        },
      })
      return entry
    }),
})
```

**Step 2: Add to Main Router**

Update `lib/trpc/router.ts`:
```ts
import { journalRouter } from './routers/journal'

export const appRouter = router({
  auth: authRouter,
  bottles: bottlesRouter,
  journal: journalRouter, // ✅ Add here
})
```

**Step 3: Use in Frontend**

Replace this:
```ts
// ❌ Old way
const res = await fetch('/api/journal', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({ entry: 'My entry' }),
})
const data = await res.json()
```

With this:
```ts
// ✅ New way - fully typed!
const createJournal = api.journal.create.useMutation()

await createJournal.mutateAsync({
  entry: 'My entry',
})
```

---

## 📖 Available Procedures

### Auth Router (`api.auth.*`)

| Procedure | Type | Input | Description |
|-----------|------|-------|-------------|
| `login` | mutation | `{ email, password }` | Login user |
| `setup` | mutation | `{ email, password }` | Register new user |
| `checkSetup` | query | - | Check if users exist |

### Bottles Router (`api.bottles.*`)

| Procedure | Type | Input | Auth | Description |
|-----------|------|-------|------|-------------|
| `list` | query | - | ✅ | List bottles (admin: all, user: unopened assigned) |
| `getById` | query | `{ id }` | ✅ | Get bottle by ID |
| `create` | mutation | `{ name, content, assignedViewerId }` | 👑 Admin | Create new bottle |
| `open` | mutation | `{ bottleId, entry }` | ✅ | Open bottle with journal entry |

---

## 🏗️ Project Structure

```
lib/trpc/
├── init.ts              # tRPC initialization, middleware
├── context.ts           # Request context (auth from cookies)
├── router.ts            # Main app router
├── client.ts            # Frontend tRPC client
└── routers/
    ├── auth.ts          # Auth endpoints
    ├── bottles.ts       # Bottle endpoints
    └── [your-router].ts # Add your own routers here

app/api/trpc/[trpc]/route.ts  # API handler
```

---

## ✨ Benefits You Get

### 1. **End-to-End Type Safety**
```ts
// TypeScript knows EXACTLY what the response will be!
const { data } = api.bottles.list.useQuery()
//     ^? { totalCount: number, bottles: Bottle[] } | { unopenedCount: number, bottles: SimpleBottle[] }
```

### 2. **Auto-Complete Everywhere**
- Route names
- Input parameters
- Response shapes
- Error types

### 3. **Built-in Loading States**
```ts
const { data, isLoading, error, isPending, isFetching } = api.bottles.list.useQuery()
```

### 4. **Automatic Caching**
- React Query handles caching automatically
- Configurable stale time
- Background refetching

### 5. **Request Batching**
Multiple tRPC calls in the same render will be batched into a single HTTP request!

### 6. **No More Manual `fetch()`**
- No headers to set (cookies automatic)
- No JSON parsing
- No error handling boilerplate

### 7. **Validation with Zod**
All your existing schemas work! Input is validated automatically.

---

## 🎨 Patterns

### Pattern: Invalidate After Mutation
```ts
const createBottle = api.bottles.create.useMutation({
  onSuccess: () => {
    utils.bottles.list.invalidate() // Refetch list
  },
})
```

### Pattern: Loading Indicator
```ts
if (createBottle.isPending) return <Spinner />
```

### Pattern: Error Handling
```ts
const createBottle = api.bottles.create.useMutation({
  onError: (error) => {
    toast.error(error.message)
  },
})
```

### Pattern: Conditional Queries
```ts
const { data } = api.bottles.getById.useQuery(
  { id: bottleId },
  { enabled: !!bottleId } // Only run when bottleId exists
)
```

---

## 🚀 Next Steps

### To Migrate Your Remaining Routes:

1. **Create router files** in `lib/trpc/routers/`
2. **Move logic** from REST routes to procedures
3. **Add to main router** in `lib/trpc/router.ts`
4. **Update frontend** to use `api.[router].[procedure]`
5. **(Optional) Delete old REST routes** once migrated

### Routes to Migrate:

- [ ] `/api/journal/*` → `api.journal.*`
- [ ] `/api/upload` → `api.upload.create`
- [ ] `/api/users` → `api.users.list`
- [ ] `/api/admin/bottles` → (Already in `api.bottles.*`)
- [ ] `/api/images/*` → `api.images.*`

---

## 🔧 Troubleshooting

### Issue: "Type instantiation is excessively deep"
**Solution**: This can happen with complex union types. Simplify the return type or use type assertions.

### Issue: Cookie not being sent
**Solution**: Make sure `credentials: 'include'` is in the tRPC client config (already set in [app/providers.tsx](app/providers.tsx))

### Issue: Query not refetching
**Solution**: Use `utils.[router].[procedure].invalidate()` to trigger a refetch.

---

## 📝 Tips

1. **Start small**: Migrate one route at a time
2. **Keep both**: REST and tRPC routes can coexist during migration
3. **Use utils**: `api.useUtils()` gives you access to cache manipulation
4. **Type safety**: Let TypeScript errors guide you - they prevent bugs!
5. **React Query DevTools**: Install `@tanstack/react-query-devtools` to see queries/mutations in DevTools

---

## 🎉 You're Ready!

tRPC is fully configured and working. Just follow the patterns above to migrate your routes and enjoy full-stack type safety!

**Questions?** Check the [example file](lib/trpc/example-usage.tsx.md) for more patterns.
