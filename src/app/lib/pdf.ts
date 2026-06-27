import { jsPDF } from 'jspdf';
import { formatDate } from './format';
import type { Order, Client, OrderItem, Product } from '../../shared/types';
import { logoBase64 } from './logoBase64';

type OrderWithDetails = Order & {
  client: Client;
  items: (OrderItem & { product: Product })[];
  payments?: { id: string; status: string; type: string; amount?: number; verified_at?: string }[];
  sales_name?: string;
  sales?: { id: string; full_name: string };
  sj_address?: string;
  shippingAddress?: {
    id: string;
    label: string;
    address: string;
    city?: string;
  };
};

// ── Company constants ─────────────────────────────────────────────────────────
const COMPANY = {
  name: 'RUSA MAS TEXTILE',
  address: 'Jl. Ikan Buntek No.11 Perak Barat, Surabaya 60177',
  phone: '0821-7777-5810',
  email: 'pabrikain.ihram@gmail.com',
  instagram: 'pabrik kain ihram',
  rekening: '1400 02255 0959',
  bank: 'mandiri',
  accountName: 'a.n. CV. Rusa Mas',
};

const TERMS_PO = [
  'Kerusakan barang tidak di tanggung oleh penjual kecuali barang itu cacat dan penjual',
  'Jumlah pemesanan dan pengerjaan barang bersifat estimasi bisa lebih atau kurang dari jumlah',
  '  yang di order, tergantung hasil akhir dari selesai produksi',
  'Dp minimal 50% dari total pembelian',
  'Pemesanan atau pengerjakan terhitung dari dp masuk',
  'Barang akan di kirim setelah di lakukan pelunasan',
  'Untuk biaya pengiriman di tanggung oleh pembeli',
  'Pengiriman barang menggunakan surat jalan',
  'Apabila barang ada yang cacat bisa di retur kan',
];

const TERMS_INVOICE = [
  'Kerusakan barang tidak di tanggung oleh penjual kecuali barang itu cacat dan penjual',
  'Pemesanan atau pengerjakan terhitung dari dp masuk',
  'Proses pengerjaan pesanan 2 minggu atau 14 hari kerja bersifat estimasi',
  'Dp minimal 50% dari total pembelian',
  'Barang akan di kirim setelah di lakukan pelunasan',
  'Untuk biaya pengiriman di tanggung oleh pembeli',
  'Pengiriman barang menggunakan surat jalan',
  'Ambil Copy Surat pesanan paling lambat',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatNum(n: number | undefined | null) {
  if (!n) return 'Rp 0';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function drawCell(
  doc: jsPDF,
  text: string,
  x: number, y: number, w: number, h: number,
  opts: { align?: 'left' | 'center' | 'right'; bold?: boolean; fill?: number[] } = {}
) {
  if (opts.fill) {
    doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
    doc.rect(x, y, w, h, 'F');
  }
  doc.setDrawColor(100, 100, 100);
  doc.rect(x, y, w, h, 'S');
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setTextColor(0);
  const tx = opts.align === 'right' ? x + w - 2 : opts.align === 'center' ? x + w / 2 : x + 2;
  doc.text(text, tx, y + h / 2 + 1.8, { align: opts.align ?? 'left', baseline: 'middle' });
}

// ── Logo drawn with jsPDF shapes ─────────────────────────────────────────────
function drawLogo(doc: jsPDF, x: number, y: number, size: number) {
  doc.addImage(logoBase64, 'PNG', x, y, size, size);
}

// ── Letterhead ────────────────────────────────────────────────────────────────
function drawHeader(doc: jsPDF) {
  const M = 14;
  const logoX = 155, logoY = 7, logoSize = 28;

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(COMPANY.name, M, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  doc.text(COMPANY.address, M, 23);
  doc.text(`Telp / WA : ${COMPANY.phone}`, M, 27.5);
  doc.text(`Email     : ${COMPANY.email}`, M, 32);
  doc.text(`Instagram : ${COMPANY.instagram}`, M, 36.5);

  // Logo right side
  drawLogo(doc, logoX, logoY, logoSize);

  // Blue divider line
  doc.setDrawColor(30, 60, 160);
  doc.setLineWidth(1);
  doc.line(M, 42, 196, 42);
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 100, 100);
  doc.setTextColor(0);
}

// ── PO Generator ─────────────────────────────────────────────────────────────
function generatePO(doc: jsPDF, order: OrderWithDetails) {
  const M = 14;
  const pageW = 210;
  drawHeader(doc);
  let y = 50;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PURCHASE ORDER (PO)', M, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No. PO : ${order.order_number}`, M, y + 7);
  const salesName = order.sales_name || order.sales?.full_name || '-';
  doc.text(`Sales  : ${salesName}`, M, y + 12);
  doc.text(`Surabaya, ${formatDate(order.created_at)}`, pageW - M, y + 7, { align: 'right' });

  y += 22;
  doc.setFontSize(9);
  doc.text('Kepada Yth,', M, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(order.client?.pic_name || '-', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(order.client?.company_name || '-', M, y);
  y += 6;
  doc.text('Dengan hormat,', M, y);
  y += 5;
  doc.text('Berikut ini kami sampaikan pesanan kami :', M, y);
  y += 8;

  // Table columns
  const tX = M;
  const cNo = 10, cName = 95, cQty = 28, cHarga = 28, cTotal = 31;
  const rH = 8;

  // Header
  doc.setFontSize(8);
  drawCell(doc, 'No', tX, y, cNo, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Nama Barang', tX + cNo, y, cName, rH, { bold: true, fill: [210, 210, 210] });
  drawCell(doc, 'QTY', tX + cNo + cName, y, cQty, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Harga', tX + cNo + cName + cQty, y, cHarga, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Total', tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  y += rH;

  let grandTotal = 0;
  order.items?.forEach((item, idx) => {
    const sub = item.subtotal || (item.unit_price * item.quantity_ordered);
    grandTotal += sub;
    drawCell(doc, `${idx + 1}`, tX, y, cNo, rH, { align: 'center' });
    drawCell(doc, item.product?.name || '-', tX + cNo, y, cName, rH);
    drawCell(doc, `${item.quantity_ordered} PCS`, tX + cNo + cName, y, cQty, rH, { align: 'center' });
    drawCell(doc, formatNum(item.unit_price), tX + cNo + cName + cQty, y, cHarga, rH, { align: 'right' });
    drawCell(doc, formatNum(sub), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { align: 'right' });
    y += rH;
  });

  // Total row
  const total = order.total_price || grandTotal;
  drawCell(doc, 'TOTAL', tX, y, cNo + cName + cQty, rH, { bold: true, fill: [210, 210, 210], align: 'right' });
  drawCell(doc, '', tX + cNo + cName + cQty, y, cHarga, rH, { fill: [210, 210, 210] });
  drawCell(doc, formatNum(total), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, fill: [210, 210, 210], align: 'right' });
  y += rH + 10;

  // Terms
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Ketentuan :', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  TERMS_PO.forEach((t, i) => {
    doc.text(`${i + 1}. ${t}`, M + 2, y);
    y += 4.5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`No Rekening :  ${COMPANY.rekening}`, M, y);
  y += 7;
  doc.setFontSize(16);
  doc.text(COMPANY.bank, M + 2, y);
  y += 7;
  doc.setFontSize(9);
  doc.text(COMPANY.accountName, M + 2, y);

  // Signature (bottom right)
  const sigY = 272;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Terima Kasih,', pageW - M - 25, sigY, { align: 'center' });
  doc.text('a.n. CV. Rusa Mas', pageW - M - 25, sigY + 5, { align: 'center' });
  doc.line(pageW - M - 50, sigY + 20, pageW - M, sigY + 20);
  doc.setFont('helvetica', 'bold');
  doc.text('RUSA MAS TEXTILE', pageW - M - 25, sigY + 25, { align: 'center' });
}

// ── Invoice / Nota Generator ──────────────────────────────────────────────────
function generateInvoice(doc: jsPDF, order: OrderWithDetails) {
  const M = 14;
  const pageW = 210;
  drawHeader(doc);
  let y = 50;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('INVOICE / NOTA', M, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No.${order.order_number}`, pageW - M, y, { align: 'right' });
  doc.text(`Surabaya, ${formatDate(order.created_at)}`, pageW - M, y + 6, { align: 'right' });

  y += 7;
  doc.text('SALES NB :', M, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(order.sales_name || '-', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Kepada Yth :', M, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(order.client?.pic_name || '-', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(order.client?.company_name || '-', M, y);
  y += 10;

  // Table
  const tX = M;
  const cNo = 10, cName = 90, cQty = 28, cHarga = 32, cTotal = 32;
  const rH = 8;

  doc.setFontSize(8);
  drawCell(doc, 'No', tX, y, cNo, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Nama Barang', tX + cNo, y, cName, rH, { bold: true, fill: [210, 210, 210] });
  drawCell(doc, 'QTY', tX + cNo + cName, y, cQty, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Harga', tX + cNo + cName + cQty, y, cHarga, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Total Harga', tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  y += rH;

  let grandTotal = 0;
  order.items?.forEach((item, idx) => {
    const sub = item.subtotal || (item.unit_price * item.quantity_ordered);
    grandTotal += sub;
    drawCell(doc, `${idx + 1}`, tX, y, cNo, rH, { align: 'center' });
    drawCell(doc, item.product?.name || '-', tX + cNo, y, cName, rH);
    drawCell(doc, `${item.quantity_ordered} PCS`, tX + cNo + cName, y, cQty, rH, { align: 'center' });
    drawCell(doc, formatNum(item.unit_price), tX + cNo + cName + cQty, y, cHarga, rH, { align: 'right' });
    drawCell(doc, formatNum(sub), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { align: 'right' });
    y += rH;
  });

  const total = order.total_price || grandTotal;
  drawCell(doc, 'TOTAL', tX, y, cNo + cName + cQty, rH, { bold: true, fill: [210, 210, 210], align: 'right' });
  drawCell(doc, '', tX + cNo + cName + cQty, y, cHarga, rH, { fill: [210, 210, 210] });
  drawCell(doc, formatNum(total), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, fill: [210, 210, 210], align: 'right' });
  y += rH;

  const dpAmt = order.dp_amount || 0;
  const pelunasan = total - dpAmt;
  const dpPmt = order.payments?.find(p => p.type === 'dp' && p.status === 'verified');
  const dpDate = dpPmt?.verified_at ? ` ${formatDate(dpPmt.verified_at)}` : '';

  drawCell(doc, `DP MANDIRI RM${dpDate}`, tX, y, cNo + cName + cQty, rH, { bold: true, fill: [198, 228, 198] });
  drawCell(doc, '', tX + cNo + cName + cQty, y, cHarga, rH, { fill: [198, 228, 198] });
  drawCell(doc, formatNum(dpAmt), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, align: 'right' });
  y += rH;

  drawCell(doc, 'PELUNASAN', tX, y, cNo + cName + cQty, rH, { bold: true, fill: [100, 180, 110] });
  drawCell(doc, '', tX + cNo + cName + cQty, y, cHarga, rH, { fill: [100, 180, 110] });
  drawCell(doc, formatNum(pelunasan), tX + cNo + cName + cQty + cHarga, y, cTotal, rH, { bold: true, align: 'right' });
  y += rH + 10;

  // Ketentuan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('KETENTUAN', M, y);
  doc.setDrawColor(0);
  doc.line(M, y + 1, M + 28, y + 1);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  TERMS_INVOICE.forEach((t, i) => {
    doc.text(`${i + 1}. ${t}`, M + 2, y);
    y += 4.5;
  });

  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`No Rekening : ${COMPANY.rekening}`, M, y);
  y += 7;
  doc.setFontSize(14);
  doc.text(`${COMPANY.bank}    ${COMPANY.accountName}`, M + 2, y);

  // Two signature blocks
  const sigY = 265;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Surabaya,', M, sigY);
  doc.text('Rusa Mas Textile', M, sigY + 5);
  doc.line(M, sigY + 18, M + 42, sigY + 18);
  doc.text('Sales', M, sigY + 22);
  doc.line(M, sigY + 32, M + 42, sigY + 32);
  doc.text(order.sales_name || 'Novel Baawad', M, sigY + 36);

  doc.text('CV.RUSA MAS', pageW - M, sigY, { align: 'right' });
  doc.line(pageW - M - 42, sigY + 18, pageW - M, sigY + 18);
  doc.text('CV. Rusa Mas', pageW - M - 21, sigY + 22, { align: 'center' });
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function generateOrderPDF(order: OrderWithDetails, type: 'PO' | 'Invoice' | 'SJ') {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setLineWidth(0.3);

  if (type === 'PO') {
    generatePO(doc, order);
  } else if (type === 'Invoice') {
    generateInvoice(doc, order);
  } else {
    // Surat Jalan
    const M = 14;
    const pageW = 210;
    drawHeader(doc);
    let y = 50;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SURAT JALAN', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`No. : ${order.order_number}`, M, y + 7);
    const sjSalesName = order.sales_name || order.sales?.full_name || '-';
    doc.text(`Sales : ${sjSalesName}`, M, y + 12);
    // Tanggal Cetak Surat Jalan (Fitur 3)
    doc.text(`Surabaya, ${formatDate(new Date().toISOString())}`, pageW - M, y + 7, { align: 'right' });
    y += 20;
    doc.text(`Kepada Yth : ${order.client?.company_name || '-'}`, M, y);
    y += 5;
    doc.text(`u.p.          : ${order.client?.pic_name || '-'}`, M, y);
    y += 5;
    
    // Alamat Pengiriman (Fitur 4)
    const addressToShow = order.sj_address || order.shipping_address_custom || order.shippingAddress?.address || order.client?.address || '-';
    const cityToShow = order.shippingAddress?.city || order.client?.city || '';
    const fullAddress = cityToShow ? `${addressToShow}, ${cityToShow}` : addressToShow;
    const splitAddr = doc.splitTextToSize(`Alamat      : ${fullAddress}`, 180);
    doc.text(splitAddr, M, y);
    y += (splitAddr.length * 4.5) + 3;

    const cNo = 10, cName = 100, cQty = 28, cSat = 26, cKet = 22;
    const rH = 8;
    doc.setFontSize(8);
    drawCell(doc, 'No', M, y, cNo, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
    drawCell(doc, 'Nama Barang', M + cNo, y, cName, rH, { bold: true, fill: [210, 210, 210] });
    drawCell(doc, 'Jumlah', M + cNo + cName, y, cQty, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
    drawCell(doc, 'Satuan', M + cNo + cName + cQty, y, cSat, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
    drawCell(doc, 'Ket', M + cNo + cName + cQty + cSat, y, cKet, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
    y += rH;

    order.items?.forEach((item, idx) => {
      drawCell(doc, `${idx + 1}`, M, y, cNo, rH, { align: 'center' });
      drawCell(doc, item.product?.name || '-', M + cNo, y, cName, rH);
      drawCell(doc, `${item.quantity_ordered}`, M + cNo + cName, y, cQty, rH, { align: 'center' });
      drawCell(doc, 'PCS', M + cNo + cName + cQty, y, cSat, rH, { align: 'center' });
      drawCell(doc, '', M + cNo + cName + cQty + cSat, y, cKet, rH);
      y += rH;
    });

    y += 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Penerima,', M + 18, y, { align: 'center' });
    doc.text('Gudang,', M + 18 + 36, y, { align: 'center' });
    doc.text('Pengirim,', M + 18 + 72, y, { align: 'center' });
    doc.text('Mengetahui,', M + 18 + 108, y, { align: 'center' });
    doc.text('Hormat Kami,', M + 18 + 144, y, { align: 'center' });

    y += 20;
    const sigW = 28;
    
    // Draw lines
    doc.line(M + 18 - sigW/2, y, M + 18 + sigW/2, y);
    doc.line(M + 18 + 36 - sigW/2, y, M + 18 + 36 + sigW/2, y);
    doc.line(M + 18 + 72 - sigW/2, y, M + 18 + 72 + sigW/2, y);
    doc.line(M + 18 + 108 - sigW/2, y, M + 18 + 108 + sigW/2, y);
    doc.line(M + 18 + 144 - sigW/2, y, M + 18 + 144 + sigW/2, y);

    // Text under line
    doc.text('(                          )', M + 18, y - 1, { align: 'center' });
    doc.text('(                          )', M + 18 + 36, y - 1, { align: 'center' });
    doc.text('(                          )', M + 18 + 72, y - 1, { align: 'center' });
    doc.text('(                          )', M + 18 + 108, y - 1, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.text('RUSA MAS TEXTILE', M + 18 + 144, y + 4, { align: 'center' });
  }

  // Download
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${type}_${order.order_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function generatePartialSJ(
  order: any, 
  batch: any, 
  selectedItems: { product_name: string; quantity: number; unit: string }[],
  address: string
) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setLineWidth(0.3);

  const M = 14;
  const pageW = 210;
  drawHeader(doc);
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`SURAT JALAN - Pengiriman Batch #${batch.batch_number}`, M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`No. : SJ-${order.order_number}-B${batch.batch_number}`, M, y + 7);
  const sjSalesName = order.sales_name || order.sales?.full_name || '-';
  doc.text(`Sales : ${sjSalesName}`, M, y + 12);
  
  // Tanggal Cetak Surat Jalan (Fitur 3)
  doc.text(`Surabaya, ${formatDate(new Date().toISOString())}`, pageW - M, y + 7, { align: 'right' });
  y += 20;
  doc.text(`Kepada Yth : ${order.client?.company_name || '-'}`, M, y);
  y += 5;
  doc.text(`u.p.          : ${order.client?.pic_name || '-'}`, M, y);
  y += 5;
  
  // Alamat Pengiriman
  const splitAddr = doc.splitTextToSize(`Alamat      : ${address}`, 180);
  doc.text(splitAddr, M, y);
  y += (splitAddr.length * 4.5) + 3;

  const cNo = 10, cName = 100, cQty = 28, cSat = 26, cKet = 22;
  const rH = 8;
  doc.setFontSize(8);
  drawCell(doc, 'No', M, y, cNo, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Nama Barang', M + cNo, y, cName, rH, { bold: true, fill: [210, 210, 210] });
  drawCell(doc, 'Jumlah', M + cNo + cName, y, cQty, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Satuan', M + cNo + cName + cQty, y, cSat, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  drawCell(doc, 'Ket', M + cNo + cName + cQty + cSat, y, cKet, rH, { bold: true, fill: [210, 210, 210], align: 'center' });
  y += rH;

  selectedItems.forEach((item, idx) => {
    drawCell(doc, `${idx + 1}`, M, y, cNo, rH, { align: 'center' });
    drawCell(doc, item.product_name, M + cNo, y, cName, rH);
    drawCell(doc, `${item.quantity}`, M + cNo + cName, y, cQty, rH, { align: 'center' });
    drawCell(doc, item.unit || 'PCS', M + cNo + cName + cQty, y, cSat, rH, { align: 'center' });
    drawCell(doc, '', M + cNo + cName + cQty + cSat, y, cKet, rH);
    y += rH;
  });

  y += 15;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Penerima,', M + 18, y, { align: 'center' });
  doc.text('Gudang,', M + 18 + 36, y, { align: 'center' });
  doc.text('Pengirim,', M + 18 + 72, y, { align: 'center' });
  doc.text('Mengetahui,', M + 18 + 108, y, { align: 'center' });
  doc.text('Hormat Kami,', M + 18 + 144, y, { align: 'center' });

  y += 20;
  const sigW = 28;
  
  // Draw lines
  doc.line(M + 18 - sigW/2, y, M + 18 + sigW/2, y);
  doc.line(M + 18 + 36 - sigW/2, y, M + 18 + 36 + sigW/2, y);
  doc.line(M + 18 + 72 - sigW/2, y, M + 18 + 72 + sigW/2, y);
  doc.line(M + 18 + 108 - sigW/2, y, M + 18 + 108 + sigW/2, y);
  doc.line(M + 18 + 144 - sigW/2, y, M + 18 + 144 + sigW/2, y);

  // Text under line
  doc.text('(                          )', M + 18, y - 1, { align: 'center' });
  doc.text('(                          )', M + 18 + 36, y - 1, { align: 'center' });
  doc.text('(                          )', M + 18 + 72, y - 1, { align: 'center' });
  doc.text('(                          )', M + 18 + 108, y - 1, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.text('RUSA MAS TEXTILE', M + 18 + 144, y + 4, { align: 'center' });

  // Footer: partial shipping
  y += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text(`* Pengiriman Parsial ke-${batch.batch_number}`, M, y);

  // Download
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SJ_Parsial_${order.order_number}_B${batch.batch_number}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
