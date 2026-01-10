import type { ReactNode } from 'react';
import { Modal } from './ui/Modal';
import { formatCurrency } from '../lib/utils';
import type { PaymentMethod } from '../types';

interface PaymentMethodModalProps {
  isOpen: boolean;
  total: number;
  isProcessing: boolean;
  onSelect: (method: PaymentMethod) => void;
  onClose: () => void;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: ReactNode }[] = [
  {
    id: 'cash',
    label: 'Cash',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'card',
    label: 'Card',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'voucher',
    label: 'Voucher',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    ),
  },
];

export function PaymentMethodModal({
  isOpen,
  total,
  isProcessing,
  onSelect,
  onClose,
}: PaymentMethodModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="font-display text-xl font-semibold text-stone-900 text-center mb-2">
          Payment Method
        </h2>
        <p className="text-center text-stone-600 mb-6">
          Total: <span className="font-display font-bold text-emerald-700 text-xl">{formatCurrency(total)}</span>
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => onSelect(method.id)}
              disabled={isProcessing}
              className="flex flex-col items-center justify-center p-4 bg-stone-100 hover:bg-emerald-50 border-2 border-stone-200 hover:border-emerald-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-stone-700 mb-2">{method.icon}</span>
              <span className="font-medium text-stone-900">{method.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="w-full py-3 text-stone-600 hover:text-stone-800 font-medium transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
}
