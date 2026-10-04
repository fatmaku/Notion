// Cat Me If You Can – einfache Token-Bucket-Ratenbegrenzung im Speicher (pro Schlüssel, z. B. IP).

import { HttpError } from './http.js';

export function createLimiter({ perMinute, burst = perMinute, now = () => Date.now(), maxKeys = 20000 }) {
  const buckets = new Map();
  return {
    take(key, cost = 1) {
      const t = now();
      let b = buckets.get(key);
      if (!b) {
        if (buckets.size >= maxKeys) buckets.delete(buckets.keys().next().value);
        b = { tokens: burst, at: t };
        buckets.set(key, b);
      }
      b.tokens = Math.min(burst, b.tokens + ((t - b.at) / 60000) * perMinute);
      b.at = t;
      if (b.tokens < cost) {
        const retryAfter = Math.ceil(((cost - b.tokens) / perMinute) * 60);
        throw new HttpError(429, 'rate_limited', 'Zu viele Anfragen – bitte kurz warten', { retryAfter });
      }
      b.tokens -= cost;
    },
  };
}
