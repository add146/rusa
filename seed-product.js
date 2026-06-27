async function seedProduct() {
  // 1. Login as Admin
  const loginRes = await fetch('http://localhost:8787/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rusamas.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Logged in as admin, token:', token);

  // 2. Create Product
  const response = await fetch('http://localhost:8787/api/v1/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Produk Simulasi 1',
      sku: 'PS-001',
      publish_price: 1000000,
      unit: 'pcs',
      category: 'Simulasi',
      is_active: 1
    }),
  });
  const data = await response.json();
  console.log('Product created:', data);
}
seedProduct();
