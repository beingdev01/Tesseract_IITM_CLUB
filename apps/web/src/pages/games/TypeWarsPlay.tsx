import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api, SOCKET_URL, type TypeWarsRoom } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayLoading, PlayShell } from './PlayShell';

export default function TypeWarsPlay() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [room, setRoom] = useState<TypeWarsRoom | null>(null);
  const [passage, setPassage] = useState('');
  const [typed, setTyped] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const code = params.get('room');

  const connect = (roomCode: string) => {
    if (!token) return;
    socketRef.current?.disconnect();
    const socket = io(`${SOCKET_URL}/games/type-wars`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('room:join', { code: roomCode }, (response: { ok: boolean; room?: TypeWarsRoom; error?: string }) => {
      if (!response.ok) toast.error(response.error || 'Failed to join socket room');
      if (response.room) setRoom(response.room);
    }));
    socket.on('room:state', (nextRoom: TypeWarsRoom) => setRoom(nextRoom));
    socket.on('race:countdown', ({ value }: { value: number }) => setCountdown(value));
    socket.on('race:start', ({ startedAt, passage: nextPassage }: { startedAt: number; passage: { text: string } }) => {
      startedAtRef.current = startedAt;
      setCountdown(null);
      setPassage(nextPassage.text);
      setTyped('');
    });
    socket.on('race:results', () => {
      void queryClient.invalidateQueries({ queryKey: ['games-leaderboard'] });
      toast.success('Race finished');
    });
  };

  useEffect(() => {
    if (code && token) {
      api.getTypeWarsRoom(code, token).then(({ room: fetched }) => {
        setRoom(fetched);
        if (fetched.passage?.text) setPassage(fetched.passage.text);
        connect(fetched.code);
      }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load room'));
    }
    return () => {
      socketRef.current?.disconnect();
    };
  }, [code, token]);

  const createRoom = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await api.createTypeWarsRoom(token);
      setRoom(response.room);
      setPassage(response.passage.text);
      setParams({ room: response.code });
      connect(response.code);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomCode: string) => {
    if (!token) return;
    const response = await api.joinTypeWarsRoom(roomCode.toUpperCase(), token);
    setRoom(response.room);
    setParams({ room: response.room.code });
    connect(response.room.code);
  };

  const finish = () => {
    if (!room || !startedAtRef.current) return;
    const correctChars = Array.from(typed).filter((char, index) => char === passage[index]).length;
    // durationMs is derived server-side from room.startedAt — not sent here.
    socketRef.current?.emit('progress:finish', {
      charsTyped: typed.length,
      correctChars,
    });
  };

  const stats = useMemo(() => {
    const correct = Array.from(typed).filter((char, index) => char === passage[index]).length;
    const elapsedMin = startedAtRef.current ? Math.max((Date.now() - startedAtRef.current) / 60000, 1 / 60) : 1;
    return {
      wpm: Math.round((correct / 5) / elapsedMin),
      accuracy: typed.length ? Math.round((correct / typed.length) * 100) : 100,
    };
  }, [passage, typed]);

  if (!token) return <PlayShell title="TYPE WARS"><PlayError message="Sign in to play." /></PlayShell>;

  return (
    <PlayShell title="TYPE WARS" accent="yellow">
      <div style={{ display: 'grid', gap: 18 }}>
        {!room && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="lb-btn-primary" onClick={createRoom} disabled={loading}>{loading ? 'CREATING...' : 'CREATE ROOM'}</button>
            <form onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get('code'); if (typeof value === 'string') void joinRoom(value); }} style={{ display: 'flex', gap: 8 }}>
              <input name="code" className="lb-mono" placeholder="ROOM CODE" style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.16)', color: 'white', padding: '10px 12px' }} />
              <button className="lb-btn-ghost" type="submit">JOIN</button>
            </form>
          </div>
        )}
        {room && (
          <>
            <div className="lb-mono" style={{ color: 'var(--c-yellow)', fontSize: 12 }}>ROOM {room.code} · {room.status}</div>
            {countdown && <div style={{ fontFamily: '"Audiowide", sans-serif', fontSize: 72, color: 'var(--c-green)' }}>{countdown}</div>}
            {room.status === 'LOBBY' && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{room.participants.map((participant) => <span key={participant.userId} className="lb-mono" style={{ border: '1px solid rgba(255,255,255,0.12)', padding: '8px 10px' }}>{participant.name}</span>)}</div>
                {room.hostUserId === user?.id && <button className="lb-btn-primary" onClick={() => socketRef.current?.emit('room:start')}>START RACE</button>}
              </div>
            )}
            {room.status === 'RACING' && (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ lineHeight: 1.9, fontSize: 18 }}>
                  {Array.from(passage).map((char, index) => {
                    const typedChar = typed[index];
                    const color = typedChar === undefined ? 'rgba(255,255,255,0.45)' : typedChar === char ? 'var(--c-green)' : 'var(--c-red)';
                    return <span key={`${char}-${index}`} style={{ color }}>{char}</span>;
                  })}
                </div>
                <textarea value={typed} onChange={(event) => { setTyped(event.target.value); socketRef.current?.emit('progress:update', { charsTyped: event.target.value.length }); if (event.target.value.length >= passage.length) finish(); }} autoFocus style={{ minHeight: 120, background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 12 }} />
                <div className="lb-mono" style={{ color: 'rgba(255,255,255,0.7)' }}>WPM {stats.wpm} · ACC {stats.accuracy}%</div>
              </div>
            )}
            {room.status === 'FINISHED' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {room.participants.map((participant) => <div key={participant.userId} className="lb-board-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 120px', padding: 12 }}><span>{participant.rank ?? '-'}</span><span>{participant.name}</span><span>{participant.wpm ?? 0} WPM</span></div>)}
                <div style={{ display: 'flex', gap: 10 }}><button className="lb-btn-primary" onClick={() => { setRoom(null); setParams({}); }}>PLAY AGAIN</button><Link to="/games" className="lb-btn-ghost" style={{ textDecoration: 'none' }}>BACK TO GAMES</Link></div>
              </div>
            )}
          </>
        )}
        {loading && <PlayLoading />}
      </div>
    </PlayShell>
  );
}
