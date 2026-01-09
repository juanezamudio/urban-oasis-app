import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { ProductGrid } from '../components/ProductGrid';
import { AddItemModal } from '../components/AddItemModal';
import { Cart } from '../components/Cart';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import type { Product } from '../types';
import { formatCurrency } from '../lib/utils';

export function POS() {
  const navigate = useNavigate();
  const { role, logout } = useAuthStore();
  const { products, isLoading, subscribeToProducts } = useProductStore();
  const { items, addItem, clearCart, getTotal } = useCartStore();
  const { createOrder } = useOrderStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeToProducts();
    return unsubscribe;
  }, [subscribeToProducts]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsAddModalOpen(true);
  };

  const handleAddItem = (product: Product, quantity: number) => {
    addItem(product, quantity);
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    try {
      const total = getTotal();
      await createOrder(items, total);
      setLastOrderTotal(total);
      clearCart();
      setShowSuccess(true);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6">
      <div className="w-full max-w-5xl flex flex-col min-h-screen sm:min-h-[calc(100vh-3rem)] sm:my-auto sm:max-h-[calc(100vh-3rem)] bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden sm:pt-4">
        {/* Header - Minimal */}
        <header className="px-4 sm:px-6 pt-4 pb-4 safe-top">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl font-bold text-stone-50 tracking-tight">
                Urban Oasis
              </h1>
              <p className="text-xs font-medium text-emerald-400">
                {role === 'admin' ? 'Admin Mode' : 'Farmers Market POS'}
              </p>
            </div>
          </div>
        </header>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        onProductClick={handleProductClick}
        isLoading={isLoading}
      />

      {/* Cart */}
      <Cart onCheckout={handleCheckout} isProcessing={isProcessing} />

      {/* Add Item Modal */}
      <AddItemModal
        product={selectedProduct}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddItem}
      />

      {/* Success Modal */}
      <Modal isOpen={showSuccess} onClose={() => setShowSuccess(false)}>
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-900 mb-2">
            Order Complete!
          </h2>
          <p className="text-stone-600 mb-2">Collect payment from customer</p>
          <p className="text-3xl font-bold text-emerald-700 mb-6">
            {formatCurrency(lastOrderTotal)}
          </p>
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setShowSuccess(false)}
          >
            Next Customer
          </Button>
        </div>
      </Modal>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-full px-2 py-2 shadow-2xl">
          {/* Home/POS - Active */}
          <button className="flex flex-col items-center justify-center w-14 h-10 rounded-full bg-emerald-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          {/* Admin - Only show if admin */}
          {role === 'admin' && (
            <button
              onClick={() => navigate('/admin')}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
