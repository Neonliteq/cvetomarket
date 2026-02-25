import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("buyer"),
  isBlocked: boolean("is_blocked").default(false),
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
  deliveryZone: text("delivery_zone"),
  workingHours: text("working_hours"),
  status: text("status").notNull().default("pending"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  categoryId: varchar("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  images: text("images").array().default(sql`'{}'::text[]`),
  assemblyTime: integer("assembly_time").default(60),
  inStock: boolean("in_stock").default(true),
  isActive: boolean("is_active").default(true),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  shopId: varchar("shop_id").notNull().references(() => shops.id),
  status: text("status").notNull().default("new"),
  deliveryAddress: text("delivery_address").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  deliveryTime: text("delivery_time").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  comment: text("comment"),
  paymentMethod: text("payment_method").notNull().default("card"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  deliveryCost: decimal("delivery_cost", { precision: 10, scale: 2 }).default("300"),
  platformCommission: decimal("platform_commission", { precision: 10, scale: 2 }).default("0"),
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
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default("global"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("10"),
  deliveryCost: decimal("delivery_cost", { precision: 10, scale: 2 }).default("300"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, rating: true, reviewCount: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertCitySchema = createInsertSchema(cities).omit({ id: true });

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
