import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Silent fail — don't break main flow if Telegram is unavailable
  }
}

function makeToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

/** Generates a one-time token stored in the DB. Returns the deep-link URL. */
export async function generateLinkToken(userId: string): Promise<string> {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min TTL
  await db.update(users)
    .set({ telegramLinkToken: token, telegramLinkTokenExpiresAt: expiresAt } as any)
    .where(eq(users.id, userId));
  return token;
}

/** Consumes a token from the DB. Returns userId if valid, null otherwise. */
export async function consumeLinkToken(token: string): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id, expiresAt: (users as any).telegramLinkTokenExpiresAt })
    .from(users)
    .where(eq((users as any).telegramLinkToken, token))
    .limit(1);

  if (!user) return null;
  if (!user.expiresAt || new Date() > new Date(user.expiresAt)) {
    // Token expired — clear it
    await db.update(users)
      .set({ telegramLinkToken: null, telegramLinkTokenExpiresAt: null } as any)
      .where(eq(users.id, user.id));
    return null;
  }

  // Consume: clear the token
  await db.update(users)
    .set({ telegramLinkToken: null, telegramLinkTokenExpiresAt: null } as any)
    .where(eq(users.id, user.id));
  return user.id;
}

export function getBotUsername(): string {
  return "Cvetomarketbot";
}

export const ORDER_STATUS_MESSAGES: Record<string, string> = {
  confirmed: "✅ Ваш заказ подтверждён магазином",
  assembling: "🌸 Ваш заказ собирается",
  delivering: "🚗 Ваш заказ передан в доставку",
  delivered: "🎉 Ваш заказ доставлен! Спасибо за покупку",
  cancelled: "❌ Ваш заказ отменён",
};

/** Called on server start — registers the webhook with Telegram. */
export async function registerWebhook(publicDomain: string): Promise<void> {
  if (!BOT_TOKEN || !publicDomain) return;
  const url = `https://${publicDomain}/api/telegram/webhook`;
  try {
    const res = await fetch(`${API_BASE}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json() as any;
    if (data.ok) {
      console.log(`[telegram] Webhook registered → ${url}`);
    } else {
      console.error("[telegram] Webhook registration failed:", data.description);
    }
  } catch (e) {
    console.error("[telegram] Webhook registration error:", e);
  }
}
