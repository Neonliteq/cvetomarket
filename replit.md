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
- Product catalog with filters (price, category, availability)
- Shopping cart with shop constraint (one shop per cart)
- Per-shop delivery pricing (shops set their own delivery cost; displayed in cart, checkout, shop detail page)
- Order lifecycle: New → Confirmed → Assembling → Delivering → Delivered → Cancelled
- Real-time chat between buyers and shops (HTTP polling)
- "Chat with seller" button on product and shop pages
- Review and rating system for products and shops
- Platform commission calculation (configurable via admin panel)
- Test payment mode (card/cash)
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

## Database Tables
- users (with isBlocked, avatarUrl fields), shops (with logoUrl, coverUrl, deliveryZones jsonb), products, orders, order_items, reviews, messages, categories, cities, platform_settings, shop_workers (shopId + userId junction table for worker access)

## Important Patterns
- Auth-protected pages must check `isLoading` before redirecting: `if (isLoading) return null; if (!user) { navigate("/auth"); return null; }`
- All fetch calls must include `credentials: "include"` for session cookies
- Shopping cart can only contain items from one shop at a time

## Images
All product and shop images generated with AI, stored in `client/public/images/`

## Running
- Development: `npm run dev` (starts Express + Vite on port 5000)
- Database push: `npm run db:push`
