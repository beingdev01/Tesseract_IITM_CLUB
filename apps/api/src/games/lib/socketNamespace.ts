import type { Namespace, Server as SocketIOServer, Socket } from 'socket.io';
import { authenticateSocketConnection, type SocketAuthUser } from '../../utils/socketAuth.js';
import { getIO } from '../../utils/socket.js';
import { logger } from '../../utils/logger.js';

export type GameSocket = Socket & {
  data: Socket['data'] & {
    authUser?: SocketAuthUser;
    roomCode?: string;
  };
};

export interface GameNamespaceOptions {
  gameId: string;
  register(ns: Namespace): void;
}

// Wires a per-game Socket.io namespace at `/games/<id>`. Every connecting
// socket is authenticated via the shared JWT helper; namespace handlers can
// then trust `socket.data.authUser`.
export function registerGameNamespace(options: GameNamespaceOptions): Namespace | null {
  const io = getIO();
  if (!io) {
    logger.warn('Cannot register game namespace — Socket.io not initialized', {
      gameId: options.gameId,
    });
    return null;
  }
  return registerOnServer(io, options);
}

export function registerOnServer(io: SocketIOServer, options: GameNamespaceOptions): Namespace {
  const path = `/games/${options.gameId}`;
  const ns = io.of(path);

  ns.use((socket, next) => {
    authenticateSocketConnection(socket)
      .then((authUser) => {
        (socket as GameSocket).data.authUser = authUser;
        next();
      })
      .catch((error) => {
        next(error instanceof Error ? error : new Error('AUTH_INVALID'));
      });
  });

  options.register(ns);

  logger.info('Game socket namespace registered', { path });
  return ns;
}
