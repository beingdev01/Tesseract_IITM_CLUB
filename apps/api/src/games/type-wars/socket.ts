import type { Namespace } from 'socket.io';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { registerGameNamespace, type GameSocket } from '../lib/socketNamespace.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { computeTypingStats } from './content.js';
import {
  finalizeTypeWarsRoom,
  getOrLoadTypeWarsRoom,
  joinTypeWarsRoom,
  markTypeWarsParticipantActive,
  serializeTypeWarsRoom,
  TYPE_WARS_GAME_ID,
  type TypeWarsRoomState,
} from './state.js';

const progressSchema = z.object({
  charsTyped: z.number().int().min(0).max(10000),
});

// durationMs is intentionally NOT in the client payload — it's derived server-side
// from room.startedAt so a tampered client can't game the WPM.
const finishSchema = z.object({
  charsTyped: z.number().int().min(0).max(10000),
  correctChars: z.number().int().min(0).max(10000),
});

function roomChannel(code: string): string {
  return `type-wars:${code}`;
}

function emitState(ns: Namespace, room: TypeWarsRoomState): void {
  ns.to(roomChannel(room.code)).emit('room:state', serializeTypeWarsRoom(room));
}

async function startRace(ns: Namespace, room: TypeWarsRoomState): Promise<void> {
  if (room.status !== 'LOBBY') return;
  room.status = 'COUNTDOWN';
  await withRetry(() => prisma.typeWarsRace.update({
    where: { id: room.raceId },
    data: { status: 'COUNTDOWN' },
    select: { id: true },
  }));
  ns.to(roomChannel(room.code)).emit('race:countdown', { value: 3 });
  setTimeout(() => ns.to(roomChannel(room.code)).emit('race:countdown', { value: 2 }), 1000);
  setTimeout(() => ns.to(roomChannel(room.code)).emit('race:countdown', { value: 1 }), 2000);
  setTimeout(() => {
    room.status = 'RACING';
    room.startedAt = Date.now();
    for (const participant of room.participants.values()) {
      participant.finished = false;
      participant.finishedAt = null;
      participant.charsTyped = 0;
      participant.wpm = 0;
      participant.accuracy = 0;
      participant.rank = null;
      participant.score = 0;
    }
    void withRetry(() => prisma.typeWarsRace.update({
      where: { id: room.raceId },
      data: { status: 'RACING', startedAt: new Date(room.startedAt ?? Date.now()) },
      select: { id: true },
    }));
    ns.to(roomChannel(room.code)).emit('race:start', {
      startedAt: room.startedAt,
      passage: room.passage,
    });
    emitState(ns, room);
    room.finishTimer = setTimeout(() => {
      void finalizeTypeWarsRoom(room).then(() => {
        ns.to(roomChannel(room.code)).emit('race:results', {
          participants: serializeTypeWarsRoom(room).participants,
        });
        emitState(ns, room);
      });
    }, 90_000);
    room.finishTimer.unref?.();
  }, 3000);
}

function register(ns: Namespace): void {
  ns.on('connection', (socket) => {
    const gameSocket = socket as GameSocket;
    const authUser = gameSocket.data.authUser;
    if (!authUser) {
      socket.disconnect(true);
      return;
    }

    socket.on('room:join', async (payload: unknown, ack?: (response: unknown) => void) => {
      try {
        const parsed = z.object({ code: roomCodeSchema }).safeParse(payload);
        if (!parsed.success) {
          ack?.({ ok: false, error: 'VALIDATION_ERROR' });
          return;
        }
        const room = await joinTypeWarsRoom({
          code: parsed.data.code,
          user: { id: authUser.id, name: authUser.name },
        });
        gameSocket.data.roomCode = room.code;
        markTypeWarsParticipantActive(room, authUser.id, true);
        await socket.join(roomChannel(room.code));
        emitState(ns, room);
        ack?.({ ok: true, room: serializeTypeWarsRoom(room) });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'ROOM_JOIN_FAILED' });
      }
    });

    socket.on('room:ready', async () => {
      const room = gameSocket.data.roomCode ? await getOrLoadTypeWarsRoom(gameSocket.data.roomCode) : null;
      const participant = room?.participants.get(authUser.id);
      if (!room || !participant || room.status !== 'LOBBY') return;
      participant.ready = true;
      emitState(ns, room);
    });

    socket.on('room:start', async (_payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getOrLoadTypeWarsRoom(gameSocket.data.roomCode) : null;
      if (!room || room.hostUserId !== authUser.id) {
        ack?.({ ok: false, error: 'NOT_HOST' });
        return;
      }
      const activeCount = Array.from(room.participants.values()).filter((p) => p.active).length;
      if (activeCount < 2) {
        ack?.({ ok: false, error: 'NEED_MORE_PLAYERS', minPlayers: 2, currentPlayers: activeCount });
        return;
      }
      ack?.({ ok: true });
      await startRace(ns, room);
    });

    socket.on('progress:update', async (payload: unknown) => {
      const room = gameSocket.data.roomCode ? await getOrLoadTypeWarsRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'RACING') return;
      const participant = room.participants.get(authUser.id);
      if (!participant || participant.finished) return;
      const parsed = progressSchema.safeParse(payload);
      if (!parsed.success) return;
      const now = Date.now();
      if (now - participant.lastProgressAt < 200) return;
      participant.lastProgressAt = now;
      participant.charsTyped = Math.min(parsed.data.charsTyped, room.passage.text.length);
      ns.to(roomChannel(room.code)).emit('progress:tick', {
        userId: authUser.id,
        charsTyped: participant.charsTyped,
      });
    });

    socket.on('progress:finish', async (payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getOrLoadTypeWarsRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'RACING') return;
      const participant = room.participants.get(authUser.id);
      if (!participant || participant.finished) {
        ack?.({ ok: true, ignored: true });
        return;
      }
      const parsed = finishSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'VALIDATION_ERROR' });
        return;
      }
      const charsTyped = Math.min(parsed.data.charsTyped, room.passage.text.length);
      const correctChars = Math.min(parsed.data.correctChars, charsTyped);
      const startedAt = room.startedAt ?? Date.now();
      const durationMs = Math.max(1, Date.now() - startedAt);
      const stats = computeTypingStats({
        charsTyped,
        correctChars,
        durationMs,
        userId: authUser.id,
      });
      participant.finished = true;
      participant.finishedAt = Date.now();
      participant.charsTyped = charsTyped;
      participant.wpm = stats.wpm;
      participant.accuracy = stats.accuracy;
      participant.durationSeconds = stats.durationSeconds;
      ack?.({ ok: true });

      const allDone = Array.from(room.participants.values()).every((entry) => entry.finished || !entry.active);
      if (allDone) {
        await finalizeTypeWarsRoom(room);
        ns.to(roomChannel(room.code)).emit('race:results', {
          participants: serializeTypeWarsRoom(room).participants,
        });
      }
      emitState(ns, room);
    });

    socket.on('disconnect', async () => {
      const room = gameSocket.data.roomCode ? await getOrLoadTypeWarsRoom(gameSocket.data.roomCode) : null;
      if (!room) return;
      markTypeWarsParticipantActive(room, authUser.id, false);
      if (room.status === 'LOBBY' && room.hostUserId === authUser.id) {
        room.status = 'ABORTED';
        await withRetry(() => prisma.typeWarsRace.update({
          where: { id: room.raceId },
          data: { status: 'ABORTED', endedAt: new Date() },
          select: { id: true },
        }));
        ns.to(roomChannel(room.code)).emit('room:aborted');
      }
      emitState(ns, room);
    });
  });
}

export function registerTypeWarsSocket(): void {
  try {
    registerGameNamespace({ gameId: TYPE_WARS_GAME_ID, register });
  } catch (error) {
    logger.error('Failed to register Type Wars namespace', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
