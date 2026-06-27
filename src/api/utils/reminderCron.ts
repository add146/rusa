import { drizzle } from 'drizzle-orm/d1';
import { eq, or } from 'drizzle-orm';
import { orders } from '../db/schema';
import { sendAutoWAMessage } from './waTriggers';
import * as schema from '../db/schema';

const formatRupiah = (val: number) => {
  return 'Rp ' + Math.round(val).toLocaleString('id-ID');
};

export async function handleCronReminders(dbBinding: D1Database) {
  const db = drizzle(dbBinding, { schema });
  const now = new Date();

  console.log('Running daily sales reminders cron job...');

  // ==========================================
  // 1. DP REMINDERS (Every 3 Days for Pending Orders)
  // ==========================================
  const pendingOrders = await db.query.orders.findMany({
    where: eq(orders.status, 'pending'),
    with: {
      client: true,
      sales: true,
      payments: true,
    }
  });

  for (const order of pendingOrders) {
    // If order already has a pending or verified DP payment, skip reminder
    const hasDpPayment = order.payments?.some(p => p.type === 'dp' && (p.status === 'pending' || p.status === 'verified'));
    if (hasDpPayment) continue;

    const createdTime = new Date(order.created_at || '');
    const diffTimeMs = now.getTime() - createdTime.getTime();
    const diffDays = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 3) {
      let shouldRemind = false;
      if (!order.dp_reminder_sent_at) {
        shouldRemind = true;
      } else {
        const lastSentTime = new Date(order.dp_reminder_sent_at);
        const diffSentMs = now.getTime() - lastSentTime.getTime();
        const diffSentDays = Math.floor(diffSentMs / (1000 * 60 * 60 * 24));
        if (diffSentDays >= 3) {
          shouldRemind = true;
        }
      }

      if (shouldRemind && order.sales?.phone) {
        const msg = `📦 *REMINDER DP - Rusamas ERP*\n\nHalo ${order.sales.full_name}, ada pesanan yang menunggu DP:\n\n▸ No. Order: ${order.order_number}\n▸ Klien: ${order.client?.company_name || '-'}\n▸ Total: ${formatRupiah(order.total_price || 0)}\n▸ DP: ${formatRupiah(order.dp_amount || 0)}\n▸ Sudah: ${diffDays} hari tanpa konfirmasi DP\n\nSegera tindak lanjuti klien Anda. Terima kasih!`;
        
        console.log(`Sending DP reminder to sales ${order.sales.full_name} (${order.sales.phone}) for order ${order.order_number}`);
        await sendAutoWAMessage(dbBinding, order.sales.phone, msg);

        // Update reminder details
        const count = (order.dp_reminder_count || 0) + 1;
        await db.update(orders).set({
          dp_reminder_sent_at: now.toISOString(),
          dp_reminder_count: count,
          updated_at: now.toISOString(),
        }).where(eq(orders.id, order.id));
      }
    }
  }

  // ==========================================
  // 2. PELUNASAN REMINDERS (1 Month after shipped_at)
  // ==========================================
  const shippedOrders = await db.query.orders.findMany({
    where: or(eq(orders.status, 'shipped'), eq(orders.status, 'done')),
    with: {
      client: true,
      sales: true,
      payments: true,
    }
  });

  for (const order of shippedOrders) {
    // If order has fully verified full/pelunasan payment or final amount <= 0, skip
    if ((order.final_amount || 0) <= 0) continue;
    const hasPelunasanPayment = order.payments?.some(p => p.type === 'full' && p.status === 'verified');
    if (hasPelunasanPayment) continue;

    // Use shipped_at or fallback to updated_at if not set
    const shippedDateStr = order.shipped_at || order.updated_at;
    if (!shippedDateStr) continue;

    const shippedTime = new Date(shippedDateStr);
    const diffTimeMs = now.getTime() - shippedTime.getTime();
    const diffDays = Math.floor(diffTimeMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 30) {
      let shouldRemind = false;
      if (!order.pelunasan_reminder_sent_at) {
        shouldRemind = true;
      } else {
        const lastSentTime = new Date(order.pelunasan_reminder_sent_at);
        const diffSentMs = now.getTime() - lastSentTime.getTime();
        const diffSentDays = Math.floor(diffSentMs / (1000 * 60 * 60 * 24));
        if (diffSentDays >= 30) {
          shouldRemind = true;
        }
      }

      if (shouldRemind && order.sales?.phone) {
        const msg = `💰 *REMINDER PELUNASAN - Rusamas ERP*\n\nHalo ${order.sales.full_name},\n\nPesanan berikut sudah dikirim 1 bulan lalu tapi belum lunas:\n\n▸ No. Order: ${order.order_number}\n▸ Klien: ${order.client?.company_name || '-'}\n▸ Sisa Tagihan: ${formatRupiah(order.final_amount || 0)}\n▸ Tgl Kirim: ${shippedDateStr.split('T')[0]}\n\nSegera hubungi klien untuk konfirmasi pelunasan. Terima kasih!`;
        
        console.log(`Sending Pelunasan reminder to sales ${order.sales.full_name} (${order.sales.phone}) for order ${order.order_number}`);
        await sendAutoWAMessage(dbBinding, order.sales.phone, msg);

        // Update reminder details
        const count = (order.pelunasan_reminder_count || 0) + 1;
        await db.update(orders).set({
          pelunasan_reminder_sent_at: now.toISOString(),
          pelunasan_reminder_count: count,
          updated_at: now.toISOString(),
        }).where(eq(orders.id, order.id));
      }
    }
  }
}
