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

const RETRY_ATTEMPTS = (() => {
  const raw = parseInt(process.env.PUSH_RETRY_ATTEMPTS ?? "", 10);
  if (isNaN(raw)) return 2;
  return Math.min(Math.max(raw, 0), 10);
})();

const RETRY_DELAY_MS = (() => {
  const raw = parseInt(process.env.PUSH_RETRY_DELAY_MS ?? "", 10);
  if (isNaN(raw)) return 1000;
  return Math.min(Math.max(raw, 0), 30000);
})();

if (process.env.PUSH_RETRY_ATTEMPTS !== undefined || process.env.PUSH_RETRY_DELAY_MS !== undefined) {
  console.log(`[webpush] retry settings: attempts=${RETRY_ATTEMPTS}, delayMs=${RETRY_DELAY_MS}`);
}

export { RETRY_ATTEMPTS, RETRY_DELAY_MS };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SendResult = { status: "ok" } | { status: "permanent_failure" } | { status: "transient_failure"; error: string };

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
    return { status: "ok" };
  } catch (err: unknown) {
    const status = getPushErrorStatus(err);
    if (status === 410 || status === 404) {
      return { status: "permanent_failure" };
    }
    if (status !== undefined && status >= 500 && status < 600 && attemptsLeft > 0) {
      await delay(RETRY_DELAY_MS);
      return sendWithRetry(sub, data, attemptsLeft - 1);
    }
    const errorMsg = `status=${status ?? "unknown"}, message=${getPushErrorMessage(err)}`;
    console.error(`Push notification failed for subscription ${sub.id}: ${errorMsg}`);
    return { status: "transient_failure", error: errorMsg };
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
  const permanentlyFailed: string[] = [];
  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendWithRetry(sub, data, RETRY_ATTEMPTS);
      if (result.status === "permanent_failure") {
        permanentlyFailed.push(sub.id);
      } else if (result.status === "transient_failure") {
        await storage.recordPushDeliveryFailure(userId, sub.endpoint, result.error);
      }
    })
  );
  for (const id of permanentlyFailed) {
    await storage.deletePushSubscription(id);
  }
}
