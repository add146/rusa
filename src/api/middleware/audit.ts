import { createMiddleware } from 'hono/factory';
import { drizzle } from 'drizzle-orm/d1';
import { auditTrail } from '../db/schema';
import { getAuthUser } from './auth';

export const auditMiddleware = createMiddleware(async (c, next) => {
  const method = c.req.method;
  const url = c.req.url;
  
  // We only log mutations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    await next();
    
    try {
      const user = getAuthUser(c);
      const db = drizzle(c.env.DB);
      
      await db.insert(auditTrail).values({
        id: crypto.randomUUID(),
        user_id: user?.id || 'system',
        action: method,
        entity_type: 'API_REQUEST',
        entity_id: url,
        new_data: `Status: ${c.res.status}`,
        ip_address: c.req.header('cf-connecting-ip') || 'unknown',
        user_agent: c.req.header('user-agent') || 'unknown',
      });
    } catch (e) {
      console.error('Audit logging failed', e);
    }
  } else {
    await next();
  }
});
