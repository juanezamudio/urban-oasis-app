# Harvest Point - Feature Ideas

A collection of feature ideas for future development of the Harvest Point POS system.

## High Impact / Relatively Easy

### Split Payment
Allow splitting an order between payment methods (e.g., $10 cash + $5 card). Common at farmers markets when customers run low on cash.

### Dark Mode
Toggle between light/dark themes. Helps with outdoor visibility and battery life on mobile devices.

---

## Medium Effort / High Value

### Vendor Attribution
Tag products by which farmer/vendor supplied them, then generate payout reports showing how much each vendor earned. Essential for markets with multiple farmers selling through one POS.

### Volunteer Shift Tracking
Log who worked when, see sales per volunteer. Helpful for scheduling, accountability, and recognizing top performers.

### Customer Loyalty
Simple punch card system (buy 10, get 1 free) or points-based rewards. Encourages repeat customers and builds community.

### SMS/Text Receipts
Enter phone number at checkout to text receipt link. More practical than QR codes for some customers, especially older demographics.

### Print Support
Connect to a Bluetooth receipt printer for physical receipts. Some vendors and customers still prefer paper receipts.

---

## Analytics Enhancements

### Compare Periods
Compare this week vs last week, or this month vs same month last year. Helps identify growth trends and seasonal patterns.

### Sales Heatmap
Visualize which hours/days are busiest using a heatmap grid. Helps with volunteer scheduling and staffing decisions.

### Weather Correlation
Log weather conditions (sunny, rainy, hot, cold) and correlate with sales data. Helps predict busy days and plan inventory.

### Product Performance Tracking
Track which items are slowing down in sales velocity. Suggest markdowns for items that aren't moving.

---

## Operational Features

### Training Mode
Sandbox mode for new volunteers to practice taking orders without affecting real sales data. Toggle on/off in settings.

### Cash Drawer Reconciliation
Start/end shift with cash count. Track expected vs actual cash to identify discrepancies. Generate shift reports.

### Low Stock Alerts
If inventory tracking is added, show visual alerts when items are running low. Could auto-hide sold-out items from the grid.

---

## Technical Polish

### Landscape/Tablet Mode
Side-by-side product grid + cart layout optimized for iPad and tablet users. Better use of screen real estate.

### Accessibility Improvements
Better screen reader support (ARIA labels), high contrast mode, larger touch targets option for users with motor difficulties.

### Offline Product Images
Cache product photos for offline use. Currently products are text-only; images would enhance the visual experience.

### Multi-Language Support
Spanish language option for bilingual volunteers and customers. Store language preference per device.

---

## Implemented Features

### Quick Favorites ✅
**Implemented January 2025**
- Personal favorites stored in localStorage (per device)
- Star icon on product cards to toggle favorites
- Favorites row displayed above category filters
- One-tap to add favorited items to cart
- Stored in `favoritesStore.ts` using Zustand persist middleware

### Daily Sales Goal ✅
**Implemented January 2025**
- Admin sets daily target from Settings modal
- Progress bar shows real-time progress toward goal
- Celebration animation when goal is reached
- Goal syncs across all devices via Firebase (`settings/dailyGoal`)
- Clear goal button to reset for new day
- Responsive layout: full width on mobile, 2/3 width with announcements on desktop

### Discount/Promo Support ✅
**Implemented January 2025**
- Preset discount buttons: 10%, 20%, Senior (15%), End of Day (25%)
- Toggle between percentage and fixed amount discounts
- Custom value input for any discount amount
- Optional label for discount (shown on receipt)
- Cart shows subtotal, discount line item, and final total
- Discount details saved with order for reporting
- Receipt displays discount with amount saved

### Announcement Banner ✅
**Implemented January 2025**
- Multiple announcements supported (stored as array in Firebase)
- Auto-scrolling carousel (3-second interval)
- Pagination dots to manually navigate between announcements
- Three types with color coding: Info (blue), Warning (amber), Urgent (red)
- 50 character limit for concise messaging
- Admin can add/remove individual announcements or clear all
- Syncs across all devices via Firebase (`settings/announcements`)
- Pauses on hover (desktop) for readability
- Responsive: stacks below goal on mobile, side-by-side on desktop

---

*Last updated: January 2025*
