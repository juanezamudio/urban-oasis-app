export interface Product {
  id: string;
  name: string;
  price: number;
  unit: 'lb' | 'each';
  category: string;
  active: boolean;
  updatedAt: Date;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  unit: 'lb' | 'each';
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  createdAt: Date;
  createdBy: string;
  synced: boolean;
}

export interface OrderItem {
  name: string;
  price: number;
  unit: 'lb' | 'each';
  quantity: number;
  lineTotal: number;
}

export interface AppConfig {
  volunteerPin: string;
  adminPin: string;
}

export type UserRole = 'volunteer' | 'admin' | null;

export interface CSVProduct {
  name: string;
  price: string;
  unit: string;
  category: string;
}
