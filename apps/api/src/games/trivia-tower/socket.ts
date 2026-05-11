import type { Namespace } from 'socket.io';
import { z } from 'zod';
import { prisma, withRetry } from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';
import { registerGameNamespace, type GameSocket } from '../lib/socketNamespace.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { pointsForAnswer, submitAnswerSchema } from './content.js';
import {
  finishTriviaRoom,
  getTriviaRoom,
  joinTriviaRoom,
  publicQuestion,
  publicTriviaRoom,
  TRIVIA_TOWER_GAME_ID,
  type TriviaRoomState,
} from './state.js';

const QUESTION_MS = 15_000;

function roomChannel(code: string): string {
  return `trivia-tower:${code}`;
}

function emitState(ns: Namespace, room: TriviaRoomState): void {
  ns.to(roomChannel(room.code)).emit('room:state', publicTriviaRoom(room));
}

async function summarizeFloor(ns: Namespace, room: TriviaRoomState): Promise<void> {
  if (!room.currentQuestionStartedAt) return;
  const floor = room.currentFloor;
  room.currentQuestionStartedAt = null;
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }
  const answers = await withRetry(() => prisma.triviaAnswer.findMany({
    where: { runId: room.runId, floor },
    select: { userId: true, correct: true, pointsAwarded: true },
  }));
  ns.to(roomChannel(room.code)).emit('floor:summary', {
    floor,
    answers,
    participants: publicTriviaRoom(room).participants,
  });
  setTimeout(() => {
    void showNextQuestion(ns, room);
  }, 1800);
}

async function showNextQuestion(ns: Namespace, room: TriviaRoomState): Promise<void> {
  if (room.status !== 'ACTIVE') return;
  const nextFloor = room.currentFloor + 1;
  if (nextFloor > room.totalFloors || nextFloor > room.questions.length) {
    await finishTriviaRoom(room);
    ns.to(roomChannel(room.code)).emit('tower:results', {
      participants: publicTriviaRoom(room).participants,
    });
    emitState(ns, room);
    return;
  }
  room.currentFloor = nextFloor;
  room.currentQuestionStartedAt = Date.now();
  const question = room.questions[nextFloor - 1];
  ns.to(roomChannel(room.code)).emit('question:show', publicQuestion(question, QUESTION_MS));
  emitState(ns, room);
  room.questionTimer = setTimeout(() => {
    void summarizeFloor(ns, room);
  }, QUESTION_MS);
  room.questionTimer.unref?.();
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
        const room = await joinTriviaRoom({
          code: parsed.data.code,
          user: { id: authUser.id, name: authUser.name },
        });
        gameSocket.data.roomCode = room.code;
        await socket.join(roomChannel(room.code));
        emitState(ns, room);
        ack?.({ ok: true, room: publicTriviaRoom(room) });
      } catch (error) {
        ack?.({ ok: false, error: error instanceof Error ? error.message : 'ROOM_JOIN_FAILED' });
      }
    });

    socket.on('room:start', async () => {
      const room = gameSocket.data.roomCode ? await getTriviaRoom(gameSocket.data.roomCode) : null;
      if (!room || room.hostUserId !== authUser.id || room.status !== 'LOBBY') return;
      room.status = 'ACTIVE';
      await withRetry(() => prisma.triviaTowerRun.update({
        where: { id: room.runId },
        data: { status: 'ACTIVE', startedAt: new Date() },
        select: { id: true },
      }));
      await showNextQuestion(ns, room);
    });

    socket.on('answer:submit', async (payload: unknown, ack?: (response: unknown) => void) => {
      const room = gameSocket.data.roomCode ? await getTriviaRoom(gameSocket.data.roomCode) : null;
      const participant = room?.participants.get(authUser.id);
      if (!room || !participant || room.status !== 'ACTIVE') return;
      const parsed = submitAnswerSchema.safeParse(payload);
      if (!parsed.success) {
        ack?.({ ok: false, error: 'VALIDATION_ERROR' });
        return;
      }
      if (participant.answeredFloors.has(parsed.data.floor)) {
        ack?.({ ok: true, ignored: true });
        return;
      }
      const question = room.questions[parsed.data.floor - 1];
      if (!question || parsed.data.floor !== room.currentFloor) {
        ack?.({ ok: true, correct: false, pointsAwarded: 0, late: true });
        return;
      }
      const startedAt = room.currentQuestionStartedAt ?? Date.now() - QUESTION_MS;
      const elapsedMs = Date.now() - startedAt;
      const late = elapsedMs > QUESTION_MS;
      const correct = !late && parsed.data.selectedIndex === question.correctIndex;
      const pointsAwarded = pointsForAnswer(correct, elapsedMs, participant.streak);
      participant.answeredFloors.add(question.floor);
      if (correct) {
        participant.streak += 1;
      } else {
        participant.streak = 0;
      }
      participant.score += pointsAwarded;

      await withRetry(() => prisma.triviaAnswer.upsert({
        where: { runId_userId_floor: { runId: room.runId, userId: authUser.id, floor: question.floor } },
        update: {
          selectedIndex: parsed.data.selectedIndex,
          correct,
          responseMs: elapsedMs,
          pointsAwarded,
        },
        create: {
          runId: room.runId,
          userId: authUser.id,
          questionId: question.id,
          floor: question.floor,
          selectedIndex: parsed.data.selectedIndex,
          correct,
          responseMs: elapsedMs,
          pointsAwarded,
        },
      }));

      socket.emit('answer:result', { floor: question.floor, correct, pointsAwarded, late });
      ack?.({ ok: true, correct, pointsAwarded });
      const everyoneAnswered = Array.from(room.participants.values())
        .filter((entry) => entry.active)
        .every((entry) => entry.answeredFloors.has(question.floor));
      if (everyoneAnswered) {
        await summarizeFloor(ns, room);
      }
    });

    socket.on('disconnect', async () => {
      const room = gameSocket.data.roomCode ? await getTriviaRoom(gameSocket.data.roomCode) : null;
      const participant = room?.participants.get(authUser.id);
      if (!room || !participant) return;
      participant.active = false;
      if (room.status === 'LOBBY' && room.hostUserId === authUser.id) {
        room.status = 'ABORTED';
        await withRetry(() => prisma.triviaTowerRun.update({
          where: { id: room.runId },
          data: { status: 'ABORTED', endedAt: new Date() },
          select: { id: true },
        }));
        ns.to(roomChannel(room.code)).emit('room:aborted');
      }
      emitState(ns, room);
    });
  });
}

export function registerTriviaTowerSocket(): void {
  try {
    registerGameNamespace({ gameId: TRIVIA_TOWER_GAME_ID, register });
  } catch (error) {
    logger.error('Failed to register Trivia Tower namespace', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
