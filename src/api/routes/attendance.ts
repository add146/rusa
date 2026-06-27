import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, and, desc } from 'drizzle-orm';
import { attendance, locations } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';
import { updateStreak } from '../services/streakService';
import { calculateAttendancePoints, calculateCheckoutPoints, awardPoints } from '../services/pointsService';

const attendanceRouter = new Hono<{ Bindings: { DB: D1Database } }>();

attendanceRouter.use('*', authMiddleware);
attendanceRouter.use('*', auditMiddleware);

// Helper: Haversine distance in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// GET /api/v1/attendance/today - Get current status
attendanceRouter.get('/today', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().split('T')[0];
  
  const result = await db.select().from(attendance)
    .where(and(eq(attendance.user_id, user.id), eq(attendance.date, today)))
    .get();
    
  return c.json(result || { status: 'none' });
});

// GET /api/v1/attendance/logs - History
attendanceRouter.get('/logs', async (c) => {
  const user = getAuthUser(c);
  const db = drizzle(c.env.DB);
  const result = await db.select().from(attendance)
    .where(eq(attendance.user_id, user.id))
    .orderBy(desc(attendance.date))
    .all();
  return c.json(result);
});

// POST /api/v1/attendance/check-in
attendanceRouter.post('/check-in', async (c) => {
  const user = getAuthUser(c);
  const { latitude, longitude, photo_url } = await c.req.json();
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // 1. Validate Geofence (Skip for sales/marketing)
  const isSales = user.role === 'sales' || user.role === 'marketing';
  let isWithinRange = false;
  let locationId: string | null = null;

  if (isSales) {
    isWithinRange = true; // Field workers can check-in anywhere
  } else {
    const allowedLocations = await db.select().from(locations).where(eq(locations.is_active, 1)).all();
    for (const loc of allowedLocations) {
      const dist = getDistance(latitude, longitude, loc.latitude, loc.longitude);
      if (dist <= (loc.radius_meters ?? 100)) {
        isWithinRange = true;
        locationId = loc.id;
        break;
      }
    }
  }

  if (!isWithinRange) {
    return c.json({ error: 'Anda di luar jangkauan lokasi absen!' }, 400);
  }

  // 2. Logic Points with Streak Multiplier
  const deadline = new Date();
  deadline.setHours(8, 15, 0); 
  const isOnTime = now <= deadline;
  
  // Get streak and multiplier
  const { multiplier } = await updateStreak(user.id, c.env.DB);
  const points = calculateAttendancePoints(isOnTime, multiplier);

  const newRecord = {
    id: crypto.randomUUID(),
    user_id: user.id,
    location_id: locationId,
    type: isSales ? 'field' : 'office',
    date: today,
    check_in_at: now.toISOString(),
    check_in_lat: latitude,
    check_in_lng: longitude,
    face_photo_url: photo_url,
    points_earned: points,
    is_on_time: isOnTime ? 1 : 0,
  };

  await db.insert(attendance).values(newRecord);
  
  // Award points to ledger
  await awardPoints(user.id, points, 'attendance', newRecord.id, 
    `Check-in ${isOnTime ? 'tepat waktu' : 'terlambat'} (${multiplier}x streak)`, c.env.DB);

  return c.json({ ...newRecord, streak_multiplier: multiplier });
});

// POST /api/v1/attendance/check-out
attendanceRouter.post('/check-out', async (c) => {
  const user = getAuthUser(c);
  const { latitude, longitude } = await c.req.json();
  const db = drizzle(c.env.DB);
  const today = new Date().toISOString().split('T')[0];
  
  const now = new Date();
  const currentStatus = await db.select().from(attendance)
    .where(and(eq(attendance.user_id, user.id), eq(attendance.date, today)))
    .get();

  if (currentStatus) {
    await db.update(attendance).set({
      check_out_at: now.toISOString(),
      check_out_lat: latitude,
      check_out_lng: longitude,
    }).where(and(eq(attendance.user_id, user.id), eq(attendance.date, today)));

    // Full day bonus check
    const bonusPoints = calculateCheckoutPoints(currentStatus.check_in_at, now.toISOString(), 1);
    if (bonusPoints > 0) {
      await awardPoints(user.id, bonusPoints, 'attendance', currentStatus.id,
        'Bonus hari penuh (≥8 jam kerja)', c.env.DB);
    }
  }

  return c.json({ success: true });
});

export default attendanceRouter;
