import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { sql, eq, and } from 'drizzle-orm';
import { orders, clients, products, orderItems, payments } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';

const statsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

statsRouter.use('*', authMiddleware);
statsRouter.use('*', rbacMiddleware(['owner', 'admin', 'sales']));

// GET /api/v1/stats/summary
statsRouter.get('/summary', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  
  const isSalesOnly = user.role === 'sales';

  // Revenue: filter by sales_id if sales role
  const revenueWhere = isSalesOnly 
    ? and(eq(orders.status, 'shipped'), eq(orders.sales_id, user.id))
    : eq(orders.status, 'shipped');

  const totalRevenueResult = await db.select({ 
    sum: sql<number>`sum(${orders.total_price})` 
  }).from(orders).where(revenueWhere).get();

  const orderCountWhere = isSalesOnly ? eq(orders.sales_id, user.id) : undefined;
  const totalOrders = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(orders).where(orderCountWhere).get();

  const clientCountWhere = isSalesOnly ? eq(clients.created_by, user.id) : undefined;
  const totalClients = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(clients).where(clientCountWhere).get();

  const totalProducts = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(products).get();

  // Pending payments count
  const pendingPayments = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(payments).where(eq(payments.status, 'pending')).get();

  // Active production count
  const activeProduction = await db.select({ 
    count: sql<number>`count(*)` 
  }).from(orders).where(eq(orders.status, 'production')).get();

  return c.json({
    totalRevenue: totalRevenueResult?.sum || 0,
    orderCount: totalOrders?.count || 0,
    clientCount: totalClients?.count || 0,
    productCount: totalProducts?.count || 0,
    pendingPayments: pendingPayments?.count || 0,
    activeProduction: activeProduction?.count || 0,
  });
});

// GET /api/v1/stats/margin - Owner only
statsRouter.get('/margin', rbacMiddleware(['owner']), async (c) => {
  const db = drizzle(c.env.DB);
  
  // Calculate total profit: Sum of (unit_price - hpp_base) * quantity
  const marginResult = await db.select({
    revenue: sql<number>`sum(${orderItems.subtotal})`,
    cost: sql<number>`sum(${products.hpp_base} * ${orderItems.quantity_ordered})`,
  })
  .from(orderItems)
  .innerJoin(products, eq(orderItems.product_id, products.id))
  .get();

  const revenue = marginResult?.revenue || 0;
  const cost = marginResult?.cost || 0;
  const profit = revenue - cost;

  return c.json({
    revenue,
    cost,
    profit,
    marginPercentage: revenue > 0 ? (profit / revenue) * 100 : 0
  });
});

// GET /api/v1/stats/margin-orders - Owner only, margin per order
statsRouter.get('/margin-orders', rbacMiddleware(['owner']), async (c) => {
  const db = drizzle(c.env.DB);
  
  const result = await db.select({
    order_id: orders.id,
    order_number: orders.order_number,
    status: orders.status,
    created_at: orders.created_at,
    total_revenue: sql<number>`sum(${orderItems.subtotal})`,
    total_cost: sql<number>`sum(${products.hpp_base} * ${orderItems.quantity_ordered})`,
  })
  .from(orders)
  .innerJoin(orderItems, eq(orders.id, orderItems.order_id))
  .innerJoin(products, eq(orderItems.product_id, products.id))
  .groupBy(orders.id)
  .all();

  const ordersWithMargin = result.map(o => ({
    ...o,
    profit: o.total_revenue - o.total_cost,
    margin_pct: o.total_revenue > 0 ? ((o.total_revenue - o.total_cost) / o.total_revenue) * 100 : 0
  }));

  return c.json(ordersWithMargin);
});

export default statsRouter;
