const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Temporary in-memory store for pending link tokens: token -> userId
const pendingLinks = new Map<string, { userId: string; expiresAt: number }>();

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

export function generateLinkToken(userId: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 24; i++) token += chars[Math.floor(Math.random() * chars.length)];
  // 10-minute TTL
  pendingLinks.set(token, { userId, expiresAt: Date.now() + 10 * 60 * 1000 });
  return token;
}

export function consumeLinkToken(token: string): string | null {
  const entry = pendingLinks.get(token);
  if (!entry) return null;
  pendingLinks.delete(token);
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
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
