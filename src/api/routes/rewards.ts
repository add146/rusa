import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { rewardProducts, rewardOrders, users } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

const rewardsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

rewardsRouter.use('*', authMiddleware);

// GET /api/v1/rewards/products - List active products
rewardsRouter.get('/products', async (c) => {
  const db = drizzle(c.env.DB);
  const products = await db.select().from(rewardProducts)
    .where(eq(rewardProducts.is_active, 1))
    .orderBy(rewardProducts.price_points)
    .all();
  return c.json(products);
});

// POST /api/v1/rewards/redeem - Redeem points for a product
rewardsRouter.post('/redeem', async (c) => {
  const user = getAuthUser(c);
  const { product_id, quantity = 1 } = await c.req.json();
  const db = drizzle(c.env.DB);

  // 1. Get product
  const product = await db.select().from(rewardProducts)
    .where(eq(rewardProducts.id, product_id))
    .get();

  if (!product || product.is_active === 0) {
    return c.json({ error: 'Produk tidak ditemukan atau tidak aktif' }, 404);
  }

  if (product.stock === null || product.stock < quantity) {
    return c.json({ error: 'Stok tidak mencukupi' }, 400);
  }

  const totalCost = product.price_points * quantity;

  // 2. Get user balance
  const userRecord = await db.select({ points_balance: users.points_balance })
    .from(users).where(eq(users.id, user.id)).get();

  if (!userRecord || userRecord.points_balance === null || userRecord.points_balance < totalCost) {
    return c.json({ error: 'Poin tidak mencukupi' }, 400);
  }

  // 3. Process Transaction
  const orderId = crypto.randomUUID();
  const currentBalance = userRecord.points_balance || 0;
  const newBalance = currentBalance - totalCost;

  // Manual transaction sequence since D1 batch is preferred for complex ops
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE users SET points_balance = points_balance - ? WHERE id = ?').bind(totalCost, user.id),
    c.env.DB.prepare('UPDATE reward_products SET stock = stock - ? WHERE id = ?').bind(quantity, product_id),
    c.env.DB.prepare('INSERT INTO reward_orders (id, user_id, product_id, product_name, quantity, total_points, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(orderId, user.id, product_id, product.name, quantity, totalCost, 'pending'),
    c.env.DB.prepare('INSERT INTO points_ledger (id, user_id, transaction_type, amount, reference_type, reference_id, description, balance_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), user.id, 'redeem', -totalCost, 'reward_redeem', orderId, `Tukar reward: ${product.name}`, newBalance)
  ]);

  return c.json({ success: true, new_balance: newBalance });
});

// GET /api/v1/rewards/orders - My redemption history
rewardsRouter.get('/orders', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const orders = await db.select().from(rewardOrders)
    .where(eq(rewardOrders.user_id, user.id))
    .orderBy(desc(rewardOrders.created_at))
    .all();
  return c.json(orders);
});

// ADMIN ROUTES
const adminOnly = rbacMiddleware(['owner', 'admin']);

// POST /api/v1/rewards/products - Add product
rewardsRouter.post('/products', adminOnly, async (c) => {
  const user = getAuthUser(c);
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  const id = crypto.randomUUID();
  await db.insert(rewardProducts).values({
    id,
    ...body,
    created_by: user.id
  });
  
  return c.json({ success: true, id });
});

// PUT /api/v1/rewards/products/:id - Update product
rewardsRouter.put('/products/:id', adminOnly, async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(rewardProducts).set(body).where(eq(rewardProducts.id, id));
  return c.json({ success: true });
});

// PATCH /api/v1/rewards/orders/:id - Update status
rewardsRouter.patch('/orders/:id', adminOnly, async (c) => {
  const { id } = c.req.param();
  const { status } = await c.req.json();
  const db = drizzle(c.env.DB);
  
  await db.update(rewardOrders).set({ status }).where(eq(rewardOrders.id, id));
  return c.json({ success: true });
});
// GET /api/v1/rewards/orders/all - All orders (Admin view)
rewardsRouter.get('/orders/all', adminOnly, async (c) => {
  const db = drizzle(c.env.DB);
  const orders = await db.select().from(rewardOrders)
    .orderBy(desc(rewardOrders.created_at))
    .all();
  return c.json(orders);
});

export default rewardsRouter;
