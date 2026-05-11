import { Router, type Request, type Response } from 'express';
import { ApiResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { gameAuth } from '../lib/gameAuth.js';
import { roomCodeSchema } from '../lib/gameSchemas.js';
import { authUser, validationError } from '../lib/http.js';
import { createTriviaRoomSchema } from './content.js';
import { createTriviaRoom, getTriviaRoom, joinTriviaRoom, publicTriviaRoom } from './state.js';

const router = Router();

router.post('/rooms', gameAuth, async (req: Request, res: Response) => {
  try {
    const user = authUser(req, res);
    if (!user) return undefined;
    const parsed = createTriviaRoomSchema.safeParse(req.body || {});
    if (!parsed.success) return validationError(res, parsed.error);
    const room = await createTriviaRoom({
      host: { id: user.id, name: user.name, avatar: user.avatar },
      totalFloors: parsed.data.totalFloors,
      difficulty: parsed.data.difficulty,
    });
    return ApiResponse.created(res, { room: publicTriviaRoom(room) }, 'Trivia Tower room created');
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_QUESTIONS') {
      return ApiResponse.notFound(res, 'Not enough active trivia questions are available');
    }
    logger.error('Failed to create Trivia Tower room', {
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
    const room = await joinTriviaRoom({
      code: parsed.data,
      user: { id: user.id, name: user.name, avatar: user.avatar },
    });
    return ApiResponse.success(res, { room: publicTriviaRoom(room) }, 'Joined Trivia Tower room');
  } catch (error) {
    if (error instanceof Error && error.message === 'ROOM_NOT_FOUND') return ApiResponse.notFound(res, 'Room not found');
    if (error instanceof Error && error.message === 'ROOM_ALREADY_STARTED') return ApiResponse.conflict(res, 'Run already started');
    logger.error('Failed to join Trivia Tower room', {
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
    const room = await getTriviaRoom(parsed.data);
    if (!room) return ApiResponse.notFound(res, 'Room not found');
    return ApiResponse.success(res, { room: publicTriviaRoom(room) });
  } catch (error) {
    logger.error('Failed to fetch Trivia Tower room', {
      code: req.params.code,
      error: error instanceof Error ? error.message : String(error),
    });
    return ApiResponse.internal(res, 'Failed to fetch room');
  }
});

export { router as triviaTowerRouter };
