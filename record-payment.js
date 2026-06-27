async function recordAndVerifyPayment() {
  // 1. Login as Sales to record payment (or Admin can also do it)
  const loginRes = await fetch('http://localhost:8787/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sales@rusamas.com', password: 'password123' }),
  });
  const { token: salesToken } = await loginRes.json();

  // Find the order ID for ORD-233768
  const ordersRes = await fetch('http://localhost:8787/api/v1/orders', {
    headers: { 'Authorization': `Bearer ${salesToken}` },
  });
  const ordersData = await ordersRes.json();
  const order = ordersData.find(o => o.order_number === 'ORD-233768');
  if (!order) {
    console.log('Order not found');
    return;
  }
  console.log('Found Order:', order.id);

  // 2. Submit Payment Proof
  const payRes = await fetch('http://localhost:8787/api/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${salesToken}`
    },
    body: JSON.stringify({
      order_id: order.id,
      type: 'dp',
      amount: 5000000,
      payment_date: new Date().toISOString(),
      notes: 'DP via Simulation'
    }),
  });
  const payment = await payRes.json();
  console.log('Payment recorded:', payment.id);

  // 3. Login as Admin to verify
  const adminLoginRes = await fetch('http://localhost:8787/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rusamas.com', password: 'password123' }),
  });
  const { token: adminToken } = await adminLoginRes.json();

  // 4. Verify Payment
  const verifyRes = await fetch(`http://localhost:8787/api/v1/payments/${payment.id}/verify`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      status: 'verified',
      notes: 'Verified via Simulation'
    }),
  });
  console.log('Verification result:', await verifyRes.json());
}
recordAndVerifyPayment();
