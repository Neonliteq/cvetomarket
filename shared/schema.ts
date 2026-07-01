import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password"),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("buyer"),
  isBlocked: boolean("is_blocked").default(false),
  avatarUrl: text("avatar_url"),
  reviewsSeenAt: timestamp("reviews_seen_at"),
  buyerCity: text("buyer_city"),
  telegramChatId: text("telegram_chat_id"),
  telegramLinkToken: text("telegram_link_token"),
  telegramLinkTokenExpiresAt: timestamp("telegram_link_token_expires_at"),
  maxChatId: text("max_chat_id"),
  maxLinkToken: text("max_link_token"),
  maxLinkTokenExpiresAt: timestamp("max_link_token_expires_at"),
  maxLastNotifiedAt: timestamp("max_last_notified_at"),
  telegramLastNotifiedAt: timestamp("telegram_last_notified_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetTokenExpiresAt: timestamp("password_reset_token_expires_at"),
  bonusBalance: integer("bonus_balance").default(0),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  adminNotes: text("admin_notes"),
  vkId: text("vk_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const shops = pgTable("shops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  cityId: varchar("city_id").references(() => cities.id),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  inn: text("inn"),
  ogrn: text("ogrn"),
  legalName: text("legal_name"),
  legalAddress: text("legal_address"),
  legalType: text("legal_type"),
  deliveryPrice: decimal("delivery_price", { precision: 10, scale: 2 }).default("300"),
  deliveryZone: text("delivery_zone"),
  deliveryZones: jsonb("delivery_zones").default([]),
  workingHours: text("working_hours"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("pending"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isFeatured: boolean("is_featured").default(false),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  categoryId: varchar("category_id").references(() => categories.id),
  type: text("type").notNull().default("bouquet"),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: text("images").array().default(sql`'{}'::text[]`),
  assemblyTime: integer("assembly_time").default(60),
  inStock: boolean("in_stock").default(true),
  isActive: boolean("is_active").default(true),
  composition: text("composition"),
  discountPercent: integer("discount_percent").default(0),
  isRecommended: boolean("is_recommended").default(false),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  isFeatured: boolean("is_featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: serial("order_number"),
  buyerId: varchar("buyer_id").references(() => users.id),
  guestEmail: text("guest_email"),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  status: text("status").notNull().default("new"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  deliveryTime: text("delivery_time").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  comment: text("comment"),
  paymentMethod: text("payment_method").notNull().default("card"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentId: text("payment_id"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryCost: decimal("delivery_cost", { precision: 10, scale: 2 }).default("300"),
  platformCommission: decimal("platform_commission", { precision: 10, scale: 2 }).default("0"),
  bonusUsed: integer("bonus_used").default(0),
  promoCode: text("promo_code"),
  promoDiscount: decimal("promo_discount", { precision: 10, scale: 2 }).default("0"),
  assemblyPhotoUrl: text("assembly_photo_url"),
  buyerPhotoApproval: text("buyer_photo_approval"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  productId: varchar("product_id").notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull().default(1),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  productId: varchar("product_id").references(() => products.id),
  rating: integer("rating").notNull(),
  ratingPrice: integer("rating_price"),
  ratingDelivery: integer("rating_delivery"),
  ratingService: integer("rating_service"),
  comment: text("comment"),
  status: varchar("status", { length: 20 }).notNull().default("approved"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").default(""),
  imageUrl: text("image_url"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const shopWorkers = pgTable("shop_workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default("global"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10"),
  deliveryCost: decimal("delivery_cost", { precision: 10, scale: 2 }).default("300"),
  pushRetryAttempts: integer("push_retry_attempts").default(2),
  pushRetryDelayMs: integer("push_retry_delay_ms").default(1000),
});

export const bonusTransactions = pgTable("bonus_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  description: text("description"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(),
  title: varchar("title").notNull(),
  text: text("text"),
  link: varchar("link"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("percent"),
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  notifyOrders: boolean("notify_orders").notNull().default(true),
  notifyMessages: boolean("notify_messages").notNull().default(true),
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({ id: true });
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;

export const orderSupplements = pgTable("order_supplements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplementNumber: serial("supplement_number"),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pageViews = pgTable("page_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  page: text("page").notNull(),
  referrer: text("referrer"),
  deviceType: text("device_type").notNull().default("desktop"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  durationSeconds: integer("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  eventName: text("event_name").notNull(),
  properties: jsonb("properties").default({}),
  page: text("page").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PageView = typeof pageViews.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

export const pushDeliveryFailures = pgTable("push_delivery_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  failureCount: integer("failure_count").notNull().default(1),
  lastError: text("last_error"),
  lastFailedAt: timestamp("last_failed_at").notNull().defaultNow(),
});

export type PushDeliveryFailure = typeof pushDeliveryFailures.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertCitySchema = createInsertSchema(cities).omit({ id: true });
export const insertShopWorkerSchema = createInsertSchema(shopWorkers).omit({ id: true, createdAt: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type ShopWorker = typeof shopWorkers.$inferSelect;
export type InsertShopWorker = z.infer<typeof insertShopWorkerSchema>;
export type Notification = typeof notifications.$inferSelect;
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type BonusTransaction = typeof bonusTransactions.$inferSelect;
export const insertBonusTransactionSchema = createInsertSchema(bonusTransactions).omit({ id: true, createdAt: true });
export type InsertBonusTransaction = z.infer<typeof insertBonusTransactionSchema>;
export type OrderSupplement = typeof orderSupplements.$inferSelect;
export const insertOrderSupplementSchema = createInsertSchema(orderSupplements).omit({ id: true, supplementNumber: true, createdAt: true });
export type InsertOrderSupplement = z.infer<typeof insertOrderSupplementSchema>;

export type PromoCode = typeof promoCodes.$inferSelect;
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, usedCount: true, createdAt: true });
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
