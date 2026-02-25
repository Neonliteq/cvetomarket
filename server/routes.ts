import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { insertUserSchema, insertShopSchema, insertProductSchema, insertOrderSchema, insertReviewSchema, insertMessageSchema, insertCategorySchema, insertCitySchema } from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 10;

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!(req.session as any).userId) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user || !roles.includes(user.role)) return res.status(403).json({ error: "Forbidden" });
    (req as any).user = user;
    next();
  };
}

async function enrichShops(shopsList: any[]) {
  const citiesList = await storage.getCities();
  const cityMap = Object.fromEntries(citiesList.map((c) => [c.id, c.name]));
  const allUsers = await storage.getAllUsers();
  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
  return shopsList.map((s) => ({ ...s, cityName: s.cityId ? cityMap[s.cityId] : undefined, ownerName: userMap[s.ownerId] }));
}

async function enrichProducts(productsList: any[]) {
  const allShops = await storage.getShops();
  const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s.name]));
  const cats = await storage.getCategories();
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.name]));
  return productsList.map((p) => ({
    ...p,
    shopName: shopMap[p.shopId],
    categoryName: p.categoryId ? catMap[p.categoryId] : undefined,
  }));
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgStore = connectPgSimple(session);
  const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

  app.use(session({
    store: new PgStore({ pool: pgPool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 30 * 24 * 60 * 60 * 1000 },
  }));

  // ---- AUTH ----
  app.get("/api/auth/me", async (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.json({ user: null });
    const user = await storage.getUser(userId);
    if (!user) return res.json({ user: null });
    const { password: _, ...safe } = user;
    res.json({ user: safe });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, name, phone, role } = req.body;
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: "Пользователь с таким email уже существует" });
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({ email, password: hash, name, phone: phone || null, role: role || "buyer" });
      if (role === "shop") {
        await storage.createShop({ ownerId: user.id, name, email, phone: phone || null, status: "pending" });
      }
      (req.session as any).userId = user.id;
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: "Неверный email или пароль" });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ error: "Неверный email или пароль" });
      if (user.isBlocked) return res.status(403).json({ error: "Ваш аккаунт заблокирован" });
      (req.session as any).userId = user.id;
      const { password: _, ...safe } = user;
      res.json({ user: safe });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  // ---- CITIES ----
  app.get("/api/cities", async (_req, res) => {
    res.json(await storage.getCities());
  });
  app.post("/api/cities", requireRole("admin"), async (req, res) => {
    const city = await storage.createCity(req.body);
    res.json(city);
  });
  app.delete("/api/cities/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteCity(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      if (e.code === "23503") return res.status(400).json({ error: "Невозможно удалить город, он используется магазинами" });
      throw e;
    }
  });

  // ---- CATEGORIES ----
  app.get("/api/categories", async (_req, res) => {
    res.json(await storage.getCategories());
  });
  app.post("/api/categories", requireRole("admin"), async (req, res) => {
    const cat = await storage.createCategory(req.body);
    res.json(cat);
  });
  app.delete("/api/categories/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      if (e.code === "23503") return res.status(400).json({ error: "Невозможно удалить категорию, она используется товарами" });
      throw e;
    }
  });

  // ---- SHOPS ----
  app.get("/api/shops/approved", async (_req, res) => {
    const shopsList = await storage.getApprovedShops();
    res.json(await enrichShops(shopsList));
  });

  app.get("/api/shops/my", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopByOwnerId(user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const [enriched] = await enrichShops([shop]);
    res.json(enriched);
  });

  app.get("/api/shops/:id", async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Not found" });
    const [enriched] = await enrichShops([shop]);
    res.json(enriched);
  });

  app.patch("/api/shops/:id", requireRole("admin", "shop"), async (req, res) => {
    const shop = await storage.updateShop(req.params.id, req.body);
    res.json(shop);
  });

  // ---- PRODUCTS ----
  app.get("/api/products", async (_req, res) => {
    const list = await storage.getProducts();
    res.json(await enrichProducts(list));
  });

  app.get("/api/products/featured", async (_req, res) => {
    const list = await storage.getFeaturedProducts();
    res.json(await enrichProducts(list));
  });

  app.get("/api/products/:id", async (req, res) => {
    const p = await storage.getProduct(req.params.id);
    if (!p) return res.status(404).json({ error: "Not found" });
    const [enriched] = await enrichProducts([p]);
    res.json(enriched);
  });

  app.get("/api/shops/:id/products", async (req, res) => {
    const list = await storage.getProductsByShop(req.params.id);
    res.json(await enrichProducts(list));
  });

  app.post("/api/products", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopByOwnerId(user.id);
    if (!shop) return res.status(403).json({ error: "No shop" });
    const p = await storage.createProduct({ ...req.body, shopId: shop.id });
    res.json(p);
  });

  app.patch("/api/products/:id", requireRole("shop", "admin"), async (req, res) => {
    const p = await storage.updateProduct(req.params.id, req.body);
    res.json(p);
  });

  app.delete("/api/products/:id", requireRole("shop", "admin"), async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
    } catch (e: any) {
      if (e.code === "23503") {
        await storage.updateProduct(req.params.id, { isActive: false, inStock: false });
      } else {
        throw e;
      }
    }
    res.json({ ok: true });
  });

  // ---- PRODUCT REVIEWS ----
  app.get("/api/products/:id/reviews", async (req, res) => {
    const revs = await storage.getReviewsByProduct(req.params.id);
    const allUsers = await storage.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    res.json(revs.map((r) => ({ ...r, buyerName: userMap[r.buyerId] })));
  });

  // ---- ORDERS ----
  app.get("/api/orders/my", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const ordersList = await storage.getOrdersByBuyer(userId);
    const allShops = await storage.getShops();
    const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s.name]));
    const result = await Promise.all(ordersList.map(async (o) => {
      const items = await storage.getOrderItems(o.id);
      return { ...o, shopName: shopMap[o.shopId], items };
    }));
    res.json(result);
  });

  app.get("/api/orders/shop", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopByOwnerId(user.id);
    if (!shop) return res.json([]);
    const ordersList = await storage.getOrdersByShop(shop.id);
    const allUsers = await storage.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    const result = await Promise.all(ordersList.map(async (o) => {
      const items = await storage.getOrderItems(o.id);
      return { ...o, buyerName: userMap[o.buyerId], items };
    }));
    res.json(result);
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { items, shopId, totalAmount, deliveryCost, ...orderData } = req.body;
      const settings = await storage.getSettings();
      const commission = settings ? (totalAmount * Number(settings.commissionRate)) / 100 : 0;
      const order = await storage.createOrder({
        ...orderData,
        shopId,
        buyerId: userId,
        totalAmount: totalAmount.toString(),
        deliveryCost: deliveryCost.toString(),
        platformCommission: commission.toString(),
      });
      if (items?.length) {
        await storage.createOrderItems(items.map((item: any) => ({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage || null,
          quantity: item.quantity,
          price: item.price.toString(),
        })));
      }
      res.json({ order });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/orders/:id/status", requireRole("shop", "admin"), async (req, res) => {
    const order = await storage.updateOrderStatus(req.params.id, req.body.status);
    res.json(order);
  });

  // ---- REVIEWS ----
  app.post("/api/reviews", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const review = await storage.createReview({ ...req.body, buyerId: userId });
    const revs = await storage.getReviewsByShop(review.shopId);
    if (revs.length > 0) {
      const avg = revs.reduce((sum, r) => sum + r.rating, 0) / revs.length;
      await storage.updateShop(review.shopId, { rating: avg.toFixed(2), reviewCount: revs.length });
    }
    if (review.productId) {
      const productRevs = await storage.getReviewsByProduct(review.productId);
      if (productRevs.length > 0) {
        const avg = productRevs.reduce((sum, r) => sum + r.rating, 0) / productRevs.length;
        await storage.updateProduct(review.productId, { rating: avg.toFixed(2), reviewCount: productRevs.length });
      }
    }
    res.json(review);
  });

  app.get("/api/shops/:id/reviews", async (req, res) => {
    const revs = await storage.getReviewsByShop(req.params.id);
    const allUsers = await storage.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    res.json(revs.map((r) => ({ ...r, buyerName: userMap[r.buyerId] })));
  });

  // ---- MESSAGES ----
  app.get("/api/messages/conversations", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const partnerIds = await storage.getConversations(userId);
    const allUsers = await storage.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
    const result = await Promise.all(partnerIds.map(async (pid) => {
      const partner = userMap[pid];
      const msgs = await storage.getMessages(userId, pid);
      const unread = msgs.filter((m) => m.receiverId === userId && !m.isRead).length;
      return { id: pid, name: partner?.name || "Unknown", unreadCount: unread };
    }));
    res.json(result);
  });

  app.get("/api/messages/:userId", requireAuth, async (req, res) => {
    const myId = (req.session as any).userId;
    await storage.markMessagesRead(req.params.userId, myId);
    const msgs = await storage.getMessages(myId, req.params.userId);
    res.json(msgs);
  });

  app.post("/api/messages", requireAuth, async (req, res) => {
    const senderId = (req.session as any).userId;
    const msg = await storage.createMessage({ ...req.body, senderId });
    res.json(msg);
  });

  // ---- ADMIN ----
  app.get("/api/admin/shops", requireRole("admin"), async (_req, res) => {
    const shopsList = await storage.getShops();
    res.json(await enrichShops(shopsList));
  });

  app.get("/api/admin/users", requireRole("admin"), async (_req, res) => {
    const list = await storage.getAllUsers();
    res.json(list.map(({ password, ...u }) => u));
  });

  app.get("/api/admin/orders", requireRole("admin"), async (_req, res) => {
    const ordersList = await storage.getAllOrders();
    const allUsers = await storage.getAllUsers();
    const allShops = await storage.getShops();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.name]));
    const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s.name]));
    res.json(ordersList.map((o) => ({ ...o, buyerName: userMap[o.buyerId], shopName: shopMap[o.shopId] })));
  });

  app.patch("/api/admin/shops/:id/status", requireRole("admin"), async (req, res) => {
    const shop = await storage.updateShop(req.params.id, { status: req.body.status });
    res.json(shop);
  });

  app.patch("/api/admin/users/:id/block", requireRole("admin"), async (req, res) => {
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    const updated = await storage.updateUser(req.params.id, { isBlocked: !targetUser.isBlocked });
    if (!updated) return res.status(500).json({ error: "Failed to update user" });
    const { password: _, ...safe } = updated;
    res.json(safe);
  });

  app.get("/api/admin/settings", requireRole("admin"), async (_req, res) => {
    const s = await storage.getSettings();
    res.json(s || { commissionRate: "10", deliveryCost: "300" });
  });

  app.patch("/api/admin/settings", requireRole("admin"), async (req, res) => {
    const s = await storage.updateSettings(req.body);
    res.json(s);
  });

  app.get("/api/admin/analytics", requireRole("admin"), async (_req, res) => {
    const allOrders = await storage.getAllOrders();
    const allUsers = await storage.getAllUsers();
    const allShops = await storage.getShops();
    const allProducts = await storage.getProducts();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentOrders = allOrders.filter((o) => o.createdAt && new Date(o.createdAt) >= thirtyDaysAgo);
    const weekOrders = allOrders.filter((o) => o.createdAt && new Date(o.createdAt) >= sevenDaysAgo);

    const totalRevenue = allOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.totalAmount), 0);
    const monthRevenue = recentOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.totalAmount), 0);
    const weekRevenue = weekOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalCommission = allOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.platformCommission || 0), 0);

    const statusCounts: Record<string, number> = {};
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    const dailyRevenue: Record<string, number> = {};
    for (const o of recentOrders) {
      if (o.status === "cancelled" || !o.createdAt) continue;
      const day = new Date(o.createdAt).toISOString().slice(0, 10);
      dailyRevenue[day] = (dailyRevenue[day] || 0) + Number(o.totalAmount);
    }

    const shopRevenue = allOrders
      .filter((o) => o.status !== "cancelled")
      .reduce((acc, o) => {
        acc[o.shopId] = (acc[o.shopId] || 0) + Number(o.totalAmount);
        return acc;
      }, {} as Record<string, number>);
    const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s.name]));
    const topShops = Object.entries(shopRevenue)
      .map(([id, revenue]) => ({ name: shopMap[id] || "Unknown", revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const newUsers30d = allUsers.filter((u) => u.createdAt && new Date(u.createdAt) >= thirtyDaysAgo).length;
    const buyerCount = allUsers.filter((u) => u.role === "buyer").length;
    const shopOwnerCount = allUsers.filter((u) => u.role === "shop").length;
    const blockedCount = allUsers.filter((u) => u.isBlocked).length;

    const avgOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.filter((o) => o.status !== "cancelled").length : 0;

    res.json({
      totalRevenue,
      monthRevenue,
      weekRevenue,
      totalCommission,
      totalOrders: allOrders.length,
      monthOrders: recentOrders.length,
      weekOrders: weekOrders.length,
      statusCounts,
      dailyRevenue,
      topShops,
      totalUsers: allUsers.length,
      newUsers30d,
      buyerCount,
      shopOwnerCount,
      blockedCount,
      totalShops: allShops.length,
      approvedShops: allShops.filter((s) => s.status === "approved").length,
      pendingShops: allShops.filter((s) => s.status === "pending").length,
      totalProducts: allProducts.length,
      avgOrderValue: Math.round(avgOrderValue),
    });
  });

  app.get("/api/shops/:id/owner", requireAuth, async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json({ ownerId: shop.ownerId });
  });

  return httpServer;
}
