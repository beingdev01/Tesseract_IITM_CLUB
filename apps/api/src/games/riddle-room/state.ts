import { prisma, withRetry } from '../../lib/prisma.js';
import { sanitizeText } from '../../utils/sanitize.js';
import { RoomStore, type BaseRoomState } from '../lib/roomStore.js';
import { generateRoomCode } from '../lib/gameSchemas.js';
import { recordGameSessionsBatch } from '../lib/sessionRecorder.js';

export const RIDDLE_ROOM_GAME_ID = 'riddle-room';

export interface RiddleMemberState {
  userId: string;
  name: string;
  avatar: string | null;
  pointsAwarded: number;
  active: boolean;
}

export interface RiddleClueState {
  id: string;
  order: number;
  title: string;
  prompt: string;
  answer: string;
  hint: string | null;
  lockSeconds: number;
  basePoints: number;
}

export interface RiddleRoomState extends BaseRoomState {
  roomId: string;
  status: 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
  bundleId: string | null;
  bundleName: string;
  currentOrder: number;
  lockUntil: number;
  hintsUsed: Set<number>;
  members: Map<string, RiddleMemberState>;
  clues: RiddleClueState[];
  sessionsRecorded: boolean;
}

export const riddleRooms = new RoomStore<RiddleRoomState>({
  gameId: RIDDLE_ROOM_GAME_ID,
  maxPlayersPerRoom: 8,
});

async function createUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateRoomCode();
    const existing = await withRetry(() => prisma.riddleRoom.findUnique({
      where: { code },
      select: { id: true },
    }));
    if (!existing && !riddleRooms.has(code)) return code;
  }
  throw new Error('ROOM_CODE_COLLISION');
}

function publicMember(member: RiddleMemberState) {
  return {
    userId: member.userId,
    name: member.name,
    avatar: member.avatar,
    pointsAwarded: member.pointsAwarded,
    active: member.active,
  };
}

export function publicRiddleRoom(room: RiddleRoomState) {
  return {
    code: room.code,
    status: room.status,
    hostUserId: room.hostUserId,
    bundleName: room.bundleName,
    currentOrder: room.currentOrder,
    totalClues: room.clues.length,
    members: Array.from(room.members.values()).map(publicMember),
  };
}

export function publicCurrentClue(room: RiddleRoomState) {
  const clue = room.clues[room.currentOrder];
  if (!clue) return null;
  return {
    order: clue.order,
    title: clue.title,
    prompt: clue.prompt,
    basePoints: clue.basePoints,
    lockSeconds: clue.lockSeconds,
  };
}

async function loadBundle(bundleId?: string | null) {
  const bundle = bundleId
    ? await withRetry(() => prisma.riddleBundle.findUnique({
      where: { id: bundleId },
      include: { clues: { orderBy: { order: 'asc' }, include: { clue: true } } },
    }))
    : await withRetry(() => prisma.riddleBundle.findFirst({
      where: { active: true },
      include: { clues: { orderBy: { order: 'asc' }, include: { clue: true } } },
      orderBy: { updatedAt: 'desc' },
    }));
  if (!bundle || bundle.clues.length === 0) throw new Error('NO_BUNDLE');
  return bundle;
}

export async function createRiddleRoom(input: {
  host: { id: string; name: string; avatar?: string | null };
  bundleId?: string;
}): Promise<RiddleRoomState> {
  const bundle = await loadBundle(input.bundleId);
  const code = await createUniqueCode();
  const roomRow = await withRetry(() => prisma.riddleRoom.create({
    data: {
      code,
      hostId: input.host.id,
      bundleId: bundle.id,
      members: { create: { userId: input.host.id } },
    },
    select: { id: true, createdAt: true },
  }));
  const room: RiddleRoomState = {
    code,
    gameId: RIDDLE_ROOM_GAME_ID,
    hostUserId: input.host.id,
    createdAt: roomRow.createdAt.getTime(),
    lastActivityAt: Date.now(),
    roomId: roomRow.id,
    status: 'LOBBY',
    bundleId: bundle.id,
    bundleName: bundle.name,
    currentOrder: 0,
    lockUntil: 0,
    hintsUsed: new Set<number>(),
    members: new Map([[input.host.id, {
      userId: input.host.id,
      name: input.host.name,
      avatar: input.host.avatar ?? null,
      pointsAwarded: 0,
      active: true,
    }]]),
    clues: bundle.clues.map((entry) => ({
      id: entry.clue.id,
      order: entry.order,
      title: entry.clue.title,
      prompt: entry.clue.prompt,
      answer: entry.clue.answer,
      hint: entry.clue.hint,
      lockSeconds: entry.clue.lockSeconds,
      basePoints: entry.clue.basePoints,
    })),
    sessionsRecorded: false,
  };
  riddleRooms.set(code, room);
  return room;
}

export async function getRiddleRoom(code: string): Promise<RiddleRoomState | null> {
  const existing = riddleRooms.get(code);
  if (existing) return existing;
  const roomRow = await withRetry(() => prisma.riddleRoom.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      bundle: { include: { clues: { orderBy: { order: 'asc' }, include: { clue: true } } } },
      members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  }));
  if (!roomRow || !roomRow.bundle) return null;
  const room: RiddleRoomState = {
    code: roomRow.code,
    gameId: RIDDLE_ROOM_GAME_ID,
    hostUserId: roomRow.hostId,
    createdAt: roomRow.createdAt.getTime(),
    lastActivityAt: Date.now(),
    roomId: roomRow.id,
    status: roomRow.status,
    bundleId: roomRow.bundleId,
    bundleName: roomRow.bundle.name,
    currentOrder: roomRow.currentOrder,
    lockUntil: 0,
    hintsUsed: new Set<number>(),
    members: new Map(roomRow.members.map((member) => [member.userId, {
      userId: member.userId,
      name: member.user.name,
      avatar: member.user.avatar,
      pointsAwarded: member.pointsAwarded,
      active: false,
    }])),
    clues: roomRow.bundle.clues.map((entry) => ({
      id: entry.clue.id,
      order: entry.order,
      title: entry.clue.title,
      prompt: entry.clue.prompt,
      answer: entry.clue.answer,
      hint: entry.clue.hint,
      lockSeconds: entry.clue.lockSeconds,
      basePoints: entry.clue.basePoints,
    })),
    sessionsRecorded: roomRow.status === 'FINISHED',
  };
  riddleRooms.set(room.code, room);
  return room;
}

export async function joinRiddleRoom(input: {
  code: string;
  user: { id: string; name: string; avatar?: string | null };
}): Promise<RiddleRoomState> {
  const room = await getRiddleRoom(input.code);
  if (!room) throw new Error('ROOM_NOT_FOUND');
  if (room.status !== 'LOBBY') throw new Error('ROOM_ALREADY_STARTED');
  if (!room.members.has(input.user.id) && room.members.size >= 8) throw new Error('ROOM_FULL');
  if (!room.members.has(input.user.id)) {
    await withRetry(() => prisma.riddleRoomMember.create({
      data: { roomId: room.roomId, userId: input.user.id },
    }));
    room.members.set(input.user.id, {
      userId: input.user.id,
      name: input.user.name,
      avatar: input.user.avatar ?? null,
      pointsAwarded: 0,
      active: true,
    });
  } else {
    const member = room.members.get(input.user.id);
    if (member) member.active = true;
  }
  room.lastActivityAt = Date.now();
  return room;
}

export async function completeRiddleRoom(room: RiddleRoomState): Promise<void> {
  if (room.status === 'FINISHED') return;
  room.status = 'FINISHED';
  await withRetry(() => prisma.riddleRoom.update({
    where: { id: room.roomId },
    data: { status: 'FINISHED', endedAt: new Date() },
    select: { id: true },
  }));
  if (!room.sessionsRecorded) {
    room.sessionsRecorded = true;
    await recordGameSessionsBatch(Array.from(room.members.values()).map((member) => ({
      gameId: RIDDLE_ROOM_GAME_ID,
      userId: member.userId,
      score: member.pointsAwarded,
      durationSeconds: null,
    })));
  }
}

export function sanitizeChatMessage(message: string): string {
  return sanitizeText(message).trim().slice(0, 500);
}
