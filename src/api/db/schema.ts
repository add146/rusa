import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core';
import { sql, relations } from 'drizzle-orm';

// 5.1 users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  role: text('role').notNull(), // 'owner','admin','sales','produksi'
  phone: text('phone'),
  avatar_url: text('avatar_url'),
  points_balance: integer('points_balance').default(0),
  is_active: integer('is_active').default(1),
  last_login_at: text('last_login_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
  deleted_at: text('deleted_at'),
});

// 5.2 clients
export const clients = sqliteTable('clients', {
  id: text('id').primaryKey(),
  company_name: text('company_name').notNull(),
  pic_name: text('pic_name').notNull(),
  pic_phone: text('pic_phone'),
  pic_email: text('pic_email'),
  owner_name: text('owner_name'),
  address: text('address'),
  city: text('city'),
  notes: text('notes'),
  created_by: text('created_by').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
  deleted_at: text('deleted_at'),
});

// 5.2b client_addresses
export const clientAddresses = sqliteTable('client_addresses', {
  id: text('id').primaryKey(),
  client_id: text('client_id').references(() => clients.id),
  label: text('label').notNull(),
  address: text('address').notNull(),
  city: text('city'),
  is_default: integer('is_default').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.3 products
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').unique().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: text('category'),
  unit: text('unit').default('pcs'),
  hpp_base: real('hpp_base'), // ENCRYPTED, owner only
  publish_price: real('publish_price'), // Harga jual publish, admin & owner
  image_url: text('image_url'),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
  deleted_at: text('deleted_at'),
});

// 5.4 product_bom
export const productBom = sqliteTable('product_bom', {
  id: text('id').primaryKey(),
  product_id: text('product_id').references(() => products.id),
  material_name: text('material_name').notNull(),
  material_sku: text('material_sku'),
  quantity: real('quantity').notNull(),
  unit: text('unit').default('pcs'),
  cost_per_unit: real('cost_per_unit'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.5 orders
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  order_number: text('order_number').unique().notNull(), // PO-2026-0001
  client_id: text('client_id').references(() => clients.id),
  sales_id: text('sales_id').references(() => users.id),
  status: text('status').default('draft'), // draft/pending/locked/production/done/shipped/cancelled
  deadline: text('deadline'),
  total_price: real('total_price').default(0),
  dp_amount: real('dp_amount').default(0),
  dp_percentage: real('dp_percentage').default(0),
  final_amount: real('final_amount').default(0),
  notes: text('notes'),
  locked_at: text('locked_at'),
  locked_by: text('locked_by').references(() => users.id),
  sla_deadline: text('sla_deadline'),
  terms_conditions: text('terms_conditions'),
  shipping_address_id: text('shipping_address_id'),
  shipping_address_custom: text('shipping_address_custom'),
  dp_reminder_sent_at: text('dp_reminder_sent_at'),
  dp_reminder_count: integer('dp_reminder_count').default(0),
  shipped_at: text('shipped_at'),
  pelunasan_reminder_sent_at: text('pelunasan_reminder_sent_at'),
  pelunasan_reminder_count: integer('pelunasan_reminder_count').default(0),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
  deleted_at: text('deleted_at'),
});

// 5.6 order_items
export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  product_id: text('product_id').references(() => products.id),
  quantity_ordered: integer('quantity_ordered').notNull(),
  quantity_actual: integer('quantity_actual'),
  unit_price: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
  notes: text('notes'),
  is_production_done: integer('is_production_done').default(0),
  production_done_at: text('production_done_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.7 payments
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  type: text('type').notNull(), // 'dp'/'pelunasan'
  amount: real('amount').notNull(),
  payment_date: text('payment_date'),
  proof_url: text('proof_url'),
  verified_by: text('verified_by').references(() => users.id),
  verified_at: text('verified_at'),
  status: text('status').default('pending'), // pending/verified/rejected
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.8 documents
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  type: text('type').notNull(), // 'draft_po','invoice_dp','invoice_lunas','surat_jalan'
  document_number: text('document_number').unique().notNull(),
  file_url: text('file_url'),
  generated_by: text('generated_by').references(() => users.id),
  generated_at: text('generated_at').default(sql`(datetime('now'))`),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.9 production_tracking
export const productionTracking = sqliteTable('production_tracking', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  status: text('status').default('masuk'), // masuk/proses/selesai
  started_at: text('started_at'),
  completed_at: text('completed_at'),
  notes: text('notes'),
  updated_by: text('updated_by').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.10 production_logs
export const productionLogs = sqliteTable('production_logs', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  product_id: text('product_id').references(() => products.id),
  action: text('action').notNull(),
  old_value: text('old_value'),
  new_value: text('new_value'),
  performed_by: text('performed_by').references(() => users.id),
  performed_at: text('performed_at').default(sql`(datetime('now'))`),
});

// 5.11 wa_messages
export const waMessages = sqliteTable('wa_messages', {
  id: text('id').primaryKey(),
  trigger_type: text('trigger_type').notNull(),
  recipient_phone: text('recipient_phone').notNull(),
  recipient_type: text('recipient_type').notNull(),
  message_body: text('message_body').notNull(),
  reference_id: text('reference_id'),
  status: text('status').default('pending'),
  sent_at: text('sent_at'),
  error_message: text('error_message'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.11b design_approvals
export const designApprovals = sqliteTable('design_approvals', {
  id: text('id').primaryKey(),
  order_item_id: text('order_item_id').references(() => orderItems.id).notNull(),
  order_id: text('order_id').references(() => orders.id).notNull(),
  is_approved: integer('is_approved').default(0),
  approved_by: text('approved_by').references(() => users.id),
  approved_at: text('approved_at'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.12 locations
export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  radius_meters: integer('radius_meters').default(100),
  is_active: integer('is_active').default(1),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.13 attendance
export const attendance = sqliteTable('attendance', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  location_id: text('location_id').references(() => locations.id),
  type: text('type').notNull(), // 'office'/'field'
  check_in_at: text('check_in_at').notNull(),
  check_in_lat: real('check_in_lat'),
  check_in_lng: real('check_in_lng'),
  check_out_at: text('check_out_at'),
  check_out_lat: real('check_out_lat'),
  check_out_lng: real('check_out_lng'),
  checkout_location_id: text('checkout_location_id'),
  checkout_location_name: text('checkout_location_name'),
  duration_minutes: integer('duration_minutes'),
  is_on_time: integer('is_on_time'),
  face_verified: integer('face_verified').default(0),
  face_confidence: real('face_confidence').default(0),
  face_photo_url: text('face_photo_url'),
  ip_address: text('ip_address'),
  device_info: text('device_info'),
  is_valid: integer('is_valid').default(1),
  fraud_flags: text('fraud_flags'), // JSON
  fraud_score: integer('fraud_score').default(0),
  points_earned: integer('points_earned').default(0),
  date: text('date').notNull(), // YYYY-MM-DD
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => {
  return {
    idxAttendanceUser: index('idx_attendance_user').on(table.user_id),
    idxAttendanceDate: index('idx_attendance_date').on(table.user_id, table.date),
  };
});

// 5.14 visit_logs
export const visitLogs = sqliteTable('visit_logs', {
  id: text('id').primaryKey(),
  attendance_id: text('attendance_id').references(() => attendance.id),
  user_id: text('user_id').references(() => users.id),
  client_id: text('client_id').references(() => clients.id),
  location_name: text('location_name').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  summary: text('summary').notNull(),
  photo_url: text('photo_url'),
  visited_at: text('visited_at').default(sql`(datetime('now'))`),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.14 kpi_scores (Wait, PRD had 5.14 twice, this is actually 5.15/16)
export const kpiScores = sqliteTable('kpi_scores', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  period: text('period').notNull(), // '2026-05'
  target_omzet: real('target_omzet').default(0),
  actual_omzet: real('actual_omzet').default(0),
  target_visits: integer('target_visits').default(0),
  actual_visits: integer('actual_visits').default(0),
  discipline_score: real('discipline_score').default(0),
  composite_score: real('composite_score').default(0),
  reward_eligible: integer('reward_eligible').default(0),
  reward_claimed: integer('reward_claimed').default(0),
  notes: text('notes'),
  calculated_at: text('calculated_at').default(sql`(datetime('now'))`),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.15 returns
export const returns = sqliteTable('returns', {
  id: text('id').primaryKey(),
  return_number: text('return_number').unique().notNull(),
  order_id: text('order_id').references(() => orders.id),
  reported_by: text('reported_by').references(() => users.id),
  status: text('status').default('pending'), // pending/verified/in_repair/done/rejected
  reason: text('reason').notNull(),
  total_repair_cost: real('total_repair_cost').default(0),
  photo_url: text('photo_url'),
  verified_by: text('verified_by').references(() => users.id),
  verified_at: text('verified_at'),
  completed_at: text('completed_at'),
  notes: text('notes'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.16 return_items
export const returnItems = sqliteTable('return_items', {
  id: text('id').primaryKey(),
  return_id: text('return_id').references(() => returns.id),
  order_item_id: text('order_item_id').references(() => orderItems.id),
  product_id: text('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  reason: text('reason'),
  repair_cost: real('repair_cost').default(0),
  action_taken: text('action_taken'), // 'repair','replace','refund'
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.17 order_revision_logs
export const orderRevisionLogs = sqliteTable('order_revision_logs', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id),
  requested_by: text('requested_by').references(() => users.id),
  approved_by: text('approved_by').references(() => users.id),
  status: text('status').default('pending'),
  reason: text('reason').notNull(),
  changes_detail: text('changes_detail'), // JSON
  approved_at: text('approved_at'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.18 audit_trail
export const auditTrail = sqliteTable('audit_trail', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id'),
  old_data: text('old_data'),
  new_data: text('new_data'),
  ip_address: text('ip_address'),
  user_agent: text('user_agent'),
  performed_at: text('performed_at').default(sql`(datetime('now'))`),
});

// 5.19 settings
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  updated_by: text('updated_by').references(() => users.id),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.20 user_streaks
export const userStreaks = sqliteTable('user_streaks', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  current_streak: integer('current_streak').default(0),
  longest_streak: integer('longest_streak').default(0),
  last_streak_date: text('last_streak_date'),
  streak_multiplier: real('streak_multiplier').default(1.0),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.21 points_ledger
export const pointsLedger = sqliteTable('points_ledger', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  transaction_type: text('transaction_type').notNull(), // 'earn'/'redeem'
  amount: integer('amount').notNull(),
  reference_type: text('reference_type'),
  reference_id: text('reference_id'),
  description: text('description'),
  balance_after: integer('balance_after'),
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.22 reward_products
export const rewardProducts = sqliteTable('reward_products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price_points: integer('price_points').notNull(),
  image_url: text('image_url'),
  stock: integer('stock').default(0),
  is_active: integer('is_active').default(1),
  created_by: text('created_by').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.24 point_rules
export const pointRules = sqliteTable('point_rules', {
  id: text('id').primaryKey(),
  rule_key: text('rule_key').unique().notNull(),
  label: text('label').notNull(),
  description: text('description'),
  point_value: integer('point_value').notNull().default(0),
  target_value: integer('target_value'), 
  applicable_roles: text('applicable_roles'), 
  is_active: integer('is_active').default(1),
  updated_by: text('updated_by').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now'))`),
  updated_at: text('updated_at').default(sql`(datetime('now'))`),
});

// 5.23 reward_orders
export const rewardOrders = sqliteTable('reward_orders', {
  id: text('id').primaryKey(),
  user_id: text('user_id').references(() => users.id),
  product_id: text('product_id').references(() => rewardProducts.id),
  product_name: text('product_name').notNull(),
  quantity: integer('quantity').default(1),
  total_points: integer('total_points').notNull(),
  status: text('status').default('pending'), // pending/completed/cancelled
  created_at: text('created_at').default(sql`(datetime('now'))`),
});

// 5.25 shipment_batches
export const shipmentBatches = sqliteTable('shipment_batches', {
  id: text('id').primaryKey(),
  order_id: text('order_id').references(() => orders.id).notNull(),
  batch_number: integer('batch_number').notNull(),
  shipping_address: text('shipping_address'),
  notes: text('notes'),
  status: text('status').default('pending'), // 'pending' | 'printed'
  created_by: text('created_by').references(() => users.id),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => {
  return {
    idxShipmentBatchesOrder: index('idx_shipment_batches_order').on(table.order_id),
  };
});

// 5.26 shipment_batch_items
export const shipmentBatchItems = sqliteTable('shipment_batch_items', {
  id: text('id').primaryKey(),
  batch_id: text('batch_id').references(() => shipmentBatches.id).notNull(),
  order_item_id: text('order_item_id').references(() => orderItems.id).notNull(),
  quantity_shipped: integer('quantity_shipped').notNull(),
  created_at: text('created_at').default(sql`(datetime('now'))`),
}, (table) => {
  return {
    idxShipmentItemsBatch: index('idx_shipment_items_batch').on(table.batch_id),
    idxShipmentItemsItem: index('idx_shipment_items_item').on(table.order_item_id),
  };
});

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  attendance: many(attendance),
  streaks: many(userStreaks),
  pointsLedger: many(pointsLedger),
  visits: many(visitLogs),
  pointRules: many(pointRules),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
  visits: many(visitLogs),
  addresses: many(clientAddresses),
}));

export const clientAddressesRelations = relations(clientAddresses, ({ one }) => ({
  client: one(clients, { fields: [clientAddresses.client_id], references: [clients.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  orderItems: many(orderItems),
}));

export const visitLogsRelations = relations(visitLogs, ({ one }) => ({
  user: one(users, { fields: [visitLogs.user_id], references: [users.id] }),
  client: one(clients, { fields: [visitLogs.client_id], references: [clients.id] }),
  attendance: one(attendance, { fields: [visitLogs.attendance_id], references: [attendance.id] }),
}));

export const attendanceRelations = relations(attendance, ({ one, many }) => ({
  user: one(users, { fields: [attendance.user_id], references: [users.id] }),
  location: one(locations, { fields: [attendance.location_id], references: [locations.id] }),
  visits: many(visitLogs),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, { fields: [orders.client_id], references: [clients.id] }),
  sales: one(users, { fields: [orders.sales_id], references: [users.id] }),
  items: many(orderItems),
  payments: many(payments),
  production: one(productionTracking, { fields: [orders.id], references: [productionTracking.order_id] }),
  returns: many(returns),
  shippingAddress: one(clientAddresses, { fields: [orders.shipping_address_id], references: [clientAddresses.id] }),
  shipmentBatches: many(shipmentBatches),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.order_id], references: [orders.id] }),
  product: one(products, { fields: [orderItems.product_id], references: [products.id] }),
  designApproval: one(designApprovals, { fields: [orderItems.id], references: [designApprovals.order_item_id] }),
  shipmentBatchItems: many(shipmentBatchItems),
}));

export const designApprovalsRelations = relations(designApprovals, ({ one }) => ({
  orderItem: one(orderItems, { fields: [designApprovals.order_item_id], references: [orderItems.id] }),
  order: one(orders, { fields: [designApprovals.order_id], references: [orders.id] }),
  approvedBy: one(users, { fields: [designApprovals.approved_by], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.order_id], references: [orders.id] }),
  verifiedBy: one(users, { fields: [payments.verified_by], references: [users.id] }),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
  order: one(orders, { fields: [returns.order_id], references: [orders.id] }),
  reportedBy: one(users, { fields: [returns.reported_by], references: [users.id] }),
  verifiedBy: one(users, { fields: [returns.verified_by], references: [users.id] }),
  items: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  return: one(returns, { fields: [returnItems.return_id], references: [returns.id] }),
  product: one(products, { fields: [returnItems.product_id], references: [products.id] }),
  orderItem: one(orderItems, { fields: [returnItems.order_item_id], references: [orderItems.id] }),
}));

export const shipmentBatchesRelations = relations(shipmentBatches, ({ one, many }) => ({
  order: one(orders, { fields: [shipmentBatches.order_id], references: [orders.id] }),
  createdBy: one(users, { fields: [shipmentBatches.created_by], references: [users.id] }),
  items: many(shipmentBatchItems),
}));

export const shipmentBatchItemsRelations = relations(shipmentBatchItems, ({ one }) => ({
  batch: one(shipmentBatches, { fields: [shipmentBatchItems.batch_id], references: [shipmentBatches.id] }),
  orderItem: one(orderItems, { fields: [shipmentBatchItems.order_item_id], references: [orderItems.id] }),
}));
