import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from './router'

/**
 * tRPC React client
 * Use this in your components to call API endpoints with full type safety
 *
 * @example
 * ```tsx
 * import { api } from '@/lib/trpc/client'
 *
 * function MyComponent() {
 *   const { data, isLoading } = api.bottles.list.useQuery()
 *   const createBottle = api.bottles.create.useMutation()
 *
 *   return <div>{data?.bottles.length} bottles</div>
 * }
 * ```
 */
export const api = createTRPCReact<AppRouter>()
