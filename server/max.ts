import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.MAX_BOT_TOKEN || "";
const API_BASE = "https://api.icq.net/bot/v1";

export async function sendMaxMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    const url = new URL(`${API_BASE}/messages/sendText`);
    url.searchParams.set("token", BOT_TOKEN);
    url.searchParams.set("chatId", chatId);
    url.searchParams.set("text", text);
    await fetch(url.toString());
  } catch {
    // Silent fail — don't break main flow if Max is unavailable
  }
}

function makeToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

/** Generates a one-time token stored in the DB. Returns the token. */
export async function generateMaxLinkToken(userId: string): Promise<string> {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL
  await db.update(users)
    .set({ maxLinkToken: token, maxLinkTokenExpiresAt: expiresAt } as any)
    .where(eq(users.id, userId));
  return token;
}

/** Consumes a token from the DB. Returns userId if valid, null otherwise. */
export async function consumeMaxLinkToken(token: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id, expiresAt: (users as any).maxLinkTokenExpiresAt })
    .from(users)
    .where(eq((users as any).maxLinkToken, token))
    .limit(1);

  if (!user) return null;
  if (!user.expiresAt || new Date() > new Date(user.expiresAt)) {
    await db.update(users)
      .set({ maxLinkToken: null, maxLinkTokenExpiresAt: null } as any)
      .where(eq(users.id, user.id));
    return null;
  }

  await db.update(users)
    .set({ maxLinkToken: null, maxLinkTokenExpiresAt: null } as any)
    .where(eq(users.id, user.id));
  return user.id;
}

export function getMaxBotNick(): string {
  return process.env.MAX_BOT_NICK || "";
}

export const ORDER_STATUS_MESSAGES_MAX: Record<string, string> = {
  confirmed: "✅ Ваш заказ подтверждён магазином",
  assembling: "🌸 Ваш заказ собирается",
  delivering: "🚗 Ваш заказ передан в доставку",
  delivered: "🎉 Ваш заказ доставлен! Спасибо за покупку",
  cancelled: "❌ Ваш заказ отменён",
};

/** Registers webhook with Max Bot API on server start. */
export async function registerMaxWebhook(publicDomain: string): Promise<void> {
  if (!BOT_TOKEN || !publicDomain) return;
  const webhookUrl = `https://${publicDomain}/api/max/webhook`;
  try {
    const url = new URL(`${API_BASE}/events/setWebhook`);
    url.searchParams.set("token", BOT_TOKEN);
    url.searchParams.set("url", webhookUrl);
    const res = await fetch(url.toString());
    const data = await res.json() as any;
    if (data.ok) {
      console.log(`[max] Webhook registered → ${webhookUrl}`);
    } else {
      console.error("[max] Webhook registration failed:", data.description || JSON.stringify(data));
    }
  } catch (e) {
    console.error("[max] Webhook registration error:", e);
  }
}
