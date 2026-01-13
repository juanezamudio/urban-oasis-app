import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore, getCurrentPins, updatePins, subscribeToPins } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useOrderStore } from '../store/orderStore';
import { useAnnouncementStore, type AnnouncementType, ANNOUNCEMENT_CHAR_LIMIT } from '../store/announcementStore';
import { useGoalStore } from '../store/goalStore';
import { ProductGrid } from '../components/ProductGrid';
import { AddItemModal } from '../components/AddItemModal';
import { CustomItemModal } from '../components/CustomItemModal';
import { Cart } from '../components/Cart';
import { BottomNav } from '../components/BottomNav';
import { UndoToast } from '../components/UndoToast';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { SyncStatus } from '../components/SyncStatus';
import { AnnouncementBanner } from '../components/AnnouncementBanner';
import { DailyGoalBanner } from '../components/DailyGoalBanner';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { OnboardingTour, type TourStep } from '../components/OnboardingTour';
import { useOnboarding } from '../hooks/useOnboarding';
import { cn } from '../lib/utils';
import type { Product, CartItem, PaymentMethod, Order } from '../types';
import logo from '../assets/uop-logo.png';

export function POS() {
  const { role } = useAuthStore();
  const { products, isLoading, subscribeToProducts, addProduct } = useProductStore();
  const { items, addItem, clearCart, restoreItems, getSubtotal, getTotal, getDiscountAmount, discount } = useCartStore();
  const { createOrder, deleteOrder } = useOrderStore();

  const {
    announcements,
    addAnnouncement,
    removeAnnouncement,
    clearAllAnnouncements,
    subscribeToAnnouncements,
  } = useAnnouncementStore();

  const {
    target: currentGoalTarget,
    setGoal,
    clearGoal,
  } = useGoalStore();

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
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [volunteerPin, setVolunteerPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [goalSaved, setGoalSaved] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('info');

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

  // Subscribe to PIN changes from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToPins();
    return unsubscribe;
  }, []);

  // Subscribe to announcements from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements();
    return unsubscribe;
  }, [subscribeToAnnouncements]);

  useEffect(() => {
    if (showPinModal) {
      const pins = getCurrentPins();
      setVolunteerPin(pins.volunteerPin);
      setAdminPin(pins.adminPin);
    }
  }, [showPinModal]);

  // Sync goal input with current goal
  useEffect(() => {
    if (currentGoalTarget > 0) {
      setGoalInput(currentGoalTarget.toString());
    }
  }, [currentGoalTarget]);

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
      const subtotal = getSubtotal();
      const total = getTotal();
      const discountAmount = getDiscountAmount();

      // Build discount object if applicable
      const orderDiscount = discount.type !== 'none' && discountAmount > 0
        ? {
            type: discount.type,
            value: discount.value,
            label: discount.label,
            amount: discountAmount,
          }
        : undefined;

      // Store cart items before clearing for potential undo
      setLastCartItems([...items]);
      const order = await createOrder(items, subtotal, total, paymentMethod, orderDiscount);
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

  const handleSavePins = async () => {
    if (volunteerPin.length !== 4 || adminPin.length !== 4) {
      return;
    }
    await updatePins(volunteerPin, adminPin);
    setShowPinModal(false);
  };

  const hasAnnouncements = announcements.length > 0;

  return (
    <div className="h-screen bg-stone-900 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col h-full sm:h-[calc(100vh-3rem)] sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden">
        {/* Safe area spacer - only on mobile for notch */}
        <div className="safe-top-header sm:hidden" />

        {/* Collapsible Header - Logo Section Only */}
        <div className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isHeaderCollapsed ? "max-h-0 opacity-0" : "max-h-[130px] opacity-100"
        )}>
          <header className="px-4 sm:px-6 pb-1">
            <div className="flex flex-col items-center">
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
        </div>

        {/* Status Bar - Daily Goal & Announcements (Always Visible) */}
        <div className={cn(
          "px-4 sm:px-6 pb-1",
          "flex flex-col sm:flex-row gap-2",
          isHeaderCollapsed ? "pt-0" : "pt-4"
        )}>
          <div className={cn(
            "w-full",
            hasAnnouncements ? "sm:w-2/3" : "sm:w-full"
          )}>
            <DailyGoalBanner />
          </div>
          {hasAnnouncements && (
            <div className="w-full sm:w-1/3">
              <AnnouncementBanner />
            </div>
          )}
        </div>

      {/* Product Grid */}
      <ProductGrid
        products={products}
        onProductClick={handleProductClick}
        onCustomItemClick={() => setIsCustomModalOpen(true)}
        isLoading={isLoading}
        onScrollChange={setIsHeaderCollapsed}
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
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} noInternalScroll noBottomPadding>
        <div className="flex flex-col h-full max-h-[85vh]">
          {/* Fixed Header */}
          <div className="flex-shrink-0 p-4 pb-2 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-stone-900">
                Settings
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {role === 'admin' && (
                <>
                  <div className="bg-stone-100 rounded-xl p-4">
                    <h3 className="font-medium text-stone-900 mb-1">Daily Sales Goal</h3>
                    <p className="text-sm text-stone-600 mb-3">
                      Set a target for today's sales - visible on all POS screens
                    </p>
                    <div className="relative mb-3">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                      <input
                        type="number"
                        value={goalInput}
                        onChange={(e) => setGoalInput(e.target.value)}
                        placeholder="500"
                        className="w-full pl-7 pr-3 py-2 bg-white border border-stone-300 rounded-lg text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const value = parseFloat(goalInput);
                          if (value > 0) {
                            setGoal(value);
                            setGoalSaved(true);
                            setTimeout(() => setGoalSaved(false), 2000);
                          }
                        }}
                        disabled={!goalInput || parseFloat(goalInput) <= 0 || goalSaved}
                        className={goalSaved ? '!bg-emerald-500 !text-white !border-emerald-500' : ''}
                      >
                        {goalSaved ? (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Goal Set!
                          </span>
                        ) : (
                          'Set Goal'
                        )}
                      </Button>
                      {currentGoalTarget > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            clearGoal();
                            setGoalInput('');
                          }}
                          className="!text-red-600 !border-red-300 hover:!bg-red-50"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-100 rounded-xl p-4">
                    <h3 className="font-medium text-stone-900 mb-1">Announcements</h3>
                    <p className="text-sm text-stone-600 mb-3">
                      Post messages that all volunteers will see on the POS screen
                    </p>
                    {announcements.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {announcements.map((announcement) => (
                          <div
                            key={announcement.id}
                            className={cn(
                              'p-2 rounded-lg text-sm flex items-start justify-between gap-2',
                              announcement.type === 'info' ? 'bg-blue-100 text-blue-800' :
                              announcement.type === 'warning' ? 'bg-amber-100 text-amber-800' :
                              'bg-red-100 text-red-800'
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <span className="font-medium capitalize">{announcement.type}:</span> {announcement.message}
                            </div>
                            <button
                              onClick={() => removeAnnouncement(announcement.id)}
                              className="shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
                              title="Remove announcement"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAnnouncementMessage('');
                          setAnnouncementType('info');
                          setShowSettings(false);
                          setShowAnnouncementModal(true);
                        }}
                      >
                        Add Announcement
                      </Button>
                      {announcements.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => clearAllAnnouncements()}
                          className="!text-red-600 !border-red-300 hover:!bg-red-50"
                        >
                          Clear All
                        </Button>
                      )}
                    </div>
                  </div>

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
                </>
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
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 p-4 pt-2 border-t border-stone-200">
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

      {/* Announcement Modal */}
      <Modal isOpen={showAnnouncementModal} onClose={() => setShowAnnouncementModal(false)}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Add Announcement
          </h2>

          <div className="space-y-4 mb-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-stone-700">
                  Message
                </label>
                <span className={cn(
                  'text-xs',
                  announcementMessage.length > ANNOUNCEMENT_CHAR_LIMIT ? 'text-red-500' : 'text-stone-400'
                )}>
                  {announcementMessage.length}/{ANNOUNCEMENT_CHAR_LIMIT}
                </span>
              </div>
              <input
                type="text"
                value={announcementMessage}
                onChange={(e) => setAnnouncementMessage(e.target.value.slice(0, ANNOUNCEMENT_CHAR_LIMIT))}
                placeholder="Keep it short and impactful..."
                maxLength={ANNOUNCEMENT_CHAR_LIMIT}
                className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Type
              </label>
              <div className="flex gap-2">
                {(['info', 'warning', 'urgent'] as AnnouncementType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAnnouncementType(type)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                      announcementType === type
                        ? type === 'info'
                          ? 'bg-blue-500 text-white'
                          : type === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {announcementMessage && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Preview
                </label>
                <div className={cn(
                  'p-3 rounded-xl border flex items-center gap-2',
                  announcementType === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                  announcementType === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                  'bg-red-50 border-red-200 text-red-800'
                )}>
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {announcementType === 'info' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : announcementType === 'warning' ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <p className="text-sm font-medium">{announcementMessage}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowAnnouncementModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => {
                if (announcementMessage.trim()) {
                  addAnnouncement(announcementMessage.trim(), announcementType);
                  setShowAnnouncementModal(false);
                  setAnnouncementMessage('');
                  setAnnouncementType('info');
                }
              }}
              disabled={!announcementMessage.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Bottom Nav - hidden when receipt or settings is shown */}
      {!showReceipt && !showSettings && (
        <BottomNav
          activePage="pos"
          onSettingsClick={() => setShowSettings(true)}
          tourTarget="nav"
        />
      )}

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
