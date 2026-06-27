async function checkClients() {
  const loginRes = await fetch('http://localhost:8787/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sales@rusamas.com', password: 'password123' }),
  });
  const { token } = await loginRes.json();
  
  const response = await fetch('http://localhost:8787/api/v1/clients', {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  console.log('Clients:', data);
}
checkClients();
