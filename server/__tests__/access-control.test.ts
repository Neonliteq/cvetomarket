/**
 * Access-control tests for:
 *  - PATCH /api/shops/:id         (routes.ts ~560)
 *  - PATCH /api/orders/:id/status (routes.ts ~982)
 *
 * Verifies:
 *  1. Shop owner can edit their own shop (200)
 *  2. Shop owner cannot edit another shop (403)
 *  3. Shop-role worker associated with shop A can update shop-A orders (200)
 *  4. Shop-role worker associated with shop A cannot update shop-B orders (403)
 *  5. Admin can edit any shop and update any order freely (200)
 */

import { vi, describe, it, expect, beforeAll } from "vitest";

// ── hoisted mock objects (accessible inside vi.mock factories) ────────────

const mockStorage = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  getUserByVkId: vi.fn().mockResolvedValue(undefined),
  getUserByReferralCode: vi.fn().mockResolvedValue(undefined),
  getUserByResetToken: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
  getAllUsers: vi.fn().mockResolvedValue([]),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),

  getShop: vi.fn(),
  getShopByOwnerId: vi.fn().mockResolvedValue(undefined),
  getShopForUser: vi.fn(),
  getShops: vi.fn().mockResolvedValue([]),
  getApprovedShops: vi.fn().mockResolvedValue([]),
  createShop: vi.fn(),
  updateShop: vi.fn(),
  deleteShop: vi.fn(),

  getShopWorkers: vi.fn().mockResolvedValue([]),
  addShopWorker: vi.fn(),
  removeShopWorker: vi.fn(),
  isShopWorker: vi.fn().mockResolvedValue(false),

  getProduct: vi.fn().mockResolvedValue(undefined),
  getProducts: vi.fn().mockResolvedValue([]),
  getAllProducts: vi.fn().mockResolvedValue([]),
  getProductsByShop: vi.fn().mockResolvedValue([]),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  getFeaturedProducts: vi.fn().mockResolvedValue([]),

  getOrder: vi.fn(),
  getOrderByNumber: vi.fn().mockResolvedValue(undefined),
  getOrdersByBuyer: vi.fn().mockResolvedValue([]),
  getOrdersByShop: vi.fn().mockResolvedValue([]),
  getAllOrders: vi.fn().mockResolvedValue([]),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  updatePaymentStatus: vi.fn(),
  updateOrderPhotoApproval: vi.fn().mockResolvedValue(undefined),

  getOrderItems: vi.fn().mockResolvedValue([]),
  getOrderItemsByOrderIds: vi.fn().mockResolvedValue([]),
  createOrderItems: vi.fn(),

  getReviewsByProduct: vi.fn().mockResolvedValue([]),
  getReviewsByShop: vi.fn().mockResolvedValue([]),
  getReviewByOrder: vi.fn().mockResolvedValue(undefined),
  getReviewsByOrder: vi.fn().mockResolvedValue([]),
  getReviewsByBuyer: vi.fn().mockResolvedValue([]),
  createReview: vi.fn(),
  deleteReview: vi.fn(),

  getMessages: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn(),

  getCities: vi.fn().mockResolvedValue([]),
  createCity: vi.fn(),
  deleteCity: vi.fn(),

  getCategories: vi.fn().mockResolvedValue([]),
  getCategoriesWithProductCount: vi.fn().mockResolvedValue([]),
  createCategory: vi.fn(),
  deleteCategory: vi.fn(),

  getSettings: vi.fn().mockResolvedValue(null),
  updateSettings: vi.fn(),

  getNotifications: vi.fn().mockResolvedValue([]),
  createNotification: vi.fn().mockResolvedValue(undefined),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),

  getBonusTransactions: vi.fn().mockResolvedValue([]),
  addBonusTransaction: vi.fn().mockResolvedValue(undefined),
  getBonusBalance: vi.fn().mockResolvedValue(0),

  getOrderSupplements: vi.fn().mockResolvedValue([]),
  createOrderSupplement: vi.fn(),
  updateOrderSupplement: vi.fn(),

  getPromoCodes: vi.fn().mockResolvedValue([]),
  getPromoCode: vi.fn().mockResolvedValue(undefined),
  getPromoCodeByCode: vi.fn().mockResolvedValue(undefined),
  createPromoCode: vi.fn(),
  updatePromoCode: vi.fn(),
  deletePromoCode: vi.fn(),
  usePromoCode: vi.fn(),

  getPushSubscriptions: vi.fn().mockResolvedValue([]),
  createPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  getPushSubscriptionsForUser: vi.fn().mockResolvedValue([]),

  getNotificationPreferences: vi.fn().mockResolvedValue(undefined),
  upsertNotificationPreferences: vi.fn(),

  getPushDeliveryFailures: vi.fn().mockResolvedValue([]),
  createPushDeliveryFailure: vi.fn(),
  deletePushDeliveryFailure: vi.fn(),
  clearPushDeliveryFailuresForSubscription: vi.fn(),

  getPageViews: vi.fn().mockResolvedValue([]),
  recordPageView: vi.fn(),
  getAnalyticsEvents: vi.fn().mockResolvedValue([]),
  recordAnalyticsEvent: vi.fn(),

  getCRMCustomers: vi.fn().mockResolvedValue([]),

  setPasswordResetToken: vi.fn(),
  clearPasswordResetToken: vi.fn(),
  updateUserPassword: vi.fn(),

  updateTelegramLastNotifiedAt: vi.fn(),
  updateMaxLastNotifiedAt: vi.fn(),

  getDeliveryZones: vi.fn().mockResolvedValue([]),
  createDeliveryZone: vi.fn(),
  updateDeliveryZone: vi.fn(),
  deleteDeliveryZone: vi.fn(),
}));

// ── module mocks ──────────────────────────────────────────────────────────

vi.mock("../storage", () => ({ storage: mockStorage }));

vi.mock("pg", () => ({
  Pool: class {
    query() { return Promise.resolve({ rows: [] }); }
    connect() { return Promise.resolve(); }
    end() { return Promise.resolve(); }
  },
}));

// Make connect-pg-simple return express-session's built-in MemoryStore so the
// session middleware starts without a real Postgres connection.
vi.mock("connect-pg-simple", async () => {
  const session = (await import("express-session")).default;
  return { default: () => session.MemoryStore };
});

vi.mock("../replit_integrations/object_storage", () => ({
  objectStorageClient: { bucket: vi.fn() },
  ObjectStorageService: class {
    getPrivateObjectDir() { return "/private"; }
  },
  registerObjectStorageRoutes: vi.fn(),
}));

vi.mock("../telegram", () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(false),
  generateLinkToken: vi.fn().mockResolvedValue("tok"),
  consumeLinkToken: vi.fn().mockResolvedValue(null),
  getBotUsername: vi.fn().mockResolvedValue("bot"),
  ORDER_STATUS_MESSAGES: {},
  registerWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../max", () => ({
  sendMaxMessage: vi.fn().mockResolvedValue(false),
  generateMaxLinkToken: vi.fn().mockResolvedValue("tok"),
  consumeMaxLinkToken: vi.fn().mockResolvedValue(null),
  getMaxBotNick: vi.fn().mockResolvedValue("bot"),
  ORDER_STATUS_MESSAGES_MAX: {},
  registerMaxWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../resend", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(false),
}));

vi.mock("../robokassa", () => ({
  buildPaymentUrl: vi.fn().mockReturnValue("http://pay"),
  verifyResultSignature: vi.fn().mockReturnValue(true),
  isRobokassaConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock("../webpush", () => ({
  sendPushToUser: vi.fn().mockResolvedValue(undefined),
  VAPID_PUBLIC_KEY: "test-vapid-key",
  setRetrySettings: vi.fn(),
  getRetryAttempts: vi.fn().mockReturnValue(2),
  getRetryDelayMs: vi.fn().mockReturnValue(1000),
}));

// ── real imports (after all mocks) ────────────────────────────────────────

import express from "express";
import request from "supertest";
import { createServer } from "http";
import { registerRoutes } from "../routes";

// ── fixtures ──────────────────────────────────────────────────────────────

const SHOP_A_ID = "shop-a";
const SHOP_B_ID = "shop-b";

const ownerA  = { id: "owner-a",  role: "shop",   isBlocked: false };
const ownerB  = { id: "owner-b",  role: "shop",   isBlocked: false };
const admin   = { id: "admin-1",  role: "admin",  isBlocked: false };

const shopA = { id: SHOP_A_ID, ownerId: ownerA.id, name: "Shop A" };
const shopB = { id: SHOP_B_ID, ownerId: ownerB.id, name: "Shop B" };

const orderInA = {
  id: "order-1", shopId: SHOP_A_ID, buyerId: "buyer-1",
  status: "confirmed", totalAmount: "500", assemblyPhotoUrl: null,
};
const orderInB = {
  id: "order-2", shopId: SHOP_B_ID, buyerId: "buyer-2",
  status: "confirmed", totalAmount: "300", assemblyPhotoUrl: null,
};

// ── test app ──────────────────────────────────────────────────────────────

let app: express.Express;

beforeAll(async () => {
  const a = express();
  a.use(express.json());
  const srv = createServer(a);
  await registerRoutes(srv, a);

  // Test-only helper: injects userId into the session so we can simulate
  // any role without going through the real login flow.
  a.post("/test-set-session", (req, res) => {
    (req.session as any).userId = req.body.userId;
    req.session.save(() => res.json({ ok: true }));
  });

  app = a;

  // Default storage mock implementations (overridden per-test where needed)
  mockStorage.getUser.mockImplementation(async (id: string) => {
    if (id === ownerA.id) return ownerA;
    if (id === ownerB.id) return ownerB;
    if (id === admin.id)  return admin;
    return undefined;
  });

  mockStorage.getShopForUser.mockImplementation(async (userId: string) => {
    if (userId === ownerA.id) return shopA;
    if (userId === ownerB.id) return shopB;
    return undefined;
  });

  mockStorage.getShop.mockImplementation(async (id: string) => {
    if (id === SHOP_A_ID) return shopA;
    if (id === SHOP_B_ID) return shopB;
    return undefined;
  });

  mockStorage.getOrder.mockImplementation(async (id: string) => {
    if (id === orderInA.id) return orderInA;
    if (id === orderInB.id) return orderInB;
    return undefined;
  });

  mockStorage.updateShop.mockImplementation(async (id: string, data: any) =>
    ({ ...(id === SHOP_A_ID ? shopA : shopB), ...data })
  );

  mockStorage.updateOrderStatus.mockImplementation(
    async (id: string, status: string) =>
      ({ ...(id === orderInA.id ? orderInA : orderInB), status })
  );
});

/** Returns a supertest agent that already has an authenticated session. */
async function agentFor(userId: string) {
  const agent = request.agent(app);
  await agent.post("/test-set-session").send({ userId });
  return agent;
}

// ── PATCH /api/shops/:id ──────────────────────────────────────────────────

describe("PATCH /api/shops/:id — ownership guard", () => {
  it("shop owner can edit their own shop (200)", async () => {
    const agent = await agentFor(ownerA.id);
    const res = await agent
      .patch(`/api/shops/${SHOP_A_ID}`)
      .send({ description: "Updated" });
    expect(res.status).toBe(200);
  });

  it("shop owner cannot edit another shop (403)", async () => {
    const agent = await agentFor(ownerA.id);
    const res = await agent
      .patch(`/api/shops/${SHOP_B_ID}`)
      .send({ description: "Hijack" });
    expect(res.status).toBe(403);
  });

  it("admin can edit any shop freely", async () => {
    for (const shopId of [SHOP_A_ID, SHOP_B_ID]) {
      const agent = await agentFor(admin.id);
      const res = await agent
        .patch(`/api/shops/${shopId}`)
        .send({ description: "Admin edit" });
      expect(res.status).toBe(200);
    }
  });
});

// ── PATCH /api/orders/:id/status ─────────────────────────────────────────

describe("PATCH /api/orders/:id/status — ownership guard", () => {
  it("shop owner can update an order in their own shop (200)", async () => {
    const agent = await agentFor(ownerA.id);
    const res = await agent
      .patch(`/api/orders/${orderInA.id}/status`)
      .send({ status: "delivering" });
    expect(res.status).toBe(200);
  });

  it("shop owner cannot update an order in another shop (403)", async () => {
    const agent = await agentFor(ownerA.id);
    const res = await agent
      .patch(`/api/orders/${orderInB.id}/status`)
      .send({ status: "delivering" });
    expect(res.status).toBe(403);
  });

  it("worker (role=shop, linked to shop A) can update shop-A orders (200)", async () => {
    // A shop worker is stored with role="shop" in the DB and is linked to a shop
    // via the shopWorkers table; getShopForUser resolves to their shop.
    const workerA = { id: "worker-a-shop-role", role: "shop", isBlocked: false };

    // requireRole middleware calls getUser once; handler calls it again.
    mockStorage.getUser
      .mockResolvedValueOnce(workerA)   // requireRole check
      .mockResolvedValueOnce(workerA);  // inside handler
    mockStorage.getShopForUser.mockResolvedValueOnce(shopA);

    const agent = await agentFor(workerA.id);
    const res = await agent
      .patch(`/api/orders/${orderInA.id}/status`)
      .send({ status: "delivering" });
    expect(res.status).toBe(200);
  });

  it("worker (role=shop, linked to shop A) cannot update shop-B orders (403)", async () => {
    const workerA = { id: "worker-a-shop-role-2", role: "shop", isBlocked: false };

    mockStorage.getUser
      .mockResolvedValueOnce(workerA)
      .mockResolvedValueOnce(workerA);
    mockStorage.getShopForUser.mockResolvedValueOnce(shopA); // worker → shop A

    const agent = await agentFor(workerA.id);
    const res = await agent
      .patch(`/api/orders/${orderInB.id}/status`) // order belongs to shop B
      .send({ status: "delivering" });
    expect(res.status).toBe(403);
  });

  it("admin can update any order freely", async () => {
    for (const orderId of [orderInA.id, orderInB.id]) {
      const agent = await agentFor(admin.id);
      const res = await agent
        .patch(`/api/orders/${orderId}/status`)
        .send({ status: "delivering" });
      expect(res.status).toBe(200);
    }
  });
});
