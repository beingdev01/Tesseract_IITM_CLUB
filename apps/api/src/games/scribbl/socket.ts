import type { Namespace } from 'socket.io';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { registerGameNamespace, type GameSocket } from '../lib/socketNamespace.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { guessSchema, isCloseGuess, isExactGuess } from './content.js';
import {
  completeScribblGame,
  getScribblRoom,
  joinScribblRoom,
  publicScribblRoom,
  randomScribblPrompt,
  SCRIBBL_GAME_ID,
  type ScribblRoomState,
} from './state.js';

const strokeSchema = z.object({
  strokes: z.array(z.unknown()).max(200),
});

function roomChannel(code: string): string {
  return `scribbl:${code}`;
}

function emitState(ns: Namespace, room: ScribblRoomState): void {
  ns.to(roomChannel(room.code)).emit('room:state', publicScribblRoom(room));
}

async function persistRound(room: ScribblRoomState): Promise<void> {
  if (!room.promptWord || !room.roundStartedAt) return;
  const drawer = room.members[room.drawerIndex];
  if (!drawer) return;
  const startedAt = room.roundStartedAt;
  const round = await withRetry(() => prisma.scribblRound.create({
    data: {
      roomId: room.roomId,
      drawerId: drawer.userId,
      promptWord: room.promptWord ?? '',
      durationSeconds: room.roundDurationSeconds,
      startedAt: new Date(startedAt),
      endedAt: new Date(),
      guesses: {
        create: room.guessesThisRound.map((guess) => ({
          guesserId: guess.userId,
          guess: guess.guess,
          correct: guess.correct,
          pointsAwarded: guess.pointsAwarded,
        })),
      },
    },
    select: { id: true },
  }));
  logger.debug('Persisted Scribbl round', { roomId: room.roomId, roundId: round.id });
}

async function endRound(ns: Namespace, room: ScribblRoomState): Promise<void> {
  if (room.status !== 'ACTIVE' || !room.promptWord) return;
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  await persistRound(room);
  ns.to(roomChannel(room.code)).emit('round:end', {
    word: room.promptWord,
    scores: publicScribblRoom(room).members,
    guesses: room.guessesThisRound,
  });
  room.promptWord = null;
  room.roundStartedAt = null;
  room.currentRound += 1;
  const totalRounds = room.roundCount * Math.max(1, room.members.length);
  if (room.currentRound >= totalRounds) {
    await completeScribblGame(room);
    ns.to(roomChannel(room.code)).emit('game:end', { finalScores: publicScribblRoom(room).members });
    emitState(ns, room);
    return;
  }
  room.drawerIndex = (room.drawerIndex + 1) % Math.max(1, room.members.length);
  setTimeout(() => {
    void startRound(ns, room);
  }, 5000);
}

async function startRound(ns: Namespace, room: ScribblRoomState): Promise<void> {
  if (room.status !== 'ACTIVE') return;
  const drawer = room.members[room.drawerIndex];
  if (!drawer) return;
  const word = await randomScribblPrompt();
  room.promptWord = word;
  room.roundStartedAt = Date.now();
  room.solvedThisRound = new Set<string>();
  room.guessesThisRound = [];
  const drawerSocketIds = await ns.in(roomChannel(room.code)).fetchSockets();
  for (const connected of drawerSocketIds) {
    const socket = connected as unknown as GameSocket;
    if (socket.data.authUser?.id === drawer.userId) {
      connected.emit('round:prompt', { word });
    } else {
      connected.emit('round:start', {
        drawerId: drawer.userId,
        drawerName: drawer.name,
        wordLength: word.length,
        roundDurationSeconds: room.roundDurationSeconds,
      });
    }
  }
  emitState(ns, room);
  room.roundTimer = setTimeout(() => {
    void endRound(ns, room);
  }, room.roundDurationSeconds * 1000);
  room.roundTimer.unref?.();
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
        const room = await joinScribblRoom({
          code: parsed.data.code,
          user: { id: authUser.id, name: authUser.name },
        });
        gameSocket.data.roomCode = room.code;
        await socket.join(roomChannel(room.code));
        emitState(ns, room);
        ack?.({ ok: true, room: publicScribblRoom(room) });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'ROOM_JOIN_FAILED' });
      }
    });

    socket.on('room:start', async () => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.hostUserId !== authUser.id || room.status !== 'LOBBY') return;
      room.status = 'ACTIVE';
      await withRetry(() => prisma.scribblRoom.update({
        where: { id: room.roomId },
        data: { status: 'ACTIVE', startedAt: new Date() },
        select: { id: true },
      }));
      await startRound(ns, room);
    });

    socket.on('canvas:stroke', async (payload: unknown) => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'ACTIVE') return;
      const drawer = room.members[room.drawerIndex];
      if (!drawer || drawer.userId !== authUser.id) return;
      const parsed = strokeSchema.safeParse(payload);
      if (!parsed.success) return;
      const now = Date.now();
      if (now - room.strokeWindowStartedAt > 1000) {
        room.strokeWindowStartedAt = now;
        room.strokeCount = 0;
      }
      room.strokeCount += parsed.data.strokes.length;
      if (room.strokeCount > 300) return;
      socket.to(roomChannel(room.code)).emit('canvas:stroke', parsed.data);
    });

    socket.on('canvas:clear', async () => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.members[room.drawerIndex]?.userId !== authUser.id) return;
      socket.to(roomChannel(room.code)).emit('canvas:clear');
    });

    socket.on('guess:submit', async (payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'ACTIVE' || !room.promptWord || !room.roundStartedAt) return;
      const drawer = room.members[room.drawerIndex];
      if (!drawer || drawer.userId === authUser.id || room.solvedThisRound.has(authUser.id)) {
        ack?.({ ok: true, ignored: true });
        return;
      }
      const parsed = guessSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'VALIDATION_ERROR' });
        return;
      }
      if (isExactGuess(room.promptWord, parsed.data.guess)) {
        const elapsed = Date.now() - room.roundStartedAt;
        const remainingMs = Math.max(0, room.roundDurationSeconds * 1000 - elapsed);
        const pointsAwarded = Math.round((remainingMs / (room.roundDurationSeconds * 1000)) * 100);
        const guesser = room.members.find((member) => member.userId === authUser.id);
        if (guesser) guesser.score += pointsAwarded;
        drawer.score += 50;
        room.solvedThisRound.add(authUser.id);
        room.guessesThisRound.push({
          userId: authUser.id,
          guess: parsed.data.guess,
          correct: true,
          pointsAwarded,
        });
        ns.to(roomChannel(room.code)).emit('guess:correct', { byName: authUser.name, pointsAwarded });
        const nonDrawers = room.members.filter((member) => member.userId !== drawer.userId);
        if (nonDrawers.every((member) => room.solvedThisRound.has(member.userId))) {
          await endRound(ns, room);
        }
        ack?.({ ok: true, correct: true, pointsAwarded });
        return;
      }
      room.guessesThisRound.push({
        userId: authUser.id,
        guess: parsed.data.guess,
        correct: false,
        pointsAwarded: 0,
      });
      if (isCloseGuess(room.promptWord, parsed.data.guess)) {
        ns.to(roomChannel(room.code)).emit('guess:close', { byName: authUser.name });
      } else {
        ns.to(roomChannel(room.code)).emit('guess:message', { byName: authUser.name, guess: parsed.data.guess });
      }
      ack?.({ ok: true, correct: false });
    });

    socket.on('disconnect', async () => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      const member = room?.members.find((entry) => entry.userId === authUser.id);
      if (!room || !member) return;
      member.active = false;
      if (room.status === 'LOBBY' && room.hostUserId === authUser.id) {
        room.status = 'ABORTED';
        await withRetry(() => prisma.scribblRoom.update({
          where: { id: room.roomId },
          data: { status: 'ABORTED', endedAt: new Date() },
          select: { id: true },
        }));
        ns.to(roomChannel(room.code)).emit('room:aborted');
      }
      emitState(ns, room);
    });
  });
}

export function registerScribblSocket(): void {
  try {
    registerGameNamespace({ gameId: SCRIBBL_GAME_ID, register });
  } catch (error) {
    logger.error('Failed to register Scribbl namespace', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
