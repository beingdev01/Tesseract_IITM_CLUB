import assert from 'node:assert/strict';
import test from 'node:test';
import { initQuizSocket, quizSocketTestUtils } from './quizSocket.js';
import { quizStore } from './quizStore.js';
test('extendQuestionStartTime moves the question start forward', () => {
    const startTime = 1_000_000;
    const updatedStartTime = quizSocketTestUtils.extendQuestionStartTime(startTime, 15);
    assert.equal(updatedStartTime, startTime + 15_000);
});
test('extendQuestionStartTime moves the question start backward when reducing time', () => {
    const startTime = 1_000_000;
    const updatedStartTime = quizSocketTestUtils.extendQuestionStartTime(startTime, -10);
    assert.equal(updatedStartTime, startTime - 10_000);
});
test('checkRateLimit is scoped per quiz', () => {
    const userId = `rate-user-${Date.now()}`;
    const quizA = `quiz-a-${Date.now()}`;
    const quizB = `quiz-b-${Date.now()}`;
    assert.equal(quizStore.checkRateLimit(quizA, userId), true);
    assert.equal(quizStore.checkRateLimit(quizB, userId), true);
    assert.equal(quizStore.checkRateLimit(quizA, userId), false);
});
test('submitAnswer prevents duplicate scoring and resets lock on next question', () => {
    const quizId = `dup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const userId = 'player-double-submit';
    quizStore.initQuiz(quizId, [
        {
            id: 'q1',
            position: 1,
            questionText: '1 + 1 = ? ',
            questionType: 'MCQ',
            options: ['2', '3'],
            correctAnswer: '2',
            timeLimitSeconds: 20,
            points: 100,
            mediaUrl: null,
        },
        {
            id: 'q2',
            position: 2,
            questionText: '2 + 2 = ?',
            questionType: 'MCQ',
            options: ['4', '5'],
            correctAnswer: '4',
            timeLimitSeconds: 20,
            points: 100,
            mediaUrl: null,
        },
    ], 'admin-user', 'admin-socket', 'Double Submit Quiz');
    quizStore.addPlayer(quizId, userId, 'socket-1', 'Player One');
    const room = quizStore.getRoom(quizId);
    assert.ok(room);
    const firstAdvance = quizStore.advanceQuestion(quizId);
    assert.equal(firstAdvance.done, false);
    room.currentQuestionStartTime = Date.now();
    const first = quizStore.submitAnswer(quizId, userId, '2');
    assert.equal('error' in first, false);
    const second = quizStore.submitAnswer(quizId, userId, '2');
    assert.equal('error' in second && second.error, 'ALREADY_ANSWERED');
    const secondAdvance = quizStore.advanceQuestion(quizId);
    assert.equal(secondAdvance.done, false);
    room.currentQuestionStartTime = Date.now();
    const third = quizStore.submitAnswer(quizId, userId, '4');
    assert.equal('error' in third, false);
    quizStore.cleanupQuiz(quizId);
});
class FakeSocket {
    id;
    userId;
    userDisplayName;
    userRole;
    currentQuizId;
    handlers = new Map();
    emitted = [];
    received = [];
    constructor(id, userId, role, displayName) {
        this.id = id;
        this.userId = userId;
        this.userRole = role;
        this.userDisplayName = displayName;
    }
    on(event, handler) {
        this.handlers.set(event, handler);
    }
    emit(event, data) {
        this.emitted.push({ event, data });
    }
    join(_roomId) {
        // No-op for test.
    }
    leave(_roomId) {
        // No-op for test.
    }
    to(_roomId) {
        return {
            emit: (_event, _data) => {
                // No-op for test.
            },
        };
    }
    receive(event, data) {
        this.received.push({ event, data });
    }
    async trigger(event, payload) {
        const handler = this.handlers.get(event);
        assert.ok(handler, `Missing socket handler for ${event}`);
        await handler(payload);
    }
}
class FakeNamespace {
    sockets = new Map();
    connectionHandler = null;
    use(_handler) {
        // Middleware is not executed in this mock setup.
    }
    on(event, handler) {
        if (event === 'connection') {
            this.connectionHandler = handler;
        }
    }
    to(socketId) {
        return {
            emit: (event, data) => {
                const socket = this.sockets.get(socketId);
                if (socket) {
                    socket.receive(event, data);
                }
            },
        };
    }
    connect(socket) {
        this.sockets.set(socket.id, socket);
        assert.ok(this.connectionHandler, 'Expected connection handler to be registered');
        this.connectionHandler(socket);
    }
}
class FakeIo {
    namespace = new FakeNamespace();
    engine = {
        on: (_event, _handler) => {
            // No-op for test.
        },
    };
    of(name) {
        assert.equal(name, '/quiz');
        return this.namespace;
    }
}
test('submit_answer emits answer_result only after reveal', async () => {
    const quizId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const adminUserId = 'admin-user';
    const adminSocketId = 'admin-socket';
    const playerUserId = 'player-user';
    const playerSocketId = 'player-socket';
    quizStore.initQuiz(quizId, [
        {
            id: 'q1',
            position: 1,
            questionText: '2 + 2 = ?',
            questionType: 'MCQ',
            options: ['4', '5', '3'],
            correctAnswer: '4',
            timeLimitSeconds: 20,
            points: 100,
            mediaUrl: null,
        },
    ], adminUserId, adminSocketId, 'Integration Test Quiz');
    quizStore.addPlayer(quizId, playerUserId, playerSocketId, 'Player One');
    const room = quizStore.getRoom(quizId);
    assert.ok(room, 'Expected quiz room to exist');
    const firstQuestion = quizStore.advanceQuestion(quizId);
    assert.equal(firstQuestion.done, false);
    room.currentQuestionStartTime = Date.now();
    const io = new FakeIo();
    initQuizSocket(io);
    const playerSocket = new FakeSocket(playerSocketId, playerUserId, 'USER', 'Player One');
    const adminSocket = new FakeSocket(adminSocketId, adminUserId, 'ADMIN', 'Host One');
    io.namespace.connect(playerSocket);
    io.namespace.connect(adminSocket);
    try {
        await playerSocket.trigger('submit_answer', {
            quizId,
            answer: '4',
            questionId: 'q1',
        });
        assert.equal(playerSocket.emitted.some((event) => event.event === 'answer_received'), true, 'Expected answer_received on submit');
        assert.equal(playerSocket.received.some((event) => event.event === 'answer_result'), false, 'answer_result must not be sent before reveal');
        await adminSocket.trigger('next_question', { quizId });
        assert.equal(playerSocket.received.some((event) => event.event === 'answer_result'), true, 'Expected answer_result after reveal stage starts');
    }
    finally {
        quizStore.cleanupQuiz(quizId);
    }
});
