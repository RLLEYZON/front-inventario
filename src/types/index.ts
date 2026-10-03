export interface Warehouse {
  id: string;
  name: string;
  location?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  unit: string;
  minStock: number;
  barcode?: string;
  isActive: boolean;
  price: number;
}

export interface Batch {
  id: string;
  productId: string;
  batchNumber: string;
  expirationDate?: string; // YYYY-MM-DD
}

export interface Stock {
  id: string;
  productId: string;
  batchId?: string;
  warehouseId: string;
  quantity: number;
}

export type MovementType = 'IN' | 'OUT' | 'TRANSFER' | 'RETURN_IN' | 'RETURN_OUT';

export interface Movement {
  id: string;
  type: MovementType;
  productId: string;
  batchId?: string;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  quantity: number;
  date: string; // ISO String
  responsible: string;
  document?: string;
  observations?: string;
}

export type AdjustmentType = 'SHRINKAGE' | 'SHORTAGE' | 'SURPLUS';
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Adjustment {
  id: string;
  type: AdjustmentType;
  productId: string;
  batchId?: string;
  warehouseId: string;
  quantity: number;
  reason: string;
  evidenceUrl?: string;
  status: AdjustmentStatus;
  date: string;
  requestedBy: string;
  approvedBy?: string;
}
