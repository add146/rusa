export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  SALES: 'sales',
  PRODUKSI: 'produksi',
} as const;

export const ORDER_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  LOCKED: 'locked',
  PRODUCTION: 'production',
  DONE: 'done',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
} as const;

export const PAYMENT_TYPE = {
  DP: 'dp',
  PELUNASAN: 'pelunasan',
} as const;

export const PRODUCTION_STATUS = {
  MASUK: 'masuk',
  PROSES: 'proses',
  SELESAI: 'selesai',
} as const;
