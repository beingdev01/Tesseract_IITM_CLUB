import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { authUser, validationError } from '../lib/http.js';
import { createRiddleRoomSchema } from './content.js';
import { createRiddleRoom, getRiddleRoom, joinRiddleRoom, publicCurrentClue, publicRiddleRoom } from './state.js';

const router = Router();

router.post('/rooms', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = createRiddleRoomSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await createRiddleRoom({
      host: { id: user.id, name: user.name, avatar: user.avatar },
      bundleId: parsed.data.bundleId,
    });
    return ApiResponse.created(res, { room: publicRiddleRoom(room) }, 'Riddle Room created');
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_BUNDLE') {
      return ApiResponse.notFound(res, 'No active riddle bundle is available');
    }
    logger.error('Failed to create Riddle Room', {
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to create room');
  }
});

router.post('/rooms/:code/join', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await joinRiddleRoom({
      code: parsed.data,
      user: { id: user.id, name: user.name, avatar: user.avatar },
    });
    return ApiResponse.success(res, { room: publicRiddleRoom(room) }, 'Joined Riddle Room');
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') return ApiResponse.notFound(res, 'Room not found');
    if (error instanceof Error && error.message === 'ROOM_FULL') return ApiResponse.conflict(res, 'Room is full');
    if (error instanceof Error && error.message === 'ROOM_ALREADY_STARTED') return ApiResponse.conflict(res, 'Room already started');
    logger.error('Failed to join Riddle Room', {
      code: req.params.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to join room');
  }
});

router.get('/rooms/:code', gameAuth, async (req: Request, res: Response) => {
  try {
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await getRiddleRoom(parsed.data);
    if (!room) return ApiResponse.notFound(res, 'Room not found');
    return ApiResponse.success(res, {
      room: publicRiddleRoom(room),
      currentClue: room.status === 'ACTIVE' ? publicCurrentClue(room) : null,
    });
  } catch (error) {
    logger.error('Failed to fetch Riddle Room', {
      code: req.params.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch room');
  }
});

export { router as riddleRoomRouter };
