# 🍪 Cookie Authentication in tRPC - Complete Guide

## How It Works

### The Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Browser   │      │ tRPC Server  │      │  Database   │
└─────────────┘      └──────────────┘      └─────────────┘
       │                     │                      │
       │  1. Login Request   │                      │
       │────────────────────>│                      │
       │  { email, password }│                      │
       │                     │  2. Verify Password  │
       │                     │─────────────────────>│
       │                     │<─────────────────────│
       │                     │  3. Generate Token   │
       │                     │         +            │
       │  4. Set-Cookie      │  Encryption Key      │
       │<────────────────────│                      │
       │  token=xxx          │                      │
       │  encryptionKey=yyy  │                      │
       │                     │                      │
       │  5. Subsequent Req  │                      │
       │────────────────────>│                      │
       │  Cookie: token=xxx  │  6. Verify Token     │
       │                     │  (from cookie)       │
       │                     │                      │
       │  7. Response        │                      │
       │<────────────────────│                      │
```

---

## Implementation Details

### 1. Context Setup (Access to Response Headers)

**File:** `lib/trpc/context.ts`

```typescript
export interface Context {
  user: AuthenticatedUser | null
  resHeaders: Headers  // ✅ Access to response headers!
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const { req, resHeaders } = opts

  // Read cookies from request
  const cookieHeader = req.headers.get('cookie')
  const token = parseCookie(cookieHeader, 'token')

  // Verify token and extract user
  const user = verifyToken(token)

  return {
    user,
    resHeaders,  // ✅ Pass headers to procedures
  }
}
```

**Key Points:**
- `resHeaders` from `FetchCreateContextFnOptions` allows setting cookies
- Context is created for every request
- User is extracted from incoming cookies

---

### 2. Setting Cookies in Mutations

**File:** `lib/trpc/routers/auth.ts`

```typescript
login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
  // Authenticate user
  const user = await authenticateUser(input.email, input.password)

  // Generate tokens
  const token = generateToken(user.id, user.email, user.isAdmin)
  const encryptionKey = deriveEncryptionKey(input.password)

  // ✅ Set HTTP-only cookies
  ctx.resHeaders.append(
    'Set-Cookie',
    `token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
  )
  ctx.resHeaders.append(
    'Set-Cookie',
    `encryptionKey=${encryptionKey}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`
  )

  return {
    success: true,
    email: user.email,
    isAdmin: user.isAdmin,
  }
})
```

**Cookie Attributes Explained:**

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `HttpOnly` | - | Prevents JavaScript access (XSS protection) |
| `Secure` | - | Only sent over HTTPS |
| `SameSite=Lax` | - | CSRF protection, allows normal navigation |
| `Path=/` | - | Cookie available for entire site |
| `Max-Age` | 604800 | Cookie expires in 7 days (60*60*24*7) |

---

### 3. Reading Cookies (Authentication)

**Automatic in Context:**

```typescript
// Context automatically reads cookies
const cookieHeader = req.headers.get('cookie')
const cookies = parseCookies(cookieHeader)
const token = cookies.token

// Verify and attach user to context
const user = verifyToken(token)
```

**In Protected Procedures:**

```typescript
protectedProcedure.query(async ({ ctx }) => {
  // ✅ ctx.user is automatically populated from cookie!
  console.log(ctx.user.id)     // User ID
  console.log(ctx.user.email)  // User email
  console.log(ctx.user.isAdmin) // Admin status
})
```

---

### 4. Frontend (Cookies Sent Automatically)

**tRPC Client Setup:**

```typescript
// app/providers.tsx
const [trpcClient] = useState(() =>
  api.createClient({
    links: [
      httpBatchLink({
        url: '/api/trpc',
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: 'include',  // ✅ Send cookies!
          })
        },
      }),
    ],
  })
)
```

**Key:**
- `credentials: 'include'` tells fetch to send cookies with every request
- Browser automatically manages cookie storage
- No need to manually attach tokens to requests

---

### 5. Using Auth in Components

```typescript
// Login
const loginMutation = api.auth.login.useMutation({
  onSuccess: () => {
    // Cookie is already set! Just redirect
    router.push('/')
  },
})

await loginMutation.mutateAsync({ email, password })
// ✅ Cookie set automatically by server

// Protected request
const { data } = api.bottles.listAll.useQuery()
// ✅ Cookie sent automatically by browser
// ✅ Server reads cookie and authenticates
```

---

## Security Considerations

### ✅ What We're Doing Right

1. **HttpOnly Cookies**
   - JavaScript cannot access tokens
   - Prevents XSS attacks from stealing tokens

2. **Secure Flag**
   - Cookies only sent over HTTPS in production
   - Prevents MITM attacks

3. **SameSite=Lax**
   - Prevents CSRF attacks
   - Allows normal navigation (clicking links)

4. **Short Expiration**
   - 7 day max age
   - Limits damage if token is compromised

5. **JWT Verification**
   - Token signature verified on every request
   - Prevents token tampering

### 🔒 Security Best Practices

```typescript
// Development vs Production
const isProduction = process.env.NODE_ENV === 'production'

ctx.resHeaders.append(
  'Set-Cookie',
  `token=${token}; ` +
  `HttpOnly; ` +
  `${isProduction ? 'Secure; ' : ''}` +  // Only in production
  `SameSite=Lax; ` +
  `Path=/; ` +
  `Max-Age=${60 * 60 * 24 * 7}`
)
```

---

## Comparison: REST vs tRPC Cookie Handling

### Old REST Approach

```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const user = await authenticateUser(email, password)
  const token = generateToken(user)

  // ❌ Manually set cookies in NextResponse
  const response = NextResponse.json({ success: true })
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
```

### New tRPC Approach

```typescript
// lib/trpc/routers/auth.ts
login: publicProcedure.mutation(async ({ ctx, input }) => {
  const user = await authenticateUser(input.email, input.password)
  const token = generateToken(user)

  // ✅ Set cookies via context headers
  ctx.resHeaders.append('Set-Cookie', `token=${token}; HttpOnly; Secure; ...`)

  return { success: true }
})
```

**Benefits of tRPC approach:**
- ✅ Type-safe inputs (Zod validation)
- ✅ Automatic error handling
- ✅ Centralized in context
- ✅ Works with all tRPC features

---

## Debugging Cookie Issues

### Check if Cookies Are Set

**Browser DevTools:**
```
1. Open DevTools (F12)
2. Go to Application tab
3. Click "Cookies" in sidebar
4. Check for "token" and "encryptionKey"
```

**Network Tab:**
```
1. Open Network tab
2. Make login request
3. Check Response Headers for:
   Set-Cookie: token=...
   Set-Cookie: encryptionKey=...
```

### Common Issues

#### 1. Cookies Not Sent

**Problem:** `credentials: 'include'` missing

```typescript
// ❌ Wrong
fetch('/api/trpc', {})

// ✅ Correct
fetch('/api/trpc', {
  credentials: 'include'
})
```

#### 2. Cookies Not Set

**Problem:** Missing `ctx.resHeaders.append()`

```typescript
// ❌ Wrong - returns token in body
return { token }

// ✅ Correct - sets cookie
ctx.resHeaders.append('Set-Cookie', `token=${token}; HttpOnly`)
return { success: true }
```

#### 3. HTTPS Required in Production

**Problem:** `Secure` flag requires HTTPS

```typescript
// Development (HTTP): Works
`token=${token}; HttpOnly; Path=/`

// Production (HTTPS): Add Secure
`token=${token}; HttpOnly; Secure; Path=/`
```

---

## Testing Authentication

### 1. Login Test

```typescript
// Test login sets cookies
const result = await api.auth.login.mutate({
  email: 'test@example.com',
  password: 'password123'
})

// Check browser cookies
document.cookie.includes('token=') // Should be empty (HttpOnly)
// But cookie exists in browser storage!
```

### 2. Protected Route Test

```typescript
// After login, this should work
const bottles = await api.bottles.listAll.query()
console.log(bottles) // ✅ Returns data

// Before login, this should fail
const bottles = await api.bottles.listAll.query()
// ❌ Throws UNAUTHORIZED error
```

---

## Summary

### How Cookies Work in Your tRPC App

1. **Login:** Server sets `token` and `encryptionKey` cookies via `ctx.resHeaders.append()`
2. **Storage:** Browser stores cookies automatically (HttpOnly - JS can't access)
3. **Requests:** Browser sends cookies automatically (via `credentials: 'include'`)
4. **Auth:** Server reads cookies in `createContext()` and attaches user to `ctx`
5. **Protected:** Middleware checks `ctx.user` exists before allowing access

### Key Files

- `lib/trpc/context.ts` - Cookie reading + context creation
- `lib/trpc/routers/auth.ts` - Cookie setting (login/signup)
- `lib/trpc/init.ts` - Auth middleware
- `app/providers.tsx` - Cookie sending (`credentials: 'include'`)

### Benefits

✅ **Secure** - HttpOnly, Secure, SameSite protection
✅ **Automatic** - Browser manages cookies
✅ **Type-safe** - Full tRPC type safety
✅ **Simple** - No manual token management
✅ **Works** - Compatible with tRPC, React Query, Next.js

🎉 **Your authentication is now fully set up with secure HTTP-only cookies!**
