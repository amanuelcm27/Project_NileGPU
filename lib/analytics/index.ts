/**
 * Minimal, privacy-conscious analytics abstraction.
 *
 * There is deliberately no third-party analytics dependency. Events are:
 *  - dropped entirely during server rendering,
 *  - pushed to an in-memory buffer (`window.__nilegpuAnalytics`) so a real
 *    provider can be wired up later without touching call sites,
 *  - forwarded to NEXT_PUBLIC_ANALYTICS_ENDPOINT when that variable is set
 *    (fire-and-forget `sendBeacon`), or to a custom sink registered with
 *    `setAnalyticsSink`.
 *
 * Personally identifiable information is never sent: props are restricted to
 * non-identifying values and scrubbed at runtime before leaving the browser.
 */

export const analyticsEventNames = [
  "hero_cta_clicked",
  "survey_started",
  "survey_completed",
  "wishlist_submitted",
  "survey_abandoned",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export interface AnalyticsEventProps {
  hero_cta_clicked: { source: "nav" | "hero_primary" | "hero_secondary" | "final_cta" };
  survey_started: { stepId: string };
  survey_completed: { answeredQuestions: number; totalQuestions: number };
  wishlist_submitted: { stepId: string };
  /** Only the shape of progress is reported — never answers. */
  survey_abandoned: { lastStep: string; answeredQuestions: number; percent: number };
}

export type AnalyticsCall = {
  [K in AnalyticsEventName]: { event: K; props: AnalyticsEventProps[K] };
}[AnalyticsEventName];

export type AnalyticsSink = (call: AnalyticsCall) => void;
export type AnalyticsRecord = {
  event: AnalyticsEventName;
  props: Record<string, string | number | boolean>;
  ts: number;
};

declare global {
  interface Window {
    __nilegpuAnalytics?: AnalyticsRecord[];
  }
}

const MAX_BUFFERED_EVENTS = 100;
const PII_KEY_PATTERN = /(email|name|phone|address|password|token)/i;
const MAX_VALUE_LENGTH = 120;

let customSink: AnalyticsSink | null = null;

/** Register a sink (e.g. a provider SDK adapter). Passing null removes it. */
export function setAnalyticsSink(sink: AnalyticsSink | null): void {
  customSink = sink;
}

function scrub(props: Record<string, unknown>): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (PII_KEY_PATTERN.test(key)) continue;
    if (typeof value === "number" || typeof value === "boolean") {
      clean[key] = value;
      continue;
    }
    if (typeof value === "string") {
      clean[key] = value.slice(0, MAX_VALUE_LENGTH);
    }
  }
  return clean;
}

function endpoint(): string | null {
  const value = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Record a product event. Safe to call from any client component; a no-op on
 * the server and when `window` is unavailable.
 */
export function track<K extends AnalyticsEventName>(
  event: K,
  props: AnalyticsEventProps[K],
): void {
  if (typeof window === "undefined") return;

  const record: AnalyticsRecord = {
    event,
    props: scrub(props as Record<string, unknown>),
    ts: Date.now(),
  };

  const buffer = (window.__nilegpuAnalytics ??= []);
  buffer.push(record);
  if (buffer.length > MAX_BUFFERED_EVENTS) buffer.splice(0, buffer.length - MAX_BUFFERED_EVENTS);

  customSink?.({ event, props } as AnalyticsCall);

  const url = endpoint();
  if (url) {
    try {
      const body = JSON.stringify(record);
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        void fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
      }
    } catch {
      // Analytics must never break the product.
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug(`[analytics] ${event}`, record.props);
  }
}
