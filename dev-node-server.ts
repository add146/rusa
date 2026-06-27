import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './src/api/db/schema';
import apiApp from './src/api/index';
import fs from 'node:fs';

// Initialize SQLite
const sqlite = new Database('local.db');
const db = drizzle(sqlite, { schema });

// Helper to run raw SQL (for seeding/migrations)
function runMigrations() {
    console.log('Running migrations...');
    try {
        sqlite.prepare('SELECT 1 FROM users LIMIT 1').get();
        console.log('Database already exists.');
    } catch (e) {
        console.log('Creating tables...');
        if (fs.existsSync('src/api/db/migrations/0000_thin_justice.sql')) {
            const sql = fs.readFileSync('src/api/db/migrations/0000_thin_justice.sql', 'utf8');
            sqlite.exec(sql);
        }
        if (fs.existsSync('seed_data_utf8.sql')) {
            const sql = fs.readFileSync('seed_data_utf8.sql', 'utf8');
            sqlite.exec(sql);
        }
    }
}

// Mock D1 Binding
const d1Mock = {
    prepare: (sql) => {
        const stmt = sqlite.prepare(sql);
        const createStatement = (boundStmt) => ({
            bind: (...args) => createStatement(boundStmt.bind(...args)),
            all: async () => ({ results: boundStmt.all() }),
            run: async () => ({ success: boundStmt.run().changes > 0 }),
            first: async () => boundStmt.get(),
            raw: async () => boundStmt.raw().all(), // Returns array of arrays
        });
        return createStatement(stmt);
    },
    batch: async (stmts) => {
        const results = [];
        for (const stmt of stmts) {
            results.push(await stmt.all()); // Simplified
        }
        return results;
    },
    exec: async (sql) => {
        sqlite.exec(sql);
        return { count: 0, duration: 0 };
    }
};

// Create a wrapper Hono app to inject bindings
const mainApp = new Hono();
mainApp.use('*', cors());
mainApp.use('*', async (c, next) => {
    c.env = {
        DB: d1Mock,
        BUCKET: {
            get: async () => null,
            put: async () => ({ key: 'mock' }),
            delete: async () => {},
        },
        JWT_SECRET: 'rusamas-super-secret-key-2026',
    };
    await next();
});

mainApp.route('/', apiApp);

runMigrations();

serve({
    fetch: mainApp.fetch,
    port: 3000
}, (info) => {
    console.log(`API Mock Server running on http://localhost:${info.port}`);
});
