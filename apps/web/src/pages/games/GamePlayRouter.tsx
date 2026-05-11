import { lazy } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PlayShell } from './PlayShell';

const TypeWarsPlay = lazy(() => import('@/pages/games/TypeWarsPlay'));
const TriviaTowerPlay = lazy(() => import('@/pages/games/TriviaTowerPlay'));
const PuzzleRunPlay = lazy(() => import('@/pages/games/PuzzleRunPlay'));
const BrainTeasersPlay = lazy(() => import('@/pages/games/BrainTeasersPlay'));
const CipherLabPlay = lazy(() => import('@/pages/games/CipherLabPlay'));
const RiddleRoomPlay = lazy(() => import('@/pages/games/RiddleRoomPlay'));
const ScribblPlay = lazy(() => import('@/pages/games/ScribblPlay'));
const SmashKartPlay = lazy(() => import('@/pages/games/SmashKartPlay'));

export default function GamePlayRouter() {
  const { id } = useParams<{ id: string }>();

  switch (id) {
    case 'type-wars':
      return <TypeWarsPlay />;
    case 'trivia-tower':
      return <TriviaTowerPlay />;
    case 'puzzle-run':
      return <PuzzleRunPlay />;
    case 'brain-teasers':
      return <BrainTeasersPlay />;
    case 'cipher-lab':
      return <CipherLabPlay />;
    case 'riddle-room':
      return <RiddleRoomPlay />;
    case 'scribbl':
      return <ScribblPlay />;
    case 'smash-kart':
      return <SmashKartPlay />;
    default:
      return (
        <PlayShell title="GAME NOT FOUND" accent="red">
          <p className="lb-mono" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 12, marginTop: 0 }}>
            This game does not have a custom play surface yet.
          </p>
          <Link to="/games" className="lb-btn-primary" style={{ textDecoration: 'none' }}>
            BACK TO GAMES
          </Link>
        </PlayShell>
      );
  }
}
