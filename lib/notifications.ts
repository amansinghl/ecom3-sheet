/**
 * Browser notification helpers for the KB remark threads.
 *
 * Deliberately no service worker: notifications are raised from the open tab,
 * so they arrive while someone is working in the sheet and stop when the tab
 * closes. Background delivery would need Web Push (service worker, VAPID keys
 * and a subscriptions table), which is a separate piece of work.
 */

export type NotificationPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

/** Rows claimed by a tab, so several open tabs do not all raise the same alert. */
const CLAIM_KEY = 'sheet-remark-notified-v1';

/** A claim older than this is stale - the tab that made it has probably gone. */
const CLAIM_TTL_MS = 5 * 60 * 1000;

type Claims = Record<string, { snapshot: string; at: number }>;

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/**
 * Asks for permission. Must be called from a user gesture - Safari ignores it
 * otherwise, and Chrome penalises pages that ask on load.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission !== 'default') {
    return Notification.permission as NotificationPermissionState;
  }

  try {
    return (await Notification.requestPermission()) as NotificationPermissionState;
  } catch {
    return notificationPermission();
  }
}

function readClaims(): Claims {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(CLAIM_KEY);
    return stored ? (JSON.parse(stored) as Claims) : {};
  } catch {
    return {};
  }
}

/**
 * Records this tab as the one alerting about `key` at `snapshot`, and says
 * whether the claim was won. A `tag` on the notification only dedupes within a
 * single tab, so the claim is what keeps three open tabs to one alert.
 */
export function claimNotification(key: string, snapshot: string): boolean {
  if (typeof window === 'undefined') return false;

  const now = Date.now();
  const claims = readClaims();
  const existing = claims[key];

  if (existing && existing.snapshot === snapshot && now - existing.at < CLAIM_TTL_MS) {
    return false;
  }

  claims[key] = { snapshot, at: now };

  // Drop stale entries so the key cannot grow without bound.
  Object.keys(claims).forEach((claimKey) => {
    if (now - claims[claimKey].at > CLAIM_TTL_MS) delete claims[claimKey];
  });

  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(claims));
  } catch {
    // A full or blocked store only costs us the cross-tab guard.
  }

  return true;
}

export interface ShowNotificationOptions {
  title: string;
  body: string;
  /** Replaces an earlier notification carrying the same tag instead of stacking. */
  tag: string;
  onClick?: () => void;
}

/** Raises one notification, or does nothing when permission is not granted. */
export function showNotification({ title, body, tag, onClick }: ShowNotificationOptions): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
      // Replacing silently would make a second message on the same row arrive
      // unnoticed, which is the case this feature exists for.
      renotify: true,
    } as NotificationOptions);

    notification.onclick = () => {
      window.focus();
      notification.close();
      onClick?.();
    };
  } catch {
    // Some browsers throw when constructing without a service worker (notably
    // Chrome on Android). The in-app bell still carries the same information.
  }
}
