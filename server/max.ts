import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const BOT_TOKEN = process.env.MAX_BOT_TOKEN || "";
const API_BASE = "https://platform-api.max.ru";

/** Returns true if the message was successfully delivered, false otherwise. */
export async function sendMaxMessage(chatId: string, text: string): Promise<boolean> {
  if (!BOT_TOKEN) return false;
  try {
    const url = new URL(`${API_BASE}/messages`);
    url.searchParams.set("user_id", chatId);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": BOT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
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
    const res = await fetch(`${API_BASE}/subscriptions`, {
      method: "POST",
      headers: {
        "Authorization": BOT_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        update_types: ["message_created", "bot_started"],
      }),
    });
    const data = await res.json() as any;
    if (res.ok) {
      console.log(`[max] Webhook registered → ${webhookUrl}`);
    } else {
      console.error("[max] Webhook registration failed:", JSON.stringify(data));
    }
  } catch (e) {
    console.error("[max] Webhook registration error:", e);
  }
}
