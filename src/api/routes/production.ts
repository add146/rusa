import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, or } from 'drizzle-orm';
import { orders, productionTracking, orderItems } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';
import { sendAutoWAMessage } from '../utils/waTriggers';
import * as schema from '../db/schema';

const productionRouter = new Hono<{ Bindings: { DB: D1Database } }>();

productionRouter.use('*', authMiddleware);
productionRouter.use('*', auditMiddleware);

// GET /api/v1/production
productionRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.orders.findMany({
    where: or(
      eq(orders.status, 'locked'),
      eq(orders.status, 'production'),
      eq(orders.status, 'done')
    ),
    with: {
      client: true,
      sales: true,
      items: { 
        with: { 
          product: true,
          designApproval: true
        } 
      },
      shipmentBatches: {
        with: {
          items: true
        }
      }
    },
    orderBy: [desc(orders.deadline)],
  });
  return c.json(result);
});

// PUT /api/v1/production/:orderId/status
productionRouter.put('/:orderId/status', rbacMiddleware(['owner', 'admin', 'produksi']), async (c) => {
  const orderId = c.req.param('orderId');
  const { status } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  let orderStatus = 'production';
  if (status === 'selesai') orderStatus = 'done';
  if (status === 'masuk') orderStatus = 'production';
  if (status === 'batal_proses') orderStatus = 'locked';
  if (status === 'batal_selesai') orderStatus = 'production';

  await db.update(orders).set({ 
    status: orderStatus,
    updated_at: new Date().toISOString() 
  }).where(eq(orders.id, orderId));

  const existing = await db.select().from(productionTracking).where(eq(productionTracking.order_id, orderId)).get();
  
  if (existing) {
    await db.update(productionTracking).set({
      status,
      updated_at: new Date().toISOString(),
      ...(status === 'selesai' ? { completed_at: new Date().toISOString() } : {})
    }).where(eq(productionTracking.order_id, orderId));
  } else {
    await db.insert(productionTracking).values({
      id: crypto.randomUUID(),
      order_id: orderId,
      status,
      created_at: new Date().toISOString(),
    });
  }

  // SEND WA IF FINISHED
  if (status === 'selesai') {
    const orderData = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { client: true, sales: true }
    });
    
    if (orderData?.client?.pic_phone) {
      const msg = `Kabar baik ${orderData.client.pic_name}! Pesanan ${orderData.order_number} Anda telah SELESAI diproduksi dan siap untuk tahap selanjutnya.`;
      await sendAutoWAMessage(c.env.DB, orderData.client.pic_phone, msg);
    }

    // Notify assigned sales
    if (orderData?.sales?.phone) {
      const salesMsg = `✅ Pesanan ${orderData.order_number} (${orderData.client?.company_name}) telah SELESAI diproduksi. Silakan koordinasi pengiriman dan pelunasan.`;
      await sendAutoWAMessage(c.env.DB, orderData.sales.phone, salesMsg);
    }
  }

  return c.json({ success: true });
});

productionRouter.put('/items/:itemId', rbacMiddleware(['owner', 'admin', 'produksi']), async (c) => {
  const itemId = c.req.param('itemId');
  const { quantity_actual } = await c.req.json();
  const db = drizzle(c.env.DB);
  await db.update(orderItems).set({ quantity_actual }).where(eq(orderItems.id, itemId));
  return c.json({ success: true });
});

productionRouter.put('/items/:itemId/done', rbacMiddleware(['produksi']), async (c) => {
  const itemId = c.req.param('itemId');
  const db = drizzle(c.env.DB, { schema });
  
  const item = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).get();
  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }

  const newStatus = item.is_production_done === 1 ? 0 : 1;
  const doneAt = newStatus === 1 ? new Date().toISOString() : null;

  await db.update(orderItems).set({
    is_production_done: newStatus,
    production_done_at: doneAt
  } as any).where(eq(orderItems.id, itemId));

  return c.json({ success: true, is_production_done: newStatus, production_done_at: doneAt });
});

export default productionRouter;
