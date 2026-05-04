// Stub — Socket.io/real-time context removed from Tesseract (quiz system stripped).
// AdminUsersRealtime still uses SocketProvider; provide a no-op to avoid crashes.
import type { ReactNode } from 'react';

export function SocketProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useSocketEvent(
  _event: string,
  _handler: (...args: unknown[]) => void,
) {
  // no-op
}

export function useSocket() {
  return null;
}
