export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'sales' | 'produksi' | 'staff' | 'desainer';
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
}

export interface Client {
  id: string;
  company_name: string;
  pic_name: string;
  pic_phone?: string;
  pic_email?: string;
  owner_name?: string;
  address?: string;
  city?: string;
  notes?: string;
  created_at: string;
}

export interface ClientAddress {
  id: string;
  client_id: string;
  label: string;
  address: string;
  city?: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  hpp_base?: number;
  publish_price?: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  client_id: string;
  sales_id: string;
  status: 'draft' | 'pending' | 'locked' | 'production' | 'done' | 'shipped' | 'completed' | 'cancelled';
  deadline?: string;
  total_price: number;
  dp_amount: number;
  dp_percentage: number;
  final_amount: number;
  notes?: string;
  locked_at?: string;
  sla_deadline?: string;
  shipping_address_id?: string;
  shipping_address_custom?: string;
  dp_reminder_sent_at?: string;
  dp_reminder_count?: number;
  shipped_at?: string;
  pelunasan_reminder_sent_at?: string;
  pelunasan_reminder_count?: number;
  created_at: string;
}

export interface DesignApproval {
  id: string;
  order_item_id: string;
  order_id: string;
  is_approved: number;
  approved_by?: string;
  approved_at?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity_ordered: number;
  quantity_actual?: number;
  unit_price: number;
  subtotal: number;
  notes?: string;
  designApproval?: DesignApproval;
  is_production_done?: number;
  production_done_at?: string;
}

export interface ShipmentBatchItem {
  id: string;
  batch_id: string;
  order_item_id: string;
  quantity_shipped: number;
  created_at?: string;
}

export interface ShipmentBatch {
  id: string;
  order_id: string;
  batch_number: number;
  shipping_address?: string;
  notes?: string;
  status: 'pending' | 'printed';
  created_by?: string;
  created_at: string;
  items?: ShipmentBatchItem[];
}

export interface Attendance {
  id: string;
  user_id: string;
  location_id?: string;
  type: 'office' | 'field';
  check_in_at: string;
  check_out_at?: string;
  duration_minutes?: number;
  is_on_time?: boolean;
  face_verified: boolean;
  points_earned: number;
  date: string;
}
