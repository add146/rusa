import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { settings } from '../db/schema';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { rbacMiddleware } from '../middleware/rbac';
import { auditMiddleware } from '../middleware/audit';
import { whatsappService } from '../services/whatsappService';

const settingsRouter = new Hono<{ Bindings: { DB: D1Database } }>();

settingsRouter.use('*', authMiddleware);
settingsRouter.use('*', auditMiddleware);
settingsRouter.use('*', rbacMiddleware(['owner', 'admin']));

// GET /api/v1/settings - List all settings
settingsRouter.get('/', async (c) => {
  const db = drizzle(c.env.DB);
  const result = await db.select().from(settings);
  return c.json(result);
});

// POST /api/v1/settings/bulk - Bulk update/insert
settingsRouter.post('/bulk', async (c) => {
  const body = await c.req.json(); // Array of { key, value }
  const db = drizzle(c.env.DB);
  const user = getAuthUser(c);

  for (const item of body) {
    const existing = await db.select().from(settings).where(eq(settings.key, item.key)).get();
    
    if (existing) {
      await db.update(settings).set({ 
        value: item.value,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }).where(eq(settings.key, item.key));
    } else {
      await db.insert(settings).values({
        id: crypto.randomUUID(),
        key: item.key,
        value: item.value,
        updated_by: user.id,
      });
    }
  }

  return c.json({ success: true });
});

// Helper to get WA config
async function getWAConfig(db: any) {
  const allSettings = await db.select().from(settings);
  return {
    baseUrl: allSettings.find((s: any) => s.key === 'wa_base_url')?.value,
    apiKey: allSettings.find((s: any) => s.key === 'wa_api_key')?.value,
    instanceName: allSettings.find((s: any) => s.key === 'wa_instance_name')?.value,
  };
}

// GET /api/v1/settings/wa/status - Check connection status
settingsRouter.get('/wa/status', async (c) => {
  const db = drizzle(c.env.DB);
  const config = await getWAConfig(db);

  if (!config.baseUrl || !config.apiKey || !config.instanceName) {
    return c.json({ error: 'WhatsApp config incomplete' }, 400);
  }

  try {
    const response = await fetch(`${config.baseUrl}/instance/connectionState/${config.instanceName}`, {
      headers: { 'apikey': config.apiKey }
    });
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Failed to connect to Evolution API' }, 500);
  }
});

// GET /api/v1/settings/wa/qr - Generate QR Code
settingsRouter.get('/wa/qr', async (c) => {
  const db = drizzle(c.env.DB);
  const config = await getWAConfig(db);

  if (!config.baseUrl || !config.apiKey || !config.instanceName) {
    return c.json({ error: 'WhatsApp config incomplete' }, 400);
  }

  try {
    const response = await fetch(`${config.baseUrl}/instance/connect/${config.instanceName}`, {
      headers: { 'apikey': config.apiKey }
    });
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Failed to fetch QR from Evolution API' }, 500);
  }
});

// POST /api/v1/settings/wa/test - Send test message
settingsRouter.post('/wa/test', async (c) => {
  const { number, message } = await c.req.json();
  const db = drizzle(c.env.DB);
  const config = await getWAConfig(db);

  if (!config.baseUrl || !config.apiKey || !config.instanceName) {
    return c.json({ error: 'WhatsApp config incomplete' }, 400);
  }

  const result = await whatsappService.sendMessage({
    ...config,
    number,
    text: message,
  });

  return c.json(result);
});

// POST /api/v1/settings/wa/logout - Disconnect/Logout WhatsApp
settingsRouter.post('/wa/logout', async (c) => {
  const db = drizzle(c.env.DB);
  const config = await getWAConfig(db);

  if (!config.baseUrl || !config.apiKey || !config.instanceName) {
    return c.json({ error: 'WhatsApp config incomplete' }, 400);
  }

  const result = await whatsappService.logout(config as any);
  return c.json(result);
});

export default settingsRouter;
