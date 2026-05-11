import { Server } from 'socket.io';
import { authenticateSocketConnection } from '../utils/socketAuth.js';
import { logger } from '../utils/logger.js';

const ATTENDANCE_ROOM_ROLES = ['ADMIN', 'PRESIDENT', 'CORE_MEMBER'];

export function initializeAttendanceSocket(io: Server): void {
  const ns = io.of('/attendance');

  ns.use((socket, next) => {
    authenticateSocketConnection(socket)
      .then((authUser) => {
        socket.data.userId = authUser.id;
        socket.data.role = authUser.role;
        next();
      })
      .catch((error) => {
        next(error instanceof Error ? error : new Error('AUTH_INVALID'));
      });
  });

  ns.on('connection', (socket) => {
    logger.debug('Attendance socket connected', { userId: socket.data.userId });

    socket.on('join:event', (eventId: string) => {
      if (!ATTENDANCE_ROOM_ROLES.includes(socket.data.role)) {
        socket.emit('error', { message: 'Core member or admin role required' });
        return;
      }
      socket.join(`event:${eventId}`);
      logger.debug('Admin joined attendance room', { userId: socket.data.userId, eventId });
    });

    socket.on('leave:event', (eventId: string) => {
      socket.leave(`event:${eventId}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Attendance socket disconnected', { userId: socket.data.userId });
      delete socket.data.userId;
      delete socket.data.role;
    });
  });

  logger.info('Attendance socket namespace initialized on /attendance');
}
