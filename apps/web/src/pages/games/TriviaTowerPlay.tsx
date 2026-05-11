import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api, SOCKET_URL, type TriviaRoom } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayShell } from './PlayShell';

interface QuestionView { floor: number; prompt: string; options: string[]; deadlineMs: number }

export default function TriviaTowerPlay() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<TriviaRoom | null>(null);
  const [question, setQuestion] = useState<QuestionView | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const code = params.get('room');
  const connect = (roomCode: string) => {
    if (!token) return;
    socketRef.current?.disconnect();
    const socket = io(`${SOCKET_URL}/games/trivia-tower`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('room:join', { code: roomCode }));
    socket.on('room:state', (nextRoom: TriviaRoom) => setRoom(nextRoom));
    socket.on('question:show', (nextQuestion: QuestionView) => { setQuestion(nextQuestion); setSelected(null); setSummary(null); });
    socket.on('answer:result', ({ correct, pointsAwarded }: { correct: boolean; pointsAwarded: number }) => setSummary(`${correct ? 'Correct' : 'Wrong'} · ${pointsAwarded} pts`));
    socket.on('floor:summary', () => setSummary('Floor complete'));
    socket.on('tower:results', () => toast.success('Tower complete'));
  };
  useEffect(() => {
    if (code && token) api.getTriviaRoom(code, token).then(({ room: fetched }) => { setRoom(fetched); connect(fetched.code); }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load room'));
    return () => {
      socketRef.current?.disconnect();
    };
  }, [code, token]);
  const createRoom = async () => { if (!token) return; const response = await api.createTriviaRoom(token); setRoom(response.room); setParams({ room: response.room.code }); connect(response.room.code); };
  const joinRoom = async (roomCode: string) => { if (!token) return; const response = await api.joinTriviaRoom(roomCode.toUpperCase(), token); setRoom(response.room); setParams({ room: response.room.code }); connect(response.room.code); };
  if (!token) return <PlayShell title="TRIVIA TOWER" accent="green"><PlayError message="Sign in to play." /></PlayShell>;
  return (
    <PlayShell title="TRIVIA TOWER" accent="green">
      <div style={{ display: 'grid', gap: 16 }}>
        {!room && <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="lb-btn-primary" onClick={createRoom}>CREATE ROOM</button><form onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('code'); if (typeof value === 'string') void joinRoom(value); }}><input name="code" placeholder="ROOM CODE" style={{ background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 10 }} /> <button className="lb-btn-ghost">JOIN</button></form></div>}
        {room && <><div className="lb-mono" style={{ color: 'var(--c-green)', fontSize: 12 }}>ROOM {room.code} · {room.status} · FLOOR {room.currentFloor}/{room.totalFloors}</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{room.participants.map((participant) => <span key={participant.userId} className="lb-mono" style={{ border: '1px solid rgba(255,255,255,0.12)', padding: 8 }}>{participant.name}: {participant.score}</span>)}</div>{room.status === 'LOBBY' && room.hostUserId === user?.id && <button className="lb-btn-primary" onClick={() => socketRef.current?.emit('room:start')}>START</button>}</>}
        {question && <div style={{ display: 'grid', gap: 10 }}><h2 style={{ margin: 0 }}>{question.prompt}</h2>{question.options.map((option, index) => <button key={option} className={selected === index ? 'lb-btn-primary' : 'lb-btn-ghost'} disabled={selected !== null} onClick={() => { setSelected(index); socketRef.current?.emit('answer:submit', { floor: question.floor, selectedIndex: index }); }}>{option}</button>)}{summary && <p className="lb-mono" style={{ color: 'var(--c-yellow)' }}>{summary}</p>}</div>}
      </div>
    </PlayShell>
  );
}
