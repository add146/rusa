import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const uploadsRouter = new Hono<{ Bindings: { DB: D1Database, BUCKET: R2Bucket } }>();

// Make sure GET is public so <img> tags work without bearer tokens

// GET /api/v1/uploads/:key
uploadsRouter.get('/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const object = await c.env.BUCKET.get(key);

    if (object === null) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Fallback content type if not set
    if (!headers.has('content-type')) {
      headers.set('content-type', 'image/jpeg');
    }

    return new Response(object.body, {
      headers,
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/v1/uploads/imgbb (kept name for backward compatibility with frontend)
uploadsRouter.post('/imgbb', authMiddleware, async (c) => {
  try {
    const { imageBase64 } = await c.req.json();

    if (!imageBase64) {
      return c.json({ error: 'Image base64 data is required' }, 400);
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const filename = `proof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

    // Upload to R2
    await c.env.BUCKET.put(filename, bytes, {
      httpMetadata: { contentType: 'image/jpeg' },
    });
    
    // Construct URL for the uploaded image using the worker's own origin
    const url = new URL(c.req.url);
    const fileUrl = `${url.origin}/api/v1/uploads/${filename}`;

    return c.json({ url: fileUrl });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return c.json({ error: error.message }, 500);
  }
});

export default uploadsRouter;
