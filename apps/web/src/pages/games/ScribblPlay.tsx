import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { api, SOCKET_URL, type GameParticipant, type ScribblRoom } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { PlayError, PlayShell } from './PlayShell';

interface CanvasPoint {
  x: number;
  y: number;
}

interface CanvasStroke {
  from: CanvasPoint;
  to: CanvasPoint;
  color: string;
  size: number;
  erase?: boolean;
}

interface RoundStartPayload {
  drawerId: string;
  drawerName: string;
  wordLength: number;
  roundDurationSeconds: number;
}

const colors = ['var(--c-red)', 'var(--c-yellow)', 'var(--c-green)', 'var(--c-blue)', 'var(--c-purple)', 'var(--c-orange)', 'rgba(255,255,255,0.92)'];

function drawStroke(canvas: HTMLCanvasElement, stroke: CanvasStroke) {
  const context = canvas.getContext('2d');
  if (!context) return;
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = stroke.size;
  context.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over';
  context.strokeStyle = stroke.color;
  context.beginPath();
  context.moveTo(stroke.from.x, stroke.from.y);
  context.lineTo(stroke.to.x, stroke.to.y);
  context.stroke();
  context.restore();
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

function canvasPoint(canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>): CanvasPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export default function ScribblPlay() {
  const { token, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<CanvasPoint | null>(null);
  const lastSentAtRef = useRef(0);
  const strokeHistoryRef = useRef<CanvasStroke[]>([]);
  const [room, setRoom] = useState<ScribblRoom | null>(null);
  const [word, setWord] = useState<string | null>(null);
  const [roundHint, setRoundHint] = useState<RoundStartPayload | null>(null);
  const [guess, setGuess] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [roundEnded, setRoundEnded] = useState<{ word: string; scores: GameParticipant[] } | null>(null);
  const [finalScores, setFinalScores] = useState<GameParticipant[] | null>(null);
  const [brushColor, setBrushColor] = useState(colors[0] ?? 'var(--c-red)');
  const [brushSize, setBrushSize] = useState(6);
  const [eraser, setEraser] = useState(false);
  const code = params.get('room');

  const connect = (roomCode: string) => {
    if (!token) return;
    socketRef.current?.disconnect();
    const socket = io(`${SOCKET_URL}/games/scribbl`, { transports: ['websocket'], auth: { token } });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('room:join', { code: roomCode }));
    socket.on('room:state', (nextRoom: ScribblRoom) => setRoom(nextRoom));
    socket.on('round:prompt', ({ word: nextWord }: { word: string }) => {
      clearCanvas(canvasRef.current);
      strokeHistoryRef.current = [];
      setWord(nextWord);
      setRoundHint(null);
      setRoundEnded(null);
      setLog([`You are drawing ${nextWord}.`]);
    });
    socket.on('round:start', (payload: RoundStartPayload) => {
      clearCanvas(canvasRef.current);
      strokeHistoryRef.current = [];
      setWord(null);
      setRoundHint(payload);
      setRoundEnded(null);
      setLog([`${payload.drawerName} is drawing.`]);
    });
    socket.on('canvas:stroke', ({ strokes }: { strokes: CanvasStroke[] }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      for (const stroke of strokes) {
        drawStroke(canvas, stroke);
        strokeHistoryRef.current.push(stroke);
      }
    });
    socket.on('canvas:clear', () => {
      clearCanvas(canvasRef.current);
      strokeHistoryRef.current = [];
    });
    socket.on('guess:close', ({ byName }: { byName: string }) => setLog((current) => [`${byName} is close.`, ...current].slice(0, 8)));
    socket.on('guess:correct', ({ byName, pointsAwarded }: { byName: string; pointsAwarded: number }) => setLog((current) => [`${byName} guessed it for ${pointsAwarded} pts.`, ...current].slice(0, 8)));
    socket.on('guess:message', ({ byName, guess: nextGuess }: { byName: string; guess: string }) => setLog((current) => [`${byName}: ${nextGuess}`, ...current].slice(0, 8)));
    socket.on('round:end', ({ word: answer, scores }: { word: string; scores: GameParticipant[] }) => {
      setRoundEnded({ word: answer, scores });
      setWord(null);
      setRoundHint(null);
    });
    socket.on('game:end', ({ finalScores: nextScores }: { finalScores: GameParticipant[] }) => {
      setFinalScores(nextScores);
      toast.success('Scribbl game complete');
    });
    socket.on('room:aborted', () => {
      toast.error('Room closed because the host left the lobby.');
      setRoom(null);
      setParams({});
    });
  };

  useEffect(() => {
    if (!code || !token) return undefined;
    api.getScribblRoom(code, token)
      .then(({ room: fetchedRoom }) => {
        setRoom(fetchedRoom);
        connect(fetchedRoom.code);
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load room'));
    return () => {
      socketRef.current?.disconnect();
    };
  }, [code, token]);

  const createRoom = async () => {
    if (!token) return;
    const response = await api.createScribblRoom(token);
    setRoom(response.room);
    setFinalScores(null);
    setParams({ room: response.room.code });
    connect(response.room.code);
  };

  const joinRoom = async (roomCode: string) => {
    if (!token) return;
    const response = await api.joinScribblRoom(roomCode.toUpperCase(), token);
    setRoom(response.room);
    setFinalScores(null);
    setParams({ room: response.room.code });
    connect(response.room.code);
  };

  const beginStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!word || !canvasRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = canvasPoint(event.currentTarget, event);
  };

  const moveStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !word || !canvasRef.current || !lastPointRef.current) return;
    const point = canvasPoint(event.currentTarget, event);
    const stroke: CanvasStroke = {
      from: lastPointRef.current,
      to: point,
      color: brushColor,
      size: brushSize,
      erase: eraser,
    };
    drawStroke(event.currentTarget, stroke);
    strokeHistoryRef.current.push(stroke);
    lastPointRef.current = point;
    const now = Date.now();
    if (now - lastSentAtRef.current > 50) {
      socketRef.current?.emit('canvas:stroke', { strokes: [stroke] });
      lastSentAtRef.current = now;
    }
  };

  const endStroke = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    clearCanvas(canvas);
    for (const stroke of strokeHistoryRef.current) drawStroke(canvas, stroke);
  };

  const undoLocalStroke = () => {
    strokeHistoryRef.current = strokeHistoryRef.current.slice(0, -12);
    redraw();
  };

  const submitGuess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = guess.trim();
    if (!value) return;
    socketRef.current?.emit('guess:submit', { guess: value }, (response: { correct?: boolean; ignored?: boolean }) => {
      if (response?.correct || response?.ignored) setGuess('');
    });
  };

  if (!token) {
    return (
      <PlayShell title="SCRIBBL" accent="orange">
        <PlayError message="Sign in to play." />
      </PlayShell>
    );
  }

  const isHost = room?.hostUserId === user?.id;
  const isDrawer = Boolean(word);

  return (
    <PlayShell title="SCRIBBL" accent="orange">
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
            <div className="lb-mono" style={{ color: 'var(--c-orange)', fontSize: 12 }}>
              ROOM {room.code} · {room.status} · ROUND {room.currentRound + 1}
              {room.drawerName ? ` · DRAWER ${room.drawerName}` : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: 18 }}>
              <section style={{ minWidth: 0, display: 'grid', gap: 12 }}>
                {room.status === 'LOBBY' && (
                  <div style={{ display: 'grid', gap: 12 }}>
                    <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, margin: 0 }}>
                      Share code {room.code}. Drawing starts when the host begins.
                    </p>
                    {isHost && <button className="lb-btn-primary" type="button" onClick={() => socketRef.current?.emit('room:start')}>START DRAWING</button>}
                  </div>
                )}

                {room.status === 'ACTIVE' && (
                  <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                      <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, margin: 0 }}>
                        {isDrawer ? `WORD: ${word}` : roundHint ? Array.from({ length: roundHint.wordLength }, () => '_').join(' ') : 'WAITING FOR ROUND'}
                      </p>
                      {isDrawer && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {colors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              aria-label={`Use ${color}`}
                              onClick={() => { setBrushColor(color); setEraser(false); }}
                              style={{ width: 24, height: 24, border: brushColor === color && !eraser ? '2px solid white' : '1px solid rgba(255,255,255,0.24)', background: color }}
                            />
                          ))}
                          <input
                            type="range"
                            min={2}
                            max={24}
                            value={brushSize}
                            onChange={(event) => setBrushSize(Number(event.target.value))}
                          />
                          <button className={eraser ? 'lb-btn-primary' : 'lb-btn-ghost'} type="button" onClick={() => setEraser((value) => !value)}>ERASER</button>
                          <button className="lb-btn-ghost" type="button" onClick={undoLocalStroke}>UNDO</button>
                          <button
                            className="lb-btn-ghost"
                            type="button"
                            onClick={() => {
                              clearCanvas(canvasRef.current);
                              strokeHistoryRef.current = [];
                              socketRef.current?.emit('canvas:clear');
                            }}
                          >
                            CLEAR
                          </button>
                        </div>
                      )}
                    </div>
                    <canvas
                      ref={canvasRef}
                      width={960}
                      height={540}
                      onPointerDown={beginStroke}
                      onPointerMove={moveStroke}
                      onPointerUp={endStroke}
                      onPointerCancel={endStroke}
                      style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(255,255,255,0.92)',
                        touchAction: 'none',
                        cursor: isDrawer ? 'crosshair' : 'default',
                      }}
                    />
                    {!isDrawer && (
                      <form onSubmit={submitGuess} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <input
                          value={guess}
                          onChange={(event) => setGuess(event.target.value)}
                          placeholder="GUESS"
                          className="lb-mono"
                          style={{ flex: '1 1 260px', background: 'transparent', color: 'white', border: '1px solid rgba(255,255,255,0.16)', padding: 12 }}
                        />
                        <button className="lb-btn-primary" type="submit" disabled={!guess.trim()}>SUBMIT</button>
                      </form>
                    )}
                  </>
                )}

                {roundEnded && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
                    <p className="lb-mono" style={{ color: 'var(--c-green)', fontSize: 12, marginTop: 0 }}>WORD: {roundEnded.word}</p>
                    <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.56)', fontSize: 11, marginBottom: 0 }}>Next round starts automatically.</p>
                  </div>
                )}

                {finalScores && (
                  <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 20, textAlign: 'center' }}>
                    <h2 style={{ margin: '0 0 12px', color: 'var(--c-yellow)' }}>FINAL PODIUM</h2>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {[...finalScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).map((member, index) => (
                        <div key={member.userId} className="lb-mono" style={{ display: 'flex', justifyContent: 'space-between', color: index === 0 ? 'var(--c-yellow)' : 'rgba(255,255,255,0.72)' }}>
                          <span>{index + 1}. {member.name}</span>
                          <span>{member.score ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
                  <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 0 }}>SCOREBOARD</p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {room.members.map((member) => (
                      <div key={member.userId} className="lb-mono" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11 }}>
                        <span style={{ color: member.active === false ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.78)' }}>{member.name}</span>
                        <span style={{ color: 'var(--c-yellow)' }}>{member.score ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ border: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
                  <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, marginTop: 0 }}>ROUND LOG</p>
                  <div style={{ display: 'grid', gap: 7 }}>
                    {log.length === 0 ? (
                      <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Waiting for guesses.</p>
                    ) : log.map((line) => (
                      <p key={line} className="lb-mono" style={{ color: 'rgba(255,255,255,0.66)', fontSize: 11, lineHeight: 1.45, margin: 0, overflowWrap: 'anywhere' }}>
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </PlayShell>
  );
}
