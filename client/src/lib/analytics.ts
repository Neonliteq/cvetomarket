import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "cveto_session_id";
const SESSION_TS_KEY = "cveto_session_ts";
const SESSION_UTM_KEY = "cveto_session_utm";
const SESSION_TTL = 30 * 60 * 1000;

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const params = new URLSearchParams(window.location.search);
  const source = params.get("utm_source");
  const medium = params.get("utm_medium");
  const campaign = params.get("utm_campaign");

  if (source || medium || campaign) {
    const utm = { utmSource: source || undefined, utmMedium: medium || undefined, utmCampaign: campaign || undefined };
    try { sessionStorage.setItem(SESSION_UTM_KEY, JSON.stringify(utm)); } catch {}
    return utm;
  }
  try {
    const stored = sessionStorage.getItem(SESSION_UTM_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
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
  try { sessionStorage.removeItem(SESSION_UTM_KEY); } catch {}
  return id;
}

async function sendPageView(page: string, durationSeconds?: number) {
  try {
    const utm = getUtmParams();
    await fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId: getOrCreateSession(),
        page,
        referrer: document.referrer || undefined,
        deviceType: getDeviceType(),
        ...utm,
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
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
  const pageEnterTime = useRef<number>(Date.now());

  useEffect(() => {
    if (lastPage.current === location) return;
    const prevPage = lastPage.current;
    const duration = prevPage ? Math.round((Date.now() - pageEnterTime.current) / 1000) : undefined;

    if (prevPage && duration !== undefined && duration > 0) {
      sendPageView(prevPage, duration);
    }

    lastPage.current = location;
    pageEnterTime.current = Date.now();
    sendPageView(location);
  }, [location]);

  useEffect(() => {
    const onUnload = () => {
      if (!lastPage.current) return;
      const duration = Math.round((Date.now() - pageEnterTime.current) / 1000);
      if (duration > 0) {
        const payload = JSON.stringify({
          sessionId: getOrCreateSession(),
          page: lastPage.current,
          deviceType: getDeviceType(),
          ...getUtmParams(),
          durationSeconds: duration,
        });
        navigator.sendBeacon(
          "/api/analytics/pageview",
          new Blob([payload], { type: "application/json" })
        );
      }
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);
}
