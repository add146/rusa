import { jwt } from 'hono/jwt';
import { createMiddleware } from 'hono/factory';

export const authMiddleware = createMiddleware(async (c, next) => {
  const jwtMiddleware = jwt({
    secret: c.env.JWT_SECRET,
    alg: 'HS256',
  });
  return jwtMiddleware(c, next);
});

export const getAuthUser = (c: any) => {
  return c.get('jwtPayload');
};
