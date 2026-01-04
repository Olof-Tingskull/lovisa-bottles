# Cloudflare R2 Image Storage Migration Guide

## ✅ Migration Complete!

Your application has been successfully migrated from Vercel Blob to Cloudflare R2 with secure access control.

---

## 🔐 Security Features

### What Makes This Secure?

1. **Completely Private Images**
   - R2 bucket has NO public access
   - Only your server can access R2 (using secret keys)
   - Users NEVER see R2 URLs

2. **Database-Controlled Access**
   - Every image access is verified against `image_access` table
   - Track who accessed what and when
   - Set view limits and expiration times

3. **Full Audit Trail**
   - `access_count` tracks every view
   - Timestamps for creation and access
   - Can revoke access at any time

---

## 📋 Setup Checklist

### 1. Update Environment Variables

In your `.env` file, replace the placeholders with your actual R2 credentials:

```bash
# Replace these with your actual R2 credentials:
R2_ACCESS_KEY_ID="your_actual_access_key_here"
R2_SECRET_ACCESS_KEY="your_actual_secret_key_here"
```

**How to get R2 credentials:**
1. Go to Cloudflare Dashboard → R2
2. Click "Manage R2 API Tokens"
3. Create a new API token with read/write permissions for `lovisa-bottles` bucket
4. Copy the Access Key ID and Secret Access Key

### 2. Database Schema

✅ Already applied! The following tables were created:

- `images` - Stores image metadata
- `image_access` - Controls who can access each image

---

## 🚀 How to Use

### 1. Upload an Image (Admin Only)

**Endpoint:** `POST /api/upload`

```typescript
// Example: Upload from admin panel
const formData = new FormData()
formData.append('file', imageFile)

const response = await fetch('/api/upload', {
  method: 'POST',
  credentials: 'include', // Include auth cookie
  body: formData,
})

const data = await response.json()
// Returns: { id: "uuid", filename: "...", size: 12345, contentType: "image/jpeg" }
```

**Important:** The response now returns an `id` instead of a `url`. Save this ID!

### 2. Grant Access to Users

```typescript
import { grantImageAccess } from '@/lib/image-access'

// Unlimited access, never expires
await grantImageAccess(imageId, userId)

// Limited to 3 views
await grantImageAccess(imageId, userId, { maxViews: 3 })

// Expires in 24 hours
const expiresAt = new Date()
expiresAt.setHours(expiresAt.getHours() + 24)
await grantImageAccess(imageId, userId, { expiresAt })

// Both limits
await grantImageAccess(imageId, userId, {
  maxViews: 5,
  expiresAt: new Date('2025-12-31')
})
```

### 3. Display Images in Frontend

**Instead of using the URL directly, use the image ID:**

```tsx
// ❌ OLD (Vercel Blob):
<img src="https://blob.vercel-storage.com/..." />

// ✅ NEW (R2 with access control):
<img src={`/api/images/${imageId}`} />
```

The `/api/images/[id]` endpoint will:
1. Verify the user is authenticated
2. Check if they have access
3. Increment their access count
4. Stream the image from R2

---

## 📝 Code Examples

### Example 1: Bottle with Images (Your Use Case)

When creating a bottle with images for a specific user:

```typescript
// Admin uploads images
const uploadedImages = []
for (const imageFile of imageFiles) {
  const formData = new FormData()
  formData.append('file', imageFile)

  const res = await fetch('/api/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  const { id } = await res.json()
  uploadedImages.push(id)
}

// Create bottle with image IDs
const bottle = await prisma.bottle.create({
  data: {
    name: "Birthday Message",
    content: {
      blocks: [
        { type: 'text', content: 'Happy Birthday!' },
        { type: 'image', url: `/api/images/${uploadedImages[0]}`, caption: 'Party pic' }
      ]
    },
    assignedViewerId: recipientUserId
  }
})

// Grant the assigned user access to all images
for (const imageId of uploadedImages) {
  await grantImageAccess(imageId, recipientUserId)
}
```

### Example 2: Limited-View Secret Image

```typescript
import { grantImageAccess } from '@/lib/image-access'

// Upload a secret image
const { id: imageId } = await uploadImage(file)

// Grant access to user - can only view 1 time
await grantImageAccess(imageId, userId, { maxViews: 1 })

// First view: ✅ Works
// Second view: ❌ "Maximum views exceeded"
```

### Example 3: Temporary Access

```typescript
// Create a temp link that expires in 1 hour
const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

await grantImageAccess(imageId, userId, { expiresAt })

// After 1 hour: ❌ "Access expired"
```

---

## 🛠️ Helper Functions

All helper functions are in `lib/image-access.ts`:

### grantImageAccess()
Grant or update access for a user.

```typescript
grantImageAccess(imageId: string, userId: number, options?: {
  maxViews?: number,
  expiresAt?: Date
})
```

### checkImageAccess()
Check if a user has access (doesn't increment count).

```typescript
const { hasAccess, reason } = await checkImageAccess(imageId, userId)
if (!hasAccess) {
  console.log(reason) // "No access granted", "Access expired", or "Maximum views exceeded"
}
```

### revokeImageAccess()
Revoke a user's access.

```typescript
await revokeImageAccess(imageId, userId)
```

### getImageAccessList()
See all users who have access.

```typescript
const accessList = await getImageAccessList(imageId)
// Returns: [{ id, userId, user: { email }, accessCount, maxViews, expiresAt }]
```

---

## 🔄 Migration from Old Code

### Update Admin Panel

**Before:**
```typescript
// Admin creates bottle with images
const blocks = [
  { type: 'image', url: blob.url, caption: '...' }
]
```

**After:**
```typescript
// Upload returns ID, not URL
const { id } = await uploadImage(file)

// Use image endpoint URL
const blocks = [
  { type: 'image', url: `/api/images/${id}`, caption: '...' }
]

// Grant access to assigned user
await grantImageAccess(id, assignedViewerId)
```

---

## 🚨 Important Notes

1. **Update `.env`**: Replace placeholder R2 credentials with real ones
2. **Images are now IDs**: Update any code that expects URLs
3. **Grant access**: After uploading, grant access to users who should see it
4. **No public URLs**: Images are only accessible via `/api/images/[id]` with auth
5. **Access is tracked**: Every view increments the `access_count`

---

## 🐛 Troubleshooting

### "Missing required R2 environment variables"
- Check that `.env` has all four R2 variables set
- Restart your dev server after updating `.env`

### "Image not found" (404)
- Verify the image ID exists in the database
- Check that the image was uploaded successfully

### "Access denied" (403)
- User doesn't have access in `image_access` table
- Access may have expired (`expiresAt` < now)
- Max views may be exceeded (`accessCount` >= `maxViews`)
- Use `grantImageAccess()` to grant access

### "Failed to upload file to R2"
- Verify R2 credentials are correct
- Check that bucket name matches: `lovisa-bottles`
- Ensure bucket exists in your Cloudflare account

---

## 📊 Database Schema Reference

### images table
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY,
  user_id INT NOT NULL,
  storage_key TEXT NOT NULL,  -- R2 object key (e.g., "images/uuid.jpg")
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### image_access table
```sql
CREATE TABLE image_access (
  id UUID PRIMARY KEY,
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  user_id INT NOT NULL,
  access_count INT DEFAULT 0,
  max_views INT NULL,      -- NULL = unlimited
  expires_at TIMESTAMP NULL, -- NULL = never expires
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(image_id, user_id)
);
```

---

## ✨ Benefits Summary

✅ **Complete Privacy** - Images never exposed publicly
✅ **Access Control** - Decide who sees what
✅ **View Limits** - Limit views per user
✅ **Expiration** - Time-limited access
✅ **Audit Trail** - Track all access
✅ **Cost Effective** - R2 has no egress fees
✅ **Scalable** - No size limits like Vercel Blob

---

## 📞 Support

If you run into issues, check:
1. Environment variables are set correctly
2. Database migration was successful
3. R2 bucket exists and credentials work
4. User has access granted via `grantImageAccess()`

Happy coding! 🚀
