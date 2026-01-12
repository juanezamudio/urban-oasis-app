import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore, getCurrentPins, updatePins } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { ProductGrid } from '../components/ProductGrid';
import { AddItemModal } from '../components/AddItemModal';
import { CustomItemModal } from '../components/CustomItemModal';
import { Cart } from '../components/Cart';
import { BottomNav } from '../components/BottomNav';
import { UndoToast } from '../components/UndoToast';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { SyncStatus } from '../components/SyncStatus';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { OnboardingTour, type TourStep } from '../components/OnboardingTour';
import { useOnboarding } from '../hooks/useOnboarding';
import type { Product, CartItem, PaymentMethod, Order } from '../types';
import logo from '../assets/uop-logo.png';

export function POS() {
  const { role } = useAuthStore();
  const { products, isLoading, subscribeToProducts, addProduct } = useProductStore();
  const { items, addItem, clearCart, restoreItems, getTotal } = useCartStore();
  const { createOrder, deleteOrder } = useOrderStore();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);

  // Payment and checkout state
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Undo state
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastCartItems, setLastCartItems] = useState<CartItem[]>([]);

  const { isActive: isTourActive, completeOnboarding, skipOnboarding, restartOnboarding } = useOnboarding(
    role === 'admin' ? 'admin' : 'volunteer'
  );

  const [showSettings, setShowSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [volunteerPin, setVolunteerPin] = useState('');
  const [adminPin, setAdminPin] = useState('');

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

  useEffect(() => {
    if (showPinModal) {
      const pins = getCurrentPins();
      setVolunteerPin(pins.volunteerPin);
      setAdminPin(pins.adminPin);
    }
  }, [showPinModal]);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsAddModalOpen(true);
  };

  const handleAddItem = (product: Product, quantity: number) => {
    addItem(product, quantity);
  };

  const handleCustomItemCreate = async (product: Product, saveToDatabase: boolean) => {
    if (saveToDatabase) {
      await addProduct(product);
    }
    setSelectedProduct(product);
    setIsAddModalOpen(true);
  };

  // Get unique categories for custom item modal, with "Other" always last
  const categories = Array.from(new Set(products.map((p) => p.category)))
    .filter(cat => cat !== 'Other')
    .sort();

  const handleCheckoutClick = () => {
    if (items.length === 0) return;
    setShowPaymentModal(true);
  };

  const handlePaymentSelect = async (paymentMethod: PaymentMethod) => {
    setIsProcessing(true);
    try {
      const total = getTotal();
      // Store cart items before clearing for potential undo
      setLastCartItems([...items]);
      const order = await createOrder(items, total, paymentMethod);
      setLastOrderId(order.id);
      setLastOrder(order);
      clearCart();
      setShowPaymentModal(false);
      // Show undo toast instead of receipt modal
      setShowUndoToast(true);
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = useCallback(async () => {
    if (lastOrderId && lastCartItems.length > 0) {
      // Restore cart items
      restoreItems(lastCartItems);
      // Delete the order
      await deleteOrder(lastOrderId);
      // Reset undo state
      setShowUndoToast(false);
      setLastOrderId(null);
      setLastCartItems([]);
      setLastOrder(null);
    }
  }, [lastOrderId, lastCartItems, restoreItems, deleteOrder]);

  const handleUndoExpire = useCallback(() => {
    setShowUndoToast(false);
    setLastOrderId(null);
    setLastCartItems([]);
    // Show receipt modal after undo expires
    setShowReceipt(true);
  }, []);

  const handleSavePins = () => {
    if (volunteerPin.length !== 4 || adminPin.length !== 4) {
      return;
    }
    updatePins(volunteerPin, adminPin);
    setShowPinModal(false);
  };

  return (
    <div className="h-screen bg-stone-900 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col h-full sm:h-[calc(100vh-3rem)] sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden sm:pt-4">
        {/* Header */}
        <header className="px-4 sm:px-6 pb-4 safe-top-header sm:pt-4">
          <div className="flex flex-col items-center gap-2">
            <div data-tour="header" className="flex items-center gap-3 sm:gap-4 bg-gradient-to-b from-stone-700/60 to-stone-800/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-stone-400/40 shadow-lg shadow-black/20 ring-1 ring-white/5">
              <img src={logo} alt="Urban Oasis" className="h-20 sm:h-24" />
              <h1 className="font-display font-bold tracking-tight" style={{ lineHeight: '0.9' }}>
                <span className="block text-xl sm:text-2xl text-stone-50">Harvest</span>
                <span className="block text-xl sm:text-2xl text-emerald-400">
                  Point<span className="text-stone-500 text-xs sm:text-sm align-top ml-0.5">™</span>
                </span>
              </h1>
            </div>
            <SyncStatus />
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
      <Cart onCheckout={handleCheckoutClick} isProcessing={isProcessing} />

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

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentModal}
        total={getTotal()}
        isProcessing={isProcessing}
        onSelect={handlePaymentSelect}
        onClose={() => setShowPaymentModal(false)}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        order={lastOrder}
        onClose={() => {
          setShowReceipt(false);
          setLastOrder(null);
        }}
      />

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)}>
        <div className="p-6">
          <h2 className="font-display text-xl font-semibold text-stone-900 mb-6">
            Settings
          </h2>

          <div className="space-y-4">
            {role === 'admin' && (
              <div className="bg-stone-100 rounded-xl p-4">
                <h3 className="font-medium text-stone-900 mb-1">PIN Settings</h3>
                <p className="text-sm text-stone-600 mb-3">
                  Change the volunteer and admin access PINs
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowSettings(false);
                    setShowPinModal(true);
                  }}
                >
                  Change PINs
                </Button>
              </div>
            )}

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

      {/* PIN Modal */}
      <Modal isOpen={showPinModal} onClose={() => setShowPinModal(false)}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">Change PINs</h2>
          <div className="space-y-4 mb-6">
            <Input
              label="Volunteer PIN"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={volunteerPin}
              onChange={(e) =>
                setVolunteerPin(e.target.value.replace(/\D/g, ''))
              }
              placeholder="4 digits"
            />
            <Input
              label="Admin PIN"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4 digits"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowPinModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleSavePins}
              disabled={volunteerPin.length !== 4 || adminPin.length !== 4}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Bottom Nav */}
      <BottomNav
        activePage="pos"
        onSettingsClick={() => setShowSettings(true)}
        tourTarget="nav"
      />

      {/* Undo Toast */}
      <UndoToast
        isVisible={showUndoToast}
        total={lastOrder?.total ?? 0}
        onUndo={handleUndo}
        onExpire={handleUndoExpire}
      />

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
