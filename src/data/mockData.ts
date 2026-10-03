import { Product, Warehouse, Category, Batch, Stock, Movement, Adjustment } from '../types';

export const mockCategories: Category[] = [
  { id: 'c1', name: 'Abarrotes' },
  { id: 'c2', name: 'Lácteos' },
  { id: 'c3', name: 'Limpieza' },
];

export const mockWarehouses: Warehouse[] = [
  { id: 'w1', name: 'Almacén Principal' },
  { id: 'w2', name: 'Almacén Secundario' },
];

export const mockProducts: Product[] = [
  { id: 'p1', code: 'PROD-001', name: 'Arroz Extra 50kg', categoryId: 'c1', unit: 'Saco', minStock: 10, isActive: true, price: 150.00, barcode: '7751234567890' },
  { id: 'p2', code: 'PROD-002', name: 'Leche Evaporada x 48', categoryId: 'c2', unit: 'Caja', minStock: 5, isActive: true, price: 180.00 },
  { id: 'p3', code: 'PROD-003', name: 'Detergente Industrial 15kg', categoryId: 'c3', unit: 'Bolsa', minStock: 3, isActive: true, price: 85.00 },
];

export const mockBatches: Batch[] = [
  { id: 'b1', productId: 'p2', batchNumber: 'LOTE-123', expirationDate: '2026-12-31' },
  { id: 'b2', productId: 'p2', batchNumber: 'LOTE-124', expirationDate: '2027-01-31' },
];

export const mockStock: Stock[] = [
  { id: 's1', productId: 'p1', warehouseId: 'w1', quantity: 15 },
  { id: 's2', productId: 'p1', warehouseId: 'w2', quantity: 5 },
  { id: 's3', productId: 'p2', batchId: 'b1', warehouseId: 'w1', quantity: 2 }, // Low stock (total 12, min 5, but we can have individual low stock alert logic)
  { id: 's4', productId: 'p2', batchId: 'b2', warehouseId: 'w1', quantity: 10 },
  { id: 's5', productId: 'p3', warehouseId: 'w1', quantity: 12 },
];

export const mockMovements: Movement[] = [
  { id: 'm1', type: 'IN', productId: 'p1', toWarehouseId: 'w1', quantity: 20, date: new Date(Date.now() - 86400000 * 2).toISOString(), responsible: 'Juan Pérez', document: 'FAC-001' },
  { id: 'm2', type: 'OUT', productId: 'p1', fromWarehouseId: 'w1', quantity: 5, date: new Date(Date.now() - 86400000).toISOString(), responsible: 'María López', document: 'GR-102' },
  { id: 'm3', type: 'TRANSFER', productId: 'p1', fromWarehouseId: 'w1', toWarehouseId: 'w2', quantity: 5, date: new Date(Date.now() - 40000000).toISOString(), responsible: 'Juan Pérez', observations: 'Reabastecimiento local' },
];

export const mockAdjustments: Adjustment[] = [
  { id: 'a1', type: 'SHORTAGE', productId: 'p2', batchId: 'b1', warehouseId: 'w1', quantity: 1, reason: 'Diferencia en conteo físico', status: 'PENDING', date: new Date().toISOString(), requestedBy: 'Carlos Gómez' },
];
