import Papa from 'papaparse';
import type { CSVProduct, Product } from '../types';
import { generateId } from './utils';

export interface ParseResult {
  success: boolean;
  products: Product[];
  errors: string[];
}

export function parseCSV(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const products: Product[] = [];

    Papa.parse<CSVProduct>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        results.data.forEach((row, index) => {
          const rowNum = index + 2; // Account for header row

          // Validate required fields
          if (!row.name?.trim()) {
            errors.push(`Row ${rowNum}: Missing product name`);
            return;
          }

          const price = parseFloat(row.price);
          if (isNaN(price) || price < 0) {
            errors.push(`Row ${rowNum}: Invalid price "${row.price}"`);
            return;
          }

          const unit = row.unit?.trim().toLowerCase();
          if (unit !== 'lb' && unit !== 'each') {
            errors.push(`Row ${rowNum}: Unit must be "lb" or "each", got "${row.unit}"`);
            return;
          }

          products.push({
            id: generateId(),
            name: row.name.trim(),
            price: price,
            unit: unit as 'lb' | 'each',
            category: row.category?.trim() || 'Other',
            active: true,
            updatedAt: new Date(),
          });
        });

        resolve({
          success: errors.length === 0,
          products,
          errors,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          products: [],
          errors: [`Failed to parse CSV: ${error.message}`],
        });
      },
    });
  });
}

export function generateSampleCSV(): string {
  return `name,price,unit,category
Tomatoes,3.50,lb,Vegetables
Roma Tomatoes,3.00,lb,Vegetables
Cherry Tomatoes,4.00,lb,Vegetables
Lettuce,3.00,each,Vegetables
Kale,3.50,each,Vegetables
Spinach,4.00,each,Vegetables
Basil,2.00,each,Herbs
Cilantro,1.50,each,Herbs
Mint,2.00,each,Herbs
Apples,4.00,lb,Fruits
Oranges,3.50,lb,Fruits
Bananas,2.00,lb,Fruits
Eggs (dozen),6.00,each,Dairy
Honey (8oz),8.00,each,Other`;
}

export function downloadSampleCSV(): void {
  const csv = generateSampleCSV();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-products.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportOrdersToCSV(orders: { id: string; total: number; createdAt: Date | string; items: { name: string; quantity: number; lineTotal: number }[] }[]): void {
  const rows = [['Order ID', 'Date', 'Item', 'Quantity', 'Line Total', 'Order Total']];

  orders.forEach((order) => {
    const dateStr = typeof order.createdAt === 'string'
      ? order.createdAt
      : order.createdAt.toISOString();
    order.items.forEach((item, index) => {
      rows.push([
        index === 0 ? order.id : '',
        index === 0 ? dateStr : '',
        item.name,
        item.quantity.toString(),
        item.lineTotal.toFixed(2),
        index === 0 ? order.total.toFixed(2) : '',
      ]);
    });
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
