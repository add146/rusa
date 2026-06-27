import { createMiddleware } from 'hono/factory';
import { getAuthUser } from './auth';

export const rbacMiddleware = (allowedRoles: string[]) => {
  return createMiddleware(async (c, next) => {
    const user = getAuthUser(c);
    
    if (!user || !allowedRoles.includes(user.role)) {
      return c.json({ error: 'Forbidden: Insufficient permissions' }, 403);
    }
    
    await next();
  });
};
