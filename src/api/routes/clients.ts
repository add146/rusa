import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { clients } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';

const clientsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

// Apply global middlewares to all routes in this router
clientsRouter.use('*', authMiddleware);
clientsRouter.use('*', auditMiddleware);

// GET /api/v1/clients - List all clients
clientsRouter.get('/', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  
  if (user.role === 'sales') {
    const result = await db.select().from(clients)
      .where(eq(clients.created_by, user.id))
      .orderBy(desc(clients.created_at));
    return c.json(result);
  }
  
  const result = await db.select().from(clients).orderBy(desc(clients.created_at));
  return c.json(result);
});

// GET /api/v1/clients/:id - Get detail
clientsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  const result = await db.select().from(clients).where(eq(clients.id, id)).get();
  
  if (!result) return c.json({ error: 'Client not found' }, 404);
  return c.json(result);
});

// POST /api/v1/clients - Create (Owner, Admin, Sales)
clientsRouter.post('/', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  const newClient = {
    ...body,
    id: crypto.randomUUID(),
    created_by: user.id,
    created_at: new Date().toISOString(),
  };
  
  await db.insert(clients).values(newClient);
  return c.json(newClient, 201);
});

// POST /api/v1/clients/bulk-import
clientsRouter.post('/bulk-import', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const user = getAuthUser(c);
  const { clients: clientsData } = await c.req.json();
  if (!clientsData || !Array.isArray(clientsData)) {
    return c.json({ error: 'clients array is required' }, 400);
  }
  const db = drizzle(c.env.DB);

  let imported = 0;
  const chunks = [];
  for (let i = 0; i < clientsData.length; i += 50) {
    chunks.push(clientsData.slice(i, i + 50));
  }

  for (const chunk of chunks) {
    const values = chunk.map((item: any) => ({
      id: crypto.randomUUID(),
      company_name: item.company_name,
      pic_name: item.pic_name,
      pic_phone: item.pic_phone || null,
      pic_email: item.pic_email || null,
      owner_name: item.owner_name || null,
      address: item.address || null,
      city: item.city || null,
      notes: item.notes || null,
      created_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    await db.insert(clients).values(values).run();
    imported += chunk.length;
  }

  return c.json({ imported, success: true });
});

// PUT /api/v1/clients/:id - Update
clientsRouter.put('/:id', rbacMiddleware(['owner', 'admin', 'sales']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(clients).set(body).where(eq(clients.id, id));
  return c.json({ success: true });
});

// DELETE /api/v1/clients/:id - Delete (Owner, Admin only)
clientsRouter.delete('/:id', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  await db.delete(clients).where(eq(clients.id, id));
  return c.json({ success: true });
});

export default clientsRouter;
