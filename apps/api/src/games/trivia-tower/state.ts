import { prisma, withRetry } from '../../lib/prisma.js';
import { RoomStore, type BaseRoomState } from '../lib/roomStore.js';
import { generateRoomCode } from '../lib/gameSchemas.js';
import { recordGameSessionsBatch } from '../lib/sessionRecorder.js';

export const TRIVIA_TOWER_GAME_ID = 'trivia-tower';

export interface TriviaParticipant {
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
  streak: number;
  active: boolean;
  answeredFloors: Set<number>;
}

export interface TriviaQuestionState {
  id: string;
  floor: number;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface TriviaRoomState extends BaseRoomState {
  runId: string;
  status: 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
  totalFloors: number;
  currentFloor: number;
  currentQuestionStartedAt: number | null;
  questionTimer: ReturnType<typeof setTimeout> | null;
  questions: TriviaQuestionState[];
  participants: Map<string, TriviaParticipant>;
  sessionsRecorded: boolean;
}

export const triviaRooms = new RoomStore<TriviaRoomState>({
  gameId: TRIVIA_TOWER_GAME_ID,
  maxPlayersPerRoom: 20,
});

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function optionsArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];
}

function shuffleOptions(options: string[], correctIndex: number) {
  const tagged = options.map((option, index) => ({ option, correct: index === correctIndex }));
  const shuffled = shuffle(tagged);
  return {
    options: shuffled.map((entry) => entry.option),
    correctIndex: shuffled.findIndex((entry) => entry.correct),
  };
}

async function createUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRoomCode();
    const existing = await withRetry(() => prisma.triviaTowerRun.findUnique({
      where: { code },
      select: { id: true },
    }));
    if (!existing && !triviaRooms.has(code)) return code;
  }
  throw new Error('ROOM_CODE_COLLISION');
}

export function publicTriviaRoom(room: TriviaRoomState) {
  return {
    code: room.code,
    status: room.status,
    hostUserId: room.hostUserId,
    totalFloors: room.totalFloors,
    currentFloor: room.currentFloor,
    participants: Array.from(room.participants.values()).map((participant) => ({
      userId: participant.userId,
      name: participant.name,
      avatar: participant.avatar,
      score: participant.score,
      streak: participant.streak,
      active: participant.active,
      floorsAnswered: participant.answeredFloors.size,
    })),
  };
}

export function publicQuestion(question: TriviaQuestionState, deadlineMs: number) {
  return {
    floor: question.floor,
    questionId: question.id,
    prompt: question.prompt,
    options: question.options,
    deadlineMs,
  };
}

export async function createTriviaRoom(input: {
  host: { id: string; name: string; avatar?: string | null };
  totalFloors?: number;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
}): Promise<TriviaRoomState> {
  const totalFloors = input.totalFloors ?? 10;
  const questions = await withRetry(() => prisma.triviaQuestion.findMany({
    where: {
      active: true,
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    },
    orderBy: [{ floor: 'asc' }, { difficulty: 'asc' }],
    take: Math.max(totalFloors * 3, totalFloors),
  }));
  const selected = shuffle(questions).slice(0, totalFloors);
  if (selected.length < totalFloors) throw new Error('NO_QUESTIONS');

  const code = await createUniqueCode();
  const run = await withRetry(() => prisma.triviaTowerRun.create({
    data: {
      code,
      hostId: input.host.id,
      totalFloors,
    },
    select: { id: true, createdAt: true },
  }));

  const room: TriviaRoomState = {
    code,
    gameId: TRIVIA_TOWER_GAME_ID,
    hostUserId: input.host.id,
    createdAt: run.createdAt.getTime(),
    lastActivityAt: Date.now(),
    runId: run.id,
    status: 'LOBBY',
    totalFloors,
    currentFloor: 0,
    currentQuestionStartedAt: null,
    questionTimer: null,
    questions: selected.map((question, index) => {
      const shuffled = shuffleOptions(optionsArray(question.options), question.correctIndex);
      return {
        id: question.id,
        floor: index + 1,
        prompt: question.prompt,
        options: shuffled.options,
        correctIndex: shuffled.correctIndex,
      };
    }),
    participants: new Map([[input.host.id, {
      userId: input.host.id,
      name: input.host.name,
      avatar: input.host.avatar ?? null,
      score: 0,
      streak: 0,
      active: true,
      answeredFloors: new Set<number>(),
    }]]),
    sessionsRecorded: false,
  };
  triviaRooms.set(code, room);
  return room;
}

export async function getTriviaRoom(code: string): Promise<TriviaRoomState | null> {
  const room = triviaRooms.get(code);
  if (room) return room;
  const run = await withRetry(() => prisma.triviaTowerRun.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, code: true, hostId: true, status: true, totalFloors: true, createdAt: true },
  }));
  if (!run) return null;
  const loaded: TriviaRoomState = {
    code: run.code,
    gameId: TRIVIA_TOWER_GAME_ID,
    hostUserId: run.hostId,
    createdAt: run.createdAt.getTime(),
    lastActivityAt: Date.now(),
    runId: run.id,
    status: run.status,
    totalFloors: run.totalFloors,
    currentFloor: 0,
    currentQuestionStartedAt: null,
    questionTimer: null,
    questions: [],
    participants: new Map(),
    sessionsRecorded: run.status === 'FINISHED',
  };
  triviaRooms.set(run.code, loaded);
  return loaded;
}

export async function joinTriviaRoom(input: {
  code: string;
  user: { id: string; name: string; avatar?: string | null };
}): Promise<TriviaRoomState> {
  const room = await getTriviaRoom(input.code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('ROOM_ALREADY_STARTED');
  if (!room.participants.has(input.user.id)) {
    room.participants.set(input.user.id, {
      userId: input.user.id,
      name: input.user.name,
      avatar: input.user.avatar ?? null,
      score: 0,
      streak: 0,
      active: true,
      answeredFloors: new Set<number>(),
    });
  }
  room.lastActivityAt = Date.now();
  return room;
}

export async function finishTriviaRoom(room: TriviaRoomState): Promise<void> {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';
  if (room.questionTimer) {
    clearTimeout(room.questionTimer);
    room.questionTimer = null;
  }
  await withRetry(() => prisma.triviaTowerRun.update({
    where: { id: room.runId },
    data: { status: 'FINISHED', endedAt: new Date() },
    select: { id: true },
  }));
  if (!room.sessionsRecorded) {
    room.sessionsRecorded = true;
    await recordGameSessionsBatch(Array.from(room.participants.values()).map((participant) => ({
      gameId: TRIVIA_TOWER_GAME_ID,
      userId: participant.userId,
      score: participant.score,
      durationSeconds: null,
    })));
  }
}
