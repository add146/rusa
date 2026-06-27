import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { products } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';

const productsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

productsRouter.use('*', authMiddleware);
productsRouter.use('*', auditMiddleware);

// GET /api/v1/products - List all products
productsRouter.get('/', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const result = await db.select().from(products).orderBy(desc(products.created_at));
  
  // Strip HPP if not owner
  const filtered = result.map(p => {
    if (user.role !== 'owner') {
      const { hpp_base, ...rest } = p;
      return rest;
    }
    return p;
  });
  
  return c.json(filtered);
});

// GET /api/v1/products/:id
productsRouter.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const result = await db.select().from(products).where(eq(products.id, id)).get();
  
  if (!result) return c.json({ error: 'Product not found' }, 404);
  
  if (user.role !== 'owner') {
    const { hpp_base, ...rest } = result;
    return c.json(rest);
  }
  
  return c.json(result);
});

// POST /api/v1/products - Create (Owner, Admin only)
productsRouter.post('/', rbacMiddleware(['owner', 'admin']), async (c) => {
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  const newProduct = {
    ...body,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  
  await db.insert(products).values(newProduct);
  return c.json(newProduct, 201);
});

// PUT /api/v1/products/:id
productsRouter.put('/:id', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(products).set(body).where(eq(products.id, id));
  return c.json({ success: true });
});

// DELETE /api/v1/products/:id
productsRouter.delete('/:id', rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const db = drizzle(c.env.DB);
  
  await db.delete(products).where(eq(products.id, id));
  return c.json({ success: true });
});

export default productsRouter;
