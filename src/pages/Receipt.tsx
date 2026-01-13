import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useOrderStore } from '../store/orderStore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { formatCurrency } from '../lib/utils';
import type { Order } from '../types';
import logo from '../assets/uop-logo.png';

export function Receipt() {
  const { id } = useParams<{ id: string }>();
  const { allOrders } = useOrderStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Try to find order in local storage first
    const foundOrder = allOrders.find((o) => o.id === id);

    if (foundOrder) {
      setOrder(foundOrder);
      setLoading(false);
      return;
    }

    // Order not found locally - try Firebase
    if (isFirebaseConfigured && db) {
      fetchFromFirebase(id);
    } else {
      setNotFound(true);
      setLoading(false);
    }

    async function fetchFromFirebase(orderId: string) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const orderRef = doc(db!, 'orders', orderId);
        const orderSnap = await getDoc(orderRef);

        if (orderSnap.exists()) {
          const data = orderSnap.data();
          const fetchedOrder: Order = {
            id: orderSnap.id,
            items: data.items || [],
            subtotal: data.subtotal || data.total || 0,
            discount: data.discount || undefined,
            total: data.total || 0,
            paymentMethod: data.paymentMethod || 'cash',
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy || '',
            synced: true,
          };
          setOrder(fetchedOrder);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Error fetching receipt from Firebase:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
  }, [id, allOrders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-stone-600">Loading receipt...</p>
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-stone-900 mb-2">
            Receipt Not Found
          </h1>
          <p className="text-stone-600 text-sm mb-6">
            This receipt may have expired or is not available on this device.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-emerald-600 text-white rounded-full font-medium hover:bg-emerald-700 transition-colors"
          >
            Go to Harvest Point
          </Link>
        </div>
      </div>
    );
  }

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
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

  return (
    <div className="min-h-screen bg-stone-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Receipt Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 px-6 py-8 text-center">
            <img src={logo} alt="Urban Oasis" className="h-20 mx-auto mb-3 drop-shadow-lg" />
            <h1 className="font-display text-2xl font-bold text-white">
              Urban Oasis Project
            </h1>
            <p className="text-emerald-100 text-sm mt-1">Farmers Market</p>
          </div>

          {/* Receipt Details */}
          <div className="p-6">
            {/* Date/Time */}
            <div className="text-center mb-6 pb-4 border-b border-dashed border-stone-200">
              <p className="text-stone-600 text-sm">{formattedDate}</p>
              <p className="text-stone-500 text-sm">{formattedTime}</p>
              <p className="text-stone-400 text-xs mt-1">
                Order #{order.id.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-6">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-stone-800">{item.name}</p>
                    <p className="text-sm text-stone-500">
                      {item.quantity} {item.unit === 'lb' ? 'lb' : item.quantity === 1 ? 'item' : 'items'} @ {formatCurrency(item.price)}/{item.unit}
                    </p>
                  </div>
                  <p className="font-medium text-stone-800 ml-4">
                    {formatCurrency(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="border-t border-dashed border-stone-200 my-4" />

            {/* Subtotal & Discount */}
            {order.discount && order.discount.amount > 0 && (
              <>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-stone-600">Subtotal</span>
                  <span className="text-sm text-stone-600">
                    {formatCurrency(order.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-emerald-600">{order.discount.label}</span>
                  <span className="text-sm text-emerald-600">
                    -{formatCurrency(order.discount.amount)}
                  </span>
                </div>
              </>
            )}

            {/* Total */}
            <div className="flex justify-between items-center mb-2">
              <span className="font-display text-lg font-semibold text-stone-900">Total</span>
              <span className="font-display text-2xl font-bold text-emerald-700">
                {formatCurrency(order.total)}
              </span>
            </div>

            {/* Payment Method */}
            <div className="flex justify-between items-center text-sm text-stone-600">
              <span>Payment Method</span>
              <span className="font-medium">{paymentMethodLabel}</span>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-dashed border-stone-200 text-center">
              <p className="text-emerald-700 font-medium">Thank you for your purchase!</p>
              <p className="text-stone-500 text-sm mt-1">
                Supporting local farmers since 2010
              </p>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm text-stone-500 hover:text-emerald-600 transition-colors"
          >
            Visit Harvest Point™
          </Link>
        </div>
      </div>
    </div>
  );
}
