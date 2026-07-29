/**
 * Unified Global Settings Service for Excel Computers Display Application
 * Synchronizes application settings with Neon PostgreSQL DB via /api/settings.
 */

class SettingsService {
  private inMemoryCache = new Map<string, any>();
  private subscribers = new Map<string, Set<(val: any) => void>>();

  /**
   * Fetch a global setting from backend API (with fallback)
   */
  public async getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
    try {
      const res = await fetch(`/api/settings?key=${encodeURIComponent(key)}&defaultValue=${encodeURIComponent(String(defaultValue))}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.value !== undefined) {
          this.inMemoryCache.set(key, json.value);
          this.notifySubscribers(key, json.value);
          return json.value as T;
        }
      }
    } catch (err) {
      console.warn(`[SettingsService] Could not reach /api/settings for "${key}", using cache/fallback:`, err);
    }

    if (this.inMemoryCache.has(key)) {
      return this.inMemoryCache.get(key) as T;
    }
    return defaultValue;
  }

  /**
   * Update a global setting across all devices and sessions
   */
  public async setSetting<T = any>(key: string, value: T): Promise<boolean> {
    this.inMemoryCache.set(key, value);
    this.notifySubscribers(key, value);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        const json = await res.json();
        return json.success === true;
      }
    } catch (err) {
      console.error(`[SettingsService] Error saving setting "${key}":`, err);
    }
    return true;
  }

  /**
   * Subscribe to setting changes
   */
  public subscribe<T = any>(key: string, callback: (val: T) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(callback as any);

    return () => {
      this.subscribers.get(key)?.delete(callback as any);
    };
  }

  private notifySubscribers(key: string, val: any) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(cb => cb(val));
    }
  }
}

export const settingsService = new SettingsService();
