import { logger } from '../../utils/logger.js';
import { generateRoomCode } from './gameSchemas.js';

// In-memory room registry shared by multiplayer game namespaces. The Render
// free tier runs a single Node process, so a JS Map is sufficient. We TTL
// idle rooms and cap the total to protect memory.

export interface BaseRoomState {
  code: string;
  gameId: string;
  hostUserId: string;
  createdAt: number;
  lastActivityAt: number;
}

export interface RoomStoreOptions {
  gameId: string;
  maxRooms?: number;
  maxPlayersPerRoom?: number;
  idleTtlMs?: number;
}

export class RoomStore<T extends BaseRoomState> {
  readonly gameId: string;
  readonly maxRooms: number;
  readonly maxPlayersPerRoom: number;
  readonly idleTtlMs: number;
  private rooms = new Map<string, T>();
  private sweepHandle: ReturnType<typeof setInterval> | null = null;

  constructor(options: RoomStoreOptions) {
    this.gameId = options.gameId;
    this.maxRooms = options.maxRooms ?? 50;
    this.maxPlayersPerRoom = options.maxPlayersPerRoom ?? 16;
    this.idleTtlMs = options.idleTtlMs ?? 10 * 60 * 1000;

    this.sweepHandle = setInterval(() => this.sweepIdle(), Math.min(this.idleTtlMs, 60_000));
    this.sweepHandle.unref?.();
  }

  size(): number {
    return this.rooms.size;
  }

  get(code: string): T | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  list(): T[] {
    return Array.from(this.rooms.values());
  }

  has(code: string): boolean {
    return this.rooms.has(code.toUpperCase());
  }

  set(code: string, room: T): void {
    const normalizedCode = code.toUpperCase();
    this.rooms.set(normalizedCode, room);
    logger.debug('Game room stored', { gameId: this.gameId, code: normalizedCode });
  }

  create(factory: (code: string) => T): T {
    if (this.rooms.size >= this.maxRooms) {
      this.sweepIdle(true);
      if (this.rooms.size >= this.maxRooms) {
        throw new Error('ROOM_LIMIT_REACHED');
      }
    }
    let code = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(code)) {
      attempts += 1;
      if (attempts > 20) throw new Error('ROOM_CODE_COLLISION');
      code = generateRoomCode();
    }
    const room = factory(code);
    this.rooms.set(code, room);
    logger.debug('Game room created', { gameId: this.gameId, code });
    return room;
  }

  touch(code: string): void {
    const room = this.rooms.get(code.toUpperCase());
    if (room) room.lastActivityAt = Date.now();
  }

  delete(code: string): boolean {
    const deleted = this.rooms.delete(code.toUpperCase());
    if (deleted) logger.debug('Game room deleted', { gameId: this.gameId, code });
    return deleted;
  }

  private sweepIdle(aggressive = false): void {
    const cutoff = Date.now() - (aggressive ? this.idleTtlMs / 2 : this.idleTtlMs);
    for (const [code, room] of this.rooms) {
      if (room.lastActivityAt < cutoff) {
        this.rooms.delete(code);
        logger.info('Game room evicted (idle)', { gameId: this.gameId, code });
      }
    }
  }
}
