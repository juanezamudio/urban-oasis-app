# Urban Oasis Project - Farmers Market POS

A mobile-first Progressive Web App (PWA) for volunteers at the Urban Oasis Project farmers market to efficiently calculate prices, track orders, and provide the director with daily sales summaries.

## Features

- **Product Grid** - Beautiful card layout with search and category filtering
- **Quick Price Calculation** - Numeric keypad for entering weight (lbs) or quantity
- **Running Cart Total** - See the order total update in real-time
- **Order Management** - Complete orders with one tap
- **Admin Dashboard** - Upload products via CSV, view daily sales
- **Offline Support** - Works without internet, syncs when back online
- **Real-time Sync** - All devices see the same products and orders

## Quick Start

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# Start development server
npm run dev
```

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project (or use existing)
3. Enable **Firestore Database**
   - Start in test mode for development
4. Go to Project Settings > General
5. Scroll down to "Your apps" and click the web icon (</>)
6. Register your app and copy the config values
7. Paste them into your `.env.local` file

### Firestore Security Rules (for production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Products - anyone can read
    match /products/{productId} {
      allow read: if true;
      allow write: if true; // Tighten in production
    }

    // Orders - anyone can read/write
    match /orders/{orderId} {
      allow read, write: if true; // Tighten in production
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
Eggs (dozen),6.00,each,Dairy
```

## Default PINs

- **Volunteer PIN**: 1234
- **Admin PIN**: 0000

Change these in Admin > Settings after first login.

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repo
4. Add environment variables (from your `.env.local`)
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
- **State**: Zustand
- **Backend**: Firebase Firestore
- **PWA**: vite-plugin-pwa

## Project Structure

```
src/
├── components/       # UI components
│   ├── ui/          # Base components (Button, Modal, Input)
│   ├── ProductCard  # Product display card
│   ├── ProductGrid  # Grid with search/filter
│   ├── Cart         # Shopping cart
│   └── ...
├── pages/           # Route pages
│   ├── Login        # PIN entry
│   ├── POS          # Main volunteer view
│   └── Admin        # Admin dashboard
├── store/           # Zustand stores
│   ├── authStore    # Authentication
│   ├── cartStore    # Shopping cart
│   ├── productStore # Products
│   └── orderStore   # Orders
├── lib/             # Utilities
│   ├── firebase     # Firebase config
│   ├── csv          # CSV parsing
│   └── utils        # Helpers
└── types/           # TypeScript types
```

## License

Built with love for the [Urban Oasis Project](https://www.urbanoasisproject.org) - a Miami-based nonprofit championing local food accessibility since 2010.
