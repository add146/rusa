
-- 1. Run this SQL to insert Default Users:
INSERT INTO users (id, email, password_hash, full_name, role, is_active) VALUES 
('usr-owner', 'owner@rusamas.com', '$2b$10$IHooBKLX045BuhDd.MJs3.ALQAoMKASZfW5c6IsQPB22kTAdS/5ca', 'Pak Novel (Owner)', 'owner', 1),
('usr-admin', 'admin@rusamas.com', '$2b$10$IHooBKLX045BuhDd.MJs3.ALQAoMKASZfW5c6IsQPB22kTAdS/5ca', 'Admin Rusamas', 'admin', 1),
('usr-sales', 'sales@rusamas.com', '$2b$10$IHooBKLX045BuhDd.MJs3.ALQAoMKASZfW5c6IsQPB22kTAdS/5ca', 'Sales Lapangan', 'sales', 1),
('usr-produksi', 'produksi@rusamas.com', '$2b$10$IHooBKLX045BuhDd.MJs3.ALQAoMKASZfW5c6IsQPB22kTAdS/5ca', 'Tim Produksi', 'produksi', 1);

-- 2. Run this SQL to insert Default Locations:
INSERT INTO locations (id, name, latitude, longitude, radius_meters, is_active) VALUES
('loc-pusat', 'Kantor Pusat Rusamas', -6.175392, 106.827153, 100, 1);

-- 3. Run this SQL to insert Default Settings:
INSERT INTO settings (id, key, value) VALUES 
('set-1', 'company_name', 'Rusamas ERP'),
('set-2', 'default_dp_percentage', '50'),
('set-3', 'wa_enabled', '1');

