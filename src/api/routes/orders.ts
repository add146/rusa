import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, ne, and, or } from 'drizzle-orm';
import { orders, orderItems } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import { sendAutoWAMessage } from '../utils/waTriggers';
import * as schema from '../db/schema';

const ordersRouter = new Hono<{ Bindings: { DB: D1Database } }>();

ordersRouter.use('*', authMiddleware);
ordersRouter.use('*', auditMiddleware);

// GET /api/v1/orders
ordersRouter.get('/', async (c) => {
  const status = c.req.query('status');
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB, { schema });
  
  let whereClause = undefined;
  if (status === 'archived') {
    whereClause = or(eq(orders.status, 'completed'), eq(orders.status, 'cancelled'));
  } else {
    whereClause = and(
      ne(orders.status, 'completed'), 
      ne(orders.status, 'cancelled')
    );
  }

  // Filter by sales_id if user is sales
  if (user.role === 'sales') {
    whereClause = and(whereClause, eq(orders.sales_id, user.id));
  }

  const result = await db.query.orders.findMany({
    where: whereClause,
    with: {
      client: true,
      sales: true,
      items: {
        with: {
          product: true,
          designApproval: true,
        }
      },
      payments: true,
      shippingAddress: true,
      shipmentBatches: {
        with: {
          items: true
        }
      }
    },
    orderBy: [desc(orders.created_at)],
  });
  return c.json(result);
});

// GET /api/v1/orders/:id
ordersRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: {
      client: true,
      sales: true,
      items: {
        with: {
          product: true,
          designApproval: true,
        }
      },
      payments: true,
      shippingAddress: true,
      shipmentBatches: {
        with: {
          items: true
        }
      }
    },
  });
  
  if (!result) return c.json({ error: 'Order not found' }, 404);
  return c.json(result);
});

// POST /api/v1/orders - Create Order with Items
ordersRouter.post('/', async (c) => {
  const user = getAuthUser(c);
  const { items, ...orderData } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });
  
  const orderId = crypto.randomUUID();
  const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
  
  const newOrder = {
    ...orderData,
    id: orderId,
    order_number: orderNumber,
    sales_id: user.id,
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  
  await db.insert(orders).values(newOrder);
  
  if (items && items.length > 0) {
    const newItems = items.map((item: any) => ({
      ...item,
      id: crypto.randomUUID(),
      order_id: orderId,
    }));
    await db.insert(orderItems).values(newItems);
  }
  
  return c.json({ id: orderId, order_number: orderNumber }, 201);
});

// PUT /api/v1/orders/:id - Update status/details
ordersRouter.put('/:id', async (c) => {
  const id = c.req.param('id');
  const { items, ...body } = await c.req.json();
  const db = drizzle(c.env.DB, { schema });
  
  await db.update(orders).set({
    ...body,
    updated_at: new Date().toISOString()
  }).where(eq(orders.id, id));

  // Update order items if provided
  if (items) {
    await db.delete(orderItems).where(eq(orderItems.order_id, id));
    if (items.length > 0) {
      const newItems = items.map((item: any) => ({
        id: crypto.randomUUID(),
        order_id: id,
        product_id: item.product_id,
        quantity_ordered: item.quantity_ordered,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        notes: item.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      await db.insert(orderItems).values(newItems);
    }
  }

  // If marking as completed, notify client
  if (body.status === 'completed') {
    const orderData = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { client: true }
    });
    if (orderData?.client?.pic_phone) {
      const msg = `Terima kasih ${orderData.client?.pic_name}! Pesanan ${orderData.order_number} telah dikonfirmasi DITERIMA. Jika ada kendala, hubungi kami segera.`;
      await sendAutoWAMessage(c.env.DB, orderData.client.pic_phone, msg);
    }
  }

  return c.json({ success: true });
});

// DELETE /api/v1/orders/:id - Delete order if status is 'pending'
ordersRouter.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB, { schema });
  
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
  });
  
  if (!order) {
    return c.json({ error: 'Order not found' }, 404);
  }
  
  // Verify permissions: Sales can only delete their own orders
  if (user.role === 'sales' && order.sales_id !== user.id) {
    return c.json({ error: 'Unauthorized' }, 403);
  }
  
  if (order.status !== 'pending') {
    return c.json({ error: 'Only pending orders can be deleted' }, 400);
  }
  
  // Delete order items first
  await db.delete(orderItems).where(eq(orderItems.order_id, id));
  await db.delete(orders).where(eq(orders.id, id));
  
  return c.json({ success: true });
});

export default ordersRouter;
