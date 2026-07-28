import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Bell, X, Share, Plus } from "lucide-react";

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

/** Returns true when running on iOS/iPadOS but NOT installed to home screen */
function isIOSSafariNotStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  return !(window.navigator as any).standalone;
}

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [loading, setLoading] = useState(false);
  const heartbeatDone = useRef(false);

  // Clean up stale localStorage when permission was revoked
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    const storageKey = endpointKey(user.id);
    const endpoint = localStorage.getItem(storageKey);
    if (!endpoint) return;
    fetch("/api/push/unsubscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
      credentials: "include",
    })
      .then((r) => { if (r.ok || r.status === 404) localStorage.removeItem(storageKey); })
      .catch(() => {});
  }, [user]);

  // Show prompt to users who haven't granted/denied yet
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // On iOS not in standalone: show install instructions instead of the OS prompt
    if (isIOSSafariNotStandalone()) {
      if (!sessionStorage.getItem("ios_install_dismissed")) {
        setTimeout(() => setShowIOS(true), 3000);
      }
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
      } catch { /* ignore */ }
      if (cancelled) return;
      timer = setTimeout(() => setShow(true), 3000);
    })();
    return () => { cancelled = true; if (timer !== undefined) clearTimeout(timer); };
  }, [user]);

  // Heartbeat: on every mount when permission is already granted, verify the subscription
  // is still registered server-side (Apple can invalidate it silently).
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;
    if (heartbeatDone.current) return;
    heartbeatDone.current = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();

        if (!existing) {
          // Browser lost the subscription — create a fresh one
          const vapidKey = await getVapidPublicKey();
          if (!vapidKey) return;
          const sub = await subscribeToPush(vapidKey);
          if (sub) await sendSubscriptionToServer(sub, user.id);
          return;
        }

        // Check if the server still has this endpoint (Apple may have returned 410)
        const statusRes = await fetch(
          `/api/push/status?endpoint=${encodeURIComponent(existing.endpoint)}`,
          { credentials: "include" }
        );
        if (!statusRes.ok) return;
        const { subscribed } = await statusRes.json();

        if (!subscribed) {
          // Server deleted the subscription (Apple 410) — re-register the same endpoint
          await sendSubscriptionToServer(existing, user.id);
        }
      } catch (e) {
        console.error("Push heartbeat error:", e);
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
          if (sub) await sendSubscriptionToServer(sub, user!.id);
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

  const handleDismissIOS = () => {
    sessionStorage.setItem("ios_install_dismissed", "1");
    setShowIOS(false);
  };

  // iOS "Add to Home Screen" instructions
  if (showIOS) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-xl p-4 animate-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={handleDismissIOS}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
          aria-label="Закрыть"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </div>
          <p className="font-semibold text-sm">Включите уведомления на iPhone</p>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          На iPhone push-уведомления работают только из установленного приложения. Добавьте сайт на экран «Домой»:
        </p>
        <ol className="text-xs text-foreground space-y-1.5 mb-3">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
            <span>Нажмите кнопку <Share className="w-3 h-3 inline mb-0.5" /> «Поделиться» внизу Safari</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
            <span>Выберите <Plus className="w-3 h-3 inline mb-0.5" /> «На экран "Домой"»</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
            <span>Откройте приложение с рабочего стола и разрешите уведомления</span>
          </li>
        </ol>
        <Button size="sm" variant="outline" onClick={handleDismissIOS} className="w-full h-7 text-xs">
          Понятно
        </Button>
      </div>
    );
  }

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
