import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { locations } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

const locationsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

locationsRouter.use('*', authMiddleware);

// GET /api/v1/locations - List all active locations
locationsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(locations).where(eq(locations.is_active, 1)).all();
  return c.json(result);
});

// POST /api/v1/locations - Create location (owner/admin only)
locationsRouter.post('/', rbacMiddleware(['owner', 'admin']), async (c) => {
  const { name, latitude, longitude, radius_meters } = await c.req.json();
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();
  
  const newLoc = {
    id,
    name,
    latitude: Number(latitude),
    longitude: Number(longitude),
    radius_meters: Number(radius_meters) || 100,
    is_active: 1
  };
  
  await db.insert(locations).values(newLoc).run();
  return c.json(newLoc, 201);
});

// PUT /api/v1/locations/:id - Update location (owner/admin only)
locationsRouter.put('/:id', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const { name, latitude, longitude, radius_meters, is_active } = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(locations).set({
    name,
    latitude: latitude !== undefined ? Number(latitude) : undefined,
    longitude: longitude !== undefined ? Number(longitude) : undefined,
    radius_meters: radius_meters !== undefined ? Number(radius_meters) : undefined,
    is_active: is_active !== undefined ? Number(is_active) : undefined,
    updated_at: new Date().toISOString()
  }).where(eq(locations.id, id)).run();
  
  return c.json({ success: true });
});

// DELETE /api/v1/locations/:id - Soft delete (owner only)
locationsRouter.delete('/:id', rbacMiddleware(['owner']), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.update(locations).set({ 
    is_active: 0,
    updated_at: new Date().toISOString()
  }).where(eq(locations.id, id)).run();
  return c.json({ success: true });
});

export default locationsRouter;
