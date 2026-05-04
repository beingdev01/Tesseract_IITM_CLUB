/**
 * In-memory quiz store — the central state manager for live quizzes.
 * The database is NEVER touched during an active quiz.
 * Only at quiz load (read questions) and quiz end (write results).
 */
import type { Server as SocketIOServer } from 'socket.io';
export interface QuizQuestionData {
    id: string;
    position: number;
    questionText: string;
    questionType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'POLL' | 'RATING' | 'MULTI_SELECT' | 'OPEN_ENDED';
    options: string[] | null;
    correctAnswer: string | null;
    timeLimitSeconds: number;
    points: number;
    mediaUrl: string | null;
}
export interface PlayerState {
    socketId: string;
    displayName: string;
    score: number;
    correctCount: number;
    totalAnswerTimeMs: number;
    streak: number;
    answeredCurrentQuestion: boolean;
    connected: boolean;
}
export interface AnswerRecord {
    answer: string;
    timeMs: number;
    isCorrect: boolean | null;
    pointsAwarded: number;
    questionId: string;
}
export interface QuizRoom {
    quizId: string;
    meta: {
        title: string;
        totalQuestions: number;
        createdBy: string;
    };
    joinCode: string | null;
    pin: string | null;
    status: 'waiting' | 'active' | 'revealing' | 'paused' | 'finished';
    currentQuestionIndex: number;
    currentQuestionStartTime: number;
    pausedTimeRemaining: number | null;
    questions: QuizQuestionData[];
    players: Map<string, PlayerState>;
    answerSubmissionLocks: Set<string>;
    currentAnswers: Map<string, AnswerRecord>;
    allAnswers: (AnswerRecord & {
        userId: string;
    })[];
    questionAnalytics: Map<string, {
        totalAnswers: number;
        correctCount: number;
        totalTimeMs: number;
        distribution: Record<string, number>;
    }>;
    autoAdvanceTimer: ReturnType<typeof setTimeout> | null;
    adminUserId: string;
    adminSocketId: string | null;
    emptyRoomTimer: ReturnType<typeof setTimeout> | null;
    persistenceRetryTimer: ReturnType<typeof setTimeout> | null;
    persistenceRetryCount: number;
    pendingFinalStatus: 'FINISHED' | 'ABANDONED' | null;
    isPersisting: boolean;
}
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    displayName: string;
    score: number;
    correctCount: number;
    totalAnswerTimeMs: number;
}
export declare function calculatePoints(question: QuizQuestionData, timeMs: number, streak: number, isCorrect: boolean): number;
export declare const quizStore: {
    initQuiz(quizId: string, questions: QuizQuestionData[], adminUserId: string, adminSocketId: string, title: string, joinCode?: string | null, pin?: string | null): QuizRoom;
    getRoom(quizId: string): QuizRoom | undefined;
    addPlayer(quizId: string, userId: string, socketId: string, displayName: string): {
        isNew: boolean;
        currentState: Partial<QuizRoom>;
    } | null;
    updateAdminSocket(quizId: string, userId: string, newSocketId: string): boolean;
    checkRateLimit(quizId: string, userId: string): boolean;
    submitAnswer(quizId: string, userId: string, answerText: string): {
        isCorrect: boolean | null;
        isPoll: boolean;
        pointsAwarded: number;
        timeMs: number;
        allAnswered: boolean;
        newScore: number;
        newStreak: number;
    } | {
        error: string;
    };
    advanceQuestion(quizId: string): {
        done: boolean;
        question?: QuizQuestionData;
        questionIndex?: number;
    };
    getLeaderboard(quizId: string): LeaderboardEntry[];
    getAnswerDistribution(quizId: string): Record<string, number>;
    persistResultsAndCleanup(quizId: string, finalStatus?: "FINISHED" | "ABANDONED"): Promise<void>;
    schedulePersistenceRetry(quizId: string): void;
    cleanupQuiz(quizId: string): void;
    markPlayerDisconnected(quizId: string, userId: string, socketId: string): {
        connectedPlayers: number;
        displayName: string;
    } | null;
    scheduleEmptyRoomCleanup(quizId: string, _io: SocketIOServer): void;
    cancelEmptyRoomCleanup(quizId: string): void;
    pauseQuiz(quizId: string): boolean;
    resumeQuiz(quizId: string): {
        remainingMs: number;
    } | null;
    kickPlayer(quizId: string, userId: string): {
        socketId: string;
        displayName: string;
    } | null;
    getAllActiveQuizIds(): string[];
    getPlayerSocketId(quizId: string, userId: string): string | null;
    getPlayersArray(quizId: string): {
        userId: string;
        displayName: string;
    }[];
    getConnectedPlayerCount(quizId: string): number;
    /** Find which quiz room a user is currently in */
    findUserQuizId(userId: string): string | null;
};
