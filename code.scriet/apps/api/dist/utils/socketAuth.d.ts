import type { Socket } from 'socket.io';
export interface SocketAuthUser {
    id: string;
    name: string;
    email: string;
    role: string;
}
export declare function authenticateSocketConnection(socket: Socket, options?: {
    requireAdmin?: boolean;
}): Promise<SocketAuthUser>;
