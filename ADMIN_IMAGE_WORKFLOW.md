# Admin Panel Image Workflow

## How Image Upload & Access Control Works

### 1. **Upload Flow** (Fixed ✅)

When an admin uploads an image in the bottle creation form:

```typescript
// User clicks [upload image] button
// → File selected from file picker
// → handleFileUpload() is called

const handleFileUpload = async (index: number, file: File) => {
  // 1. Upload to R2
  const response = await fetch('/api/upload', { ... })
  const data = await response.json()
  // Returns: { id: "uuid-1234", filename: "...", size: 12345, contentType: "image/jpeg" }

  // 2. Store the image access URL in the block
  updateBlock(index, 'url', `/api/images/${data.id}`)

  // 3. Store the image ID for access granting later
  updateBlock(index, 'imageId', data.id)
}
```

**Result:** The image block now has:
- `url: "/api/images/uuid-1234"` ← Used for display
- `imageId: "uuid-1234"` ← Used for granting access

---

### 2. **Bottle Creation Flow** (Fixed ✅)

When admin creates a bottle with images:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  // 1. Create the bottle with image URLs
  await fetch('/api/bottles', {
    body: JSON.stringify({
      name: bottleName,
      content: {
        blocks: [
          { type: 'text', content: 'Hello!' },
          { type: 'image', url: '/api/images/uuid-1234', caption: 'Photo' }
          //                    ↑ This URL is safe to store
        ]
      },
      assignedViewerId: recipientUserId
    })
  })

  // 2. Grant access to ALL images in the bottle for the assigned user
  for (const block of imageBlocks) {
    await fetch(`/api/images/${block.imageId}/grant-access`, {
      body: JSON.stringify({ userId: assignedViewerId })
    })
  }
}
```

**Result:**
- Bottle created with image URLs
- Assigned user can now access those images
- Admin (uploader) already has access (granted automatically on upload)

---

### 3. **Viewing Flow** (User Side)

When the assigned user opens the bottle:

```tsx
// Bottle content has this block:
{ type: 'image', url: '/api/images/uuid-1234', caption: 'Photo' }

// In the bottle viewer:
<img src={block.url} />
// This renders: <img src="/api/images/uuid-1234" />

// When browser requests /api/images/uuid-1234:
// 1. User auth verified (JWT cookie)
// 2. image_access table checked (does this user have access?)
// 3. Access count incremented
// 4. Image streamed from R2
```

---

## Key Points

### ✅ **What's Fixed**

1. **Controlled Input Error**
   - All inputs now have `|| ''` fallback to prevent undefined values
   - React no longer switches between controlled/uncontrolled

2. **Image URL Format**
   - Upload returns image ID
   - Admin panel converts to `/api/images/[id]` format
   - This URL is safe to store in bottle content

3. **Automatic Access Granting**
   - Admin uploads → gets access automatically
   - Bottle creation → assigned user gets access
   - No manual access granting needed!

### 🔐 **Security Flow**

```
Admin uploads image
  ↓
Image stored in R2 (private)
  ↓
Metadata in database
  ↓
Admin gets access (automatic)
  ↓
Bottle created with /api/images/[id] URL
  ↓
Assigned user gets access (automatic)
  ↓
User views bottle
  ↓
Browser requests /api/images/[id]
  ↓
Server checks image_access table
  ↓
✅ Access granted → Stream from R2
❌ Access denied → 403 Forbidden
```

---

## Controlled Input Pattern

All form inputs now use the safe pattern:

```tsx
// ✅ GOOD - Always controlled
<input value={block.url || ''} onChange={...} />
<input value={(block.caption ?? '') || ''} onChange={...} />
<textarea value={block.content || ''} onChange={...} />

// ❌ BAD - Can switch to uncontrolled if value becomes undefined
<input value={block.url} onChange={...} />
```

---

## Database Structure

### images table
```
id: uuid-1234
user_id: 1 (admin who uploaded)
storage_key: "images/uuid-1234.jpg" (R2 key)
filename: "photo.jpg"
content_type: "image/jpeg"
size_bytes: 123456
```

### image_access table
```
image_id: uuid-1234
user_id: 2 (assigned viewer)
access_count: 0 → 1 → 2 (increments on each view)
max_views: null (unlimited)
expires_at: null (never expires)
```

---

## Adding Access Restrictions (Optional)

If you want to limit views or add expiration:

```typescript
// In handleSubmit, replace the grant access call:

await fetch(`/api/images/${block.imageId}/grant-access`, {
  body: JSON.stringify({
    userId: assignedViewerId,
    maxViews: 3,  // Can only view 3 times
    expiresAt: '2025-12-31T23:59:59Z'  // Expires end of year
  })
})
```

---

## Troubleshooting

### "Controlled input error"
✅ **Fixed!** All inputs now have `|| ''` fallback

### Images not showing for user
- Check `image_access` table - does user have access?
- Run this SQL to debug:
  ```sql
  SELECT * FROM image_access WHERE image_id = 'uuid-1234' AND user_id = 2;
  ```

### 403 Forbidden on image
- User doesn't have access in `image_access` table
- Access may have expired
- Max views exceeded

---

## Complete Flow Example

```typescript
// 1. Admin selects image file
[User clicks upload button]

// 2. Upload to R2
POST /api/upload
Response: { id: "abc-123", ... }

// 3. Store in block
block.url = "/api/images/abc-123"
block.imageId = "abc-123"

// 4. Admin creates bottle
POST /api/bottles
Body: {
  content: { blocks: [{ type: 'image', url: '/api/images/abc-123' }] },
  assignedViewerId: 42
}

// 5. Grant access
POST /api/images/abc-123/grant-access
Body: { userId: 42 }

// 6. User views bottle
<img src="/api/images/abc-123" />

// 7. Browser requests image
GET /api/images/abc-123
Headers: Cookie: token=jwt...

// 8. Server checks access
SELECT * FROM image_access WHERE image_id='abc-123' AND user_id=42

// 9. Image streamed from R2
200 OK + image bytes
```

---

## Summary

✅ Images are completely private (R2 has no public access)
✅ URLs are safe to store (`/api/images/[id]` format)
✅ Access automatically granted to uploader and assigned viewer
✅ Controlled inputs won't cause React errors
✅ No manual access management needed for basic workflow

🎉 **It just works!**
