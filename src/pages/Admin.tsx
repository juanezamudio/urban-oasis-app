import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, getCurrentPins, updatePins } from '../store/authStore';
import { useProductStore } from '../store/productStore';
import { useOrderStore } from '../store/orderStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { parseCSV, downloadSampleCSV, exportOrdersToCSV } from '../lib/csv';
import { formatCurrency, formatDate } from '../lib/utils';
import type { Product } from '../types';

type Tab = 'orders' | 'products' | 'settings';

export function Admin() {
  const navigate = useNavigate();
  const { role, logout, hasHydrated } = useAuthStore();
  const { products, uploadProducts, subscribeToProducts } = useProductStore();
  const {
    orders,
    subscribeToTodaysOrders,
    getTodayTotal,
    getTodayOrderCount,
  } = useOrderStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[] | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [volunteerPin, setVolunteerPin] = useState('');
  const [adminPin, setAdminPin] = useState('');

  useEffect(() => {
    // Wait for hydration before checking role
    if (!hasHydrated) return;

    if (role !== 'admin') {
      navigate(role === 'volunteer' ? '/pos' : '/');
      return;
    }

    const unsubProducts = subscribeToProducts();
    const unsubOrders = subscribeToTodaysOrders();

    return () => {
      unsubProducts();
      unsubOrders();
    };
  }, [role, hasHydrated, navigate, subscribeToProducts, subscribeToTodaysOrders]);

  useEffect(() => {
    const pins = getCurrentPins();
    setVolunteerPin(pins.volunteerPin);
    setAdminPin(pins.adminPin);
  }, [showPinModal]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);

      try {
        const result = await parseCSV(file);

        if (!result.success) {
          setUploadError(result.errors.join('\n'));
          return;
        }

        if (result.products.length === 0) {
          setUploadError('No valid products found in CSV');
          return;
        }

        setIsUploading(false); // Reset before showing modal
        setPreviewProducts(result.products);
      } catch (error) {
        setUploadError('Failed to parse CSV file');
      } finally {
        e.target.value = '';
      }
    },
    []
  );

  const handleConfirmUpload = async () => {
    if (!previewProducts || isUploading) return;

    setIsUploading(true);
    try {
      await uploadProducts(previewProducts);
    } catch (error) {
      console.error('Upload error:', error);
    }
    // Always close modal and reset state
    setPreviewProducts(null);
    setIsUploading(false);
  };

  const handleCancelPreview = () => {
    setPreviewProducts(null);
    setIsUploading(false);
  };

  const handleSavePins = () => {
    if (volunteerPin.length !== 4 || adminPin.length !== 4) {
      return;
    }
    updatePins(volunteerPin, adminPin);
    setShowPinModal(false);
  };

  const handleExportOrders = () => {
    exportOrdersToCSV(orders);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'settings', label: 'Settings' },
  ];

  // Show loading while hydrating
  if (!hasHydrated || role !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6">
        <div className="w-full max-w-5xl flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-stone-700 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex justify-center p-0 sm:p-4 md:p-6">
      <div className="w-full max-w-5xl flex flex-col min-h-screen sm:min-h-[calc(100vh-3rem)] sm:my-auto sm:max-h-[calc(100vh-3rem)] bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden sm:pt-4">
        {/* Header - Minimal */}
        <header className="px-4 sm:px-6 pt-4 pb-4 safe-top">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl font-bold text-stone-50 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-xs font-medium text-emerald-400">
                Urban Oasis POS
              </p>
            </div>
          </div>
        </header>

      {/* Tabs */}
      <div className="bg-stone-900/95 backdrop-blur-md border-b border-stone-800 px-4">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {activeTab === 'orders' && (
          <div className="p-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 shadow-sm">
                <p className="text-sm text-stone-600 mb-1">Today's Orders</p>
                <p className="text-2xl font-bold text-stone-900">
                  {getTodayOrderCount()}
                </p>
              </div>
              <div className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 shadow-sm">
                <p className="text-sm text-stone-600 mb-1">Today's Total</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(getTodayTotal())}
                </p>
              </div>
            </div>

            {/* Export Button */}
            <div className="mb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportOrders}
                disabled={orders.length === 0}
              >
                Export to CSV
              </Button>
            </div>

            {/* Orders List */}
            <div className="bg-stone-300 rounded-2xl border border-stone-400/50 divide-y divide-stone-400/50 shadow-sm">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-stone-600">
                  No orders yet today
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-emerald-700">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <span className="text-xs bg-emerald-600/20 text-emerald-700 px-2 py-1 rounded-full font-medium">
                        {order.items.length} items
                      </span>
                    </div>
                    <div className="text-sm text-stone-600">
                      {order.items.map((item, i) => (
                        <span key={i}>
                          {item.name}
                          {i < order.items.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="p-4">
            {/* Upload Section */}
            <div className="bg-stone-300 rounded-2xl p-6 border border-stone-400/50 mb-6 shadow-sm">
              <h2 className="font-semibold text-stone-900 mb-4">Upload Products</h2>
              <p className="text-sm text-stone-600 mb-4">
                Upload a CSV file with columns: name, price, unit (lb/each), category
              </p>

              <div className="flex gap-3 mb-4">
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  <div className="border-2 border-dashed border-stone-400 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-600 hover:bg-emerald-100/50 transition-colors">
                    <svg
                      className="w-8 h-8 text-stone-500 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm text-stone-600">
                      {isUploading ? 'Processing...' : 'Click to upload CSV'}
                    </p>
                  </div>
                </label>
              </div>

              <button
                onClick={downloadSampleCSV}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-600 transition-colors"
              >
                Download sample CSV
              </button>

              {uploadError && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-xl">
                  <p className="text-sm text-red-700 whitespace-pre-line">
                    {uploadError}
                  </p>
                </div>
              )}
            </div>

            {/* Current Products */}
            <div className="bg-stone-300 rounded-2xl border border-stone-400/50 shadow-sm">
              <div className="p-4 border-b border-stone-400/50">
                <h2 className="font-semibold text-stone-900">
                  Current Products ({products.length})
                </h2>
              </div>
              <div className="divide-y divide-stone-400/50 max-h-[50vh] overflow-y-auto">
                {products.length === 0 ? (
                  <div className="p-8 text-center text-stone-600">
                    No products uploaded yet
                  </div>
                ) : (
                  products.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-stone-900">{product.name}</p>
                        <p className="text-sm text-stone-600">{product.category}</p>
                      </div>
                      <p className="font-semibold text-emerald-700">
                        {formatCurrency(product.price)}/{product.unit}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4">
            <div className="bg-stone-300 rounded-2xl p-6 border border-stone-400/50 shadow-sm">
              <h2 className="font-semibold text-stone-900 mb-4">PIN Settings</h2>
              <p className="text-sm text-stone-600 mb-4">
                Update the PINs used for volunteer and admin access
              </p>
              <Button variant="outline" onClick={() => setShowPinModal(true)}>
                Change PINs
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Modal
        isOpen={previewProducts !== null}
        onClose={handleCancelPreview}
      >
        <div className="p-4">
          <h2 className="text-lg font-semibold text-stone-900 mb-4">
            Preview Upload ({previewProducts?.length} products)
          </h2>

          <div className="max-h-64 overflow-y-auto border border-stone-400/50 rounded-xl mb-4">
            <div className="divide-y divide-stone-400/50">
              {previewProducts?.map((product, i) => (
                <div key={i} className="px-3 py-2 flex justify-between">
                  <div>
                    <p className="font-medium text-stone-900">{product.name}</p>
                    <p className="text-sm text-stone-600">{product.category}</p>
                  </div>
                  <p className="text-emerald-700 font-medium whitespace-nowrap ml-2">
                    {formatCurrency(product.price)}/{product.unit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-amber-700 mb-4">
            This will replace all existing products.
          </p>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelPreview}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleConfirmUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Confirm Upload'}
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
      <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-1 bg-stone-800 border border-stone-700 rounded-full px-2 py-2 shadow-2xl">
          {/* Back to POS */}
          <button
            onClick={() => navigate('/pos')}
            className="flex flex-col items-center justify-center w-14 h-10 rounded-full text-stone-400 hover:bg-stone-700 hover:text-stone-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>

          {/* Admin - Active */}
          <button className="flex flex-col items-center justify-center w-14 h-10 rounded-full bg-emerald-600 text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>

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
