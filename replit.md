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
- Order lifecycle: New → Confirmed → In Delivery → Delivered → Completed
- Real-time chat between buyers and shops
- Review and rating system for products and shops
- Platform commission calculation (configurable via admin panel)
- Test payment mode (card/cash)
- Admin panel for shop moderation, category/city management

## Pages
- `/` - Home (hero, featured products, shops)
- `/catalog` - Product catalog with filters
- `/shops` - Shop listings
- `/product/:id` - Product detail with reviews
- `/shop/:id` - Shop detail with products
- `/cart` - Shopping cart
- `/checkout` - Order checkout
- `/auth` - Login/Register
- `/account` - Buyer account, order history
- `/shop-dashboard` - Shop owner dashboard
- `/admin` - Admin panel
- `/chat` - Messaging

## Seed Accounts
- **Admin**: admin@cveto.ru / admin123
- **Shop owners**: roses@cveto.ru, bloomy@cveto.ru, tulips@cveto.ru / password123
- **Buyer**: buyer@cveto.ru / password123

## Database Tables
- users, shops, products, orders, order_items, reviews, messages, categories, cities, platform_settings

## Images
All product and shop images generated with AI, stored in `client/public/images/`

## Running
- Development: `npm run dev` (starts Express + Vite on port 5000)
- Database push: `npm run db:push`
