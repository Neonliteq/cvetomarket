import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/vapid-public-key");
    const data = await res.json();
    return data.key || null;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function subscribeToPush(vapidKey: string): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });
}

const DISMISSED_KEY = "push_prompt_dismissed";

function endpointKey(userId: string): string {
  return `push_registered_endpoint_${userId}`;
}

async function sendSubscriptionToServer(sub: PushSubscription, userId: string): Promise<void> {
  const json = sub.toJSON();
  const newEndpoint = json.endpoint!;
  const storageKey = endpointKey(userId);
  const previousEndpoint = localStorage.getItem(storageKey) ?? undefined;
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: newEndpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      previousEndpoint: previousEndpoint !== newEndpoint ? previousEndpoint : undefined,
    }),
    credentials: "include",
  });
  if (res.ok) {
    localStorage.setItem(storageKey, newEndpoint);
  }
}

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
      } catch {
      }
      if (cancelled) return;
      timer = setTimeout(() => setShow(true), 3000);
    })();
    return () => {
      cancelled = true;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;
    (async () => {
      try {
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) return;
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          await sendSubscriptionToServer(existing, user.id);
        } else {
          const sub = await subscribeToPush(vapidKey);
          if (sub) await sendSubscriptionToServer(sub, user.id);
        }
      } catch (e) {
        console.error("Push re-registration error:", e);
      }
    })();
  }, [user]);

  const handleAllow = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const vapidKey = await getVapidPublicKey();
        if (vapidKey) {
          const sub = await subscribeToPush(vapidKey);
          if (sub) await sendSubscriptionToServer(sub, user.id);
        }
      }
    } catch (e) {
      console.error("Push subscription error:", e);
    } finally {
      setLoading(false);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300"
      data-testid="push-notification-prompt"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
        <Bell className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Включить уведомления?</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Получайте push-уведомления о статусе заказов и новых сообщениях
        </p>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            onClick={handleAllow}
            disabled={loading}
            className="h-7 text-xs px-3"
            data-testid="button-push-allow"
          >
            {loading ? "..." : "Включить"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="h-7 text-xs px-3"
            data-testid="button-push-dismiss"
          >
            Не сейчас
          </Button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-push-close"
        aria-label="Закрыть"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
