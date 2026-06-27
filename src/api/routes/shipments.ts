import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { shipmentBatches, shipmentBatchItems } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';
import * as schema from '../db/schema';

const shipmentsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

shipmentsRouter.use('*', authMiddleware);
shipmentsRouter.use('*', auditMiddleware);

// GET /api/v1/shipments?order_id=xxx
shipmentsRouter.get('/', async (c) => {
  const orderId = c.req.query('order_id');
  const db = drizzle(c.env.DB, { schema });
  
  if (!orderId) {
    return c.json({ error: 'order_id query parameter is required' }, 400);
  }

  const result = await db.query.shipmentBatches.findMany({
    where: eq(shipmentBatches.order_id, orderId),
    with: {
      items: true
    },
    orderBy: [desc(shipmentBatches.batch_number)],
  });

  return c.json(result);
});

// POST /api/v1/shipments
shipmentsRouter.post('/', rbacMiddleware(['produksi', 'owner', 'admin']), async (c) => {
  const user = getAuthUser(c);
  const { order_id, items, notes } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  if (!order_id || !items || !Array.isArray(items) || items.length === 0) {
    return c.json({ error: 'order_id and non-empty items array are required' }, 400);
  }

  // Calculate the next batch number for this order
  const existingBatches = await db.select().from(shipmentBatches).where(eq(shipmentBatches.order_id, order_id));
  const batchNumber = existingBatches.length + 1;

  // Fetch the order to validate items and quantities
  const orderWithDetails = await db.query.orders.findFirst({
    where: eq(schema.orders.id, order_id),
    with: {
      items: true,
      shipmentBatches: {
        with: {
          items: true
        }
      }
    }
  });

  if (!orderWithDetails) {
    return c.json({ error: 'Order not found' }, 404);
  }

  // Map to track total quantity already shipped for each order_item_id
  const totalShippedMap: Record<string, number> = {};
  if (orderWithDetails.shipmentBatches) {
    for (const batch of orderWithDetails.shipmentBatches) {
      if (batch.items) {
        for (const item of batch.items) {
          totalShippedMap[item.order_item_id] = (totalShippedMap[item.order_item_id] || 0) + item.quantity_shipped;
        }
      }
    }
  }

  // Validate item exists, is marked done, and quantity shipped doesn't exceed ordered quantity
  for (const requestedItem of items) {
    const { order_item_id, quantity_shipped } = requestedItem;
    if (quantity_shipped <= 0) {
      return c.json({ error: `Invalid quantity_shipped for item ${order_item_id}` }, 400);
    }
    
    const dbItem = orderWithDetails.items.find(i => i.id === order_item_id);
    if (!dbItem) {
      return c.json({ error: `Item ${order_item_id} not found in order` }, 404);
    }

    if (dbItem.is_production_done !== 1) {
      return c.json({ error: `Item ${dbItem.id} is not marked as production done` }, 400);
    }

    const maxAllowed = dbItem.quantity_ordered - (totalShippedMap[order_item_id] || 0);
    if (quantity_shipped > maxAllowed) {
      return c.json({ 
        error: `Quantity to ship (${quantity_shipped}) exceeds remaining unshipped quantity (${maxAllowed}) for item ${dbItem.id}` 
      }, 400);
    }
  }

  const batchId = crypto.randomUUID();

  // Insert batch
  await db.insert(shipmentBatches).values({
    id: batchId,
    order_id,
    batch_number: batchNumber,
    notes: notes || null,
    status: 'pending',
    created_by: user.id,
    created_at: new Date().toISOString()
  } as any);

  // Insert batch items
  for (const requestedItem of items) {
    const { order_item_id, quantity_shipped } = requestedItem;
    await db.insert(shipmentBatchItems).values({
      id: crypto.randomUUID(),
      batch_id: batchId,
      order_item_id,
      quantity_shipped,
      created_at: new Date().toISOString()
    });
  }

  return c.json({ success: true, batchId, batchNumber });
});

// PATCH /api/v1/shipments/:batchId
shipmentsRouter.patch('/:batchId', rbacMiddleware(['owner', 'admin']), async (c) => {
  const batchId = c.req.param('batchId');
  const { status, shipping_address } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });

  const existingBatch = await db.select().from(shipmentBatches).where(eq(shipmentBatches.id, batchId)).get();
  if (!existingBatch) {
    return c.json({ error: 'Shipment batch not found' }, 404);
  }

  const updateData: any = {};
  if (status) {
    updateData.status = status;
  }
  if (shipping_address !== undefined) {
    updateData.shipping_address = shipping_address;
  }

  await db.update(shipmentBatches).set(updateData).where(eq(shipmentBatches.id, batchId));

  return c.json({ success: true });
});

export default shipmentsRouter;
