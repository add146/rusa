import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { pointRules } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';

const pointRulesRouter = new Hono<{ Bindings: { DB: D1Database } }>();

pointRulesRouter.use('*', authMiddleware);
pointRulesRouter.use('*', auditMiddleware);

// GET /api/v1/point-rules - List all rules (Owner only)
pointRulesRouter.get('/', rbacMiddleware(['owner']), async (c) => {
  const db = drizzle(c.env.DB);
  const results = await db.select().from(pointRules).orderBy(desc(pointRules.created_at));
  return c.json(results);
});

// PUT /api/v1/point-rules/:id - Update rule (Owner only)
pointRulesRouter.put('/:id', rbacMiddleware(['owner']), async (c) => {
  const id = c.req.param('id');
  const user = getAuthUser(c);
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(pointRules).set({
    ...body,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).where(eq(pointRules.id, id));
  
  return c.json({ success: true });
});

export default pointRulesRouter;
