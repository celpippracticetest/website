/**
 * Keep the Supabase `user` object out of the auth cookie.
 *
 * By default the `sb-<ref>-auth-token` cookie holds the whole session, including the full
 * `user` (metadata + every identity). That made the cookie ~7 KB across 3 chunks, and with a
 * few extra cookies Vercel rejects every request with 494 REQUEST_HEADER_TOO_LARGE before
 * the app runs. With `userStorage` set, auth-js writes only the tokens to the cookie and the
 * user to this separate store. Server code must use `getUser()` (not `getSession().user`).
 *
 * Every client that can write the auth cookie (browser, middleware, RSC, auth callback) must
 * pass this, or the next token refresh writes the full user back into the cookie.
 */

type SupportedStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function memoryUserStorage(): SupportedStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function browserUserStorage(): SupportedStorage {
  const fallback = memoryUserStorage();
  // localStorage can be missing or throw (private mode, blocked site data).
  return {
    getItem: (key) => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        fallback.setItem(key, value);
      }
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
      fallback.removeItem(key);
    },
  };
}

/** `auth` options for `createBrowserClient` / `createServerClient`. */
export function supabaseAuthUserStorageOptions(): { userStorage: SupportedStorage } {
  return {
    userStorage:
      typeof window === "undefined" ? memoryUserStorage() : browserUserStorage(),
  };
}
