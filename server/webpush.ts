import webpush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export { VAPID_PUBLIC_KEY };

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
  icon?: string;
}

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendResult = "ok" | "permanent_failure";

function getPushErrorStatus(err: unknown): number | undefined {
  if (err !== null && typeof err === "object" && "statusCode" in err) {
    const s = (err as { statusCode: unknown }).statusCode;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function getPushErrorMessage(err: unknown): string {
  if (err !== null && typeof err === "object" && "message" in err) {
    const m = (err as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err);
}

async function sendWithRetry(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  data: string,
  attemptsLeft: number
): Promise<SendResult> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      data
    );
    return "ok";
  } catch (err: unknown) {
    const status = getPushErrorStatus(err);
    if (status === 410 || status === 404) {
      return "permanent_failure";
    }
    if (status !== undefined && status >= 500 && status < 600 && attemptsLeft > 0) {
      await delay(RETRY_DELAY_MS);
      return sendWithRetry(sub, data, attemptsLeft - 1);
    }
    console.error(
      `Push notification failed for subscription ${sub.id}: status=${status ?? "unknown"}, message=${getPushErrorMessage(err)}`
    );
    return "ok";
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const subscriptions = await storage.getPushSubscriptionsByUser(userId);
  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    link: payload.link || "/",
    icon: payload.icon || "/icon-192.png",
  });
  const failed: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendWithRetry(sub, data, RETRY_ATTEMPTS);
      if (result === "permanent_failure") {
        failed.push(sub.id);
      }
    })
  );
  for (const id of failed) {
    await storage.deletePushSubscription(id);
  }
}
