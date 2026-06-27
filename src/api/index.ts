import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import clients from './routes/clients';
import products from './routes/products';
import orders from './routes/orders';
import payments from './routes/payments';
import production from './routes/production';
import settings from './routes/settings';
import attendance from './routes/attendance';
import locations from './routes/locations';
import visits from './routes/visits';
import stats from './routes/stats';
import returns from './routes/returns';
import uploads from './routes/uploads';
import gamification from './routes/gamification';
import rewards from './routes/rewards';
import pointRules from './routes/pointRules';
import clientAddresses from './routes/clientAddresses';
import design from './routes/design';
import shipments from './routes/shipments';
import { handleCronReminders } from './utils/reminderCron';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ASSETS: any; // Use any for maximum compatibility during fetch
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api/v1');

app.use('*', cors());

// Routes
app.route('/auth', auth);
app.route('/clients', clients);
app.route('/products', products);
app.route('/orders', orders);
app.route('/payments', payments);
app.route('/production', production);
app.route('/settings', settings);
app.route('/attendance', attendance);
app.route('/locations', locations);
app.route('/visits', visits);
app.route('/stats', stats);
app.route('/returns', returns);
app.route('/uploads', uploads);
app.route('/gamification', gamification);
app.route('/rewards', rewards);
app.route('/point-rules', pointRules);
app.route('/client-addresses', clientAddresses);
app.route('/design', design);
app.route('/shipments', shipments);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Root redirect or info
app.get('/', (c) => c.json({ name: 'Rusamas ERP API', version: '1.0.0' }));

// IMPORTANT: Export as a fetch handler that falls back to assets
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const url = new URL(request.url);
    
    // 1. Jalankan API kalau path mulai dengan /api/v1
    if (url.pathname.startsWith('/api/v1')) {
      return app.fetch(request, env, ctx);
    }
    
    // 2. Jalankan Assets kalau ada binding ASSETS (Cloudflare Pages/Workers Assets)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      try {
        let response = await env.ASSETS.fetch(request);
        
        // SPA Fallback: Jika file tidak ditemukan (404) dan method GET, kembalikan index.html
        if (response.status === 404 && request.method === 'GET') {
          const indexReq = new Request(new URL('/', request.url), request);
          response = await env.ASSETS.fetch(indexReq);
        }
        
        return response;
      } catch (err) {
        console.error('Assets Fetch Error:', err);
      }
    }
    
    // 3. Kalau semua gagal, kembalikan Not Found yang sopan (bukan 1101)
    return new Response("Rusamas ERP - Page Not Found or Assets Not Ready", { status: 404 });
  },

  async scheduled(_event: any, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(handleCronReminders(env.DB));
  }
};
