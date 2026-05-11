import { prisma, withRetry } from '../../lib/prisma.js';
import { RoomStore, type BaseRoomState } from '../lib/roomStore.js';
import { generateRoomCode } from '../lib/gameSchemas.js';
import { recordGameSessionsBatch } from '../lib/sessionRecorder.js';

export const SCRIBBL_GAME_ID = 'scribbl';

export interface ScribblMember {
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
  active: boolean;
}

export interface ScribblGuessRecord {
  userId: string;
  guess: string;
  correct: boolean;
  pointsAwarded: number;
}

export interface ScribblRoomState extends BaseRoomState {
  roomId: string;
  status: 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
  roundCount: number;
  roundDurationSeconds: number;
  currentRound: number;
  drawerIndex: number;
  promptWord: string | null;
  roundStartedAt: number | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
  strokeWindowStartedAt: number;
  strokeCount: number;
  solvedThisRound: Set<string>;
  guessesThisRound: ScribblGuessRecord[];
  members: ScribblMember[];
  sessionsRecorded: boolean;
}

export const scribblRooms = new RoomStore<ScribblRoomState>({
  gameId: SCRIBBL_GAME_ID,
  maxPlayersPerRoom: 16,
});

async function createUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRoomCode();
    const existing = await withRetry(() => prisma.scribblRoom.findUnique({
      where: { code },
      select: { id: true },
    }));
    if (!existing && !scribblRooms.has(code)) return code;
  }
  throw new Error('ROOM_CODE_COLLISION');
}

export function publicScribblRoom(room: ScribblRoomState) {
  return {
    code: room.code,
    status: room.status,
    hostUserId: room.hostUserId,
    roundCount: room.roundCount,
    roundDurationSeconds: room.roundDurationSeconds,
    currentRound: room.currentRound,
    drawerId: room.members[room.drawerIndex]?.userId ?? null,
    drawerName: room.members[room.drawerIndex]?.name ?? null,
    members: room.members.map((member) => ({
      userId: member.userId,
      name: member.name,
      avatar: member.avatar,
      score: member.score,
      active: member.active,
    })),
  };
}

export async function createScribblRoom(input: {
  host: { id: string; name: string; avatar?: string | null };
  roundCount?: number;
  roundDurationSeconds?: number;
}): Promise<ScribblRoomState> {
  const code = await createUniqueCode();
  const roomRow = await withRetry(() => prisma.scribblRoom.create({
    data: {
      code,
      hostId: input.host.id,
      roundCount: input.roundCount ?? 3,
      roundDurationSeconds: input.roundDurationSeconds ?? 80,
    },
    select: { id: true, createdAt: true, roundCount: true, roundDurationSeconds: true },
  }));
  const room: ScribblRoomState = {
    code,
    gameId: SCRIBBL_GAME_ID,
    hostUserId: input.host.id,
    createdAt: roomRow.createdAt.getTime(),
    lastActivityAt: Date.now(),
    roomId: roomRow.id,
    status: 'LOBBY',
    roundCount: roomRow.roundCount,
    roundDurationSeconds: roomRow.roundDurationSeconds,
    currentRound: 0,
    drawerIndex: 0,
    promptWord: null,
    roundStartedAt: null,
    roundTimer: null,
    strokeWindowStartedAt: 0,
    strokeCount: 0,
    solvedThisRound: new Set<string>(),
    guessesThisRound: [],
    members: [{
      userId: input.host.id,
      name: input.host.name,
      avatar: input.host.avatar ?? null,
      score: 0,
      active: true,
    }],
    sessionsRecorded: false,
  };
  scribblRooms.set(code, room);
  return room;
}

export async function getScribblRoom(code: string): Promise<ScribblRoomState | null> {
  const existing = scribblRooms.get(code);
  if (existing) return existing;
  const roomRow = await withRetry(() => prisma.scribblRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: { host: { select: { id: true, name: true, avatar: true } } },
  }));
  if (!roomRow) return null;
  const room: ScribblRoomState = {
    code: roomRow.code,
    gameId: SCRIBBL_GAME_ID,
    hostUserId: roomRow.hostId,
    createdAt: roomRow.createdAt.getTime(),
    lastActivityAt: Date.now(),
    roomId: roomRow.id,
    status: roomRow.status,
    roundCount: roomRow.roundCount,
    roundDurationSeconds: roomRow.roundDurationSeconds,
    currentRound: 0,
    drawerIndex: 0,
    promptWord: null,
    roundStartedAt: null,
    roundTimer: null,
    strokeWindowStartedAt: 0,
    strokeCount: 0,
    solvedThisRound: new Set<string>(),
    guessesThisRound: [],
    members: [{
      userId: roomRow.host.id,
      name: roomRow.host.name,
      avatar: roomRow.host.avatar,
      score: 0,
      active: false,
    }],
    sessionsRecorded: roomRow.status === 'FINISHED',
  };
  scribblRooms.set(room.code, room);
  return room;
}

export async function joinScribblRoom(input: {
  code: string;
  user: { id: string; name: string; avatar?: string | null };
}): Promise<ScribblRoomState> {
  const room = await getScribblRoom(input.code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('ROOM_ALREADY_STARTED');
  const existing = room.members.find((member) => member.userId === input.user.id);
  if (existing) {
    existing.active = true;
  } else {
    room.members.push({
      userId: input.user.id,
      name: input.user.name,
      avatar: input.user.avatar ?? null,
      score: 0,
      active: true,
    });
  }
  room.lastActivityAt = Date.now();
  return room;
}

export async function randomScribblPrompt(): Promise<string> {
  const prompts = await withRetry(() => prisma.scribblPrompt.findMany({
    where: { active: true },
    select: { word: true },
    take: 200,
  }));
  if (prompts.length === 0) throw new Error('NO_PROMPTS');
  return prompts[Math.floor(Math.random() * prompts.length)].word;
}

export async function completeScribblGame(room: ScribblRoomState): Promise<void> {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';
  await withRetry(() => prisma.scribblRoom.update({
    where: { id: room.roomId },
    data: { status: 'FINISHED', endedAt: new Date() },
    select: { id: true },
  }));
  if (!room.sessionsRecorded) {
    room.sessionsRecorded = true;
    await recordGameSessionsBatch(room.members.map((member) => ({
      gameId: SCRIBBL_GAME_ID,
      userId: member.userId,
      score: member.score,
      durationSeconds: null,
    })));
  }
}
