import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { ProductGrid } from '../components/ProductGrid';
import { AddItemModal } from '../components/AddItemModal';
import { CustomItemModal } from '../components/CustomItemModal';
import { Cart } from '../components/Cart';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { OnboardingTour, type TourStep } from '../components/OnboardingTour';
import { useOnboarding } from '../hooks/useOnboarding';
import type { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import logo from '../assets/uop-logo.png';

export function POS() {
  const navigate = useNavigate();
  const { role, logout } = useAuthStore();
  const { products, isLoading, subscribeToProducts } = useProductStore();
  const { items, addItem, clearCart, getTotal } = useCartStore();
  const { createOrder } = useOrderStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);

  const { isActive: isTourActive, completeOnboarding, skipOnboarding, restartOnboarding } = useOnboarding(
    role === 'admin' ? 'admin' : 'volunteer'
  );

  const [showSettings, setShowSettings] = useState(false);

  const tourSteps: TourStep[] = useMemo(() => {
    const baseSteps: TourStep[] = [
      {
        target: '[data-tour="header"]',
        title: 'Welcome to Harvest Point!',
        description: 'This is your point-of-sale system for the Urban Oasis farmers market. Let\'s take a quick tour.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="search"]',
        title: 'Search Products',
        description: 'Use the search bar to quickly find products by name.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="categories"]',
        title: 'Filter by Category',
        description: 'Tap a category to filter products. Scroll horizontally to see all categories.',
        placement: 'bottom',
      },
      {
        target: '[data-tour="products"]',
        title: 'Product Grid',
        description: 'Tap any product card to add it to the cart. Products are sorted alphabetically.',
        placement: 'top',
      },
      {
        target: '[data-tour="cart"]',
        title: 'Shopping Cart',
        description: 'View items in the cart, adjust quantities, and see the running total.',
        placement: 'top',
      },
      {
        target: '[data-tour="checkout"]',
        title: 'Complete Orders',
        description: 'Tap the checkout button to complete the order and record the sale.',
        placement: 'top',
      },
      {
        target: '[data-tour="nav"]',
        title: 'Navigation',
        description: role === 'admin'
          ? 'Access the admin dashboard for orders, products, and settings. Tap logout when done.'
          : 'Tap logout when you\'re done with your session.',
        placement: 'top',
      },
    ];
    return baseSteps;
  }, [role]);

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

  const handleCustomItemCreate = (product: Product) => {
    setSelectedProduct(product);
    setIsAddModalOpen(true);
  };

  // Get unique categories for custom item modal, with "Other" always last
  const categories = Array.from(new Set(products.map((p) => p.category)))
    .filter(cat => cat !== 'Other')
    .sort();

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
    <div className="h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col h-full sm:h-[calc(100vh-3rem)] sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden sm:pt-4">
        {/* Header */}
        <header className="px-4 sm:px-6 pt-4 pb-4 safe-top">
          <div className="flex items-center justify-center">
            <div data-tour="header" className="flex items-center gap-3 sm:gap-4 bg-gradient-to-b from-stone-700/60 to-stone-800/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-stone-400/40 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <img src={logo} alt="Urban Oasis" className="h-20 sm:h-24" />
              <h1 className="font-display font-bold tracking-tight" style={{ lineHeight: '0.9' }}>
                <span className="block text-xl sm:text-2xl text-stone-50">Harvest</span>
                <span className="block text-xl sm:text-2xl text-emerald-400">
                  Point<span className="text-stone-500 text-xs sm:text-sm align-top ml-0.5">™</span>
                </span>
              </h1>
            </div>
          </div>
        </header>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        onProductClick={handleProductClick}
        onCustomItemClick={() => setIsCustomModalOpen(true)}
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

      {/* Custom Item Modal */}
      <CustomItemModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        onAdd={handleCustomItemCreate}
        categories={categories}
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
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-2">
            Order Complete!
          </h2>
          <p className="text-stone-600 mb-2">Collect payment from customer</p>
          <p className="font-display text-3xl font-bold text-emerald-700 mb-6">
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

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)}>
        <div className="p-6">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-6">
            Settings
          </h2>

          <div className="space-y-4">
            <div className="bg-stone-100 rounded-xl p-4">
              <h3 className="font-medium text-stone-900 mb-1">Help & Tour</h3>
              <p className="text-sm text-stone-600 mb-3">
                View the guided tour again to learn how to use the app
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowSettings(false);
                  restartOnboarding();
                }}
              >
                Restart Tour
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowSettings(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Bottom Nav */}
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div data-tour="nav" className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-full px-2 py-2 shadow-2xl">
          {/* Home/POS - Active */}
          <button className="flex flex-col items-center justify-center w-14 h-10 rounded-full bg-emerald-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

      {/* Onboarding Tour */}
      <OnboardingTour
        steps={tourSteps}
        isActive={isTourActive}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />
      </div>
    </div>
  );
}
