import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc, and } from 'drizzle-orm';
import { payments, orders, users } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';
import { sendAutoWAMessage } from '../utils/waTriggers';
import * as schema from '../db/schema';

const paymentsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

paymentsRouter.use('*', authMiddleware);
paymentsRouter.use('*', auditMiddleware);

// GET /api/v1/payments - List payments with status filter (Admin/Owner)
paymentsRouter.get('/', rbacMiddleware(['owner', 'admin']), async (c) => {
  const status = c.req.query('status');
  const db = drizzle(c.env.DB, { schema });
  
  let whereClause = undefined;
  if (status && status !== 'all') {
    whereClause = eq(payments.status, status);
  }

  const result = await db.query.payments.findMany({
    where: whereClause,
    with: {
      order: {
        with: {
          client: true,
        }
      }
    },
    orderBy: [desc(payments.created_at)],
  });
  return c.json(result);
});

// For backward compatibility
paymentsRouter.get('/pending', rbacMiddleware(['owner', 'admin']), async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.payments.findMany({
    where: eq(payments.status, 'pending'),
    with: {
      order: { with: { client: true } }
    },
    orderBy: [desc(payments.created_at)],
  });
  return c.json(result);
});

// POST /api/v1/payments - Submit proof of payment (Sales)
paymentsRouter.post('/', async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  const newPayment = {
    ...body,
    id: crypto.randomUUID(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };
  
  await db.insert(payments).values(newPayment);
  return c.json(newPayment, 201);
});

// PUT /api/v1/payments/:id/verify - Verify payment (Admin/Owner)
paymentsRouter.put('/:id/verify', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const user = getAuthUser(c);
  const { status, notes } = await c.req.json();
  
  const db = drizzle(c.env.DB, { schema });
  
  const paymentData = await (db.query.payments as any).findFirst({
    where: eq(payments.id, id),
    with: {
      order: {
        with: { client: true }
      }
    }
  });

  if (!paymentData) return c.json({ error: 'Payment not found' }, 404);

  await db.update(payments).set({
    status,
    verified_by: user.id,
    verified_at: new Date().toISOString(),
    notes: notes || paymentData.notes,
  }).where(eq(payments.id, id));

  if (status === 'verified') {
    // Update order status if DP
    if (paymentData.type === 'dp' && paymentData.order_id) {
      await db.update(orders).set({ 
        status: 'locked',
        locked_at: new Date().toISOString() 
      }).where(eq(orders.id, paymentData.order_id));

      // Notify all production staff
      const productionStaff = await db.select().from(users)
        .where(and(eq(users.role, 'produksi'), eq(users.is_active, 1)));
      
      for (const staff of productionStaff) {
        if (staff.phone) {
          const msg = `📋 Antrean Baru! Pesanan ${paymentData.order.order_number} dari ${paymentData.order.client.company_name} telah masuk ke antrean produksi. Silakan cek Monitor Produksi.`;
          await sendAutoWAMessage(c.env.DB, staff.phone, msg);
        }
      }
    }

    // SEND WA NOTIFICATION
    if (paymentData.order && paymentData.order.client) {
      const client = paymentData.order.client;
      if (client.pic_phone) {
        const msg = `Halo ${client.pic_name}, pembayaran ${paymentData.type.toUpperCase()} untuk pesanan ${paymentData.order.order_number} telah kami VERIFIKASI. Terima kasih!`;
        await sendAutoWAMessage(c.env.DB, client.pic_phone, msg);
      }
    }
  }
  
  return c.json({ success: true });
});

export default paymentsRouter;
