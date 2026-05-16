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

const pointSchema = z.object({ x: z.number(), y: z.number() });
const singleStrokeSchema = z.object({
  from: pointSchema,
  to: pointSchema,
  color: z.string().max(40),
  size: z.number().min(1).max(80),
  erase: z.boolean().optional(),
});
const strokeSchema = z.object({
  strokes: z.array(singleStrokeSchema).max(30),
});

const STROKE_BUCKET_MAX = 90; // burst tolerance per second
const STROKE_REFILL_PER_MS = 90 / 1000; // 90 strokes per second steady state

function roomChannel(code: string): string {
  return `scribbl:${code}`;
}

function emitState(ns: Namespace, room: ScribblRoomState): void {
  ns.to(roomChannel(room.code)).emit('room:state', publicScribblRoom(room));
}

function findDrawer(room: ScribblRoomState) {
  if (!room.currentDrawerId) return null;
  return room.members.find((m) => m.userId === room.currentDrawerId) ?? null;
}

function pickNextDrawer(room: ScribblRoomState): typeof room.members[number] | null {
  const active = room.members.filter((m) => m.active);
  if (active.length === 0) return null;
  if (!room.currentDrawerId) return active[0] ?? null;
  const currentIdx = active.findIndex((m) => m.userId === room.currentDrawerId);
  if (currentIdx === -1) return active[0] ?? null;
  return active[(currentIdx + 1) % active.length] ?? null;
}

async function persistRound(room: ScribblRoomState): Promise<void> {
  if (!room.promptWord || !room.roundStartedAt) return;
  const drawer = findDrawer(room);
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
  const activeMembers = room.members.filter((m) => m.active);
  const totalRounds = room.roundCount * Math.max(1, activeMembers.length);
  if (room.currentRound >= totalRounds || activeMembers.length < 2) {
    await completeScribblGame(room);
    ns.to(roomChannel(room.code)).emit('game:end', { finalScores: publicScribblRoom(room).members });
    emitState(ns, room);
    return;
  }
  const next = pickNextDrawer(room);
  room.currentDrawerId = next?.userId ?? null;
  setTimeout(() => {
    void startRound(ns, room);
  }, 5000);
}

async function startRound(ns: Namespace, room: ScribblRoomState): Promise<void> {
  if (room.status !== 'ACTIVE') return;
  if (!room.currentDrawerId) {
    const first = pickNextDrawer(room);
    if (!first) return;
    room.currentDrawerId = first.userId;
  }
  const drawer = findDrawer(room);
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

    socket.on('room:start', async (_payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.hostUserId !== authUser.id || room.status !== 'LOBBY') {
        ack?.({ ok: false, error: 'NOT_HOST_OR_NOT_LOBBY' });
        return;
      }
      const activeCount = room.members.filter((m) => m.active).length;
      if (activeCount < 2) {
        ack?.({ ok: false, error: 'NEED_MORE_PLAYERS', minPlayers: 2, currentPlayers: activeCount });
        return;
      }
      ack?.({ ok: true });
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
      const drawer = findDrawer(room);
      if (!drawer || drawer.userId !== authUser.id) return;
      const parsed = strokeSchema.safeParse(payload);
      if (!parsed.success) return;
      // Token bucket: refill since last tick, then debit one token per stroke
      const now = Date.now();
      const elapsed = Math.max(0, now - room.strokeBudgetUpdatedAt);
      room.strokeBudget = Math.min(STROKE_BUCKET_MAX, room.strokeBudget + elapsed * STROKE_REFILL_PER_MS);
      room.strokeBudgetUpdatedAt = now;
      if (room.strokeBudget < parsed.data.strokes.length) {
        // Drop excess silently; client sees no stroke from itself or others
        return;
      }
      room.strokeBudget -= parsed.data.strokes.length;
      socket.to(roomChannel(room.code)).emit('canvas:stroke', parsed.data);
    });

    socket.on('canvas:clear', async () => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || findDrawer(room)?.userId !== authUser.id) return;
      socket.to(roomChannel(room.code)).emit('canvas:clear');
    });

    socket.on('guess:submit', async (payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getScribblRoom(gameSocket.data.roomCode) : null;
      if (!room || room.status !== 'ACTIVE' || !room.promptWord || !room.roundStartedAt) return;
      const drawer = findDrawer(room);
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
