import { drizzle } from 'drizzle-orm/d1';
import { hash } from 'bcryptjs';

// We just output the exact SQL commands that the user can run, 
// because running TS over Wrangler D1 binding can be tricky from local without proper setup.

async function generateSQL() {
  const passwordHash = await hash('password123', 10);
  
  console.log(`
-- 1. Run this SQL to insert Default Users:
INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES 
('usr-owner', 'owner@rusamas.com', '${passwordHash}', 'Pak Novel (Owner)', 'owner', 1),
('usr-admin', 'admin@rusamas.com', '${passwordHash}', 'Admin Rusamas', 'admin', 1),
('usr-sales', 'sales@rusamas.com', '${passwordHash}', 'Sales Lapangan', 'sales', 1),
('usr-produksi', 'produksi@rusamas.com', '${passwordHash}', 'Tim Produksi', 'produksi', 1);

-- 2. Run this SQL to insert Default Locations:
INSERT INTO locations (id, name, latitude, longitude, radius_meters, is_active) VALUES
('loc-pusat', 'Kantor Pusat Rusamas', -6.175392, 106.827153, 100, 1);

-- 3. Run this SQL to insert Default Settings:
INSERT INTO settings (id, key, value) VALUES 
('set-1', 'company_name', 'Rusamas ERP'),
('set-2', 'default_dp_percentage', '50'),
('set-3', 'wa_enabled', '1');
`);
}

generateSQL();
