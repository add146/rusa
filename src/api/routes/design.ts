import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { designApprovals, orderItems } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import * as schema from '../db/schema';

const designRouter = new Hono<{ Bindings: { DB: D1Database } }>();

designRouter.use('*', authMiddleware);

// GET /api/v1/design/approvals
designRouter.get('/approvals', async (c) => {
  const orderId = c.req.query('order_id');
  if (!orderId) {
    return c.json({ error: 'order_id query parameter is required' }, 400);
  }
  const db = drizzle(c.env.DB, { schema });
  const approvals = await db.select().from(designApprovals).where(eq(designApprovals.order_id, orderId));
  return c.json(approvals);
});

// PUT /api/v1/design/approvals/:orderItemId
designRouter.put('/approvals/:orderItemId', rbacMiddleware(['desainer']), async (c) => {
  const orderItemId = c.req.param('orderItemId');
  const { is_approved, notes } = await c.req.json();
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB, { schema });

  // First check if orderItem exists to find its order_id
  const orderItem = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, orderItemId),
  });

  if (!orderItem) {
    return c.json({ error: 'Order item not found' }, 404);
  }

  // Find if approval record already exists
  const existing = await db.select().from(designApprovals).where(eq(designApprovals.order_item_id, orderItemId)).get();

  const now = new Date().toISOString();
  if (existing) {
    await db.update(designApprovals).set({
      is_approved: is_approved ? 1 : 0,
      approved_by: (is_approved ? user.id : null) as any,
      approved_at: (is_approved ? now : null) as any,
      notes: (notes ?? existing.notes) as any,
      updated_at: now,
    }).where(eq(designApprovals.order_item_id, orderItemId));
  } else {
    await db.insert(designApprovals).values({
      id: crypto.randomUUID(),
      order_item_id: orderItemId,
      order_id: orderItem.order_id as string,
      is_approved: is_approved ? 1 : 0,
      approved_by: (is_approved ? user.id : null) as any,
      approved_at: (is_approved ? now : null) as any,
      notes: (notes ?? null) as any,
      created_at: now,
      updated_at: now,
    });
  }

  return c.json({ success: true });
});

export default designRouter;
