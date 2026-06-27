import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { returns, returnItems } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';
import * as schema from '../db/schema';

const returnsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

returnsRouter.use('*', authMiddleware);
returnsRouter.use('*', auditMiddleware);

// GET /api/v1/returns
returnsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.returns.findMany({
    with: {
      order: { with: { client: true } },
      items: { with: { product: true } },
      reportedBy: true,
      verifiedBy: true,
    },
    orderBy: [desc(returns.created_at)],
  });
  return c.json(result);
});

// POST /api/v1/returns
returnsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  
  const returnId = crypto.randomUUID();
  const returnNumber = `RTN-${Date.now().toString().slice(-6)}`;
  
  const newReturn = {
    id: returnId,
    return_number: returnNumber,
    order_id: body.order_id,
    reported_by: user.id,
    reason: body.reason,
    photo_url: body.photo_url,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  
  await db.insert(returns).values(newReturn);

  if (body.items && body.items.length > 0) {
    const itemsToInsert = body.items.map((item: any) => ({
      id: crypto.randomUUID(),
      return_id: returnId,
      order_item_id: item.order_item_id,
      product_id: item.product_id,
      quantity: item.quantity,
      reason: item.reason || body.reason,
      created_at: new Date().toISOString(),
    }));
    await db.insert(returnItems).values(itemsToInsert);
  }

  return c.json({ id: returnId, return_number: returnNumber }, 201);
});

// PUT /api/v1/returns/:id/verify
returnsRouter.put('/:id/verify', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const user = getAuthUser(c);
  const { status, notes } = await c.req.json();
  const db = drizzle(c.env.DB);

  await db.update(returns).set({
    status,
    notes,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).where(eq(returns.id, id));

  return c.json({ success: true });
});

// PUT /api/v1/returns/:id/action
returnsRouter.put('/:id/action', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const { items, total_repair_cost } = await c.req.json();
  const db = drizzle(c.env.DB);

  // Update return status to done
  await db.update(returns).set({
    status: 'done',
    total_repair_cost: total_repair_cost || 0,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).where(eq(returns.id, id));

  // Update actions for items
  if (items && items.length > 0) {
    for (const item of items) {
      await db.update(returnItems).set({
        action_taken: item.action_taken, // 'repair','replace','refund'
        repair_cost: item.repair_cost || 0,
      }).where(eq(returnItems.id, item.id));
    }
  }

  return c.json({ success: true });
});

export default returnsRouter;
