import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { insertUserSchema, insertShopSchema, insertProductSchema, insertOrderSchema, insertReviewSchema, insertMessageSchema, insertCategorySchema, insertCitySchema } from "@shared/schema";
import { z } from "zod";
import { objectStorageClient, ObjectStorageService } from "./replit_integrations/object_storage";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { sendTelegramMessage, generateLinkToken, consumeLinkToken, getBotUsername, ORDER_STATUS_MESSAGES, registerWebhook } from "./telegram";

function parseObjPath(p: string): { bucketName: string; objectName: string } {
  if (!p.startsWith("/")) p = `/${p}`;
  const parts = p.split("/");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function isPointInPolygon(point: [number, number], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    cb(null, allowed.test(path.extname(file.originalname)));
  },
});

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

  registerObjectStorageRoutes(app);

  const objStorageService = new ObjectStorageService();

  app.post("/api/upload", requireAuth, upload.array("images", 10), async (req, res) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

    try {
      const privateDir = objStorageService.getPrivateObjectDir();
      const { bucketName, objectName: basePath } = parseObjPath(privateDir);
      const bucket = objectStorageClient.bucket(bucketName);

      const urls: string[] = [];
      for (const file of files) {
        const ext = path.extname(file.originalname);
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        const objectName = `${basePath}/uploads/${uniqueName}`;
        const gcsFile = bucket.file(objectName);

        await gcsFile.save(file.buffer, {
          contentType: file.mimetype,
          resumable: false,
        });

        urls.push(`/objects/uploads/${uniqueName}`);
      }

      res.json({ urls });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

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
        const { inn, ogrn, legalName, legalAddress, legalType, description, cityId, address } = req.body;
        await storage.createShop({
          ownerId: user.id, name, email, phone: phone || null, status: "pending",
          inn: inn || null, ogrn: ogrn || null, legalName: legalName || null,
          legalAddress: legalAddress || null, legalType: legalType || null,
          description: description || null, cityId: cityId || null, address: address || null,
        });
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

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const { name, phone, avatarUrl, buyerCity } = req.body;
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (buyerCity !== undefined) updates.buyerCity = buyerCity;
    const updated = await storage.updateUser(userId, updates);
    if (!updated) return res.status(500).json({ error: "Failed to update" });
    const { password: _, ...safe } = updated;
    res.json({ user: safe });
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

  // ---- GEOCODING ----
  app.get("/api/geocode", async (req, res) => {
    const address = req.query.address as string;
    if (!address) return res.status(400).json({ error: "address is required" });
    const apiKey = process.env.VITE_YANDEX_MAPS_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Yandex Maps API key not configured" });
    try {
      const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(address)}&format=json&results=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
      if (!pos) return res.json({ latitude: null, longitude: null });
      const [lng, lat] = pos.split(" ").map(Number);
      res.json({ latitude: lat, longitude: lng });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ---- SHOPS ----
  app.get("/api/shops/approved", async (_req, res) => {
    const shopsList = await storage.getApprovedShops();
    res.json(await enrichShops(shopsList));
  });

  app.get("/api/shops/all", async (_req, res) => {
    const shopsList = await storage.getShops();
    const visible = shopsList.filter((s) => s.status === "approved");
    res.json(await enrichShops(visible));
  });

  app.get("/api/shops/my", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopForUser(user.id);
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

  app.get("/api/shops/:id/delivery-zones", async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Not found" });
    res.json({
      zones: (shop as any).deliveryZones || [],
      defaultPrice: shop.deliveryPrice || "300",
    });
  });

  app.post("/api/shops/:id/delivery-cost", async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Not found" });
    const { lat, lng } = req.body;
    const zones: any[] = (shop as any).deliveryZones || [];
    const hasZones = zones.length > 0;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.json({ price: shop.deliveryPrice || "300", zone: null, hasZones });
    }
    for (const zone of zones) {
      if (zone.coordinates && isPointInPolygon([lat, lng], zone.coordinates)) {
        return res.json({ price: String(zone.price), zone: zone.name, hasZones });
      }
    }
    res.json({ price: shop.deliveryPrice || "300", zone: null, hasZones });
  });

  app.patch("/api/shops/:id", requireRole("admin", "shop"), async (req, res) => {
    if (req.body.address && !req.body.latitude && !req.body.longitude) {
      const apiKey = process.env.VITE_YANDEX_MAPS_API_KEY;
      if (apiKey) {
        try {
          const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${apiKey}&geocode=${encodeURIComponent(req.body.address)}&format=json&results=1`;
          const resp = await fetch(url);
          const data = await resp.json();
          const pos = data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.Point?.pos;
          if (pos) {
            const [lng, lat] = pos.split(" ").map(Number);
            req.body.latitude = lat.toString();
            req.body.longitude = lng.toString();
          }
        } catch {}
      }
    }
    const shop = await storage.updateShop(req.params.id, req.body);
    res.json(shop);
  });

  // ---- SHOP WORKERS ----
  app.get("/api/shops/my/workers", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopForUser(user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    const workers = await storage.getShopWorkers(shop.id);
    res.json({ workers, isOwner: shop.ownerId === user.id });
  });

  app.post("/api/shops/my/workers/invite", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopForUser(user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    if (shop.ownerId !== user.id) return res.status(403).json({ error: "Только владелец может добавлять сотрудников" });

    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "Email обязателен" });

    let target = await storage.getUserByEmail(email);
    let isNew = false;
    if (!target) {
      const tempPassword = Math.random().toString(36).slice(-10);
      const bcrypt = await import("bcrypt");
      const hash = await bcrypt.hash(tempPassword, 10);
      target = await storage.createUser({ email, password: hash, name: name || email.split("@")[0], role: "shop" });
      isNew = true;
    } else if (target.role !== "shop") {
      return res.status(400).json({ error: "Пользователь с таким email не является продавцом" });
    }

    if (target.id === shop.ownerId) return res.status(400).json({ error: "Это владелец магазина" });

    const alreadyWorker = await storage.isShopWorker(shop.id, target.id);
    if (alreadyWorker) return res.status(400).json({ error: "Пользователь уже является сотрудником" });

    const alreadyInOtherShop = await storage.getShopForUser(target.id);
    if (alreadyInOtherShop && alreadyInOtherShop.id !== shop.id) {
      return res.status(400).json({ error: "Пользователь уже работает в другом магазине" });
    }

    await storage.addShopWorker(shop.id, target.id);
    res.json({ ok: true, isNew, user: { id: target.id, name: target.name, email: target.email } });
  });

  app.delete("/api/shops/my/workers/:userId", requireRole("shop"), async (req, res) => {
    const user = (req as any).user;
    const shop = await storage.getShopForUser(user.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    if (shop.ownerId !== user.id) return res.status(403).json({ error: "Только владелец может удалять сотрудников" });
    await storage.removeShopWorker(shop.id, req.params.userId);
    res.json({ ok: true });
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
    const shop = await storage.getShopForUser(user.id);
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
    const shop = await storage.getShopForUser(user.id);
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
      const { items, shopId, totalAmount, deliveryCost, deliveryLat, deliveryLng, ...orderData } = req.body;

      const shop = await storage.getShop(shopId);
      if (!shop) return res.status(404).json({ error: "Магазин не найден" });
      const zones: any[] = (shop as any).deliveryZones || [];
      if (zones.length > 0) {
        if (typeof deliveryLat !== "number" || typeof deliveryLng !== "number") {
          return res.status(400).json({ error: "Укажите адрес доставки на карте, чтобы мы могли проверить зону доставки" });
        }
        const inZone = zones.some((zone: any) =>
          zone.coordinates && isPointInPolygon([deliveryLat, deliveryLng], zone.coordinates)
        );
        if (!inZone) {
          return res.status(400).json({ error: "Адрес доставки находится за пределами зон доставки магазина" });
        }
      }

      const settings = await storage.getSettings();
      const shopForCommission = await storage.getShop(shopId);
      const effectiveRate = shopForCommission?.commissionRate != null
        ? Number(shopForCommission.commissionRate)
        : (settings ? Number(settings.commissionRate) : 10);
      const commission = (totalAmount * effectiveRate) / 100;
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
      // Notify shop owner and workers about new order
      const shopData = await storage.getShop(shopId);
      if (shopData) {
        const notifText = `Сумма: ${Number(totalAmount).toLocaleString("ru-RU")} ₽`;
        const recipientIds = new Set<string>([shopData.ownerId]);
        const workers = await storage.getShopWorkers(shopData.id);
        workers.forEach((w) => recipientIds.add(w.userId));
        for (const recipientId of recipientIds) {
          await storage.createNotification({
            userId: recipientId,
            type: "order_new",
            title: "Новый заказ",
            text: notifText,
            link: "/shop-dashboard",
            isRead: false,
          });
          const recipient = await storage.getUser(recipientId);
          if (recipient?.telegramChatId) {
            await sendTelegramMessage(
              recipient.telegramChatId,
              `🛍 <b>Новый заказ в магазине «${shopData.name}»</b>\n\nСумма: <b>${Number(totalAmount).toLocaleString("ru-RU")} ₽</b>\n\nОткройте панель управления, чтобы подтвердить заказ.`
            );
          }
        }
      }
      res.json({ order });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/orders/:id/status", requireRole("shop", "admin"), async (req, res) => {
    const existing = await storage.getOrder(req.params.id);
    if (!existing) return res.status(404).json({ error: "Заказ не найден" });
    const user = await storage.getUser((req.session as any).userId);
    if (existing.status === "delivered" && user?.role !== "admin") {
      return res.status(400).json({ error: "Нельзя изменить статус доставленного заказа" });
    }
    if (req.body.status === "assembling" && !req.body.assemblyPhotoUrl && !existing.assemblyPhotoUrl) {
      return res.status(400).json({ error: "Загрузите фото готового букета перед тем как пометить заказ собранным" });
    }
    const order = await storage.updateOrderStatus(req.params.id, req.body.status, req.body.assemblyPhotoUrl);
    // Notify buyer about status change
    const STATUS_LABELS: Record<string, string> = {
      confirmed: "Ваш заказ подтверждён магазином",
      assembling: "Ваш заказ собирается",
      delivering: "Ваш заказ передан в доставку",
      delivered: "Ваш заказ доставлен",
      cancelled: "Ваш заказ отменён",
    };
    const label = STATUS_LABELS[req.body.status];
    if (label && order) {
      const shopForNotif = await storage.getShop(order.shopId);
      await storage.createNotification({
        userId: order.buyerId,
        type: "order_status",
        title: label,
        text: shopForNotif ? `Магазин «${shopForNotif.name}»` : undefined,
        link: "/account",
        isRead: false,
      });
      const buyer = await storage.getUser(order.buyerId);
      if (buyer?.telegramChatId) {
        const tgMsg = ORDER_STATUS_MESSAGES[req.body.status];
        if (tgMsg) {
          await sendTelegramMessage(
            buyer.telegramChatId,
            `${tgMsg}${shopForNotif ? `\n\n🏪 Магазин: ${shopForNotif.name}` : ""}`
          );
        }
      }
    }
    // Notify buyer about photo pending approval
    if (req.body.status === "assembling" && req.body.assemblyPhotoUrl && order) {
      await storage.createNotification({
        userId: order.buyerId,
        type: "photo_pending",
        title: "Фото готового букета ожидает одобрения",
        text: "Пожалуйста, проверьте фото и подтвердите заказ",
        link: "/account",
        isRead: false,
      });
      const buyerForPhoto = await storage.getUser(order.buyerId);
      if (buyerForPhoto?.telegramChatId) {
        await sendTelegramMessage(
          buyerForPhoto.telegramChatId,
          `📸 <b>Магазин загрузил фото готового букета</b>\n\nПожалуйста, откройте раздел «Мои заказы» на сайте и одобрите или отклоните фото.`
        );
      }
    }
    res.json(order);
  });

  app.patch("/api/orders/:id/photo-approval", requireAuth, async (req, res) => {
    const existing = await storage.getOrder(req.params.id);
    if (!existing) return res.status(404).json({ error: "Заказ не найден" });
    const userId = (req.session as any).userId;
    if (existing.buyerId !== userId) return res.status(403).json({ error: "Нет доступа" });
    if (existing.status !== "assembling") return res.status(400).json({ error: "Заказ не в статусе сборки" });
    const { approval } = req.body;
    if (approval !== "approved" && approval !== "rejected") return res.status(400).json({ error: "Неверный статус" });
    const order = await storage.updateOrderPhotoApproval(existing.id, approval);
    // Notify shop owner + workers about buyer's photo decision
    const shopForApproval = await storage.getShop(existing.shopId);
    if (shopForApproval) {
      const isApproved = approval === "approved";
      const recipientIds = new Set<string>([shopForApproval.ownerId]);
      const workers = await storage.getShopWorkers(shopForApproval.id);
      workers.forEach((w) => recipientIds.add(w.userId));
      for (const recipientId of recipientIds) {
        await storage.createNotification({
          userId: recipientId,
          type: isApproved ? "photo_approved" : "photo_rejected",
          title: isApproved ? "Покупатель одобрил фото букета" : "Покупатель отклонил фото букета",
          text: isApproved ? "Заказ можно отправлять в доставку" : "Требуется пересборка букета",
          link: "/shop-dashboard",
          isRead: false,
        });
        const recipient = await storage.getUser(recipientId);
        if (recipient?.telegramChatId) {
          await sendTelegramMessage(
            recipient.telegramChatId,
            isApproved
              ? `✅ <b>Покупатель одобрил фото букета</b>\n\nЗаказ можно отправлять в доставку.`
              : `❌ <b>Покупатель отклонил фото букета</b>\n\nТребуется пересборка. Откройте панель управления.`
          );
        }
      }
    }
    res.json(order);
  });

  // ---- REVIEWS ----
  app.get("/api/reviews/my", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const revs = await storage.getReviewsByBuyer(userId);
    res.json(revs);
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    if (req.body.orderId) {
      const order = await storage.getOrder(req.body.orderId);
      if (!order || order.buyerId !== userId) return res.status(403).json({ error: "Нет доступа" });
      if (order.status !== "delivered") return res.status(400).json({ error: "Отзыв можно оставить только после доставки" });
      if (req.body.productId) {
        const existingReviews = await storage.getReviewsByOrder(req.body.orderId);
        const alreadyReviewed = existingReviews.find((r) => r.productId === req.body.productId);
        if (alreadyReviewed) return res.status(400).json({ error: "Вы уже оценили этот товар в этом заказе" });
      } else {
        const buyerReviews = await storage.getReviewsByBuyer(userId);
        const shopReview = buyerReviews.find((r) => !r.productId && r.shopId === order.shopId);
        if (shopReview) return res.status(400).json({ error: "Вы уже оставили отзыв об этом магазине" });
      }
    }
    const review = await storage.createReview({ ...req.body, buyerId: userId });
    const shopRevs = await storage.getReviewsByShop(review.shopId);
    const shopOnlyRevs = shopRevs.filter((r) => !r.productId);
    if (shopOnlyRevs.length > 0) {
      const avg = shopOnlyRevs.reduce((sum, r) => sum + r.rating, 0) / shopOnlyRevs.length;
      await storage.updateShop(review.shopId, { rating: avg.toFixed(2), reviewCount: shopOnlyRevs.length });
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

  app.post("/api/reviews/seen", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    await storage.updateUser(userId, { reviewsSeenAt: new Date() });
    res.json({ ok: true });
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
    const sender = await storage.getUser(senderId);
    const receiver = await storage.getUser(msg.receiverId);
    if (sender) {
      await storage.createNotification({
        userId: msg.receiverId,
        type: "message",
        title: `Новое сообщение от ${sender.name}`,
        text: msg.content.length > 80 ? msg.content.slice(0, 80) + "..." : msg.content,
        link: `/chat?userId=${senderId}`,
        isRead: false,
      });
      if (receiver?.telegramChatId) {
        await sendTelegramMessage(
          receiver.telegramChatId,
          `💬 <b>Новое сообщение от ${sender.name}</b>\n\n${msg.content.length > 200 ? msg.content.slice(0, 200) + "..." : msg.content}`
        );
      }
    }
    res.json(msg);
  });

  // ---- NOTIFICATIONS ----
  app.get("/api/notifications", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;

    // Unread message count (from messages table, separate from notifications)
    const partnerIds = await storage.getConversations(userId);
    let totalUnread = 0;
    for (const pid of partnerIds) {
      const msgs = await storage.getMessages(userId, pid);
      totalUnread += msgs.filter((m) => m.receiverId === userId && !m.isRead).length;
    }

    const dbNotifications = await storage.getUserNotifications(userId);
    const notifications = dbNotifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      text: n.text || "",
      link: n.link || "/",
      time: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
    }));

    res.json({ notifications, unreadMessages: totalUnread });
  });

  app.post("/api/notifications/read", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    await storage.markNotificationsRead(userId);
    res.json({ ok: true });
  });

  // ---- TELEGRAM ----
  app.get("/api/telegram/link", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    const token = await generateLinkToken(userId);
    res.json({ url: `https://t.me/${getBotUsername()}?start=${token}` });
  });

  app.delete("/api/telegram/link", requireAuth, async (req, res) => {
    const userId = (req.session as any).userId;
    await storage.setTelegramChatId(userId, null);
    res.json({ ok: true });
  });

  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const message = req.body?.message;
      if (!message) return res.json({ ok: true });

      const chatId = String(message.chat?.id);
      const text: string = message.text || "";

      if (text.startsWith("/start")) {
        const token = text.split(" ")[1]?.trim();
        if (token) {
          const userId = consumeLinkToken(token);
          if (userId) {
            await storage.setTelegramChatId(userId, chatId);
            await sendTelegramMessage(
              chatId,
              "✅ <b>Telegram-уведомления подключены!</b>\n\nТеперь вы будете получать уведомления о заказах и сообщениях прямо здесь."
            );
          } else {
            await sendTelegramMessage(chatId, "⚠️ Ссылка устарела или недействительна.\n\nПожалуйста, сгенерируйте новую ссылку в настройках профиля.");
          }
        } else {
          await sendTelegramMessage(chatId, "👋 Привет! Чтобы получать уведомления от ЦветоМаркет, перейдите в профиль на сайте и нажмите «Подключить Telegram».");
        }
      }

      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
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

  app.delete("/api/admin/users/:id", requireRole("admin"), async (req, res) => {
    const sessionUserId = (req.session as any).userId;
    if (sessionUserId === req.params.id) return res.status(400).json({ error: "Нельзя удалить свой аккаунт" });
    const targetUser = await storage.getUser(req.params.id);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.role === "admin") return res.status(403).json({ error: "Нельзя удалить администратора" });
    await storage.deleteUser(req.params.id);
    res.json({ success: true });
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

  app.get("/api/admin/products", requireRole("admin"), async (_req, res) => {
    const list = await storage.getAllProducts();
    res.json(await enrichProducts(list));
  });

  app.delete("/api/admin/shops/:id", requireRole("admin"), async (req, res) => {
    try {
      await storage.deleteShop(req.params.id);
      res.json({ ok: true });
    } catch (e: any) {
      if (e.code === "23503") return res.status(400).json({ error: "Невозможно удалить магазин, у него есть связанные данные" });
      throw e;
    }
  });

  app.patch("/api/admin/shops/:id", requireRole("admin"), async (req, res) => {
    const shop = await storage.updateShop(req.params.id, req.body);
    res.json(shop);
  });

  app.patch("/api/admin/products/:id", requireRole("admin"), async (req, res) => {
    const p = await storage.updateProduct(req.params.id, req.body);
    res.json(p);
  });

  app.delete("/api/admin/products/:id", requireRole("admin"), async (req, res) => {
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

  // Per-shop commission override (admin)
  app.patch("/api/admin/shops/:id/commission", requireRole("admin"), async (req, res) => {
    const { commissionRate } = req.body;
    const val = commissionRate === "" || commissionRate === null ? null : Number(commissionRate);
    const shop = await storage.updateShop(req.params.id, { commissionRate: val as any });
    res.json(shop);
  });

  // Payouts: per-shop financial summary
  app.get("/api/admin/payouts", requireRole("admin"), async (req, res) => {
    const allOrders = await storage.getAllOrders();
    const allShops = await storage.getShops();
    const settings = await storage.getSettings();
    const globalRate = settings ? Number(settings.commissionRate) : 10;

    const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s]));

    const byShop: Record<string, { shopId: string; shopName: string; commissionRate: number; orderCount: number; revenue: number; commission: number; payout: number }> = {};

    for (const o of allOrders) {
      if (o.status === "cancelled") continue;
      const shop = shopMap[o.shopId];
      if (!shop) continue;
      const rate = shop.commissionRate != null ? Number(shop.commissionRate) : globalRate;
      if (!byShop[o.shopId]) {
        byShop[o.shopId] = { shopId: o.shopId, shopName: shop.name, commissionRate: rate, orderCount: 0, revenue: 0, commission: 0, payout: 0 };
      }
      const entry = byShop[o.shopId];
      const amount = Number(o.totalAmount) - Number(o.deliveryCost || 0);
      entry.orderCount++;
      entry.revenue += Number(o.totalAmount);
      entry.commission += Number(o.platformCommission || 0);
    }

    for (const entry of Object.values(byShop)) {
      entry.payout = Math.round((entry.revenue - entry.commission) * 100) / 100;
      entry.revenue = Math.round(entry.revenue * 100) / 100;
      entry.commission = Math.round(entry.commission * 100) / 100;
    }

    res.json(Object.values(byShop).sort((a, b) => b.revenue - a.revenue));
  });

  // Financial analytics with filters
  app.get("/api/admin/financial-analytics", requireRole("admin"), async (req, res) => {
    const { shopId, period } = req.query as { shopId?: string; period?: string };
    const allOrders = await storage.getAllOrders();
    const allShops = await storage.getShops();
    const shopMap = Object.fromEntries(allShops.map((s) => [s.id, s.name]));

    const now = new Date();
    let since: Date | null = null;
    if (period === "week") since = new Date(now.getTime() - 7 * 86400000);
    else if (period === "month") since = new Date(now.getTime() - 30 * 86400000);
    else if (period === "quarter") since = new Date(now.getTime() - 90 * 86400000);
    else if (period === "year") since = new Date(now.getTime() - 365 * 86400000);

    let filtered = allOrders.filter((o) => o.status !== "cancelled");
    if (shopId && shopId !== "all") filtered = filtered.filter((o) => o.shopId === shopId);
    if (since) filtered = filtered.filter((o) => o.createdAt && new Date(o.createdAt) >= since!);

    const totalRevenue = filtered.reduce((s, o) => s + Number(o.totalAmount), 0);
    const totalCommission = filtered.reduce((s, o) => s + Number(o.platformCommission || 0), 0);
    const totalPayout = totalRevenue - totalCommission;

    // Daily breakdown
    const dailyMap: Record<string, { date: string; revenue: number; commission: number; payout: number; orders: number }> = {};
    for (const o of filtered) {
      if (!o.createdAt) continue;
      const day = new Date(o.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, commission: 0, payout: 0, orders: 0 };
      dailyMap[day].revenue += Number(o.totalAmount);
      dailyMap[day].commission += Number(o.platformCommission || 0);
      dailyMap[day].orders++;
    }
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).map((d) => ({
      ...d,
      revenue: Math.round(d.revenue),
      commission: Math.round(d.commission),
      payout: Math.round(d.revenue - d.commission),
    }));

    // Per-shop breakdown (for "all shops" view)
    const perShop: Record<string, { shopId: string; shopName: string; revenue: number; commission: number; payout: number; orders: number }> = {};
    for (const o of filtered) {
      if (!perShop[o.shopId]) perShop[o.shopId] = { shopId: o.shopId, shopName: shopMap[o.shopId] || "Неизвестный", revenue: 0, commission: 0, payout: 0, orders: 0 };
      perShop[o.shopId].revenue += Number(o.totalAmount);
      perShop[o.shopId].commission += Number(o.platformCommission || 0);
      perShop[o.shopId].orders++;
    }
    for (const e of Object.values(perShop)) {
      e.payout = Math.round((e.revenue - e.commission) * 100) / 100;
      e.revenue = Math.round(e.revenue * 100) / 100;
      e.commission = Math.round(e.commission * 100) / 100;
    }

    res.json({
      totalRevenue: Math.round(totalRevenue),
      totalCommission: Math.round(totalCommission),
      totalPayout: Math.round(totalPayout),
      orderCount: filtered.length,
      daily,
      perShop: Object.values(perShop).sort((a, b) => b.revenue - a.revenue),
    });
  });

  app.get("/api/shops/:id/owner", requireAuth, async (req, res) => {
    const shop = await storage.getShop(req.params.id);
    if (!shop) return res.status(404).json({ error: "Shop not found" });
    res.json({ ownerId: shop.ownerId });
  });

  return httpServer;
}
