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

export type PaymentMethod = 'cash' | 'card' | 'voucher';

export type DiscountType = 'percentage' | 'fixed' | 'none';

export interface OrderDiscount {
  type: DiscountType;
  value: number;
  label: string;
  amount: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  subtotal: number;
  discount?: OrderDiscount;
  total: number;
  paymentMethod: PaymentMethod;
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
