import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { visitLogs } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import * as schema from '../db/schema';

const visitLogsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

visitLogsRouter.use('*', authMiddleware);
visitLogsRouter.use('*', auditMiddleware);

// GET /api/v1/visitLogs - List user visitLogs
visitLogsRouter.get('/', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.visitLogs.findMany({
    where: eq(visitLogs.user_id, user.id),
    with: { client: true },
    orderBy: [desc(visitLogs.created_at)],
  });
  return c.json(result);
});

// POST /api/v1/visitLogs
visitLogsRouter.post('/', async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  const newVisit = {
    id: crypto.randomUUID(),
    user_id: user.id,
    client_id: body.client_id,
    summary: body.summary || body.notes || 'Kunjungan rutin',
    location_name: body.location_name || 'Lokasi Lapangan',
    latitude: body.latitude,
    longitude: body.longitude,
    photo_url: body.photo_url,
    visited_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };
  
  await db.insert(visitLogs).values(newVisit);
  return c.json(newVisit, 201);
});

export default visitLogsRouter;
