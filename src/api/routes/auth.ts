import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq, desc } from 'drizzle-orm';
import { sign } from 'hono/jwt';
import { compare } from 'bcryptjs';
import { authMiddleware } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import * as schema from '../db/schema';

const auth = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });
  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (!user || !(await compare(password, user.password_hash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  if (!user.is_active) {
    return c.json({ error: 'User account is inactive' }, 403);
  }

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const token = await sign(payload, c.env.JWT_SECRET);
  
  // Update last login
  await db.update(schema.users).set({ last_login_at: new Date().toISOString() }).where(eq(schema.users.id, user.id));

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      avatar_url: user.avatar_url
    }
  });
});

auth.post('/register', authMiddleware, rbacMiddleware(['owner', 'admin']), async (c) => {
  const { email, password, full_name, role, phone } = await c.req.json();
  
  if (!email || !password || !full_name || !role) {
    return c.json({ error: 'Email, password, full name, and role are required' }, 400);
  }

  const db = drizzle(c.env.DB, { schema });
  
  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existing) {
    return c.json({ error: 'User with this email already exists' }, 409);
  }

  const { hash } = await import('bcryptjs');
  const password_hash = await hash(password, 10);

  const newUser = {
    id: crypto.randomUUID(),
    email,
    password_hash,
    full_name,
    role,
    phone,
    is_active: 1,
  };

  await db.insert(schema.users).values(newUser);

  return c.json({
    message: 'User created successfully',
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.full_name
    }
  }, 201);
});

auth.get('/me', async (c) => {
  const payload = c.get('jwtPayload' as any);
  return c.json({ user: payload });
});

// GET /api/v1/auth/users - List all users (Admin/Owner)
auth.get('/users', authMiddleware, rbacMiddleware(['owner', 'admin']), async (c) => {
  const db = drizzle(c.env.DB, { schema });
  const result = await db.query.users.findMany({
    orderBy: [desc(schema.users.created_at)],
  });
  return c.json(result);
});

auth.patch('/users/:id', authMiddleware, rbacMiddleware(['owner', 'admin']), async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();
  
  const db = drizzle(c.env.DB, { schema });
  
  const updateData: any = {};
  if (data.email) updateData.email = data.email;
  if (data.full_name) updateData.full_name = data.full_name;
  if (data.role) updateData.role = data.role;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.is_active !== undefined) updateData.is_active = data.is_active ? 1 : 0;
  
  if (data.password) {
    const { hash } = await import('bcryptjs');
    updateData.password_hash = await hash(data.password, 10);
  }

  updateData.updated_at = new Date().toISOString();

  await db.update(schema.users).set(updateData).where(eq(schema.users.id, id));

  return c.json({ message: 'User updated successfully' });
});

export default auth;
