import { drizzle } from 'drizzle-orm/d1';
import { hash } from 'bcryptjs';
import * as schema from './schema';

export async function seed(db_binding: D1Database) {
  const db = drizzle(db_binding);

  console.log('🌱 Seeding database...');

  // 1. Create Initial Users
  const passwordHash = await hash('password123', 10);
  
  const initialUsers = [
    {
      id: crypto.randomUUID(),
      email: 'owner@rusamas.com',
      password_hash: passwordHash,
      full_name: 'Pak Novel (Owner)',
      role: 'owner',
      is_active: 1,
    },
    {
      id: crypto.randomUUID(),
      email: 'admin@rusamas.com',
      password_hash: passwordHash,
      full_name: 'Admin Rusamas',
      role: 'admin',
      is_active: 1,
    },
    {
      id: crypto.randomUUID(),
      email: 'sales@rusamas.com',
      password_hash: passwordHash,
      full_name: 'Sales Lapangan',
      role: 'sales',
      is_active: 1,
    },
    {
      id: crypto.randomUUID(),
      email: 'produksi@rusamas.com',
      password_hash: passwordHash,
      full_name: 'Tim Produksi',
      role: 'produksi',
      is_active: 1,
    },
  ];

  for (const user of initialUsers) {
    await db.insert(schema.users).values(user).onConflictDoNothing();
  }
  console.log('✅ Users seeded');

  // 2. Create Default Location (Kantor Pusat)
  await db.insert(schema.locations).values({
    id: crypto.randomUUID(),
    name: 'Kantor Pusat Rusamas',
    latitude: -6.175392, // Example Jakarta coords
    longitude: 106.827153,
    radius_meters: 100,
    is_active: 1,
  }).onConflictDoNothing();
  console.log('✅ Locations seeded');

  // 3. System Settings
  const initialSettings = [
    { id: crypto.randomUUID(), key: 'company_name', value: 'Rusamas ERP' },
    { id: crypto.randomUUID(), key: 'default_dp_percentage', value: '50' },
    { id: crypto.randomUUID(), key: 'wa_enabled', value: '1' },
  ];

  for (const setting of initialSettings) {
    await db.insert(schema.settings).values(setting).onConflictDoNothing();
  }
  console.log('✅ Settings seeded');

  console.log('🏁 Seeding complete!');
}
