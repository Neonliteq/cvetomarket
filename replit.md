# ЦветоМаркет - Flower Marketplace

## Overview
A full-featured flower marketplace (маркетплейс цветочных магазинов) built with React, Express, PostgreSQL. Platform connecting flower shops with buyers for online bouquet ordering with city/district delivery.

## Architecture
- **Frontend**: React + TypeScript + Vite, TanStack Query, Wouter routing, shadcn/ui components
- **Backend**: Node.js + Express, TypeScript, session-based auth
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with pink/rose theme (primary: 338 75% 45%)

## User Roles
1. **Buyer** (покупатель) - Browse catalog, cart, checkout, order tracking, reviews, chat
2. **Shop** (магазин/продавец) - Product management, order management, shop dashboard, statistics
3. **Admin** (администратор) - Platform management, moderation, categories, cities, commission settings

## Key Features
- Multi-role authentication (email/password with bcrypt, express-session)
- Product catalog with filters (price, category, availability, type including add-ons)
- Shopping cart with shop constraint (one shop per cart)
- Per-shop delivery pricing (shops set their own delivery cost; displayed in cart, checkout, shop detail page)
- Order lifecycle: New → Confirmed → Assembling → Delivering → Delivered → Cancelled
- Real-time chat between buyers and shops (HTTP polling)
- "Chat with seller" button on product and shop pages
- Review and rating system for products and shops
- Platform commission calculation (configurable via admin panel)
- ROBOKASSA payment integration (card → redirect → callback → order confirmed)
- User blocking (blocked users cannot log in)
- Shop workers: owners can add/remove workers by email; workers access products/orders but not settings or worker management

## Admin Panel Features
1. **Shop Moderation** - Approve/reject shops, filter by status (all/pending/approved/rejected), set per-shop commission rate inline
2. **User Management** - Block/unblock users (toggle), view registration date and role
3. **Order Management** - View all orders, change order status via dropdown, filter by status
4. **Category Management** - Add/delete categories (with FK constraint protection)
5. **City Management** - Add/delete cities (with FK constraint protection)
6. **Выплаты (Payouts)** - Per-shop payout table: revenue, platform commission, amount owed to each shop (all-time)
7. **Финансы (Financial Analytics)** - Revenue/commission breakdown filtered by shop + time period (week/month/quarter/year/all); daily bar chart + per-shop table
8. **Analytics Dashboard** - Revenue stats (total/monthly/weekly), commission earned, avg order value, order status breakdown, top shops by revenue, daily revenue chart, user/shop counts
9. **Platform Settings** - Configure global commission rate (%) and delivery cost (₽)

## Pages
- `/` - Home (hero, featured products, shops)
- `/catalog` - Product catalog with filters
- `/shops` - Shop listings
- `/product/:id` - Product detail with reviews + "Chat with seller"
- `/shop/:id` - Shop detail with products + "Chat with seller"
- `/cart` - Shopping cart
- `/checkout` - Order checkout
- `/auth` - Login/Register
- `/account` - Buyer account, order history
- `/shop-dashboard` - Shop owner dashboard
- `/admin` - Admin panel (7 tabs)
- `/chat` - Messaging (supports `?userId=` param for direct chat)

## Seed Accounts
- **Admin**: admin@cveto.ru / admin123
- **Shop owners**: roses@cveto.ru, bloomy@cveto.ru, tulips@cveto.ru / password123
- **Buyer**: buyer@cveto.ru / password123

## Delivery Zones (Yandex Maps)
- Shops can define delivery zones on Yandex Maps with polygon drawing
- Each zone has a name, polygon coordinates, color, and price
- Stored as JSONB `delivery_zones` column on shops table
- Checkout geocodes delivery address via Yandex Geocoder API to determine zone
- Server-side point-in-polygon check at `POST /api/shops/:id/delivery-cost`
- Falls back to shop's default `deliveryPrice` if address is outside all zones
- API key stored in `VITE_YANDEX_MAPS_API_KEY` secret

## Product Types
- `bouquet` — Букет (default)
- `gift` — Подарок
- `tasty_gift` — Вкусный подарок
- `addon` — Доп. товар (открытки, удобрения и т.д.); shown as suggestions when adding to cart

## Add-on Suggestion Flow
When a buyer adds a non-addon product to cart, `AddonSuggestionDialog` pops up showing addon products from the same shop. Buyer can select addons with quantity controls and add them in one click. If the shop has no addons, dialog auto-closes. Implemented via CartContext.triggerAddonSuggestion / clearAddonSuggestion + AddonModalMount in App.tsx.

## Shop Map Feature
- Shops page has list/map toggle (Список / Карта)
- Map view uses Yandex Maps to show shops with coordinates as placemarks
- Clicking a placemark shows balloon with shop name, rating, city, address, and "Перейти" link
- Shop dashboard settings has a ShopLocationMap component for manual coordinate placement
- When shop address is saved via PATCH /api/shops/:id, server auto-geocodes via Yandex Geocoder to get lat/lng
- GET /api/geocode?address= endpoint for manual geocoding
- Shops without coordinates appear in list but not on map

## Bonus System
- Users earn bonuses: +250 first order, +100 per 3000₽ spent (on delivery), +250 first review, +500 referral bonus when invited user makes first order ≥3000₽
- 1 bonus = 1 ruble, 30-day expiry for accrued bonuses
- Users can spend bonuses at checkout (deducted from total before commission calculation)
- Admin can manually grant bonuses via user management panel
- Referral system: each user gets unique referral code; shared via link; new user signs up with code → referrer gets bonus
- Tables: bonus_transactions (userId, amount, reason, description, expiresAt); users have bonusBalance, referralCode, referredBy columns; orders have bonusUsed column
- Frontend: Account → "Бонусы" tab (balance, referral link, history), Checkout → "Списать бонусы" block, Admin → "Бонусы" button per user

## Database Tables
- users (with isBlocked, avatarUrl, bonusBalance, referralCode, referredBy fields), shops (with logoUrl, coverUrl, deliveryZones jsonb, latitude, longitude), products, orders (with bonusUsed), order_items, reviews, messages, categories, cities, platform_settings, shop_workers, bonus_transactions

## Important Patterns
- Auth-protected pages must check `isLoading` before redirecting: `if (isLoading) return null; if (!user) { navigate("/auth"); return null; }`
- All fetch calls must include `credentials: "include"` for session cookies
- Shopping cart can only contain items from one shop at a time

## Images / File Uploads
- **Cloud storage**: All user-uploaded images (products, shop logos/covers, avatars, order assembly photos) are stored in Replit Object Storage (Google Cloud Storage via `@google-cloud/storage`)
- Backend uses multer memoryStorage → uploads buffer to GCS bucket → returns `/objects/uploads/{filename}` URL
- Object storage integration files: `server/replit_integrations/object_storage/`
- Frontend upload code unchanged — still posts FormData to `POST /api/upload`, gets `{ urls: ["/objects/..."] }` response
- Static product images in `client/public/images/` (AI-generated seed data)

## ROBOKASSA Payment Integration
- Credentials in env vars: `ROBOKASSA_LOGIN`, `ROBOKASSA_PASSWORD1`, `ROBOKASSA_PASSWORD2`, `ROBOKASSA_IS_TEST` (set to "0" for production, any other value = test mode)
- Flow: POST /api/orders → returns `{ order, paymentUrl }` for card payments → frontend redirects to ROBOKASSA
- ROBOKASSA calls POST /api/payment/robokassa/result (ResultURL) with MD5 signature → verifies, marks order paid, notifies shop
- ROBOKASSA redirects to GET /api/payment/robokassa/success → /account?payment=success, or /api/payment/robokassa/fail → /account?payment=failed
- `InvId` = `order.orderNumber` (serial integer); Signature = MD5(Login:OutSum:InvId:Password1)
- If ROBOKASSA is not configured (env vars missing), card orders are treated as paid immediately (fallback)
- Cash orders bypass ROBOKASSA entirely and notify the shop immediately
- New columns: orders.payment_status ('pending'|'paid'|'cash'|'failed'), orders.payment_id

## Running
- Development: `npm run dev` (starts Express + Vite on port 5000)
- Database push: `npm run db:push`
