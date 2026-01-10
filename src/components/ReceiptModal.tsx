import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { formatCurrency } from '../lib/utils';
import type { Order } from '../types';
import logo from '../assets/uop-logo.png';

interface ReceiptModalProps {
  isOpen: boolean;
  order: Order | null;
  onClose: () => void;
}

export function ReceiptModal({ isOpen, order, onClose }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const receiptUrl = `${window.location.origin}/receipt/${order.id}`;
  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const paymentMethodLabel = {
    cash: 'Cash',
    card: 'Card',
    voucher: 'Voucher',
  }[order.paymentMethod];

  const handleShare = async () => {
    const receiptText = generateReceiptText(order, formattedDate, formattedTime);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Urban Oasis Receipt',
          text: receiptText,
          url: receiptUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(receiptText + '\n\n' + receiptUrl);
        alert('Receipt copied to clipboard!');
      } catch {
        console.error('Clipboard copy failed');
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-4 max-h-[85vh] overflow-y-auto">
        {/* Receipt Card */}
        <div
          ref={receiptRef}
          className="bg-white rounded-xl p-5 shadow-sm border border-stone-200"
        >
          {/* Header */}
          <div className="text-center border-b border-dashed border-stone-300 pb-4 mb-4">
            <img src={logo} alt="Urban Oasis" className="h-16 mx-auto mb-2" />
            <h2 className="font-display text-lg font-bold text-stone-900">
              Urban Oasis Project
            </h2>
            <p className="text-xs text-stone-500">Farmers Market</p>
            <p className="text-xs text-stone-500 mt-1">
              {formattedDate} at {formattedTime}
            </p>
          </div>

          {/* Items */}
          <div className="space-y-2 mb-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between text-sm">
                <div className="flex-1">
                  <span className="text-stone-800">{item.name}</span>
                  <span className="text-stone-500 ml-1">
                    × {item.quantity} {item.unit === 'lb' ? 'lb' : ''}
                  </span>
                </div>
                <span className="text-stone-800 font-medium ml-2">
                  {formatCurrency(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-stone-300 my-3" />

          {/* Total */}
          <div className="flex justify-between items-center mb-2">
            <span className="font-display font-semibold text-stone-900">Total</span>
            <span className="font-display text-xl font-bold text-emerald-700">
              {formatCurrency(order.total)}
            </span>
          </div>

          {/* Payment Method */}
          <div className="flex justify-between items-center text-sm text-stone-600 mb-4">
            <span>Payment</span>
            <span className="font-medium">{paymentMethodLabel}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-stone-300 my-3" />

          {/* QR Code */}
          <div className="text-center">
            <p className="text-xs text-stone-500 mb-2">Scan for digital receipt</p>
            <div className="inline-block p-2 bg-white rounded-lg border border-stone-200">
              <QRCodeSVG
                value={receiptUrl}
                size={100}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-[10px] text-stone-400 mt-2">Order #{order.id.slice(-6).toUpperCase()}</p>
          </div>

          {/* Footer */}
          <div className="text-center mt-4 pt-3 border-t border-dashed border-stone-300">
            <p className="text-xs text-stone-500">Thank you for supporting</p>
            <p className="text-xs text-stone-500">local farmers!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleShare}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={onClose}
          >
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function generateReceiptText(order: Order, date: string, time: string): string {
  const lines = [
    '🌿 URBAN OASIS PROJECT',
    'Farmers Market Receipt',
    `${date} at ${time}`,
    '',
    '------------------------',
  ];

  order.items.forEach((item) => {
    const qty = item.unit === 'lb' ? `${item.quantity} lb` : `×${item.quantity}`;
    lines.push(`${item.name} ${qty}`);
    lines.push(`  ${formatCurrency(item.lineTotal)}`);
  });

  lines.push('------------------------');
  lines.push(`TOTAL: ${formatCurrency(order.total)}`);
  lines.push(`Paid by: ${order.paymentMethod.charAt(0).toUpperCase() + order.paymentMethod.slice(1)}`);
  lines.push('');
  lines.push('Thank you for supporting local farmers!');

  return lines.join('\n');
}
