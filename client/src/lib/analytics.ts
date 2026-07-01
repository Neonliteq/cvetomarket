import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "cveto_session_id";
const SESSION_TS_KEY = "cveto_session_ts";
const SESSION_SOURCE_KEY = "cveto_session_source";
const SESSION_TTL = 30 * 60 * 1000;

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

/** Returns the session ID, creating/rotating if needed.
 *  When a new session starts, clears the persisted traffic source. */
function getOrCreateSession(): { sessionId: string; isNew: boolean } {
  const now = Date.now();
  const existing = localStorage.getItem(SESSION_KEY);
  const ts = Number(localStorage.getItem(SESSION_TS_KEY) || "0");
  if (existing && now - ts < SESSION_TTL) {
    localStorage.setItem(SESSION_TS_KEY, String(now));
    return { sessionId: existing, isNew: false };
  }
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(SESSION_TS_KEY, String(now));
  // Clear cached traffic source so it is re-derived for the new session
  try { sessionStorage.removeItem(SESSION_SOURCE_KEY); } catch {}
  return { sessionId: id, isNew: true };
}

type TrafficSource = { utmSource: string; utmMedium?: string; utmCampaign?: string };

/** Derives the traffic source for the current session.
 *  Must be called AFTER getOrCreateSession() so stale cache is cleared on rotation.
 *  Priority: URL UTM params > session cache > referrer classification. */
function getTrafficSource(isNew: boolean): TrafficSource {
  // 1. URL UTM params — always authoritative (e.g. user clicked a campaign link)
  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source");
  if (utmSource) {
    const src: TrafficSource = {
      utmSource,
      utmMedium: params.get("utm_medium") ?? undefined,
      utmCampaign: params.get("utm_campaign") ?? undefined,
    };
    try { sessionStorage.setItem(SESSION_SOURCE_KEY, JSON.stringify(src)); } catch {}
    return src;
  }

  // 2. Cached source for this session (persists across SPA navigations)
  if (!isNew) {
    try {
      const stored = sessionStorage.getItem(SESSION_SOURCE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
  }

  // 3. Classify by referrer on first touch of the session
  let src: TrafficSource;
  const ref = document.referrer;
  if (!ref) {
    src = { utmSource: "direct" };
  } else {
    try {
      const refHost = new URL(ref).host;
      if (refHost === window.location.host) {
        // Same-site referrer → internal navigation (e.g. hard reload after SPA nav)
        src = { utmSource: "internal" };
      } else {
        // External referrer → referral; store the domain as utmMedium
        src = { utmSource: "referral", utmMedium: refHost };
      }
    } catch {
      src = { utmSource: "direct" };
    }
  }
  try { sessionStorage.setItem(SESSION_SOURCE_KEY, JSON.stringify(src)); } catch {}
  return src;
}

async function sendPageView(page: string) {
  try {
    // IMPORTANT: establish session FIRST so stale UTM is cleared before we read the source
    const { sessionId, isNew } = getOrCreateSession();
    const src = getTrafficSource(isNew);
    await fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId,
        page,
        referrer: document.referrer || undefined,
        deviceType: getDeviceType(),
        utmSource: src.utmSource,
        utmMedium: src.utmMedium ?? null,
        utmCampaign: src.utmCampaign ?? null,
      }),
    });
  } catch {}
}

async function patchPageViewDuration(page: string, durationSeconds: number) {
  if (durationSeconds <= 0) return;
  try {
    const { sessionId } = getOrCreateSession();
    await fetch("/api/analytics/pageview", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId, page, durationSeconds }),
    });
  } catch {}
}

async function sendEvent(eventName: string, properties?: Record<string, unknown>, page?: string) {
  try {
    const { sessionId } = getOrCreateSession();
    await fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sessionId,
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

    // Update duration on the page we're leaving via PATCH (no duplicate row)
    const prevPage = lastPage.current;
    if (prevPage) {
      const duration = Math.round((Date.now() - pageEnterTime.current) / 1000);
      patchPageViewDuration(prevPage, duration);
    }

    // Record a fresh pageview for the new page (one INSERT per page visit)
    lastPage.current = location;
    pageEnterTime.current = Date.now();
    sendPageView(location);
  }, [location]);

  useEffect(() => {
    const onUnload = () => {
      if (!lastPage.current) return;
      const duration = Math.round((Date.now() - pageEnterTime.current) / 1000);
      if (duration <= 0) return;
      // sendBeacon must use POST; dedicated endpoint handles it as an UPDATE
      const { sessionId } = getOrCreateSession();
      const payload = JSON.stringify({ sessionId, page: lastPage.current, durationSeconds: duration });
      navigator.sendBeacon(
        "/api/analytics/pageview/duration",
        new Blob([payload], { type: "application/json" })
      );
    };
    window.addEventListener("pagehide", onUnload);
    return () => window.removeEventListener("pagehide", onUnload);
  }, []);
}
