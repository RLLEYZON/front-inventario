const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export const login = async (credentials: any) => {
  const res = await fetch(`${API_URL}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null);
    throw new Error(errorData?.message || 'Error al iniciar sesión');
  }
  return res.json();
};

export const fetchProducts = async () => {
  const res = await fetch(`${API_URL}/products`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
};

export const fetchCategories = async () => {
  const res = await fetch(`${API_URL}/categories`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
};

export const fetchWarehouses = async () => {
  const res = await fetch(`${API_URL}/warehouses`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  return res.json();
};

export const fetchBatches = async () => {
  const res = await fetch(`${API_URL}/batches`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch batches');
  return res.json();
};

export const fetchStock = async () => {
  const res = await fetch(`${API_URL}/stock`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch stock');
  return res.json();
};

export const createProduct = async (data: any) => {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create product');
  return res.json();
};

export const createMovement = async (data: any) => {
  const res = await fetch(`${API_URL}/movements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create movement');
  return res.json();
};

export const fetchMovements = async () => {
  const res = await fetch(`${API_URL}/movements`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch movements');
  return res.json();
};

export const createAdjustment = async (data: any) => {
  const res = await fetch(`${API_URL}/adjustments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create adjustment');
  return res.json();
};

export const fetchAdjustments = async () => {
  const res = await fetch(`${API_URL}/adjustments`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch adjustments');
  return res.json();
};

export const createCategory = async (data: any) => {
  const res = await fetch(`${API_URL}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create category');
  return res.json();
};

export const createWarehouse = async (data: any) => {
  const res = await fetch(`${API_URL}/warehouses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create warehouse');
  return res.json();
};

export const resetSystem = async () => {
  const res = await fetch(`${API_URL}/system/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to reset system');
  return res.json();
};

export const exportSystemData = async () => {
  const res = await fetch(`${API_URL}/system/backup`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to export system data');
  return res.json();
};
