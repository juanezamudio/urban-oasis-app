# Harvest Point™ - Urban Oasis Project POS

A mobile-first Progressive Web App (PWA) for volunteers at the Urban Oasis Project farmers market to efficiently calculate prices, track orders, and provide the director with daily sales summaries.

## Features

### Core POS Functionality
- **Product Grid** - Beautiful card layout with search and category filtering
- **Quick Price Calculation** - Numeric keypad for entering weight (lbs) or quantity
- **Running Cart Total** - See the order total update in real-time
- **Cart Editing** - Adjust quantities with +/- buttons directly in cart
- **Order Management** - Complete orders with one tap
- **Payment Method Selection** - Choose cash, card, or voucher at checkout
- **Undo Orders** - 5-second window to undo accidental checkouts and restore cart
- **Custom Item Entry** - Add items not in the product list with name, price, unit, and category
- **Save Custom Items** - Option to save custom items to database for future use
- **Alphabetical Sorting** - Products sorted A-Z for easy browsing

### Admin Dashboard
- **Order History** - View today's orders or filter by custom date range
- **CSV Export** - Export orders to CSV for accounting/record-keeping
- **Product Management** - Upload products via CSV with preview before confirming
- **Delete Orders/Products** - Remove individual orders or products with confirmation modal
- **Bulk Delete Orders** - Delete all orders for today or within a selected date range
- **Clear All Products** - Remove all products from the database at once
- **PIN Settings** - Update volunteer and admin access PINs (synced across all devices)
- **Insights Tab** - Sales analytics with key metrics and visualizations:
  - Total revenue and orders with per-hour averages
  - Average order value, largest/smallest orders
  - Top product and category by revenue
  - Peak sales hour, items sold, items per order
  - Payment method breakdown (cash/card/voucher) with progress bars
  - Category sales breakdown with progress bars
  - Top products by revenue and quantity (charts + data tables)
  - Daily sales trend area chart

### Quick Favorites
- **Personal Favorites** - Pin frequently-used products to a favorites row for quick access
- **Device-Local Storage** - Favorites saved per device (localStorage)
- **One-Tap Toggle** - Star icon on product cards to add/remove favorites
- **Quick Add** - Tap favorited product to instantly add to cart

### Daily Sales Goal
- **Admin-Set Target** - Set a daily revenue goal visible on all POS screens
- **Real-Time Progress** - Progress bar updates as orders are completed
- **Goal Celebration** - Visual celebration when goal is reached
- **Firebase Synced** - Goal syncs across all devices in real-time

### Discount Support
- **Preset Discounts** - Quick buttons for common discounts (10%, 20%, Senior 15%, End of Day 25%)
- **Custom Discounts** - Enter any percentage or fixed amount
- **Discount Labels** - Name discounts for reporting (e.g., "Senior Discount")
- **Receipt Integration** - Discounts shown on receipts with amount saved
- **Order Tracking** - Discount details recorded in order data for analytics

### Announcement Banner
- **Admin Messages** - Post announcements visible on all POS screens
- **Multiple Announcements** - Support for multiple active announcements
- **Auto-Scroll Carousel** - Announcements rotate every 3 seconds
- **Type Styling** - Info (blue), Warning (amber), Urgent (red) color coding
- **Character Limit** - 50 character limit for concise, impactful messages
- **Firebase Synced** - Announcements sync across all devices in real-time

### User Experience
- **Onboarding Tour** - Guided tooltip tour for new users (volunteers and admins)
- **Unified Navigation** - Consistent bottom nav bar across all pages
- **Settings Access** - Settings accessible from nav bar (PIN management for admins, tour restart)
- **Mobile Optimized** - Horizontally scrollable filters, hidden scrollbars, fixed viewport
- **Branded Design** - Consistent header badge with logo and "Harvest Point™" wordmark
- **Responsive Status Bar** - Daily goal and announcements adapt to screen size

### Digital Receipts
- **Screen Receipt** - Styled receipt displayed after each order with order details
- **Scrollable Content** - Long receipts scroll within modal with action buttons always visible
- **Share via AirDrop** - Native share button for iOS/Android (AirDrop, Messages, etc.)
- **QR Code Receipt** - Customers scan to view receipt on their phone
- **Persistent Receipts** - Receipts accessible via URL, fetched from Firebase

### PWA & Offline
- **Installable** - Install prompt with platform-specific instructions (iOS, Android, desktop)
- **Offline Support** - Works without internet using local storage
- **Offline Order Queue** - Orders saved locally when offline, auto-sync when back online
- **Sync Status Indicator** - Visual indicator showing offline/syncing/pending status
- **Real-time Sync** - All devices see the same products and orders (when Firebase enabled)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs in local-only mode by default. See Firebase Setup below for cloud sync.

## Firebase Setup (Optional)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Firestore Database** (start in test mode for development)
4. Go to Project Settings > General
5. Scroll down to "Your apps" and click the web icon (</>)
6. Register your app and copy the config values
7. Create `.env.local` with your credentials:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### Firestore Security Rules (Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read: if true;
      allow write: if true; // Tighten for production
    }
    match /orders/{orderId} {
      allow read, write: if true; // Tighten for production
    }
    match /settings/{docId} {
      allow read: if true;
      allow write: if true; // Tighten for production
    }
  }
}
```

## CSV Format for Products

Upload a CSV file with these columns:

| Column | Description | Example |
|--------|-------------|---------|
| name | Product display name | Tomatoes |
| price | Price (no $ symbol) | 3.50 |
| unit | `lb` or `each` | lb |
| category | For grouping | Vegetables |

Example:
```csv
name,price,unit,category
Tomatoes,3.50,lb,Vegetables
Lettuce,3.00,each,Vegetables
Apples,4.00,lb,Fruits
Eggs (dozen),6.00,each,Dairy & Eggs
```

## Default PINs

- **Volunteer PIN**: 1234
- **Admin PIN**: 0000

Change these in Admin > Settings after first login.

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repo
4. Add environment variables (Firebase config, if using)
5. Deploy!

Or use the CLI:
```bash
npm i -g vercel
vercel
```

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Fonts**: Fraunces (display), DM Sans (body)
- **State**: Zustand with persist middleware
- **Backend**: Firebase Firestore (optional, works offline)
- **PWA**: vite-plugin-pwa

## Project Structure

```
src/
├── components/
│   ├── ui/              # Base components (Button, Modal, Input)
│   ├── ProductCard      # Product display card
│   ├── ProductGrid      # Grid with search/filter
│   ├── Cart             # Shopping cart with quantity editing
│   ├── BottomNav        # Reusable navigation bar
│   ├── UndoToast        # Undo order notification
│   ├── AddItemModal     # Quantity selection modal
│   ├── CustomItemModal  # Custom item entry modal
│   ├── PaymentMethodModal # Payment selection (cash/card/voucher)
│   ├── ReceiptModal     # Digital receipt with QR code
│   ├── SyncStatus       # Offline/sync status indicator
│   ├── OnboardingTour   # Guided tour component
│   ├── InstallPrompt    # PWA install instructions
│   ├── DailyGoalBanner  # Sales goal progress bar
│   ├── AnnouncementBanner # Auto-scrolling announcements
│   └── DiscountModal    # Discount selection interface
├── hooks/
│   ├── useOnboarding    # Tour state management
│   └── useOnlineStatus  # Network connectivity detection
├── pages/
│   ├── Login            # PIN entry
│   ├── POS              # Main volunteer view
│   ├── Admin            # Admin dashboard
│   └── Receipt          # Public receipt view (via QR code)
├── store/
│   ├── authStore        # Authentication & PINs
│   ├── cartStore        # Shopping cart (with discount support)
│   ├── productStore     # Products
│   ├── orderStore       # Orders
│   ├── favoritesStore   # Quick favorites (localStorage)
│   ├── goalStore        # Daily sales goal (Firebase)
│   └── announcementStore # Announcements (Firebase)
├── lib/
│   ├── firebase         # Firebase config
│   ├── csv              # CSV parsing/export
│   └── utils            # Helpers & formatters
├── assets/
│   └── uop-logo.png     # Logo image
└── types/               # TypeScript types
```

## Development Roadmap

### Completed
- [x] Core POS functionality (products, cart, checkout)
- [x] Cart quantity editing with +/- buttons
- [x] Undo order feature (5-second window to restore cart)
- [x] Admin dashboard with orders and products tabs
- [x] CSV product upload with preview
- [x] CSV order export
- [x] Historical orders with date range filtering
- [x] PIN-based authentication (volunteer/admin roles)
- [x] PWA setup with install prompts
- [x] Onboarding tour for new users
- [x] Custom item entry with unit selection (each/lb)
- [x] Save custom items to database option
- [x] Reusable bottom navigation component
- [x] Unified settings modal across all pages
- [x] Consistent branding across all pages
- [x] Mobile-optimized UI (scrolling, viewport, touch)
- [x] Alphabetical product sorting
- [x] Input normalization (title case names, formatted prices)
- [x] Firebase cloud sync with Firestore
- [x] Payment method tracking (cash, card, voucher selection at checkout)
- [x] Insights dashboard with key metrics and visualizations
- [x] Payment breakdown analytics with progress bars
- [x] Category sales breakdown with progress bars
- [x] Top products charts (by revenue and quantity)
- [x] Daily sales trend area chart
- [x] Digital receipt with QR code and native share (AirDrop)
- [x] Receipts accessible via URL from any device
- [x] Offline order queue with auto-sync
- [x] Sync status indicator (offline/syncing/pending)
- [x] Admin delete functionality (orders and products)
- [x] Delete confirmation modals
- [x] Consistent category badge colors across app
- [x] Firebase PIN sync (PINs stored in cloud, synced across devices)
- [x] Bulk delete orders (all orders for today or date range)
- [x] Clear all products feature
- [x] Scrollable receipt modal with fixed action buttons
- [x] Quick favorites row (device-local pinned products)
- [x] Daily sales goal with progress bar (Firebase synced)
- [x] Discount/promo support (preset + custom discounts)
- [x] Announcement banner with auto-scrolling carousel (Firebase synced)
- [x] Multiple announcement support with type styling (info/warning/urgent)

### Future Enhancements
- [ ] Email receipt to customer
- [ ] Inventory tracking (stock levels, low stock alerts)
- [ ] Shift management (start/end shift with cash counts)
- [ ] Product image support
- [ ] Barcode/QR code scanning
- [ ] Multi-language support (Spanish)
- [ ] Enhanced analytics (compare date ranges, export reports)
- [ ] User activity logging
- [ ] Vendor/supplier management

## License

Built with love for the [Urban Oasis Project](https://www.urbanoasisproject.org) - a Miami-based nonprofit championing local food accessibility since 2010.
