import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

const SESSION_KEY = "cveto_session_id";
const SESSION_TS_KEY = "cveto_session_ts";
const SESSION_TTL = 30 * 60 * 1000;

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function getOrCreateSession(): string {
  const now = Date.now();
  const existing = localStorage.getItem(SESSION_KEY);
  const ts = Number(localStorage.getItem(SESSION_TS_KEY) || "0");
  if (existing && now - ts < SESSION_TTL) {
    localStorage.setItem(SESSION_TS_KEY, String(now));
    return existing;
  }
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(SESSION_TS_KEY, String(now));
  return id;
}

async function sendPageView(page: string, userId?: string) {
  try {
    await fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: getOrCreateSession(),
        page,
        referrer: document.referrer || undefined,
        deviceType: getDeviceType(),
      }),
    });
  } catch {}
}

async function sendEvent(eventName: string, properties?: Record<string, unknown>, page?: string) {
  try {
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: getOrCreateSession(),
        eventName,
        properties,
        page: page || window.location.pathname,
      }),
    });
  } catch {}
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  sendEvent(eventName, properties);
}

export function useAnalytics() {
  const [location] = useLocation();
  const lastPage = useRef<string | null>(null);

  useEffect(() => {
    if (lastPage.current === location) return;
    lastPage.current = location;
    sendPageView(location);
  }, [location]);
}
