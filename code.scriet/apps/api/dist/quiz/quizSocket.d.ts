/**
 * Socket.io quiz event handler.
 * All quiz real-time events are handled here.
 */
import type { Server as SocketIOServer } from 'socket.io';
declare function extendQuestionStartTime(currentQuestionStartTime: number, extraSeconds: number): number;
export declare function initQuizSocket(io: SocketIOServer): import("socket.io").Namespace<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const quizSocketTestUtils: {
    extendQuestionStartTime: typeof extendQuestionStartTime;
};
export {};
