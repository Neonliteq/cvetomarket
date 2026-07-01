import {
  type User, type InsertUser,
  type Shop, type InsertShop,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type OrderItem, type InsertOrderItem,
  type Review, type InsertReview,
  type Message, type InsertMessage,
  type Category, type InsertCategory,
  type City, type InsertCity,
  type PlatformSettings,
  type ShopWorker,
  type Notification, type InsertNotification,
  type BonusTransaction, type InsertBonusTransaction,
  type OrderSupplement, type InsertOrderSupplement,
  type PromoCode, type InsertPromoCode,
  type PushSubscription as PushSub, type InsertPushSubscription,
  type NotificationPreferences,
  type PushDeliveryFailure,
  type PageView, type AnalyticsEvent,
  users, shops, products, orders, orderItems, reviews, messages, categories, cities, platformSettings, shopWorkers, notifications, bonusTransactions, orderSupplements, promoCodes, pushSubscriptions, notificationPreferences, pushDeliveryFailures, pageViews, analyticsEvents,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, inArray, sql } from "drizzle-orm";

export type CRMSegment = "new" | "active" | "vip" | "churned";
export type CRMCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  bonusBalance: number;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
  segment: CRMSegment;
  city: string | null;
  adminNotes: string | null;
  createdAt: Date | null;
};

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByVkId(vkId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Shops
  getShop(id: string): Promise<Shop | undefined>;
  getShopByOwnerId(ownerId: string): Promise<Shop | undefined>;
  getShopForUser(userId: string): Promise<Shop | undefined>;
  getShops(): Promise<Shop[]>;
  getApprovedShops(): Promise<Shop[]>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: string, data: Partial<Shop>): Promise<Shop | undefined>;
  deleteShop(id: string): Promise<void>;

  // Shop Workers
  getShopWorkers(shopId: string): Promise<(ShopWorker & { user?: User })[]>;
  addShopWorker(shopId: string, userId: string): Promise<ShopWorker>;
  removeShopWorker(shopId: string, userId: string): Promise<void>;
  isShopWorker(shopId: string, userId: string): Promise<boolean>;

  // Products
  getProduct(id: string): Promise<Product | undefined>;
  getProducts(): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProductsByShop(shopId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  getFeaturedProducts(): Promise<Product[]>;

  // Orders
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: number): Promise<Order | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<Order[]>;
  getOrdersByShop(shopId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, assemblyPhotoUrl?: string): Promise<Order | undefined>;
  updatePaymentStatus(id: string, paymentStatus: string, paymentId?: string): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  getOrderItemsByOrderIds(orderIds: string[]): Promise<OrderItem[]>;
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;

  // Reviews
  getReviewsByProduct(productId: string): Promise<Review[]>;
  getReviewsByShop(shopId: string): Promise<Review[]>;
  getReviewByOrder(orderId: string): Promise<Review | undefined>;
  getReviewsByOrder(orderId: string): Promise<Review[]>;
  getReviewsByBuyer(buyerId: string): Promise<Review[]>;
  getAllReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  deleteReview(id: string): Promise<void>;
  updateReviewStatus(id: string, status: string): Promise<Review>;
  setShopFeatured(id: string, isFeatured: boolean): Promise<void>;
  setProductFeatured(id: string, isFeatured: boolean): Promise<void>;

  // Messages
  getMessages(userId1: string, userId2: string): Promise<Message[]>;
  getConversations(userId: string): Promise<string[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesRead(senderId: string, receiverId: string): Promise<void>;

  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesWithProductCount(): Promise<(Category & { productCount: number })[]>;
  createCategory(cat: InsertCategory): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Cities
  getCities(): Promise<City[]>;
  createCity(city: InsertCity): Promise<City>;
  deleteCity(id: string): Promise<void>;

  // Platform Settings
  getSettings(): Promise<PlatformSettings | undefined>;

  // Notifications
  createNotification(data: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationsRead(userId: string): Promise<void>;
  deleteOldNotifications(userId: string): Promise<void>;

  // Telegram
  setTelegramChatId(userId: string, chatId: string | null): Promise<void>;
  updateTelegramLastNotifiedAt(userId: string): Promise<void>;

  // Max
  setMaxChatId(userId: string, chatId: string | null): Promise<void>;
  updateMaxLastNotifiedAt(userId: string): Promise<void>;
  updateSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings>;

  // Password Reset
  setPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  clearPasswordResetToken(userId: string): Promise<void>;

  // Bonuses
  getBonusBalance(userId: string): Promise<number>;
  getBonusTransactions(userId: string): Promise<BonusTransaction[]>;
  addBonusTransaction(userId: string, amount: number, reason: string, description: string, expiresAt?: Date): Promise<BonusTransaction>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getReferralCode(userId: string): Promise<string>;

  // CRM
  getCRMCustomers(): Promise<CRMCustomer[]>;
  updateUserAdminNotes(userId: string, notes: string): Promise<void>;

  // Order Supplements
  createOrderSupplement(data: InsertOrderSupplement): Promise<OrderSupplement>;
  getOrderSupplements(orderId: string): Promise<OrderSupplement[]>;
  getSupplementById(id: string): Promise<OrderSupplement | undefined>;
  getSupplementByNumber(supplementNumber: number): Promise<OrderSupplement | undefined>;
  updateSupplementStatus(id: string, status: string, paymentId?: string): Promise<OrderSupplement | undefined>;
  cancelSupplement(id: string): Promise<void>;

  // Promo Codes
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(data: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: string): Promise<void>;
  incrementPromoCodeUsage(id: string): Promise<void>;

  // Push Subscriptions
  upsertPushSubscription(data: InsertPushSubscription): Promise<PushSub>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSub[]>;
  deletePushSubscription(id: string): Promise<void>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<void>;
  deletePushSubscriptionByEndpointAndUser(endpoint: string, userId: string): Promise<void>;

  // Notification Preferences
  getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined>;
  upsertNotificationPreferences(userId: string, data: Partial<Pick<NotificationPreferences, 'notifyOrders' | 'notifyMessages'>>): Promise<NotificationPreferences>;

  // Push Delivery Failures
  recordPushDeliveryFailure(userId: string, endpoint: string, errorMessage: string): Promise<void>;
  getPushDeliveryFailures(sinceDate?: Date): Promise<PushDeliveryFailure[]>;

  // Analytics
  recordPageView(data: { sessionId: string; userId?: string; page: string; referrer?: string; deviceType: string; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null; durationSeconds?: number | null }): Promise<void>;
  recordAnalyticsEvent(data: { sessionId: string; userId?: string; eventName: string; properties?: Record<string, unknown>; page: string }): Promise<void>;
  getSiteAnalytics(since: Date): Promise<{
    totalViews: number;
    uniqueSessions: number;
    uniqueUsers: number;
    topPages: { page: string; views: number }[];
    deviceBreakdown: { deviceType: string; count: number }[];
    topEvents: { eventName: string; count: number }[];
    dailyViews: { date: string; views: number; sessions: number }[];
    avgSessionDuration: number;
    medianSessionDuration: number;
    bounceRate: number;
    funnelSteps: { step: string; label: string; sessions: number }[];
    topSearchQueries: { query: string; count: number; noResultsCount: number }[];
    utmBreakdown: { utmSource: string; utmMedium: string | null; utmCampaign: string | null; sessions: number; views: number }[];
    abandonedCarts: number;
    abandonedCartUsers: number;
    topProducts: { productId: string; productName: string; views: number; cartAdds: number; conversionPct: number }[];
    topByConversion: { productId: string; productName: string; views: number; cartAdds: number; conversionPct: number }[];
    topShops: { shopId: string; shopName: string; views: number }[];
  }>;
}

export class DbStorage implements IStorage {
  async getUser(id: string) {
    const [u] = await db.select().from(users).where(eq(users.id, id));
    return u;
  }
  async getUserByEmail(email: string) {
    const [u] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    return u;
  }
  async getUserByVkId(vkId: string) {
    const [u] = await db.select().from(users).where(eq(users.vkId, vkId));
    return u;
  }
  async createUser(data: InsertUser) {
    const [u] = await db.insert(users).values(data).returning();
    return u;
  }
  async updateUser(id: string, data: Partial<User>) {
    const [u] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return u;
  }
  async deleteUser(id: string) {
    const userOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.buyerId, id));
    const orderIds = userOrders.map((o) => o.id);
    if (orderIds.length > 0) {
      await db.delete(messages).where(inArray(messages.orderId, orderIds));
      await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    }
    await db.delete(messages).where(or(eq(messages.senderId, id), eq(messages.receiverId, id)));
    await db.delete(reviews).where(eq(reviews.buyerId, id));
    await db.delete(orders).where(eq(orders.buyerId, id));
    await db.delete(shopWorkers).where(eq(shopWorkers.userId, id));
    await db.delete(bonusTransactions).where(eq(bonusTransactions.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
  async getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getShop(id: string) {
    const [s] = await db.select().from(shops).where(eq(shops.id, id));
    return s;
  }
  async getShopByOwnerId(ownerId: string) {
    const [s] = await db.select().from(shops).where(eq(shops.ownerId, ownerId));
    return s;
  }
  async getShopForUser(userId: string) {
    const owned = await this.getShopByOwnerId(userId);
    if (owned) return owned;
    const [worker] = await db.select().from(shopWorkers).where(eq(shopWorkers.userId, userId));
    if (!worker) return undefined;
    return this.getShop(worker.shopId);
  }
  async getShops() {
    return db.select().from(shops).orderBy(desc(shops.createdAt));
  }
  async getApprovedShops() {
    return db.select().from(shops).where(eq(shops.status, "approved")).orderBy(desc(shops.createdAt));
  }
  async createShop(data: InsertShop) {
    const [s] = await db.insert(shops).values(data).returning();
    return s;
  }
  async updateShop(id: string, data: Partial<Shop>) {
    const [s] = await db.update(shops).set(data).where(eq(shops.id, id)).returning();
    return s;
  }
  async deleteShop(id: string) {
    // Get all order IDs for this shop to cascade through related tables
    const shopOrders = await db.select({ id: orders.id }).from(orders).where(eq(orders.shopId, id));
    const orderIds = shopOrders.map((o) => o.id);

    if (orderIds.length > 0) {
      await db.delete(messages).where(inArray(messages.orderId, orderIds));
      await db.delete(orderItems).where(inArray(orderItems.orderId, orderIds));
    }

    await db.delete(reviews).where(eq(reviews.shopId, id));
    await db.delete(orders).where(eq(orders.shopId, id));
    await db.delete(products).where(eq(products.shopId, id));
    await db.delete(shopWorkers).where(eq(shopWorkers.shopId, id));
    await db.delete(shops).where(eq(shops.id, id));
  }

  async getShopWorkers(shopId: string) {
    const workers = await db.select().from(shopWorkers).where(eq(shopWorkers.shopId, shopId)).orderBy(shopWorkers.createdAt);
    const allUsers = await this.getAllUsers();
    const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u]));
    return workers.map((w) => ({ ...w, user: userMap[w.userId] }));
  }
  async addShopWorker(shopId: string, userId: string) {
    const [w] = await db.insert(shopWorkers).values({ shopId, userId }).returning();
    return w;
  }
  async removeShopWorker(shopId: string, userId: string) {
    await db.delete(shopWorkers).where(and(eq(shopWorkers.shopId, shopId), eq(shopWorkers.userId, userId)));
  }
  async isShopWorker(shopId: string, userId: string) {
    const [w] = await db.select().from(shopWorkers).where(and(eq(shopWorkers.shopId, shopId), eq(shopWorkers.userId, userId)));
    return !!w;
  }

  async getProduct(id: string) {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }
  async getProducts() {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }
  async getAllProducts() {
    return db.select().from(products).orderBy(desc(products.createdAt));
  }
  async getProductsByShop(shopId: string) {
    return db.select().from(products).where(eq(products.shopId, shopId)).orderBy(desc(products.createdAt));
  }
  async createProduct(data: InsertProduct) {
    const [p] = await db.insert(products).values(data).returning();
    return p;
  }
  async updateProduct(id: string, data: Partial<Product>) {
    const [p] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return p;
  }
  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
  }
  async getFeaturedProducts() {
    return db.select().from(products)
      .where(and(eq(products.isActive, true), eq(products.inStock, true)))
      .orderBy(desc(products.reviewCount))
      .limit(12);
  }

  async getOrder(id: string) {
    const [o] = await db.select().from(orders).where(eq(orders.id, id));
    return o;
  }
  async getOrderByNumber(orderNumber: number) {
    const [o] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return o;
  }
  async updatePaymentStatus(id: string, paymentStatus: string, paymentId?: string) {
    const update: any = { paymentStatus };
    if (paymentId !== undefined) update.paymentId = paymentId;
    const [o] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return o;
  }
  async getOrdersByBuyer(buyerId: string) {
    return db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
  }
  async getOrdersByShop(shopId: string) {
    return db.select().from(orders).where(eq(orders.shopId, shopId)).orderBy(desc(orders.createdAt));
  }
  async getAllOrders() {
    return db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  async createOrder(data: InsertOrder) {
    const [o] = await db.insert(orders).values(data).returning();
    return o;
  }
  async updateOrderStatus(id: string, status: string, assemblyPhotoUrl?: string) {
    const update: any = { status };
    if (assemblyPhotoUrl !== undefined) update.assemblyPhotoUrl = assemblyPhotoUrl;
    if (status === "assembling") update.buyerPhotoApproval = "pending";
    if (status === "confirmed") { update.buyerPhotoApproval = null; update.assemblyPhotoUrl = null; }
    const [o] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return o;
  }
  async updateOrderPhotoApproval(id: string, approval: "approved" | "rejected") {
    const update: any = { buyerPhotoApproval: approval };
    if (approval === "rejected") { update.status = "confirmed"; update.assemblyPhotoUrl = null; update.buyerPhotoApproval = null; }
    const [o] = await db.update(orders).set(update).where(eq(orders.id, id)).returning();
    return o;
  }

  async getOrderItems(orderId: string) {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
  async getOrderItemsByOrderIds(orderIds: string[]) {
    if (!orderIds.length) return [];
    const { inArray } = await import("drizzle-orm");
    return db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
  }
  async createOrderItems(items: InsertOrderItem[]) {
    if (!items.length) return [];
    return db.insert(orderItems).values(items).returning();
  }

  async getReviewsByProduct(productId: string) {
    return db.select().from(reviews).where(and(eq(reviews.productId, productId), eq(reviews.status, "approved"))).orderBy(desc(reviews.createdAt));
  }
  async getReviewsByShop(shopId: string) {
    return db.select().from(reviews).where(and(eq(reviews.shopId, shopId), eq(reviews.status, "approved"))).orderBy(desc(reviews.createdAt));
  }
  async getReviewByOrder(orderId: string) {
    const [r] = await db.select().from(reviews).where(and(eq(reviews.orderId, orderId), sql`${reviews.productId} IS NULL`));
    return r;
  }
  async getReviewsByOrder(orderId: string) {
    return db.select().from(reviews).where(eq(reviews.orderId, orderId)).orderBy(desc(reviews.createdAt));
  }
  async getReviewsByBuyer(buyerId: string) {
    return db.select().from(reviews).where(eq(reviews.buyerId, buyerId)).orderBy(desc(reviews.createdAt));
  }
  async getAllReviews() {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }
  async createReview(data: InsertReview) {
    const [r] = await db.insert(reviews).values(data).returning();
    return r;
  }
  async deleteReview(id: string) {
    await db.delete(reviews).where(eq(reviews.id, id));
  }
  async updateReviewStatus(id: string, status: string) {
    const [r] = await db.update(reviews).set({ status }).where(eq(reviews.id, id)).returning();
    return r;
  }
  async setShopFeatured(id: string, isFeatured: boolean) {
    await db.update(shops).set({ isFeatured }).where(eq(shops.id, id));
  }
  async setProductFeatured(id: string, isFeatured: boolean) {
    await db.update(products).set({ isFeatured }).where(eq(products.id, id));
  }

  async getMessages(userId1: string, userId2: string) {
    return db.select().from(messages).where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
      )
    ).orderBy(messages.createdAt);
  }
  async getConversations(userId: string) {
    const sent = await db.select({ id: messages.receiverId }).from(messages).where(eq(messages.senderId, userId));
    const received = await db.select({ id: messages.senderId }).from(messages).where(eq(messages.receiverId, userId));
    const ids = [...new Set([...sent.map((m) => m.id), ...received.map((m) => m.id)])];
    return ids;
  }
  async createMessage(data: InsertMessage) {
    const [m] = await db.insert(messages).values(data).returning();
    return m;
  }
  async markMessagesRead(senderId: string, receiverId: string) {
    await db.update(messages).set({ isRead: true }).where(
      and(eq(messages.senderId, senderId), eq(messages.receiverId, receiverId))
    );
  }

  async getCategories() {
    return db.select().from(categories).orderBy(categories.name);
  }
  async getCategoriesWithProductCount() {
    const rows = await db
      .select({
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
        productCount: sql<number>`COALESCE(COUNT(${products.id}), 0)`,
      })
      .from(categories)
      .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.isActive, true), eq(products.inStock, true)))
      .groupBy(categories.id, categories.name, categories.slug)
      .orderBy(sql`COUNT(${products.id}) DESC`, categories.name);
    return rows as (Category & { productCount: number })[];
  }
  async createCategory(data: InsertCategory) {
    const [c] = await db.insert(categories).values(data).returning();
    return c;
  }
  async deleteCategory(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCities() {
    return db.select().from(cities).orderBy(cities.name);
  }
  async createCity(data: InsertCity) {
    const [c] = await db.insert(cities).values(data).returning();
    return c;
  }
  async deleteCity(id: string) {
    await db.delete(cities).where(eq(cities.id, id));
  }

  async getSettings() {
    const [s] = await db.select().from(platformSettings).where(eq(platformSettings.id, "global"));
    return s;
  }
  async updateSettings(data: Partial<PlatformSettings>) {
    const existing = await this.getSettings();
    if (existing) {
      const [s] = await db.update(platformSettings).set(data).where(eq(platformSettings.id, "global")).returning();
      return s;
    } else {
      const [s] = await db.insert(platformSettings).values({ ...data, id: "global" }).returning();
      return s;
    }
  }

  async createNotification(data: InsertNotification) {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  }
  async getUserNotifications(userId: string) {
    return db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }
  async markNotificationsRead(userId: string) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
  }
  async deleteOldNotifications(userId: string) {
    await db.delete(notifications).where(and(eq(notifications.userId, userId), eq(notifications.isRead, true)));
  }

  async setTelegramChatId(userId: string, chatId: string | null) {
    await db.update(users).set({ telegramChatId: chatId } as any).where(eq(users.id, userId));
  }

  async updateTelegramLastNotifiedAt(userId: string) {
    await db.update(users).set({ telegramLastNotifiedAt: new Date() } as any).where(eq(users.id, userId));
  }

  async setMaxChatId(userId: string, chatId: string | null) {
    await db.update(users).set({ maxChatId: chatId } as any).where(eq(users.id, userId));
  }

  async updateMaxLastNotifiedAt(userId: string) {
    await db.update(users).set({ maxLastNotifiedAt: new Date() } as any).where(eq(users.id, userId));
  }

  async setPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    await db.update(users).set({ passwordResetToken: token, passwordResetTokenExpiresAt: expiresAt } as any).where(eq(users.id, userId));
  }
  async getUserByResetToken(token: string) {
    const [u] = await db.select().from(users).where(eq(users.passwordResetToken as any, token));
    return u;
  }
  async updateUserPassword(userId: string, hashedPassword: string) {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, userId));
  }
  async clearPasswordResetToken(userId: string) {
    await db.update(users).set({ passwordResetToken: null, passwordResetTokenExpiresAt: null } as any).where(eq(users.id, userId));
  }

  async getBonusBalance(userId: string): Promise<number> {
    const now = new Date();
    const txns = await db.select().from(bonusTransactions).where(eq(bonusTransactions.userId, userId));
    let balance = 0;
    for (const t of txns) {
      if (t.amount > 0 && t.expiresAt && new Date(t.expiresAt) < now) continue;
      balance += t.amount;
    }
    return Math.max(0, balance);
  }

  async getBonusTransactions(userId: string): Promise<BonusTransaction[]> {
    return db.select().from(bonusTransactions).where(eq(bonusTransactions.userId, userId)).orderBy(desc(bonusTransactions.createdAt));
  }

  async addBonusTransaction(userId: string, amount: number, reason: string, description: string, expiresAt?: Date): Promise<BonusTransaction> {
    const exp = expiresAt || (amount > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined);
    const [t] = await db.insert(bonusTransactions).values({
      userId, amount, reason, description, expiresAt: exp || null,
    }).returning();
    const newBalance = await this.getBonusBalance(userId);
    await db.update(users).set({ bonusBalance: newBalance }).where(eq(users.id, userId));
    return t;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [u] = await db.select().from(users).where(eq(users.referralCode as any, code));
    return u;
  }

  async getReferralCode(userId: string): Promise<string> {
    const user = await this.getUser(userId);
    if (user && (user as any).referralCode) return (user as any).referralCode;
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let attempt = 0; attempt < 5; attempt++) {
      let code = "";
      for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
      try {
        await db.update(users).set({ referralCode: code } as any).where(eq(users.id, userId));
        return code;
      } catch (e: any) {
        if (e.code === "23505" && attempt < 4) continue;
        throw e;
      }
    }
    throw new Error("Failed to generate unique referral code");
  }

  async getCRMCustomers(): Promise<CRMCustomer[]> {
    const buyers = await db.select().from(users).where(eq(users.role, "buyer")).orderBy(desc(users.createdAt));
    const allOrders = await db.select().from(orders);
    const now = Date.now();
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    return buyers.map((u) => {
      const userOrders = allOrders.filter((o) => o.buyerId === u.id && o.status !== "cancelled");
      const orderCount = userOrders.length;
      const totalSpent = userOrders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0);
      const lastOrderAt = userOrders.length > 0
        ? userOrders.reduce<Date | null>((latest, o) => {
            if (!o.createdAt) return latest;
            const d = new Date(o.createdAt);
            return !latest || d > latest ? d : latest;
          }, null)
        : null;
      const registeredDaysAgo = u.createdAt ? now - new Date(u.createdAt).getTime() : Infinity;
      const lastOrderAge = lastOrderAt ? now - lastOrderAt.getTime() : Infinity;

      let segment: CRMSegment;
      if (totalSpent > 10000) {
        segment = "vip";
      } else if ((orderCount === 0 || orderCount === 1) && registeredDaysAgo < thirtyDays) {
        segment = "new";
      } else if (orderCount >= 2 && lastOrderAge <= sixtyDays) {
        segment = "active";
      } else {
        segment = "churned";
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? null,
        bonusBalance: u.bonusBalance ?? 0,
        orderCount,
        totalSpent,
        lastOrderAt,
        segment,
        city: u.buyerCity ?? null,
        adminNotes: u.adminNotes ?? null,
        createdAt: u.createdAt,
      };
    });
  }

  async updateUserAdminNotes(userId: string, notes: string): Promise<void> {
    await db.update(users).set({ adminNotes: notes }).where(eq(users.id, userId));
  }

  async createOrderSupplement(data: InsertOrderSupplement): Promise<OrderSupplement> {
    const [s] = await db.insert(orderSupplements).values(data).returning();
    return s;
  }

  async getSupplementById(id: string): Promise<OrderSupplement | undefined> {
    const [s] = await db.select().from(orderSupplements).where(eq(orderSupplements.id, id));
    return s;
  }

  async getOrderSupplements(orderId: string): Promise<OrderSupplement[]> {
    return db.select().from(orderSupplements)
      .where(eq(orderSupplements.orderId, orderId))
      .orderBy(desc(orderSupplements.createdAt));
  }

  async getSupplementByNumber(supplementNumber: number): Promise<OrderSupplement | undefined> {
    const [s] = await db.select().from(orderSupplements)
      .where(eq(orderSupplements.supplementNumber, supplementNumber));
    return s;
  }

  async updateSupplementStatus(id: string, status: string, paymentId?: string): Promise<OrderSupplement | undefined> {
    const update: any = { status };
    if (paymentId) update.paymentId = paymentId;
    const [s] = await db.update(orderSupplements).set(update).where(eq(orderSupplements.id, id)).returning();
    return s;
  }

  async cancelSupplement(id: string): Promise<void> {
    await db.update(orderSupplements).set({ status: "cancelled" }).where(eq(orderSupplements.id, id));
  }

  async getAllPromoCodes(): Promise<PromoCode[]> {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [p] = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
    return p;
  }

  async createPromoCode(data: InsertPromoCode): Promise<PromoCode> {
    const [p] = await db.insert(promoCodes).values({ ...data, code: data.code.toUpperCase() }).returning();
    return p;
  }

  async updatePromoCode(id: string, data: Partial<PromoCode>): Promise<PromoCode | undefined> {
    const [p] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return p;
  }

  async deletePromoCode(id: string): Promise<void> {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  }

  async incrementPromoCodeUsage(id: string): Promise<void> {
    await db.update(promoCodes).set({ usedCount: sql`used_count + 1` }).where(eq(promoCodes.id, id));
  }

  async upsertPushSubscription(data: InsertPushSubscription): Promise<PushSub> {
    const [existing] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, data.endpoint));
    if (existing) {
      const [updated] = await db.update(pushSubscriptions).set({ p256dh: data.p256dh, auth: data.auth, userId: data.userId }).where(eq(pushSubscriptions.endpoint, data.endpoint)).returning();
      return updated;
    }
    const [inserted] = await db.insert(pushSubscriptions).values(data).returning();
    return inserted;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSub[]> {
    return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(id: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionByEndpointAndUser(endpoint: string, userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(
      and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId))
    );
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | undefined> {
    const [row] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return row;
  }

  async upsertNotificationPreferences(userId: string, data: Partial<Pick<NotificationPreferences, 'notifyOrders' | 'notifyMessages'>>): Promise<NotificationPreferences> {
    const existing = await this.getNotificationPreferences(userId);
    if (existing) {
      const [updated] = await db
        .update(notificationPreferences)
        .set(data)
        .where(eq(notificationPreferences.userId, userId))
        .returning();
      return updated;
    }
    const [inserted] = await db
      .insert(notificationPreferences)
      .values({ userId, notifyOrders: true, notifyMessages: true, ...data })
      .returning();
    return inserted;
  }

  async recordPushDeliveryFailure(userId: string, endpoint: string, errorMessage: string): Promise<void> {
    await db
      .insert(pushDeliveryFailures)
      .values({ userId, endpoint, failureCount: 1, lastError: errorMessage, lastFailedAt: new Date() })
      .onConflictDoUpdate({
        target: pushDeliveryFailures.endpoint,
        set: {
          userId,
          failureCount: sql`${pushDeliveryFailures.failureCount} + 1`,
          lastError: errorMessage,
          lastFailedAt: new Date(),
        },
      });
  }

  async getPushDeliveryFailures(sinceDate?: Date): Promise<PushDeliveryFailure[]> {
    if (sinceDate) {
      return db.select().from(pushDeliveryFailures)
        .where(sql`${pushDeliveryFailures.lastFailedAt} >= ${sinceDate}`)
        .orderBy(desc(pushDeliveryFailures.failureCount));
    }
    return db.select().from(pushDeliveryFailures).orderBy(desc(pushDeliveryFailures.failureCount));
  }

  async recordPageView(data: { sessionId: string; userId?: string; page: string; referrer?: string; deviceType: string; utmSource?: string | null; utmMedium?: string | null; utmCampaign?: string | null; durationSeconds?: number | null }): Promise<void> {
    await db.insert(pageViews).values({
      sessionId: data.sessionId,
      userId: data.userId ?? null,
      page: data.page,
      referrer: data.referrer ?? null,
      deviceType: data.deviceType,
      utmSource: data.utmSource ?? null,
      utmMedium: data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
      durationSeconds: data.durationSeconds ?? null,
    });
  }

  async recordAnalyticsEvent(data: { sessionId: string; userId?: string; eventName: string; properties?: Record<string, unknown>; page: string }): Promise<void> {
    await db.insert(analyticsEvents).values({
      sessionId: data.sessionId,
      userId: data.userId ?? null,
      eventName: data.eventName,
      properties: data.properties ?? {},
      page: data.page,
    });
  }

  async getSiteAnalytics(since: Date) {
    const [totalViewsRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since}`);

    const [uniqueSessionsRow] = await db
      .select({ count: sql<number>`count(distinct ${pageViews.sessionId})::int` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since}`);

    const [uniqueUsersRow] = await db
      .select({ count: sql<number>`count(distinct ${pageViews.userId})::int` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since} and ${pageViews.userId} is not null`);

    const topPages = await db
      .select({ page: pageViews.page, views: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since}`)
      .groupBy(pageViews.page)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const deviceBreakdown = await db
      .select({ deviceType: pageViews.deviceType, count: sql<number>`count(*)::int` })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since}`)
      .groupBy(pageViews.deviceType);

    const topEvents = await db
      .select({ eventName: analyticsEvents.eventName, count: sql<number>`count(*)::int` })
      .from(analyticsEvents)
      .where(sql`${analyticsEvents.createdAt} >= ${since}`)
      .groupBy(analyticsEvents.eventName)
      .orderBy(sql`count(*) desc`)
      .limit(10);

    const dailyViews = await db
      .select({
        date: sql<string>`date_trunc('day', ${pageViews.createdAt})::date::text`,
        views: sql<number>`count(*)::int`,
        sessions: sql<number>`count(distinct ${pageViews.sessionId})::int`,
      })
      .from(pageViews)
      .where(sql`${pageViews.createdAt} >= ${since}`)
      .groupBy(sql`date_trunc('day', ${pageViews.createdAt})`)
      .orderBy(sql`date_trunc('day', ${pageViews.createdAt})`);

    // --- Session duration: avg + median ---
    const [durationRow] = await db.execute(sql`
      SELECT
        round(avg(duration_seconds))::int AS avg_dur,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_seconds)::int AS median_dur
      FROM page_views
      WHERE created_at >= ${since} AND duration_seconds IS NOT NULL AND duration_seconds > 0
    `);
    const avgSessionDuration = Number((durationRow as any)?.avg_dur ?? 0);
    const medianSessionDuration = Number((durationRow as any)?.median_dur ?? 0);

    // --- Bounce rate: sessions with only 1 page view ---
    const [bounceRow] = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE cnt = 1)::int AS bounced,
        count(*)::int AS total
      FROM (
        SELECT session_id, count(*) AS cnt
        FROM page_views
        WHERE created_at >= ${since}
        GROUP BY session_id
      ) s
    `);
    const bounced = Number((bounceRow as any)?.bounced ?? 0);
    const totalSessions = Number((bounceRow as any)?.total ?? 1);
    const bounceRate = totalSessions > 0 ? Math.round((bounced / totalSessions) * 100) : 0;

    // --- Funnel analysis ---
    const funnelData = await db.execute(sql`
      SELECT
        count(distinct CASE WHEN page = '/catalog' THEN session_id END)::int AS catalog,
        count(distinct CASE WHEN page LIKE '/product/%' THEN session_id END)::int AS product,
        count(distinct CASE WHEN page = '/cart' THEN session_id END)::int AS cart,
        count(distinct CASE WHEN page = '/checkout' THEN session_id END)::int AS checkout_page
      FROM page_views
      WHERE created_at >= ${since}
    `);
    const funnel = (funnelData as any[])[0] ?? {};
    const [ordersRow] = await db.execute(sql`
      SELECT count(distinct ae.session_id)::int AS placed
      FROM analytics_events ae
      WHERE ae.created_at >= ${since} AND ae.event_name = 'checkout_complete'
    `);
    const funnelSteps = [
      { step: "catalog", label: "Каталог", sessions: Number(funnel.catalog ?? 0) },
      { step: "product", label: "Товар", sessions: Number(funnel.product ?? 0) },
      { step: "cart", label: "Корзина", sessions: Number(funnel.cart ?? 0) },
      { step: "checkout", label: "Оформление", sessions: Number(funnel.checkout_page ?? 0) },
      { step: "checkout_complete", label: "Заказ", sessions: Number((ordersRow as any)?.placed ?? 0) },
    ];

    // --- Top search queries with no-results count ---
    const searchRows = await db.execute(sql`
      SELECT
        (properties->>'query') AS query,
        count(*)::int AS count,
        count(*) FILTER (WHERE (properties->>'hasResults')::boolean = false)::int AS no_results_count
      FROM analytics_events
      WHERE created_at >= ${since} AND event_name = 'search_query' AND properties->>'query' IS NOT NULL
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10
    `);
    const topSearchQueries = (searchRows as any[]).map((r: any) => ({
      query: r.query as string,
      count: Number(r.count),
      noResultsCount: Number(r.no_results_count ?? 0),
    }));

    // --- UTM breakdown: source + medium + campaign ---
    const utmRows = await db.execute(sql`
      SELECT
        utm_source,
        utm_medium,
        utm_campaign,
        count(distinct session_id)::int AS sessions,
        count(*)::int AS views
      FROM page_views
      WHERE created_at >= ${since} AND utm_source IS NOT NULL
      GROUP BY utm_source, utm_medium, utm_campaign
      ORDER BY sessions DESC
      LIMIT 20
    `);
    const utmBreakdown = (utmRows as any[]).map((r: any) => ({
      utmSource: r.utm_source as string,
      utmMedium: (r.utm_medium ?? null) as string | null,
      utmCampaign: (r.utm_campaign ?? null) as string | null,
      sessions: Number(r.sessions),
      views: Number(r.views),
    }));

    // --- Abandoned carts: sessions + unique users ---
    const [abandonedRow] = await db.execute(sql`
      SELECT
        count(distinct ae.session_id)::int AS sessions,
        count(distinct ae.user_id)::int AS users
      FROM analytics_events ae
      WHERE ae.created_at >= ${since} AND ae.event_name = 'cart_add'
        AND ae.session_id NOT IN (
          SELECT DISTINCT session_id FROM analytics_events
          WHERE created_at >= ${since} AND event_name = 'checkout_complete'
        )
    `);
    const abandonedCarts = Number((abandonedRow as any)?.sessions ?? 0);
    const abandonedCartUsers = Number((abandonedRow as any)?.users ?? 0);

    // --- Top products by views with cart conversion + top by conversion ---
    const productViewRows = await db.execute(sql`
      WITH views AS (
        SELECT
          (properties->>'productId') AS product_id,
          max(properties->>'productName') AS product_name,
          count(*)::int AS views
        FROM analytics_events
        WHERE created_at >= ${since} AND event_name = 'product_view' AND properties->>'productId' IS NOT NULL
        GROUP BY product_id
      ),
      cart_adds AS (
        SELECT (properties->>'productId') AS product_id, count(*)::int AS cart_adds
        FROM analytics_events
        WHERE created_at >= ${since} AND event_name = 'cart_add' AND properties->>'productId' IS NOT NULL
        GROUP BY product_id
      )
      SELECT
        v.product_id, v.product_name, v.views,
        coalesce(c.cart_adds, 0) AS cart_adds,
        CASE WHEN v.views > 0 THEN round((coalesce(c.cart_adds, 0)::numeric / v.views) * 100, 1) ELSE 0 END AS conv_pct
      FROM views v
      LEFT JOIN cart_adds c ON c.product_id = v.product_id
      ORDER BY v.views DESC
      LIMIT 10
    `);
    const topProducts = (productViewRows as any[]).map((r: any) => ({
      productId: r.product_id as string,
      productName: (r.product_name ?? r.product_id) as string,
      views: Number(r.views),
      cartAdds: Number(r.cart_adds),
      conversionPct: Number(r.conv_pct ?? 0),
    }));

    // Top by conversion (min 3 views, sorted by conv pct)
    const topByConversion = [...topProducts]
      .filter((p) => p.views >= 3)
      .sort((a, b) => b.conversionPct - a.conversionPct)
      .slice(0, 5);

    // --- Top shops by views ---
    const shopViewRows = await db.execute(sql`
      SELECT
        (properties->>'shopId') AS shop_id,
        max(properties->>'shopName') AS shop_name,
        count(*)::int AS views
      FROM analytics_events
      WHERE created_at >= ${since} AND event_name = 'shop_view' AND properties->>'shopId' IS NOT NULL
      GROUP BY shop_id
      ORDER BY views DESC
      LIMIT 10
    `);
    const topShops = (shopViewRows as any[]).map((r: any) => ({
      shopId: r.shop_id as string,
      shopName: (r.shop_name ?? r.shop_id) as string,
      views: Number(r.views),
    }));

    return {
      totalViews: totalViewsRow?.count ?? 0,
      uniqueSessions: uniqueSessionsRow?.count ?? 0,
      uniqueUsers: uniqueUsersRow?.count ?? 0,
      topPages,
      deviceBreakdown,
      topEvents,
      dailyViews,
      avgSessionDuration,
      medianSessionDuration,
      bounceRate,
      funnelSteps,
      topSearchQueries,
      utmBreakdown,
      abandonedCarts,
      abandonedCartUsers,
      topProducts,
      topByConversion,
      topShops,
    };
  }
}

export const storage = new DbStorage();
