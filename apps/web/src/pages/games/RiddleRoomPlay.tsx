import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api, SOCKET_URL, type RiddleClue, type RiddleRoom } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayShell } from './PlayShell';

interface RoomStatePayload {
  room: RiddleRoom;
  currentClue: RiddleClue | null;
}

interface ChatMessage {
  userId: string;
  name: string;
  message: string;
  sentAt: string;
}

export default function RiddleRoomPlay() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const [room, setRoom] = useState<RiddleRoom | null>(null);
  const [clue, setClue] = useState<RiddleClue | null>(null);
  const [submission, setSubmission] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusLine, setStatusLine] = useState<string | null>(null);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const code = params.get('room');

  const connect = (roomCode: string) => {
    if (!token) return;
    socketRef.current?.disconnect();
    const socket = io(`${SOCKET_URL}/games/riddle-room`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('room:join', { code: roomCode }));
    socket.on('room:state', (payload: RoomStatePayload) => {
      setRoom(payload.room);
      setClue(payload.currentClue);
    });
    socket.on('clue:show', (nextClue: RiddleClue | null) => {
      setClue(nextClue);
      setSubmission('');
      setStatusLine(null);
      setLockUntil(null);
    });
    socket.on('clue:hint', ({ hint }: { hint: string }) => {
      setStatusLine(`Hint revealed: ${hint}`);
    });
    socket.on('clue:wrong', ({ by, lockUntil: nextLockUntil }: { by: string; lockUntil: number }) => {
      setLockUntil(nextLockUntil);
      setStatusLine(`${by} tried an answer. Room locked briefly.`);
    });
    socket.on('clue:solved', ({ by, award }: { by: string; award: number }) => {
      setStatusLine(`${by} solved it. Team earned ${award} pts.`);
      setSubmission('');
    });
    socket.on('room:complete', () => {
      setComplete(true);
      toast.success('Riddle Room complete');
    });
    socket.on('room:aborted', () => {
      toast.error('Room closed because the host left the lobby.');
      setRoom(null);
      setClue(null);
      setParams({});
    });
    socket.on('chat:message', (message: ChatMessage) => {
      setMessages((current) => [...current.slice(-80), message]);
    });
  };

  useEffect(() => {
    if (!code || !token) return undefined;
    api.getRiddleRoom(code, token)
      .then(({ room: fetchedRoom, currentClue }) => {
        setRoom(fetchedRoom);
        setClue(currentClue);
        connect(fetchedRoom.code);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load room'));
    return () => {
      socketRef.current?.disconnect();
    };
  }, [code, token]);

  useEffect(() => {
    if (!shouldStickToBottomRef.current || !chatRef.current) return;
    chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const createRoom = async () => {
    if (!token) return;
    const response = await api.createRiddleRoom(token);
    setRoom(response.room);
    setClue(null);
    setComplete(false);
    setMessages([]);
    setParams({ room: response.room.code });
    connect(response.room.code);
  };

  const joinRoom = async (roomCode: string) => {
    if (!token) return;
    const response = await api.joinRiddleRoom(roomCode.toUpperCase(), token);
    setRoom(response.room);
    setComplete(false);
    setParams({ room: response.room.code });
    connect(response.room.code);
  };

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = submission.trim();
    if (!value || lockUntil && Date.now() < lockUntil) return;
    socketRef.current?.emit('clue:submit', { submission: value }, (response: { ok?: boolean; error?: string }) => {
      if (response?.error === 'LOCKED') {
        toast.error('The room is cooling down after a wrong answer.');
      } else if (response?.error) {
        toast.error(response.error);
      }
    });
  };

  const sendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;
    socketRef.current?.emit('chat:message', { message });
    setChatInput('');
  };

  if (!token) {
    return (
      <PlayShell title="RIDDLE ROOM" accent="purple">
        <PlayError message="Sign in to play." />
      </PlayShell>
    );
  }

  const isHost = room?.hostUserId === user?.id;
  const locked = lockUntil !== null && Date.now() < lockUntil;

  return (
    <PlayShell title="RIDDLE ROOM" accent="purple">
      <div style={{ display: 'grid', gap: 18 }}>
        {!room && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="lb-btn-primary" type="button" onClick={() => void createRoom()}>
              CREATE ROOM
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get('code');
                if (typeof value === 'string') void joinRoom(value);
              }}
              style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}
            >
              <input
                name="code"
                placeholder="ROOM CODE"
                className="lb-mono"
                style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 10 }}
              />
              <button className="lb-btn-ghost" type="submit">JOIN</button>
            </form>
          </div>
        )}

        {room && (
          <>
            <div className="lb-mono" style={{ color: 'var(--c-purple)', fontSize: 12 }}>
              ROOM {room.code} · {room.status} · {room.bundleName} · {Math.min(room.currentOrder + 1, room.totalClues)}/{room.totalClues}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px', gap: 18 }}>
              <section style={{ display: 'grid', gap: 14, minWidth: 0 }}>
                {room.status === 'LOBBY' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, margin: 0 }}>
                      Share code {room.code}. The host starts the escape when everyone is ready.
                    </p>
                    {isHost && (
                      <button className="lb-btn-primary" type="button" onClick={() => socketRef.current?.emit('room:start')}>
                        START ROOM
                      </button>
                    )}
                  </div>
                )}

                {room.status === 'ACTIVE' && clue && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 18, background: 'rgba(255,255,255,0.03)' }}>
                      <p className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: 11, marginTop: 0 }}>
                        CLUE {clue.title}
                      </p>
                      <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 17, lineHeight: 1.7, margin: 0, overflowWrap: 'anywhere' }}>
                        {clue.prompt}
                      </p>
                    </div>
                    <div style={{ height: 8, border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (room.currentOrder / Math.max(1, room.totalClues)) * 100)}%`, background: 'var(--c-purple)' }} />
                    </div>
                    <form onSubmit={submitAnswer} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        value={submission}
                        onChange={(event) => setSubmission(event.target.value)}
                        disabled={locked}
                        placeholder={locked ? 'LOCKED' : 'ANSWER'}
                        className="lb-mono"
                        style={{ flex: '1 1 260px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 12 }}
                      />
                      <button className="lb-btn-primary" type="submit" disabled={locked || !submission.trim()}>
                        SUBMIT
                      </button>
                      <button className="lb-btn-ghost" type="button" onClick={() => socketRef.current?.emit('clue:hint')}>
                        HINT
                      </button>
                    </form>
                    {statusLine && <p className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: 12, margin: 0 }}>{statusLine}</p>}
                  </div>
                )}

                {complete && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 22, textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 10px', color: 'var(--c-green)' }}>ROOM COMPLETE</h2>
                    <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.58)', fontSize: 12, margin: 0 }}>
                      Team total: {room.members.reduce((sum, member) => sum + (member.pointsAwarded ?? 0), 0)} pts
                    </p>
                  </div>
                )}
              </section>

              <aside style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
                  <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 0 }}>MEMBERS</p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {room.members.map((member) => (
                      <div key={member.userId} className="lb-mono" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                        <span style={{ color: member.active === false ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.78)' }}>{member.name}</span>
                        <span style={{ color: 'var(--c-yellow)' }}>{member.pointsAwarded ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
                  <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 0 }}>TEAM CHAT</p>
                  <div
                    ref={chatRef}
                    onScroll={(event) => {
                      const element = event.currentTarget;
                      shouldStickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 18;
                    }}
                    style={{ height: 190, overflowY: 'auto', display: 'grid', alignContent: 'start', gap: 8, paddingRight: 4 }}
                  >
                    {messages.length === 0 ? (
                      <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>No messages yet.</p>
                    ) : messages.map((message) => (
                      <p key={`${message.sentAt}-${message.userId}-${message.message}`} style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' }}>
                        <span className="lb-mono" style={{ color: 'var(--c-purple)' }}>{message.name}: </span>
                        {message.message}
                      </p>
                    ))}
                  </div>
                  <form onSubmit={sendChat} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="MESSAGE"
                      className="lb-mono"
                      style={{ minWidth: 0, flex: 1, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 9 }}
                    />
                    <button className="lb-btn-ghost" type="submit">SEND</button>
                  </form>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </PlayShell>
  );
}
