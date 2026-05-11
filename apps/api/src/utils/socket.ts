import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { logger } from './logger.js';

let io: SocketIOServer | null = null;

const SOCKET_CONNECT_WINDOW_MS = 60 * 1000;
const SOCKET_CONNECT_MAX_PER_WINDOW = 30;
const socketConnectionRateMap = new Map<string, { count: number; windowStart: number }>();
const SOCKET_PING_TIMEOUT_MS = Number(process.env.SOCKET_PING_TIMEOUT_MS || 30000);
const SOCKET_PING_INTERVAL_MS = Number(process.env.SOCKET_PING_INTERVAL_MS || 10000);

function getSocketClientIp(socket: Socket): string {
  const forwardedFor = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return socket.handshake.address || 'unknown';
}

function isConnectionAllowed(ip: string): boolean {
  const now = Date.now();
  const current = socketConnectionRateMap.get(ip);

  if (!current || now - current.windowStart > SOCKET_CONNECT_WINDOW_MS) {
    socketConnectionRateMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  current.count += 1;
  socketConnectionRateMap.set(ip, current);
  return current.count <= SOCKET_CONNECT_MAX_PER_WINDOW;
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of socketConnectionRateMap.entries()) {
    if (now - entry.windowStart > SOCKET_CONNECT_WINDOW_MS * 2) {
      socketConnectionRateMap.delete(ip);
    }
  }
}, SOCKET_CONNECT_WINDOW_MS).unref();

export function initializeSocket(httpServer: HTTPServer) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // Allow localhost for development
        if (origin.startsWith('http://localhost:')) {
          return callback(null, true);
        }

        // Allow private LAN origins in development (same Wi-Fi testing)
        if (
          isDevelopment &&
          (
            origin.startsWith('http://127.0.0.1:') ||
            /^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(origin)
          )
        ) {
          return callback(null, true);
        }
        
        // Allow production frontend
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
          return callback(null, true);
        }
        
        // Production allowlist comes from ALLOWED_ORIGINS (CSV).
        const ALLOWED_BROWSER_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        if (ALLOWED_BROWSER_ORIGINS.includes(origin)) {
          return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
    // Lower defaults tighten stale-connection detection for large live quizzes.
    pingTimeout: SOCKET_PING_TIMEOUT_MS,
    pingInterval: SOCKET_PING_INTERVAL_MS,
    transports: ['websocket'],
    maxHttpBufferSize: 1e6,
    upgradeTimeout: 10000,
  });

  // Global middleware enforces rate-limiting only. Authentication and role
  // checks live on individual namespaces (/attendance, /games/<id>) so player
  // sockets can connect without admin privileges.
  io.use((socket, next) => {
    const ip = getSocketClientIp(socket);
    if (!isConnectionAllowed(ip)) {
      logger.warn('Socket connection rate limit exceeded', { ip });
      next(new Error('RATE_LIMITED'));
      return;
    }
    next();
  });

  // Default namespace is closed — no product feature uses it. Reject anything
  // that lands here so stray connections don't sit open consuming resources.
  io.of('/').use((_socket, next) => {
    next(new Error('NAMESPACE_NOT_FOUND'));
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// Event emitters for different data types
export const socketEvents = {
  userCreated: (userId: string) => {
    if (!io) logger.warn('Socket.io not initialized, cannot emit user:created');
    else logger.debug('Emitting user:created', { userId });
    try {
      io?.emit('user:created', { userId });
    } catch (error) {
      logger.error('Failed to emit user:created', { userId, error: error instanceof Error ? error.message : String(error) });
    }
  },
  userUpdated: (userId: string) => {
    if (!io) logger.warn('Socket.io not initialized, cannot emit user:updated');
    else logger.debug('Emitting user:updated', { userId });
    try {
      io?.emit('user:updated', { userId });
    } catch (error) {
      logger.error('Failed to emit user:updated', { userId, error: error instanceof Error ? error.message : String(error) });
    }
  },
  userDeleted: (userId: string) => {
    if (!io) logger.warn('Socket.io not initialized, cannot emit user:deleted');
    else logger.debug('Emitting user:deleted', { userId });
    try {
      io?.emit('user:deleted', { userId });
    } catch (error) {
      logger.error('Failed to emit user:deleted', { userId, error: error instanceof Error ? error.message : String(error) });
    }
  },
};
