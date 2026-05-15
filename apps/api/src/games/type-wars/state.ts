import { prisma, withRetry } from '../../lib/prisma.js';
import { RoomStore, type BaseRoomState } from '../lib/roomStore.js';
import { generateRoomCode } from '../lib/gameSchemas.js';
import { recordGameSessionsBatch } from '../lib/sessionRecorder.js';
import { scoreForRank } from './content.js';

export const TYPE_WARS_GAME_ID = 'type-wars';
const MAX_PLAYERS = 6;

export interface TypeWarsParticipantView {
  userId: string;
  name: string;
  avatar: string | null;
  ready: boolean;
  charsTyped: number;
  active: boolean;
  finished: boolean;
  wpm: number;
  accuracy: number;
  rank: number | null;
  score: number;
}

interface TypeWarsParticipantState extends TypeWarsParticipantView {
  lastProgressAt: number;
  finishedAt: number | null;
  durationSeconds: number | null;
}

export interface TypeWarsRoomState extends BaseRoomState {
  raceId: string;
  status: 'LOBBY' | 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'ABORTED';
  passage: { id: string; text: string; wordCount: number };
  participants: Map<string, TypeWarsParticipantState>;
  startedAt: number | null;
  finishTimer: ReturnType<typeof setTimeout> | null;
  sessionsRecorded: boolean;
  finalizingPromise?: Promise<void>;
}

export const typeWarsRooms = new RoomStore<TypeWarsRoomState>({
  gameId: TYPE_WARS_GAME_ID,
  maxPlayersPerRoom: MAX_PLAYERS,
  onEvict: (room) => {
    if (room.finishTimer) {
      clearTimeout(room.finishTimer);
      room.finishTimer = null;
    }
  },
});

function participantView(participant: TypeWarsParticipantState): TypeWarsParticipantView {
  return {
    userId: participant.userId,
    name: participant.name,
    avatar: participant.avatar,
    ready: participant.ready,
    charsTyped: participant.charsTyped,
    active: participant.active,
    finished: participant.finished,
    wpm: participant.wpm,
    accuracy: participant.accuracy,
    rank: participant.rank,
    score: participant.score,
  };
}

export function serializeTypeWarsRoom(room: TypeWarsRoomState) {
  const racing = room.status === 'RACING' || room.status === 'FINISHED';
  return {
    code: room.code,
    status: room.status,
    hostUserId: room.hostUserId,
    startedAt: room.startedAt,
    passage: racing
      ? room.passage
      : { id: room.passage.id, wordCount: room.passage.wordCount },
    participants: Array.from(room.participants.values()).map(participantView),
  };
}

async function createUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRoomCode();
    const existing = await withRetry(() => prisma.typeWarsRace.findUnique({
      where: { code },
      select: { id: true },
    }));
    if (!existing && !typeWarsRooms.has(code)) return code;
  }
  throw new Error('ROOM_CODE_COLLISION');
}

export async function createTypeWarsRoom(input: {
  host: { id: string; name: string; avatar?: string | null };
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}) {
  const passages = await withRetry(() => prisma.typeWarsPassage.findMany({
    where: {
      active: true,
      ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    },
    select: { id: true, text: true, wordCount: true },
    take: 50,
  }));

  if (passages.length === 0) {
    throw new Error('NO_PASSAGES');
  }

  const passage = passages[Math.floor(Math.random() * passages.length)];
  const code = await createUniqueCode();
  const race = await withRetry(() => prisma.typeWarsRace.create({
    data: {
      code,
      hostId: input.host.id,
      passageId: passage.id,
      participants: {
        create: { userId: input.host.id },
      },
    },
    select: { id: true, code: true, createdAt: true },
  }));

  const room: TypeWarsRoomState = {
    code: race.code,
    gameId: TYPE_WARS_GAME_ID,
    hostUserId: input.host.id,
    createdAt: race.createdAt.getTime(),
    lastActivityAt: Date.now(),
    raceId: race.id,
    status: 'LOBBY',
    passage,
    startedAt: null,
    finishTimer: null,
    sessionsRecorded: false,
    participants: new Map([
      [input.host.id, {
        userId: input.host.id,
        name: input.host.name,
        avatar: input.host.avatar ?? null,
        ready: false,
        charsTyped: 0,
        active: true,
        finished: false,
        wpm: 0,
        accuracy: 0,
        rank: null,
        score: 0,
        lastProgressAt: 0,
        finishedAt: null,
        durationSeconds: null,
      }],
    ]),
  };

  typeWarsRooms.set(race.code, room);
  return room;
}

export async function getOrLoadTypeWarsRoom(code: string): Promise<TypeWarsRoomState | null> {
  const normalizedCode = code.toUpperCase();
  const existing = typeWarsRooms.get(normalizedCode);
  if (existing) return existing;

  const race = await withRetry(() => prisma.typeWarsRace.findUnique({
    where: { code: normalizedCode },
    include: {
      passage: { select: { id: true, text: true, wordCount: true } },
      participants: {
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  }));

  if (!race) return null;

  const room: TypeWarsRoomState = {
    code: race.code,
    gameId: TYPE_WARS_GAME_ID,
    hostUserId: race.hostId,
    createdAt: race.createdAt.getTime(),
    lastActivityAt: Date.now(),
    raceId: race.id,
    status: race.status,
    passage: race.passage,
    startedAt: race.startedAt?.getTime() ?? null,
    finishTimer: null,
    sessionsRecorded: race.status === 'FINISHED',
    participants: new Map(race.participants.map((entry) => {
      const finishedAt = entry.finishedAt?.getTime() ?? null;
      return [entry.userId, {
        userId: entry.userId,
        name: entry.user.name,
        avatar: entry.user.avatar,
        ready: false,
        charsTyped: finishedAt ? race.passage.text.length : 0,
        active: false,
        finished: Boolean(finishedAt),
        wpm: entry.wpm,
        accuracy: entry.accuracy,
        rank: entry.rank,
        score: entry.rank ? scoreForRank(entry.wpm, entry.rank) : 0,
        lastProgressAt: 0,
        finishedAt,
        durationSeconds: null,
      }];
    })),
  };

  typeWarsRooms.set(race.code, room);
  return room;
}

export async function joinTypeWarsRoom(input: {
  code: string;
  user: { id: string; name: string; avatar?: string | null };
}): Promise<TypeWarsRoomState> {
  const room = await getOrLoadTypeWarsRoom(input.code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('ROOM_ALREADY_STARTED');
  if (!room.participants.has(input.user.id) && room.participants.size >= MAX_PLAYERS) {
    throw new Error('ROOM_FULL');
  }

  if (!room.participants.has(input.user.id)) {
    await withRetry(() => prisma.typeWarsParticipant.create({
      data: { raceId: room.raceId, userId: input.user.id },
      select: { id: true },
    }));
    room.participants.set(input.user.id, {
      userId: input.user.id,
      name: input.user.name,
      avatar: input.user.avatar ?? null,
      ready: false,
      charsTyped: 0,
      active: true,
      finished: false,
      wpm: 0,
      accuracy: 0,
      rank: null,
      score: 0,
      lastProgressAt: 0,
      finishedAt: null,
      durationSeconds: null,
    });
  }

  typeWarsRooms.touch(room.code);
  return room;
}

export function finalizeTypeWarsRoom(room: TypeWarsRoomState): Promise<void> {
  if (room.status === 'FINISHED') return Promise.resolve();
  if (room.finalizingPromise) return room.finalizingPromise;
  room.finalizingPromise = doFinalizeTypeWarsRoom(room);
  return room.finalizingPromise;
}

async function doFinalizeTypeWarsRoom(room: TypeWarsRoomState): Promise<void> {
  room.status = 'FINISHED';
  room.lastActivityAt = Date.now();
  if (room.finishTimer) {
    clearTimeout(room.finishTimer);
    room.finishTimer = null;
  }

  const ranked = Array.from(room.participants.values())
    .map((participant) => ({
      ...participant,
      finishedAt: participant.finishedAt ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.finishedAt - b.finishedAt || b.wpm - a.wpm);

  ranked.forEach((participant, index) => {
    const live = room.participants.get(participant.userId);
    if (!live) return;
    live.finished = true;
    live.rank = index + 1;
    live.score = scoreForRank(live.wpm, live.rank);
  });

  await withRetry(() => prisma.$transaction([
    prisma.typeWarsRace.update({
      where: { id: room.raceId },
      data: { status: 'FINISHED', endedAt: new Date() },
    }),
    ...Array.from(room.participants.values()).map((participant) => prisma.typeWarsParticipant.update({
      where: {
        raceId_userId: { raceId: room.raceId, userId: participant.userId },
      },
      data: {
        wpm: participant.wpm,
        accuracy: participant.accuracy,
        rank: participant.rank,
        finishedAt: participant.finishedAt ? new Date(participant.finishedAt) : null,
      },
    })),
  ]));

  if (!room.sessionsRecorded) {
    room.sessionsRecorded = true;
    await recordGameSessionsBatch(Array.from(room.participants.values()).map((participant) => ({
      gameId: TYPE_WARS_GAME_ID,
      userId: participant.userId,
      score: participant.score,
      durationSeconds: participant.durationSeconds,
    })));
  }
}

export function markTypeWarsParticipantActive(room: TypeWarsRoomState, userId: string, active: boolean): void {
  const participant = room.participants.get(userId);
  if (participant) {
    participant.active = active;
    room.lastActivityAt = Date.now();
  }
}
