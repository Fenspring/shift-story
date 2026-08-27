"use client";

import { useSyncExternalStore } from "react";

/** The browser's zone never changes mid-session, so there is nothing to subscribe to. */
const noopSubscribe = () => () => {};

function clientTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The viewer's IANA timezone, read as derived state.
 *
 * The server has no timezone, so it renders "UTC" and the client swaps in the
 * real zone — matching the pre-hydration markup instead of pushing state from
 * an effect.
 */
export function useTimeZone(): string {
  return useSyncExternalStore(noopSubscribe, clientTimeZone, () => "UTC");
}
