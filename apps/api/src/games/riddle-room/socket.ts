import type { Namespace } from 'socket.io';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { registerGameNamespace, type GameSocket } from '../lib/socketNamespace.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { isRiddleCorrect, riddleSubmitSchema } from './content.js';
import {
  completeRiddleRoom,
  getRiddleRoom,
  joinRiddleRoom,
  publicCurrentClue,
  publicRiddleRoom,
  RIDDLE_ROOM_GAME_ID,
  sanitizeChatMessage,
} from './state.js';

function roomChannel(code: string): string {
  return `riddle-room:${code}`;
}

function register(ns: Namespace): void {
  ns.on('connection', (socket) => {
    const gameSocket = socket as GameSocket;
    const authUser = gameSocket.data.authUser;
    if (!authUser) {
      socket.disconnect(true);
      return;
    }

    const emitState = async () => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      if (!room) return;
      ns.to(roomChannel(room.code)).emit('room:state', {
        room: publicRiddleRoom(room),
        currentClue: room.status === 'ACTIVE' ? publicCurrentClue(room) : null,
      });
    };

    socket.on('room:join', async (payload: unknown, ack?: (response: unknown) => void) => {
      try {
        const parsed = z.object({ code: roomCodeSchema }).safeParse(payload);
        if (!parsed.success) {
          ack?.({ ok: false, error: 'VALIDATION_ERROR' });
          return;
        }
        const room = await joinRiddleRoom({
          code: parsed.data.code,
          user: { id: authUser.id, name: authUser.name },
        });
        gameSocket.data.roomCode = room.code;
        await socket.join(roomChannel(room.code));
        await emitState();
        ack?.({ ok: true, room: publicRiddleRoom(room), currentClue: publicCurrentClue(room) });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'ROOM_JOIN_FAILED' });
      }
    });

    socket.on('room:start', async (_payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      if (!room || room.hostUserId !== authUser.id || room.status !== 'LOBBY') {
        ack?.({ ok: false, error: 'NOT_HOST_OR_NOT_LOBBY' });
        return;
      }
      const activeCount = Array.from(room.members.values()).filter((m) => m.active).length;
      if (activeCount < 2) {
        ack?.({ ok: false, error: 'NEED_MORE_PLAYERS', minPlayers: 2, currentPlayers: activeCount });
        return;
      }
      ack?.({ ok: true });
      room.status = 'ACTIVE';
      await withRetry(() => prisma.riddleRoom.update({
        where: { id: room.roomId },
        data: { status: 'ACTIVE', startedAt: new Date() },
        select: { id: true },
      }));
      ns.to(roomChannel(room.code)).emit('clue:show', publicCurrentClue(room));
      await emitState();
    });

    socket.on('clue:hint', async () => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'ACTIVE') return;
      const clue = room.clues[room.currentOrder];
      if (!clue?.hint) return;
      room.hintsUsed.add(room.currentOrder);
      ns.to(roomChannel(room.code)).emit('clue:hint', {
        order: clue.order,
        hint: clue.hint,
      });
    });

    socket.on('clue:submit', async (payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'ACTIVE') return;
      if (Date.now() < room.lockUntil) {
        ack?.({ ok: false, error: 'LOCKED', lockUntil: room.lockUntil });
        return;
      }
      const parsed = riddleSubmitSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'VALIDATION_ERROR' });
        return;
      }
      const clue = room.clues[room.currentOrder];
      if (!clue) return;
      const correct = isRiddleCorrect(clue.answer, parsed.data.submission);
      await withRetry(() => prisma.riddleAttempt.create({
        data: {
          roomId: room.roomId,
          clueId: clue.id,
          userId: authUser.id,
          submission: parsed.data.submission,
          correct,
        },
      }));
      if (!correct) {
        room.lockUntil = Date.now() + clue.lockSeconds * 1000;
        ns.to(roomChannel(room.code)).emit('clue:wrong', {
          by: authUser.name,
          lockUntil: room.lockUntil,
        });
        ack?.({ ok: true, correct: false });
        return;
      }

      const updated = await withRetry(() => prisma.riddleRoom.updateMany({
        where: { id: room.roomId, currentOrder: room.currentOrder },
        data: { currentOrder: { increment: 1 } },
      }));
      if (updated.count === 0) {
        ack?.({ ok: true, ignored: true });
        return;
      }

      const award = room.hintsUsed.has(room.currentOrder) ? Math.floor(clue.basePoints / 2) : clue.basePoints;
      for (const member of room.members.values()) {
        member.pointsAwarded += award;
      }
      await withRetry(() => prisma.riddleRoomMember.updateMany({
        where: { roomId: room.roomId },
        data: { pointsAwarded: { increment: award } },
      }));
      room.currentOrder += 1;
      ns.to(roomChannel(room.code)).emit('clue:solved', {
        order: clue.order,
        by: authUser.name,
        nextOrder: room.currentOrder,
        award,
      });
      if (room.currentOrder >= room.clues.length) {
        await completeRiddleRoom(room);
        ns.to(roomChannel(room.code)).emit('room:complete', {
          members: publicRiddleRoom(room).members,
          totalPoints: Array.from(room.members.values()).reduce((sum, member) => sum + member.pointsAwarded, 0),
        });
      } else {
        ns.to(roomChannel(room.code)).emit('clue:show', publicCurrentClue(room));
      }
      await emitState();
      ack?.({ ok: true, correct: true });
    });

    socket.on('chat:message', async (payload: unknown) => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      if (!room || !room.members.has(authUser.id)) return;
      const parsed = z.object({ message: z.string().min(1).max(500) }).safeParse(payload);
      if (!parsed.success) return;
      const message = sanitizeChatMessage(parsed.data.message);
      if (!message) return;
      ns.to(roomChannel(room.code)).emit('chat:message', {
        userId: authUser.id,
        name: authUser.name,
        message,
        sentAt: new Date().toISOString(),
      });
    });

    socket.on('disconnect', async () => {
      const room = gameSocket.data.roomCode ? await getRiddleRoom(gameSocket.data.roomCode) : null;
      const member = room?.members.get(authUser.id);
      if (!room || !member) return;
      member.active = false;
      if (room.status === 'LOBBY' && room.hostUserId === authUser.id) {
        room.status = 'ABORTED';
        await withRetry(() => prisma.riddleRoom.update({
          where: { id: room.roomId },
          data: { status: 'ABORTED', endedAt: new Date() },
          select: { id: true },
        }));
        ns.to(roomChannel(room.code)).emit('room:aborted');
      }
      await emitState();
    });
  });
}

export function registerRiddleRoomSocket(): void {
  try {
    registerGameNamespace({ gameId: RIDDLE_ROOM_GAME_ID, register });
  } catch (error) {
    logger.error('Failed to register Riddle Room namespace', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
