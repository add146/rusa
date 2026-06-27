import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { clientAddresses } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';

const clientAddressesRouter = new Hono<{ Bindings: { DB: D1Database } }>();

clientAddressesRouter.use('*', authMiddleware);
clientAddressesRouter.use('*', auditMiddleware);

// GET /api/v1/client-addresses?client_id=xxx
clientAddressesRouter.get('/', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'client_id query parameter is required' }, 400);
  }
  const db = drizzle(c.env.DB);
  const result = await db.select().from(clientAddresses)
    .where(eq(clientAddresses.client_id, clientId))
    .all();
  return c.json(result);
});

// POST /api/v1/client-addresses
clientAddressesRouter.post('/', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const { client_id, label, address, city, is_default } = await c.req.json();
  if (!client_id || !label || !address) {
    return c.json({ error: 'client_id, label, and address are required' }, 400);
  }
  const db = drizzle(c.env.DB);
  const id = crypto.randomUUID();

  // If setting as default, unset other defaults for this client
  if (is_default) {
    await db.update(clientAddresses)
      .set({ is_default: 0, updated_at: new Date().toISOString() })
      .where(eq(clientAddresses.client_id, client_id))
      .run();
  }

  const newAddress = {
    id,
    client_id,
    label,
    address,
    city: city || null,
    is_default: is_default ? 1 : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await db.insert(clientAddresses).values(newAddress).run();
  return c.json(newAddress, 201);
});

// PUT /api/v1/client-addresses/:id
clientAddressesRouter.put('/:id', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const id = c.req.param('id');
  const { label, address, city, is_default, client_id } = await c.req.json();
  const db = drizzle(c.env.DB);

  // If setting as default, unset other defaults for this client
  if (is_default && client_id) {
    await db.update(clientAddresses)
      .set({ is_default: 0, updated_at: new Date().toISOString() })
      .where(eq(clientAddresses.client_id, client_id))
      .run();
  }

  await db.update(clientAddresses).set({
    label,
    address,
    city,
    is_default: is_default !== undefined ? (is_default ? 1 : 0) : undefined,
    updated_at: new Date().toISOString()
  }).where(eq(clientAddresses.id, id)).run();

  return c.json({ success: true });
});

// DELETE /api/v1/client-addresses/:id
clientAddressesRouter.delete('/:id', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  await db.delete(clientAddresses).where(eq(clientAddresses.id, id)).run();
  return c.json({ success: true });
});

export default clientAddressesRouter;
