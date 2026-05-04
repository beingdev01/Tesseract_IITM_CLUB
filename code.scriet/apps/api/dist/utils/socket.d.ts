import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
export declare function initializeSocket(httpServer: HTTPServer): SocketIOServer<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function getIO(): SocketIOServer | null;
export declare const socketEvents: {
    userCreated: (userId: string) => void;
    userUpdated: (userId: string) => void;
    userDeleted: (userId: string) => void;
};
