import { lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const TypeWarsAdmin = lazy(() => import('@/pages/admin/gameContent/TypeWarsAdmin'));
const TriviaTowerAdmin = lazy(() => import('@/pages/admin/gameContent/TriviaTowerAdmin'));
const PuzzleRunAdmin = lazy(() => import('@/pages/admin/gameContent/PuzzleRunAdmin'));
const BrainTeasersAdmin = lazy(() => import('@/pages/admin/gameContent/BrainTeasersAdmin'));
const CipherLabAdmin = lazy(() => import('@/pages/admin/gameContent/CipherLabAdmin'));
const RiddleRoomAdmin = lazy(() => import('@/pages/admin/gameContent/RiddleRoomAdmin'));
const ScribblAdmin = lazy(() => import('@/pages/admin/gameContent/ScribblAdmin'));

const tabs = [
  { id: 'type-wars', label: 'Type Wars', component: <TypeWarsAdmin /> },
  { id: 'trivia-tower', label: 'Trivia Tower', component: <TriviaTowerAdmin /> },
  { id: 'puzzle-run', label: 'Puzzle Run', component: <PuzzleRunAdmin /> },
  { id: 'brain-teasers', label: 'Brain Teasers', component: <BrainTeasersAdmin /> },
  { id: 'cipher-lab', label: 'Cipher Lab', component: <CipherLabAdmin /> },
  { id: 'riddle-room', label: 'Riddle Room', component: <RiddleRoomAdmin /> },
  { id: 'scribbl', label: 'Scribbl', component: <ScribblAdmin /> },
] as const;

export default function AdminGameContent() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || 'type-wars';
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeId) ?? tabs[0], [activeId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Game Content</h1>
        <p className="text-sm text-gray-500 dark:text-zinc-400">Manage the playable content libraries for Tesseract games.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit">
          <CardContent className="p-2">
            <nav className="flex flex-col gap-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={tab.id === activeTab.id ? 'default' : 'ghost'}
                  className="justify-start"
                  onClick={() => setParams({ tab: tab.id })}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <Suspense fallback={<div className="py-16 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>}>
              {activeTab.component}
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
