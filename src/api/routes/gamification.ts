import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc, sql } from 'drizzle-orm';
import { users, attendance, pointsLedger, userStreaks } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';

const gamificationRouter = new Hono<{ Bindings: { DB: D1Database } }>();

gamificationRouter.use('*', authMiddleware);

// GET /api/v1/gamification/my-stats
gamificationRouter.get('/my-stats', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  
  const userRecord = await db.select({
    points_balance: users.points_balance
  }).from(users).where(eq(users.id, user.id)).get();

  const streakRecord = await db.select().from(userStreaks).where(eq(userStreaks.user_id, user.id)).get();

  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  // Attendance count this month
  const attendanceThisMonth = await db.select({
    count: sql<number>`count(distinct date)`
  }).from(attendance)
    .where(and(eq(attendance.user_id, user.id), sql`created_at >= ${firstDayOfMonth}`))
    .get();

  // Points earned this month
  const pointsThisMonth = await db.select({
    total: sql<number>`sum(amount)`
  }).from(pointsLedger)
    .where(and(
      eq(pointsLedger.user_id, user.id), 
      eq(pointsLedger.transaction_type, 'earn'),
      sql`created_at >= ${firstDayOfMonth}`
    ))
    .get();

  return c.json({
    points_balance: userRecord?.points_balance || 0,
    current_streak: streakRecord?.current_streak || 0,
    longest_streak: streakRecord?.longest_streak || 0,
    streak_multiplier: streakRecord?.streak_multiplier || 1.0,
    attendance_this_month: attendanceThisMonth?.count || 0,
    points_this_month: pointsThisMonth?.total || 0,
  });
});

// GET /api/v1/gamification/leaderboard
gamificationRouter.get('/leaderboard', async (c) => {
  const db = drizzle(c.env.DB);
  const period = c.req.query('period') || 'all_time';

  let query;
  if (period === 'all_time') {
    query = db.select({
      id: users.id,
      full_name: users.full_name,
      avatar_url: users.avatar_url,
      points: users.points_balance,
      role: users.role
    }).from(users)
      .where(sql`role != 'owner' AND is_active = 1`)
      .orderBy(desc(users.points_balance))
      .limit(10);
  } else {
    // For weekly/monthly, we sum from points_ledger
    const dateLimit = period === 'weekly' ? "'-7 days'" : "'-30 days'";
    query = db.select({
      id: users.id,
      full_name: users.full_name,
      avatar_url: users.avatar_url,
      points: sql<number>`sum(${pointsLedger.amount})`,
      role: users.role
    }).from(users)
      .innerJoin(pointsLedger, eq(users.id, pointsLedger.user_id))
      .where(and(
        sql`users.role != 'owner'`,
        eq(pointsLedger.transaction_type, 'earn'),
        sql`points_ledger.created_at >= datetime('now', ${sql.raw(dateLimit)})`
      ))
      .groupBy(users.id)
      .orderBy(desc(sql`sum(${pointsLedger.amount})`))
      .limit(10);
  }

  const results = await query.all();
  return c.json(results);
});

// GET /api/v1/gamification/points-history
gamificationRouter.get('/points-history', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const results = await db.select().from(pointsLedger)
    .where(eq(pointsLedger.user_id, user.id))
    .orderBy(desc(pointsLedger.created_at))
    .limit(50)
    .all();
  return c.json(results);
});

export default gamificationRouter;
