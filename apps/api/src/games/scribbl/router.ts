import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { authUser, validationError } from '../lib/http.js';
import { createScribblRoomSchema } from './content.js';
import { createScribblRoom, getScribblRoom, joinScribblRoom, publicScribblRoom } from './state.js';

const router = Router();

router.post('/rooms', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = createScribblRoomSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await createScribblRoom({
      host: { id: user.id, name: user.name, avatar: user.avatar },
      roundCount: parsed.data.roundCount,
      roundDurationSeconds: parsed.data.roundDurationSeconds,
    });
    return ApiResponse.created(res, { room: publicScribblRoom(room) }, 'Scribbl room created');
  } catch (error) {
    logger.error('Failed to create Scribbl room', { error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to create room');
  }
});

router.post('/rooms/:code/join', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await joinScribblRoom({
      code: parsed.data,
      user: { id: user.id, name: user.name, avatar: user.avatar },
    });
    return ApiResponse.success(res, { room: publicScribblRoom(room) }, 'Joined Scribbl room');
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') return ApiResponse.notFound(res, 'Room not found');
    if (error instanceof Error && error.message === 'ROOM_ALREADY_STARTED') return ApiResponse.conflict(res, 'Room already started');
    logger.error('Failed to join Scribbl room', { code: req.params.code, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to join room');
  }
});

router.get('/rooms/:code', gameAuth, async (req: Request, res: Response) => {
  try {
    const parsed = roomCodeSchema.safeParse(req.params.code);
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await getScribblRoom(parsed.data);
    if (!room) return ApiResponse.notFound(res, 'Room not found');
    return ApiResponse.success(res, { room: publicScribblRoom(room) });
  } catch (error) {
    logger.error('Failed to fetch Scribbl room', { code: req.params.code, error: error instanceof Error ? error.message : String(error) });
    return ApiResponse.internal(res, 'Failed to fetch room');
  }
});

export { router as scribblRouter };
