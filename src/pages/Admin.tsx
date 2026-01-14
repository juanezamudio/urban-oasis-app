import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuthStore, getCurrentPins, updatePins, subscribeToPins } from '../store/authStore';
import { useAnnouncementStore, type AnnouncementType, ANNOUNCEMENT_CHAR_LIMIT } from '../store/announcementStore';
import { useGoalStore } from '../store/goalStore';
import { useProductStore } from '../store/productStore';
import { useOrderStore } from '../store/orderStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { BottomNav } from '../components/BottomNav';
import { OnboardingTour, type TourStep } from '../components/OnboardingTour';
import { useOnboarding } from '../hooks/useOnboarding';
import { parseCSV, downloadSampleCSV, exportOrdersToCSV } from '../lib/csv';
import { cn, formatCurrency, formatDate } from '../lib/utils';
import type { Product } from '../types';
import logo from '../assets/uop-logo.png';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';

// Chart color palettes - earthy tones (olives, browns, emeralds, stones)
const CATEGORY_COLORS = [
  '#10b981', // emerald-500 (primary green)
  '#a3a53a', // olive
  '#d97706', // amber-600 (warm brown/orange)
  '#78716c', // stone-500
  '#84cc16', // lime-500 (bright olive)
  '#92400e', // amber-800 (deep brown)
  '#059669', // emerald-600
  '#b45309', // amber-700
  '#65a30d', // lime-600
  '#57534e', // stone-600
];

const PAYMENT_COLORS = {
  cash: '#10b981',   // emerald-500 (green for cash)
  card: '#d97706',   // amber-600 (warm for card)
  voucher: '#78716c', // stone-500 (neutral for voucher)
};

// Category badge colors - matching ProductCard.tsx
const categoryBadgeColors: Record<string, string> = {
  Vegetables: 'bg-emerald-600/20 text-emerald-700',
  Fruits: 'bg-orange-500/20 text-orange-700',
  Herbs: 'bg-green-600/20 text-green-700',
  Dairy: 'bg-amber-500/20 text-amber-700',
  'Dairy & Eggs': 'bg-amber-500/20 text-amber-700',
  Other: 'bg-stone-400/20 text-stone-600',
};

type Tab = 'orders' | 'products' | 'insights';
type DateView = 'today' | 'range';

export function Admin() {
  const navigate = useNavigate();
  const { role, hasHydrated } = useAuthStore();
  const { products, uploadProducts, subscribeToProducts, deleteProduct, clearAllProducts } = useProductStore();
  const {
    orders,
    subscribeToTodaysOrders,
    subscribeToOrdersByDateRange,
    getTodayTotal,
    getTodayOrderCount,
    deleteOrder,
    deleteOrders,
  } = useOrderStore();

  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewProducts, setPreviewProducts] = useState<Product[] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [showDeleteOrdersModal, setShowDeleteOrdersModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementType, setAnnouncementType] = useState<AnnouncementType>('info');

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
    subscribeToGoal,
  } = useGoalStore();

  const [goalInput, setGoalInput] = useState('');
  const [volunteerPin, setVolunteerPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'order' | 'product';
    id: string;
    name: string;
  } | null>(null);
  const [dateView, setDateView] = useState<DateView>('today');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { isActive: isTourActive, completeOnboarding, skipOnboarding, restartOnboarding } = useOnboarding('admin');

  // Delay chart rendering to avoid dimension warnings
  const [chartsReady, setChartsReady] = useState(false);

  const adminTourSteps: TourStep[] = useMemo(() => [
    {
      target: '[data-tour="admin-tabs"]',
      title: 'Admin Dashboard',
      description: 'Welcome to the admin dashboard! Use these tabs to manage orders, products, and settings.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="orders-summary"]',
      title: 'Sales Overview',
      description: 'See today\'s order count and total sales at a glance. Switch between today and date range views.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="export-btn"]',
      title: 'Export Orders',
      description: 'Export your orders to a CSV file for accounting or record-keeping.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="orders-list"]',
      title: 'Order History',
      description: 'View all completed orders with their items and totals.',
      placement: 'top',
    },
    {
      target: '[data-tour="admin-nav"]',
      title: 'Navigation',
      description: 'Switch back to the POS view or logout when you\'re done.',
      placement: 'top',
    },
  ], []);

  useEffect(() => {
    // Wait for hydration before checking role
    if (!hasHydrated) return;

    if (role !== 'admin') {
      navigate(role === 'volunteer' ? '/pos' : '/');
      return;
    }

    const unsubProducts = subscribeToProducts();

    return () => {
      unsubProducts();
    };
  }, [role, hasHydrated, navigate, subscribeToProducts]);

  // Subscribe to orders based on date view
  useEffect(() => {
    if (!hasHydrated || role !== 'admin') return;

    let unsubOrders: () => void;

    if (dateView === 'today') {
      unsubOrders = subscribeToTodaysOrders();
    } else {
      unsubOrders = subscribeToOrdersByDateRange(new Date(startDate), new Date(endDate));
    }

    return () => {
      unsubOrders();
    };
  }, [hasHydrated, role, dateView, startDate, endDate, subscribeToTodaysOrders, subscribeToOrdersByDateRange]);

  // Subscribe to PIN changes from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToPins();
    return unsubscribe;
  }, []);

  // Subscribe to announcement changes from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToAnnouncements();
    return unsubscribe;
  }, [subscribeToAnnouncements]);

  // Subscribe to goal changes from Firebase
  useEffect(() => {
    const unsubscribe = subscribeToGoal();
    return unsubscribe;
  }, [subscribeToGoal]);

  // Sync goal input with current goal
  useEffect(() => {
    if (currentGoalTarget > 0) {
      setGoalInput(currentGoalTarget.toString());
    }
  }, [currentGoalTarget]);

  useEffect(() => {
    const pins = getCurrentPins();
    setVolunteerPin(pins.volunteerPin);
    setAdminPin(pins.adminPin);
  }, [showPinModal]);

  // Delay chart rendering until insights tab is active and DOM is ready
  useEffect(() => {
    if (activeTab === 'insights') {
      const timer = setTimeout(() => setChartsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setChartsReady(false);
    }
  }, [activeTab]);

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

  const handleSavePins = async () => {
    if (volunteerPin.length !== 4 || adminPin.length !== 4) {
      return;
    }
    await updatePins(volunteerPin, adminPin);
    setShowPinModal(false);
  };

  // Computed values for display
  const displayTotal = useMemo(() => {
    if (dateView === 'today') {
      return getTodayTotal();
    }
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [dateView, orders, getTodayTotal]);

  const displayOrderCount = useMemo(() => {
    if (dateView === 'today') {
      return getTodayOrderCount();
    }
    return orders.length;
  }, [dateView, orders, getTodayOrderCount]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown = {
      cash: { total: 0, count: 0 },
      card: { total: 0, count: 0 },
      voucher: { total: 0, count: 0 },
    };
    orders.forEach((order) => {
      const method = order.paymentMethod || 'cash';
      breakdown[method].total += order.total;
      breakdown[method].count += 1;
    });
    return breakdown;
  }, [orders]);

  const handleExportOrders = () => {
    exportOrdersToCSV(orders);
  };

  // Product sales analytics
  const productStats = useMemo(() => {
    const stats: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.name.toLowerCase();
        if (!stats[key]) {
          stats[key] = { name: item.name, quantity: 0, revenue: 0, category: '' };
        }
        stats[key].quantity += item.quantity;
        stats[key].revenue += item.lineTotal;
      });
    });

    // Match with product categories
    const productList = Object.values(stats).map((stat) => {
      const product = products.find(p => p.name.toLowerCase() === stat.name.toLowerCase());
      return {
        ...stat,
        category: product?.category || 'Other',
      };
    });

    return productList;
  }, [orders, products]);

  // Top products by quantity
  const topByQuantity = useMemo(() => {
    return [...productStats].sort((a, b) => b.quantity - a.quantity).slice(0, 10);
  }, [productStats]);

  // Top products by revenue
  const topByRevenue = useMemo(() => {
    return [...productStats].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [productStats]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<string, { revenue: number; quantity: number; itemCount: number }> = {};

    productStats.forEach((product) => {
      const cat = product.category || 'Other';
      if (!breakdown[cat]) {
        breakdown[cat] = { revenue: 0, quantity: 0, itemCount: 0 };
      }
      breakdown[cat].revenue += product.revenue;
      breakdown[cat].quantity += product.quantity;
      breakdown[cat].itemCount += 1;
    });

    return Object.entries(breakdown)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [productStats]);

  // Key metrics
  const keyMetrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const totalItems = orders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

    // Largest & smallest order
    const largestOrder = orders.length > 0
      ? Math.max(...orders.map(order => order.total))
      : 0;
    const smallestOrder = orders.length > 0
      ? Math.min(...orders.map(order => order.total))
      : 0;

    // Top product by revenue
    const topProduct = productStats.length > 0
      ? productStats.reduce((top, p) => p.revenue > top.revenue ? p : top, productStats[0])
      : null;

    // Top category by revenue
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0] : null;

    // Peak hour
    const hourCounts: Record<number, { count: number; revenue: number }> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourCounts[hour]) {
        hourCounts[hour] = { count: 0, revenue: 0 };
      }
      hourCounts[hour].count += 1;
      hourCounts[hour].revenue += order.total;
    });
    const peakHourEntry = Object.entries(hourCounts).sort((a, b) => b[1].count - a[1].count)[0];
    const peakHour = peakHourEntry ? parseInt(peakHourEntry[0]) : null;

    // Categories sold
    const categoriesSold = new Set(productStats.map(p => p.category)).size;

    // First and last order times
    const sortedByTime = [...orders].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const firstOrderTime = sortedByTime.length > 0 ? new Date(sortedByTime[0].createdAt) : null;
    const lastOrderTime = sortedByTime.length > 0 ? new Date(sortedByTime[sortedByTime.length - 1].createdAt) : null;

    // Hours active (difference between first and last order)
    const hoursActive = firstOrderTime && lastOrderTime
      ? Math.max(1, Math.round((lastOrderTime.getTime() - firstOrderTime.getTime()) / (1000 * 60 * 60)))
      : 0;

    // Revenue and orders per hour
    const revenuePerHour = hoursActive > 0 ? totalRevenue / hoursActive : 0;
    const ordersPerHour = hoursActive > 0 ? totalOrders / hoursActive : 0;

    return {
      avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      avgItemsPerOrder: totalOrders > 0 ? totalItems / totalOrders : 0,
      totalItemsSold: totalItems,
      uniqueProducts: productStats.length,
      largestOrder,
      smallestOrder,
      topProduct,
      topCategory,
      peakHour,
      categoriesSold,
      firstOrderTime,
      lastOrderTime,
      revenuePerHour,
      ordersPerHour,
    };
  }, [orders, productStats, categoryBreakdown]);

  // Daily sales trend
  const dailySalesTrend = useMemo(() => {
    const dailyData: Record<string, { key: string; date: string; revenue: number; orders: number; items: number }> = {};

    orders.forEach((order) => {
      const date = new Date(order.createdAt);
      const dateKey = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { key: dateKey, date: displayDate, revenue: 0, orders: 0, items: 0 };
      }
      dailyData[dateKey].revenue += order.total;
      dailyData[dateKey].orders += 1;
      dailyData[dateKey].items += order.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, data]) => data);
  }, [orders]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'orders', label: 'Orders' },
    { id: 'products', label: 'Products' },
    { id: 'insights', label: 'Insights' },
  ];

  // Show loading while hydrating
  if (!hasHydrated || role !== 'admin') {
    return (
      <div className="h-screen bg-stone-900 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
        <div className="w-full max-w-7xl flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-stone-700 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-900 flex justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col h-full sm:h-[calc(100vh-3rem)] sm:my-auto bg-stone-900 sm:rounded-2xl sm:border sm:border-stone-800 sm:shadow-2xl overflow-hidden sm:pt-4">
        {/* Header */}
        <header className="px-4 sm:px-6 pb-4 safe-top-header sm:pt-4">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3 sm:gap-4 bg-gradient-to-b from-stone-700/60 to-stone-800/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl border border-stone-400/40 shadow-lg shadow-black/20 ring-1 ring-white/5">
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

      {/* Tabs */}
      <div className="bg-stone-900/95 backdrop-blur-md border-b border-stone-800 px-4">
        <div data-tour="admin-tabs" className="flex gap-1">
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
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orders' && (
          <div className="p-4 h-full overflow-y-auto pb-24">
            {/* Date View Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDateView('today')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  dateView === 'today'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateView('range')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  dateView === 'range'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                Date Range
              </button>
            </div>

            {/* Date Range Picker */}
            {dateView === 'range' && (
              <div className="bg-stone-800 rounded-xl p-3 sm:p-4 mb-4 border border-stone-700">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-stone-400 mb-1">Start</label>
                    <DatePicker
                      selected={new Date(startDate + 'T00:00:00')}
                      onChange={(date: Date | null) => date && setStartDate(date.toISOString().split('T')[0])}
                      maxDate={new Date(endDate + 'T00:00:00')}
                      dateFormat="MMM d, yyyy"
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-stone-400 mb-1">End</label>
                    <DatePicker
                      selected={new Date(endDate + 'T00:00:00')}
                      onChange={(date: Date | null) => date && setEndDate(date.toISOString().split('T')[0])}
                      minDate={new Date(startDate + 'T00:00:00')}
                      maxDate={new Date()}
                      dateFormat="MMM d, yyyy"
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div data-tour="orders-summary" className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 shadow-sm">
                <p className="text-sm text-stone-600 mb-1">
                  {dateView === 'today' ? "Today's Orders" : 'Orders'}
                </p>
                <p className="font-display text-2xl font-bold text-stone-900">
                  {displayOrderCount}
                </p>
              </div>
              <div className="bg-stone-300 rounded-2xl p-4 border border-stone-400/50 shadow-sm">
                <p className="text-sm text-stone-600 mb-1">
                  {dateView === 'today' ? "Today's Total" : 'Total'}
                </p>
                <p className="font-display text-2xl font-bold text-emerald-700">
                  {formatCurrency(displayTotal)}
                </p>
              </div>
            </div>

            {/* Payment Breakdown */}
            {displayOrderCount > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <p className="text-xs text-green-700 font-medium">Cash</p>
                  </div>
                  <p className="font-display text-lg font-bold text-green-700">
                    {formatCurrency(paymentBreakdown.cash.total)}
                  </p>
                  <p className="text-xs text-green-600">{paymentBreakdown.cash.count} orders</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <p className="text-xs text-blue-700 font-medium">Card</p>
                  </div>
                  <p className="font-display text-lg font-bold text-blue-700">
                    {formatCurrency(paymentBreakdown.card.total)}
                  </p>
                  <p className="text-xs text-blue-600">{paymentBreakdown.card.count} orders</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <p className="text-xs text-purple-700 font-medium">Voucher</p>
                  </div>
                  <p className="font-display text-lg font-bold text-purple-700">
                    {formatCurrency(paymentBreakdown.voucher.total)}
                  </p>
                  <p className="text-xs text-purple-600">{paymentBreakdown.voucher.count} orders</p>
                </div>
              </div>
            )}

            {/* Export & Delete Buttons */}
            <div data-tour="export-btn" className="flex gap-2 mb-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportOrders}
                disabled={orders.length === 0}
              >
                Export to CSV
              </Button>
              {orders.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteOrdersModal(true)}
                  className="!border-red-500/50 !text-red-400 hover:!bg-red-500/10"
                >
                  Delete All
                </Button>
              )}
            </div>

            {/* Orders List */}
            <div data-tour="orders-list" className="bg-stone-300 rounded-2xl border border-stone-400/50 divide-y divide-stone-400/50 shadow-sm">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-stone-600">
                  {dateView === 'today' ? 'No orders yet today' : 'No orders in this date range'}
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-display font-semibold text-emerald-700">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-sm text-stone-600">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                          order.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                          order.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {order.paymentMethod || 'cash'}
                        </span>
                        <span className="text-xs bg-stone-200 text-stone-600 px-2 py-1 rounded-full font-medium">
                          {order.items.length} items
                        </span>
                        <button
                          onClick={() => setDeleteConfirm({
                            type: 'order',
                            id: order.id,
                            name: formatCurrency(order.total),
                          })}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete order"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
          <div className="p-4 flex flex-col h-full overflow-hidden pb-24">
            {/* Header with Upload Button */}
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h2 className="font-semibold text-stone-100">
                Products ({products.length})
              </h2>
              <div className="flex gap-2">
                {products.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowClearAllModal(true)}
                    className="!border-red-500/50 !text-red-400 hover:!bg-red-500/10"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                >
                  Upload CSV
                </Button>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-stone-300 rounded-2xl border border-stone-400/50 shadow-sm flex-1 flex flex-col min-h-0">
              <div className="divide-y divide-stone-400/50 overflow-y-auto flex-1">
                {products.length === 0 ? (
                  <div className="p-8 text-center text-stone-600">
                    No products uploaded yet
                  </div>
                ) : (
                  [...products].sort((a, b) => a.name.localeCompare(b.name)).map((product) => (
                    <div
                      key={product.id}
                      className="p-4 flex items-center justify-between"
                    >
                      <p className="font-medium text-stone-900 flex-1 min-w-0 truncate">
                        {product.name}
                      </p>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap',
                            categoryBadgeColors[product.category] || categoryBadgeColors.Other
                          )}
                        >
                          {product.category}
                        </span>
                        <p className="font-semibold text-emerald-700 whitespace-nowrap">
                          {formatCurrency(product.price)}/{product.unit}
                        </p>
                        <button
                          onClick={() => setDeleteConfirm({
                            type: 'product',
                            id: product.id,
                            name: product.name,
                          })}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete product"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="p-4 h-full overflow-y-auto pb-24">
            {/* Date View Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDateView('today')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  dateView === 'today'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setDateView('range')}
                className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                  dateView === 'range'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                }`}
              >
                Date Range
              </button>
            </div>

            {/* Date Range Picker */}
            {dateView === 'range' && (
              <div className="bg-stone-800 rounded-xl p-3 sm:p-4 mb-4 border border-stone-700">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-stone-400 mb-1">Start</label>
                    <DatePicker
                      selected={new Date(startDate + 'T00:00:00')}
                      onChange={(date: Date | null) => date && setStartDate(date.toISOString().split('T')[0])}
                      maxDate={new Date(endDate + 'T00:00:00')}
                      dateFormat="MMM d, yyyy"
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-stone-400 mb-1">End</label>
                    <DatePicker
                      selected={new Date(endDate + 'T00:00:00')}
                      onChange={(date: Date | null) => date && setEndDate(date.toISOString().split('T')[0])}
                      minDate={new Date(startDate + 'T00:00:00')}
                      maxDate={new Date()}
                      dateFormat="MMM d, yyyy"
                      className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {orders.length === 0 ? (
              <div className="bg-stone-300 rounded-2xl p-8 text-center border border-stone-400/50">
                <svg className="w-12 h-12 text-stone-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-stone-600 font-medium">No order data yet</p>
                <p className="text-sm text-stone-500 mt-1">Complete some orders to see insights</p>
              </div>
            ) : (
              <>
                {/* Key Metrics */}
                <div className="mb-6">
                  {/* Primary row - 2 columns */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-stone-800 rounded-xl p-3 sm:p-4 border border-stone-700 text-center">
                      <p className="text-[10px] sm:text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                      <p className="font-display text-2xl sm:text-4xl font-bold text-emerald-400">
                        {formatCurrency(displayTotal)}
                      </p>
                      <p className="text-xs sm:text-sm text-stone-500 mt-1">
                        {formatCurrency(keyMetrics.revenuePerHour)}/hr avg
                      </p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-3 sm:p-4 border border-stone-700 text-center">
                      <p className="text-[10px] sm:text-xs text-stone-400 font-medium uppercase tracking-wider mb-1">Total Orders</p>
                      <p className="font-display text-2xl sm:text-4xl font-bold text-stone-100">
                        {displayOrderCount}
                      </p>
                      <p className="text-xs sm:text-sm text-stone-500 mt-1">
                        {keyMetrics.ordersPerHour.toFixed(1)}/hr avg
                      </p>
                    </div>
                  </div>
                  {/* Secondary row - 3 items */}
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Avg Order</p>
                      <p className="font-display text-base sm:text-xl font-bold text-emerald-400">
                        {formatCurrency(keyMetrics.avgOrderValue)}
                      </p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Largest</p>
                      <p className="font-display text-base sm:text-xl font-bold text-amber-500">
                        {formatCurrency(keyMetrics.largestOrder)}
                      </p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Smallest</p>
                      <p className="font-display text-base sm:text-xl font-bold text-stone-400">
                        {formatCurrency(keyMetrics.smallestOrder)}
                      </p>
                    </div>
                  </div>
                  {/* Third row - Top Product & Top Category */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center overflow-hidden">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Top Product</p>
                      <p className="font-display text-sm sm:text-base font-bold text-emerald-400 truncate" title={keyMetrics.topProduct?.name}>
                        {keyMetrics.topProduct?.name || '—'}
                      </p>
                      {keyMetrics.topProduct && (
                        <p className="text-[10px] sm:text-xs text-stone-500">{formatCurrency(keyMetrics.topProduct.revenue)}</p>
                      )}
                    </div>
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center overflow-hidden">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Top Category</p>
                      <p className="font-display text-sm sm:text-base font-bold text-amber-400 truncate" title={keyMetrics.topCategory?.category}>
                        {keyMetrics.topCategory?.category || '—'}
                      </p>
                      {keyMetrics.topCategory && (
                        <p className="text-[10px] sm:text-xs text-stone-500">{formatCurrency(keyMetrics.topCategory.revenue)}</p>
                      )}
                    </div>
                  </div>
                  {/* Fourth row - Items Sold, Items/Order, Peak Hour */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Items Sold</p>
                      <p className="font-display text-base sm:text-xl font-bold text-stone-100">
                        {keyMetrics.totalItemsSold}
                      </p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Items/Order</p>
                      <p className="font-display text-base sm:text-xl font-bold text-stone-100">
                        {keyMetrics.avgItemsPerOrder.toFixed(1)}
                      </p>
                    </div>
                    <div className="bg-stone-800 rounded-xl p-2 sm:p-3 border border-stone-700 text-center overflow-hidden">
                      <p className="text-[9px] sm:text-[10px] text-stone-400 font-medium uppercase tracking-wider mb-1">Peak Hour</p>
                      <p className="font-display text-base sm:text-xl font-bold text-stone-100">
                        {keyMetrics.peakHour !== null
                          ? `${keyMetrics.peakHour > 12 ? keyMetrics.peakHour - 12 : keyMetrics.peakHour || 12}${keyMetrics.peakHour >= 12 ? 'pm' : 'am'}`
                          : '—'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-stone-500 truncate">
                        {keyMetrics.uniqueProducts} prod · {keyMetrics.categoriesSold} cat
                      </p>
                    </div>
                  </div>
                </div>

                {/* Daily Sales Trend */}
                {dailySalesTrend.length > 1 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">Sales Trend</h3>
                    <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                      <div className="h-56">
                        {chartsReady && (
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={dailySalesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                            <XAxis
                              dataKey="date"
                              stroke="#a8a29e"
                              fontSize={11}
                              tickLine={false}
                            />
                            <YAxis
                              stroke="#a8a29e"
                              fontSize={11}
                              tickFormatter={(value) => `$${value}`}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              formatter={(value, name) => [
                                name === 'revenue' ? formatCurrency(Number(value)) : value,
                                name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Items'
                              ]}
                              cursor={{ stroke: '#10b981', strokeWidth: 2 }}
                              contentStyle={{
                                backgroundColor: '#1c1917',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                padding: '8px 12px',
                              }}
                              itemStyle={{ color: '#fafaf9', fontSize: '14px', fontWeight: 500 }}
                              labelStyle={{ color: '#10b981', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}
                            />
                            <Area
                              type="monotone"
                              dataKey="revenue"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill="url(#revenueGradient)"
                              name="revenue"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                    {/* Daily breakdown table */}
                    <div className="mt-3 bg-stone-300 rounded-xl border border-stone-400/50 divide-y divide-stone-400/50 max-h-48 overflow-y-auto">
                      {[...dailySalesTrend].reverse().map((day) => (
                        <div key={day.key} className="p-3 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-stone-900">{day.date}</p>
                            <p className="text-sm text-stone-600">
                              {day.orders} order{day.orders !== 1 ? 's' : ''} · {day.items} items
                            </p>
                          </div>
                          <p className="font-display font-bold text-emerald-700">
                            {formatCurrency(day.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Charts Row - Payment & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {/* Payment Methods - Progress Bars */}
                  <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-4">Payment Methods</h3>
                    {(() => {
                      const maxPayment = Math.max(paymentBreakdown.cash.total, paymentBreakdown.card.total, paymentBreakdown.voucher.total);
                      const payments = [
                        { name: 'Cash', total: paymentBreakdown.cash.total, count: paymentBreakdown.cash.count, color: PAYMENT_COLORS.cash },
                        { name: 'Card', total: paymentBreakdown.card.total, count: paymentBreakdown.card.count, color: PAYMENT_COLORS.card },
                        { name: 'Voucher', total: paymentBreakdown.voucher.total, count: paymentBreakdown.voucher.count, color: PAYMENT_COLORS.voucher },
                      ].filter(p => p.total > 0);
                      return (
                        <div className="space-y-3">
                          {payments.map((payment) => {
                            const percentage = maxPayment > 0 ? (payment.total / maxPayment) * 100 : 0;
                            return (
                              <div key={payment.name}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-stone-300">{payment.name}</span>
                                  <span className="text-sm font-medium text-stone-100">
                                    {formatCurrency(payment.total)}
                                  </span>
                                </div>
                                <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: payment.color,
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-stone-500 mt-0.5">{payment.count} orders</p>
                              </div>
                            );
                          })}
                          {payments.length === 0 && (
                            <p className="text-sm text-stone-500 text-center py-4">No payment data</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Category Breakdown - Progress Bars */}
                  <div className="bg-stone-800 rounded-xl p-4 border border-stone-700">
                    <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-4">Sales by Category</h3>
                    {(() => {
                      const maxRevenue = categoryBreakdown.length > 0 ? Math.max(...categoryBreakdown.map(c => c.revenue)) : 0;
                      return (
                        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {categoryBreakdown.map((cat, index) => {
                            const percentage = maxRevenue > 0 ? (cat.revenue / maxRevenue) * 100 : 0;
                            return (
                              <div key={cat.category}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-stone-300 truncate flex-1 mr-2">{cat.category}</span>
                                  <span className="text-sm font-medium text-stone-100 whitespace-nowrap">
                                    {formatCurrency(cat.revenue)}
                                  </span>
                                </div>
                                <div className="h-3 bg-stone-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-stone-500 mt-0.5">{cat.quantity} items sold</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Top Products by Revenue - Chart left, Table right */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">Top Products by Revenue</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Chart */}
                    <div className="bg-stone-800 rounded-xl p-4 border border-stone-700 md:col-span-2">
                      <div className="h-64">
                        {chartsReady && (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart
                            data={topByRevenue.slice(0, 5).map((p, i) => ({ ...p, index: i + 1 }))}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" horizontal={true} vertical={false} />
                            <XAxis
                              type="number"
                              stroke="#a8a29e"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <YAxis
                              type="category"
                              dataKey="index"
                              stroke="#a8a29e"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              width={20}
                              tickFormatter={(value) => `#${value}`}
                            />
                            <Tooltip
                              formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                              cursor={{ fill: '#44403c' }}
                              contentStyle={{
                                backgroundColor: '#1c1917',
                                border: '2px solid #10b981',
                                borderRadius: '8px',
                                padding: '8px 12px',
                              }}
                              itemStyle={{ color: '#fafaf9', fontSize: '14px', fontWeight: 500 }}
                              labelStyle={{ color: '#10b981', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}
                            />
                            <Bar
                              dataKey="revenue"
                              fill="#10b981"
                              radius={[0, 4, 4, 0]}
                              name="Revenue"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                    {/* Table */}
                    <div className="bg-stone-300 rounded-xl border border-stone-400/50 divide-y divide-stone-400/50">
                      {topByRevenue.slice(0, 5).map((product, index) => (
                        <div key={product.name} className="p-3 flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900 truncate">{product.name}</p>
                            <p className="text-sm text-stone-600">{product.category} · {product.quantity} sold</p>
                          </div>
                          <p className="font-display font-bold text-emerald-700">
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Products by Quantity - Table left, Chart right */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-stone-400 uppercase tracking-wider mb-3">Top Products by Quantity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Table */}
                    <div className="bg-stone-300 rounded-xl border border-stone-400/50 divide-y divide-stone-400/50 order-2 md:order-1">
                      {topByQuantity.slice(0, 5).map((product, index) => (
                        <div key={product.name} className="p-3 flex items-center gap-3">
                          <span className="w-6 h-6 flex items-center justify-center bg-amber-100 text-amber-700 rounded-full text-sm font-bold flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-stone-900 truncate">{product.name}</p>
                            <p className="text-sm text-stone-600">{product.category} · {formatCurrency(product.revenue)}</p>
                          </div>
                          <p className="font-display font-bold text-amber-700">
                            {product.quantity} <span className="text-sm font-normal text-stone-600">units</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="bg-stone-800 rounded-xl p-4 border border-stone-700 order-1 md:order-2 md:col-span-2">
                      <div className="h-64">
                        {chartsReady && (
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart
                            data={topByQuantity.slice(0, 5).map((p, i) => ({ ...p, index: i + 1 }))}
                            layout="vertical"
                            margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#44403c" horizontal={true} vertical={false} />
                            <XAxis
                              type="number"
                              stroke="#a8a29e"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="index"
                              stroke="#a8a29e"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              width={20}
                              tickFormatter={(value) => `#${value}`}
                            />
                            <Tooltip
                              formatter={(value) => [`${value} units`, 'Quantity']}
                              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
                              cursor={{ fill: '#44403c' }}
                              contentStyle={{
                                backgroundColor: '#1c1917',
                                border: '2px solid #d97706',
                                borderRadius: '8px',
                                padding: '8px 12px',
                              }}
                              itemStyle={{ color: '#fafaf9', fontSize: '14px', fontWeight: 500 }}
                              labelStyle={{ color: '#d97706', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}
                            />
                            <Bar
                              dataKey="quantity"
                              fill="#d97706"
                              radius={[0, 4, 4, 0]}
                              name="Quantity"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
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

      {/* Upload Modal */}
      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Upload Products</h2>
          <p className="text-sm text-stone-600 mb-4">
            Upload a CSV file with your products. This will replace all existing products.
          </p>

          {uploadError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl">
              <p className="text-sm text-red-800 whitespace-pre-line">
                {uploadError}
              </p>
            </div>
          )}

          <div className="border-2 border-dashed border-stone-400 rounded-xl p-6 text-center mb-4">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => {
                handleFileUpload(e);
                setShowUploadModal(false);
              }}
              className="hidden"
              id="csv-upload-modal"
            />
            <label
              htmlFor="csv-upload-modal"
              className="cursor-pointer block"
            >
              <svg
                className="w-10 h-10 text-stone-500 mx-auto mb-2"
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
              <p className="text-stone-700 font-medium mb-1">
                Click to upload CSV
              </p>
              <p className="text-sm text-stone-500">
                or drag and drop
              </p>
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={downloadSampleCSV}
            >
              Download Sample
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
                      }
                    }}
                    disabled={!goalInput || parseFloat(goalInput) <= 0}
                  >
                    Set Goal
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

              <div className="bg-stone-100 rounded-xl p-4">
                <h3 className="font-medium text-stone-900 mb-1">Help & Tour</h3>
                <p className="text-sm text-stone-600 mb-3">
                  View the guided tour again to learn how to use the admin dashboard
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-900 text-center mb-2">
            Delete {deleteConfirm?.type === 'order' ? 'Order' : 'Product'}?
          </h2>
          <p className="text-stone-600 text-center mb-6">
            {deleteConfirm?.type === 'order' ? (
              <>Are you sure you want to delete this <span className="font-semibold text-emerald-700">{deleteConfirm?.name}</span> order?</>
            ) : (
              <>Are you sure you want to delete <span className="font-semibold">{deleteConfirm?.name}</span>?</>
            )}
            <br />
            <span className="text-sm text-stone-500">This action cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              onClick={async () => {
                if (deleteConfirm) {
                  try {
                    if (deleteConfirm.type === 'order') {
                      await deleteOrder(deleteConfirm.id);
                    } else {
                      await deleteProduct(deleteConfirm.id);
                    }
                  } catch (error) {
                    console.error('Failed to delete:', error);
                  }
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear All Products Modal */}
      <Modal isOpen={showClearAllModal} onClose={() => setShowClearAllModal(false)}>
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-900 text-center mb-2">
            Clear All Products?
          </h2>
          <p className="text-stone-600 text-center mb-6">
            Are you sure you want to delete all <span className="font-semibold">{products.length} products</span>?
            <br />
            <span className="text-sm text-stone-500">This action cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowClearAllModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              onClick={() => {
                clearAllProducts();
                setShowClearAllModal(false);
              }}
            >
              Clear All
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete All Orders Modal */}
      <Modal isOpen={showDeleteOrdersModal} onClose={() => setShowDeleteOrdersModal(false)}>
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-900 text-center mb-2">
            Delete All Orders?
          </h2>
          <p className="text-stone-600 text-center mb-6">
            Are you sure you want to delete{' '}
            <span className="font-semibold">{orders.length} {dateView === 'today' ? "today's" : ''} order{orders.length !== 1 ? 's' : ''}</span>
            {dateView === 'range' && (
              <span className="block text-sm text-stone-500 mt-1">
                from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
              </span>
            )}
            ?
            <br />
            <span className="text-sm text-stone-500">This action cannot be undone.</span>
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteOrdersModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 !bg-red-600 hover:!bg-red-700"
              onClick={() => {
                deleteOrders(orders.map(o => o.id));
                setShowDeleteOrdersModal(false);
              }}
            >
              Delete All
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

      {/* Floating Bottom Nav - hidden when settings is open */}
      {!showSettings && (
        <BottomNav
          activePage="admin"
          onSettingsClick={() => setShowSettings(true)}
          tourTarget="admin-nav"
        />
      )}

      {/* Onboarding Tour */}
      <OnboardingTour
        steps={adminTourSteps}
        isActive={isTourActive}
        onComplete={completeOnboarding}
        onSkip={skipOnboarding}
      />

      </div>
    </div>
  );
}
