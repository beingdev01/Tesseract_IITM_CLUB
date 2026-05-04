export const ACCESS_TOKEN_KEY = "tesseract.token";
export const AUTH_STORE_KEY = "tesseract.auth";
export const AUTH_CLEARED_EVENT = "tesseract:auth-cleared";

export function readAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function writeAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearStoredAuth(notify = true): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_STORE_KEY);
  if (notify) {
    window.dispatchEvent(new Event(AUTH_CLEARED_EVENT));
  }
}
