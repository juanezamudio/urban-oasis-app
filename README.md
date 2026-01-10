# Harvest Point™ - Urban Oasis Project POS

A mobile-first Progressive Web App (PWA) for volunteers at the Urban Oasis Project farmers market to efficiently calculate prices, track orders, and provide the director with daily sales summaries.

## Features

### Core POS Functionality
- **Product Grid** - Beautiful card layout with search and category filtering
- **Quick Price Calculation** - Numeric keypad for entering weight (lbs) or quantity
- **Running Cart Total** - See the order total update in real-time
- **Order Management** - Complete orders with one tap
- **Custom Item Entry** - Add items not in the product list with name, price, and category
- **Alphabetical Sorting** - Products sorted A-Z for easy browsing

### Admin Dashboard
- **Order History** - View today's orders or filter by custom date range
- **CSV Export** - Export orders to CSV for accounting/record-keeping
- **Product Management** - Upload products via CSV with preview before confirming
- **PIN Settings** - Update volunteer and admin access PINs

### User Experience
- **Onboarding Tour** - Guided tooltip tour for new users (volunteers and admins)
- **Settings Access** - Volunteers can access settings and restart tour
- **Mobile Optimized** - Horizontally scrollable filters, hidden scrollbars, fixed viewport
- **Branded Design** - Consistent header badge with logo and "Harvest Point™" wordmark

### PWA & Offline
- **Installable** - Install prompt with platform-specific instructions (iOS, Android, desktop)
- **Offline Support** - Works without internet using local storage
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
│   ├── Cart             # Shopping cart
│   ├── AddItemModal     # Quantity selection modal
│   ├── CustomItemModal  # Custom item entry modal
│   ├── OnboardingTour   # Guided tour component
│   └── InstallPrompt    # PWA install instructions
├── hooks/
│   └── useOnboarding    # Tour state management
├── pages/
│   ├── Login            # PIN entry
│   ├── POS              # Main volunteer view
│   └── Admin            # Admin dashboard
├── store/
│   ├── authStore        # Authentication & PINs
│   ├── cartStore        # Shopping cart
│   ├── productStore     # Products
│   └── orderStore       # Orders
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
- [x] Admin dashboard with orders and products tabs
- [x] CSV product upload with preview
- [x] CSV order export
- [x] Historical orders with date range filtering
- [x] PIN-based authentication (volunteer/admin roles)
- [x] PWA setup with install prompts
- [x] Onboarding tour for new users
- [x] Custom item entry for unlisted products
- [x] Settings modal for volunteers
- [x] Consistent branding across all pages
- [x] Mobile-optimized UI (scrolling, viewport, touch)
- [x] Alphabetical product sorting
- [x] Input normalization (title case names, formatted prices)
- [x] Firebase cloud sync with Firestore

### TODO
- [ ] Offline queue for orders (sync when back online)
- [ ] Print/email receipt functionality
- [ ] Inventory tracking (stock levels, low stock alerts)
- [ ] Multiple payment method tracking (cash, card, etc.)
- [ ] Shift management (start/end shift with cash counts)
- [ ] Product image support
- [ ] Barcode/QR code scanning
- [ ] Multi-language support
- [ ] Analytics dashboard (sales trends, popular items)
- [ ] User activity logging

## License

Built with love for the [Urban Oasis Project](https://www.urbanoasisproject.org) - a Miami-based nonprofit championing local food accessibility since 2010.
